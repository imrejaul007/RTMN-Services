# Nexha Commerce Network - Complete Deployment Guide

**Version:** 1.0.0  
**Date:** June 12, 2026  
**Status:** Production Ready ✅

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Products & Services](#products--services)
3. [Quick Start (Docker)](#quick-start-docker)
4. [Production Deployment (Kubernetes)](#production-deployment-kubernetes)
5. [Environment Configuration](#environment-configuration)
6. [HOJAI Integration](#hojai-integration)
7. [Health Checks & Monitoring](#health-checks--monitoring)
8. [Troubleshooting](#troubleshooting)
9. [CI/CD Deployment](#cicd-deployment)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NeXha Ecosystem                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐ │
│  │DistributionOS│   │ FranchiseOS  │   │ProcurementOS│   │Manufacturing│ │
│  │  Port: 4300 │   │  Port: 4310  │   │  Port: 4320  │   │ Port: 4330│ │
│  └──────────────┘   └──────────────┘   └──────────────┘   └────────────┘ │
│                              │                                              │
│                     ┌────────┴────────┐                               │
│                     │  Connector    │                               │
│                     │  Port: 4399  │                               │
│                     └────────────────┘                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │ TradeFinance │   │Intelligence │   │   Gateway   │            │
│  │  Port: 4340 │   │  Port: 4350  │   │  Port: 5002 │            │
│  └──────────────┘   └──────────────┘   └──────────────┘            │
│                                    │                                    │
│                          ┌──────────┴──────────┐                     │
│                          │      Portal       │                     │
│                          │     Port: 4388    │                     │
│                          └───────────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Products & Services

| Product | Port | Description | Dockerfile | K8s |
|---------|------|-------------|------------|-----|
| **nexha-gateway** | 5002 | Unified API gateway | ✅ | ✅ |
| **distribution-os** | 4300 | Distributor management | ✅ | ✅ |
| **franchise-os** | 4310 | Franchise operations | ✅ | ✅ |
| **procurement-os** | 4320 | Supplier & RFQ | ✅ | ✅ |
| **manufacturing-os** | 4330 | Production & BOM | ✅ | ✅ |
| **trade-finance** | 4340 | BNPL, credit lines | ✅ | ✅ |
| **intelligence-layer** | 4350 | AI predictions | ✅ | ✅ |
| **ecosystem-connector** | 4399 | Event bus, central hub | ✅ | ✅ |
| **portal** | 4388 | B2B Marketplace | ✅ | ✅ |
| **nextabizz** | 3000 | B2B Procurement | ✅ | ✅ |

---

## 🚀 Quick Start (Docker)

### Prerequisites

- Docker 20+
- Docker Compose v2+
- 8GB RAM minimum

### 1. Clone the Repository

```bash
git clone https://github.com/RTNM-Group/nexha.git
cd nexha
```

### 2. Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit with your values
nano .env
```

### 3. Start All Services

```bash
# Start all services (recommended)
docker-compose up -d

# Or start specific services
docker-compose up -d distribution-os franchise-os

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Verify Services

```bash
# Check all services health
curl http://localhost:5002/health          # Gateway
curl http://localhost:4300/health         # Distribution
curl http://localhost:4310/health        # Franchise
curl http://localhost:4399/health         # Connector
curl http://localhost:4388/health         # Portal
```

### 5. Stop Services

```bash
docker-compose down

# With volumes (clears data)
docker-compose down -v
```

---

## ☸️ Production Deployment (Kubernetes)

### Prerequisites

- Kubernetes 1.28+
- kubectl configured
- Helm 3+ (optional)
- MongoDB Atlas or self-hosted
- Redis Cloud or self-hosted

### 1. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Create Secrets

```bash
# Edit secrets file with real values
nano k8s/secrets.yaml

# Apply secrets
kubectl apply -f k8s/secrets.yaml
```

### 3. Apply ConfigMap

```bash
kubectl apply -f k8s/configmap.yaml
```

### 4. Deploy All Services

```bash
# Deploy in order
kubectl apply -f k8s/nexha-gateway.yaml
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

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods -n nexha

# Check services
kubectl get svc -n nexha

# View logs
kubectl logs -n nexha -l app=nexha-gateway --tail=100

# Check rollout status
kubectl rollout status deployment/nexha-gateway -n nexha
```

### 6. Expected Output

```
NAME                                    READY   STATUS    RESTARTS   AGE
nexha-gateway-xxxxx-xxxxx             1/1     Running   0          2m
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

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# ========================
# DATABASE
# ========================
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nexha
REDIS_URL=redis://:password@redis-host:6379

# ========================
# AUTHENTICATION
# ========================
AUTH_SERVICE_URL=https://rez-auth-service.onrender.com
INTERNAL_SERVICE_TOKEN=generate-32-char-secure-token
WEBHOOK_SECRET=generate-secure-webhook-secret

# ========================
# PORTS
# ========================
PORT=4000  # Service-specific port

# ========================
# SERVICE URLS
# ========================
DISTRIBUTION_OS_URL=http://nexha-distribution-os
FRANCHISE_OS_URL=http://nexha-franchise-os
PROCUREMENT_OS_URL=http://nexha-procurement-os
MANUFACTURING_OS_URL=http://nexha-manufacturing-os
TRADE_FINANCE_URL=http://nexha-trade-finance
INTELLIGENCE_URL=http://nexha-intelligence
CONNECTOR_URL=http://nexha-ecosystem-connector

# ========================
# HOJAI INTEGRATION
# ========================
HOJAI_BRIDGE_URL=http://hojai-bridge:5140
HOJAI_MEMORY_URL=http://hojai-memory:4520
HOJAI_INTELLIGENCE_URL=http://hojai-intelligence:4530

# ========================
# MONITORING
# ========================
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info
```

---

## 🔗 HOJAI Integration

### Architecture

```
HOJAI Bridge (5140) ← → Nexha Gateway (5002)
                              ↓
              ┌─────────────────────────────┐
              │      Nexha OS Services     │
              │  Distribution • Franchise  │
              │  Procurement • Manufacturing│
              │  TradeFinance • Intelligence│
              └─────────────────────────────┘
```

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/nexha/:company/franchise` | Get franchise data |
| `GET /api/nexha/:company/distribution` | Get distribution network |
| `GET /api/nexha/:company/procurement` | Get procurement data |
| `POST /api/nexha/demand-signal` | Emit demand event |
| `POST /api/nexha/rfq` | Create RFQ |

### Configure HOJAI Bridge

```bash
# In HOJAI Bridge .env
NEXHA_URL=http://localhost:4399
NEXHA_DISTRIBUTION_URL=http://localhost:4300
NEXHA_FRANCHISE_URL=http://localhost:4310
NEXHA_PROCUREMENT_URL=http://localhost:4320
NEXHA_MANUFACTURING_URL=http://localhost:4330
NEXHA_FINANCE_URL=http://localhost:4340
NEXHA_INTELLIGENCE_URL=http://localhost:4350
```

---

## 📊 Health Checks & Monitoring

### Health Endpoints

```bash
# Gateway
curl http://localhost:5002/health | jq

# All services status
curl http://localhost:5002/api/status/services | jq

# Individual services
curl http://localhost:4300/health  # Distribution
curl http://localhost:4310/health  # Franchise
curl http://localhost:4320/health  # Procurement
curl http://localhost:4330/health  # Manufacturing
curl http://localhost:4340/health  # TradeFinance
curl http://localhost:4350/health  # Intelligence
curl http://localhost:4399/health  # Connector
```

### Prometheus Metrics

```bash
# All services expose /metrics
curl http://localhost:5002/metrics
curl http://localhost:4300/metrics
# ... etc
```

### Key Metrics

| Metric | Description |
|--------|-------------|
| `http_requests_total` | Total HTTP requests |
| `http_request_duration_seconds` | Request latency |
| `db_operations_total` | Database operations |
| `business_events_total` | Business events |

---

## 🔧 Troubleshooting

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
# Test MongoDB connection
kubectl run mongo-test --image=mongo --rm -it -- \
  mongosh --host mongodb "mongodb://localhost:27017/test"
```

### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n nexha

# Increase limits
kubectl patch deployment nexha-gateway -n nexha \
  --patch '{"spec":{"template":{"spec":{"containers":[{"resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

### Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/nexha-gateway -n nexha

# To specific revision
kubectl rollout undo deployment/nexha-gateway --to-revision=2 -n nexha
```

---

## 🚀 CI/CD Deployment

### GitHub Actions Workflow

The repository includes automated CI/CD via GitHub Actions:

1. **Push to main** → Builds all Docker images → Deploys to production
2. **Push to develop** → Deploys to staging
3. **Pull Request** → Runs tests → Creates preview

### Manual Deployment

```bash
# Deploy via GitHub Actions
gh workflow run deploy.yml -f environment=staging

# Or use kubectl directly
kubectl apply -f k8s/ -n nexha
```

---

## 📁 Project Structure

```
nexha/
├── docker-compose.yml          # Docker Compose
├── k8s/                       # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── nexha-gateway.yaml
│   ├── distribution-os.yaml
│   ├── franchise-os.yaml
│   ├── procurement-os.yaml
│   ├── manufacturing-os.yaml
│   ├── trade-finance.yaml
│   ├── intelligence-layer.yaml
│   ├── ecosystem-connector.yaml
│   ├── portal.yaml
│   └── ingress.yaml
├── distribution-os/           # Distributor service
├── franchise-os/             # Franchise service
├── procurement-os/           # Procurement service
├── manufacturing-os/         # Manufacturing service
├── trade-finance/            # Trade finance service
├── intelligence-layer/       # Intelligence service
├── ecosystem-connector/      # Event bus service
├── nexha-gateway/           # API gateway
├── portal/                   # Next.js frontend
├── shared/                   # Shared packages
├── .github/workflows/        # CI/CD
├── DEPLOYMENT.md             # This file
├── PRODUCTION.md             # Production guide
└── HOJAI-INTEGRATION.md     # HOJAI integration
```

---

## 📞 Support

- **GitHub Issues:** https://github.com/RTNM-Group/nexha/issues
- **Documentation:** https://github.com/RTNM-Group/nexha#readme

---

**Last Updated:** June 12, 2026