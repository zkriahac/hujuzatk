/**
 * Proves a manually-set price survives a sync (no override).
 *   bun run scripts/test-price-preserve.ts "<tenant>" <roomId> <resid>
 *
 * Sets a sentinel price on a live in-feed booking, runs the REAL performSync,
 * checks the price is unchanged, then restores the original values. Read-modify-
 * restore — leaves the row exactly as found.
 */
import { prisma } from '../prisma';
import { performSync } from '../channelSync';

const SENTINEL = 777.77;

async function main() {
  const [tenantName, roomId, resid] = process.argv.slice(2);
  const tenant = await prisma.tenant.findFirst({ where: { name: tenantName }, select: { id: true } });
  if (!tenant) { console.error('tenant not found'); process.exit(1); }

  const integration = await prisma.channelIntegration.findFirst({
    where: { tenantId: tenant.id, roomId, channelName: 'gathern' },
  });
  if (!integration) { console.error('integration not found'); process.exit(1); }

  const booking = await prisma.booking.findFirst({
    where: { tenantId: tenant.id, room: roomId, externalReservationId: resid, status: { not: 'canceled' } },
    orderBy: { createdAt: 'desc' },
  });
  if (!booking) { console.error('live booking not found for resid'); process.exit(1); }

  const orig = {
    nightPrice: booking.nightPrice, totalPrice: booking.totalPrice,
    tax: booking.tax, deposit: booking.deposit, remaining: booking.remaining,
    guestName: booking.guestName,
  };
  console.log(`\nBooking ${booking.id}`);
  console.log(`  original nightPrice=${orig.nightPrice} total=${orig.totalPrice}`);

  try {
    // 1. Simulate a manual price edit.
    await prisma.booking.update({
      where: { id: booking.id },
      data: { nightPrice: SENTINEL, totalPrice: SENTINEL * booking.nights, guestName: 'EDITED — price test' },
    });
    console.log(`  set sentinel nightPrice=${SENTINEL}, guestName="EDITED — price test"`);

    // 2. Run the real sync (this reservation is in the feed → will UPDATE this row).
    const r = await performSync(integration, tenant.id);
    console.log(`  performSync → imported=${r.imported} updated=${r.updated} canceled=${r.canceled}`);

    // 3. Re-read and assert.
    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    console.log(`\n  AFTER SYNC: nightPrice=${after?.nightPrice} total=${after?.totalPrice} guestName="${after?.guestName}"`);
    const pricePreserved = after?.nightPrice === SENTINEL;
    const nameUpdated = after?.guestName !== 'EDITED — price test'; // sync overwrites auto-looking names; our edit looks manual? see note
    console.log(`\n  VERDICT — price preserved across sync: ${pricePreserved ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`  (guestName after sync: "${after?.guestName}" — a real manual name would also be kept)`);
  } finally {
    // 4. Restore exactly.
    await prisma.booking.update({ where: { id: booking.id }, data: orig });
    console.log(`\n  restored original values.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
