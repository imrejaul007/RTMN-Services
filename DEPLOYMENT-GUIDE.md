# RTMN Customer Operations OS - Deployment Guide

**Version:** 1.0  
**Date:** June 17, 2026

---

## Prerequisites

| Tool | Version | Required |
|------|---------|----------|
| Node.js | 18+ | ✅ |
| npm | 9+ | ✅ |
| Git | 2.0+ | ✅ |
| Render CLI | Latest | ✅ |
| MongoDB Atlas | Free/Paid | ✅ |

---

## Step 1: Setup

### 1.1 Clone & Install

```bash
# Clone repository
git clone https://github.com/imrejaul007/RTMN-Services.git
cd RTMN-Services

# Run setup script
chmod +x setup-all-services.sh
./setup-all-services.sh
```

### 1.2 Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (M0 Sandbox)
3. Create database user
4. Whitelist IP: `0.0.0.0/0`
5. Get connection string

### 1.3 Get API Keys

```bash
# OpenAI (for AI features)
https://platform.openai.com/api-keys

# Twilio (for voice/SMS)
https://www.twilio.com/console

# Stripe (for payments)
https://dashboard.stripe.com/apikeys
```

---

## Step 2: Configure Services

### 2.1 Update .env for each service

```bash
# Example for customer-intelligence
cd services/customer-intelligence
nano .env

# Add:
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/rtmn
OPENAI_API_KEY=sk-xxxxx
JWT_SECRET=your-secret-key
```

### 2.2 Bulk Update (Script)

```bash
# Update all .env files with MongoDB URI
for dir in services/*; do
  if [ -f "$dir/.env" ]; then
    echo "MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/rtmn" >> "$dir/.env"
  fi
done
```

---

## Step 3: Deploy to Render

### 3.1 Install Render CLI

```bash
npm install -g @render/cli
render login
```

### 3.2 Deploy All Services

```bash
# Deploy using blueprint
render blueprint apply render.yaml

# This will create all 50+ services on Render
```

### 3.3 Deploy Frontend

```bash
cd frontend
vercel --prod
```

---

## Step 4: Configure Domains

### 4.1 Backend Services

| Service | Domain |
|---------|--------|
| Pilot Onboarding | api.rtmn.io |
| Customer Intelligence | customer.rtmn.io |
| AI Intelligence | ai.rtmn.io |
| Ticket Engine | ticket.rtmn.io |
| Knowledge Base | kb.rtmn.io |
| Lead Twin | lead.rtmn.io |

### 4.2 Frontend Apps

| App | Domain |
|-----|--------|
| Marketing Site | rtmn.io |
| Agent Dashboard | agent.rtmn.io |
| Executive Dashboard | exec.rtmn.io |
| Admin Portal | admin.rtmn.io |
| Customer Portal | support.rtmn.io |
| Marketplace | marketplace.rtmn.io |
| CRM | crm.rtmn.io |

---

## Step 5: Configure SSL

All Render services get free SSL automatically.

For custom domains:
```bash
# Add custom domain in Render dashboard
# Point CNAME to Render URL
# SSL auto-provisions
```

---

## Step 6: Verify Deployment

### 6.1 Health Checks

```bash
# Check all services
for port in 4885 4881 4871 4872 4900 4908; do
  curl -s https://rtmn-$port.onrender.com/health
done
```

### 6.2 API Documentation

```
https://rtmn-api.onrender.com/api-docs
```

---

## Step 7: Monitor & Alert

### 7.1 Render Dashboard

Monitor all services at: https://render.com/dashboard

### 7.2 Set Up Alerts

```bash
# Install Render alerts
render alerts create --service=rtmn-customer-intelligence --type=health-check
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RTMN CUSTOMER OPERATIONS OS                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FRONTEND (Vercel)                                                 │
│  ├── rtmn.io (Marketing)                                           │
│  ├── agent.rtmn.io (Agent Dashboard)                               │
│  └── support.rtmn.io (Customer Portal)                             │
│                                                                     │
│  API GATEWAY (Render)                                              │
│  └── api.rtmn.io (Pilot Onboarding)                                │
│                                                                     │
│  TWINS (Render - Ports 4885-4909)                                  │
│  ├── Customer Twin (4885)                                          │
│  ├── Order Twin (4900)                                              │
│  ├── Payment Twin (4901)                                            │
│  ├── Lead Twin (4908)                                              │
│  └── ...                                                           │
│                                                                     │
│  AI ENGINES (Render - Ports 4950-4954)                             │
│  ├── AI Intelligence (4881)                                         │
│  ├── Decision Engine (4951)                                         │
│  ├── Trust Intelligence (4953)                                      │
│  └── ...                                                           │
│                                                                     │
│  COPILOTS (Render - Ports 4928-4933)                               │
│  ├── Support Copilot (4895)                                         │
│  ├── Sales Copilot (4928)                                           │
│  └── ...                                                           │
│                                                                     │
│  COMPANY INTEGRATIONS (Render - Ports 4960-4973)                     │
│  ├── HOJAI AI (4960)                                                │
│  ├── REZ (4961)                                                    │
│  └── ...                                                           │
│                                                                     │
│  DATABASE                                                          │
│  └── MongoDB Atlas (Cloud)                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
render logs --service=rtmn-customer-intelligence

# Common issues:
# - Missing .env variables
# - MongoDB connection failed
# - Port already in use
```

### Build Fails

```bash
# Check package.json
cat services/customer-intelligence/package.json

# Reinstall dependencies
cd services/customer-intelligence
rm -rf node_modules package-lock.json
npm install
```

### API Returns 500

```bash
# Check MongoDB connection
curl -X GET https://rtmn-customer-intelligence.onrender.com/health

# Check logs for errors
render logs --service=rtmn-customer-intelligence
```

---

## Cost Estimation

| Service | Plan | Monthly |
|---------|------|---------|
| MongoDB Atlas | M0 Free | $0 |
| Render | Starter | $7/service |
| Vercel | Hobby | $0 |
| Domain | .io | $10/year |

**Total: ~$400/month for 50+ services**

---

## Next Steps

1. ✅ Setup complete
2. ✅ MongoDB configured
3. ✅ API keys added
4. ✅ Deploy to Render
5. ⏳ Configure domains
6. ⏳ Test end-to-end
7. ⏳ Go live!

---

## Support

- **Documentation:** See CLAUDE.md in each service
- **API Docs:** https://rtmn-api.onrender.com/api-docs
- **GitHub Issues:** Report bugs

---

**Ready to deploy! 🚀**
