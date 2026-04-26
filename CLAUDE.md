# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This is a single repo containing **two independently deployed Vercel projects**:

- **Frontend** (`/`) — React 19 + Vite SPA → `hujuzatk-fe` → hujuzatk.com
- **Backend** (`/elysia-server`) — Elysia + GraphQL Yoga + Prisma on Bun → `hujuzatk-project` → api.hujuzatk.com

There is no `apollo-server/` directory; the older docs that mention one are stale. All backend work happens in `elysia-server/`.

## Common commands

### Frontend (root, uses npm + Node)
```bash
npm install
npm run dev          # Vite on http://localhost:5173
npm run build        # outputs to dist/
npm run preview
```

### Backend (`elysia-server/`, uses Bun)
```bash
cd elysia-server
bun install
bun run dev          # http://localhost:4000/graphql, /health
```

### Prisma (always run from `elysia-server/`)
```bash
npx prisma generate
npx prisma db push          # schema → DB without migration files
npx prisma migrate dev      # generate + apply a migration
npx prisma studio
npx prisma db seed          # runs prisma/seed.ts
```

There is no test suite, linter, or typecheck script wired up — `tsc` and `vite build` are the only static checks.

## Architecture essentials

### Multi-tenancy
Every domain row belongs to a `Tenant`. The backend extracts `tenantId` from the JWT in `elysia-server/context.ts` and injects it into every resolver in `resolvers.ts`. Resolvers must filter by `tenantId` — there is no row-level security in app code beyond this, so a missing filter leaks data across tenants.

Super-admin operations (`getAllTenants`, `createAdminSubscription`, `cancelSubscription`) check `isAdmin` on the tenant record — the same JWT, just a different code path.

### Backend entry points
- `elysia-server/index.ts` — local dev only (Elysia HTTP server on port 4000). Also handles `/api/cron-sync`.
- `elysia-server/api/graphql.ts` — Vercel serverless handler used in production. Both wrap the same Yoga instance from `graphql.ts`.
- `elysia-server/api/cron-sync.ts` — Vercel cron handler for iCal channel sync (Airbnb / Gathern / Booking.com), scheduled daily in `elysia-server/vercel.json`. Auth via `x-vercel-cron` header or `CRON_SECRET`.

If you add a new HTTP route, wire it in **both** `index.ts` and `api/` for it to work locally and on Vercel.

### Errors
Resolvers throw `GraphQLError` with `extensions.code` ∈ `UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | BAD_USER_INPUT | INTERNAL_SERVER_ERROR`. In production (`NODE_ENV != development`), errors without a known code are masked. Use the typed codes — anything else becomes a generic 500 to the client.

### Frontend data flow
1. Apollo Client (`src/lib/apolloClient.ts`) — auth link injects `Bearer <localStorage.authToken>`; error link redirects to `/user/login` on `UNAUTHENTICATED`. Default fetch policy is `cache-and-network`.
2. `src/lib/dataService.ts` and `authService.ts` try GraphQL first, fall back to **Dexie** (IndexedDB, `src/db.ts`) on network failure. The app is offline-capable.
3. All GraphQL ops are wrapped in hooks in `src/hooks/useGraphQL.ts`. Use those rather than calling Apollo directly from components.

Tokens live in `localStorage` (`authToken`, `refreshToken`), not httpOnly cookies — the older ARCHITECTURE.md cookie design was never implemented.

### Routing
`src/App.tsx` is a path-string switch (no nested `<Routes>`). Top-level paths are `/`, `/user/*`, `/superadmin`, `/story`, `/privacy`, `/terms`, `/404`; everything else is treated as `/:workspace` and rendered by `WorkspaceShell`. Workspace slug is the URL-encoded tenant name.

### i18n
`src/lib/i18n.ts` provides `t()` and `getDir()` for `en` / `ar`. Language is per-tenant (stored on the `Tenant` row). Arabic flips layout to RTL — when adding UI, use `getDir()` rather than hardcoded `ltr`.

## Environment

### Frontend (`.env`, `.env.production`)
- `VITE_GRAPHQL_URL` — also acts as the **cloud-mode flag**. When unset the app runs purely against Dexie. Local dev typically points at `http://localhost:4000/graphql`; production at `https://api.hujuzatk.com/graphql`.
- Other `VITE_*` vars listed in `.env.example` are declared but not currently read.

### Backend (`elysia-server/.env`)
- `DATABASE_URL` — Supabase Postgres. Production uses PgBouncer (port 6543) for runtime + a separate `DIRECT_URL` (5432) for migrations.
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRE` (default `24h`), `JWT_REFRESH_EXPIRE` (default `7d`)
- `TRIAL_DAYS` (default 14)
- `CRON_SECRET` — bearer token alternative to the Vercel cron header for `/api/cron-sync`

## Deployment

Both projects deploy independently:
```bash
# Frontend
npx vercel --prod                # from repo root

# Backend
cd elysia-server && npx vercel --prod
```

Backend region is `sin1` (Singapore). Each Vercel project owns its own env vars — local `.env` files are not used in prod.

## Things to know before editing

- **Don't trust `docs/QUICKSTART.md` paths** — it still references a `prohost-server/` folder that no longer exists. `docs/BE-DEV.md`, `docs/FE-DEV.md`, and the root `README.md` are current.
- **Two `@prisma/client` installs** — one in root `package.json` (unused at runtime; safe to ignore) and one in `elysia-server/package.json` (the real one).
- **Adding a GraphQL field**: update `elysia-server/typeDefs.ts` + `resolvers.ts` on the backend, and add a `gql` definition in `src/lib/graphql.ts` plus a hook in `src/hooks/useGraphQL.ts` on the frontend. Apollo `InMemoryCache` has merge policies for `getBookings` / `getBookingsByDateRange` — keep those in mind when adding paginated fields.
- **Path alias**: `@/` resolves to `src/` in the frontend (`vite.config.ts`).
