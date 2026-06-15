# RTMN Deployment Guide - Frontend (Vercel) + Backend (Render)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL                                    │
│                    Frontend (Next.js)                            │
│              https://rtmn.vercel.app                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RENDER                                    │
│                   Backend (25 services)                          │
│                                                                │
│  ┌─────────────────┐    ┌──────────────────────────────────┐  │
│  │ Pilot Onboarding │    │ Industry OS (24 services)          │  │
│  │   Port 4399     │    │ 5010, 5020, 5025, 5030, ...      │  │
│  └─────────────────┘    └──────────────────────────────────┘  │
│                                                                │
│  https://rtmn-pilot-onboarding.onrender.com                   │
│  https://rtmn-restaurant-os.onrender.com                       │
│  https://rtmn-hotel-os.onrender.com                            │
│  ...                                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Deploy Backend to Render

### Option A: Blueprint Deploy (Recommended)

1. Go to [render.com](https://render.com)
2. Login/Signup with GitHub
3. Click **"New"** → **"Blueprint"**
4. Connect your GitHub repo: `imrejaul007/RTMN-Services`
5. Select the `render.yaml` file
6. Click **"Apply"**

This deploys ALL 25 services at once:
- `rtmn-pilot-onboarding` (4399) - Client onboarding & billing
- `rtmn-corpid-service` (4702) - Universal identity
- `rtmn-memory-os` (4703) - AI memory
- `rtmn-twinos-hub` (4705) - Digital twins
- `rtmn-goal-os` (4242) - Autonomous goals
- `rtmn-decision-engine` (4240) - Policy & auth
- `rtmn-agent-economy` (4251) - Karma & payments
- `rtmn-restaurant-os` (5010) - Restaurant management
- `rtmn-hotel-os` (5025) - Hotel management
- `rtmn-healthcare-os` (5020) - Healthcare management
- ... and 17 more industry OS

### Option B: Manual Deploy

For each service manually:
1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **"New"** → **"Web Service"**
3. Connect GitHub repo
4. Configure:
   - **Name:** `rtmn-<service-name>`
   - **Root Directory:** `<service-folder>`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Port:** See PORT column below
   - **Environment:** Node

### Service Ports Reference

| Service | Port | GitHub Folder |
|---------|------|---------------|
| rtmn-pilot-onboarding | 4399 | services/pilot-onboarding |
| rtmn-corpid-service | 4702 | corpid-service |
| rtmn-memory-os | 4703 | memory-os |
| rtmn-twinos-hub | 4705 | twinos-hub |
| rtmn-goal-os | 4242 | goal-os |
| rtmn-decision-engine | 4240 | decision-engine |
| rtmn-agent-economy | 4251 | agent-economy |
| rtmn-restaurant-os | 5010 | restaurant-os |
| rtmn-healthcare-os | 5020 | healthcare-os |
| rtmn-hotel-os | 5025 | hotel-os |
| rtmn-retail-os | 5030 | retail-os |
| rtmn-legal-os | 5035 | legal-os |
| rtmn-hospitality-os | 5050 | hospitality-os |
| rtmn-education-os | 5060 | education-os |
| rtmn-automotive-os | 5080 | automotive-os |
| rtmn-beauty-os | 5090 | beauty-os |
| rtmn-fitness-os | 5110 | fitness-os |
| rtmn-manufacturing-os | 5150 | manufacturing-os |
| rtmn-realestate-os | 5230 | realestate-os |
| rtmn-agent-twin | 3011 | agent-twin |
| rtmn-area-twin | 3012 | area-twin |
| rtmn-buyer-twin | 3013 | buyer-twin |
| rtmn-deal-twin | 3014 | deal-twin |
| rtmn-property-twin | 3015 | property-twin |
| rtmn-referral-twin | 3016 | referral-twin |

---

## Step 2: Deploy Frontend to Vercel

### Option A: Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com/new)
2. Import: `https://github.com/imrejaul007/RTMN-Services`
3. **Root Directory:** `/` (leave as root)
4. **Framework Preset:** Next.js
5. **Build Command:** (auto-detected)
6. **Environment Variables:** Add:
   - `NEXT_PUBLIC_API_URL` = `https://rtmn-pilot-onboarding.onrender.com` (update with your Render URL)
7. Click **Deploy**

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# Set production environment
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://rtmn-pilot-onboarding.onrender.com

vercel --prod
```

---

## Step 3: Configure Domain (Optional)

### Vercel Domain
After deployment, Vercel gives you a URL:
```
https://rtmn-services-xxxx.vercel.app
```

Add custom domain in Vercel dashboard:
1. Go to Project Settings → Domains
2. Add `rtmn.io` or your preferred domain

### Render Domain
Each service gets a default URL:
```
https://rtmn-pilot-onboarding.onrender.com
https://rtmn-restaurant-os.onrender.com
```

---

## Step 4: Update Environment Variables

After Render deployment, update Vercel:

1. Go to Vercel Dashboard → Project → Environment Variables
2. Update:
   ```
   NEXT_PUBLIC_API_URL = https://rtmn-pilot-onboarding.onrender.com
   ```
3. Redeploy to apply

---

## Step 5: Test Deployment

### Test Backend (Render)
```bash
# Replace with your Render URLs
curl https://rtmn-pilot-onboarding.onrender.com/health
curl https://rtmn-restaurant-os.onrender.com/health
```

### Test Frontend (Vercel)
```bash
# Replace with your Vercel URL
curl https://your-project.vercel.app/
```

### Test Auth Flow
```bash
# Register
curl -X POST https://rtmn-pilot-onboarding.onrender.com/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","companyName":"Test Corp","contactName":"John"}'

# Login
curl -X POST https://rtmn-pilot-onboarding.onrender.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## Troubleshooting

### Render Services Won't Start

1. Check logs: Render Dashboard → Service → Logs
2. Common issues:
   - Missing `npm install` - Add build command
   - Port mismatch - Ensure PORT env var matches
   - Memory issues - Upgrade to paid plan

### Frontend Can't Reach Backend

1. Check CORS settings in Render
2. Verify `NEXT_PUBLIC_API_URL` is correct
3. Check browser console for errors

### Services Spinning Down

Render free tier spins down after 15 min. Add:
```bash
# Keep alive ping (add to Cron)
*/5 * * * * curl https://your-service.onrender.com/health
```

Or upgrade to Render Starter plan (never spins down).

---

## Environment Variables Reference

### Render (Backend)

**rtmn-pilot-onboarding:**
| Variable | Value |
|----------|-------|
| PORT | 4399 |
| NODE_ENV | production |
| JWT_SECRET | (generate) |
| JWT_EXPIRES_IN | 7d |
| STRIPE_SECRET_KEY | (from Stripe dashboard) |
| ALLOWED_ORIGINS | https://your-vercel-url.vercel.app |

**Other services:**
| Variable | Value |
|----------|-------|
| PORT | (service-specific) |
| NODE_ENV | production |

### Vercel (Frontend)

| Variable | Value |
|----------|-------|
| NEXT_PUBLIC_API_URL | https://rtmn-pilot-onboarding.onrender.com |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | pk_live_... |

---

## Post-Deployment Checklist

- [ ] All 25 Render services are green
- [ ] Frontend loads without errors
- [ ] Auth signup/login works
- [ ] CORS configured for frontend URL
- [ ] Stripe keys added (for production)
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up (optional)

---

*Last Updated: June 15, 2026*
