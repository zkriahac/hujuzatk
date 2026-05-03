-- Migration: tombstone table for user-deleted synced bookings.
-- When a user deletes a booking that came from a channel sync (Booking.externalId
-- is set), we insert a row here. The next iCal sync skips any event whose UID
-- is tombstoned for that tenant — prevents the "I deleted it but it came back"
-- surprise.
-- Run in Supabase SQL editor BEFORE deploying the backend that references it.

CREATE TABLE IF NOT EXISTS "DeletedExternalBooking" (
  "id"         TEXT NOT NULL,
  "tenantId"   TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "deletedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeletedExternalBooking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeletedExternalBooking_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeletedExternalBooking_tenantId_externalId_key"
  ON "DeletedExternalBooking" ("tenantId", "externalId");

CREATE INDEX IF NOT EXISTS "DeletedExternalBooking_tenantId_idx"
  ON "DeletedExternalBooking" ("tenantId");
