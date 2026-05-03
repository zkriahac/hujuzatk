-- Migration: Booking table optimization (run AFTER add_booking_external_url.sql)
-- 1. New column: externalReservationId — searchable reservation code (HM8JQYPYEF, 11180423)
-- 2. New index: composite (tenantId, checkIn, checkOut) — speeds up the calendar's date-range
--    query (the hottest read in the system).
-- 3. New index: composite (tenantId, externalChannel) — speeds up "all synced" filters and
--    the bulk-delete-synced flow we just added to the list view.
-- 4. New index: (tenantId, externalReservationId) — lets users search by reservation code.
-- 5. Drop the redundant @@unique([tenantId, id]) — `id` is already PK and unique on its own,
--    so this constraint stores a duplicate index for nothing.
-- Run in Supabase SQL editor.

-- 1. Add the column
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "externalReservationId" TEXT;

-- 2. Composite index for date-range queries (calendar view)
CREATE INDEX IF NOT EXISTS "Booking_tenantId_checkIn_checkOut_idx"
  ON "Booking" ("tenantId", "checkIn", "checkOut");

-- 3. Composite index for source filtering (synced vs manual)
CREATE INDEX IF NOT EXISTS "Booking_tenantId_externalChannel_idx"
  ON "Booking" ("tenantId", "externalChannel");

-- 4. Composite index for reservation-code lookup
CREATE INDEX IF NOT EXISTS "Booking_tenantId_externalReservationId_idx"
  ON "Booking" ("tenantId", "externalReservationId");

-- 5. Drop the redundant unique constraint (Postgres named it Booking_tenantId_id_key by default)
-- Uses pg_constraint check so it's a no-op if the constraint name is different — adjust if needed.
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_tenantId_id_key";
