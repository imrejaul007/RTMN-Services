# RTMN Deployment Guide

## Overview

This guide covers deploying RTMN ecosystem to production environments.

---

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- MongoDB 6+
- Redis (optional)
- Domain + SSL certificates
- Cloud account (AWS/GCP/Azure)

---

## Deployment Options

| Option | Best For | Complexity |
|--------|----------|------------|
| **Docker Compose** | Development/Staging | Low |
| **Kubernetes** | Production | Medium |
| **Render** | Quick deploy | Low |
| **Vercel + Render** | Full stack | Low |

---

## Docker Compose (Recommended for Dev/Staging)

### Quick Start

```bash
# Clone and deploy
git clone https://github.com/your-org/RTMN.git
cd RTMN

# Deploy hub + core services
docker-compose -f docker-compose.unified-hub.yml up -d

# Check status
docker-compose -f docker-compose.unified-hub.yml ps

# View logs
docker-compose -f docker-compose.unified-hub.yml logs -f unified-hub
```

### Services Included

- unified-hub (4399)
- sales-os (5055)
- media-os (5600)
- marketing-os (5500)
- hotel-os (5025)
- restaurant-os (5010)
- mongodb

---

## Render Deployment

### 1. Create Render Account

1. Go to [render.com](https://render.com)
2. Connect GitHub repo
3. Create Web Service for each OS

### 2. Deploy Unified Hub

```bash
# Blueprint for Render
render blueprint create --spec render.unified-hub.yaml
```

### 3. Environment Variables

```bash
# Core
NODE_ENV=production
PORT=4399
MONGODB_URI=mongodb://mongo:27017/rtmn

# Service URLs
SALES_OS_URL=https://rtmn-sales.onrender.com
MEDIA_OS_URL=https://rtmn-media.onrender.com
MARKETING_OS_URL=https://rtmn-marketing.onrender.com

# Foundation
CORPID_URL=https://rtmn-corpid.onrender.com
MEMORY_OS_URL=https://rtmn-memory.onrender.com
TWIN_OS_URL=https://rtmn-twins.onrender.com

# REZ
REZ_CRM_URL=https://rtmn-crm.onrender.com
REZ_WALLET_URL=https://rtmn-wallet.onrender.com
```

---

## Vercel + Render (Full Stack)

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

### Backend (Render)

```bash
# Deploy hub
render blueprint apply services/unified-hub/render.yaml

# Deploy services
render blueprint apply industry-os/services/sales-os/render.yaml
render blueprint apply industry-os/services/media-os/render.yaml
render blueprint apply industry-os/services/marketing-os/render.yaml
```

---

## Environment Variables

### Hub (.env)

```bash
# Server
PORT=4399
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rtmn?retryWrites=true

# Services
SALES_OS_URL=https://sales.rtmn.in
MEDIA_OS_URL=https://media.rtmn.in
MARKETING_OS_URL=https://marketing.rtmn.in
HOTEL_OS_URL=https://hotel.rtmn.in
RESTAURANT_OS_URL=https://restaurant.rtmn.in

# Foundation
CORPID_URL=https://corp.rtmn.in
MEMORY_OS_URL=https://memory.rtmn.in
TWIN_OS_URL=https://twins.rtmn.in

# REZ
REZ_CRM_URL=https://crm.rtmn.in
REZ_WALLET_URL=https://wallet.rtmn.in
REZ_AUTH_URL=https://auth.rtmn.in

# AI
LEVERAGE_INTELLIGENCE_URL=https://ai.rtmn.in
HOJAI_AGENTS_URL=https://agents.rtmn.in
```

### Service (.env)

```bash
# Server
PORT=5055
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/sales?retryWrites=true

# Hub
RTMN_HUB_URL=https://hub.rtmn.in

# Auth
JWT_SECRET=<generate-32-char-secret>
JWT_EXPIRES_IN=7d
```

---

## SSL Setup

### Using Let's Encrypt

```bash
# Certbot
sudo certbot --nginx -d api.rtmn.in

# Auto-renewal
sudo crontab -e
0 0 * * * certbot renew --quiet
```

### Cloudflare

```bash
# DNS verification
TXT _acme-challenge.api.rtmn.in <challenge>
```

---

## Kubernetes

### Helm Chart Values

```yaml
# values.yaml
replicaCount: 3

image:
  repository: rtmn/sales-os
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 5055

resources:
  limits:
    cpu: "500m"
    memory: "512Mi"
  requests:
    cpu: "100m"
    memory: "256Mi"

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

persistence:
  enabled: true
  size: 10Gi
  storageClass: standard
```

### Deploy

```bash
helm upgrade --install sales ./charts/sales-os \
  --namespace rtmn \
  --values ./values.yaml \
  --set image.tag=latest
```

---

## Monitoring

### Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'rtmn'
    static_configs:
      - targets:
        - sales-os:5055
        - media-os:5600
        - marketing-os:5500
```

### Grafana Dashboard

Import dashboard ID: rtmn-overview

Metrics:
- http_requests_total
- http_request_duration_seconds
- mongodb_operations
- queue_depth
- revenue_total

---

## Backup & Recovery

### Backup

```bash
# MongoDB
mongodump --uri="mongodb://localhost:27017/sales" --out=/backup/sales-$(date +%Y%m%d)

# Auto-backup cron
0 2 * * * /scripts/backup.sh
```

### Restore

```bash
mongorestore --uri="mongodb://localhost:27017/sales" /backup/sales-20260617
```

---

## Troubleshooting

### Health Check

```bash
curl http://localhost:5055/health
curl http://localhost:5600/health
curl http://localhost:5500/health
curl http://localhost:4399/health
```

### Logs

```bash
# Hub
docker logs unified-hub --tail=100 -f

# Service
kubectl logs -l app=sales-os -n rtmn -f
```

### Debug Mode

```bash
NODE_ENV=development npm start
```

---

## Support

- Docs: docs.rtmn.in
- Status: status.rtmn.in
- Discord: discord.gg/rtmn

## CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm ci
      - run: npm test
      - run: npm run build

      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
        run: render blueprint apply render.yaml
```

---

## Cost Estimate

| Service | Monthly Cost |
|---------|---------------|
| Hub (1x) | $25 |
| Sales OS (2x) | $50 |
| Media OS (2x) | $50 |
| Marketing OS (1x) | $25 |
| MongoDB Atlas | $57 |
| **Total** | **$207/mo** |
