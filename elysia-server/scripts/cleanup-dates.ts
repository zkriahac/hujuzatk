/**
 * Cleanup script: Normalize all synced booking dates to UTC midnight.
 * 
 * This fixes existing bookings that may have been stored with timezone-dependent
 * times. After this runs, all dates are stored as YYYY-MM-DD 00:00:00 UTC.
 * 
 * Usage: bun elysia-server/scripts/cleanup-dates.ts
 */

import { prisma } from '../prisma';

async function main() {
  console.log('Starting date cleanup...\n');

  // Fix all synced bookings by normalizing their dates to UTC midnight
  const result = await prisma.$executeRaw`
    UPDATE "Booking"
    SET
      "checkIn" = DATE_TRUNC('day', "checkIn" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
      "checkOut" = DATE_TRUNC('day', "checkOut" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
      "updatedAt" = NOW()
    WHERE "externalChannel" IN ('airbnb', 'gathern', 'booking.com')
  `;

  console.log(`✓ Updated ${result} booking(s)\n`);
  console.log('Dates are now normalized to UTC midnight.');
  console.log('All bookings will display consistently regardless of server timezone.');
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
