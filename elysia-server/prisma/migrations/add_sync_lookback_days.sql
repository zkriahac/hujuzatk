-- Migration: per-integration iCal lookback window.
-- Channel feeds (Airbnb/Gathern/Booking.com) only return events the provider chooses;
-- our code further filters out anything ending before today by default. This column
-- lets the user widen that window per integration (7 / 30 / 90 days or all).
--   NULL = future-only (preserves prior behaviour, no surprise back-fill)
--   0    = future-only (same as NULL, but set explicitly via Settings)
--   N>0  = events ending within the last N days
--   -1   = no cutoff (full feed)
-- Run via `npx prisma db push` (matches repo convention) or in Supabase SQL editor.

ALTER TABLE "ChannelIntegration"
  ADD COLUMN IF NOT EXISTS "syncLookbackDays" INTEGER;
