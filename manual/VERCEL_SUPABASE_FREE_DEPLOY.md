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