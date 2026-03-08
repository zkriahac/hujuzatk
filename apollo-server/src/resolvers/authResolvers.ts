import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppContext, requireAuth, requireSuperAdmin } from '../context';

const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '14');

interface RegisterInput {
  email: string;
  name: string;
  password: string;
  currency?: string;
  timezone?: string;
  language?: string;
}

function generateTokens(tenantId: string, email: string) {
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (!secret || !refreshSecret) {
    throw new Error('JWT secrets not configured in .env');
  }

  const token = jwt.sign(
    { tenantId, email },
    secret as string,
    { expiresIn: process.env.JWT_EXPIRE || '24h' } as any
  );

  const refreshToken = jwt.sign(
    { tenantId, email },
    refreshSecret as string,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' } as any
  );

  return { token, refreshToken };
}

function calculateValidUntil(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// Helper to convert database values to GraphQL enum format
function normalizeTenant(tenant: any) {
  let rooms = tenant.rooms || [];
  // Handle rooms if it's a JSON string
  if (typeof rooms === 'string') {
    try {
      rooms = JSON.parse(rooms);
    } catch (e) {
      rooms = [];
    }
  }
  return {
    ...tenant,
    rooms: Array.isArray(rooms) ? rooms : [],
    subscriptionStatus: tenant.subscriptionStatus?.toUpperCase() || 'TRIAL',
  };
}

export const authResolvers = {
  Query: {
    async me(_: any, __: any, context: AppContext) {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const tenant = await context.prisma.tenant.findUnique({
        where: { id: context.user.tenantId },
        include: {
          settings: true,
          _count: {
            select: { bookings: true },
          },
        },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return {
        ...normalizeTenant(tenant),
        bookingsCount: tenant._count?.bookings || 0,
      };
    },

    async getTenant(_: any, { id }: { id: string }, context: AppContext) {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Users can only see their own tenant
      if (context.user.tenantId !== id && !context.user) {
        throw new Error('Unauthorized');
      }

      const tenant = await context.prisma.tenant.findUnique({
        where: { id },
        include: {
          settings: true,
          _count: {
            select: { bookings: true },
          },
        },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return {
        ...normalizeTenant(tenant),
        bookingsCount: tenant._count?.bookings || 0,
      };
    },

    async getAllTenants(_: any, __: any, context: AppContext) {
      // Admin only
      await requireSuperAdmin(context);

      const tenants = await context.prisma.tenant.findMany({
        include: {
          settings: true,
          _count: {
            select: { bookings: true },
          },
        },
      });

      return tenants.map((t: any) => ({
        ...normalizeTenant(t),
        bookingsCount: t._count?.bookings || 0,
      }));
    },
  },

  Mutation: {
    async register(
      _: any,
      { input }: { input: RegisterInput },
      context: AppContext
    ) {
      // Check if email already exists
      const existing = await context.prisma.tenant.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new Error('Email already registered');
      }

      // Validate password strength
      if (input.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create tenant
      const tenant = await context.prisma.tenant.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          currency: input.currency || 'OMR',
          timezone: input.timezone || 'Asia/Muscat',
          language: input.language || 'en',
          subscriptionStatus: 'TRIAL',
          validUntil: calculateValidUntil(TRIAL_DAYS),
          rooms: JSON.stringify([
            { id: 'A1', name: 'A1' },
            { id: 'A2', name: 'A2' },
            { id: 'A3', name: 'A3' },
            { id: 'A4', name: 'A4' },
            { id: 'A5', name: 'A5' },
          ]),
          isAdmin: false,
          isActive: true,
          settings: {
            create: {
              defaultNightPrice: 50,
              defaultTax: 0,
            },
          },
        },
        include: {
          settings: true,
        },
      });

      // Generate tokens
      const { token, refreshToken } = generateTokens(tenant.id, tenant.email);

      // Audit log
      await context.prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          action: 'TENANT_UPDATED',
          entityType: 'Tenant',
          entityId: tenant.id,
          changes: { action: 'tenant_created' },
        },
      });

      return {
        token,
        refreshToken,
        tenant: {
          ...normalizeTenant(tenant),
          bookingsCount: 0,
        },
      };
    },

    async login(
      _: any,
      { email, password }: { email: string; password: string },
      context: AppContext
    ) {
      // Find tenant
      const tenant = await context.prisma.tenant.findUnique({
        where: { email },
        include: { settings: true },
      });

      if (!tenant) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, tenant.passwordHash);
      if (!passwordMatch) {
        throw new Error('Invalid credentials');
      }

      // Check subscription status
      if (tenant.subscriptionStatus === 'EXPIRED' || tenant.subscriptionStatus === 'CANCELED') {
        throw new Error('Subscription expired. Please renew to continue.');
      }

      // Generate tokens
      const { token, refreshToken } = generateTokens(tenant.id, tenant.email);

      const bookingsCount = await context.prisma.booking.count({
        where: { tenantId: tenant.id },
      });

      return {
        token,
        refreshToken,
        tenant: {
          ...normalizeTenant(tenant),
          bookingsCount,
        },
      };
    },

    async logout(_: any, __: any, context: AppContext) {
      // Logout is handled on the client side by clearing the token
      // Server can optionally invalidate refresh tokens if using a token blacklist
      return true;
    },

    async refreshToken(
      _: any,
      { refreshToken }: { refreshToken: string },
      context: AppContext
    ) {
      try {
        const verified = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET!
        ) as {
          tenantId: string;
          email: string;
        };

        // Generate new tokens
        const {
          token: newToken,
          refreshToken: newRefreshToken,
        } = generateTokens(verified.tenantId, verified.email);

        // Fetch updated tenant
        const tenant = await context.prisma.tenant.findUnique({
          where: { id: verified.tenantId },
          include: { settings: true },
        });

        if (!tenant) {
          throw new Error('Tenant not found');
        }

        const bookingsCount = await context.prisma.booking.count({
          where: { tenantId: tenant.id },
        });

        return {
          token: newToken,
          refreshToken: newRefreshToken,
          tenant: {
            ...normalizeTenant(tenant),
            bookingsCount,
          },
        };
      } catch (error) {
        throw new Error('Invalid refresh token');
      }
    },
  },
};
