-- Drop the tombstone table for user-deleted synced bookings.
--
-- New model: the channel side is the source of truth. To delete a booking
-- permanently, remove it on Airbnb / Gathern — `performSync` now runs an
-- orphan-cancel pass that marks our copy `canceled` when its UID disappears
-- from the feed. Deleting from our app on its own is no longer permanent;
-- it will be re-imported on next sync if the UID is still in the feed.
--
-- Run this AFTER deploying the matching backend (which no longer reads or
-- writes this table). Order:
--   1. Deploy backend that drops tombstone reads/writes.
--   2. Run this SQL.
--
-- If you ever need to roll back, restore from add_deleted_external_booking_tombstone.sql.

DROP TABLE IF EXISTS "DeletedExternalBooking" CASCADE;
