# Free Deployment: Vercel + Supabase

Complete step-by-step guide to deploy your booking app **completely FREE** using Vercel (Frontend + Backend) and Supabase (Database).

## Prerequisites

- GitHub account (free)
- Vercel account (free, sign up with GitHub)
- Supabase account (free, sign up with GitHub)
- Node.js 18+ installed locally

---

## Step 1: Setup Supabase Database (FREE)

### 1.1 Create Supabase Project

```bash
# Go to https://supabase.com
# Click "Start your project" → Sign up with GitHub

# Create new project:
# - Project name: "prohost"
# - Region: Choose nearest to you
# - Password: Generate strong password
# - Click "Create new project"
```

### 1.2 Get Database Connection String

```bash
# In Supabase dashboard:
# 1. Go to Settings → Database
# 2. Copy "Connection string" (URI format)
# 3. Looks like: postgresql://postgres:[PASSWORD]@db.[REGION].supabase.co:5432/postgres
```

### 1.3 Run Database Migrations

```bash
# Set environment variable
export DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[REGION].supabase.co:5432/postgres"

# Navigate to backend
cd prohost-server

# Install dependencies
npm install

# Run migrations
npm run db:push

# Seed demo data (optional)
npm run db:seed

echo "✅ Database setup complete!"
```

---

## Step 2: Deploy Backend to Vercel (FREE)

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.2 Create vercel.json for Backend

```bash
cd prohost-server

cat > vercel.json << 'EOF'
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "dist/index.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
EOF
```

### 2.3 Login to Vercel

```bash
# First time only
vercel login

# You'll be prompted to create/authorize
# Authenticate with GitHub
```

### 2.4 Deploy Backend

```bash
# Deploy to preview first (optional)
vercel

# Deploy to production
vercel --prod

# You'll get a URL like: https://prohost-server-abc123.vercel.app
# Save this URL!
```

### 2.5 Set Environment Variables in Vercel

```bash
# Via CLI:
vercel env add DATABASE_URL "postgresql://postgres:[PASSWORD]@db.[REGION].supabase.co:5432/postgres"
vercel env add JWT_SECRET "$(openssl rand -base64 32)"
vercel env add JWT_REFRESH_SECRET "$(openssl rand -base64 32)"
vercel env add NODE_ENV "production"
vercel env add FRONTEND_URL "https://yourdomain.com"  # Update after frontend deploy

# Or via Vercel Dashboard:
# 1. Go to vercel.com → Select your project
# 2. Go to Settings → Environment Variables
# 3. Add each variable
```

### 2.6 Redeploy with Environment Variables

```bash
# Redeploy so env vars take effect
vercel --prod

echo "✅ Backend deployed!"
```

---

## Step 3: Deploy Frontend to Vercel (FREE)

### 3.1 Update Frontend Configuration

```bash
cd ..  # Go back to root

# Create .env.production
cat > .env.production << 'EOF'
VITE_GRAPHQL_URL=https://your-backend-url.vercel.app/graphql
EOF

# Replace with your actual backend URL from Step 2.4
# Example: https://prohost-server-xyz.vercel.app/graphql
```

### 3.2 Build Frontend

```bash
npm run build

# Should output dist folder with ~976 KB size
# Distribution ready to deploy
```

### 3.3 Deploy Frontend

```bash
# From project root
vercel --prod

# Get frontend URL like: https://booking-app-v1.vercel.app
# Save this URL!
```

### 3.4 Link Frontend URL to Backend

```bash
# Update backend environment variable with frontend URL
cd prohost-server

vercel env add FRONTEND_URL "https://your-frontend-url.vercel.app"

# Redeploy backend
vercel --prod

cd ..
```

---

## Step 4: Setup Custom Domain (Optional)

### 4.1 Frontend Custom Domain

```bash
# In Vercel Dashboard:
# 1. Select frontend project
# 2. Go to Settings → Domains
# 3. Add your domain (e.g., booking.yourdomain.com)
# 4. Update DNS records as shown
```

### 4.2 Backend Custom Domain

```bash
# In Vercel Dashboard:
# 1. Select backend project
# 2. Go to Settings → Domains
# 3. Add your domain (e.g., api.yourdomain.com)
# 4. Update DNS records as shown
```

---

## Step 5: Verify Deployment

### 5.1 Check Backend Health

```bash
# Replace with your backend URL
curl https://your-backend-url.vercel.app/health

# Should return:
# {"status":"ok","timestamp":"2026-02-28T..."}
```

### 5.2 Check GraphQL Endpoint

```bash
curl -X POST https://your-backend-url.vercel.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Should return GraphQL schema info
```

### 5.3 Test Frontend

```bash
# Open in browser:
https://your-frontend-url.vercel.app

# Should load booking app
# Try to login with demo credentials
```

---

## Step 6: Post-Deployment Configuration

### 6.1 Update CORS Settings

In `prohost-server/src/index.ts`, update CORS origin:

```typescript
const corsOrigin = process.env.NODE_ENV === 'development'
    ? /^http:\/\/localhost:\d{4,5}$/
    : process.env.FRONTEND_URL;  // Now uses your deployed frontend
```

Then rebuild and redeploy:

```bash
cd prohost-server
npm run build
vercel --prod
```

### 6.2 Enable Database Backups (Supabase)

```bash
# In Supabase Dashboard:
# 1. Go to Settings → Backups
# 2. Enable automated backups
# 3. Daily backups are FREE
```

---

## 📊 Free Tier Limits & Usage

| Resource | Free Limit | Your Usage (15 users) | Status |
|----------|------------|----------------------|--------|
| **Vercel Functions** | 100K invocations/mo | ~500 req/mo | ✅ 99% unused |
| **Vercel Bandwidth** | 100GB/mo | ~10MB/mo | ✅ 99% unused |
| **Supabase Storage** | 500MB | ~50MB | ✅ 90% unused |
| **Supabase Bandwidth** | 2GB/mo | ~100MB/mo | ✅ 95% unused |
| **Supabase Rows** | Unlimited | ~5K rows | ✅ Fine |

**Result:** Everything easily fits in FREE tier! ✅

---

## 🔄 Updating Your App

### Deploy New Backend Changes

```bash
cd prohost-server
npm run build
vercel --prod
```

### Deploy New Frontend Changes

```bash
cd ..
npm run build
vercel --prod
```

### Update Database Schema

```bash
# Make changes to prisma/schema.prisma

cd prohost-server

# Create migration
npm run db:migrate -- --name description_of_change

# Push to production Supabase
npm run db:push

# Redeploy if schema changed
vercel --prod
```

---

## ⚠️ Troubleshooting

### Backend Not Connecting to Database

```bash
# Verify connection string
curl https://your-backend-url.vercel.app/health

# Check Vercel logs
vercel logs https://your-backend-url.vercel.app --prod

# Verify Supabase connection string is correct
# Format: postgresql://postgres:PASSWORD@db.REGION.supabase.co:5432/postgres
```

### CORS Errors

```bash
# Update FRONTEND_URL env variable
vercel env add FRONTEND_URL "https://your-actual-frontend-url.vercel.app"

# Rebuild and redeploy
vercel --prod
```

### Frontend Can't Connect to Backend

```bash
# Update .env.production with correct backend URL
cat .env.production

# Should show: VITE_GRAPHQL_URL=https://your-backend-url.vercel.app/graphql

# Rebuild
npm run build

# Redeploy
vercel --prod
```

---

## 📈 When to Upgrade (Scale Later)

| Scenario | Solution | Cost |
|----------|----------|------|
| >100 concurrent users | Supabase Pro | $25/mo |
| >500K API calls/month | Vercel Pro | $20/mo |
| Custom domain + more features | Both Pro | $45/mo |

**Your plan:** Stay on FREE for months 1-3, upgrade only if needed!

---

## ✅ Quick Checklist

- [ ] Created Supabase project
- [ ] Got DATABASE_URL connection string
- [ ] Ran database migrations (`npm run db:push`)
- [ ] Installed Vercel CLI
- [ ] Deployed backend to Vercel (`vercel --prod`)
- [ ] Set backend environment variables
- [ ] Updated .env.production with backend URL
- [ ] Deployed frontend to Vercel (`vercel --prod`)
- [ ] Updated backend FRONTEND_URL env var
- [ ] Tested both health endpoints
- [ ] Verified app loads in browser
- [ ] Set up custom domain (optional)
- [ ] Enabled Supabase backups

---

## 💬 Need Help?

**Discord Communities:**
- Vercel: https://discord.gg/vercel
- Supabase: https://discord.supabase.com

**Documentation:**
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Apollo GraphQL: https://www.apollographql.com/docs

---

**Total Cost: $0/month** ✅
**Setup Time: ~20 minutes** ✅
**Ready for 15+ users: Yes!** ✅
