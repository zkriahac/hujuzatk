import { AppContext, requireAuth, requireTenant, requireSuperAdmin } from '../context';

interface UpdateTenantInput {
  name?: string;
  language?: string;
  currency?: string;
  timezone?: string;
}

interface UpdateTenantSettingsInput {
  defaultNightPrice?: number;
  defaultTax?: number;
  notifyOnBooking?: boolean;
  notifyOnCancellation?: boolean;
}

export const tenantResolvers = {
  Mutation: {
    async updateTenant(
      _: any,
      { input }: { input: UpdateTenantInput },
      context: AppContext
    ) {
      requireAuth(context);

      const tenant = await context.prisma.tenant.findUnique({
        where: { id: context.tenantId },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Check if new name already exists (if changing name)
      if (input.name && input.name !== tenant.name) {
        const existing = await context.prisma.tenant.findUnique({
          where: { name: input.name },
        });
        if (existing) {
          throw new Error('Name already taken');
        }
      }

      const updated = await context.prisma.tenant.update({
        where: { id: context.tenantId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.language && { language: input.language }),
          ...(input.currency && { currency: input.currency }),
          ...(input.timezone && { timezone: input.timezone }),
        },
        include: {
          settings: true,
          _count: {
            select: { bookings: true },
          },
        },
      });

      // Audit log
      await context.prisma.auditLog.create({
        data: {
          tenantId: context.tenantId!,
          action: 'TENANT_UPDATED',
          entityType: 'Tenant',
          entityId: context.tenantId!,
          changes: { action: 'tenant_updated', updates: JSON.parse(JSON.stringify(input)) },
        },
      });

      return {
        ...updated,
        bookingsCount: updated._count?.bookings || 0,
      };
    },

    async updateTenantSettings(
      _: any,
      { input }: { input: UpdateTenantSettingsInput },
      context: AppContext
    ) {
      requireAuth(context);

      // Validate inputs
      if (input.defaultNightPrice !== undefined && input.defaultNightPrice < 0) {
        throw new Error('Night price cannot be negative');
      }
      if (input.defaultTax !== undefined && (input.defaultTax < 0 || input.defaultTax > 100)) {
        throw new Error('Tax must be between 0 and 100');
      }

      let settings = await context.prisma.tenantSettings.findUnique({
        where: { tenantId: context.tenantId },
      });

      if (!settings) {
        // Create if doesn't exist
        settings = await context.prisma.tenantSettings.create({
          data: {
            tenantId: context.tenantId!,
            defaultNightPrice: input.defaultNightPrice || 50,
            defaultTax: input.defaultTax || 0,
            notifyOnBooking: input.notifyOnBooking !== undefined ? input.notifyOnBooking : true,
            notifyOnCancellation: input.notifyOnCancellation !== undefined ? input.notifyOnCancellation : true,
          },
        });
      } else {
        settings = await context.prisma.tenantSettings.update({
          where: { tenantId: context.tenantId },
          data: {
            ...(input.defaultNightPrice !== undefined && { defaultNightPrice: input.defaultNightPrice }),
            ...(input.defaultTax !== undefined && { defaultTax: input.defaultTax }),
            ...(input.notifyOnBooking !== undefined && { notifyOnBooking: input.notifyOnBooking }),
            ...(input.notifyOnCancellation !== undefined && { notifyOnCancellation: input.notifyOnCancellation }),
          },
        });
      }

      return settings;
    },

    async addRoom(_: any, { name }: { name: string }, context: AppContext) {
      requireAuth(context);

      const tenant = await context.prisma.tenant.findUnique({
        where: { id: context.tenantId },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);
      
      // Check if room name already exists
      if (rooms.some((r: any) => r.name === name)) {
        throw new Error('Room name already exists');
      }

      const newRoom = {
        id: `R${Date.now()}`,
        name,
      };

      rooms.push(newRoom);

      const updated = await context.prisma.tenant.update({
        where: { id: context.tenantId },
        data: {
          rooms: rooms,
        },
        include: {
          settings: true,
          _count: {
            select: { bookings: true },
          },
        },
      });

      return {
        ...updated,
        bookingsCount: updated._count?.bookings || 0,
      };
    },

    async removeRoom(
      _: any,
      { roomId }: { roomId: string },
      context: AppContext
    ) {
      requireAuth(context);

      const tenant = await context.prisma.tenant.findUnique({
        where: { id: context.tenantId },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);
      
      if (!rooms.find((r: any) => r.id === roomId)) {
        throw new Error('Room not found');
      }

      const updatedRooms = rooms.filter((r: any) => r.id !== roomId);

      const updated = await context.prisma.tenant.update({
        where: { id: context.tenantId },
        data: {
          rooms: updatedRooms,
        },
        include: {
          settings: true,
          _count: {
            select: { bookings: true },
          },
        },
      });

      return {
        ...updated,
        bookingsCount: updated._count?.bookings || 0,
      };
    },

    async createAdminSubscription(
      _: any,
      { tenantId, days }: { tenantId: string; days: number },
      context: AppContext
    ) {
      // Admin only
      await requireSuperAdmin(context);

      if (days <= 0) {
        throw new Error('Days must be positive');
      }

      const tenant = await context.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Calculate new valid until date
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + days);

      const updated = await context.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'active',
          validUntil,
        },
        include: {
          settings: true,
          _count: {
            select: { bookings: true },
          },
        },
      });

      // Create payment record
      await context.prisma.payment.create({
        data: {
          tenantId,
          amount: 0, // Admin grant, no charge
          currency: 'OMR',
          status: 'completed',
          planType: 'admin-grant',
          planDays: days,
          description: `Admin granted ${days} days subscription`,
        },
      });

      return {
        ...updated,
        bookingsCount: updated._count?.bookings || 0,
      };
    },

    async cancelSubscription(
      _: any,
      { tenantId }: { tenantId: string },
      context: AppContext
    ) {
      // Admin only
      await requireSuperAdmin(context);

      const tenant = await context.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      await context.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'canceled',
        },
      });

      // Audit log
      await context.prisma.auditLog.create({
        data: {
          tenantId,
          action: 'TENANT_UPDATED',
          entityType: 'Tenant',
          entityId: tenantId,
          changes: { action: 'subscription_canceled' },
        },
      });

      return true;
    },
  },
};
