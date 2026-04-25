-- Migration: add_phase_a_data
-- Foundation for Phase A of the 9-item feature pass:
--   1. Human-friendly per-tenant booking numbers
--   2. Expense tracking (new Expense table)
--   3. Plan / quota fields on Tenant
-- All ALTERs and CREATEs are idempotent so the script is safe to re-run.

-- =========================================================
-- 1. Booking sequential numbering
-- =========================================================
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "bookingNumber" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_tenantId_bookingNumber_key"
  ON "Booking"("tenantId", "bookingNumber")
  WHERE "bookingNumber" IS NOT NULL;

-- Tenant-side counter (used by createBooking inside a transaction)
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "nextBookingNumber" INTEGER NOT NULL DEFAULT 1;

-- =========================================================
-- 2. Plan / quota
-- =========================================================
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "plan"     TEXT     NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS "maxRooms" INTEGER  NOT NULL DEFAULT 3;

-- Existing trial tenants stay on 'trial'; existing active subscriptions get
-- promoted heuristically based on prior validUntil — but we keep them on
-- trial here to avoid surprising anyone. Admin can move them via the new
-- adminSetPlan mutation (Phase C).

-- =========================================================
-- 3. Expense table
-- =========================================================
CREATE TABLE IF NOT EXISTS "Expense" (
  "id"        TEXT        NOT NULL,
  "tenantId"  TEXT        NOT NULL,
  "roomId"    TEXT,
  "date"      TIMESTAMPTZ NOT NULL,
  "amount"    DOUBLE PRECISION NOT NULL,
  "category"  TEXT        NOT NULL,
  "reason"    TEXT        NOT NULL,
  "notes"     TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Expense_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Expense_tenantId_date_idx"
  ON "Expense"("tenantId", "date");

CREATE INDEX IF NOT EXISTS "Expense_tenantId_roomId_date_idx"
  ON "Expense"("tenantId", "roomId", "date");

-- Match the existing security posture: lock the table to the postgres
-- superuser only (Prisma uses it; Supabase anon/authenticated keys are denied).
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" FORCE ROW LEVEL SECURITY;
