/**
 * Verify the UID-drift fix on ONE integration without deploying.
 * Runs the (fixed) performSync against a single live integration and checks:
 *   - no duplicate row is created for an unchanged reservation, and
 *   - a fully-canceled future reservation still in the feed is re-linked/healed.
 *
 *   bun run scripts/verify-sync.ts <tenantName> <roomId> <resid>
 *   e.g. bun run scripts/verify-sync.ts "شقق الراشد" r12 11893920
 */
import { prisma } from '../prisma';
import { performSync } from '../channelSync';

async function snapshot(tenantId: string, room: string, channel: string, resid: string) {
  const rows = await prisma.booking.findMany({
    where: { tenantId, room, externalChannel: channel, externalReservationId: resid },
    select: { id: true, status: true, externalId: true },
    orderBy: { createdAt: 'asc' },
  });
  const total = await prisma.booking.count({
    where: { tenantId, room, externalChannel: channel, createdBy: 'channel_sync' },
  });
  return { rows, total };
}

async function main() {
  const [tenantName, roomId, resid] = process.argv.slice(2);
  if (!tenantName || !roomId || !resid) { console.error('args: <tenantName> <roomId> <resid>'); process.exit(1); }

  const tenant = await prisma.tenant.findFirst({ where: { name: tenantName }, select: { id: true } });
  if (!tenant) { console.error(`tenant not found: ${tenantName}`); process.exit(1); }
  const integration = await prisma.channelIntegration.findFirst({
    where: { tenantId: tenant.id, roomId, channelName: 'gathern' },
  });
  if (!integration) { console.error(`integration not found for room ${roomId}`); process.exit(1); }

  const before = await snapshot(tenant.id, roomId, 'gathern', resid);
  console.log(`\n=== BEFORE ===`);
  console.log(`room ${roomId} total channel_sync rows: ${before.total}`);
  console.log(`resid ${resid} rows: ${before.rows.length} →`, before.rows.map(r => r.status).join(', '));

  console.log(`\n=== running performSync (fixed code) ===`);
  const result = await performSync(integration, tenant.id);
  console.log(`imported=${result.imported} updated=${result.updated} canceled=${result.canceled} skipped=${result.skipped} blocksRemoved=${result.blocksRemoved}`);
  console.log(`message: ${result.message}`);

  const after = await snapshot(tenant.id, roomId, 'gathern', resid);
  console.log(`\n=== AFTER ===`);
  console.log(`room ${roomId} total channel_sync rows: ${after.total}  (delta ${after.total - before.total})`);
  console.log(`resid ${resid} rows: ${after.rows.length} →`, after.rows.map(r => r.status).join(', '));

  console.log(`\n=== VERDICT ===`);
  console.log(`  no duplicate created for room: ${after.total <= before.total ? 'PASS' : 'FAIL (delta +' + (after.total - before.total) + ')'}`);
  const live = after.rows.some(r => r.status !== 'canceled');
  console.log(`  target reservation now live (healed): ${live ? 'PASS' : 'still canceled'}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
