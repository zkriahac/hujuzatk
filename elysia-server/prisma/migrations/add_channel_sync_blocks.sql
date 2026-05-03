-- Migration: opt-in host-block sync per channel integration.
-- Most hosts only want real bookings on their calendar — Gathern / Airbnb send a
-- separate "blocked day" iCal event for every day the host has marked unavailable
-- (often dozens per room). This column lets the user opt in per-integration.
-- Default false → next sync will stop importing new blocks AND delete previously-
-- imported blocks (channelSync.ts handles the cleanup).
-- Run in Supabase SQL editor.

ALTER TABLE "ChannelIntegration"
  ADD COLUMN IF NOT EXISTS "syncBlocks" BOOLEAN NOT NULL DEFAULT false;
