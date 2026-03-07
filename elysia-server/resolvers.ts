/**
 * ProHost GraphQL Resolvers for Elysia Backend
 *
 * This file contains all resolvers ported from the legacy Express/Apollo backend.
 * All business logic, authentication, and database access is handled here.
 *
 * If you add new features, add resolvers here and update the schema in typeDefs.ts.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { differenceInCalendarDays, getDaysInMonth } from 'date-fns';
import { prisma } from './prisma';

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
	if (!context.user) throw new Error('Authentication required');
}

async function requireSuperAdmin(context: any) {
	requireAuth(context);
	const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId } });
	if (!tenant?.isAdmin) throw new Error('Admin only');
}

export const resolvers = {
	Query: {
		async me(_: any, __: any, context: any) {
			requireAuth(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId }, include: { settings: true, _count: { select: { bookings: true } } } });
			if (!tenant) throw new Error('Tenant not found');
			return { ...normalizeTenant(tenant), bookingsCount: tenant._count?.bookings || 0 };
		},
		async getTenant(_: any, { id }: { id: string }, context: any) {
			requireAuth(context);
			if (context.user.tenantId !== id) throw new Error('Unauthorized');
			const tenant = await prisma.tenant.findUnique({ where: { id }, include: { settings: true, _count: { select: { bookings: true } } } });
			if (!tenant) throw new Error('Tenant not found');
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
			if (!booking) throw new Error('Booking not found');
			return normalizeBooking(booking);
		},
		async getBookingsByDateRange(_: any, { startDate, endDate }: { startDate: string; endDate: string }, context: any) {
			requireAuth(context);
			const start = new Date(startDate);
			const end = new Date(endDate);
			if (start > end) throw new Error('Start date must be before end date');
			const bookings = await prisma.booking.findMany({ where: { tenantId: context.user.tenantId, checkIn: { gte: start }, checkOut: { lte: end } }, orderBy: { checkIn: 'asc' } });
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
			if (month < 1 || month > 12) throw new Error('Month must be between 1 and 12');
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
		async health() { return 'ok'; },
	},
	Mutation: {
		// Auth
		async register(_: any, { input }: any, context: any) {
			const existing = await prisma.tenant.findUnique({ where: { email: input.email } });
			if (existing) throw new Error('Email already registered');
			if (input.password.length < 8) throw new Error('Password must be at least 8 characters');
			const passwordHash = await bcrypt.hash(input.password, 10);
			const tenant = await prisma.tenant.create({ data: { name: input.name, email: input.email, passwordHash, currency: input.currency || 'OMR', timezone: input.timezone || 'Asia/Muscat', language: input.language || 'en', subscriptionStatus: 'TRIAL', validUntil: calculateValidUntil(TRIAL_DAYS), rooms: JSON.stringify([{ id: 'A1', name: 'A1' }, { id: 'A2', name: 'A2' }, { id: 'A3', name: 'A3' }, { id: 'A4', name: 'A4' }, { id: 'A5', name: 'A5' }]), isAdmin: false, isActive: true, settings: { create: { defaultNightPrice: 50, defaultTax: 0 } } }, include: { settings: true } });
			const { token, refreshToken } = generateTokens(tenant.id, tenant.email);
			await prisma.auditLog.create({ data: { tenantId: tenant.id, action: 'TENANT_UPDATED', entityType: 'Tenant', entityId: tenant.id, changes: { action: 'tenant_created' } } });
			return { token, refreshToken, tenant: { ...normalizeTenant(tenant), bookingsCount: 0 } };
		},
		async login(_: any, { email, password }: any, context: any) {
			const tenant = await prisma.tenant.findUnique({ where: { email }, include: { settings: true } });
			if (!tenant) throw new Error('Invalid credentials');
			const passwordMatch = await bcrypt.compare(password, tenant.passwordHash);
			if (!passwordMatch) throw new Error('Invalid credentials');
			if (tenant.subscriptionStatus === 'EXPIRED' || tenant.subscriptionStatus === 'CANCELED') throw new Error('Subscription expired. Please renew to continue.');
			const { token, refreshToken } = generateTokens(tenant.id, tenant.email);
			const bookingsCount = await prisma.booking.count({ where: { tenantId: tenant.id } });
			return { token, refreshToken, tenant: { ...normalizeTenant(tenant), bookingsCount } };
		},
		async logout() { return true; },
		async refreshToken(_: any, { refreshToken }: any, context: any) {
			try {
				const verified = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
				// @ts-ignore
				const { tenantId, email } = verified;
				const { token: newToken, refreshToken: newRefreshToken } = generateTokens(tenantId, email);
				const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { settings: true } });
				if (!tenant) throw new Error('Tenant not found');
				const bookingsCount = await prisma.booking.count({ where: { tenantId: tenant.id } });
				return { token: newToken, refreshToken: newRefreshToken, tenant: { ...normalizeTenant(tenant), bookingsCount } };
			} catch { throw new Error('Invalid refresh token'); }
		},

		// Bookings
		async createBooking(_: any, { input }: any, context: any) {
			requireAuth(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId }, include: { settings: true } });
			if (!tenant) throw new Error('Tenant not found');
			const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);
			if (!rooms.find((r: any) => r.id === input.room)) throw new Error('Invalid room');
			const checkIn = new Date(input.checkIn);
			const checkOut = new Date(input.checkOut);
			const nights = differenceInCalendarDays(checkOut, checkIn);
			if (nights <= 0) throw new Error('Check-out must be after check-in');
			const totalPrice = nights * input.nightPrice;
			const tax = totalPrice * ((tenant.settings?.defaultTax || 0) / 100);
			const remaining = totalPrice + tax - input.deposit;
			const booking = await prisma.booking.create({ data: { tenantId: context.user.tenantId, guestName: input.guestName, guestEmail: input.guestEmail, guestPhone: input.guestPhone, city: input.city, room: input.room, checkIn, checkOut, nightPrice: input.nightPrice, deposit: input.deposit, status: input.status?.toLowerCase() || 'upcoming', notes: input.notes, nights, totalPrice, tax, remaining } });
			await prisma.auditLog.create({ data: { tenantId: context.user.tenantId, action: 'BOOKING_CREATED', entityType: 'Booking', entityId: booking.id, changes: { action: 'booking_created', booking } } });
			return normalizeBooking(booking);
		},
		async updateBooking(_: any, { id, input }: any, context: any) {
			requireAuth(context);
			const booking = await prisma.booking.findFirst({ where: { id, tenantId: context.user.tenantId } });
			if (!booking) throw new Error('Booking not found');
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId }, include: { settings: true } });
			if (!tenant) throw new Error('Tenant not found');
			const updateData: any = { ...input };
			if (input.checkIn || input.checkOut || input.nightPrice || input.deposit) {
				const newInput = { checkIn: input.checkIn || booking.checkIn.toISOString(), checkOut: input.checkOut || booking.checkOut.toISOString(), nightPrice: input.nightPrice || booking.nightPrice, deposit: input.deposit || booking.deposit };
				const checkIn = new Date(newInput.checkIn);
				const checkOut = new Date(newInput.checkOut);
				const nights = differenceInCalendarDays(checkOut, checkIn);
				const totalPrice = nights * newInput.nightPrice;
				const tax = totalPrice * ((tenant.settings?.defaultTax || 0) / 100);
				const remaining = totalPrice + tax - newInput.deposit;
				Object.assign(updateData, { nights, totalPrice, tax, remaining });
			}
			if (input.status) updateData.status = input.status.toLowerCase();
			const updated = await prisma.booking.update({ where: { id }, data: updateData });
			await prisma.auditLog.create({ data: { tenantId: context.user.tenantId, action: 'BOOKING_UPDATED', entityType: 'Booking', entityId: booking.id, changes: { before: booking, after: updated } } });
			return normalizeBooking(updated);
		},
		async deleteBooking(_: any, { id }: { id: string }, context: any) {
			requireAuth(context);
			const booking = await prisma.booking.findFirst({ where: { id, tenantId: context.user.tenantId } });
			if (!booking) throw new Error('Booking not found');
			await prisma.booking.delete({ where: { id } });
			await prisma.auditLog.create({ data: { tenantId: context.user.tenantId, action: 'BOOKING_DELETED', entityType: 'Booking', entityId: id, changes: { action: 'booking_deleted' } } });
			return true;
		},
		async bulkImportBookings(_: any, { bookings }: { bookings: any[] }, context: any) {
			requireAuth(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId }, include: { settings: true } });
			if (!tenant) throw new Error('Tenant not found');
			const created = [];
			for (const input of bookings) {
				const checkIn = new Date(input.checkIn);
				const checkOut = new Date(input.checkOut);
				const nights = differenceInCalendarDays(checkOut, checkIn);
				if (nights <= 0) continue;
				const totalPrice = nights * input.nightPrice;
				const tax = totalPrice * ((tenant.settings?.defaultTax || 0) / 100);
				const remaining = totalPrice + tax - input.deposit;
				const booking = await prisma.booking.create({ data: { tenantId: context.user.tenantId, guestName: input.guestName, guestEmail: input.guestEmail, guestPhone: input.guestPhone, city: input.city, room: input.room, checkIn, checkOut, nightPrice: input.nightPrice, deposit: input.deposit, status: input.status?.toLowerCase() || 'upcoming', notes: input.notes, nights, totalPrice, tax, remaining } });
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
			if (!tenant) throw new Error('Tenant not found');
			if (input.name && input.name !== tenant.name) {
				const existing = await prisma.tenant.findUnique({ where: { name: input.name } });
				if (existing) throw new Error('Name already taken');
			}
			const updated = await prisma.tenant.update({ where: { id: context.user.tenantId }, data: { ...(input.name && { name: input.name }), ...(input.language && { language: input.language }), ...(input.currency && { currency: input.currency }), ...(input.timezone && { timezone: input.timezone }) }, include: { settings: true, _count: { select: { bookings: true } } } });
			await prisma.auditLog.create({ data: { tenantId: context.user.tenantId, action: 'TENANT_UPDATED', entityType: 'Tenant', entityId: context.user.tenantId, changes: { action: 'tenant_updated', updates: JSON.parse(JSON.stringify(input)) } } });
			return { ...updated, bookingsCount: updated._count?.bookings || 0 };
		},
		async updateTenantSettings(_: any, { input }: any, context: any) {
			requireAuth(context);
			if (input.defaultNightPrice !== undefined && input.defaultNightPrice < 0) throw new Error('Night price cannot be negative');
			if (input.defaultTax !== undefined && (input.defaultTax < 0 || input.defaultTax > 100)) throw new Error('Tax must be between 0 and 100');
			let settings = await prisma.tenantSettings.findUnique({ where: { tenantId: context.user.tenantId } });
			if (!settings) {
				settings = await prisma.tenantSettings.create({ data: { tenantId: context.user.tenantId, defaultNightPrice: input.defaultNightPrice || 50, defaultTax: input.defaultTax || 0, notifyOnBooking: input.notifyOnBooking !== undefined ? input.notifyOnBooking : true, notifyOnCancellation: input.notifyOnCancellation !== undefined ? input.notifyOnCancellation : true } });
			} else {
				settings = await prisma.tenantSettings.update({ where: { tenantId: context.user.tenantId }, data: { ...(input.defaultNightPrice !== undefined && { defaultNightPrice: input.defaultNightPrice }), ...(input.defaultTax !== undefined && { defaultTax: input.defaultTax }), ...(input.notifyOnBooking !== undefined && { notifyOnBooking: input.notifyOnBooking }), ...(input.notifyOnCancellation !== undefined && { notifyOnCancellation: input.notifyOnCancellation }) } });
			}
			return settings;
		},
		async addRoom(_: any, { name }: any, context: any) {
			requireAuth(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId } });
			if (!tenant) throw new Error('Tenant not found');
			const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);
			if (rooms.some((r: any) => r.name === name)) throw new Error('Room name already exists');
			const newRoom = { id: `R${Date.now()}`, name };
			rooms.push(newRoom);
			const updated = await prisma.tenant.update({ where: { id: context.user.tenantId }, data: { rooms: rooms }, include: { settings: true, _count: { select: { bookings: true } } } });
			return { ...updated, bookingsCount: updated._count?.bookings || 0 };
		},
		async removeRoom(_: any, { roomId }: any, context: any) {
			requireAuth(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: context.user.tenantId } });
			if (!tenant) throw new Error('Tenant not found');
			const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : JSON.parse(tenant.rooms as any);
			if (!rooms.find((r: any) => r.id === roomId)) throw new Error('Room not found');
			const updatedRooms = rooms.filter((r: any) => r.id !== roomId);
			const updated = await prisma.tenant.update({ where: { id: context.user.tenantId }, data: { rooms: updatedRooms }, include: { settings: true, _count: { select: { bookings: true } } } });
			return { ...updated, bookingsCount: updated._count?.bookings || 0 };
		},
		async createAdminSubscription(_: any, { tenantId, days }: any, context: any) {
			await requireSuperAdmin(context);
			if (days <= 0) throw new Error('Days must be positive');
			const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
			if (!tenant) throw new Error('Tenant not found');
			const validUntil = new Date();
			validUntil.setDate(validUntil.getDate() + days);
			const updated = await prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'active', validUntil }, include: { settings: true, _count: { select: { bookings: true } } } });
			await prisma.payment.create({ data: { tenantId, amount: 0, currency: 'OMR', status: 'completed', planType: 'admin-grant', planDays: days, description: `Admin granted ${days} days subscription` } });
			return { ...updated, bookingsCount: updated._count?.bookings || 0 };
		},
		async cancelSubscription(_: any, { tenantId }: any, context: any) {
			await requireSuperAdmin(context);
			const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
			if (!tenant) throw new Error('Tenant not found');
			await prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'canceled' } });
			await prisma.auditLog.create({ data: { tenantId, action: 'TENANT_UPDATED', entityType: 'Tenant', entityId: tenantId, changes: { action: 'subscription_canceled' } } });
			return true;
		},
	},
};
