# ReZ Mind - Deployment Guide

## IMPORTANT: Shared Database

**ALL ReZ ecosystem apps share ONE database: `rez_ecosystem`**

This allows Intent Graph to track users across:
- ReZ app (consumer)
- ReZ Now (restaurant)
- ReZ merchants
- Rendez
- Karma
- All other apps

---

## Prerequisites

1. **PostgreSQL Database** - Shared by all apps
2. **Redis** - For shared memory (optional but recommended)
3. **Node.js 20+** - Runtime
4. **Database URL**: `postgresql://ota_user:ota_password@localhost:5432/rez_ecosystem`

---

## Step 1: Database Setup

### 1.1 Create Shared Database

```bash
# Using psql (run once)
psql -U postgres -c "CREATE DATABASE rez_ecosystem;"
psql -U postgres -c "GRANT ALL ON DATABASE rez_ecosystem TO ota_user;"

# Or via Docker Compose (already configured)
docker-compose -f docker-compose.rez-mind.yml up -d postgres
```

### 1.2 Run Prisma Migrations

```bash
cd packages/rez-intent-graph

# Use the SHARED database
export DATABASE_URL="postgresql://ota_user:ota_password@localhost:5432/rez_ecosystem"

# Generate Prisma Client (uses Hotel OTA schema)
npx prisma generate --schema=../../Hotel\ OTA/packages/database/prisma/schema.prisma

# Run migrations
npx prisma migrate deploy
```

---

## Step 2: Configure Environment Variables

Create `.env` file in `packages/rez-intent-graph/`:

```env
# SHARED DATABASE - all ReZ apps use this!
DATABASE_URL="postgresql://ota_user:ota_password@localhost:5432/rez_ecosystem"

# Redis (optional - for shared memory)
REDIS_URL="redis://localhost:6379"

# Server
PORT=3005
NODE_ENV=production

# API Keys (for external services)
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key"

# Webhook Secrets
RAZORPAY_WEBHOOK_SECRET=""
```

> **Note:** This same DATABASE_URL should be used by ALL ReZ apps!

---

## Step 3: Build

```bash
cd packages/rez-intent-graph

# Install dependencies
npm install

# Build TypeScript
npm run build
```

---

## Step 4: Deploy Options

### Option A: Run Directly

```bash
npm run start
# Server runs on port 3005
```

### Option B: PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/server/agent-server.js --name rez-mind

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup
```

### Option C: Docker

Create `Dockerfile` in `packages/rez-intent-graph/`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate
RUN npx prisma migrate deploy || true

COPY dist ./dist/

ENV NODE_ENV=production
ENV PORT=3005

EXPOSE 3005

CMD ["node", "dist/server/agent-server.js"]
```

Build and run:
```bash
docker build -t rez-mind:latest -f Dockerfile .
docker run -d -p 3005:3005 --env-file .env rez-mind:latest
```

### Option D: Kubernetes

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rez-mind
spec:
  replicas: 2
  selector:
    matchLabels:
      app: rez-mind
  template:
    metadata:
      labels:
        app: rez-mind
    spec:
      containers:
      - name: rez-mind
        image: your-registry/rez-mind:latest
        ports:
        - containerPort: 3005
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: rez-mind-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: rez-mind
spec:
  selector:
    app: rez-mind
  ports:
  - port: 80
    targetPort: 3005
  type: LoadBalancer
```

Apply:
```bash
kubectl apply -f k8s/
```

---

## Step 5: Configure Client Apps

Add to each app's environment:

```env
# rez-app-consumer, rez-now, etc.
NEXT_PUBLIC_INTENT_CAPTURE_URL=https://your-rez-mind-domain.com
```

Or for internal services:

```env
INTENT_CAPTURE_URL=http://rez-mind:3005
```

---

## Step 6: Health Check

```bash
# Check if server is running
curl http://localhost:3005/health

# Expected response:
# {"status":"ok","timestamp":"2026-04-27T00:00:00.000Z"}
```

---

## API Verification

### Test Intent Capture

```bash
curl -X POST http://localhost:3005/api/intent/capture \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "appType": "hotel_ota",
    "intentKey": "hotel_search_mumbai",
    "eventType": "search",
    "category": "TRAVEL",
    "metadata": {"city": "Mumbai"}
  }'
```

### Test User Intents

```bash
curl http://localhost:3005/api/agent/intents/test_user
```

### Test Dashboard Metrics

```bash
curl http://localhost:3005/api/monitoring/dashboard
```

---

## Monitoring

### Metrics Endpoint

```bash
curl http://localhost:3005/api/monitoring/metrics
```

### Active Alerts

```bash
curl http://localhost:3005/api/monitoring/alerts
```

### WebSocket (for real-time)

Connect to `ws://localhost:3005/ws` with channels:
- `demand_signals`
- `scarcity_alerts`
- `nudge_events`
- `system_metrics`

---

## Scaling

### Horizontal Scaling

ReZ Mind is **stateless** - can run multiple replicas behind a load balancer.

### Redis Clustering

For production, use Redis cluster for shared memory:
```env
REDIS_URL="redis://redis-cluster:6379"
```

### Database Connection Pooling

Use PgBouncer or similar:
```env
DATABASE_URL="postgresql://user:pass@pgbouncer:5432/rez_mind?pgbouncer=true"
```

---

## Troubleshooting

### Database Connection Error

```
Error: P1001: Can't reach database server
```

**Fix:** Check DATABASE_URL and ensure PostgreSQL is running.

### Prisma Schema Not Found

```
Error: P2021: Table 'Intent' does not exist
```

**Fix:** Run `npx prisma migrate deploy`

### WebSocket Connection Failed

```
WebSocket connection failed
```

**Fix:** Ensure firewall allows WebSocket upgrade on port 3005.

---

## Production Checklist

- [ ] PostgreSQL with connection pooling
- [ ] Redis for session/queue storage
- [ ] Environment variables configured
- [ ] Prisma migrations applied
- [ ] Health check endpoint verified
- [ ] Metrics monitoring enabled
- [ ] Load balancer configured (for multiple instances)
- [ ] SSL/TLS termination
- [ ] Logging aggregated
- [ ] Alerts configured
