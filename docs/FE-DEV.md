# Frontend Development Guide

The frontend is a React 19 + Vite SPA (Single Page Application) with offline-first capability via IndexedDB (Dexie).

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 + `vite-plugin-singlefile` (bundles into one HTML file) |
| Styling | Tailwind CSS v4 |
| GraphQL client | Apollo Client v4 |
| Local DB | Dexie (IndexedDB) |
| Auth storage | `localStorage` (`authToken`, `refreshToken`) |
| Routing | React Router DOM v7 |
| Icons | Phosphor React |
| Date handling | date-fns + date-fns-tz |
| Deployment | Vercel (static) |

---

## Project Structure

```
src/
  App.tsx               # Root component — all views in one file
  main.tsx              # Entry point, BrowserRouter, service worker
  db.ts                 # Dexie schema (local IndexedDB)
  index.css             # Global styles
  lib/
    apolloClient.ts     # Apollo Client setup (auth link, error link, cache)
    authService.ts      # Login/register/logout — GraphQL-first, Dexie fallback
    dataService.ts      # Booking CRUD via Apollo + local cache sync
    graphql.ts          # All gql`` query/mutation/subscription definitions
    i18n.ts             # Translation strings (en/ar)
    supabaseClient.ts   # Supabase client (null if env vars missing)
  hooks/
    useGraphQL.ts       # React hooks wrapping Apollo (useBookings, useCreateBooking, etc.)
  utils/
    cn.ts               # Tailwind class merge utility
public/
  sw.js                 # Service worker (offline caching)
  manifest.json         # PWA manifest
```

---

## Environment Variables

File: `.env` (local development)

```env
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

File: `.env.production` (production build override)

```env
VITE_GRAPHQL_URL=https://api.hujuzatk.com/graphql
```

**Important:** `VITE_GRAPHQL_URL` controls two things:
1. Where Apollo Client sends GraphQL requests
2. Whether the app runs in **cloud mode** (`isCloud = true`) or **offline-only mode**

If `VITE_GRAPHQL_URL` is not set, the app falls back entirely to local Dexie storage.

The following `.env` vars are defined but **not currently read** by any source file — they are for future use:
`VITE_APP_NAME`, `VITE_APP_VERSION`, `VITE_ENABLE_SUBSCRIPTIONS`, `VITE_ENABLE_OFFLINE_MODE`, `VITE_ENABLE_ANALYTICS`, `VITE_LOG_LEVEL`, `VITE_SENTRY_DSN`, `VITE_AMPLITUDE_KEY`

---

## Local Development

```bash
# At project root
npm install
npm run dev          # starts Vite dev server on http://localhost:5173
```

Make sure the elysia-server is also running:

```bash
cd elysia-server
bun run dev          # starts on http://localhost:4000
```

---

## Build & Deploy

```bash
npm run build        # outputs to dist/ as a single bundled HTML file
npm run preview      # preview the production build locally
```

`vite-plugin-singlefile` inlines all JS/CSS into `index.html`. The Vercel deployment serves this as a static site with SPA rewrites (configured in root `vercel.json`).

---

## Routing

Routes are defined in `App.tsx` using `useLocation`:

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `LandingPage` | Public marketing page |
| `/user/*` | `UserAuthShell` | Login / Register |
| `/superadmin` | `SuperAdminShell` | Admin dashboard (isAdmin=true required) |
| `/privacy` | `PrivacyPolicy` | Static page |
| `/terms` | `TermsOfService` | Static page |
| `/:workspace` | `WorkspaceShell` | Main booking app for a tenant |

---

## Data Layer

### Priority order for data operations

1. **GraphQL API** (via `VITE_GRAPHQL_URL`) — primary source of truth
2. **Local Dexie (IndexedDB)** — cache + offline fallback

`authService.ts` and `dataService.ts` both follow this pattern: try GraphQL, catch network errors, fall back to local DB.

### Apollo Client (`src/lib/apolloClient.ts`)

- **authLink**: Attaches `Authorization: Bearer <token>` from `localStorage` to every request
- **errorLink**: On `UNAUTHENTICATED` error → clears tokens → redirects to `/user/login`
- **cache**: `InMemoryCache` with merge policies for `getBookings` and `getBookingsByDateRange`
- **defaultOptions**: `cache-and-network` for queries (always shows cached data, then refreshes)

### React Hooks (`src/hooks/useGraphQL.ts`)

All GraphQL operations are wrapped in custom hooks:

| Hook | Operation |
|------|-----------|
| `useMe()` | Fetch current tenant |
| `useLogin()` | Login mutation, stores tokens |
| `useRegister()` | Register mutation, stores tokens |
| `useBookings(filter?, limit, offset)` | Paginated booking list |
| `useBooking(id)` | Single booking |
| `useBookingsByDateRange(start, end)` | Date range filter |
| `useCreateBooking()` | Create + refetch list |
| `useUpdateBooking()` | Update + refetch list |
| `useDeleteBooking()` | Delete + refetch list |
| `useOccupancyReport(room, year, month)` | Occupancy data |
| `useRevenueReport(year, month?)` | Revenue data |
| `useGuestStatistics()` | Aggregate stats |
| `useBookingManager(filter?)` | Combined CRUD hook |

### Local Database (`src/db.ts`)

Dexie (IndexedDB) schema with two tables:

- `bookings`: `++id, tenantId, guestName, room, checkIn, checkOut, createdAt, status`
- `tenants`: `++id, uuid, email, subscriptionStatus, isAdmin`

Used as a local cache (synced from GraphQL responses) and as a fallback when the server is unreachable.

---

## Views (inside `App.tsx`)

| View | Key Features |
|------|-------------|
| `LandingPage` | Marketing, pricing, CTA |
| `WorkspaceShell` | Calendar, List, Reports, Settings tabs |
| Calendar view | Month grid with booking indicators per room |
| List view | Filterable/sortable booking table |
| Reports view | Occupancy + revenue charts |
| Settings view | Tenant config, room management, default prices |
| `SuperAdminShell` | Tenant list, subscription management |

---

## Internationalization

`src/lib/i18n.ts` supports `en` (English) and `ar` (Arabic with RTL layout). Language is stored on the `Tenant` record and applied via the `t()` and `getDir()` helpers throughout `App.tsx`.

---

## PWA / Offline

- `public/sw.js` — service worker for offline caching of the app shell
- `public/manifest.json` — PWA manifest (install to home screen)
- Dexie provides data persistence when offline
