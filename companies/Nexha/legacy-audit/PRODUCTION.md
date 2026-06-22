# NeXha Production Deployment Guide

> **Last Updated:** June 12, 2026
> **Status:** Production Ready
> **Version:** 2.0.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring & Observability](#monitoring--observability)
8. [Security Checklist](#security-checklist)
9. [Deployment Checklist](#deployment-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NeXha Ecosystem                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐ │
│  │DistributionOS│   │ FranchiseOS  │   │ProcurementOS│   │Manufacturing│ │
│  │    :4300   │   │    :4310   │   │    :4320   │   │   :4330  │ │
│  └──────────────┘   └──────────────┘   └──────────────┘   └────────────┘ │
│                              │                                          │
│                     ┌────────┴────────┐                             │
│                     │  Connector    │                             │
│                     │    :4399    │                             │
│                     └──────────────┘                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │ TradeFinance │   │Intelligence │   │   Portal    │            │
│  │    :4340   │   │    :4350   │   │    :4388   │            │
│  └──────────────┘   └──────────────┘   └──────────────┘            │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────┐           │
│  │                    NextaBizz (B2B Procurement)              │           │
│  └────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Services Inventory

| Service | Port | Database | Replicas | Memory | CPU |
|---------|------|----------|----------|--------|-----|
| Portal | 4388 | - | 2 | 256Mi | 250m |
| DistributionOS | 4300 | nexha_distribution | 2 | 256Mi | 250m |
| FranchiseOS | 4310 | nexha_franchise | 2 | 256Mi | 250m |
| ProcurementOS | 4320 | nexha_procurement | 2 | 256Mi | 250m |
| ManufacturingOS | 4330 | nexha_manufacturing | 2 | 256Mi | 250m |
| TradeFinance | 4340 | nexha_finance | 2 | 256Mi | 250m |
| Intelligence | 4350 | nexha_intelligence | 2 | 512Mi | 500m |
| Connector | 4399 | nexha_connector | 3 | 256Mi | 250m |

---

## Prerequisites

### Required Tools

```bash
# kubectl - Kubernetes CLI
brew install kubectl

# helm - Package manager for Kubernetes
brew install helm

# Docker - Container runtime
brew install --cask docker

# Optional: kubectx for context switching
brew install kubectx
```

### Required Accounts

- [ ] Docker Hub account for image registry
- [ ] Kubernetes cluster (GKE, EKS, or on-prem)
- [ ] MongoDB Atlas account (or self-hosted MongoDB)
- [ ] Redis Cloud account (or self-hosted Redis)
- [ ] Sentry account for error tracking
- [ ] Domain name configured (nexha.rez.money)

### Infrastructure Requirements

| Component | Specification | Purpose |
|-----------|---------------|---------|
| Kubernetes | 1.28+ | Container orchestration |
| MongoDB | 7.0+ | Primary database |
| Redis | 7.0+ | Caching & sessions |
| Ingress Controller | nginx | Load balancing & TLS |
| cert-manager | 1.12+ | TLS certificates |

---

## Infrastructure Setup

### 1. Create Kubernetes Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Create Secrets

Create `k8s/secrets.yaml` with your production values:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: nexha-secrets
  namespace: nexha
type: Opaque
stringData:
  MONGODB_URI: "mongodb+srv://user:password@cluster.mongodb.net/nexha"
  REDIS_URL: "redis://:password@redis-host:6379"
  AUTH_SERVICE_URL: "https://rez-auth-service.onrender.com"
  INTERNAL_SERVICE_TOKEN: "generate-secure-32-char-token"
  WEBHOOK_SECRET: "generate-secure-webhook-secret"
  RAZORPAY_KEY_ID: "your-key-id"
  RAZORPAY_KEY_SECRET: "your-key-secret"
  SENTRY_DSN: "https://xxx@sentry.io/xxx"
```

Apply secrets:
```bash
kubectl apply -f k8s/secrets.yaml
```

### 3. Apply ConfigMap

```bash
kubectl apply -f k8s/configmap.yaml
```

### 4. Install Ingress Controller

```bash
# Install nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.0/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager for TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml
```

---

## Kubernetes Deployment

### Full Deployment

```bash
# Deploy all services
kubectl apply -f k8s/distribution-os.yaml
kubectl apply -f k8s/franchise-os.yaml
kubectl apply -f k8s/procurement-os.yaml
kubectl apply -f k8s/manufacturing-os.yaml
kubectl apply -f k8s/trade-finance.yaml
kubectl apply -f k8s/intelligence-layer.yaml
kubectl apply -f k8s/ecosystem-connector.yaml
kubectl apply -f k8s/portal.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n nexha

# Check services
kubectl get svc -n nexha

# Check deployments
kubectl get deployments -n nexha

# Watch rollout status
kubectl rollout status deployment/nexha-distribution-os -n nexha
```

### Expected Output

```
NAME                                    READY   STATUS    RESTARTS   AGE
nexha-distribution-os-xxxxx-xxxxx      1/1     Running   0          2m
nexha-franchise-os-xxxxx-xxxxx        1/1     Running   0          2m
nexha-procurement-os-xxxxx-xxxxx      1/1     Running   0          2m
nexha-manufacturing-os-xxxxx-xxxxx    1/1     Running   0          2m
nexha-trade-finance-xxxxx-xxxxx       1/1     Running   0          2m
nexha-intelligence-xxxxx-xxxxx        1/1     Running   0          2m
nexha-ecosystem-connector-xxxxx-xxxxx 1/1     Running   0          2m
nexha-portal-xxxxx-xxxxx              1/1     Running   0          2m
```

---

## Docker Deployment

### Build Images

```bash
# Build all service images
docker build -t nexha/distribution-os:latest ./distribution-os
docker build -t nexha/franchise-os:latest ./franchise-os
docker build -t nexha/procurement-os:latest ./procurement-os
docker build -t nexha/manufacturing-os:latest ./manufacturing-os
docker build -t nexha/trade-finance:latest ./trade-finance
docker build -t nexha/intelligence:latest ./intelligence-layer
docker build -t nexha/ecosystem-connector:latest ./ecosystem-connector
docker build -t nexha/portal:latest ./portal
```

### Push to Registry

```bash
# Login to Docker Hub
docker login

# Push images
docker push nexha/distribution-os:latest
docker push nexha/franchise-os:latest
docker push nexha/procurement-os:latest
docker push nexha/manufacturing-os:latest
docker push nexha/trade-finance:latest
docker push nexha/intelligence:latest
docker push nexha/ecosystem-connector:latest
docker push nexha/portal:latest
```

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale a service
docker-compose up -d --scale distribution-os=3
```

---

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/nexha` |
| `REDIS_URL` | Redis connection string | `redis://:password@redis:6379` |
| `AUTH_SERVICE_URL` | RABTUL Auth service URL | `https://rez-auth-service.onrender.com` |
| `INTERNAL_SERVICE_TOKEN` | Service-to-service auth token | `32-char-secure-token` |
| `WEBHOOK_SECRET` | Webhook signature verification | `webhook-secret-key` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Service port | `4000` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `LOG_LEVEL` | Logging level | `info` |
| `SENTRY_DSN` | Sentry error tracking | - |
| `MONGODB_POOL_SIZE` | MongoDB connection pool | `10` |

---

## Monitoring & Observability

### Health Checks

```bash
# Check service health
curl http://localhost:4300/health | jq

# Check all services via connector
curl http://localhost:4399/api/status/services | jq
```

### Prometheus Metrics

Each service exposes `/metrics` endpoint:

```bash
curl http://localhost:4300/metrics
```

Key metrics:
- `http_requests_total` - Request counter
- `http_request_duration_seconds` - Latency histogram
- `db_operations_total` - Database operations
- `business_events_total` - Business events

### Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: 'nexha'
    static_configs:
      - targets:
        - distribution-os:4300
        - franchise-os:4310
        - procurement-os:4320
        - manufacturing-os:4330
        - trade-finance:4340
        - intelligence:4350
        - ecosystem-connector:4399
```

---

## Security Checklist

- [ ] All secrets stored in Kubernetes Secret
- [ ] MongoDB has authentication enabled
- [ ] Redis has password protection
- [ ] TLS configured on ingress (Let's Encrypt)
- [ ] Rate limiting enabled on all services
- [ ] RBAC permissions configured
- [ ] Audit logging enabled
- [ ] Sentry/Datadog integrated
- [ ] Webhook signature verification enabled
- [ ] Non-root user in Docker containers
- [ ] Security headers (Helmet.js)
- [ ] CORS configured for production domains

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (`pnpm test`)
- [ ] TypeScript compilation successful (`pnpm build`)
- [ ] Docker images built and pushed
- [ ] Kubernetes manifests updated
- [ ] Secrets configured in `k8s/secrets.yaml`
- [ ] Database migrations ready
- [ ] SSL certificates provisioned

### Deployment

- [ ] Apply namespace
- [ ] Apply secrets
- [ ] Apply configmap
- [ ] Deploy backend services
- [ ] Deploy portal
- [ ] Deploy ingress
- [ ] Verify all pods running
- [ ] Verify all services healthy
- [ ] Test webhook endpoints
- [ ] Test authentication flow

### Post-Deployment

- [ ] Verify health checks
- [ ] Check error rates in Sentry
- [ ] Verify metrics are being collected
- [ ] Test critical user flows
- [ ] Enable production alerts
- [ ] Update DNS if needed
- [ ] Document deployment in runbook

---

## Rollback Procedures

### Kubernetes Rollback

```bash
# Rollback a specific deployment
kubectl rollout undo deployment/nexha-distribution-os -n nexha

# Rollback to specific revision
kubectl rollout undo deployment/nexha-distribution-os --to-revision=2 -n nexha

# Check rollout history
kubectl rollout history deployment/nexha-distribution-os -n nexha
```

### Docker Rollback

```bash
# Stop current containers
docker-compose down

# Start previous version
docker-compose -f docker-compose.backup.yml up -d
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
kubectl exec -it <pod-name> -n nexha -- mongosh

# Test connection
kubectl run mongo-test --image=mongo --rm -it -- \
  mongosh --host mongodb "mongodb://localhost:27017/test"
```

### High Memory Usage

```bash
# Check pod resource usage
kubectl top pods -n nexha

# Increase limits in deployment
kubectl patch deployment nexha-distribution-os -n nexha \
  --patch '{"spec":{"template":{"spec":{"containers":[{"name":"distribution-os","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

### Logs Not Appearing

```bash
# Check log level
kubectl logs <pod> -n nexha | grep ERROR

# Increase verbosity
kubectl set env deployment/nexha-distribution-os -n nexha LOG_LEVEL=debug
```

---

## Support

For deployment issues:
1. Check Kubernetes pod logs
2. Verify environment variables
3. Check GitHub Actions deployment logs
4. Contact: RTNM DevOps Team
