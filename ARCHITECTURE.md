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
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│  - Apollo Client for GraphQL queries/mutations             │
│  - Dexie for offline caching & instant UI updates          │
│  - React Router for multi-tenant workspaces                │
│  - Tailwind CSS for responsive UI                          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     │ GraphQL API
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Apollo Server (Express.js)                      │
│  - Type-safe GraphQL resolvers                             │
│  - JWT middleware for authentication                        │
│  - Input validation & error handling                        │
│  - Multi-tenancy context injection                          │
└────────────────────┬────────────────────────────────────────┘
                     │ SQL
                     │
┌────────────────────▼────────────────────────────────────────┐
│            Prisma ORM + PostgreSQL                          │
│  - Supabase for hosting & backups                          │
│  - Type-safe database access                              │
│  - Automatic migrations                                    │
│  - Row-level security (RLS) at DB level                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Core Models

```prisma
Tenant
├── id (UUID, PK)
├── name (String, unique)
├── email (String, unique)
├── subscriptionStatus (enum: trial | active | expired)
├── validUntil (DateTime)
├── timezone (IANA: "Asia/Muscat")
├── currency (enum: "OMR" | "USD" | etc)
├── language (enum: "en" | "ar")
├── rooms (JSON array of {id, name})
├── createdAt (DateTime)
└── relationships
    └── bookings (1:many)

Booking
├── id (UUID, PK)
├── tenantId (String, FK)
├── guestName (String)
├── city (String)
├── phone (String)
├── room (String)
├── checkIn (Date)
├── checkOut (Date)
├── nights (Int)
├── nightPrice (Float)
├── totalPrice (Float)
├── deposit (Float)
├── remaining (Float)
├── status (enum: upcoming | active | past | canceled)
├── createdAt (DateTime)
└── relationships
    └── tenant (many:1)

AuditLog (for security & compliance)
├── id (UUID, PK)
├── tenantId (String, FK)
├── action (BOOKING_CREATED | BOOKING_UPDATED | etc)
├── entityId (String)
├── userId (String) [optional]
├── details (JSON)
├── createdAt (DateTime)

Payment (for SaaS billing)
├── id (UUID, PK)
├── tenantId (String, FK)
├── amount (Float)
├── currency (String)
├── status (enum: pending | completed | failed)
├── transactionId (String)
├── createdAt (DateTime)
```

---

## 🔐 Security Implementation

### 1. **Authentication Flow**
```
User (Email + Password)
    ↓
POST /graphql (Mutation: login)
    ↓
Verify credentials
    ↓
Generate JWT (exp: 24h)
    ↓
Return token + refresh token
    ↓
Client stores in httpOnly cookie
```

### 2. **Authorization Layers**
- **Middleware:** Verify JWT before each request
- **Context:** Inject `tenantId` into request context
- **Resolvers:** Check tenant ownership before data access
- **Database:** PostgreSQL RLS policies (additional layer)

### 3. **Password Security**
- Hash with `bcrypt` (10 rounds minimum)
- Never store plaintext
- Use bcrypt.compare() for verification

### 4. **JWT Strategy**
```typescript
Access Token:  24 hours (short-lived, fast)
Refresh Token: 7 days (long-lived, secure storage)
```

---

## 📌 GraphQL Schema

### Query Root
```graphql
type Query {
  # Tenant operations
  me: Tenant
  getTenant(id: ID!): Tenant
  getAllTenants: [Tenant!]! @requiresAdmin
  
  # Booking operations
  getBookings(filters: BookingFilters): [Booking!]!
  getBooking(id: ID!): Booking
  getBookingsByDateRange(start: Date!, end: Date!): [Booking!]!
  getOccupancy(room: String, month: String): OccupancyReport!
  
  # Reports
  getRevenueReport(year: Int, month: Int): RevenueReport!
  getGuestStats: GuestStatistics!
}

type Mutation {
  # Auth
  register(input: RegisterInput!): AuthPayload!
  login(email: String!, password: String!): AuthPayload!
  logout: Boolean!
  refreshToken(refreshToken: String!): AuthPayload!
  
  # Tenant management
  updateTenant(input: UpdateTenantInput!): Tenant!
  updateSettings(input: SettingsInput!): Settings!
  
  # Booking management
  createBooking(input: BookingInput!): Booking!
  updateBooking(id: ID!, input: BookingInput!): Booking!
  deleteBooking(id: ID!): Boolean!
  bulkImportBookings(file: Upload!): [Booking!]!
  
  # Admin
  createAdminSubscription(tenantId: ID!, days: Int!): Subscription!
  cancelSubscription(tenantId: ID!): Boolean!
}

type Subscription {
  bookingCreated(tenantId: ID!): Booking!
  bookingUpdated(tenantId: ID!): Booking!
  bookingDeleted(tenantId: ID!): ID!
}
```

---

## 🚀 Implementation Phases

### Phase 1: Backend Foundation (NOW)
- [x] Analyze current setup
- [ ] Setup Express.js + Apollo Server
- [ ] Configure Prisma with PostgreSQL
- [ ] Create complete schema.prisma
- [ ] Implement authentication (register/login/JWT)
- [ ] Create core resolvers (Bookings, Tenants)
- [ ] Add validation & error handling
- [ ] Setup environment configuration

### Phase 2: Advanced Backend (Week 2)
- [ ] WebSocket subscriptions for real-time updates
- [ ] Audit logging system
- [ ] Payment processing integration
- [ ] CSV import/export
- [ ] Rate limiting & security hardening
- [ ] Database backups & recovery

### Phase 3: Frontend Integration (Week 3)
- [ ] Replace Apollo Client with proper configuration
- [ ] Implement authenticated requests
- [ ] Update queries/mutations
- [ ] Add error boundaries & retry logic
- [ ] Implement offline-first with Dexie sync
- [ ] Performance optimization

### Phase 4: Production Readiness (Week 4)
- [ ] Comprehensive testing (unit + integration)
- [ ] Security audit
- [ ] Performance testing & optimization
- [ ] Deployment configuration (Docker)
- [ ] CI/CD pipeline
- [ ] Documentation
- [ ] Monitoring & logging

---

## 📦 Dependencies

### Backend
```json
{
  "apollo-server-express": "^4.0.0",
  "express": "^4.18.0",
  "prisma": "^5.0.0",
  "@prisma/client": "^5.0.0",
  "jsonwebtoken": "^9.0.0",
  "bcryptjs": "^2.4.3",
  "graphql": "^16.0.0",
  "graphql-scalars": "^1.22.0",
  "joi": "^17.9.0",
  "pg": "^8.11.0",
  "cors": "^2.8.5",
  "dotenv": "^16.0.0"
}
```

### Frontend
```json
{
  "@apollo/client": "^4.0.0",
  "graphql": "^16.0.0",
  "@urql/core": "^4.0.0" (alternative)
}
```

---

## 🔧 Environment Variables

### Backend (.env)
```
# Database
DATABASE_URL=postgresql://user:password@host:5432/prohost

# Server
NODE_ENV=production
PORT=4000
GRAPHQL_PATH=/graphql

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=different-secret-key-min-32-chars
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# CORS
FRONTEND_URL=https://app.prohost.com

# Supabase (if using)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Frontend (.env)
```
VITE_GRAPHQL_URL=https://api.prohost.com/graphql
VITE_APP_NAME=ProHost
```

---

## ✅ Quality Checklist

- [ ] **Security**: No SQL injection, CSRF, XSS vulnerabilities
- [ ] **Performance**: GraphQL queries under 200ms
- [ ] **Reliability**: 99.5% uptime target
- [ ] **Scalability**: Handle 1000+ concurrent users
- [ ] **Compliance**: GDPR-ready (data export/deletion)
- [ ] **Documentation**: API docs, deployment guide
- [ ] **Testing**: >80% code coverage
- [ ] **Monitoring**: Error tracking, performance metrics

---

## 📞 Support & Deployment

**Deployment Options:**
1. Vercel + Supabase (recommended for quick start)
2. AWS Lambda + RDS
3. DigitalOcean + Managed PostgreSQL
4. Docker on any VPS

**Monitoring Stack:**
- Sentry for error tracking
- DataDog or New Relic for performance
- LogRocket for session replay

---

## 🎯 Success Metrics

1. **Performance**: API response time < 200ms (p95)
2. **Availability**: 99.9% uptime
3. **Security**: No critical vulnerabilities in audits
4. **User Experience**: Core workflows in <3 clicks
5. **Scalability**: Support 10,000+ bookings/month per tenant

