-- Migration: add MonthlyOccupancyCache table for pre-computed occupancy analytics
-- Run this in Supabase SQL editor before deploying the backend

CREATE TABLE IF NOT EXISTS "MonthlyOccupancyCache" (
  "id"             TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "roomId"         TEXT NOT NULL,
  "year"           INTEGER NOT NULL,
  "month"          INTEGER NOT NULL,
  "occupiedNights" INTEGER NOT NULL,
  "totalNights"    INTEGER NOT NULL,
  "occupancyRate"  DOUBLE PRECISION NOT NULL,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MonthlyOccupancyCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyOccupancyCache_tenantId_roomId_year_month_key"
  ON "MonthlyOccupancyCache"("tenantId", "roomId", "year", "month");

CREATE INDEX IF NOT EXISTS "MonthlyOccupancyCache_tenantId_idx"
  ON "MonthlyOccupancyCache"("tenantId");

-- Enable RLS: block all direct PostgREST access.
-- This table is only read/written by the backend via Prisma (service role),
-- never via the Supabase client or anon/authenticated keys.
ALTER TABLE "MonthlyOccupancyCache" ENABLE ROW LEVEL SECURITY;
