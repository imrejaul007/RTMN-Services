# RTMN CRM Stack — Deployment Guide

**Services:** REZ CRM Hub (AdBazaar) + REZ SalesMind (RTNM-Digital)
**Backend:** Render  |  **Frontend:** Vercel

---

## Prerequisites

- GitHub account connected to Vercel and Render
- MongoDB Atlas cluster (free tier M0 works)
- Redis Cloud account (or Render free Redis addon)
- Vercel CLI: `npm i -g vercel`

---

## Step 1 — Deploy Backend to Render

### Option A: Blueprints (Recommended)

Connect the repo to Render and deploy from `render.yaml`:

1. Go to [render.com](https://render.com) → **Blueprints**
2. Connect your GitHub repo
3. Render auto-detects `render.yaml` at the root
4. Deploy — this deploys **all** services including CRM Hub and SalesMind

**IMPORTANT:** For the newly added services, you'll need to update their env vars after deployment:

```
# rez-crm-hub env vars (set in Render dashboard)
MONGODB_URI          = mongodb+srv://<user>:<pass>@cluster.mongodb.net/rez-crm-hub
REDIS_URL            = redis://<host>:<port>
JWT_SECRET           = <generate in Render>
INTERNAL_SERVICE_TOKEN = <generate in Render — must match CRM_HUB_TOKEN in SalesMind>
ALLOWED_ORIGINS      = https://your-frontend.vercel.app
PUBLIC_URL           = https://rez-crm-hub.onrender.com

# rez-salesmind env vars
INTERNAL_SERVICE_TOKEN = <MUST MATCH CRM Hub's INTERNAL_SERVICE_TOKEN>
CRM_HUB_TOKEN         = <MUST MATCH CRM Hub's INTERNAL_SERVICE_TOKEN>
REZ_CRM_HUB           = https://rez-crm-hub.onrender.com
ALLOWED_ORIGINS       = https://your-frontend.vercel.app
```

### Option B: Deploy Each Service Individually

```bash
# 1. Deploy REZ CRM Hub
cd companies/AdBazaar/REZ-crm-hub
render deploy --prod --rootDir .

# 2. Deploy REZ SalesMind
cd companies/RTNM-Digital/REZ-SalesMind
render deploy --prod --rootDir .
```

---

## Step 2 — Deploy Frontend to Vercel

```bash
cd frontend
vercel --prod
```

Or connect the `frontend/` directory to Vercel from the dashboard.

**Required Environment Variables in Vercel:**
```
NEXT_PUBLIC_API_URL = https://rtmn-api.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
NEXT_PUBLIC_ENABLE_ANALYTICS = false
```

---

## Step 3 — Configure CORS (Backend)

In Render dashboard, set `ALLOWED_ORIGINS` for both services:

```
ALLOWED_ORIGINS = https://your-app.vercel.app,https://your-app-git-*.vercel.app
```

---

## Step 4 — Verify Deployments

```bash
# CRM Hub health
curl https://rez-crm-hub.onrender.com/api/health

# SalesMind health
curl https://rez-salesmind.onrender.com/health

# Full ecosystem status (auth required)
curl -H "X-Internal-Token: <token>" \
  https://rez-salesmind.onrender.com/api/ecosystem/status
```

---

## API Gateway Routes

After Vercel deploys the root `api/` folder, routes are:

| Route | Backend |
|-------|---------|
| `/api/crm/contacts` | REZ CRM Hub |
| `/api/crm/deals` | REZ CRM Hub |
| `/api/sales/leads` | REZ SalesMind |
| `/api/sales/dashboard/stats` | REZ SalesMind |
| `/api/sales/ai/email/generate` | REZ SalesMind |

---

## Local Development

```bash
# Start both services with pm2
./start-crm-stack.sh pm2

# Or with node (dev only)
./start-crm-stack.sh node

# Services
#   REZ CRM Hub:    http://localhost:4056/api/health
#   REZ SalesMind:  http://localhost:5170/health
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 Unauthorized from SalesMind | Set `CRM_HUB_TOKEN` in SalesMind = `INTERNAL_SERVICE_TOKEN` in CRM Hub |
| CORS errors in browser | Set `ALLOWED_ORIGINS` on both services to your Vercel URL |
| MongoDB connection failed | Check `MONGODB_URI` env var is a valid Atlas connection string |
| `GET /api/deals/stats` returns 400 | Restart — route order fix requires redeploy |
| CRM Hub health shows but leads return empty | HubSpot/Zoho not connected — that's fine, internal contacts work |

---

## File Summary

| File | Purpose |
|------|---------|
| `ecosystem.crm.json` | pm2 process manager config |
| `start-crm-stack.sh` | Start/stop script |
| `companies/AdBazaar/REZ-crm-hub/render.yaml` | CRM Hub Render blueprint |
| `companies/RTNM-Digital/REZ-SalesMind/render.yaml` | SalesMind Render blueprint |
| `render.yaml` | Root — all services (CRM Hub + SalesMind added) |
| `api/index.js` | Vercel API gateway with `crm` + `sales` routes |
| `frontend/vercel.json` | Vercel config with rewrite for CRM/SalesMind |
