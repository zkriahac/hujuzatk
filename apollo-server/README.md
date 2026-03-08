# Hujuzatk Server - GraphQL API

Production-grade booking management system backend built with Apollo Server, Prisma, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 14+ (local or Supabase)
- **npm** or **yarn**

### 1. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Generate: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` - Generate: `openssl rand -base64 32`
- `FRONTEND_URL` - Your frontend URL (for CORS)

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
# Create database schema
npm run db:push

# (Optional) Run migrations with versioning
npm run db:migrate

# Seed demo data (admin + demo tenant)
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:4000/graphql`

### 5. Access GraphQL Playground

- **GraphQL IDE**: http://localhost:4000/graphql
- **Login**: Use credentials from seed output

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│     Apollo Server (Express.js)          │
│  - Type-safe GraphQL resolvers          │
│  - JWT authentication middleware        │
│  - Multi-tenant context injection       │
│  - Audit logging                        │
└────────────┬────────────────────────────┘
             │ SQL (Prisma ORM)
┌────────────▼────────────────────────────┐
│     PostgreSQL Database                 │
│  - 7 core tables                        │
│  - Automatic migrations                 │
│  - Row-level security (RLS)             │
└─────────────────────────────────────────┘
```

## 🔐 Authentication Flow

### Register
```graphql
mutation {
  register(input: {
    email: "user@example.com"
    name: "John Doe"
    password: "SecurePassword123"
    currency: "OMR"
    timezone: "Asia/Muscat"
    language: "en"
  }) {
    token
    refreshToken
    tenant {
      id
      name
      email
    }
  }
}
```

### Login
```graphql
mutation {
  login(email: "user@example.com", password: "SecurePassword123") {
    token
    refreshToken
    tenant {
      id
      name
      email
    }
  }
}
```

### Using Token in Requests
```
Authorization: Bearer <your-jwt-token>
```

## 📚 Core GraphQL Operations

### Get Current User
```graphql
query {
  me {
    id
    name
    email
    subscriptionStatus
    validUntil
    rooms {
      id
      name
    }
    settings {
      defaultNightPrice
      defaultTax
    }
  }
}
```

### Create Booking
```graphql
mutation {
  createBooking(input: {
    guestName: "Ahmed Al-Mazrouei"
    guestEmail: "ahmed@example.com"
    guestPhone: "+96891234567"
    city: "Muscat"
    room: "A1"
    checkIn: "2026-03-15T14:00:00Z"
    checkOut: "2026-03-18T12:00:00Z"
    nightPrice: 150
    deposit: 300
    notes: "Airport pickup needed"
  }) {
    id
    guestName
    totalPrice
    status
  }
}
```

### Get Bookings with Filters
```graphql
query {
  getBookings(
    filter: {
      status: UPCOMING
      room: "A1"
      startDate: "2026-03-01T00:00:00Z"
      endDate: "2026-03-31T23:59:59Z"
    }
    limit: 50
    offset: 0
    sortBy: "checkIn"
    sortOrder: "asc"
  ) {
    id
    guestName
    room
    checkIn
    checkOut
    nights
    nightPrice
    totalPrice
    deposit
    remaining
    status
  }
}
```

### Revenue Report
```graphql
query {
  getRevenueReport(year: 2026, month: 3) {
    year
    month
    totalRevenue
    totalDeposits
    totalOutstanding
    bookingCount
    averageBookingValue
  }
}
```

### Guest Statistics
```graphql
query {
  getGuestStatistics {
    totalGuests
    uniqueCities
    averageNightStay
    repeatGuestRate
    cancellationRate
  }
}
```

## 🛠️ Development Commands

```bash
# Watch mode (auto-reload on file changes)
npm run dev

# Build TypeScript
npm run build

# Start production build
npm start

# Open Prisma Studio (visual database explorer)
npm run studio

# Create new migration
npm run db:migrate

# Seed database
npm run db:seed

# Generate Prisma client
npm run db:generate
```

## 🗄️ Database Schema

### Tables
1. **Tenant** - SaaS customers with multi-tenant isolation
2. **TenantSettings** - Per-tenant customization
3. **Booking** - Guest reservations
4. **AuditLog** - Compliance & security tracking
5. **Payment** - Billing & subscription records
6. **GlobalSettings** - Platform-wide configuration

See `prisma/schema.prisma` for full schema definition.

## 🔒 Security Features

✅ **JWT Authentication**
- Access tokens (24h expiry)
- Refresh tokens (7d expiry)
- Secure token rotation

✅ **Password Security**
- bcryptjs hashing (10 rounds)
- No plaintext storage

✅ **Multi-Tenancy**
- Automatic tenant isolation
- No cross-tenant data access
- TenantId injection in all queries

✅ **Audit Logging**
- Track all mutations
- Record changes for compliance
- User action history

✅ **CORS Protection**
- Configurable allowed origins
- Credentials verification

## 📤 Deployment

### Option 1: Railway (Recommended for Quick Start)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway init

# Deploy
railway up
```

### Option 2: Vercel + Supabase

1. Push code to GitHub
2. Deploy backend to Vercel
3. Store database on Supabase
4. Update `DATABASE_URL` in environment

### Option 3: Docker

```bash
docker build -t prohost-server .
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  prohost-server
```

### Environment Variables (Production)

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://prod-db
JWT_SECRET=your-production-secret-min-32-chars
JWT_REFRESH_SECRET=your-production-refresh-secret
FRONTEND_URL=https://app.yourdomain.com
LOG_LEVEL=warn
```

## 🧪 Testing

### Test GraphQL Query
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ health }"}'
```

### Expected Response
```json
{
  "data": {
    "health": "ok"
  }
}
```

## 📋 API Documentation

### GraphQL Schema
- Full schema available at `http://localhost:4000/graphql` (Playground)
- Introspection enabled in development
- Full schema docs in the playground

### Error Handling

All errors follow this format:
```json
{
  "errors": [
    {
      "message": "User-friendly error message",
      "code": "AUTHENTICATION_ERROR",
      "path": ["queryName"]
    }
  ]
}
```

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check connection string
echo $DATABASE_URL

# Verify PostgreSQL is running
psql postgresql://user:password@localhost:5432/dbname
```

### JWT Token Errors
```bash
# Generate new secrets
openssl rand -base64 32

# Update .env file
JWT_SECRET=<new-secret>
JWT_REFRESH_SECRET=<new-secret>
```

### Port Already in Use
```bash
# Change port in .env
PORT=4001

# Or kill process
lsof -i :4000
kill -9 <PID>
```

## 📞 Support & Resources

- **GraphQL Docs**: https://graphql.org/learn
- **Prisma ORM**: https://www.prisma.io/docs
- **Apollo Server**: https://www.apollographql.com/docs
- **PostgreSQL**: https://www.postgresql.org/docs

## 📄 License

MIT
