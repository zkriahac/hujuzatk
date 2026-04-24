-- Migration: add_tenant_feature_flags
-- Adds integrationsEnabled (admin toggle for Channel Manager) and onboardedAt (guided tour
-- completion) to Tenant. Also adds an optional label to ChannelIntegration for clearer mapping.

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "integrationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "onboardedAt"         TIMESTAMP(3);

ALTER TABLE "ChannelIntegration"
  ADD COLUMN IF NOT EXISTS "label" TEXT;
