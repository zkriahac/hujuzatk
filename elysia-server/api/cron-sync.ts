import type { VercelRequest, VercelResponse } from '@vercel/node';
import { syncAllTenantsForChannel, VALID_CHANNELS, type Channel } from '../channelSync';

/**
 * Cron endpoint — sync ALL tenants' bookings for a single channel.
 * Triggered by Vercel cron (one schedule per platform).
 *
 * Auth:
 *   Vercel: automatic via `x-vercel-cron` header
 *   External (Fly/curl): Authorization: Bearer ${CRON_SECRET}
 *
 * Usage: /api/cron-sync?channel=airbnb
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth: accept either Vercel's built-in cron header or a Bearer secret
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const authHeader = req.headers.authorization || '';
  const secret = process.env.CRON_SECRET;
  const hasValidSecret = secret && authHeader === `Bearer ${secret}`;

  if (!isVercelCron && !hasValidSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const channel = String(req.query.channel || '').toLowerCase();
  if (!VALID_CHANNELS.includes(channel as Channel)) {
    res.status(400).json({ error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` });
    return;
  }

  const startedAt = Date.now();
  try {
    const results = await syncAllTenantsForChannel(channel as Channel);
    const totals = results.reduce(
      (acc, r) => ({
        imported: acc.imported + r.imported,
        updated: acc.updated + r.updated,
        canceled: acc.canceled + r.canceled,
        skipped: acc.skipped + r.skipped,
        failed: acc.failed + (r.success ? 0 : 1),
      }),
      { imported: 0, updated: 0, canceled: 0, skipped: 0, failed: 0 }
    );

    res.json({
      ok: true,
      channel,
      integrationsProcessed: results.length,
      totals,
      durationMs: Date.now() - startedAt,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, channel, error: err.message || String(err) });
  }
}
