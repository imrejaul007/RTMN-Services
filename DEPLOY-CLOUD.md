# RTMN Cloud Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Vercel (API Gateway)                    │
│  https://rtmn-services.vercel.app/api/*                      │
│  Routes to Render backend services                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Render (Backend Services)                  │
│  24 Node.js services on free tier                            │
│  https://rtmn-<service>.onrender.com                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Deploy to Render (Backend)

### Option A: Blueprint Deploy (Recommended)
1. Go to [render.com](https://render.com)
2. Connect your GitHub repo: `imrejaul007/RTMN-Services`
3. Create a new Blueprint from `render.yaml`
4. Deploy all 24 services at once

### Option B: Manual Deploy
1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click "New" → "Web Service"
3. Connect GitHub repo
4. For each service:
   - **Name:** `rtmn-<service-name>`
   - **Root Directory:** `<service-folder>`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Port:** (service-specific port)
   - **Environment:** Node

### Render Service List (24 services)

| Service | Port | Root Directory |
|---------|------|---------------|
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

## Step 2: Deploy to Vercel (API Gateway)

### Option A: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Import `imrejaul007/RTMN-Services`
3. Framework: Other
4. Root Directory: `/`
5. Deploy

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

---

## API Usage

After deployment, access services via:

```
https://rtmn-services.vercel.app/api/{service}/{endpoint}
```

### Examples

```bash
# Health check
curl https://rtmn-services.vercel.app/health

# Restaurant OS
curl https://rtmn-services.vercel.app/api/restaurant/menus
curl https://rtmn-services.vercel.app/api/restaurant/orders

# Hotel OS
curl https://rtmn-services.vercel.app/api/hotel/rooms
curl https://rtmn-services.vercel.app/api/hotel/bookings

# Digital Twins
curl https://rtmn-services.vercel.app/api/agent-twin/agents
curl https://rtmn-services.vercel.app/api/property-twin/properties
```

---

## Direct Render URLs

Once deployed, services are available at:
```
https://rtmn-corpid-service.onrender.com/health
https://rtmn-restaurant-os.onrender.com/health
https://rtmn-agent-twin.onrender.com/health
# ... etc
```

---

## Free Tier Limits (Render)

- Services spin down after 15 min of inactivity
- First spin-up may take 30-60 seconds
- 750 hours/month total
- 512MB RAM per service

---

## Troubleshooting

### Render
```bash
# Check service logs
render logs <service-name>

# Restart service
render restart <service-name>
```

### Vercel
```bash
vercel logs
vercel redeploy
```

---

## Environment Variables

Add these to Vercel:
- `NODE_ENV=production`

Add these to each Render service:
- `PORT=<service-port>`
- `NODE_ENV=production`

---

*Last Updated: June 15, 2026*
