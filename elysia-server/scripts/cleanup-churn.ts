/**
 * Clean up UID-churn duplicate bookings (see channelSync UID-drift fix).
 *
 *   DRY RUN (default):  bun run scripts/cleanup-churn.ts
 *   APPLY:              bun run scripts/cleanup-churn.ts --apply
 *
 * Dedup key is the platform reservation id (externalReservationId), which is
 * stable across the UID rotation that caused the churn. Only provably-safe
 * deletions are performed:
 *   Phase 1 — delete CANCELED rows that have a LIVE sibling with the same
 *             reservation id (pure stale-UID duplicates of a live booking).
 *   Phase 2 — for canceled-ONLY churn groups (same reservation id, no live row),
 *             keep the most recent canceled row and delete the older duplicates.
 * Nothing is ever un-canceled, no live row is deleted, and a single genuine
 * cancellation (one canceled row, no duplicates) is never touched. Slots that
 * still need a human (double-booked-live, fully-canceled stays) are only
 * reported, never mutated.
 */
import { prisma } from '../prisma';

const APPLY = process.argv.includes('--apply');

// Rows superseded by a live booking with the same (tenant, room, reservation id).
const PHASE1_WHERE = `
  c."createdBy" = 'channel_sync' AND c.status = 'canceled'
  AND c."externalReservationId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "Booking" l
    WHERE l."createdBy" = 'channel_sync' AND l.status <> 'canceled'
      AND l."tenantId" = c."tenantId" AND l.room = c.room
      AND l."externalReservationId" = c."externalReservationId"
  )`;

// Older canceled duplicates within a canceled-only churn group.
const PHASE2_WHERE = `
  c."createdBy" = 'channel_sync' AND c.status = 'canceled'
  AND c."externalReservationId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Booking" l
    WHERE l."createdBy" = 'channel_sync' AND l.status <> 'canceled'
      AND l."tenantId" = c."tenantId" AND l.room = c.room
      AND l."externalReservationId" = c."externalReservationId"
  )
  AND EXISTS (
    SELECT 1 FROM "Booking" o
    WHERE o."createdBy" = 'channel_sync' AND o.status = 'canceled'
      AND o."tenantId" = c."tenantId" AND o.room = c.room
      AND o."externalReservationId" = c."externalReservationId"
      AND (o."createdAt" > c."createdAt" OR (o."createdAt" = c."createdAt" AND o.id > c.id))
  )`;

async function count(where: string): Promise<number> {
  const r = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM "Booking" c WHERE ${where}`
  );
  return r[0]?.n ?? 0;
}

async function del(where: string): Promise<number> {
  // Postgres DELETE can't alias the target in FROM, so resolve ids first.
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT c.id FROM "Booking" c WHERE ${where}`
  );
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return 0;
  const res = await prisma.booking.deleteMany({ where: { id: { in: ids } } });
  return res.count;
}

async function main() {
  console.log(`\n=== cleanup-churn (${APPLY ? 'APPLY' : 'DRY RUN'}) ===\n`);

  const p1 = await count(PHASE1_WHERE);
  const p2 = await count(PHASE2_WHERE);
  console.log(`Phase 1 — canceled rows with a live same-reservation sibling: ${p1}`);
  console.log(`Phase 2 — older canceled duplicates in canceled-only groups:  ${p2}`);
  console.log(`Total deletable: ${p1 + p2}\n`);

  if (APPLY) {
    const d1 = await del(PHASE1_WHERE);
    const d2 = await del(PHASE2_WHERE);
    console.log(`Deleted Phase 1: ${d1}`);
    console.log(`Deleted Phase 2: ${d2}\n`);
  } else {
    console.log('(dry run — re-run with --apply to delete)\n');
  }

  // Report-only: things a human must decide on.
  const doubleLive = await prisma.$queryRawUnsafe<any[]>(`
    SELECT t.name AS tenant, b.room, b."externalReservationId" AS resid, count(*)::int AS live_rows
    FROM "Booking" b JOIN "Tenant" t ON t.id = b."tenantId"
    WHERE b."createdBy" = 'channel_sync' AND b.status <> 'canceled' AND b."externalReservationId" IS NOT NULL
    GROUP BY t.name, b.room, b."externalReservationId"
    HAVING count(*) > 1
    ORDER BY t.name, b.room`);
  console.log(`⚠️  Double-booked-live (same reservation, >1 live row — review manually): ${doubleLive.length}`);
  for (const d of doubleLive) console.log(`    ${d.tenant} room=${d.room} resid=${d.resid} live_rows=${d.live_rows}`);

  const fullyCanceled = await prisma.$queryRawUnsafe<any[]>(`
    WITH g AS (
      SELECT b."tenantId", t.name AS tenant, b.room, b."externalReservationId" AS resid,
        min(b."checkIn") AS ci, min(b."checkOut") AS co,
        count(*) FILTER (WHERE b.status <> 'canceled') AS live
      FROM "Booking" b JOIN "Tenant" t ON t.id = b."tenantId"
      WHERE b."createdBy" = 'channel_sync' AND b."externalReservationId" IS NOT NULL
      GROUP BY b."tenantId", t.name, b.room, b."externalReservationId"
    )
    SELECT tenant, room, resid, to_char(ci,'YYYY-MM-DD') AS checkin, to_char(co,'YYYY-MM-DD') AS checkout
    FROM g WHERE live = 0 ORDER BY tenant, ci`);
  console.log(`\nℹ️  Fully-canceled reservations (no live row — fixed sync will heal any still in-feed; past ones need Gathern review): ${fullyCanceled.length}`);
  for (const f of fullyCanceled) console.log(`    ${f.tenant} room=${f.room} resid=${f.resid} ${f.checkin}→${f.checkout}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
