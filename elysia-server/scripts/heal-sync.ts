/**
 * One-shot heal sync: run the (fixed) sync across every active integration so
 * in-feed reservations get re-linked by reservation id instead of duplicated.
 *   bun run scripts/heal-sync.ts
 */
import { syncAllTenantsForChannel } from '../channelSync';

async function main() {
  for (const channel of ['gathern', 'airbnb'] as const) {
    const results = await syncAllTenantsForChannel(channel);
    const totals = results.reduce(
      (a, r) => ({
        imported: a.imported + r.imported,
        updated: a.updated + r.updated,
        canceled: a.canceled + r.canceled,
        skipped: a.skipped + r.skipped,
        failed: a.failed + (r.success ? 0 : 1),
      }),
      { imported: 0, updated: 0, canceled: 0, skipped: 0, failed: 0 }
    );
    console.log(`[${channel}] integrations=${results.length}`, totals);
    const errs = results.filter((r) => !r.success);
    for (const e of errs.slice(0, 8)) console.log(`   ERR ${e.channelName}/${e.roomId}: ${e.message}`);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
