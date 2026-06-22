# NeXha - Unified Commerce Network Infrastructure

> **"The Operating System for Commerce Networks"**

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://github.com/RTNM-Group/nexha)
[![Version](https://img.shields.io/badge/Version-3.0.0-brightgreen)](https://github.com/RTNM-Group/nexha)
[![GitHub Actions](https://github.com/RTNM-Group/nexha/workflows/CI/badge.svg)](https://github.com/RTNM-Group/nexha/actions)

---

## 🎯 Overview

NeXha is a comprehensive commerce network infrastructure connecting manufacturers, distributors, franchises, retailers, suppliers, and merchants. It provides 10 microservices for B2B commerce operations with full transaction flow and supplier agent network.

### Key New Features (June 13, 2026)
- **Supplier Agent** — Multi-channel communication (Email, SMS, WhatsApp, API)
- **Deal State Machine** — Full RFQ → Quote → Negotiation → Award → Order → Payment lifecycle
- **Ecosystem Orchestrator** — Real API calls with event chaining
- **Capability Matching** — 7-dimension supplier scoring
- **Route Optimization** — TSP algorithm with Haversine distance
- **Delivery Tracking** — GPS + ETA + status updates
- **FX Currency Conversion** — INR/USD/EUR/GBP
- **Dispute Resolution** — Evidence, messages, escalation
- **Compliance Monitoring** — Audit scheduling, checklists, violations
- **Real ML Forecasting** — Exponential Smoothing with MAPE accuracy

## 📦 Products

| Product | Port | Description |
|---------|------|-------------|
| **Nexha Gateway** | 5002 | Unified API gateway (HOJAI Bridge entry) |
| **DistributionOS** | 4300 | Distributor & wholesaler management |
| **FranchiseOS** | 4310 | Multi-location franchise operations |
| **ProcurementOS** | 4320 | B2B marketplace & RFQ |
| **ManufacturingOS** | 4330 | Production & BOM management |
| **TradeFinance** | 4340 | BNPL, credit lines, working capital |
| **Intelligence** | 4350 | AI predictions & analytics |
| **Ecosystem Connector** | 4399 | Event bus, central hub |
| **Portal** | 4388 | B2B Marketplace (Next.js) |
| **NextaBizz** | 3000 | B2B Procurement Platform |

## 🚀 Quick Start

### Docker Compose (Local)

```bash
# Clone
git clone https://github.com/RTNM-Group/nexha.git
cd nexha

# Start all services
docker-compose up -d

# Check health
curl http://localhost:5002/health
```

### Kubernetes (Production)

```bash
# Apply all manifests
kubectl apply -f k8s/ -n nexha

# Check status
kubectl get pods -n nexha
```

## 🔗 HOJAI Integration

NeXha integrates with HOJAI SkillNet via the HOJAI Bridge (port 5140):

```bash
# Get franchise data
curl http://localhost:5002/api/nexha/company/franchise

# Get demand predictions
curl -X POST http://localhost:5002/api/predict/demand

# Cross-product insights
curl http://localhost:5002/api/insights/cross-product?company=XYZ
```

## 📊 Monitoring

```bash
# Health checks
curl http://localhost:5002/api/status/services

# Prometheus metrics
curl http://localhost:5002/metrics
```

## 📚 Documentation

- [DEPLOY.md](DEPLOY.md) - Complete deployment guide
- [PRODUCTION.md](PRODUCTION.md) - Production checklist
- [HOJAI-INTEGRATION.md](HOJAI-INTEGRATION.md) - HOJAI integration guide
- [FEATURES-LIST.md](FEATURES-LIST.md) - Complete feature documentation
- [RTNM-COMPANIES-AUDIT.md](RTNM-COMPANIES-AUDIT.md) - Full RTNM ecosystem overview
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](RTNM-PRODUCTS-FEATURES-AUDIT.md) - Complete RTNM product features

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all services
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## 📁 Project Structure

```
nexha/
├── distribution-os/        # Distributor service (4300)
├── franchise-os/         # Franchise service (4310)
├── procurement-os/        # Procurement service (4320)
├── manufacturing-os/      # Manufacturing service (4330)
├── trade-finance/         # Trade finance service (4340)
├── intelligence-layer/    # AI/ML service (4350)
├── ecosystem-connector/    # Event bus (4399)
├── nexha-gateway/         # API gateway (5002)
├── portal/               # Next.js frontend (4388)
├── nextabizz/            # B2B procurement (3000)
├── k8s/                  # Kubernetes manifests
├── docker-compose.yml    # Docker Compose
└── .github/workflows/    # CI/CD
```

## 🔒 Security

- JWT authentication on all 10 services
- RBAC with 12 roles
- HMAC-SHA256 webhook signature verification (mandatory, no bypass)
- Authorization header forwarding in gateway
- Rate limiting
- CORS configuration
- Non-root Docker containers
- Default secrets removed — services fail-fast if not configured
- Graceful shutdown handlers (SIGTERM/SIGINT)
- Distributed tracing with x-trace-id propagation

## 📄 License

Proprietary - RTNM Group

---

## 📚 Complete Documentation

### Core Documentation
- [README.md](README.md) - This file - Overview
- [DEPLOY.md](DEPLOY.md) - Complete deployment guide
- [PRODUCTION.md](PRODUCTION.md) - Production checklist and deployment
- [CLAUDE.md](CLAUDE.md) - Development guide for AI assistants
- [SOT.md](SOT.md) - Source of Truth document
- [FEATURES-LIST.md](FEATURES-LIST.md) - Complete features for all services

### RTNM Ecosystem Documentation
- [RTNM-COMPANIES-AUDIT.md](RTNM-COMPANIES-AUDIT.md) - Complete RTNM ecosystem overview (all companies)
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](RTNM-PRODUCTS-FEATURES-AUDIT.md) - Complete RTNM products & features

---

## 🌐 RTNM Ecosystem Overview

NeXha is part of the RTNM Digital ecosystem where:
- HOJAI AI → provides AI to everyone
- RABTUL Technologies → provides infrastructure to everyone
- Nexha → provides commerce to everyone
- CorpPerks → provides HR/workforce to everyone
- RisaCare → provides healthcare to everyone
- StayOwn → provides hospitality to everyone
- AssetMind → provides financial intel to everyone
- REZ Merchant → provides merchant platform to everyone
- REZ Consumer → provides consumer app to everyone

For complete RTNM ecosystem details, see [RTNM-COMPANIES-AUDIT.md](RTNM-COMPANIES-AUDIT.md)

---

## 📦 All Products & Features

### Microservices (Ports 4300-4399)

| Product | Port | Description |
|---------|------|-------------|
| DistributionOS | 4300 | Distributor & wholesaler management |
| FranchiseOS | 4310 | Multi-location franchise operations |
| ProcurementOS | 4320 | B2B marketplace & RFQ |
| ManufacturingOS | 4330 | Production & BOM management |
| TradeFinance | 4340 | BNPL, credit lines, working capital |
| Intelligence | 4350 | AI predictions & analytics |
| Ecosystem Connector | 4399 | Event bus, central hub |
| Portal | 4388 | B2B Marketplace (Next.js) |
| Nexha Gateway | 5002 | Unified API gateway |
| NextaBizz | 3000 | B2B Procurement Platform |

### Key Features by Service

#### DistributionOS (4300)
- Distributor Management
- Van Sale Operations
- Collection Management
- Route Optimization
- Inventory Tracking
- Commission Calculation

#### FranchiseOS (4310)
- Franchise Network Management
- Brand Management
- Royalty Calculation
- Performance Tracking
- Territory Management

#### ProcurementOS (4320)
- Supplier Directory
- RFQ Management
- Purchase Orders
- Price Comparison
- Quality Rating

#### ManufacturingOS (4330)
- BOM Management
- Production Planning
- Quality Control
- MRP Integration
- Cost Tracking

#### TradeFinance (4340)
- BNPL (Buy Now Pay Later)
- Credit Lines
- Invoice Financing
- EMI Calculator
- Risk Assessment

#### Intelligence (4350)
- Demand Prediction
- Reorder Recommendations
- Supplier Scoring
- Trend Analysis
- Anomaly Detection

#### Ecosystem Connector (4399)
- Event Bus
- Cross-Service Communication
- Webhook Management
- Event History

### HOJAI Integration (Port 5140)

NeXha connects to HOJAI SkillNet for:
- Cross-Product Insights
- Unified User Intelligence
- Event Sharing
- Skill Execution
- Memory Integration
- Intelligence Sharing

See [RTNM-PRODUCTS-FEATURES-AUDIT.md](RTNM-PRODUCTS-FEATURES-AUDIT.md) for complete feature details.

---

## 🔐 Security Features

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ |
| RBAC (12 roles) | ✅ |
| HMAC Webhook Verification | ✅ |
| Rate Limiting | ✅ |
| Zod Input Validation | ✅ |
| CORS Configuration | ✅ |
| Non-root Containers | ✅ |

---

## 📊 Monitoring & Observability

| Feature | Endpoint |
|---------|----------|
| Health Checks | /health |
| Prometheus Metrics | /metrics |
| Service Status | /api/status/services |
| Readiness Probes | K8s configured |

---

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all services
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Start individual service
pnpm dev:distribution
pnpm dev:franchise
pnpm dev:procurement
pnpm dev:manufacturing
pnpm dev:trade-finance
pnpm dev:intelligence
pnpm dev:connector
```

---

## 📁 Project Structure

```
nexha/
├── distribution-os/           # Distributor service (4300)
├── franchise-os/            # Franchise service (4310)
├── procurement-os/          # Procurement service (4320)
├── manufacturing-os/         # Manufacturing service (4330)
├── trade-finance/            # Trade finance service (4340)
├── intelligence-layer/       # Intelligence service (4350)
├── ecosystem-connector/      # Event bus (4399)
├── nexha-gateway/           # API gateway (5002)
├── portal/                 # Frontend (4388)
├── nextabizz/              # B2B Procurement (3000)
├── shared/                 # Shared packages
├── k8s/                   # Kubernetes manifests
├── docs/                   # Additional docs
├── docker-compose.yml      # Docker Compose
├── .github/workflows/      # CI/CD
└── *.md                   # All documentation
```

---

## 📞 Support & Links

- **GitHub:** https://github.com/RTNM-Group/nexha
- **Issues:** https://github.com/RTNM-Group/nexha/issues
- **RTNM Ecosystem:** See RTNM-COMPANIES-AUDIT.md

---

## 📄 License

Proprietary - RTNM Group

**Last Updated:** June 12, 2026