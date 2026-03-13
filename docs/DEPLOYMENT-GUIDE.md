# Vedaclue Deployment Guide

## How to Publish & Deploy Your App for Users

This guide covers 3 deployment paths — from quickest (15 minutes) to enterprise production.

---

## OPTION 1: Quickest — Railway (Recommended for MVP)

**Time: ~15 minutes | Cost: Free tier available | Best for: MVP / Beta launch**

Railway deploys your full stack (API + Database + Redis + Frontend) from one dashboard.

### Step 1: Push Code to GitHub

```bash
cd vedaclue
git init
git add .
git commit -m "Initial commit - Vedaclue v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vedaclue.git
git push -u origin main
```

### Step 2: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"

### Step 3: Deploy Database & Redis

1. Click "Add Service" -> "Database" -> PostgreSQL
2. Click "Add Service" -> "Database" -> Redis
3. Copy the DATABASE_URL and REDIS_URL from each service's Variables tab

### Step 4: Deploy Backend API

1. Click "Add Service" -> "GitHub Repo" -> Select your vedaclue repo
2. Set Root Directory: `src/server`
3. Set Build Command: `npx prisma generate && npm run build`
4. Set Start Command: `npm start`
5. Add environment variables:
   - DATABASE_URL (from step 3)
   - REDIS_URL (from step 3)
   - JWT_SECRET (generate: `openssl rand -hex 32`)
   - JWT_REFRESH_SECRET (generate: `openssl rand -hex 32`)
   - NODE_ENV=production
   - PORT=8000
6. Click Deploy

### Step 5: Run Database Migrations

In Railway's terminal for your API service:
```bash
npx prisma migrate deploy
npx prisma db seed
```

### Step 6: Deploy Frontend

1. Click "Add Service" -> "GitHub Repo" -> Same repo
2. Set Root Directory: `src/client`
3. Set Build Command: `npm run build`
4. Add env: VITE_API_URL = your API service URL from step 4
5. Click Deploy

### Step 7: Add Custom Domain

1. Go to your frontend service -> Settings -> Domains
2. Add your domain (e.g., vedaclue.com)
3. Update DNS: Add CNAME record pointing to Railway

Your app is now LIVE!

---

## OPTION 2: Render + Neon (Free Tier Friendly)

**Time: ~20 minutes | Cost: Free | Best for: Prototype / Demo**

### Step 1: Database (Neon - Free PostgreSQL)

1. Go to https://neon.tech -> Sign up
2. Create project "vedaclue"
3. Copy the connection string (DATABASE_URL)

### Step 2: Redis (Upstash - Free)

1. Go to https://upstash.com -> Sign up
2. Create Redis database
3. Copy the REDIS_URL

### Step 3: Deploy Backend on Render

1. Go to https://render.com -> Sign up with GitHub
2. Click "New" -> "Web Service"
3. Connect your GitHub repo
4. Settings:
   - Name: vedaclue-api
   - Root Directory: src/server
   - Build Command: npx prisma generate && npm run build
   - Start Command: npm start
   - Instance Type: Free
5. Add Environment Variables:
   - DATABASE_URL (from Neon)
   - REDIS_URL (from Upstash)
   - JWT_SECRET, JWT_REFRESH_SECRET
   - NODE_ENV=production
6. Click "Create Web Service"

### Step 4: Deploy Frontend on Render

1. Click "New" -> "Static Site"
2. Connect same repo
3. Settings:
   - Root Directory: src/client
   - Build Command: npm run build
   - Publish Directory: dist
4. Add env: VITE_API_URL = your API URL from step 3
5. Click "Create Static Site"

---

## OPTION 3: Production — AWS / DigitalOcean (Enterprise)

**Time: ~1-2 hours | Cost: Starting $12/month | Best for: Production launch**

### Architecture

```
Users -> CloudFlare CDN -> Nginx (Load Balancer)
                              |
                    +---------+---------+
                    |                   |
              React (S3/CDN)      Express API (EC2/App Platform)
                                       |
                              +--------+--------+
                              |                 |
                         PostgreSQL          Redis
                        (RDS/Managed)    (ElastiCache)
```

### DigitalOcean App Platform (Easier)

1. Go to https://cloud.digitalocean.com -> Create App
2. Connect GitHub repo
3. It auto-detects components:
   - API: src/server (Web Service, $5/mo)
   - Client: src/client (Static Site, free)
4. Add managed PostgreSQL ($15/mo) and Redis ($15/mo)
5. Set environment variables
6. Deploy

### AWS (Full Control)

```bash
# 1. Install AWS CLI and configure
aws configure

# 2. Create RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier vedaclue-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username vedaclue \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20

# 3. Create ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id vedaclue-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1

# 4. Deploy API on ECS or Elastic Beanstalk
# Using Docker:
aws ecr create-repository --repository-name vedaclue-api
docker build -f docker/Dockerfile.server -t vedaclue-api .
docker tag vedaclue-api:latest YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/vedaclue-api
docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/vedaclue-api

# 5. Deploy Frontend to S3 + CloudFront
cd src/client
npm run build
aws s3 sync dist/ s3://vedaclue-frontend --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## OPTION 4: Docker on VPS (Most Flexible)

**Time: ~30 min | Cost: $6-12/month | Best for: Full control**

### Step 1: Get a VPS

Choose any provider:
- DigitalOcean Droplet ($6/mo)
- Hetzner Cloud (EUR 4/mo)
- Vultr ($6/mo)
- Linode ($5/mo)

Select Ubuntu 24.04, minimum 2GB RAM.

### Step 2: Server Setup

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install nodejs -y

# Create app user
adduser vedaclue
usermod -aG docker vedaclue
su - vedaclue
```

### Step 3: Deploy

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/vedaclue.git
cd vedaclue

# Create environment file
cp env-example .env
nano .env  # Fill in all values

# Build and start
docker compose up -d --build

# Run migrations
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed

# Check status
docker compose ps
curl http://localhost:8000/api/health
```

### Step 4: SSL with Certbot

```bash
# Install Nginx and Certbot
apt install nginx certbot python3-certbot-nginx -y

# Create Nginx config
cat > /etc/nginx/sites-available/vedaclue << 'EOF'
server {
    server_name vedaclue.com www.vedaclue.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
EOF

ln -s /etc/nginx/sites-available/vedaclue /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Get SSL certificate (free!)
certbot --nginx -d vedaclue.com -d www.vedaclue.com
```

Your app is live at https://vedaclue.com with SSL!

---

## ESSENTIAL: Domain & DNS Setup

### Buy a Domain

- Namecheap: ~$9/year for .com
- Google Domains: ~$12/year
- Cloudflare Registrar: at-cost pricing

### DNS Configuration

Point your domain to your deployment:

| Type  | Name | Value |
|-------|------|-------|
| A     | @    | YOUR_SERVER_IP |
| CNAME | www  | vedaclue.com |
| CNAME | api  | vedaclue.com |

### CloudFlare CDN (Recommended)

1. Sign up at cloudflare.com (free plan)
2. Add your domain
3. Update nameservers at your registrar
4. Enable: SSL/TLS Full, Always HTTPS, Auto Minify

---

## ESSENTIAL: External Services Setup

### 1. Twilio (OTP/SMS)

```
1. Sign up at twilio.com
2. Get Account SID, Auth Token, Phone Number
3. Add to .env:
   TWILIO_ACCOUNT_SID=ACxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxx
   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### 2. SendGrid (Email)

```
1. Sign up at sendgrid.com (free: 100 emails/day)
2. Create API key
3. Add to .env:
   SENDGRID_API_KEY=SG.xxxxxxx
```

### 3. Razorpay (Payments - India)

```
1. Sign up at razorpay.com
2. Complete KYC verification
3. Get Key ID and Secret from Dashboard -> API Keys
4. Add to .env:
   RAZORPAY_KEY_ID=rzp_live_xxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxx
```

### 4. AWS S3 (File Uploads)

```
1. Create S3 bucket: vedaclue-uploads
2. Create IAM user with S3 access
3. Add to .env:
   AWS_S3_BUCKET=vedaclue-uploads
   AWS_ACCESS_KEY_ID=AKIAxxxxxxx
   AWS_SECRET_ACCESS_KEY=xxxxxxx
   AWS_REGION=ap-south-1
```

### 5. Sentry (Error Monitoring)

```
1. Sign up at sentry.io (free plan available)
2. Create Node.js project
3. Add to .env:
   SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## MOBILE APP: Make it Installable (PWA)

To make Vedaclue installable on phones without app stores:

### Add PWA Support

Create `src/client/public/manifest.json`:
```json
{
  "name": "Vedaclue",
  "short_name": "Vedaclue",
  "description": "Women's Health & Wellness",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#fff1f2",
  "theme_color": "#e11d48",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Users can then "Add to Home Screen" from their browser and it works like a native app!

### Native App (React Native)

For Google Play / Apple App Store:
1. Use the same API backend
2. Rebuild frontend with React Native or Expo
3. Publish to stores ($25 Google Play one-time, $99/year Apple)

---

## POST-DEPLOYMENT CHECKLIST

- [ ] Domain purchased and DNS configured
- [ ] SSL certificate active (HTTPS)
- [ ] Database backed up (daily cron)
- [ ] Environment variables secured
- [ ] Error monitoring (Sentry) configured
- [ ] Health check endpoints responding
- [ ] Rate limiting active
- [ ] CORS configured for your domain
- [ ] Twilio OTP working
- [ ] SendGrid emails working
- [ ] Razorpay payments tested (test mode first)
- [ ] Google Analytics / Mixpanel added
- [ ] Privacy Policy and Terms pages added
- [ ] GDPR/data export endpoint tested
- [ ] Performance tested (Lighthouse score > 90)
- [ ] Mobile responsive verified

---

## QUICK START RECOMMENDATION

For your first launch, I recommend:

**Railway (Option 1)** for the fastest path to live users.

Total cost for MVP:
- Railway Hobby Plan: $5/month
- Domain: ~$10/year
- Twilio: Pay-as-you-go (~$0.01/SMS)
- SendGrid: Free (100 emails/day)

That gets you a production-ready app for under $10/month!
