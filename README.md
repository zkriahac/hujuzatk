# Hujuzatk — Booking Management

Multi-tenant hotel booking management system.

## Docs

- [docs/BE-DEV.md](docs/BE-DEV.md) — Backend (Elysia + GraphQL + Prisma) setup, API reference, deployment
- [docs/FE-DEV.md](docs/FE-DEV.md) — Frontend (React + Apollo) setup, data layer, routing
- [docs/LOGIC.md](docs/LOGIC.md) — Business logic: auth, bookings, subscriptions, reports

## Quick Start

**Backend:**
```bash
cd elysia-server
bun install
bun run dev        # http://localhost:4000/graphql
```

**Frontend:**
```bash
npm install
npm run dev        # http://localhost:5173
```

## Production

- Frontend: Vercel static deployment (root `vercel.json`)
- Backend: Vercel Serverless (`elysia-server/vercel.json`), deployed to `https://api.hujuzatk.com`
