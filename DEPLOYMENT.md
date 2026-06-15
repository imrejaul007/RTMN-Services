# RTMN-Services Deployment Guide

**Last Updated:** June 15, 2026  
**Status:** ✅ All 24 services deployment-ready

---

## Quick Start

```bash
# Test all services locally
bash scripts/test-all-services.sh

# Deploy with Docker
docker compose up -d

# Check health
docker compose ps
curl http://localhost:4702/health  # CorpID
curl http://localhost:5010/health  # Restaurant OS
```

---

## Service Inventory (24 Services)

### Foundation Services (6)
| Service | Port | Health Check |
|---------|------|--------------|
| corpid-service | 4702 | http://localhost:4702/health |
| memory-os | 4703 | http://localhost:4703/health |
| goal-os | 4242 | http://localhost:4242/health |
| decision-engine | 4240 | http://localhost:4240/health |
| agent-economy | 4251 | http://localhost:4251/health |
| twinos-hub | 4705 | http://localhost:4705/health |

### Industry OS (12)
| Service | Port | Industry |
|---------|------|----------|
| restaurant-os | 5010 | Restaurant |
| healthcare-os | 5020 | Healthcare |
| hotel-os | 5025 | Hotel |
| retail-os | 5030 | Retail |
| legal-os | 5035 | Legal |
| hospitality-os | 5050 | General Hospitality |
| education-os | 5060 | Education |
| automotive-os | 5080 | Automotive |
| beauty-os | 5090 | Beauty/Salon |
| fitness-os | 5110 | Fitness/Gym |
| manufacturing-os | 5150 | Manufacturing |
| realestate-os | 5230 | Real Estate |

### Digital Twins (6)
| Service | Port | Purpose |
|---------|------|---------|
| agent-twin | 3011 | Agent profiles |
| area-twin | 3012 | Area/region data |
| buyer-twin | 3013 | Buyer profiles |
| deal-twin | 3014 | Deal management |
| property-twin | 3015 | Property listings |
| referral-twin | 3016 | Referrals & rewards |

---

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+
- Docker (optional, for containerized deployment)

### Install dependencies
```bash
# Install all services
for d in corpid-service memory-os goal-os decision-engine agent-economy twinos-hub \
         restaurant-os hotel-os healthcare-os retail-os legal-os education-os \
         automotive-os beauty-os fitness-os manufacturing-os hospitality-os realestate-os \
         agent-twin area-twin buyer-twin deal-twin property-twin referral-twin; do
  (cd "$d" && npm install)
done
```

### Start all services
```bash
bash scripts/test-all-services.sh
```

### Start a single service
```bash
cd restaurant-os
npm start
# Server running on port 5010
```

---

## Docker Deployment

### Build all images
```bash
docker compose build
```

### Start all services
```bash
docker compose up -d
```

### View logs
```bash
docker compose logs -f              # all services
docker compose logs -f restaurant-os  # specific service
```

### Stop all services
```bash
docker compose down
```

### Restart a service
```bash
docker compose restart restaurant-os
```

### Scale a service
```bash
docker compose up -d --scale restaurant-os=3
```

---

## Health Check Endpoints

All services expose a `/health` endpoint:

```bash
curl http://localhost:5010/health
# {"status":"healthy","service":"restaurant-os","version":"1.0.0","timestamp":"..."}
```

---

## Environment Variables

Each service supports these env vars:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | service-specific | Override default port |
| `NODE_ENV` | development | Set to `production` in prod |
| `LOG_LEVEL` | info | Logging level |
| `REDIS_URL` | (none) | Redis connection (for some services) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       RTMN Services                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Foundation Layer:                                           │
│  CorpID (4702) │ MemoryOS (4703) │ GoalOS (4242)            │
│  Decision (4240) │ Economy (4251) │ TwinOS Hub (4705)       │
│                                                              │
│  Industry OS Layer:                                          │
│  12 services covering Restaurant, Hotel, Healthcare,        │
│  Retail, Legal, Education, Hospitality, Automotive,         │
│  Beauty, Fitness, Manufacturing, Real Estate                │
│                                                              │
│  Digital Twin Layer:                                         │
│  Agent, Area, Buyer, Deal, Property, Referral twins         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing

### Run deployment test
```bash
bash scripts/test-all-services.sh
```

This will:
1. Start all 24 services
2. Check `/health` on each
3. Report pass/fail summary
4. Clean up

Expected output: **24 passed, 0 failed**

### Manual smoke test
```bash
# Foundation
curl http://localhost:4702/health
curl http://localhost:4703/health

# Industry
curl http://localhost:5010/health
curl http://localhost:5025/health

# Twins
curl http://localhost:3011/health
curl http://localhost:3016/health
```

---

## Troubleshooting

### Port already in use
```bash
lsof -i :5010  # find process
kill -9 <PID>
```

### Service won't start
```bash
cd restaurant-os
node src/index.js  # run directly to see errors
```

### Dependencies missing
```bash
cd restaurant-os
npm install
```

### Check logs
```bash
tail -f /tmp/rtmn-logs/restaurant-os.log
```

---

## Production Deployment

### Recommended
- **Process Manager:** PM2, systemd, or Kubernetes
- **Reverse Proxy:** nginx or Traefik
- **Load Balancer:** HAProxy, AWS ALB
- **Monitoring:** Prometheus + Grafana
- **Log Aggregation:** ELK Stack, Datadog

### Example PM2 ecosystem
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    { name: 'corpid-service', script: 'corpid-service/src/index.js' },
    { name: 'restaurant-os', script: 'restaurant-os/src/index.js' },
    // ... all 24 services
  ]
}
```

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Port Reference

| Range | Usage |
|-------|-------|
| 3011-3016 | Digital Twins |
| 4240-4251 | SUTAR OS (Goal, Decision, Economy) |
| 4500-4550 | HOJAI AI |
| 4702-4705 | Foundation (CorpID, Memory, Twin Hub) |
| 5010-5230 | Industry OS |

Full registry: see [PORT-REGISTRY.md](PORT-REGISTRY.md)

---

*All 24 services are deployment-ready as of June 15, 2026*
