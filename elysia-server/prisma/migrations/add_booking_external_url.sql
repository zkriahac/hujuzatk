-- Migration: add externalUrl column to Booking
-- Stores the reservation URL extracted from iCal description (Airbnb, Gathern, Booking.com)
-- so we can show a clickable "View on <channel>" link in the booking modal instead of
-- dumping the URL into the notes field (which polluted the corner-note indicator).
-- Run this in Supabase SQL editor before deploying the backend.

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
