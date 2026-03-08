import { AppContext, requireAuth } from '../context';
import { getDaysInMonth } from 'date-fns';

export const reportResolvers = {
  Query: {
    async getOccupancyReport(
      _: any,
      { room, year, month }: { room?: string; year: number; month: number },
      context: AppContext
    ) {
      requireAuth(context);

      if (month < 1 || month > 12) {
        throw new Error('Month must be between 1 and 12');
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const daysInMonth = getDaysInMonth(startDate);

      const query: any = {
        where: {
          tenantId: context.tenantId,
          checkIn: { lte: endDate },
          checkOut: { gte: startDate },
          status: { not: 'CANCELED' },
        },
      };

      if (room) {
        query.where.room = room;
      }

      const bookings = await context.prisma.booking.findMany(query);

      // Calculate occupied nights
      let occupiedNights = 0;
      bookings.forEach((booking: any) => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);

        // Clamp to month boundaries
        const start = checkIn > startDate ? checkIn : startDate;
        const end = checkOut < endDate ? checkOut : endDate;

        const nights = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        occupiedNights += Math.max(0, nights);
      });

      const totalNights = daysInMonth * (room ? 1 : 5); // 5 default rooms
      const occupancyRate = totalNights > 0 ? (occupiedNights / totalNights) * 100 : 0;

      return {
        room: room || 'All',
        month: `${year}-${String(month).padStart(2, '0')}`,
        totalNights,
        occupiedNights,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      };
    },

    async getRevenueReport(
      _: any,
      { year, month }: { year: number; month?: number },
      context: AppContext
    ) {
      requireAuth(context);

      const startDate = month
        ? new Date(year, month - 1, 1)
        : new Date(year, 0, 1);

      const endDate = month
        ? new Date(year, month, 0)
        : new Date(year, 11, 31);

      const bookings = await context.prisma.booking.findMany({
        where: {
          tenantId: context.tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalRevenue = bookings.reduce((sum: number, b: any) => sum + b.totalPrice, 0);
      const totalDeposits = bookings.reduce((sum: number, b: any) => sum + b.deposit, 0);
      const totalOutstanding = bookings.reduce((sum: number, b: any) => sum + b.remaining, 0);
      const bookingCount = bookings.length;
      const averageBookingValue = bookingCount > 0 ? totalRevenue / bookingCount : 0;

      return {
        year,
        month,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalDeposits: Math.round(totalDeposits * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        bookingCount,
        averageBookingValue: Math.round(averageBookingValue * 100) / 100,
      };
    },

    async getGuestStatistics(_: any, __: any, context: AppContext) {
      requireAuth(context);

      const bookings = await context.prisma.booking.findMany({
        where: { tenantId: context.tenantId },
      });

      // Total guests
      const totalGuests = bookings.length;

      // Unique cities
      const cities = new Set(bookings.map((b: any) => b.city).filter(Boolean));
      const uniqueCities = cities.size;

      // Average night stay
      const totalNights = bookings.reduce((sum: number, b: any) => sum + b.nights, 0);
      const averageNightStay = totalGuests > 0 ? totalNights / totalGuests : 0;

      // Repeat guest rate
      const guestNames = bookings.map((b: any) => b.guestName);
      const uniqueGuests = new Set(guestNames);
      const repeatBookings = bookings.length - uniqueGuests.size;
      const repeatGuestRate = totalGuests > 0 ? (repeatBookings / totalGuests) * 100 : 0;

      // Cancellation rate
      const canceledBookings = bookings.filter((b: any) => b.status === 'CANCELED').length;
      const cancellationRate = totalGuests > 0 ? (canceledBookings / totalGuests) * 100 : 0;

      return {
        totalGuests,
        uniqueCities,
        averageNightStay: Math.round(averageNightStay * 100) / 100,
        repeatGuestRate: Math.round(repeatGuestRate * 100) / 100,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
      };
    },
  },
};
