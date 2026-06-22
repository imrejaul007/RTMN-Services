# Environment Variables Guide

> **Complete reference for all environment variables required by ReZ QR systems**

---

## Table of Contents

1. [Global Variables](#global-variables)
2. [rez-now](#rez-now)
3. [Hotel OTA](#hotel-ota)
4. [adBazaar](#adbazaar)
5. [adsqr](#adsqr)
6. [rez-app-merchant](#rez-app-merchant)
7. [Backend Services](#backend-services)
8. [Third-Party Services](#third-party-services)
9. [Example Configurations](#example-configurations)

---

## Global Variables

These variables apply to all services:

```env
# Node Environment
NODE_ENV=development          # development | staging | production

# Service URLs (for internal communication)
REZ_AUTH_URL=http://localhost:3001
REZ_WALLET_URL=http://localhost:3002
REZ_PAYMENT_URL=http://localhost:3003
REZ_MERCHANT_URL=http://localhost:3004
INTENT_GRAPH_URL=http://localhost:3005
KNOWLEDGE_BASE_URL=http://localhost:3006
CHAT_SERVICE_URL=http://localhost:3007

# Internal Service Authentication
INTERNAL_SERVICE_TOKEN=your-secure-random-token
```

---

## rez-now

### Public (Client-Side)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WALLET=true
NEXT_PUBLIC_ENABLE_QR_SCAN=true
```

### Server-Side

```env
# Supabase Service Role (server only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ReZ Services
REZ_AUTH_URL=http://localhost:3001
REZ_WALLET_URL=http://localhost:3002
REZ_PAYMENT_URL=http://localhost:3003

# QR Configuration
QR_TOKEN_SECRET=your-qr-encryption-key
QR_TOKEN_EXPIRY_HOURS=24
```

---

## Hotel OTA

### Public (Client-Side)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your-key-id

# MakCorps (Hotel Search API)
MAKCORPS_API_KEY=your-makcorps-key
```

### Server-Side

```env
# Razorpay
RAZORPAY_KEY_SECRET=rzp_test_your-key-secret

# ReZ Services
REZ_AUTH_URL=http://localhost:3001
REZ_WALLET_URL=http://localhost:3002
REZ_PAYMENT_URL=http://localhost:3003
REZ_MERCHANT_URL=http://localhost:3004

# StayOwn Integration
STAYOWN_API_URL=https://api.stayown.com
STAYOWN_API_KEY=your-stayown-key
```

---

## adBazaar

### Public (Client-Side)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

### Server-Side

```env
# Supabase Service Role
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ReZ Services
REZ_WALLET_URL=http://localhost:3002
REZ_AUTH_URL=http://localhost:3001

# Campaign Limits
MAX_QR_CODES_PER_CAMPAIGN=1000
DEFAULT_ATTRIBUTION_WINDOW_DAYS=30

# Coin Configuration
COIN_REWARD_SCAN=10
COIN_REWARD_VISIT=25
COIN_REWARD_PURCHASE=100
```

---

## adsqr

### Public (Client-Side)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3003
```

### Server-Side

```env
# Supabase Service Role
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ReZ Services
REZ_WALLET_URL=http://localhost:3002

# Campaign Configuration
CAMPAIGN_MIN_BUDGET=1000
CAMPAIGN_MAX_BUDGET=1000000
```

---

## rez-app-merchant

### Backend

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/rez-merchant
MONGODB_USER=your-mongodb-user
MONGODB_PASSWORD=your-mongodb-password

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Backend Services

### ReZ Auth Service

```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/rez-auth

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

### ReZ Wallet Service

```env
# Server
PORT=3002
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/rez-wallet

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Coin Configuration
COIN_NAME=ReZ Coins
COIN_SYMBOL=RZC
INITIAL_COIN_BALANCE=1000
```

### ReZ Payment Service

```env
# Server
PORT=3003
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/rez-payment

# Razorpay
RAZORPAY_KEY_ID=rzp_test_your-key-id
RAZORPAY_KEY_SECRET=rzp_test_your-key-secret

# Currency
DEFAULT_CURRENCY=INR
SUPPORTED_CURRENCIES=INR,USD
```

### ReZ Merchant Service

```env
# Server
PORT=3004
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/rez-merchant

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Third-Party Services

### Supabase

```env
# Get these from Supabase Dashboard > Settings > API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Connection (for migrations)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

### Razorpay

```env
# Get from Razorpay Dashboard > Settings > API Keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx

# Test vs Live
RAZORPAY_MODE=test  # test | live
```

### MakCorps (Hotel Search)

```env
# Get from MakCorps API
MAKCORPS_API_KEY=your-api-key
MAKCORPS_API_URL=https://api.makcorps.com

# Optional
MAKCORPS_CACHE_TTL=3600
```

### StayOwn (Property Management)

```env
# Get from StayOwn
STAYOWN_API_URL=https://api.stayown.com
STAYOWN_API_KEY=your-api-key
STAYOWN_WEBHOOK_SECRET=your-webhook-secret
```

---

## Example Configurations

### Development (.env.local)

```env
# ===========================================
# DEVELOPMENT ENVIRONMENT
# ===========================================

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Service URLs
REZ_AUTH_URL=http://localhost:3001
REZ_WALLET_URL=http://localhost:3002
REZ_PAYMENT_URL=http://localhost:3003
REZ_MERCHANT_URL=http://localhost:3004

# Internal Token
INTERNAL_SERVICE_TOKEN=dev-internal-token-change-in-prod

# Razorpay (Test)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx

# MakCorps
MAKCORPS_API_KEY=dev-makcorps-key

# Node
NODE_ENV=development
```

### Staging (.env.staging)

```env
# ===========================================
# STAGING ENVIRONMENT
# ===========================================

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Service URLs
REZ_AUTH_URL=https://rez-auth.staging.vercel.app
REZ_WALLET_URL=https://rez-wallet.staging.vercel.app
REZ_PAYMENT_URL=https://rez-payment.staging.vercel.app
REZ_MERCHANT_URL=https://rez-merchant.staging.vercel.app

# Internal Token
INTERNAL_SERVICE_TOKEN=staging-internal-token-get-from-vault

# Razorpay (Test)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx

# MakCorps
MAKCORPS_API_KEY=staging-makcorps-key

# Node
NODE_ENV=staging
```

### Production (.env.production)

```env
# ===========================================
# PRODUCTION ENVIRONMENT
# ===========================================

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Service URLs
REZ_AUTH_URL=https://rez-auth.production.vercel.app
REZ_WALLET_URL=https://rez-wallet.production.vercel.app
REZ_PAYMENT_URL=https://rez-payment.production.vercel.app
REZ_MERCHANT_URL=https://rez-merchant.production.vercel.app

# Internal Token
INTERNAL_SERVICE_TOKEN=get-from-vault-production

# Razorpay (Live)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx

# MakCorps
MAKCORPS_API_KEY=prod-makcorps-key

# Node
NODE_ENV=production
```

---

## Environment Variable Files

| File | Purpose | Git |
|------|---------|-----|
| `.env` | Default values | No |
| `.env.local` | Local overrides | No |
| `.env.development` | Dev specific | No |
| `.env.staging` | Staging | No |
| `.env.production` | Production | No |
| `.env.example` | Template | Yes |
| `.env.template` | Documentation | Yes |

### Creating .env from Template

```bash
# Copy template
cp .env.example .env.local

# Fill in values
nano .env.local
```

---

## Security Notes

1. **Never commit .env files** - Add to `.gitignore`
2. **Use Vault for secrets** - Consider HashiCorp Vault or AWS Secrets Manager
3. **Rotate keys regularly** - Especially in production
4. **Use different keys per environment** - Dev, staging, production
5. **Validate on startup** - Check required vars exist

### .gitignore Entry

```
# Environment files
.env
.env.local
.env.*.local
.env.staging
.env.production
```

---

## Validation Script

Add to your app startup:

```typescript
// src/lib/env-validate.ts
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

export function validateEnv() {
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}`
    );
  }
}
```

---

## Related Documentation

- [Deployment Guide](./DEPLOYMENT-GUIDE.md)
- [Quick Start - Setup](./QUICK-START/SETUP.md)
- [QR Systems Guide](./QR-SYSTEMS-COMPLETE-GUIDE.md)
