import Dexie, { type Table } from 'dexie';

export type BookingStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';

export interface RoomConfig {
  id: string;
  name: string;
}

export interface Tenant {
  id?: number; // Dexie primary key (local only)
  uuid: string; // Stable tenant ID (for Dexie and Supabase)
  email: string;
  name: string;
  language: string; // e.g. 'en', 'ar'
  currency: string; // e.g. 'OMR', 'USD'
  timezone: string; // IANA timezone string, e.g. 'Asia/Muscat'
  rooms: RoomConfig[];
  subscriptionStatus: SubscriptionStatus;
  validUntil?: string; // YYYY-MM-DD, last day of access (for trial or paid)
  createdAt: string; // ISO
  isAdmin?: boolean;
  defaultNightPrice?: number;
  defaultTax?: number;
  // Feature flags (from backend Tenant model)
  integrationsEnabled?: boolean; // default true; admin can disable per-tenant
  onboardedAt?: string | null; // ISO timestamp when guided tour is completed
  // Plan / quota
  plan?: string; // 'trial' | 'basic' | 'pro' | 'enterprise'
  maxRooms?: number; // Cap derived from plan; admin-overridable
  // Company profile (for invoices) — lifted out of TenantSettings so the
  // current session carries them without refetching settings every render.
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyTaxId?: string | null;
  companyLogoUrl?: string | null;
  invoiceFooter?: string | null;
  // Local-only password hash for Dexie mode (Supabase Auth is used in cloud mode)
  passwordHash?: string;
}

export interface Booking {
  id: string;
  tenantId: string; // multi-tenant isolation key
  bookingNumber?: number | null; // Sequential per-tenant human-friendly ID
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  guestIdNumber?: string; // Civil/national/passport ID — optional
  city?: string;
  room: string;
  checkIn: string; // ISO DateTime
  checkOut: string; // ISO DateTime
  nights: number; // Number of nights
  nightPrice: number;
  totalPrice: number; // Total without tax
  tax?: number; // Tax amount
  deposit: number;
  remaining?: number; // Balance due
  notes?: string;
  externalChannel?: string | null; // 'airbnb' | 'gathern' | 'booking.com' when synced via iCal
  externalUrl?: string | null;     // Reservation URL parsed from iCal description (clickable in view)
  createdAt: string; // ISO DateTime
  updatedAt?: string; // ISO DateTime
  status: BookingStatus;
}

export class MyDatabase extends Dexie {
  bookings!: Table<Booking>;
  tenants!: Table<Tenant>;

  constructor() {
    super('HotelDB');

    // Existing version (v2) – kept for backwards compatibility if DB already exists.
    this.version(2).stores({
      bookings: '++id, guestName, room, checkIn, checkOut, createdAt, status',
    }).upgrade((tx) => {
      // Ensure older rows at least have a confirmed status
      return tx.table('bookings').toCollection().modify((booking: any) => {
        if (!booking.status) booking.status = 'confirmed';
      });
    });

    // New multi-tenant schema (v3)
    this.version(3).stores({
      bookings:
        '++id, tenantId, guestName, room, checkIn, checkOut, createdAt, status',
      tenants: '++id, uuid, email, subscriptionStatus, isAdmin',
    }).upgrade(async (tx) => {
      // Attach a default tenantId for legacy bookings and keep status consistent
      await tx
        .table('bookings')
        .toCollection()
        .modify((booking: any) => {
          if (!booking.status) booking.status = 'confirmed';
          if (!booking.tenantId) booking.tenantId = 'local-single';
        });
    });

    // Add name index to tenants for workspace lookup (v4)
    this.version(4).stores({
      bookings:
        '++id, tenantId, guestName, room, checkIn, checkOut, createdAt, status',
      tenants: '++id, uuid, email, name, subscriptionStatus, isAdmin',
    });
  }
}

export const db = new MyDatabase();
