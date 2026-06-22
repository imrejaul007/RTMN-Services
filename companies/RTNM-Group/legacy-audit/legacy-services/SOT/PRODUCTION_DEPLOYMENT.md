# REZ Commerce OS - Production Deployment Guide
**Date:** May 13, 2026

---

## PRE-DEPLOYMENT CHECKLIST

### Infrastructure
- [ ] MongoDB Atlas cluster (production tier)
- [ ] Redis Cloud (production tier)
- [ ] Domain configured (rez.app)
- [ ] SSL certificates
- [ ] DNS records configured

### Services to Deploy

## PHASE 1: Infrastructure Services (First)

### 1. RABTUL-Technologies

| Priority | Service | GitHub | Render |
|----------|---------|--------|--------|
| 1 | rez-auth-service | imrejaul007/RABTUL-Technologies | rez-auth |
| 2 | rez-wallet-service | imrejaul007/RABTUL-Technologies | rez-wallet |
| 3 | rez-payment-service | imrejaul007/RABTUL-Technologies | rez-payment |
| 4 | rez-notifications-service | imrejaul007/RABTUL-Technologies | rez-notifications |

### 2. REZ-Intelligence

| Priority | Service | GitHub | Render |
|----------|---------|--------|--------|
| 1 | REZ-MIND | imrejaul007/REZ-Intelligence | rez-mind |
| 2 | REZ-intent-graph | imrejaul007/REZ-Intelligence | rez-intent |
| 3 | REZ-consumer-graph | imrejaul007/REZ-Intelligence | rez-consumer-graph |

---

## PHASE 2: Core Commerce Services

### 3. REZ-Consumer

| Priority | Service | GitHub | Render |
|----------|---------|--------|--------|
| 1 | verify-qr-service | imrejaul007/REZ-Consumer | rez-verify-qr |
| 2 | REZ-scan | imrejaul007/REZ-Consumer | rez-scan |
| 3 | REZ-expense | imrejaul007/REZ-Consumer | rez-expense |
| 4 | REZ-bills | imrejaul007/REZ-Consumer | rez-bills |
| 5 | REZ-assistant | imrejaul007/REZ-Consumer | rez-assistant |

### 4. REZ-Media

| Priority | Service | GitHub | Render |
|----------|---------|--------|--------|
| 1 | REZ-attribution-platform | imrejaul007/REZ-Media | rez-attribution |
| 2 | REZ-referral-graph | imrejaul007/REZ-Media | rez-referral |
| 3 | AdBazaar | imrejaul007/REZ-Media | adbazaar |

---

## PHASE 3: Trust & Financial

### 5. RTNM-Group

| Priority | Service | GitHub | Render |
|----------|---------|--------|--------|
| 1 | REZ-trust-service | imrejaul007/RTNM-Group | rez-trust |
| 2 | REZ-bnpl-service | imrejaul007/RTNM-Group | rez-bnpl |
| 3 | REZ-capital-service | imrejaul007/RTNM-Group | rez-capital |

---

## PHASE 4: Industry OS

### 6. REZ-Merchant

| Priority | Service | GitHub | Render |
|----------|---------|--------|--------|
| 1 | rez-merchant-service | imrejaul007/REZ-Merchant | rez-merchant-api |
| 2 | industry-os | imrejaul007/REZ-Merchant | rez-industry-os |

### 7. StayOwn-Hospitality

| Priority | Service | GitHub | Render |
|----------|---------|--------|--------|
| 1 | Hotel OTA | imrejaul007/StayOwn-Hospitality | hotel-ota |
| 2 | verify-service | imrejaul007/StayOwn-Hospitality | stayown-verify |

---

## DEPLOYMENT COMMANDS

### Render CLI Setup

```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# Deploy each service
renderctl deploy --token=<YOUR_RENDER_TOKEN> --service=<SERVICE_NAME>
```

### Service Deployment

```bash
# Phase 1: Infrastructure
renderctl deploy --token=$RENDER_TOKEN --service=rez-auth
renderctl deploy --token=$RENDER_TOKEN --service=rez-wallet
renderctl deploy --token=$RENDER_TOKEN --service=rez-payment
renderctl deploy --token=$RENDER_TOKEN --service=rez-notifications

# Phase 2: Commerce
renderctl deploy --token=$RENDER_TOKEN --service=rez-verify-qr
renderctl deploy --token=$RENDER_TOKEN --service=rez-scan
renderctl deploy --token=$RENDER_TOKEN --service=rez-expense
renderctl deploy --token=$RENDER_TOKEN --service=rez-bills

# Phase 3: Trust
renderctl deploy --token=$RENDER_TOKEN --service=rez-trust
renderctl deploy --token=$RENDER_TOKEN --service=rez-bnpl

# Phase 4: Industry
renderctl deploy --token=$RENDER_TOKEN --service=rez-merchant
renderctl deploy --token=$RENDER_TOKEN --service=hotel-ota
```

### Vercel Deployment (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy apps
cd REZ-Consumer/REZ-scan-ui && vercel --prod
cd REZ-Consumer/REZ-expense-ui && vercel --prod
cd REZ-Consumer/REZ-assistant-ui && vercel --prod
cd REZ-Media/adBazaar && vercel --prod
```

---

## ENVIRONMENT VARIABLES (Production)

### RABTUL-Technologies

```env
# rez-auth-service
JWT_SECRET=<256-bit-secret>
JWT_EXPIRY=7d
MONGODB_URI=<Atlas URI>
REDIS_URL=<Redis URI>
OTP_SECRET=<otp-secret>
INTERNAL_SERVICE_TOKENS_JSON={"service-name":"token"}

# rez-wallet-service
MONGODB_URI=<Atlas URI>
REDIS_URL=<Redis URI>
INTERNAL_API_KEY=<key>

# rez-payment-service
RAZORPAY_KEY_ID=<key>
RAZORPAY_KEY_SECRET=<secret>
MONGODB_URI=<Atlas URI>
REDIS_URL=<Redis URI>

# rez-notifications-service
MONGODB_URI=<Atlas URI>
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
WHATSAPP_BUSINESS_ID=<id>
SMTP_HOST=<smtp>
SMTP_USER=<user>
SMTP_PASS=<pass>
```

### REZ-Intelligence

```env
MONGODB_URI=<Atlas URI>
REDIS_URL=<Redis URI>
OPENAI_API_KEY=<key>
ANTHROPIC_API_KEY=<key>
INTERNAL_API_KEY=<key>
```

### REZ-Consumer

```env
# verify-qr-service
MONGODB_URI=<Atlas URI>
MERCHANT_API=https://rez-merchant-api.onrender.com
WALLET_API=https://rez-wallet.onrender.com
INTELLIGENCE_API=https://rez-intelligence.onrender.com
AGENT_API=https://REZ-agent.onrender.com

# All services
INTERNAL_API_KEY=<key>
```

### RTNM-Group

```env
TRUST_API=https://rez-trust.onrender.com
MONGODB_URI=<Atlas URI>
REDIS_URL=<Redis URI>
```

---

## DOMAIN CONFIGURATION

### DNS Records

| Type | Name | Value |
|------|------|-------|
| A | api.rez.app | <Render IP> |
| CNAME | auth.rez.app | rez-auth.onrender.com |
| CNAME | wallet.rez.app | rez-wallet.onrender.com |
| CNAME | verify.rez.app | rez-verify-qr.onrender.com |
| CNAME | app.rez.app | rez-consumer.vercel.app |
| CNAME | ads.rez.app | adbazaar.vercel.app |

---

## VERIFICATION CHECKLIST

### After Each Service Deploy

- [ ] Service health check: `GET /health`
- [ ] Database connection working
- [ ] Redis connection working
- [ ] Internal API calls working
- [ ] Response time < 500ms

### End-to-End Tests

- [ ] User registration
- [ ] Wallet creation
- [ ] QR scan and verify
- [ ] Warranty activation
- [ ] Cashback earned
- [ ] Referral flow
- [ ] Payment processing
- [ ] Notification sent

---

## MONITORING SETUP

### Health Checks
```bash
curl https://rez-auth.onrender.com/health
curl https://rez-wallet.onrender.com/health
curl https://rez-verify-qr.onrender.com/health
```

### Log Monitoring
```bash
# Check Render logs
renderctl logs --service=rez-auth
renderctl logs --service=rez-wallet
```

---

## ROLLBACK PROCEDURE

### If issues occur:

```bash
# Rollback to previous deploy
renderctl deploy --token=$RENDER_TOKEN --service=<SERVICE> --previous

# Or deploy specific commit
renderctl deploy --token=$RENDER_TOKEN --service=<SERVICE> --commit=<commit-sha>
```

---

## SUPPORT

- **Docs:** docs.rez.app
- **Status:** status.rez.app
- **Support:** support@rez.app

---

**Last Updated:** May 13, 2026
