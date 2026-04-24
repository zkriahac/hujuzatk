# Hujuzatk — Booking Management

Multi-tenant hotel & vacation-rental booking management SaaS.
Live at **[hujuzatk.com](https://hujuzatk.com)** (frontend) and **[api.hujuzatk.com](https://api.hujuzatk.com/graphql)** (backend).

---

## 📚 Documentation

All docs live under [`docs/`](./docs). Pick the one matching what you need to do.

### Getting started

| Doc | What's inside | When to open it |
|-----|---------------|-----------------|
| **[QUICKSTART.md](./docs/QUICKSTART.md)** | 15-minute checklist: install, seed the DB, run both servers locally | First time cloning the repo |
| **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | High-level system overview: multi-tenancy model, data flow, stack choices, deployment topology | Onboarding a new engineer / planning a cross-cutting change |

### Developing

| Doc | What's inside | When to open it |
|-----|---------------|-----------------|
| **[FE-DEV.md](./docs/FE-DEV.md)** | Frontend (React 19 + Vite + Apollo + Dexie offline cache) — routing, data layer, component conventions | Building UI, wiring GraphQL queries, adding pages |
| **[BE-DEV.md](./docs/BE-DEV.md)** | Backend (Elysia + GraphQL Yoga + Prisma + Bun) — schema, resolvers, JWT context, migrations | Adding a GraphQL resolver, changing the Prisma schema, debugging the API |
| **[LOGIC.md](./docs/LOGIC.md)** | Business rules: multi-tenancy, auth & sessions, booking statuses, reports, subscription lifecycle | Understanding *why* the code behaves a certain way |

### Operating

| Doc | What's inside | When to open it |
|-----|---------------|-----------------|
| **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** | Production deploy playbook: Vercel + Supabase setup, env vars, Railway/Docker alternatives, monitoring | Deploying, rotating secrets, setting up a new environment |
| **[CHANNEL_MANAGER.md](./docs/CHANNEL_MANAGER.md)** | iCal sync integration (Airbnb / Gathern / Booking.com) — how it works, how to add a new channel, cron schedule, troubleshooting | Working on or debugging channel integrations |

---

## Quick start (TL;DR)

**Backend** (Bun):
```bash
cd elysia-server
bun install
bun run dev        # http://localhost:4000/graphql
```

**Frontend** (Node):
```bash
npm install
npm run dev        # http://localhost:5173
```

Full setup with DB seeding is in [QUICKSTART.md](./docs/QUICKSTART.md).

---

## Production topology

Both FE and BE are deployed as separate Vercel projects from this monorepo:

| Project | Vercel name | URL | Root dir |
|---------|-------------|-----|----------|
| Frontend | `hujuzatk-fe` | [hujuzatk.com](https://hujuzatk.com) | `/` |
| Backend | `hujuzatk-project` | [api.hujuzatk.com](https://api.hujuzatk.com) | `/elysia-server` |

DB: Supabase Postgres (ap-southeast-1 region). Runtime queries route through PgBouncer via `DATABASE_URL` (port 6543); migrations use `DIRECT_URL` (port 5432).

Deploy instructions: [DEPLOYMENT.md](./docs/DEPLOYMENT.md).

---

## Tech stack at a glance

- **Frontend**: React 19 · Vite · Tailwind v4 · Apollo Client · Dexie (IndexedDB) · TypeScript
- **Backend**: Elysia · GraphQL Yoga · Prisma · Bun · TypeScript
- **DB**: PostgreSQL (Supabase) with RLS
- **Auth**: JWT (access + refresh)
- **Deployment**: Vercel Serverless (both projects)
- **Monitoring**: Vercel Analytics + GTM
