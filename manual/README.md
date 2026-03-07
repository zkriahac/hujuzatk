# ProHost - Professional Booking Management SaaS

A secure, scalable, and feature-rich booking management system built with React 19, Apollo GraphQL, and PostgreSQL. Designed for hotels, hostels, vacation rentals, and property management companies.

**Version:** 2.0.0 (Production Ready)  
**License:** MIT

## ✨ Features

### Core Functionality
- ✅ **Multi-Tenant Management** - Complete tenant isolation and data security
- ✅ **Booking Management** - Create, update, delete, and search bookings
- ✅ **Calendar View** - Visual calendar with occupancy tracking
- ✅ **Guest Management** - Track guest information and booking history
- ✅ **Room Management** - Manage multiple rooms with custom configurations
- ✅ **Financial Tracking** - Monitor deposits, payments, and outstanding balances
- ✅ **Reports & Analytics** - Revenue, occupancy, and guest statistics

### Technical Features
- ✅ **GraphQL API** - Type-safe, efficient data fetching with Apollo Server
- ✅ **JWT Authentication** - Secure token-based auth with refresh tokens
- ✅ **PostgreSQL** - Reliable, scalable database via Supabase
- ✅ **Offline-First** - Dexie for local caching and PWA support
- ✅ **Real-time Updates** - WebSocket subscriptions for live notifications
- ✅ **Audit Logging** - Full compliance and security tracking
- ✅ **Multi-Language** - English and Arabic support built-in
- ✅ **Responsive Design** - Mobile-first UI with Tailwind CSS

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (React 19 + Vite)                │
│  - Apollo Client for GraphQL                                 │
│  - Dexie for offline caching                                 │
│  - Tailwind CSS for responsive UI                            │
└───────────────────────────────────────────────┬──────────────┘
                     │ HTTPS/WSS (GraphQL API)
                     │
┌───────────────────────────────────────────────▼──────────────┐
│            Backend (Elysia + GraphQL Yoga, Bun)              │
│  - Type-safe GraphQL resolvers                               │
│  - JWT auth extraction & multi-tenancy                       │
│  - Prisma ORM for database                                   │
│  - Audit logging & security                                  │
└───────────────────────────────────────────────┬──────────────┘
                     │ SQL (Prisma)
                     │
┌───────────────────────────────────────────────▼──────────────┐
│        PostgreSQL + Supabase (Cloud Infrastructure)          │
│  - Multi-tenant data isolation                               │
│  - Automatic backups & scaling                               │
│  - Row-level security policies                               │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
