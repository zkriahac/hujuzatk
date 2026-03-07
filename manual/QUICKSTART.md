# ⚡ Quick Start Checklist

Get ProHost running in 15 minutes!

## 🔧 Prerequisites
- [ ] Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- [ ] PostgreSQL installed OR Supabase account (free)
- [ ] Git installed
- [ ] Text editor (VS Code recommended)

---

## 📦 Backend Setup (5 minutes)

### 1. Install & Configure
```bash
cd elysia-server
bun install
cp .env.example .env   # or copy from prohost-server/.env.example
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

NODE_ENV=development
PORT=4000
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
TRIAL_DAYS=14
```

### 3. Setup Database
```bash
bunx prisma db push    # Create tables
bunx prisma db seed    # Add demo data (optional)
```

### 4. Start the Server
```bash
bun run dev
```

Server runs at `http://localhost:4000` — GraphQL playground at `http://localhost:4000/graphql`

✅ Backend ready!

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