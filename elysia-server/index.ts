import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { yoga } from './graphql';
import { syncAllTenantsForChannel, VALID_CHANNELS, type Channel } from './channelSync';
import { buildAllTenantsCache } from './analyticsSync';
import { PrismaClient } from '@prisma/client';
const prismaForCron = new PrismaClient();

const ALLOWED_ORIGINS = [
  'https://hujuzatk.com',
  'https://www.hujuzatk.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const app = new Elysia()
  .use(cors({
    origin: (request: Request) => {
      const origin = request.headers.get('origin') || '';
      return !origin || ALLOWED_ORIGINS.includes(origin);
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 86400,
  }))
  .onError(({ code, error, set }) => {
    const timestamp = new Date().toISOString();
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { error: 'Route not found', timestamp };
    }
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: 'Validation error', details: error.message, timestamp };
    }
    console.error(`[${timestamp}] Unhandled error (${code}):`, error);
    set.status = 500;
    return { error: 'Internal server error', timestamp };
  })
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .get('/api/cron-sync', async ({ query, headers, set }) => {
    const isVercelCron = headers['x-vercel-cron'] === '1';
    const secret = process.env.CRON_SECRET;
    const hasValidSecret = secret && headers.authorization === `Bearer ${secret}`;
    if (!isVercelCron && !hasValidSecret) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    const channel = String(query.channel || '').toLowerCase();
    if (!VALID_CHANNELS.includes(channel as Channel)) {
      set.status = 400;
      return { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` };
    }
    const startedAt = Date.now();
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
    return { ok: true, channel, integrationsProcessed: results.length, totals, durationMs: Date.now() - startedAt, results };
  })
  .get('/api/cron-analytics', async ({ headers, set }) => {
    const isVercelCron = headers['x-vercel-cron'] === '1';
    const secret = process.env.CRON_SECRET;
    const hasValidSecret = secret && headers.authorization === `Bearer ${secret}`;
    if (!isVercelCron && !hasValidSecret) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    const startedAt = Date.now();
    await buildAllTenantsCache(prismaForCron);
    return { ok: true, durationMs: Date.now() - startedAt };
  })
  .all('/graphql', async ({ request, set }) => {
    const response = await yoga.handle(request);
    set.status = response.status;
    response.headers.forEach((value, key) => set.headers[key] = value);
    return await response.text();
  })
  .listen(process.env.PORT ? Number(process.env.PORT) : 4000);

console.log(`Server running at http://localhost:${process.env.PORT || 4000}`);
