# ⚡ Quick Start Checklist

Get ProHost running in 15 minutes!

## 🔧 Prerequisites
- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed OR Supabase account (free)
- [ ] Git installed
- [ ] Text editor (VS Code recommended)

---

## 📦 Backend Setup (5 minutes)

### 1. Install & Configure
```bash
cd prohost-server
npm install
cp .env.example .env
```

### 2. Edit `.env`
```bash
# If using local PostgreSQL:
DATABASE_URL="postgresql://postgres:password@localhost:5432/prohost"

# If using Supabase:
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"

# Generate secrets:
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# These are already in .env, just copy the values
```

### 3. Setup Database
```bash
npm run db:push        # Create tables
npm run db:seed        # Add demo data
```

✅ Database ready!

---

## 🎨 Frontend Setup (3 minutes)

### 1. Install Dependencies
```bash
cd ../
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

✅ Frontend ready!

---

## 🚀 Start Development (2 minutes)

### Terminal 1 - Backend
```bash
cd prohost-server
npm run dev
# ✅ Backend running at http://localhost:4000/graphql
```

### Terminal 2 - Frontend
```bash
npm run dev
# ✅ Frontend running at http://localhost:5173
```

---

## 🔐 Login & Test

### Demo Credentials
```
Email:    demo@prohost.local
Password: Demo@12345
```

### Admin Credentials (Super Admin)
```
Email:    admin@prohost.local
Password: Admin@12345
```

1. Open http://localhost:5173
2. Click "Create Account" or "Login"
3. Use credentials above
4. Create a booking
5. View calendar/list/reports

---

## 🧪 Test GraphQL API

Open http://localhost:4000/graphql (Apollo Playground)

### Test Query
```graphql
query {
  me {
    id
    name
    email
    bookingsCount
  }
}
```

**Required:** Add `Authorization` header in GraphQL Playground:
```
Authorization: Bearer <token-from-login>
```

---

## 🐛 Common Issues & Fixes

### "Port 4000 already in use"
```bash
# Kill process on port 4000
lsof -i :4000
kill -9 <PID>

# Or use different port
PORT=4001 npm run dev
```

### "Database connection error"
```bash
# Verify PostgreSQL is running
psql --version

# Test your connection string
psql $DATABASE_URL

# Or use Supabase instead (no local setup needed)
```

### "GraphQL query says 'Not authenticated'"
- Make sure you logged in first
- Check GraphQL Playground for Authorization header
- Token should be: `Bearer <your-token-from-login>`

### ".env file errors"
```bash
# Regenerate secrets
openssl rand -base64 32

# Update .env
nano prohost-server/.env
```

---

## ✨ What Works Out of the Box

✅ **User Management**
- Register new account
- Login with email/password
- Auto-generated JWT tokens
- Logout

✅ **Booking Management**
- Create bookings
- Edit bookings
- Delete bookings
- View booking lists
- Filter by status, room, date

✅ **Reports**
- Revenue reports (monthly/annual)
- Occupancy reports
- Guest statistics

✅ **Settings**
- Update tenant info
- Customize night price
- Manage rooms
- Change language/currency

---

## 📊 Database Includes Pre-Loaded Data

From `npm run db:seed`:

**Admin Tenant:**
- Name: ProHost Admin
- Email: admin@prohost.local
- 5 pre-configured rooms (A1-A5)

**Demo Tenant:**
- Name: Demo Workspace
- Email: demo@prohost.local
- 5 pre-configured rooms (101-202)
- 1 sample booking (for testing)

---

## 📚 Where to Go Next

1. **Read Docs:**
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
   - [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) - Frontend integration
   - [prohost-server/README.md](./prohost-server/README.md) - Backend API

2. **Explore Code:**
   - Backend resolvers: `prohost-server/src/resolvers/`
   - Frontend hooks: `src/hooks/useGraphQL.ts`
   - GraphQL schema: `prohost-server/src/schema/typeDefs.ts`

3. **Deploy:**
   - Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
   - Vercel (simplest)
   - Railway (recommended)
   - Docker (self-hosted)

---

## 🎯 Next Steps (Optional)

### Add Payment Processing
```bash
npm install stripe
# See FRONTEND_GUIDE.md for integration
```

### Add Email Notifications
```bash
npm install nodemailer
# Configure SMTP in .env
```

### Add Monitoring
```bash
npm install @sentry/node
# Set SENTRY_DSN in environment
```

### Deploy to Production
```bash
npm run build
# See DEPLOYMENT.md for options
```

---

## ✅ Verification Checklist

- [ ] Backend running on port 4000
- [ ] Frontend running on port 5173
- [ ] Can login with demo credentials
- [ ] GraphQL playground responds
- [ ] Can create a booking
- [ ] Can view bookings list
- [ ] Reports page loads
- [ ] No console errors

---

## 💬 Need Help?

1. Check [TROUBLESHOOTING.md](#) in relevant README
2. Review error messages carefully
3. Check logs: `npm run dev` shows errors
4. Verify .env files are correct
5. Ensure ports aren't in use

---

## 🎉 You're Ready!

ProHost is running and ready for development!

**Next Features to Build:**
- [ ] Payment integration
- [ ] Email notifications  
- [ ] SMS alerts
- [ ] CSV import/export
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Channel manager integration

---

**Time to complete:** ~15 minutes  
**Difficulty:** Beginner-friendly ✓  
**Support:** Check README.md files in each folder

Happy hacking! 🚀
