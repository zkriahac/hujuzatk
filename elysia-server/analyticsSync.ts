/**
 * analyticsSync.ts
 * Pre-computes monthly occupancy stats for all tenants and upserts to
 * MonthlyOccupancyCache so the heatmap query reads from cache instead of
 * scanning all bookings on every request.
 *
 * Called by:
 *  - /api/cron-analytics  (monthly Vercel cron, 1st of each month at 04:00 UTC)
 *  - local dev route GET /api/cron-analytics
 */

import { PrismaClient } from '@prisma/client';
import { getDaysInMonth, addMonths, subMonths } from 'date-fns';

/**
 * Build (or refresh) the occupancy cache for a single tenant + room + month.
 */
async function buildOneRoom(
  prisma: PrismaClient,
  tenantId: string,
  roomId: string,
  roomName: string,
  year: number,
  month: number, // 1-indexed
) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1); // exclusive upper bound
  const totalNights = getDaysInMonth(monthStart);

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      room: roomId,
      status: { notIn: ['canceled', 'no_show'] },
      checkIn: { lt: monthEnd },
      checkOut: { gt: monthStart },
    },
    select: { checkIn: true, checkOut: true },
  });

  let occupiedNights = 0;
  for (let day = 1; day <= totalNights; day++) {
    const date = new Date(year, month - 1, day);
    const isOccupied = bookings.some(
      (b) => new Date(b.checkIn) <= date && new Date(b.checkOut) > date,
    );
    if (isOccupied) occupiedNights++;
  }

  const occupancyRate = totalNights > 0 ? occupiedNights / totalNights : 0;

  // Generate a deterministic id so upserts don't need a separate lookup
  const stableId = `${tenantId}_${roomId}_${year}_${month}`;

  await prisma.monthlyOccupancyCache.upsert({
    where: { tenantId_roomId_year_month: { tenantId, roomId, year, month } },
    update: { occupiedNights, totalNights, occupancyRate, updatedAt: new Date() },
    create: {
      id: stableId,
      tenantId,
      roomId,
      year,
      month,
      occupiedNights,
      totalNights,
      occupancyRate,
    },
  });
}

/**
 * Build occupancy cache for all tenants.
 * - First run (cache empty for tenant): backfill 36 months.
 * - Subsequent runs: refresh current month + next month (upcoming bookings).
 */
export async function buildAllTenantsCache(prisma: PrismaClient) {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true, rooms: true },
  });

  const now = new Date();

  for (const tenant of tenants) {
    const rooms = (tenant.rooms as { id: string; name: string }[]) || [];
    if (!rooms.length) continue;

    const existingCount = await prisma.monthlyOccupancyCache.count({
      where: { tenantId: tenant.id },
    });

    const monthsToProcess: { year: number; month: number }[] = [];

    if (existingCount === 0) {
      // First run: backfill 36 months back + current
      for (let i = 35; i >= 0; i--) {
        const d = subMonths(now, i);
        monthsToProcess.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
      }
    } else {
      // Regular run: current month + next (captures upcoming bookings)
      for (let i = 0; i <= 1; i++) {
        const d = addMonths(now, i);
        monthsToProcess.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
      }
    }

    for (const { year, month } of monthsToProcess) {
      for (const room of rooms) {
        await buildOneRoom(prisma, tenant.id, room.id, room.name, year, month);
      }
    }
  }
}
