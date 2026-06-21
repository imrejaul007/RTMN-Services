# NeXha Commerce Network — Deployment Guide

**Version:** 1.0.0 | **Date:** 2026-06-21

---

## Overview

Deploy the NeXha Commerce Network platform to production:

- **Backend** → [Render](https://render.com) (Node.js web services)
- **Frontend** → [Vercel](https://vercel.com) (Next.js portal)

---

## Architecture

```
Production Deployment

┌──────────────────────────────────────────────────────────────┐
│                         INTERNET                               │
└───────────────────────────┬──────────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │         VERCEL            │
              │      nexha-portal         │
              │    (Next.js :3000)         │
              │                           │
              │  NEXT_PUBLIC_API_URL ──────┼───► commerce-identity
              └───────────────────────────┘               │
                                                         │
              ┌───────────────────────────┐               │
              │          RENDER            │               │
              │  ┌─────────────────────┐ │         ┌─────▼────────┐
              │  │ nexha-sutar-mock   │ │         │ MongoDB Atlas│
              │  │ (port 4799)        │ │         │ or Render DB │
              │  └─────────────────────┘ │         └──────────────┘
              │  ┌─────────────────────┐ │
              │  │ nexha-commerce-id   │ │
              │  │ (port 8000)         │◄┘
              │  └─────────────────────┘ │
              └───────────────────────────┘
```

---

## Prerequisites

- GitHub account connected to this repo
- [Render](https://render.com) account (free tier works)
- [Vercel](https://vercel.com) account (free tier works)
- **MongoDB Atlas** cluster OR use Render's built-in MongoDB add-on

---

## Step 1 — Create MongoDB Database

**Option A: MongoDB Atlas (Recommended)**

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create cluster (free M0 tier)
2. Create a database user: `nexha_user` with a strong password
3. Whitelist IP: `0.0.0.0/0` (allows all IPs for Render)
4. Get connection string:
   ```
   mongodb+srv://nexha_user:PASSWORD@cluster.mongodb.net/nexha_commerce_identity
   ```

**Option B: Render MongoDB Add-on**

1. In Render dashboard → Add New → Add-on → MongoDB
2. Select free plan
3. Connection string will be auto-injected as `MONGODB_URI`

---

## Step 2 — Deploy Backend to Render

### Option A: Blueprint (Recommended — deploys all services at once)

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/Nexha
render blueprint create --spec render.yaml
```

This will deploy:
1. `nexha-sutar-mock` — SUTAR OS mock
2. `nexha-commerce-identity` — Main API

**Important:** After the blueprint deploys, set these in the Render dashboard:

| Service | Variable | Value |
|---------|----------|-------|
| nexha-commerce-identity | `MONGODB_URI` | Your Atlas connection string or Render MongoDB URI |
| nexha-commerce-identity | `JWT_SECRET` | `openssl rand -hex 32` (generate once per environment) |
| nexha-commerce-identity | `INTERNAL_API_KEY` | `openssl rand -hex 32` (different per environment) |
| nexha-commerce-identity | `ALLOWED_ORIGINS` | After Vercel deploy, paste portal URL here (e.g. `https://nexha-portal.vercel.app`) |
| nexha-commerce-identity | `SUTAR_*_URL` | Set to real SUTAR endpoints (not sutar-mock) in production |

> ⚠️ **`NEXT_PUBLIC_API_URL`** is a Vercel-side variable (set in Step 3, not Render).
> The `commerce-identity` service uses `ALLOWED_ORIGINS`, not `NEXT_PUBLIC_API_URL`.

### Secret rotation

If this codebase (or any deploy derived from it) was ever deployed with the
**default placeholder secrets** from `commerce-identity/.env.example`
(`JWT_SECRET=dev-secret-change-me-in-production-please`,
`INTERNAL_API_KEY=change-me-in-production`), you must rotate:

1. **JWT_SECRET** — generates new JWTs; invalidates all existing tokens (every
   user must re-login).
   ```bash
   openssl rand -hex 32
   ```
   Set in Render dashboard. Restart the service.

2. **INTERNAL_API_KEY** — invalidates all service-to-service auth. If any
   downstream caller (RTMN Industry OS, RisaCare dental integration, etc.) uses
   the old key, update it simultaneously.
   ```bash
   openssl rand -hex 32
   ```

3. **MONGODB_URI password** — if the password was ever published (including in
   any committed `.env`), rotate at the database provider and update the URI.

4. **WhatsApp credentials** — Meta/Twilio access tokens can be rotated in their
   respective dashboards.

5. **Audit any logs / backups** that may have captured the old values and
   consider them compromised.

### Option B: Manual Deploy

1. Go to [render.com/dashboard](https://render.com/dashboard)
2. **nexha-sutar-mock**:
   - New → Web Service
   - Connect GitHub repo: `imrejaul007/RTMN-Services`
   - Root directory: `companies/Nexha/sutar-mock`
   - Build command: `npm install && npx tsc`
   - Start command: `node dist/index.js`
   - Environment: Node
   - Plan: Free

3. **nexha-commerce-identity**:
   - New → Web Service
   - Connect GitHub repo: `imrejaul007/RTMN-Services`
   - Root directory: `companies/Nexha/commerce-identity`
   - Build command: `npm install && npm run build`
   - Start command: `node dist/index.js`
   - Environment: Node
   - Plan: Free
   - Add Environment Variable: `MONGODB_URI` = your connection string
   - Add Environment Variable: `JWT_SECRET` = generated secret
   - Add Environment Variable: `INTERNAL_API_KEY` = generated secret
   - Environment Variables for SUTAR URLs → point to `https://nexha-sutar-mock.onrender.com`

### Wait for health checks

```bash
# Check commerce-identity
curl https://nexha-commerce-identity.onrender.com/health

# Check sutar-mock
curl https://nexha-sutar-mock.onrender.com/health
```

Both should return `200` before proceeding.

---

## Step 3 — Deploy Frontend to Vercel

### Option A: Vercel CLI

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/Nexha/portal

# Link to Vercel project
vercel link

# Set production environment variable
vercel env add NEXT_PUBLIC_API_URL
# When prompted: https://nexha-commerce-identity.onrender.com

# Deploy
vercel --prod
```

### Option B: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) → Add New → Project
2. Import `companies/Nexha/portal` from GitHub
3. Framework: **Next.js** (auto-detected)
4. Root directory: `companies/Nexha/portal`
5. Build command: `npm run build`
6. Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://nexha-commerce-identity.onrender.com`
7. Click **Deploy**

### Wait for build

The build should complete in ~2 minutes. Check for errors.

---

## Step 4 — Verify End-to-End

```bash
# 1. Check frontend loads
curl https://your-portal.vercel.app/health  # or open in browser

# 2. Check backend API
curl https://nexha-commerce-identity.onrender.com/health | python3 -m json.tool

# 3. Test guest onboarding
curl -X POST https://nexha-commerce-identity.onrender.com/api/guest-suppliers/onboard \
  -H 'Content-Type: application/json' \
  -d '{
    "businessName": "Test Corp",
    "ownerName": "Test User",
    "phone": "+919876543210",
    "email": "test@example.com",
    "city": "Mumbai",
    "state": "Maharashtra"
  }' | python3 -m json.tool

# 4. Check OTP in Render logs (dev mode logs OTP to console)
# Or check SUTAR event bus:
curl https://nexha-sutar-mock.onrender.com/events | python3 -m json.tool
```

---

## Step 5 — Update Render CORS (if needed)

The backend CORS should already allow the Vercel domain. If you see CORS errors, update `commerce-identity/src/app.ts`:

```typescript
app.use(cors({
  origin: [
    process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
    'https://your-portal.vercel.app',  // add your Vercel URL
  ],
  credentials: true,
}));
```

Rebuild and redeploy after changes.

---

## WhatsApp OTP — Production Setup

By default, OTP runs in **dev mode** (logs to console). To enable real WhatsApp delivery:

### Meta WhatsApp Business Cloud API

1. Create a Meta Business app at [developers.facebook.com](https://developers.facebook.com)
2. Add WhatsApp product → get Phone Number ID
3. Get a permanent access token
4. In Render dashboard, set these environment variables:

```
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=your-permanent-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
```

### Twilio WhatsApp

```
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

## Environment Variables Summary

### commerce-identity (Render)

| Variable | Required | Example |
|----------|----------|---------|
| `PORT` | Yes | `8000` |
| `NODE_ENV` | Yes | `production` |
| `MONGODB_URI` | Yes | `mongodb+srv://...` |
| `SUTAR_BASE_URL` | Yes | `https://nexha-sutar-mock.onrender.com` |
| `SUTAR_IDENTITY_URL` | Yes | same as SUTAR_BASE_URL |
| `SUTAR_REPUTATION_URL` | Yes | same as SUTAR_BASE_URL |
| `SUTAR_DECISION_URL` | Yes | same as SUTAR_BASE_URL |
| `SUTAR_EVENT_BUS_URL` | Yes | same as SUTAR_BASE_URL |
| `JWT_SECRET` | Yes | `openssl rand -hex 32` output |
| `JWT_EXPIRES_IN` | No | `7d` (default) |
| `JWT_ISSUER` | No | `nexha-commerce-identity` |
| `JWT_AUDIENCE` | No | `nexha-portal` |
| `INTERNAL_API_KEY` | Yes | `openssl rand -hex 32` output |
| `WHATSAPP_PROVIDER` | No | `meta` or `twilio` (empty = dev mode) |
| `WHATSAPP_ACCESS_TOKEN` | If Meta | Meta access token |
| `WHATSAPP_PHONE_NUMBER_ID` | If Meta | Phone number ID |
| `TWILIO_ACCOUNT_SID` | If Twilio | Twilio SID |
| `TWILIO_AUTH_TOKEN` | If Twilio | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | If Twilio | `whatsapp:+1...` |

### portal (Vercel)

| Variable | Required | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | `https://nexha-commerce-identity.onrender.com` |

---

## Custom Domain (Optional)

### Vercel
1. Project Settings → Domains → Add your domain
2. Update DNS records as instructed
3. SSL certificate is auto-provisioned

### Render
Custom domains are available on paid plans. For free tier, use the default `.onrender.com` URL.

---

## Troubleshooting

### CORS errors
- Verify `ALLOWED_ORIGINS` or `cors()` whitelist includes your Vercel URL
- Check browser console for the exact blocked origin

### MongoDB connection failed
- Verify `MONGODB_URI` is correct and password has no special chars (URL-encode if needed)
- Check Atlas IP whitelist includes Render IPs (or use `0.0.0.0/0`)

### Service won't start
- Check Render logs for error details
- Verify all required env vars are set

### OTP not received
- In dev mode: check Render service logs for `[DEV] WhatsApp OTP`
- In prod mode: verify WhatsApp credentials are set correctly

### Build failed on Vercel
- Check build logs for specific errors
- Common: TypeScript errors, missing dependencies
- Fix locally, push, and redeploy

---

## Redeploying

### Backend (Render)
- Push to `main` branch → auto-deploys if auto-deploy is enabled
- Or: Render dashboard → select service → Manual Deploy → Deploy latest commit

### Frontend (Vercel)
- Push to `main` branch → auto-deploys
- Or: Vercel dashboard → select project → Deployments → Redeploy

---

## URLs After Deployment

| Service | Expected URL |
|---------|-------------|
| Portal (Vercel) | `https://nexha-portal.vercel.app` (or your custom domain) |
| Commerce Identity | `https://nexha-commerce-identity.onrender.com` |
| SUTAR Mock | `https://nexha-sutar-mock.onrender.com` |
| Health | Append `/health` to any service URL |

---

*Last Updated: 2026-06-21 (Phase 6 of NEXHA-DEEP-AUDIT.md)*
