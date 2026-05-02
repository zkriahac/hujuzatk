/**
 * Hujuzatk GraphQL Resolvers for Elysia Backend
 *
 * This file contains all resolvers ported from the legacy Express/Apollo backend.
 * All business logic, authentication, and database access is handled here.
 *
 * If you add new features, add resolvers here and update the schema in typeDefs.ts.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { differenceInCalendarDays, getDaysInMonth, subMonths } from 'date-fns';
import { prisma } from './prisma';
import { performSync, VALID_CHANNELS } from './channelSync';
import { PLANS, isValidPlan } from './planConfig';
import {
  sendNewTenantEmail,
  sendPlanActivatedEmail,
  sendPlanCanceledEmail,
  sendPlanChangedEmail,
  sendPasswordResetEmail,
} from './emailService';

const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '14');

function generateTokens(tenantId: string, email: string) {
	const secret = process.env.JWT_SECRET;
	const refreshSecret = process.env.JWT_REFRESH_SECRET;
	if (!secret || !refreshSecret) throw new Error('JWT secrets not configured in .env');
	const token = jwt.sign({ tenantId, email }, secret, { expiresIn: (process.env.JWT_EXPIRE || '24h') as any });
	const refreshToken = jwt.sign({ tenantId, email }, refreshSecret, { expiresIn: (process.env.JWT_REFRESH_EXPIRE || '7d') as any });
	return { token, refreshToken };
}

function calculateValidUntil(days: number): Date {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date;
}

function normalizeTenant(tenant: any) {
	let rooms = tenant.rooms || [];
	if (typeof rooms === 'string') {
		try { rooms = JSON.parse(rooms); } catch { rooms = []; }
	}
	return { ...tenant, rooms: Array.isArray(rooms) ? rooms : [], subscriptionStatus: tenant.subscriptionStatus?.toUpperCase() || 'TRIAL' };
}

function normalizeBooking(booking: any) {
	return { ...booking, status: booking.status?.toUpperCase() || 'UPCOMING' };
}

function requireAuth(context: any) {
	if (!context.user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } } });
}

async function requireSuperAdmin(context: any) {
	requireAuth(context);
	const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId } });
	if (!tenant?.isAdmin) throw new GraphQLError('Forbidden: admin access required', { extensions: { code: 'FORBIDDEN', http: { status: 403 } } });
}

function maskUrl(url: string): string {
	if (url.length <= 20) return url;
	return '…' + url.slice(-20);
}

function normalizeChannelIntegration(ci: any) {
	return { ...ci, icalUrlMasked: maskUrl(ci.icalUrl) };
}

async function assertIntegrationsAllowed(tenantId: string) {
	const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
	if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
	if (!tenant.integrationsEnabled) {
		throw new GraphQLError('Integrations disabled by admin. Please contact support.', { extensions: { code: 'FORBIDDEN', http: { status: 403 } } });
	}
	return tenant;
}

export const resolvers = {
	Query: {
		async me(_: any, __: any, context: any) {
			requireAuth(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId }, include: { settings: true, _count: { select: { bookings: true } } } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			return { ...normalizeTenant(tenant), bookingsCount: tenant._count?.bookings || 0 };
		},
		async getTenant(_: any, { id }: { id: string }, context: any) {
			requireAuth(context);
			if (context.user.tenantId !== id) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN', http: { status: 403 } } });
			const tenant = await prisma.tenant.findUnique({ where: { id }, include: { settings: true, _count: { select: { bookings: true } } } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			return { ...normalizeTenant(tenant), bookingsCount: tenant._count?.bookings || 0 };
		},
		async getAllTenants(_: any, __: any, context: any) {
			await requireSuperAdmin(context);
			const tenants = await prisma.tenant.findMany({ include: { settings: true, _count: { select: { bookings: true } } } });
			return tenants.map((t: any) => ({ ...normalizeTenant(t), bookingsCount: t._count?.bookings || 0 }));
		},

		// Bookings
		async getBookings(_: any, { filter, limit = 100, offset = 0, sortBy = 'checkIn', sortOrder = 'desc' }: any, context: any) {
			requireAuth(context);
			const where: any = { tenantId: context.user.tenantId };
			if (filter?.status) where.status = filter.status.toLowerCase();
			if (filter?.room) where.room = filter.room;
			if (filter?.guestName) where.guestName = { contains: filter.guestName, mode: 'insensitive' };
			if (filter?.startDate || filter?.endDate) {
				where.checkIn = {};
				if (filter.startDate) where.checkIn.gte = new Date(filter.startDate);
				if (filter.endDate) where.checkIn.lte = new Date(filter.endDate);
			}
			const bookings = await prisma.booking.findMany({ where, take: Math.min(limit, 500), skip: offset, orderBy: { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' } });
			return bookings.map(normalizeBooking);
		},
		async getBooking(_: any, { id }: { id: string }, context: any) {
			requireAuth(context);
			const booking = await prisma.booking.findFirst({ where: { id, tenantId: context.user.tenantId } });
			if (!booking) throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			return normalizeBooking(booking);
		},
		async getBookingsByDateRange(_: any, { startDate, endDate }: { startDate: string; endDate: string }, context: any) {
			requireAuth(context);
			const start = new Date(startDate);
			const end = new Date(endDate);
			if (start > end) throw new GraphQLError('Start date must be before end date', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			// Overlap: booking overlaps the range when checkIn < rangeEnd AND checkOut > rangeStart
			const bookings = await prisma.booking.findMany({ where: { tenantId: context.user.tenantId, checkIn: { lt: end }, checkOut: { gt: start } }, orderBy: { checkIn: 'asc' } });
			return bookings.map(normalizeBooking);
		},
		async getBookingsByRoom(_: any, { room }: { room: string }, context: any) {
			requireAuth(context);
			const bookings = await prisma.booking.findMany({ where: { tenantId: context.user.tenantId, room }, orderBy: { checkIn: 'desc' } });
			return bookings.map(normalizeBooking);
		},

		// Reports
		async getOccupancyReport(_: any, { room, year, month }: { room?: string; year: number; month: number }, context: any) {
			requireAuth(context);
			if (month < 1 || month > 12) throw new GraphQLError('Month must be between 1 and 12', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const startDate = new Date(year, month - 1, 1);
			const endDate = new Date(year, month, 0);
			const daysInMonth = getDaysInMonth(startDate);
			const query: any = { where: { tenantId: context.user.tenantId, checkIn: { lte: endDate }, checkOut: { gte: startDate }, status: { not: 'CANCELED' } } };
			if (room) query.where.room = room;
			const bookings = await prisma.booking.findMany(query);
			let occupiedNights = 0;
			bookings.forEach((booking: any) => {
				const checkIn = new Date(booking.checkIn);
				const checkOut = new Date(booking.checkOut);
				const start = checkIn > startDate ? checkIn : startDate;
				const end = checkOut < endDate ? checkOut : endDate;
				const nights = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
				occupiedNights += Math.max(0, nights);
			});
			const totalNights = daysInMonth * (room ? 1 : 5);
			const occupancyRate = totalNights > 0 ? (occupiedNights / totalNights) * 100 : 0;
			return { room: room || 'All', month: `${year}-${String(month).padStart(2, '0')}`, totalNights, occupiedNights, occupancyRate: Math.round(occupancyRate * 100) / 100 };
		},
		async getRevenueReport(_: any, { year, month }: { year: number; month?: number }, context: any) {
			requireAuth(context);
			const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
			const endDate = month ? new Date(year, month, 0) : new Date(year, 11, 31);
			const bookings = await prisma.booking.findMany({ where: { tenantId: context.user.tenantId, createdAt: { gte: startDate, lte: endDate } } });
			const totalRevenue = bookings.reduce((sum: number, b: any) => sum + b.totalPrice, 0);
			const totalDeposits = bookings.reduce((sum: number, b: any) => sum + b.deposit, 0);
			const totalOutstanding = bookings.reduce((sum: number, b: any) => sum + b.remaining, 0);
			const bookingCount = bookings.length;
			const averageBookingValue = bookingCount > 0 ? totalRevenue / bookingCount : 0;
			return { year, month, totalRevenue: Math.round(totalRevenue * 100) / 100, totalDeposits: Math.round(totalDeposits * 100) / 100, totalOutstanding: Math.round(totalOutstanding * 100) / 100, bookingCount, averageBookingValue: Math.round(averageBookingValue * 100) / 100 };
		},
		async getYearlyOccupancy(_: any, { year }: { year: number }, context: any) {
			requireAuth(context);
			const tenantId = context.user.tenantId;
			const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { rooms: true } });
			if (!tenant) return [];
			const rows = await prisma.monthlyOccupancyCache.findMany({ where: { tenantId, year } });
			return rows.map((r: any) => {
				const room = (tenant.rooms as { id: string; name: string }[]).find((rm) => rm.id === r.roomId);
				return {
					roomId: r.roomId,
					roomName: room?.name ?? r.roomId,
					year: r.year,
					month: r.month,
					occupiedNights: r.occupiedNights,
					totalNights: r.totalNights,
					occupancyRate: r.occupancyRate,
				};
			});
		},
		async getGuestStatistics(_: any, __: any, context: any) {
			requireAuth(context);
			const bookings = await prisma.booking.findMany({ where: { tenantId: context.user.tenantId } });
			const totalGuests = bookings.length;
			const cities = new Set(bookings.map((b: any) => b.city).filter(Boolean));
			const uniqueCities = cities.size;
			const totalNights = bookings.reduce((sum: number, b: any) => sum + b.nights, 0);
			const averageNightStay = totalGuests > 0 ? totalNights / totalGuests : 0;
			const guestNames = bookings.map((b: any) => b.guestName);
			const uniqueGuests = new Set(guestNames);
			const repeatBookings = bookings.length - uniqueGuests.size;
			const repeatGuestRate = totalGuests > 0 ? (repeatBookings / totalGuests) * 100 : 0;
			const canceledBookings = bookings.filter((b: any) => b.status === 'CANCELED').length;
			const cancellationRate = totalGuests > 0 ? (canceledBookings / totalGuests) * 100 : 0;
			return { totalGuests, uniqueCities, averageNightStay: Math.round(averageNightStay * 100) / 100, repeatGuestRate: Math.round(repeatGuestRate * 100) / 100, cancellationRate: Math.round(cancellationRate * 100) / 100 };
		},

		// Audit
		async getAuditLogs(_: any, { limit = 100, offset = 0, action }: { limit?: number; offset?: number; action?: string }, context: any) {
			requireAuth(context);
			const where: any = { tenantId: context.user.tenantId };
			if (action) where.action = action;
			const logs = await prisma.auditLog.findMany({ where, take: Math.min(limit, 500), skip: offset, orderBy: { createdAt: 'desc' } });
			return logs;
		},
		async getGlobalSettings(_: any, __: any, context: any) {
			await requireSuperAdmin(context);
			let settings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
			if (!settings) {
				settings = await prisma.globalSettings.create({ data: { id: 1 } });
			}
			let rooms = settings.defaultRooms || [];
			if (typeof rooms === 'string') { try { rooms = JSON.parse(rooms); } catch { rooms = []; } }
			return { ...settings, defaultRooms: Array.isArray(rooms) ? rooms : [] };
		},
		async health() { return 'ok'; },

		async getExpenses(_: any, { startDate, endDate, roomId }: any, context: any) {
			requireAuth(context);
			const where: any = { tenantId: context.user.tenantId };
			if (startDate || endDate) {
				where.date = {};
				if (startDate) where.date.gte = new Date(startDate);
				if (endDate) where.date.lte = new Date(endDate);
			}
			if (roomId !== undefined) where.roomId = roomId; // null filters general expenses
			const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });
			return expenses;
		},

		// Channel integrations
		async getChannelIntegrations(_: any, __: any, context: any) {
			requireAuth(context);
			const integrations = await prisma.channelIntegration.findMany({
				where: { tenantId: context.user.tenantId },
				orderBy: { createdAt: 'desc' },
			});
			return integrations.map(normalizeChannelIntegration);
		},
	},
	Mutation: {
		// Auth
		async register(_: any, { input }: any, context: any) {
			if (!input.email || !input.name || !input.password) throw new GraphQLError('Email, name, and password are required', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new GraphQLError('Invalid email address', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const existing = await prisma.tenant.findUnique({ where: { email: input.email } });
			if (existing) throw new GraphQLError('Email already registered', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			if (input.password.length < 8) throw new GraphQLError('Password must be at least 8 characters', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const passwordHash = await bcrypt.hash(input.password, 10);
			// Load global defaults for new tenants
			const globals = await prisma.globalSettings.findUnique({ where: { id: 1 } }) as any;
			const defaultRooms = globals?.defaultRooms && Array.isArray(globals.defaultRooms) && globals.defaultRooms.length > 0
				? globals.defaultRooms
				: [{ id: 'r1', name: 'Room 1' }, { id: 'r2', name: 'Room 2' }, { id: 'r3', name: 'Room 3' }, { id: 'r4', name: 'Room 4' }, { id: 'r5', name: 'Room 5' }];
			const trialDays = globals?.defaultTrialDays || TRIAL_DAYS;
			// New tenants default to the "trial" plan: 3-room cap, integrations off.
			const trialPlan = PLANS.trial;
			const tenant = await prisma.tenant.create({ data: { name: input.name, email: input.email, phone: input.phone || null, passwordHash, currency: input.currency || globals?.defaultCurrency || 'OMR', timezone: input.timezone || globals?.defaultTimezone || 'Asia/Muscat', language: input.language || globals?.defaultLanguage || 'en', subscriptionStatus: 'TRIAL', validUntil: calculateValidUntil(trialDays), rooms: defaultRooms, isAdmin: false, isActive: true, plan: 'trial', maxRooms: trialPlan.maxRooms, integrationsEnabled: trialPlan.integrationsEnabled, settings: { create: { defaultNightPrice: 50, defaultTax: 0 } } }, include: { settings: true } });
			const { token, refreshToken } = generateTokens(tenant.id, tenant.email);
			await prisma.auditLog.create({ data: { tenantId: tenant.id, action: 'TENANT_UPDATED', entityType: 'Tenant', entityId: tenant.id, changes: { action: 'tenant_created' } } });
			void sendNewTenantEmail({ name: tenant.name, email: tenant.email, phone: tenant.phone });
			return { token, refreshToken, tenant: { ...normalizeTenant(tenant), bookingsCount: 0 } };
		},
		async login(_: any, { email, password }: any, context: any) {
			if (!email || !password) throw new GraphQLError('Email and password are required', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const tenant = await prisma.tenant.findUnique({ where: { email }, include: { settings: true, _count: { select: { bookings: true } } } });
			if (!tenant) throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } } });
			const passwordMatch = await bcrypt.compare(password, tenant.passwordHash);
			if (!passwordMatch) throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } } });
			if (!tenant.isActive) throw new GraphQLError('Account has been deactivated. Please contact support.', { extensions: { code: 'FORBIDDEN', http: { status: 403 } } });
			if (tenant.subscriptionStatus === 'EXPIRED' || tenant.subscriptionStatus === 'CANCELED') throw new GraphQLError('Subscription expired. Please renew to continue.', { extensions: { code: 'FORBIDDEN', http: { status: 403 } } });
			const { token, refreshToken } = generateTokens(tenant.id, tenant.email);
			return { token, refreshToken, tenant: { ...normalizeTenant(tenant), bookingsCount: (tenant as any)._count?.bookings || 0 } };
		},
		async logout() { return true; },

		// Forgot password — step 1: send reset link (always returns true so emails aren't enumerable)
		async requestPasswordReset(_: any, { email }: any) {
			const tenant = await prisma.tenant.findUnique({ where: { email } });
			if (tenant && tenant.isActive) {
				// Sign a 1-hour JWT using (JWT_SECRET + passwordHash) so the token auto-invalidates
				// the moment the password is changed — no extra DB column needed.
				const secret = process.env.JWT_SECRET! + tenant.passwordHash;
				const token = jwt.sign({ sub: tenant.id, type: 'pwd_reset' }, secret, { expiresIn: '1h' });
				void sendPasswordResetEmail(tenant.email, token);
			}
			return true;
		},

		// Forgot password — step 2: set new password using the token from the email
		async resetPassword(_: any, { token, newPassword }: any) {
			if (!token || !newPassword) throw new GraphQLError('Token and new password are required', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			if (newPassword.length < 8) throw new GraphQLError('Password must be at least 8 characters', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });

			// Decode (unverified) to get the tenant id
			let decoded: any;
			try { decoded = jwt.decode(token); } catch { decoded = null; }
			if (!decoded?.sub || decoded?.type !== 'pwd_reset') throw new GraphQLError('Invalid or expired reset link', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });

			const tenant = await prisma.tenant.findUnique({ where: { id: decoded.sub } });
			if (!tenant) throw new GraphQLError('Invalid or expired reset link', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });

			// Verify signature using the combined secret
			const secret = process.env.JWT_SECRET! + tenant.passwordHash;
			try { jwt.verify(token, secret); }
			catch { throw new GraphQLError('Invalid or expired reset link. Please request a new one.', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } }); }

			const passwordHash = await bcrypt.hash(newPassword, 10);
			await prisma.tenant.update({ where: { id: tenant.id }, data: { passwordHash } });
			return true;
		},

		async refreshToken(_: any, { refreshToken }: any, context: any) {
			try {
				const verified = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
				// @ts-ignore
				const { tenantId, email } = verified;
				const { token: newToken, refreshToken: newRefreshToken } = generateTokens(tenantId, email);
				const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { settings: true, _count: { select: { bookings: true } } } });
				if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
				return { token: newToken, refreshToken: newRefreshToken, tenant: { ...normalizeTenant(tenant), bookingsCount: (tenant as any)._count?.bookings || 0 } };
			} catch (err) {
				if (err instanceof GraphQLError) throw err;
				throw new GraphQLError('Invalid refresh token', { extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } } });
			}
		},

		// Bookings
		async createBooking(_: any, { input }: any, context: any) {
			requireAuth(context);
			if (!input.guestName?.trim()) throw new GraphQLError('Guest name is required', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			if (input.nightPrice < 0) throw new GraphQLError('Night price cannot be negative', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			if (input.deposit < 0) throw new GraphQLError('Deposit cannot be negative', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId }, include: { settings: true } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);
			if (!rooms.find((r: any) => r.id === input.room)) throw new GraphQLError('Invalid room', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const checkIn = new Date(input.checkIn);
			const checkOut = new Date(input.checkOut);
			const nights = differenceInCalendarDays(checkOut, checkIn);
			if (nights <= 0) throw new GraphQLError('Check-out must be after check-in', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const totalPrice = nights * input.nightPrice;
			const tax = totalPrice * ((tenant.settings?.defaultTax || 0) / 100);
			const remaining = totalPrice + tax - input.deposit;
			// Atomically: increment the tenant's booking counter and create the booking with the
			// number that was just claimed. The unique index on (tenantId, bookingNumber) is the
			// final safety net if two requests ever race past the transaction guard.
			const booking = await prisma.$transaction(async (tx) => {
				const updatedTenant = await tx.tenant.update({
					where: { id: context.user.tenantId },
					data: { nextBookingNumber: { increment: 1 } },
					select: { nextBookingNumber: true },
				});
				const bookingNumber = updatedTenant.nextBookingNumber - 1; // we incremented after claiming this number
				return tx.booking.create({
					data: {
						tenantId: context.user.tenantId,
						bookingNumber,
						guestName: input.guestName, guestEmail: input.guestEmail, guestPhone: input.guestPhone, guestIdNumber: input.guestIdNumber || null, city: input.city,
						room: input.room, checkIn, checkOut, nightPrice: input.nightPrice, deposit: input.deposit,
						status: input.status?.toLowerCase() || 'upcoming', source: input.source || null, notes: input.notes,
						nights, totalPrice, tax, remaining,
					},
				});
			});
			await prisma.auditLog.create({ data: { tenantId: context.user.tenantId, action: 'BOOKING_CREATED', entityType: 'Booking', entityId: booking.id, changes: { action: 'booking_created', booking } } });
			return normalizeBooking(booking);
		},
		async updateBooking(_: any, { id, input }: any, context: any) {
			requireAuth(context);
			const booking = await prisma.booking.findFirst({ where: { id, tenantId: context.user.tenantId } });
			if (!booking) throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId }, include: { settings: true } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const updateData: any = {};
			if (input.guestName !== undefined) updateData.guestName = input.guestName;
			if (input.guestEmail !== undefined) updateData.guestEmail = input.guestEmail;
			if (input.guestPhone !== undefined) updateData.guestPhone = input.guestPhone;
			if (input.guestIdNumber !== undefined) updateData.guestIdNumber = input.guestIdNumber || null;
			if (input.city !== undefined) updateData.city = input.city;
			if (input.room !== undefined) updateData.room = input.room;
			if (input.notes !== undefined) updateData.notes = input.notes;
			if (input.source !== undefined) updateData.source = input.source;
			if (input.status) updateData.status = input.status.toLowerCase();
			if (input.checkIn || input.checkOut || input.nightPrice !== undefined || input.deposit !== undefined) {
				const checkIn = new Date(input.checkIn || booking.checkIn.toISOString());
				const checkOut = new Date(input.checkOut || booking.checkOut.toISOString());
				const nightPrice = input.nightPrice ?? booking.nightPrice;
				const deposit = input.deposit ?? booking.deposit;
				const nights = differenceInCalendarDays(checkOut, checkIn);
				const totalPrice = nights * nightPrice;
				const tax = totalPrice * ((tenant.settings?.defaultTax || 0) / 100);
				const remaining = totalPrice + tax - deposit;
				Object.assign(updateData, { checkIn, checkOut, nightPrice, deposit, nights, totalPrice, tax, remaining });
			}
			const updated = await prisma.booking.update({ where: { id }, data: updateData });
			await prisma.auditLog.create({ data: { tenantId: context.user.tenantId, action: 'BOOKING_UPDATED', entityType: 'Booking', entityId: booking.id, changes: { before: booking, after: updated } } });
			return normalizeBooking(updated);
		},
		async deleteBooking(_: any, { id }: { id: string }, context: any) {
			requireAuth(context);
			const booking = await prisma.booking.findFirst({ where: { id, tenantId: context.user.tenantId } });
			if (!booking) throw new GraphQLError('Booking not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			await prisma.booking.delete({ where: { id } });
			await prisma.auditLog.create({ data: { tenantId: context.user.tenantId, action: 'BOOKING_DELETED', entityType: 'Booking', entityId: id, changes: { action: 'booking_deleted' } } });
			return true;
		},
		async bulkImportBookings(_: any, { bookings }: { bookings: any[] }, context: any) {
			requireAuth(context);
			if (!bookings?.length) throw new GraphQLError('At least one booking is required', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			if (bookings.length > 500) throw new GraphQLError('Cannot import more than 500 bookings at once', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId }, include: { settings: true } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			// Reserve a contiguous range of booking numbers up front (single counter bump),
			// then assign them in order. Avoids N round-trips on the counter.
			const threeMonthsAgo = subMonths(new Date(), 3);
			const validInputs = bookings.filter((b) => {
				const checkOut = new Date(b.checkOut);
				if (differenceInCalendarDays(checkOut, new Date(b.checkIn)) <= 0) return false;
				if (checkOut < threeMonthsAgo) return false;
				return true;
			});
			if (!validInputs.length) return [];
			const updatedTenant = await prisma.tenant.update({
				where: { id: context.user.tenantId },
				data: { nextBookingNumber: { increment: validInputs.length } },
				select: { nextBookingNumber: true },
			});
			const startNumber = updatedTenant.nextBookingNumber - validInputs.length;
			const created = [];
			for (let i = 0; i < validInputs.length; i++) {
				const input = validInputs[i];
				const checkIn = new Date(input.checkIn);
				const checkOut = new Date(input.checkOut);
				const nights = differenceInCalendarDays(checkOut, checkIn);
				const totalPrice = nights * input.nightPrice;
				const tax = totalPrice * ((tenant.settings?.defaultTax || 0) / 100);
				const remaining = totalPrice + tax - input.deposit;
				const booking = await prisma.booking.create({ data: { tenantId: context.user.tenantId, bookingNumber: startNumber + i, guestName: input.guestName, guestEmail: input.guestEmail, guestPhone: input.guestPhone, guestIdNumber: input.guestIdNumber || null, city: input.city, room: input.room, checkIn, checkOut, nightPrice: input.nightPrice, deposit: input.deposit, status: input.status?.toLowerCase() || 'upcoming', source: input.source || null, notes: input.notes, nights, totalPrice, tax, remaining } });
				created.push(normalizeBooking(booking));
			}
			return created;
		},
		async bulkDeleteBookings(_: any, { ids }: { ids: string[] }, context: any) {
			requireAuth(context);
			await prisma.booking.deleteMany({ where: { id: { in: ids }, tenantId: context.user.tenantId } });
			return true;
		},

		// Tenant
		async updateTenant(_: any, { input }: any, context: any) {
			requireAuth(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			if (input.name && input.name !== tenant.name) {
				const existing = await prisma.tenant.findUnique({ where: { name: input.name } });
				if (existing) throw new GraphQLError('Name already taken', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			}
			const updated = await prisma.tenant.update({
				where: { id: context.user.tenantId },
				data: {
					...(input.name && { name: input.name }),
					...(input.language && { language: input.language }),
					...(input.currency && { currency: input.currency }),
					...(input.timezone && { timezone: input.timezone }),
					...(input.rooms !== undefined && { rooms: input.rooms }),
				},
				include: { settings: true, _count: { select: { bookings: true } } },
			});
			await prisma.auditLog.create({ data: { tenantId: context.user.tenantId, action: 'TENANT_UPDATED', entityType: 'Tenant', entityId: context.user.tenantId, changes: { action: 'tenant_updated', updates: JSON.parse(JSON.stringify(input)) } } });
			return { ...normalizeTenant(updated), bookingsCount: updated._count?.bookings || 0 };
		},
		async updateTenantSettings(_: any, { input }: any, context: any) {
			requireAuth(context);
			if (input.defaultNightPrice !== undefined && input.defaultNightPrice < 0) throw new GraphQLError('Night price cannot be negative', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			if (input.defaultTax !== undefined && (input.defaultTax < 0 || input.defaultTax > 100)) throw new GraphQLError('Tax must be between 0 and 100', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			// Build a single patch object so we can spread the same shape into create/update.
			// "Empty string" is treated as "clear it" for company fields; undefined leaves them.
			const companyPatch: any = {};
			(['companyName','companyAddress','companyPhone','companyEmail','companyTaxId','companyLogoUrl','invoiceFooter'] as const).forEach((k) => {
				if (input[k] !== undefined) companyPatch[k] = input[k] || null;
			});

			let settings = await prisma.tenantSettings.findUnique({ where: { tenantId: context.user.tenantId } });
			if (!settings) {
				settings = await prisma.tenantSettings.create({
					data: {
						tenantId: context.user.tenantId,
						defaultNightPrice: input.defaultNightPrice || 50,
						defaultTax: input.defaultTax || 0,
						notifyOnBooking: input.notifyOnBooking !== undefined ? input.notifyOnBooking : true,
						notifyOnCancellation: input.notifyOnCancellation !== undefined ? input.notifyOnCancellation : true,
						...companyPatch,
					},
				});
			} else {
				settings = await prisma.tenantSettings.update({
					where: { tenantId: context.user.tenantId },
					data: {
						...(input.defaultNightPrice !== undefined && { defaultNightPrice: input.defaultNightPrice }),
						...(input.defaultTax !== undefined && { defaultTax: input.defaultTax }),
						...(input.notifyOnBooking !== undefined && { notifyOnBooking: input.notifyOnBooking }),
						...(input.notifyOnCancellation !== undefined && { notifyOnCancellation: input.notifyOnCancellation }),
						...companyPatch,
					},
				});
			}
			return settings;
		},
		async addRoom(_: any, { name }: any, context: any) {
			requireAuth(context);
			if (!name?.trim()) throw new GraphQLError('Room name is required', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);
			// Plan-based room cap. Admins skip the check.
			if (!tenant.isAdmin && rooms.length >= tenant.maxRooms) {
				throw new GraphQLError(`Your ${tenant.plan} plan is limited to ${tenant.maxRooms} rooms. Upgrade to add more.`, {
					extensions: { code: 'QUOTA_EXCEEDED', http: { status: 403 } },
				});
			}
			if (rooms.some((r: any) => r.name === name)) throw new GraphQLError('Room name already exists', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const maxNum = rooms.reduce((max: number, r: any) => {
				const m = r.id.match(/^r(\d+)$/);
				return m ? Math.max(max, parseInt(m[1])) : max;
			}, 0);
			const newRoom = { id: `r${maxNum + 1}`, name };
			rooms.push(newRoom);
			const updated = await prisma.tenant.update({ where: { id: context.user.tenantId }, data: { rooms: rooms }, include: { settings: true, _count: { select: { bookings: true } } } });
			return { ...normalizeTenant(updated), bookingsCount: updated._count?.bookings || 0 };
		},
		async removeRoom(_: any, { roomId }: any, context: any) {
			requireAuth(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);
			if (!rooms.find((r: any) => r.id === roomId)) throw new GraphQLError('Room not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const updatedRooms = rooms.filter((r: any) => r.id !== roomId);
			const updated = await prisma.tenant.update({ where: { id: context.user.tenantId }, data: { rooms: updatedRooms }, include: { settings: true, _count: { select: { bookings: true } } } });
			return { ...normalizeTenant(updated), bookingsCount: updated._count?.bookings || 0 };
		},
		async createAdminSubscription(_: any, { tenantId, days }: any, context: any) {
			await requireSuperAdmin(context);
			if (days <= 0) throw new GraphQLError('Days must be positive', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const validUntil = new Date();
			validUntil.setDate(validUntil.getDate() + days);
			const updated = await prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'active', validUntil }, include: { settings: true, _count: { select: { bookings: true } } } });
			await prisma.payment.create({ data: { tenantId, amount: 0, currency: 'OMR', status: 'completed', planType: 'admin-grant', planDays: days, description: `Admin granted ${days} days subscription` } });
			void sendPlanActivatedEmail({ name: tenant.name, email: tenant.email }, days, validUntil);
			return { ...normalizeTenant(updated), bookingsCount: updated._count?.bookings || 0 };
		},
		async cancelSubscription(_: any, { tenantId }: any, context: any) {
			await requireSuperAdmin(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			await prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'canceled' } });
			await prisma.auditLog.create({ data: { tenantId, action: 'TENANT_UPDATED', entityType: 'Tenant', entityId: tenantId, changes: { action: 'subscription_canceled' } } });
			void sendPlanCanceledEmail({ name: tenant.name, email: tenant.email });
			return true;
		},
		async adminLoginAs(_: any, { tenantId }: any, context: any) {
			await requireSuperAdmin(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { settings: true, _count: { select: { bookings: true } } } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const { token, refreshToken } = generateTokens(tenant.id, tenant.email);
			return { token, refreshToken, tenant: { ...normalizeTenant(tenant), bookingsCount: (tenant as any)._count?.bookings || 0 } };
		},
		async updateGlobalSettings(_: any, { input }: any, context: any) {
			await requireSuperAdmin(context);
			const data: any = {};
			if (input.defaultLanguage !== undefined) data.defaultLanguage = input.defaultLanguage;
			if (input.defaultCurrency !== undefined) data.defaultCurrency = input.defaultCurrency;
			if (input.defaultTimezone !== undefined) data.defaultTimezone = input.defaultTimezone;
			if (input.defaultRooms !== undefined) data.defaultRooms = input.defaultRooms;
			if (input.defaultTrialDays !== undefined) data.defaultTrialDays = input.defaultTrialDays;
			const settings = await prisma.globalSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
			let rooms = settings.defaultRooms as any || [];
			if (typeof rooms === 'string') { try { rooms = JSON.parse(rooms); } catch { rooms = []; } }
			return { ...settings, defaultRooms: Array.isArray(rooms) ? rooms : [] };
		},
		async adminDeactivateTenant(_: any, { tenantId }: any, context: any) {
			await requireSuperAdmin(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			if (tenant.isAdmin) throw new GraphQLError('Cannot deactivate an admin account', { extensions: { code: 'FORBIDDEN', http: { status: 403 } } });
			const newStatus = !tenant.isActive;
			await prisma.tenant.update({ where: { id: tenantId }, data: { isActive: newStatus } });
			await prisma.auditLog.create({ data: { tenantId, action: 'TENANT_UPDATED', entityType: 'Tenant', entityId: tenantId, changes: { action: newStatus ? 'account_activated' : 'account_deactivated' } } });
			return true;
		},
		async adminDeleteTenant(_: any, { tenantId }: any, context: any) {
			await requireSuperAdmin(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			if (tenant.isAdmin) throw new GraphQLError('Cannot delete an admin account', { extensions: { code: 'FORBIDDEN', http: { status: 403 } } });
			// Delete all related data then the tenant
			await prisma.auditLog.deleteMany({ where: { tenantId } });
			await prisma.booking.deleteMany({ where: { tenantId } });
			await prisma.payment.deleteMany({ where: { tenantId } });
			await prisma.tenantSettings.deleteMany({ where: { tenantId } });
			await prisma.tenant.delete({ where: { id: tenantId } });
			return true;
		},
		// Channel integrations
		async saveChannelIntegration(_: any, { input }: any, context: any) {
			requireAuth(context);
			const tenant = await assertIntegrationsAllowed(context.user.tenantId);
			const channel = input.channelName.toLowerCase();
			if (!VALID_CHANNELS.includes(channel)) throw new GraphQLError('Invalid channel name', { extensions: { code: 'BAD_USER_INPUT' } });
			if (!input.icalUrl?.startsWith('http')) throw new GraphQLError('Invalid iCal URL', { extensions: { code: 'BAD_USER_INPUT' } });

			const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);
			if (!rooms.find((r: any) => r.id === input.roomId)) throw new GraphQLError('Invalid room', { extensions: { code: 'BAD_USER_INPUT' } });

			// Friendly duplicate check — DB has @@unique([tenantId, channelName, roomId]) but we
			// want to surface a clearer error than a raw P2002 from Prisma.
			const conflict = await prisma.channelIntegration.findFirst({
				where: {
					tenantId: context.user.tenantId,
					channelName: channel,
					roomId: input.roomId,
					...(input.id && { NOT: { id: input.id } }),
				},
			});
			if (conflict) {
				throw new GraphQLError(`This room is already connected to ${channel}. Edit or delete the existing integration instead.`, {
					extensions: { code: 'DUPLICATE_MAPPING', http: { status: 409 } },
				});
			}

			const label = typeof input.label === 'string' ? input.label.trim() || null : undefined;

			let result;
			if (input.id) {
				const existing = await prisma.channelIntegration.findFirst({ where: { id: input.id, tenantId: context.user.tenantId } });
				if (!existing) throw new GraphQLError('Integration not found', { extensions: { code: 'NOT_FOUND' } });
				result = await prisma.channelIntegration.update({
					where: { id: input.id },
					data: {
						channelName: channel,
						roomId: input.roomId,
						icalUrl: input.icalUrl,
						...(label !== undefined && { label }),
						...(input.isActive !== undefined && { isActive: input.isActive }),
					},
				});
			} else {
				result = await prisma.channelIntegration.create({
					data: {
						tenantId: context.user.tenantId,
						channelName: channel,
						roomId: input.roomId,
						icalUrl: input.icalUrl,
						label: label ?? null,
						isActive: input.isActive !== undefined ? input.isActive : true,
					},
				});
			}
			return normalizeChannelIntegration(result);
		},
		async deleteChannelIntegration(_: any, { id }: any, context: any) {
			requireAuth(context);
			const existing = await prisma.channelIntegration.findFirst({ where: { id, tenantId: context.user.tenantId } });
			if (!existing) throw new GraphQLError('Integration not found', { extensions: { code: 'NOT_FOUND' } });
			await prisma.channelIntegration.delete({ where: { id } });
			return true;
		},
		async syncChannel(_: any, { id }: any, context: any) {
			requireAuth(context);
			await assertIntegrationsAllowed(context.user.tenantId);
			const integration = await prisma.channelIntegration.findFirst({ where: { id, tenantId: context.user.tenantId } });
			if (!integration) throw new GraphQLError('Integration not found', { extensions: { code: 'NOT_FOUND' } });
			return performSync(integration, context.user.tenantId);
		},
		async syncAllChannels(_: any, __: any, context: any) {
			requireAuth(context);
			await assertIntegrationsAllowed(context.user.tenantId);
			const integrations = await prisma.channelIntegration.findMany({ where: { tenantId: context.user.tenantId, isActive: true } });
			const results = [];
			for (const integration of integrations) {
				results.push(await performSync(integration, context.user.tenantId));
			}
			return results;
		},

		async adminSetIntegrationsEnabled(_: any, { tenantId, enabled }: { tenantId: string; enabled: boolean }, context: any) {
			await requireSuperAdmin(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const updated = await prisma.tenant.update({
				where: { id: tenantId },
				data: { integrationsEnabled: enabled },
				include: { settings: true, _count: { select: { bookings: true } } },
			});
			await prisma.auditLog.create({
				data: {
					tenantId,
					action: 'TENANT_INTEGRATIONS_TOGGLED',
					entityType: 'Tenant',
					entityId: tenantId,
					changes: { enabled, actorId: context.user.tenantId },
				},
			});
			return { ...normalizeTenant(updated), bookingsCount: updated._count?.bookings || 0 };
		},
		async completeOnboarding(_: any, __: any, context: any) {
			requireAuth(context);
			const updated = await prisma.tenant.update({
				where: { id: context.user.tenantId },
				data: { onboardedAt: new Date() },
				include: { settings: true, _count: { select: { bookings: true } } },
			});
			return { ...normalizeTenant(updated), bookingsCount: updated._count?.bookings || 0 };
		},

		// Switch a tenant to a different plan tier — cascades maxRooms + integrationsEnabled
		// from the planConfig table. Existing rooms beyond the new cap are preserved (we only
		// block addRoom going forward).
		async adminSetPlan(_: any, { tenantId, plan }: { tenantId: string; plan: string }, context: any) {
			await requireSuperAdmin(context);
			if (!isValidPlan(plan)) {
				throw new GraphQLError(`Invalid plan: ${plan}. Must be one of trial | basic | pro | enterprise.`, { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			}
			const cfg = PLANS[plan];
			const updated = await prisma.tenant.update({
				where: { id: tenantId },
				data: {
					plan,
					maxRooms: cfg.maxRooms === Number.MAX_SAFE_INTEGER ? 999 : cfg.maxRooms, // store a sentinel int for "unlimited"
					integrationsEnabled: cfg.integrationsEnabled,
				},
				include: { settings: true, _count: { select: { bookings: true } } },
			});
			await prisma.auditLog.create({
				data: {
					tenantId,
					action: 'TENANT_UPDATED',
					entityType: 'Tenant',
					entityId: tenantId,
					changes: { action: 'plan_changed', plan, actorId: context.user.tenantId },
				},
			});
			void sendPlanChangedEmail({ name: updated.name, email: updated.email }, plan);
			return { ...normalizeTenant(updated), bookingsCount: updated._count?.bookings || 0 };
		},

		// Expense CRUD
		async createExpense(_: any, { input }: any, context: any) {
			requireAuth(context);
			if (input.amount < 0) throw new GraphQLError('Amount cannot be negative', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			if (!input.reason?.trim()) throw new GraphQLError('Reason is required', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const validCategories = ['utilities', 'cleaning', 'maintenance', 'supplies', 'other'];
			if (!validCategories.includes(input.category)) throw new GraphQLError('Invalid category', { extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } } });
			const expense = await prisma.expense.create({
				data: {
					tenantId: context.user.tenantId,
					roomId: input.roomId || null,
					date: new Date(input.date),
					amount: input.amount,
					category: input.category,
					reason: input.reason.trim(),
					notes: input.notes || null,
					createdBy: context.user.tenantId,
				},
			});
			return expense;
		},
		async updateExpense(_: any, { id, input }: any, context: any) {
			requireAuth(context);
			const existing = await prisma.expense.findFirst({ where: { id, tenantId: context.user.tenantId } });
			if (!existing) throw new GraphQLError('Expense not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const updated = await prisma.expense.update({
				where: { id },
				data: {
					...(input.roomId !== undefined && { roomId: input.roomId || null }),
					...(input.date && { date: new Date(input.date) }),
					...(input.amount !== undefined && { amount: input.amount }),
					...(input.category && { category: input.category }),
					...(input.reason && { reason: input.reason.trim() }),
					...(input.notes !== undefined && { notes: input.notes || null }),
				},
			});
			return updated;
		},
		async deleteExpense(_: any, { id }: any, context: any) {
			requireAuth(context);
			const existing = await prisma.expense.findFirst({ where: { id, tenantId: context.user.tenantId } });
			if (!existing) throw new GraphQLError('Expense not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			await prisma.expense.delete({ where: { id } });
			return true;
		},

		async adminUpdateTenant(_: any, { tenantId, input }: any, context: any) {
			await requireSuperAdmin(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
			if (!tenant) throw new GraphQLError('Tenant not found', { extensions: { code: 'NOT_FOUND', http: { status: 404 } } });
			const updated = await prisma.tenant.update({
				where: { id: tenantId },
				data: {
					...(input.name && { name: input.name }),
					...(input.language && { language: input.language }),
					...(input.currency && { currency: input.currency }),
					...(input.timezone && { timezone: input.timezone }),
					...(input.rooms !== undefined && { rooms: input.rooms }),
				},
				include: { settings: true, _count: { select: { bookings: true } } },
			});
			await prisma.auditLog.create({ data: { tenantId, action: 'TENANT_UPDATED', entityType: 'Tenant', entityId: tenantId, changes: { action: 'admin_updated', updates: JSON.parse(JSON.stringify(input)) } } });
			return { ...normalizeTenant(updated), bookingsCount: updated._count?.bookings || 0 };
		},
	},
};
