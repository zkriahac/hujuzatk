# Backend Development Guide

The active backend is **elysia-server** — an Elysia + GraphQL Yoga + Prisma server running on Bun.

> The `apollo-server/` directory is legacy and not used in production.

---

## Stack

| Layer | Technology |
|-------|------------|
| HTTP Server | [Elysia](https://elysiajs.com) (Bun runtime) |
| GraphQL | [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) |
| ORM | [Prisma](https://prisma.io) |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Deployment | Vercel Serverless (Node.js runtime) |

---

## Project Structure

```
elysia-server/
  index.ts              # Elysia HTTP server (local dev only)
  graphql.ts            # GraphQL Yoga instance + error masking
  typeDefs.ts           # GraphQL SDL schema
  resolvers.ts          # All query/mutation resolvers
  context.ts            # JWT extraction, request context
  prisma.ts             # Prisma client singleton
  analyticsSync.ts      # Pre-compute MonthlyOccupancyCache for all tenants
  prisma/
    schema.prisma       # Database models
    seed.ts             # Seed script
    migrations/
      add_monthly_occupancy_cache.sql   # Manual migration (run in Supabase SQL editor)
  api/
    graphql.ts          # Vercel serverless handler (production)
    health.ts           # Health check endpoint
    cron-sync.ts        # Vercel cron: iCal channel sync (nightly)
    cron-analytics.ts   # Vercel cron: occupancy cache rebuild (1st of each month)
  vercel.json           # Vercel deployment config + cron schedules
  .env                  # Local environment variables
```

---

## Environment Variables

File: `elysia-server/.env`

```env
DATABASE_URL="postgresql://..."   # Supabase connection string

NODE_ENV=development
PORT=4000

JWT_SECRET=...                    # Access token secret
JWT_REFRESH_SECRET=...            # Refresh token secret
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

TRIAL_DAYS=14

CRON_SECRET=...                   # Bearer token for manual cron triggers
```

For Vercel production, set all the above in the Vercel project's environment settings (not committed).

---

## Local Development

```bash
cd elysia-server
bun install
bun run dev          # starts on http://localhost:4000
```

GraphQL Playground: `http://localhost:4000/graphql`
Health check: `http://localhost:4000/health`

---

## Database

Schema lives in `elysia-server/prisma/schema.prisma`.

```bash
cd elysia-server
npx prisma generate          # regenerate client after schema changes
npx prisma db push           # push schema to DB (no migration files)
npx prisma studio            # open Prisma Studio GUI
npx prisma db seed           # run seed script
```

### Models

| Model | Purpose |
|-------|---------|
| `Tenant` | Hotel/property owner account |
| `TenantSettings` | Per-tenant defaults (night price, tax) |
| `Booking` | Guest booking records |
| `AuditLog` | Change history for bookings and tenants |
| `Payment` | Subscription payments (admin-granted) |
| `GlobalSettings` | App-wide defaults (singleton, id=1) |
| `ChannelIntegration` | iCal sync links per room (Airbnb / Gathern / Booking.com) |
| `Expense` | Per-room expense records |
| `MonthlyOccupancyCache` | Pre-computed occupancy per `[tenantId, roomId, year, month]` — rebuilt by cron |

### DB migrations note

Supabase is firewalled from local dev machines — `prisma migrate dev` and `prisma db push` both fail locally. Schema changes must be:
1. Updated in `prisma/schema.prisma`
2. Run `npx prisma generate` (client-only, works offline)
3. Written as a SQL file in `prisma/migrations/` and applied manually via the Supabase SQL Editor

---

## GraphQL API

### Auth
| Operation | Description |
|-----------|-------------|
| `mutation register(input)` | Create account, returns tokens + tenant |
| `mutation login(email, password)` | Returns tokens + tenant |
| `mutation refreshToken(refreshToken)` | Rotates access + refresh tokens |
| `mutation logout` | Client-side (tokens are stateless) |

### Bookings
| Operation | Description |
|-----------|-------------|
| `query getBookings(filter, limit, offset, sortBy, sortOrder)` | Paginated list |
| `query getBooking(id)` | Single booking |
| `query getBookingsByDateRange(startDate, endDate)` | Range query |
| `query getBookingsByRoom(room)` | Room-specific bookings |
| `mutation createBooking(input)` | Create new booking |
| `mutation updateBooking(id, input)` | Update booking |
| `mutation deleteBooking(id)` | Soft delete |
| `mutation bulkImportBookings(bookings)` | Import up to 500 at once — bookings with `checkOut` older than 3 months are silently skipped |
| `mutation bulkDeleteBookings(ids)` | Bulk delete by ID array |

### Reports
| Operation | Description |
|-----------|-------------|
| `query getOccupancyReport(room, year, month)` | Occupancy % for a month |
| `query getRevenueReport(year, month?)` | Revenue breakdown |
| `query getGuestStatistics` | Aggregate guest stats |
| `query getYearlyOccupancy(year)` | Full-year heatmap data — reads from `MonthlyOccupancyCache` |

### Admin (super admin only)
| Operation | Description |
|-----------|-------------|
| `query getAllTenants` | List all tenant accounts |
| `mutation createAdminSubscription(tenantId, days)` | Grant subscription |
| `mutation cancelSubscription(tenantId)` | Cancel tenant |

---

## Error Handling

All resolvers throw `GraphQLError` with a typed `extensions.code`:

| Code | HTTP | When |
|------|------|------|
| `UNAUTHENTICATED` | 401 | No/invalid token, bad credentials |
| `FORBIDDEN` | 403 | Non-admin accessing admin route, expired subscription |
| `NOT_FOUND` | 404 | Record doesn't exist or belongs to another tenant |
| `BAD_USER_INPUT` | 400 | Validation failures, duplicate email/name |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected errors (masked in production) |

In production (`NODE_ENV != development`), unknown errors are masked — only `GraphQLError` instances with a known `extensions.code` pass through to the client.

---

## Deployment (Vercel)

The elysia-server is deployed as a Vercel Serverless function using `api/graphql.ts`.

Vercel config (`elysia-server/vercel.json`):
- Region: `sin1` (Singapore)
- Route `/graphql` → `api/graphql.ts`
- Route `/health` → `api/health.ts`
- Cron jobs (see below)

**Note:** The local `index.ts` (Elysia HTTP server) is NOT used on Vercel. Vercel uses `api/graphql.ts` directly which internally calls the same GraphQL Yoga instance.

Production domain: `https://api.hujuzatk.com/graphql`

### Cron jobs

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron-sync?channel=airbnb` | `0 1 * * *` | Sync Airbnb iCal feeds |
| `/api/cron-sync?channel=gathern` | `0 2 * * *` | Sync Gathern iCal feeds |
| `/api/cron-sync?channel=booking.com` | `0 3 * * *` | Sync Booking.com iCal feeds |
| `/api/cron-analytics` | `0 4 1 * *` | Rebuild `MonthlyOccupancyCache` for all tenants |

Auth: Vercel sets `x-vercel-cron: 1` automatically. For manual triggers use `Authorization: Bearer <CRON_SECRET>`:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://api.hujuzatk.com/api/cron-analytics
```

On first run after adding a new tenant, `cron-analytics` backfills the last 36 months automatically.

### Deploy steps

```bash
cd elysia-server
npx vercel --prod
```

Make sure the following env vars are set in the Vercel project dashboard before deploying:
`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRE`, `JWT_REFRESH_EXPIRE`, `TRIAL_DAYS`, `CRON_SECRET`

---

## CORS

Allowed origins (configured in both `index.ts` for local and `api/graphql.ts` for Vercel):

```
https://hujuzatk.com
https://www.hujuzatk.com
http://localhost:5173
http://localhost:3000
```
