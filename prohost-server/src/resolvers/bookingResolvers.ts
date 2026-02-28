import { AppContext, requireAuth, requireTenant } from '../context';
import { differenceInCalendarDays } from 'date-fns';

interface BookingInput {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  city?: string;
  room: string;
  checkIn: string; // ISO DateTime
  checkOut: string; // ISO DateTime
  nightPrice: number;
  deposit: number;
  notes?: string;
  status?: string;
}

function calculateBookingDetails(input: BookingInput, taxRate: number = 0) {
  const checkIn = new Date(input.checkIn);
  const checkOut = new Date(input.checkOut);
  const nights = differenceInCalendarDays(checkOut, checkIn);

  if (nights <= 0) {
    throw new Error('Check-out must be after check-in');
  }

  const totalPrice = nights * input.nightPrice;
  const tax = totalPrice * (taxRate / 100);
  const remaining = totalPrice + tax - input.deposit;

  return {
    nights,
    totalPrice,
    tax,
    remaining,
  };
}

// Helper to normalize booking status to uppercase enum value
function normalizeBooking(booking: any) {
  return {
    ...booking,
    status: booking.status?.toUpperCase() || 'UPCOMING',
  };
}

export const bookingResolvers = {
  Query: {
    async getBookings(
      _: any,
      {
        filter,
        limit = 100,
        offset = 0,
        sortBy = 'checkIn',
        sortOrder = 'desc',
      }: {
        filter?: any;
        limit?: number;
        offset?: number;
        sortBy?: string;
        sortOrder?: string;
      },
      context: AppContext
    ) {
      requireAuth(context);

      const where: any = {
        tenantId: context.tenantId,
      };

      // Apply filters
      if (filter?.status) {
        where.status = filter.status.toLowerCase();
      }
      if (filter?.room) {
        where.room = filter.room;
      }
      if (filter?.guestName) {
        where.guestName = { contains: filter.guestName, mode: 'insensitive' };
      }
      if (filter?.startDate || filter?.endDate) {
        where.checkIn = {};
        if (filter.startDate) {
          where.checkIn.gte = new Date(filter.startDate);
        }
        if (filter.endDate) {
          where.checkIn.lte = new Date(filter.endDate);
        }
      }

      const bookings = await context.prisma.booking.findMany({
        where,
        take: Math.min(limit, 500), // Max 500 per query
        skip: offset,
        orderBy: {
          [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc',
        },
      });

      return bookings.map(normalizeBooking);
    },

    async getBooking(
      _: any,
      { id }: { id: string },
      context: AppContext
    ) {
      requireAuth(context);

      const booking = await context.prisma.booking.findFirst({
        where: {
          id,
          tenantId: context.tenantId,
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      return normalizeBooking(booking);
    },

    async getBookingsByDateRange(
      _: any,
      { startDate, endDate }: { startDate: string; endDate: string },
      context: AppContext
    ) {
      requireAuth(context);

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        throw new Error('Start date must be before end date');
      }

      const bookings = await context.prisma.booking.findMany({
        where: {
          tenantId: context.tenantId,
          checkIn: { gte: start },
          checkOut: { lte: end },
        },
        orderBy: { checkIn: 'asc' },
      });

      return bookings.map(normalizeBooking);
    },

    async getBookingsByRoom(
      _: any,
      { room }: { room: string },
      context: AppContext
    ) {
      requireAuth(context);

      const bookings = await context.prisma.booking.findMany({
        where: {
          tenantId: context.tenantId,
          room,
        },
        orderBy: { checkIn: 'desc' },
      });

      return bookings.map(normalizeBooking);
    },
  },

  Mutation: {
    async createBooking(
      _: any,
      { input }: { input: BookingInput },
      context: AppContext
    ) {
      requireAuth(context);

      const tenant = await context.prisma.tenant.findUnique({
        where: { id: context.tenantId },
        include: { settings: true },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Validate room exists
      const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);
      if (!rooms.find((r: any) => r.id === input.room)) {
        throw new Error('Invalid room');
      }

      // Calculate booking details
      const bookingDetails = calculateBookingDetails(
        input,
        tenant.settings?.defaultTax || 0
      );

      // Create booking
      const booking = await context.prisma.booking.create({
        data: {
          tenantId: context.tenantId!,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          city: input.city,
          room: input.room,
          checkIn: new Date(input.checkIn),
          checkOut: new Date(input.checkOut),
          nightPrice: input.nightPrice,
          deposit: input.deposit,
          status: input.status?.toLowerCase() || 'upcoming',
          notes: input.notes,
          ...bookingDetails,
        },
      });

      // Audit log
      await context.prisma.auditLog.create({
        data: {
          tenantId: context.tenantId!,
          action: 'BOOKING_CREATED',
          entityType: 'Booking',
          entityId: booking.id,
          changes: { action: 'booking_created', booking },
        },
      });

      return normalizeBooking(booking);
    },

    async updateBooking(
      _: any,
      { id, input }: { id: string; input: Partial<BookingInput> },
      context: AppContext
    ) {
      requireAuth(context);

      // Verify ownership
      const booking = await context.prisma.booking.findFirst({
        where: {
          id,
          tenantId: context.tenantId,
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const tenant = await context.prisma.tenant.findUnique({
        where: { id: context.tenantId },
        include: { settings: true },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Recalculate if dates or prices changed
      const updateData: any = { ...input };
      if (input.checkIn || input.checkOut || input.nightPrice || input.deposit) {
        const newInput = {
          checkIn: input.checkIn || booking.checkIn.toISOString(),
          checkOut: input.checkOut || booking.checkOut.toISOString(),
          nightPrice: input.nightPrice || booking.nightPrice,
          deposit: input.deposit || booking.deposit,
          guestName: '',
        };
        
        const bookingDetails = calculateBookingDetails(
          newInput as BookingInput,
          tenant.settings?.defaultTax || 0
        );
        
        Object.assign(updateData, bookingDetails);
      }

      if (input.status) {
        updateData.status = input.status.toLowerCase();
      }

      const updated = await context.prisma.booking.update({
        where: { id },
        data: updateData,
      });

      // Audit log
      await context.prisma.auditLog.create({
        data: {
          tenantId: context.tenantId!,
          action: 'BOOKING_UPDATED',
          entityType: 'Booking',
          entityId: booking.id,
          changes: { before: booking, after: updated },
        },
      });

      return normalizeBooking(updated);
    },

    async deleteBooking(
      _: any,
      { id }: { id: string },
      context: AppContext
    ) {
      requireAuth(context);

      const booking = await context.prisma.booking.findFirst({
        where: {
          id,
          tenantId: context.tenantId,
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      await context.prisma.booking.delete({
        where: { id },
      });

      // Audit log
      await context.prisma.auditLog.create({
        data: {
          tenantId: context.tenantId!,
          action: 'BOOKING_DELETED',
          entityType: 'Booking',
          entityId: id,
          changes: { action: 'booking_deleted', booking },
        },
      });

      return true;
    },

    async bulkImportBookings(
      _: any,
      { bookings }: { bookings: BookingInput[] },
      context: AppContext
    ) {
      requireAuth(context);

      if (!bookings || bookings.length === 0) {
        throw new Error('No bookings to import');
      }

      if (bookings.length > 1000) {
        throw new Error('Cannot import more than 1000 bookings at once');
      }

      const tenant = await context.prisma.tenant.findUnique({
        where: { id: context.tenantId },
        include: { settings: true },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);

      const created = await Promise.all(
        bookings.map((b) => {
          // Validate
          if (!rooms.find((r: any) => r.id === b.room)) {
            throw new Error(`Invalid room: ${b.room}`);
          }

          const details = calculateBookingDetails(
            b,
            tenant.settings?.defaultTax || 0
          );

          return context.prisma.booking.create({
            data: {
              tenantId: context.tenantId!,
              guestName: b.guestName,
              guestEmail: b.guestEmail,
              guestPhone: b.guestPhone,
              city: b.city,
              room: b.room,
              checkIn: new Date(b.checkIn),
              checkOut: new Date(b.checkOut),
              nightPrice: b.nightPrice,
              deposit: b.deposit,
              status: b.status?.toLowerCase() || 'upcoming',
              notes: b.notes,
              ...details,
            },
          });
        })
      );

      // Audit log
      await context.prisma.auditLog.create({
        data: {
          tenantId: context.tenantId!,
          action: 'BOOKING_CREATED',
          entityType: 'Booking',
          entityId: 'bulk-import',
          changes: { action: 'bulk_import', count: created.length },
        },
      });

      return created;
    },

    async bulkDeleteBookings(
      _: any,
      { ids }: { ids: string[] },
      context: AppContext
    ) {
      requireAuth(context);

      if (!ids || ids.length === 0) {
        throw new Error('No booking IDs provided');
      }

      await context.prisma.booking.deleteMany({
        where: {
          id: { in: ids },
          tenantId: context.tenantId,
        },
      });

      // Audit log
      await context.prisma.auditLog.create({
        data: {
          tenantId: context.tenantId!,
          action: 'BOOKING_DELETED',
          entityType: 'Booking',
          entityId: 'bulk-delete',
          changes: { action: 'bulk_delete', ids, count: ids.length },
        },
      });

      return true;
    },
  },
};
