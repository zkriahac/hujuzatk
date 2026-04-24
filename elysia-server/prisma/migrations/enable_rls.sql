-- Enable Row-Level Security on all public tables
-- This blocks direct access via Supabase anon/authenticated API keys
-- The Prisma backend connects as postgres (superuser) and bypasses RLS

-- Core tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GlobalSettings" ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (extra safety)
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantSettings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Booking" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "GlobalSettings" FORCE ROW LEVEL SECURITY;

-- No policies are created for anon/authenticated roles,
-- which means all access via Supabase REST API is denied by default.
-- Only the postgres superuser (used by Prisma) can access these tables.
