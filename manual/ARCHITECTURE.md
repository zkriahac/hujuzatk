# ProHost Booking Management SaaS - Architecture & Implementation Plan

**Current Date:** February 27, 2026  
**Project Status:** Building production-ready system  
**Tech Stack:** React 19 + Vite | Apollo Server | Prisma ORM | PostgreSQL (Supabase) | JWT Auth

---

## 📋 System Overview

ProHost is a multi-tenant booking management SaaS system with:
- **Multi-Tenancy:** Complete data isolation per tenant
- **Real-time Booking Management:** Calendar, list, and reporting views
- **GraphQL API:** Type-safe, efficient data fetching
- **PostgreSQL Database:** Reliable, scalable data persistence
- **JWT Authentication:** Secure session management
- **Subscription Management:** Trial → Paid → Expired lifecycle

---

## 🏗️ Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│  - Apollo Client for GraphQL queries/mutations             │
│  - Dexie for offline caching & instant UI updates          │
│  - React Router for multi-tenant workspaces                │
│  - Tailwind CSS for responsive UI                          │
└───────────────────────────────┬─────────────────────────────┘
                     │ HTTPS
                     │ GraphQL API
                     │
┌───────────────────────────────▼─────────────────────────────┐
│              Elysia + GraphQL Yoga (Bun)                    │
│  - Type-safe GraphQL resolvers                             │
│  - JWT auth extraction in context                           │
│  - Input validation & error handling                        │
│  - Multi-tenancy context injection                          │
└───────────────────────────────┬─────────────────────────────┘
                     │ SQL
                     │
┌───────────────────────────────▼─────────────────────────────┐
│            Prisma ORM + PostgreSQL                          │
│  - Supabase for hosting & backups                          │
│  - Type-safe database access                              │
│  - Automatic migrations                                    │
│  - Row-level security (RLS) at DB level                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Core Models

```prisma
Tenant
├── id (UUID, PK)
...