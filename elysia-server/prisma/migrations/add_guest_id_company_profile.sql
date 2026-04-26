-- Migration: add_guest_id_company_profile
--   1. Booking.guestIdNumber  — optional civil/passport ID per booking
--   2. TenantSettings.company* — company profile fields used on invoices

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "guestIdNumber" TEXT;

ALTER TABLE "TenantSettings"
  ADD COLUMN IF NOT EXISTS "companyName"    TEXT,
  ADD COLUMN IF NOT EXISTS "companyAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "companyPhone"   TEXT,
  ADD COLUMN IF NOT EXISTS "companyEmail"   TEXT,
  ADD COLUMN IF NOT EXISTS "companyTaxId"   TEXT,
  ADD COLUMN IF NOT EXISTS "companyLogoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceFooter"  TEXT;
