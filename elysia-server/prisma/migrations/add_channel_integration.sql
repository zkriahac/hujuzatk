-- Migration: add_channel_integration
-- Add externalId and externalChannel to Booking for iCal deduplication

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "externalId"      TEXT,
  ADD COLUMN IF NOT EXISTS "externalChannel" TEXT;

-- Unique constraint: one externalId per tenant (NULL values are exempt in Postgres)
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_tenantId_externalId_key"
  ON "Booking"("tenantId", "externalId")
  WHERE "externalId" IS NOT NULL;

-- New ChannelIntegration table
CREATE TABLE IF NOT EXISTS "ChannelIntegration" (
  "id"              TEXT        NOT NULL,
  "tenantId"        TEXT        NOT NULL,
  "channelName"     TEXT        NOT NULL,
  "roomId"          TEXT        NOT NULL,
  "icalUrl"         TEXT        NOT NULL,
  "isActive"        BOOLEAN     NOT NULL DEFAULT true,
  "lastSyncedAt"    TIMESTAMPTZ,
  "lastSyncStatus"  TEXT,
  "lastSyncMessage" TEXT,
  "lastSyncCount"   INTEGER,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "ChannelIntegration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChannelIntegration_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ChannelIntegration_tenantId_idx"
  ON "ChannelIntegration"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelIntegration_tenantId_channelName_roomId_key"
  ON "ChannelIntegration"("tenantId", "channelName", "roomId");

-- RLS for new table
ALTER TABLE "ChannelIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelIntegration" FORCE ROW LEVEL SECURITY;
