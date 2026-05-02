import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { buildAllTenantsCache } from '../analyticsSync';

const prisma = new PrismaClient();

/**
 * Cron endpoint — pre-computes monthly occupancy for all tenants.
 * Vercel schedule: 0 4 1 * *  (04:00 UTC on the 1st of each month)
 *
 * Auth: x-vercel-cron header (Vercel) or Authorization: Bearer <CRON_SECRET>
 *
 * Can also be triggered manually:
 *   curl -H "Authorization: Bearer <CRON_SECRET>" https://api.hujuzatk.com/api/cron-analytics
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const authHeader = req.headers.authorization || '';
  const secret = process.env.CRON_SECRET;
  const hasValidSecret = secret && authHeader === `Bearer ${secret}`;

  if (!isVercelCron && !hasValidSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const startedAt = Date.now();
  try {
    await buildAllTenantsCache(prisma);
    res.json({ ok: true, durationMs: Date.now() - startedAt });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}
