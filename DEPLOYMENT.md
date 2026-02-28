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

- [ ] All tests pass (`npm test`)
- [ ] Environment variables configured
- [ ] Database migrations run (`npm run db:migrate`)
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

Create `.env.production` in `prohost-server/`:
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
# Navigate to prohost-server
cd prohost-server

# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# Or via CLI:
vercel env pull .env.production.local
```

### 3. Deploy Frontend to Vercel

```bash
cd ../

# Update .env.production
VITE_GRAPHQL_URL=https://your-backend.vercel.app/graphql

# Build
npm run build

# Deploy
vercel --prod
```

### 4. Configure Custom Domain

In Vercel dashboard:
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

---

## Railway

Fast and simple deployment platform.

### 1. Backend Deployment

```bash
# Install Railway CLI
npm i -g @railway/cli

# Navigate to backend
cd prohost-server

# Login
railway login

# Link to Railway project (or create new)
railway init

# Configure environment
railway variable add DATABASE_URL "postgresql://..."
railway variable add JWT_SECRET "$(openssl rand -base64 32)"
railway variable add FRONTEND_URL "https://yourdomain.com"

# Deploy
railway up
```

### 2. Database Setup

```bash
# Add PostgreSQL plugin in Railway dashboard
# or use Supabase external connection

railway variable add DATABASE_URL "postgresql://..."
```

### 3. Frontend Deployment

```bash
cd ../

# Create railway.json
cat > railway.json << EOF
{
  "buildCommand": "npm run build",
  "startCommand": "npm run preview"
}
EOF

# Deploy
railway up
```

---

## Docker

Self-hosted containerized deployment.

### 1. Create Docker Images

**Backend Dockerfile:**
```dockerfile
# prohost-server/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --only=production && npx prisma generate

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Build
RUN npm run build

# Expose port
EXPOSE 4000

# Start server
CMD ["npm", "start"]
```

**Frontend Dockerfile:**
```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: prohost
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: prohost
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./prohost-server
    environment:
      DATABASE_URL: postgresql://prohost:${DB_PASSWORD}@postgres:5432/prohost
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      NODE_ENV: production
      FRONTEND_URL: https://yourdomain.com
    ports:
      - "4000:4000"
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build: .
    environment:
      VITE_GRAPHQL_URL: https://api.yourdomain.com/graphql
    ports:
      - "80:80"
    REST_UNTIL_stopped: unless-stopped

volumes:
  postgres_data:
```

### 3. Deploy

```bash
# Build images
docker-compose build

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Traditional VPS

Deploy to AWS EC2, DigitalOcean, Linode, etc.

### 1. Setup Server

```bash
# SSH into server
ssh root@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx (reverse proxy)
sudo apt install nginx -y

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 2. Configure PostgreSQL

```bash
sudo -u postgres psql

# Create database
CREATE DATABASE prohost;
CREATE USER prohost WITH PASSWORD 'secure-password';
ALTER ROLE prohost CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE prohost TO prohost;
\q
```

### 3. Deploy Backend

```bash
# Clone repository
cd /var/www
sudo git clone <your-repo-url> prohost

# Setup backend
cd prohost/prohost-server
sudo npm install
sudo npm run db:push

# Create .env
sudo cp .env.example .env
# Edit .env with production values
sudo nano .env

# Start with PM2
sudo pm2 start npm --name "prohost-api" -- start
sudo pm2 startup
sudo pm2 save
```

### 4. Deploy Frontend

```bash
cd /var/www/prohost
npm run build

# Copy to web root
sudo cp -r dist/* /var/www/html/
```

### 5. Configure Nginx

```nginx
# /etc/nginx/sites-available/prohost
upstream backend {
    server localhost:4000;
}

server {
    listen 80;
    server_name yourdomain.com;

    location /graphql {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/html;
        try_files $uri /index.html;
    }

    # SSL configuration (using Let's Encrypt)
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 6. Enable HTTPS

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --nginx -d yourdomain.com
sudo systemctl reload nginx
```

### 7. Verify Deployment

```bash
# Check backend
curl http://localhost:4000/health

# Check Nginx
sudo systemctl status nginx

# Check PM2
pm2 monit
```

---

## Monitoring & Maintenance

### 1. Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/node @sentry/tracing

# Configure in backend
// prohost-server/src/index.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 2. Performance Monitoring (DataDog)

```bash
npm install dd-trace

# Start with tracing
NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-bundle.crt node -r dd-trace/init index.js
```

### 3. Logging

```bash
# Configure logging
mkdir -p /var/log/prohost

# Rotate logs
sudo tee /etc/logrotate.d/prohost << EOF
/var/log/prohost/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 prohost prohost
    sharedscripts
}
EOF
```

### 4. Backups

**Daily Backup Script:**
```bash
#!/bin/bash
# /usr/local/bin/backup-prohost.sh

BACKUP_DIR="/backups/prohost"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

Schedule with cron:
```bash
crontab -e
0 2 * * * /usr/local/bin/backup-prohost.sh
```

### 5. Health Checks

```bash
#!/bin/bash
# /usr/local/bin/health-check.sh

curl -f http://localhost:4000/health || {
    systemctl restart prohost-backend
}
```

---

## Troubleshooting

### Backend won't start
```bash
npm run db:push
pm2 logs prohost-api
```

### Database connection failed
```bash
# Test connection
psql $DATABASE_URL

# Check environment variables
printenv | grep DATABASE_URL
```

### High memory usage
```bash
pm2 monit
pm2 delete prohost-api
pm2 start npm --name "prohost-api" -- start --max_memory_restart 1G
```

### SSL certificate errors
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## Production Checklist

- [ ] HTTPS enabled with valid SSL
- [ ] Environment variables set correctly
- [ ] Database backed up
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring enabled (DataDog/New Relic)
- [ ] Rate limiting active
- [ ] CORS properly configured
- [ ] Logs aggregated and rotated
- [ ] Auto-scaling configured
- [ ] Disaster recovery plan documented

