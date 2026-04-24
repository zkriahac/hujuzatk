# Channel Manager — Airbnb / Gathern / Booking.com Sync

Each tenant connects their external platform calendars via iCal URL. The backend fetches, parses, and upserts bookings — either on-demand from the UI, or nightly via separate cron schedules per platform.

---

## How it works

All three platforms issue a private iCal export URL per listing. Users paste that URL into the Integrations tab, pick which internal room it maps to, and save. The backend:

1. Fetches the iCal feed (`.ics` text)
2. Parses each `VEVENT` with [node-ical](https://www.npmjs.com/package/node-ical)
3. Maps event fields to a booking
4. Upserts by `(tenantId, externalId)` — the `VEVENT.UID` is the dedup key

| iCal field | Booking field |
|------------|---------------|
| `UID` | `externalId` (dedup key) |
| `DTSTART` | `checkIn` |
| `DTEND` | `checkOut` |
| `SUMMARY` | `guestName` (parsed per platform) |
| `DESCRIPTION` | `notes` |
| `STATUS=CANCELLED` | `status: canceled` |

**Prices are not carried in iCal** — imported bookings have `nightPrice = 0`. Users update manually after import.

### Guest name parsing

| Channel | SUMMARY example | Extracted name |
|---------|-----------------|----------------|
| Airbnb | `"Reservation by John Smith"` | `John Smith` |
| Booking.com | `"Booking from John Smith"` | `John Smith` |
| Gathern / fallback | raw SUMMARY | used as-is (handles Arabic) |
| Any | `"CLOSED"` / `"Not available"` | `[channel block]` |

---

## Where each user gets their iCal URL

| Platform | Path |
|----------|------|
| Airbnb | Manage listings → Calendar → Export calendar → Copy URL |
| Booking.com | Extranet → Calendar → Sync calendars → Export calendar → Copy iCal URL |
| Gathern (جاذبين) | الإعدادات ← مزامنة التقويم ← نسخ الرابط |

---

## Architecture

### Database (Prisma)

- `ChannelIntegration` — one row per (tenant, channel, room)
  - Unique: `(tenantId, channelName, roomId)` — one integration per channel per room
  - Stores full `icalUrl` (never returned to frontend)
- `Booking` — added `externalId` + `externalChannel`
  - Unique: `(tenantId, externalId)` WHERE `externalId IS NOT NULL` — Postgres-level dedup safety net

See [`schema.prisma`](../elysia-server/prisma/schema.prisma).

Migration SQL at [`add_channel_integration.sql`](../elysia-server/prisma/migrations/add_channel_integration.sql).

### Backend

| File | Purpose |
|------|---------|
| [`icalParser.ts`](../elysia-server/icalParser.ts) | Fetch + parse `.ics`, 10s timeout |
| [`channelSync.ts`](../elysia-server/channelSync.ts) | `performSync`, `syncAllTenantsForChannel`, shared by resolvers + cron |
| [`resolvers.ts`](../elysia-server/resolvers.ts) | 5 new GraphQL ops for the UI |
| [`api/cron-sync.ts`](../elysia-server/api/cron-sync.ts) | Vercel serverless handler |
| [`index.ts`](../elysia-server/index.ts) | Same cron route wired into Elysia (for Fly.io) |

### Frontend

| File | Purpose |
|------|---------|
| [`IntegrationsView.tsx`](../src/components/IntegrationsView.tsx) | Full UI |
| [`graphql.ts`](../src/lib/graphql.ts) | 5 new gql operations |
| [`i18n.ts`](../src/lib/i18n.ts) | EN/AR/TR strings |

### GraphQL operations

```graphql
# Queries
getChannelIntegrations: [ChannelIntegration!]!

# Mutations
saveChannelIntegration(input: SaveChannelIntegrationInput!): ChannelIntegration!
deleteChannelIntegration(id: ID!): Boolean!
syncChannel(id: ID!): SyncResult!
syncAllChannels: [SyncResult!]!
```

`icalUrlMasked` is returned — only the last 20 chars (full URL never leaves the DB).

---

## Sync triggers

### On-demand (from the UI)

- "Sync Now" button per integration → `syncChannel`
- "Sync All" button → `syncAllChannels` (only active integrations for this tenant)

### Nightly cron (per platform, staggered)

Defined in [`vercel.json`](../vercel.json):

| Platform | Schedule (UTC) |
|----------|----------------|
| Airbnb | `0 1 * * *` (01:00) |
| Gathern | `0 2 * * *` (02:00) |
| Booking.com | `0 3 * * *` (03:00) |

Each cron hits `/api/cron-sync?channel=<name>` which calls `syncAllTenantsForChannel(channel)` — iterating every **active** integration across every tenant for that channel.

**Only production deployments run Vercel crons.** Preview deploys don't.

### Auth

Endpoint accepts either:
- `x-vercel-cron: 1` header (automatic on Vercel cron triggers)
- `Authorization: Bearer ${CRON_SECRET}` (manual testing, Fly.io)

---

## Deployment checklist

1. **Apply DB migration** — paste [`add_channel_integration.sql`](../elysia-server/prisma/migrations/add_channel_integration.sql) into Supabase SQL Editor and run. (Direct Prisma connection is blocked from local.)
2. **Set env var** — `CRON_SECRET` in Vercel project settings (any random string). Only needed if triggering externally.
3. **Deploy** — `vercel --prod` from project root.

---

## Manual testing

```bash
# Verify auth rejection
curl -i "https://api.hujuzatk.com/api/cron-sync?channel=airbnb"
# → 401

# Verify channel validation
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://api.hujuzatk.com/api/cron-sync?channel=bogus"
# → 400 with valid channel list

# Trigger a real sync
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://api.hujuzatk.com/api/cron-sync?channel=airbnb"
# → { ok: true, channel, integrationsProcessed, totals: { imported, updated, canceled, failed }, results: [...] }
```

---

## Known limitations

- **Pricing**: iCal doesn't carry prices. Imported bookings have `nightPrice = 0` — tenant edits manually. UI shows an amber note.
- **Guest contact info**: Email/phone not in iCal feeds.
- **No real-time push**: Sync is nightly or on-demand — no webhooks.
- **Room rename/delete**: If a tenant renames or removes a room that has channel integrations, bookings keep the old `roomId` string. Consider adding a guard in `removeRoom` resolver.
- **Multi-unit listings**: Each iCal URL = one listing = one room. Platforms that return combined feeds (PMS like Guesty) would need `X-WR-CALNAME` / `LOCATION` parsing per event.
