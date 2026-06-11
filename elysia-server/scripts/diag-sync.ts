/**
 * READ-ONLY sync diagnostic. Run: bun run scripts/diag-sync.ts
 * Investigates why a given day produced no channel_sync imports.
 */
import { prisma } from '../prisma';

function ymd(d: Date) {
  // Report in Asia/Riyadh (UTC+3) so day boundaries match what the host sees.
  return new Date(d.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

async function main() {
  // ── 1. Integration last-sync state ──
  const integrations = await prisma.channelIntegration.findMany({
    orderBy: [{ channelName: 'asc' }, { lastSyncedAt: 'desc' }],
    select: {
      id: true, tenantId: true, channelName: true, roomId: true, isActive: true,
      lastSyncedAt: true, lastSyncStatus: true, lastSyncMessage: true, lastSyncCount: true,
      tenant: { select: { name: true, integrationsEnabled: true } },
    },
  });

  console.log(`\n=== INTEGRATIONS (${integrations.length}) ===`);
  for (const i of integrations) {
    const last = i.lastSyncedAt ? `${i.lastSyncedAt.toISOString()} (${ymd(i.lastSyncedAt)} KSA)` : 'NEVER';
    console.log(
      `[${i.channelName}] tenant="${i.tenant?.name}" active=${i.isActive} tenantEnabled=${i.tenant?.integrationsEnabled}\n` +
      `   lastSyncedAt=${last}\n` +
      `   status=${i.lastSyncStatus ?? '-'} count=${i.lastSyncCount ?? '-'} msg="${i.lastSyncMessage ?? ''}"`
    );
  }

  // ── 2. Daily channel_sync booking creation, last 14 days (KSA buckets) ──
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const synced = await prisma.booking.findMany({
    where: { createdBy: 'channel_sync', createdAt: { gte: since } },
    select: { createdAt: true, externalChannel: true },
  });

  const byDay = new Map<string, Record<string, number>>();
  for (const b of synced) {
    const day = ymd(b.createdAt);
    const ch = b.externalChannel ?? 'unknown';
    const row = byDay.get(day) ?? {};
    row[ch] = (row[ch] ?? 0) + 1;
    byDay.set(day, row);
  }

  console.log(`\n=== channel_sync IMPORTS PER DAY (KSA), last 14d — total ${synced.length} ===`);
  const days: string[] = [];
  for (let k = 14; k >= 0; k--) {
    const d = new Date();
    d.setDate(d.getDate() - k);
    days.push(ymd(d));
  }
  for (const day of days) {
    const row = byDay.get(day);
    const detail = row ? Object.entries(row).map(([c, n]) => `${c}:${n}`).join(' ') : '—';
    const total = row ? Object.values(row).reduce((a, b) => a + b, 0) : 0;
    const flag = total === 0 ? '  <-- ZERO' : '';
    console.log(`  ${day}  total=${String(total).padStart(3)}  ${detail}${flag}`);
  }

  // ── 3. Spot the global newest channel_sync booking (is sync alive at all?) ──
  const newest = await prisma.booking.findFirst({
    where: { createdBy: 'channel_sync' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, externalChannel: true, guestName: true, checkIn: true },
  });
  console.log(`\n=== NEWEST channel_sync booking ever ===`);
  console.log(newest
    ? `  createdAt=${newest.createdAt.toISOString()} (${ymd(newest.createdAt)} KSA) ch=${newest.externalChannel} checkIn=${newest.checkIn.toISOString().slice(0,10)} guest="${newest.guestName}"`
    : '  NONE');

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
