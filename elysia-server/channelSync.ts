import { differenceInCalendarDays } from 'date-fns';
import { prisma } from './prisma';
import { fetchAndParseICal } from './icalParser';

export const VALID_CHANNELS = ['airbnb', 'gathern', 'booking.com'] as const;
export type Channel = typeof VALID_CHANNELS[number];

export interface SyncResult {
  integrationId: string;
  tenantId: string;
  channelName: string;
  roomId: string;
  imported: number;
  updated: number;
  canceled: number;
  skipped: number;
  errors: string[];
  success: boolean;
  message: string;
}

export function parseGuestName(summary: string, channel: string): string {
  if (!summary || /closed|not available|unavailable/i.test(summary)) {
    return `[${channel} block]`;
  }
  const airbnbMatch = summary.match(/reservation by (.+)/i);
  if (airbnbMatch) return airbnbMatch[1].trim();
  const bookingMatch = summary.match(/booking (?:from|by) (.+)/i);
  if (bookingMatch) return bookingMatch[1].trim();
  return summary.trim() || 'Guest';
}

export async function performSync(integration: any, tenantId: string): Promise<SyncResult> {
  let imported = 0, updated = 0, canceled = 0, skipped = 0;
  const errors: string[] = [];

  let events;
  try {
    events = await fetchAndParseICal(integration.icalUrl);
  } catch (err: any) {
    const message = `Failed to fetch iCal: ${err.message}`;
    await prisma.channelIntegration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date(), lastSyncStatus: 'error', lastSyncMessage: message },
    });
    return { integrationId: integration.id, tenantId, channelName: integration.channelName, roomId: integration.roomId, imported: 0, updated: 0, canceled: 0, skipped: 0, errors: [message], success: false, message };
  }

  for (const event of events) {
    try {
      const nights = differenceInCalendarDays(event.end, event.start);
      if (nights <= 0) { skipped++; continue; }

      const now = new Date();
      let status: string;
      if (event.status === 'CANCELLED') {
        status = 'canceled';
      } else if (event.end <= now) {
        status = 'completed';
      } else if (event.start <= now) {
        status = 'active';
      } else {
        status = 'upcoming';
      }

      const guestName = parseGuestName(event.summary, integration.channelName);
      const bookingData = {
        tenantId,
        guestName,
        room: integration.roomId,
        checkIn: event.start,
        checkOut: event.end,
        nights,
        nightPrice: 0,
        totalPrice: 0,
        tax: 0,
        deposit: 0,
        remaining: 0,
        status,
        source: integration.channelName,
        notes: event.description,
        externalId: event.uid,
        externalChannel: integration.channelName,
        createdBy: 'channel_sync',
      };

      const existing = await prisma.booking.findFirst({ where: { tenantId, externalId: event.uid } });
      if (existing) {
        const wasCanceled = existing.status !== 'canceled' && status === 'canceled';
        await prisma.booking.update({
          where: { id: existing.id },
          data: { guestName, checkIn: event.start, checkOut: event.end, nights, status, notes: event.description },
        });
        wasCanceled ? canceled++ : updated++;
      } else {
        await prisma.booking.create({ data: bookingData });
        imported++;
      }
    } catch (err: any) {
      errors.push(`UID ${event.uid}: ${err.message}`);
    }
  }

  // Soft verification — flag the integration as 'suspicious' when the feed looks off.
  // Thresholds are intentionally loose to avoid false alarms on heavy-usage properties.
  const suspiciousReasons = detectSuspiciousPatterns(events);

  let finalStatus: string;
  let finalMessage: string;
  if (errors.length > 0) {
    finalStatus = 'partial';
    finalMessage = `Imported ${imported}, updated ${updated}, canceled ${canceled}, skipped ${skipped}, errors ${errors.length}`;
  } else if (suspiciousReasons.length > 0) {
    finalStatus = 'suspicious';
    finalMessage = `Imported ${imported}, updated ${updated} — suspicious: ${suspiciousReasons.join('; ')}`;
  } else {
    finalStatus = 'success';
    finalMessage = `Imported ${imported}, updated ${updated}, canceled ${canceled}, skipped ${skipped}`;
  }

  await prisma.channelIntegration.update({
    where: { id: integration.id },
    data: {
      lastSyncedAt: new Date(),
      lastSyncStatus: finalStatus,
      lastSyncMessage: finalMessage,
      lastSyncCount: events.length,
    },
  });

  return { integrationId: integration.id, tenantId, channelName: integration.channelName, roomId: integration.roomId, imported, updated, canceled, skipped, errors, success: errors.length === 0, message: finalMessage };
}

/**
 * Heuristics to catch iCal feeds that look wrong.
 * Returns a list of human-readable reasons — empty array = looks fine.
 */
function detectSuspiciousPatterns(events: { uid: string; start: Date; end: Date; status: string }[]): string[] {
  const reasons: string[] = [];

  // 1. Excessive event count for a single listing. 300 events ~= 1 booking/day for a year —
  // well above a realistic short-term rental, likely a corrupted/combined feed.
  const confirmed = events.filter(e => e.status !== 'CANCELLED');
  if (confirmed.length > 300) {
    reasons.push(`${confirmed.length} events in feed (threshold 300)`);
  }

  // 2. Physically-impossible overlaps on the same room. Two confirmed bookings whose date
  // ranges overlap strictly — a single room can't be occupied twice at once.
  const sorted = [...confirmed].sort((a, b) => a.start.getTime() - b.start.getTime());
  let overlaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) overlaps++;
  }
  if (overlaps >= 3) {
    reasons.push(`${overlaps} overlapping bookings on one room`);
  }

  return reasons;
}

/**
 * Sync all active integrations for a specific channel across ALL tenants.
 * Used by the cron endpoint — each platform runs on its own schedule.
 */
export async function syncAllTenantsForChannel(channel: Channel) {
  const integrations = await prisma.channelIntegration.findMany({
    where: {
      channelName: channel,
      isActive: true,
      tenant: { integrationsEnabled: true },
    },
  });

  const results: SyncResult[] = [];
  for (const integration of integrations) {
    try {
      results.push(await performSync(integration, integration.tenantId));
    } catch (err: any) {
      results.push({
        integrationId: integration.id,
        tenantId: integration.tenantId,
        channelName: integration.channelName,
        roomId: integration.roomId,
        imported: 0, updated: 0, canceled: 0, skipped: 0,
        errors: [err.message || String(err)],
        success: false,
        message: `Unhandled error: ${err.message}`,
      });
    }
  }

  return results;
}
