# RTMN Pilot Onboarding - Deployment Guide

**Deploy Frontend on Vercel | Deploy Backend on Render**

---

## Quick Deploy

### Option 1: One-Click Deploy (Recommended)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/blueprints)

1. Connect your GitHub repo to Render
2. Import the `render.yaml` blueprint
3. Set environment variables
4. Deploy

---

## Backend Deployment (Render)

### Step 1: Prepare the Backend

```bash
cd services/pilot-onboarding
```

### Step 2: Create Render Web Service

1. Go to [render.com](https://render.com) → Dashboard
2. Click **New** → **Blueprint**
3. Connect your GitHub repo
4. Select `services/pilot-onboarding/render.yaml`
5. Click **Apply**

### Step 3: Set Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `4399` | |
| `JWT_SECRET` | Generate 64-char hex | `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | `7d` | |
| `PUBLIC_URL` | `https://your-app.onrender.com` | Auto from Render |
| `MONGO_URI` | MongoDB connection string | Optional - uses in-memory if not set |
| `RESEND_API_KEY` | Your Resend API key | For email verification |
| `EMAIL_FROM` | `noreply@yourdomain.com` | |
| `STRIPE_SECRET_KEY` | `sk_live_...` | |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | |
| `RABTUL_AUTH_URL` | `https://api.rtmn.io/auth` | |
| `RABTUL_PAYMENT_URL` | `https://api.rtmn.io/payment` | |
| `CORPID_URL` | `https://api.rtmn.io/corpid` | |

### Step 4: Industry OS URLs

For production, set all 24 industry OS URLs:

```bash
RESTAURANT_OS_URL=https://api.rtmn.io/restaurant
HEALTHCARE_OS_URL=https://api.rtmn.io/healthcare
RETAIL_OS_URL=https://api.rtmn.io/retail
HOTEL_OS_URL=https://api.rtmn.io/hotel
LEGAL_OS_URL=https://api.rtmn.io/legal
EDUCATION_OS_URL=https://api.rtmn.io/education
REALESTATE_OS_URL=https://api.rtmn.io/realestate
# ... (see .env.example for full list)
```

### Step 5: Health Check

After deployment, verify:
```bash
curl https://your-app.onrender.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## Frontend Deployment (Vercel)

### Step 1: Deploy the Dashboard

The pilot onboarding has a built-in dashboard at `public/dashboard.html`.

1. Go to [vercel.com](https://vercel.com) → Dashboard
2. Click **Add New** → **Project**
3. Import `services/pilot-onboarding`
4. Framework: **Other**
5. Root Directory: `services/pilot-onboarding`
6. Build Command: (leave empty)
7. Output Directory: `public`
8. Click **Deploy**

### Step 2: Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add `pilot.rtmn.io` (or your domain)
3. Update DNS records as shown

---

## SUTAR OS Backend Services (Render)

Deploy the 10 new SUTAR OS services to Render:

### Services to Deploy

| # | Service | Port | Git Path |
|---|---------|------|----------|
| 1 | BOA OS | 4100 | `companies/RTNM-Group/boa-os` |
| 2 | BOA-SUTAR Bridge | 4110 | `companies/RTNM-Group/boa-sutar-bridge` |
| 3 | HOJAI Intent Graph | 4018 | `companies/hojai-ai/services/hojai-intent-graph` |
| 4 | RABTUL SLA Monitor | 4195 | `companies/RABTUL-Technologies/REZ-SLA-monitor` |
| 5 | RABTUL Breach Detector | 4196 | `companies/RABTUL-Technologies/REZ-breach-detector` |
| 6 | REZ-economy-os | 4251 | `companies/RABTUL-Technologies/REZ-economy-os` |
| 7 | HOJAI Simulation Engine | 4241 | `companies/hojai-ai/services/hojai-simulation-engine` |
| 8 | HOJAI Discovery Engine | 4256 | `companies/hojai-ai/services/hojai-discovery-engine` |
| 9 | REZ-trust-scorer | 4180 | `companies/RABTUL-Technologies/REZ-trust-scorer` |
| 10 | SUTAR Negotiation Engine | 4191 | `companies/hojai-ai/hojai-sutar-os/services/sutar-negotiation-engine` |

### Per-Service Render Config

Create a `render.yaml` in each service directory:

```yaml
# Example for BOA OS
services:
  - type: web
    name: rtmn-boa-os
    env: node
    region: singapore
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4100
```

### Or Deploy via Render Dashboard

1. Create each service manually on Render
2. Connect to the corresponding Git path
3. Set `npm install && npm run build` as build command
4. Set `npm start` as start command
5. Set PORT environment variable

---

## Environment Variables Summary

### Required for Pilot Onboarding

```
# Core
NODE_ENV=production
PORT=4399
JWT_SECRET=<64-char-hex>
JWT_EXPIRES_IN=7d
PUBLIC_URL=https://your-domain.com

# Database (optional - uses in-memory)
MONGO_URI=mongodb+srv://...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@rtmn.io

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Internal Services
RABTUL_AUTH_URL=https://api.rtmn.io/auth
RABTUL_PAYMENT_URL=https://api.rtmn.io/payment
CORPID_URL=https://api.rtmn.io/corpid

# SUTAR OS Services
BOA_OS_URL=https://api.rtmn.io/boa
SUTAR_GATEWAY_URL=https://api.rtmn.io/sutar
INTENT_GRAPH_URL=https://api.rtmn.io/intent
SIMULATION_ENGINE_URL=https://api.rtmn.io/simulation
DISCOVERY_ENGINE_URL=https://api.rtmn.io/discovery
ECONOMY_OS_URL=https://api.rtmn.io/economy
TRUST_SCORER_URL=https://api.rtmn.io/trust
NEGOTIATION_ENGINE_URL=https://api.rtmn.io/negotiation
SLA_MONITOR_URL=https://api.rtmn.io/sla
BREACH_DETECTOR_URL=https://api.rtmn.io/breach

# 24 Industry OS
RESTAURANT_OS_URL=https://api.rtmn.io/restaurant
HEALTHCARE_OS_URL=https://api.rtmn.io/healthcare
# ... (see .env.example for full list)
```

---

## Post-Deployment Checklist

- [ ] Backend health check passes: `GET /health`
- [ ] Frontend loads at Vercel URL
- [ ] Signup flow works (check email)
- [ ] Login returns JWT
- [ ] Service list returns 24 industries
- [ ] Stripe webhook receives events
- [ ] Industry OS proxy works

---

## Custom Domain Setup

### Vercel (Frontend)
```
A Record: @ → 76.76.21.21
CNAME: www → cname.vercel-dns.com
```

### Render (Backend)
```
CNAME: api.rtmn.io → your-app.onrender.com
```

---

## Monitoring

- Render Dashboard → Service Logs
- Vercel Analytics (if enabled)
- Check `/health` endpoints for all services

---

## Support

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- RTMN Docs: See CLAUDE.md in each service