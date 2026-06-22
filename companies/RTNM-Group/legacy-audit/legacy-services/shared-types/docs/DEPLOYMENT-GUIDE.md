# Deployment Guide

> **Complete guide to deploying all ReZ QR systems**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deploy Order](#deploy-order)
3. [Backend Services](#backend-services)
4. [Frontend Applications](#frontend-applications)
5. [Database Setup](#database-setup)
6. [Configuration](#configuration)
7. [Post-Deployment](#post-deployment)
8. [Monitoring](#monitoring)
9. [Rollback](#rollback)

---

## Prerequisites

### Required Accounts

- [ ] Vercel account (for frontend)
- [ ] Supabase account (database)
- [ ] MongoDB Atlas account (services)
- [ ] Razorpay account (payments)
- [ ] Domain configured (optional)

### Required Tools

```bash
# Install CLI tools
npm install -g vercel
npm install -g @supabase/cli
npm install -g typescript

# Verify installations
vercel --version
supabase --version
```

### System Requirements

- Node.js 18+
- npm 9+
- Git configured
- SSH access to repositories

---

## Deploy Order

Deploy services in this order to ensure dependencies are available:

```
1. Supabase Database (schema migrations)
2. MongoDB Atlas (if using local services)
3. Backend Services
   3.1 ReZ Auth Service
   3.2 ReZ Wallet Service
   3.3 ReZ Payment Service
   3.4 ReZ Merchant Service
   3.5 ReZ Intent Graph
4. Frontend Applications
   4.1 rez-now
   4.2 Hotel OTA
   4.3 adBazaar
   4.4 adsqr
5. Health Check Verification
```

---

## Database Setup

### Supabase

1. **Create Project**
   ```bash
   # Login to Supabase
   supabase login

   # Link to project
   supabase link --project-ref your-project-ref
   ```

2. **Run Migrations**

   For AdBazaar:
   ```bash
   cd adBazaar
   supabase db push
   ```

   For all apps, run migrations from respective `supabase/migrations/` folders.

3. **Verify Tables**
   ```bash
   supabase db stats
   ```

### MongoDB Atlas

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create free cluster (M0)
   - Choose region closest to users

2. **Create Database User**
   ```bash
   # In Atlas dashboard
   Security > Database Access > Add New User
   ```

3. **Whitelist IPs**
   ```bash
   # In Atlas dashboard
   Security > Network Access > Add IP
   # Add: 0.0.0.0/0 (for development) or specific IPs
   ```

4. **Get Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/rez
   ```

---

## Backend Services

### ReZ Auth Service

1. **Setup**
   ```bash
   cd services/rez-auth-service
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Deploy to Render/Railway**
   ```bash
   # Option A: Render
   # Connect GitHub repo in Render dashboard
   # Set build command: npm install && npm run build
   # Set start command: npm start

   # Option B: Railway
   railway init
   railway up
   ```

4. **Verify**
   ```bash
   curl https://your-auth-service.railway.app/api/health
   ```

### ReZ Wallet Service

1. **Setup**
   ```bash
   cd services/rez-wallet-service
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Add MongoDB URI
   # Add Supabase credentials
   ```

3. **Deploy**
   ```bash
   # Connect to Render/Railway
   # Same steps as Auth Service
   ```

### ReZ Payment Service

1. **Setup**
   ```bash
   cd services/rez-payment-service
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Add Razorpay keys (LIVE version)
   # Add MongoDB URI
   ```

3. **Configure Razorpay Webhook**
   ```bash
   # In Razorpay Dashboard
   Settings > Webhooks > Add Webhook
   URL: https://your-payment-service.com/api/webhooks/razorpay
   Events: payment.captured, payment.failed
   Secret: Generate and add to environment
   ```

4. **Deploy**
   ```bash
   # Same as other services
   ```

### ReZ Merchant Service

1. **Setup**
   ```bash
   cd services/rez-merchant-service
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Add MongoDB URI
   # Add Supabase credentials
   ```

3. **Deploy**
   ```bash
   # Same as other services
   ```

---

## Frontend Applications

### rez-now

1. **Setup**
   ```bash
   cd rez-now
   ```

2. **Configure Environment**
   Create `.env.production`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=https://reznow.yourdomain.com

   REZ_AUTH_URL=https://rez-auth.yourdomain.com
   REZ_WALLET_URL=https://rez-wallet.yourdomain.com
   REZ_PAYMENT_URL=https://rez-payment.yourdomain.com
   ```

3. **Deploy to Vercel**
   ```bash
   # Login
   vercel login

   # Deploy
   vercel --prod

   # Or link and deploy
   vercel link
   vercel --prod
   ```

4. **Configure Domain**
   - In Vercel Dashboard
   - Domains > Add `reznow.yourdomain.com`

### Hotel OTA

1. **Setup**
   ```bash
   cd "Hotel OTA"
   ```

2. **Configure Environment**
   Create `.env.production`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=https://hotel.yourdomain.com

   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_your-key-id
   RAZORPAY_KEY_SECRET=your-live-secret

   MAKCORPS_API_KEY=your-makcorps-key

   REZ_AUTH_URL=https://rez-auth.yourdomain.com
   REZ_WALLET_URL=https://rez-wallet.yourdomain.com
   REZ_PAYMENT_URL=https://rez-payment.yourdomain.com
   REZ_MERCHANT_URL=https://rez-merchant.yourdomain.com
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### adBazaar

1. **Setup**
   ```bash
   cd adBazaar
   ```

2. **Configure Environment**
   Create `.env.production`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=https://adbazaar.yourdomain.com

   REZ_WALLET_URL=https://rez-wallet.yourdomain.com
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### adsqr

1. **Setup**
   ```bash
   cd adsqr
   ```

2. **Configure Environment**
   Create `.env.production`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=https://adsqr.yourdomain.com

   REZ_WALLET_URL=https://rez-wallet.yourdomain.com
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

---

## Configuration

### DNS Configuration

Add these DNS records:

| Type | Name | Value |
|------|------|-------|
| CNAME | reznow | cname.vercel-dns.com |
| CNAME | hotel | cname.vercel-dns.com |
| CNAME | adbazaar | cname.vercel-dns.com |
| CNAME | adsqr | cname.vercel-dns.com |
| CNAME | api | your-backend-service.railway.app |

### CORS Configuration

Update backend services to allow frontend domains:

```javascript
// In your backend
const corsOptions = {
  origin: [
    'https://reznow.yourdomain.com',
    'https://hotel.yourdomain.com',
    'https://adbazaar.yourdomain.com',
    'https://adsqr.yourdomain.com',
  ],
  credentials: true,
};
```

---

## Post-Deployment

### 1. Verify Health

```bash
# Run health checks
npx tsx scripts/health-check.ts

# Expected output
Overall Status: HEALTHY
```

### 2. Run Integration Tests

```bash
# Test all QR flows
npx tsx scripts/test-qr-integration.ts

# Expected output
Room QR Flow: PASS (5/5 tests)
Menu QR Flow: PASS (5/5 tests)
Rez Now Flow: PASS (4/4 tests)
Ads QR Flow:  PASS (4/4 tests)
```

### 3. Verify QR Codes

Test each QR type:
- [ ] Room QR - Scan and request service
- [ ] Menu QR - Scan and view menu
- [ ] Rez Now - Scan and view profile
- [ ] Ads QR - Scan and view campaign

### 4. Verify Payments

- [ ] Test payment with test card
- [ ] Verify webhook received
- [ ] Check balance updated

### 5. Configure SSL

Vercel provides automatic SSL. For custom domains:
```bash
# In Vercel Dashboard
Domains > Your Domain > SSL Certificate
```

---

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard:
```
Analytics > Enable Analytics
```

### Uptime Monitoring

Set up with UptimeRobot or similar:

```
https://reznow.yourdomain.com/api/health
https://hotel.yourdomain.com/api/health
https://adbazaar.yourdomain.com/api/health
```

### Log Aggregation

Enable in Vercel:
```bash
# In project settings
Logs > Enable
```

### Health Check Cron

Add to monitoring service:

```bash
# Every 5 minutes
*/5 * * * * curl https://reznow.yourdomain.com/api/health
```

---

## Rollback

### Frontend (Vercel)

```bash
# List deployments
vercel list

# Rollback to previous
vercel rollback [deployment-url]

# Or via dashboard
# Deployments > Select deployment > Actions > Promote to Production
```

### Backend (Render/Railway)

```bash
# Render
# Dashboard > Service > Deployments > Select > Redeploy

# Railway
# Dashboard > Service > Deployments > Select > Rollback
```

### Database

If schema changes needed:
```bash
# Revert migration
supabase db reset --db-url=postgresql://...

# Or manually in Supabase SQL Editor
DROP TABLE IF EXISTS table_name;
```

---

## Security Checklist

Before going live:

- [ ] All `.env` files contain production keys
- [ ] Razorpay in live mode
- [ ] CORS restricted to production domains
- [ ] Rate limiting enabled
- [ ] SSL certificates valid
- [ ] Database access restricted to app IPs
- [ ] No debug logs in production
- [ ] Error pages customized

---

## Performance Checklist

- [ ] Enable Vercel Analytics
- [ ] Enable caching headers
- [ ] Optimize images
- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Monitor Core Web Vitals

---

## Troubleshooting

### Common Issues

**CORS Error**
```javascript
// Check backend CORS config
// Add your domain to allowed origins
```

**Database Connection Failed**
```bash
# Verify MongoDB URI
# Check IP whitelist in Atlas
# Test connection locally
```

**Payment Not Working**
```bash
# Verify Razorpay keys (live vs test)
# Check webhook URL is accessible
# Verify webhook signature validation
```

**QR Codes Not Scanning**
```bash
# Verify URL scheme is correct
# Check QR generator is using full URL
# Test with multiple scanner apps
```

---

## Support

For deployment issues:
1. Check health endpoint: `/api/health`
2. Review Vercel/Render logs
3. Check Supabase logs
4. Verify environment variables

---

## Related Documentation

- [Quick Start Guide](./QUICK-START/SETUP.md)
- [Environment Variables](./ENV-VARIABLES.md)
- [QR Systems Guide](./QR-SYSTEMS-COMPLETE-GUIDE.md)
- [Audit Summary](./QR-AUDIT-SUMMARY.md)
