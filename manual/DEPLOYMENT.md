# Deployment Guide

Complete guide for deploying ProHost to production across different platforms.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Vercel + Supabase (Recommended)](#vercel--supabase-recommended)
3. [Railway](#railway)
4. [Docker](#docker)
5. [Traditional VPS](#traditional-vps)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Database migrations run (`bunx prisma db push`)
- [ ] SSL certificates ready
- [ ] CORS origins configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Backups scheduled
- [ ] Security audit completed
- [ ] Performance tested under load
 
---

## Vercel + Supabase (Recommended)

### 1. Setup Supabase Database

```bash
# Create Supabase project at supabase.com
# Get connection string and anon key
```

Create `.env.production` in `elysia-server/`:
```
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
NODE_ENV=production
PORT=4000
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-32>
FRONTEND_URL=https://yourdomain.com
```

### 2. Deploy Backend to Vercel

```bash
# Navigate to elysia-server
cd elysia-server

# Install Vercel CLI
npm i -g vercel

# Login to Vercel