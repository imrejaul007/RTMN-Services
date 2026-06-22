# NeXha Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Monitoring Setup](#monitoring-setup)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Kubernetes (for production)
- MongoDB 7+ (or Atlas)
- Redis 7+

---

## Local Development

```bash
# 1. Clone and install
cd RTNM-Group/nexha
pnpm install

# 2. Copy environment
cp .env.example .env

# 3. Start infrastructure
docker-compose up -d mongo redis

# 4. Initialize database
npx tsx scripts/init-db.ts

# 5. Seed test data
npx tsx scripts/seed.ts

# 6. Start services (separate terminals)
pnpm dev:connector     # Port 4399 (start first)
pnpm dev:distribution  # Port 4300
pnpm dev:franchise     # Port 4310
pnpm dev:procurement  # Port 4320
pnpm dev:manufacturing # Port 4330
pnpm dev:finance      # Port 4340
pnpm dev:intelligence  # Port 4350
pnpm dev:portal       # Port 4388
```

---

## Docker Deployment

### Build Images

```bash
# Build all services
docker-compose build

# Or build specific service
docker-compose build distribution-os
```

### Start Stack

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale a service
docker-compose up -d --scale distribution-os=3
```

### Services & Ports

| Service | Port | URL |
|---------|------|-----|
| Portal | 4388 | http://localhost:4388 |
| DistributionOS | 4300 | http://localhost:4300 |
| FranchiseOS | 4310 | http://localhost:4310 |
| ProcurementOS | 4320 | http://localhost:4320 |
| ManufacturingOS | 4330 | http://localhost:4330 |
| TradeFinance | 4340 | http://localhost:4340 |
| Intelligence | 4350 | http://localhost:4350 |
| Connector | 4399 | http://localhost:4399 |
| MongoDB | 27017 | mongodb://localhost:27017 |
| Redis | 6379 | redis://localhost:6379 |

---

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
brew install kubectl

# Install helm
brew install helm

# Install ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.0/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml
```

### Deploy

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create secrets (edit with real values)
kubectl create secret generic nexha-secrets \
  --from-literal=MONGODB_URI="mongodb+srv://..." \
  --from-literal=INTERNAL_SERVICE_TOKEN="your-token" \
  --namespace=nexha

# 3. Deploy MongoDB
kubectl apply -f k8s/mongodb.yaml

# 4. Deploy services
for svc in distribution franchise procurement manufacturing trade-finance intelligence connector; do
  kubectl apply -f k8s/${svc}-os.yaml
done

# 5. Deploy frontend
kubectl apply -f k8s/portal.yaml

# 6. Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

### Check Status

```bash
# View all resources
kubectl get all -n nexha

# View pods
kubectl get pods -n nexha -w

# View logs
kubectl logs -n nexha -l app=distribution-os --tail=100
```

---

## Environment Configuration

### Required Variables

```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nexha

# Authentication
AUTH_SERVICE_URL=https://rez-auth-service.onrender.com
INTERNAL_SERVICE_TOKEN=your-secure-token

# Service URLs (for inter-service communication)
DISTRIBUTION_OS_URL=http://localhost:4300
FRANCHISE_OS_URL=http://localhost:4310
PROCUREMENT_OS_URL=http://localhost:4320

# Monitoring (optional)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Kubernetes Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: nexha-secrets
  namespace: nexha
type: Opaque
stringData:
  MONGODB_URI: "mongodb+srv://..."
  INTERNAL_SERVICE_TOKEN: "..."
  AUTH_SERVICE_URL: "https://..."
  SENTRY_DSN: "https://..."
```

---

## Database Setup

### Initialize Collections

```bash
# Run initialization script
npx tsx scripts/init-db.ts

# This creates:
# - nexha_distribution (distributors, van_sales)
# - nexha_franchise (franchises, brands)
# - nexha_procurement (suppliers, rfqs, orders)
# - nexha_manufacturing (boms, production_orders, batches)
# - nexha_finance (credit_lines, bnpl_transactions, loans)
```

### MongoDB Atlas (Cloud)

```javascript
// Connection string format
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
```

---

## Monitoring Setup

### Prometheus Metrics

Each service exposes `/metrics` endpoint:

```bash
# View metrics
curl http://localhost:4300/metrics

# Key metrics:
# - http_requests_total (counter)
# - http_request_duration_seconds (histogram)
# - db_operations_total (counter)
# - business_events_total (counter)
```

### Grafana Dashboard

```yaml
# prometheus.yaml
scrape_configs:
  - job_name: 'nexha'
    static_configs:
      - targets:
        - distribution-os:4300
        - franchise-os:4310
        - procurement-os:4320
```

### Health Checks

```bash
# Check service health
curl http://localhost:4300/health | jq

# Response:
{
  "healthy": true,
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": { "healthy": true, "latency": 5 },
    "cache": { "healthy": true },
    "external": { "healthy": true, "services": {} }
  },
  "memory": { "used": 128, "total": 512, "percent": 25 }
}
```

---

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n nexha

# Common issues:
# - Missing secrets
# - Wrong image tag
# - Resource constraints
```

### Database Connection Failed

```bash
# Check MongoDB status
kubectl exec -it nexha-mongo-0 -n nexha -- mongosh

# Test connection
kubectl run mongo-test --image=mongo --rm -it -- \
  mongosh --host nexha-mongo "mongodb://localhost:27017/test"
```

### High Memory Usage

```bash
# Check pod resource usage
kubectl top pods -n nexha

# Increase limits in deployment
resources:
  limits:
    memory: "2Gi"
```

### Logs Not Appearing

```bash
# Check log level
kubectl logs <pod> -n nexha | grep ERROR

# Increase verbosity in .env
LOG_LEVEL=debug
```

---

## Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/nexha-distribution-os -n nexha

# Rollback to specific revision
kubectl rollout undo deployment/nexha-distribution-os --to-revision=2 -n nexha
```

---

## Security Checklist

- [ ] All secrets stored in Kubernetes Secret
- [ ] MongoDB has authentication enabled
- [ ] Redis has password protection
- [ ] TLS configured on ingress
- [ ] Rate limiting enabled
- [ ] RBAC permissions configured
- [ ] Audit logging enabled
- [ ] Sentry/Datadog integrated
