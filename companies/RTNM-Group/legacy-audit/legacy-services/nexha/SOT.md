# NeXha - Source of Truth

> **Last Updated:** May 22, 2026
> **Status:** Production Ready
> **Version:** 1.0.0

---

## What is NeXha?

**NeXha** is the Unified Commerce Network Infrastructure for RTNM Group.
- Positioned as "The Operating System for Commerce Networks"
- Connects manufacturers, distributors, franchises, retailers, suppliers, and merchants
- Provides infrastructure for B2B commerce operations

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NeXha Ecosystem                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐ │
│  │DistributionOS│   │ FranchiseOS  │   │ProcurementOS│   │Manufacturing│ │
│  │    :4300    │   │    :4310    │   │    :4320    │   │    :4330  │ │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └────────────┘ │
│         └───────────────────┼───────────────────┘                          │
│                             │                                              │
│                    ┌────────┴────────┐                                     │
│                    │  Ecosystem     │                                     │
│                    │  Connector     │                                     │
│                    │    :4399      │                                     │
│                    └────────┬────────┘                                     │
│                             │                                              │
│  ┌──────────────┐   ┌────────┴────────┐   ┌──────────────┐              │
│  │ TradeFinance │   │Intelligence   │   │   Portal     │              │
│  │    :4340    │   │    :4350     │   │    :4388    │              │
│  └──────────────┘   └───────────────┘   └──────────────┘              │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Services Inventory

### Core OS Services

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| **Portal** | 4388 | - | B2B Infrastructure Marketplace (Next.js) |
| **DistributionOS** | 4300 | nexha_distribution | Distributor & wholesaler management |
| **FranchiseOS** | 4310 | nexha_franchise | Multi-location franchise operations |
| **ProcurementOS** | 4320 | nexha_procurement | Supplier network & RFQ |
| **ManufacturingOS** | 4330 | nexha_manufacturing | Production & BOM management |
| **TradeFinance** | 4340 | nexha_finance | BNPL, credit lines, invoice financing |
| **Intelligence** | 4350 | - | AI predictions & analytics |
| **Connector** | 4399 | - | Central event bus & orchestration |

### Shared Packages

| Package | Purpose |
|---------|---------|
| `@rez/webhook-sdk` | HMAC verification, WebSocket, RBAC, Monitoring |
| `@rez/auth-client` | RABTUL OAuth2 authentication |
| `@rez/shared-types` | Canonical Zod schemas |
| `@rez/integration-framework` | Universal partner connectors |

---

## Service Details

### DistributionOS (Port 4300)

**Purpose:** Manages distributors, wholesalers, and stockists

**Features:**
- Distributor registration & onboarding
- Van sale tracking
- Route management
- Collection tracking
- Retailer linking
- Performance scoring

**API Endpoints:**
```
POST   /api/distributors              Create distributor
GET    /api/distributors             List distributors
GET    /api/distributors/:id         Get distributor
PATCH  /api/distributors/:id         Update distributor
POST   /api/distributors/:id/activate
POST   /api/distributors/:id/suspend
GET    /api/distributors/:id/performance
POST   /api/van-sales               Create van sale
POST   /api/van-sales/:id/start     Start van sale
POST   /api/van-sales/:id/complete  Complete van sale
POST   /api/collections             Record collection
POST   /api/routes                  Create route
```

**Health:** `GET /health` | **Metrics:** `GET /metrics`

---

### FranchiseOS (Port 4310)

**Purpose:** Multi-location franchise management

**Features:**
- Franchise registration
- Brand management
- Royalty calculations
- Performance tracking
- Franchisee onboarding

**API Endpoints:**
```
POST   /api/franchises              Create franchise
GET    /api/franchises             List franchises
GET    /api/franchises/:id         Get franchise
POST   /api/franchises/:id/activate
POST   /api/franchises/:id/suspend
POST   /api/franchises/:id/performance
POST   /api/franchises/:id/royalty/calculate
POST   /api/brands                 Create brand
GET    /api/brands                 List brands
GET    /api/brands/:id             Get brand
GET    /api/brands/:id/stats       Get brand stats
```

---

### ProcurementOS (Port 4320)

**Purpose:** B2B marketplace and supplier network

**Features:**
- Supplier discovery
- RFQ creation and management
- Quote comparison
- Order placement
- Marketplace browsing

**API Endpoints:**
```
POST   /api/suppliers               Register supplier
GET    /api/suppliers              Search suppliers
GET    /api/marketplace/products   Browse products
POST   /api/rfqs                   Create RFQ
GET    /api/rfqs/:id               Get RFQ
POST   /api/rfqs/:id/open          Open RFQ
POST   /api/rfqs/:id/quotes        Submit quote
POST   /api/rfqs/:id/award/:quoteId  Award quote
POST   /api/orders/from-quote/:id  Create order from quote
```

---

### ManufacturingOS (Port 4330)

**Purpose:** Production & supply chain management

**Features:**
- Bill of Materials (BOM)
- Production orders
- Batch tracking
- Quality control
- MRP calculations

**API Endpoints:**
```
POST   /api/boms                    Create BOM
GET    /api/boms/:id                Get BOM
POST   /api/production/orders       Create production order
POST   /api/production/orders/:id/start
POST   /api/production/orders/:id/complete
POST   /api/batches/:id/quality-check
POST   /api/batches/:id/approve
POST   /api/batches/:id/release
GET    /api/mrp/requirements/:productId
```

---

### TradeFinance (Port 4340)

**Purpose:** Working capital and credit services

**Features:**
- Credit lines for businesses
- BNPL (Buy Now Pay Later)
- Invoice financing
- Working capital loans

**API Endpoints:**
```
POST   /api/credits/apply           Apply for credit
GET    /api/credits/:id            Get credit line
POST   /api/credits/:id/approve    Approve credit
POST   /api/credits/:id/use       Use credit
POST   /api/bnpl/create            Create BNPL transaction
POST   /api/bnpl/:id/pay          Make BNPL payment
POST   /api/loans/apply           Apply for loan
POST   /api/invoices/finance       Finance invoice
```

---

### Intelligence (Port 4350)

**Purpose:** AI predictions and analytics

**Features:**
- Demand forecasting
- Reorder recommendations
- Supplier scoring
- Territory insights
- Fraud detection
- Churn prediction

**API Endpoints:**
```
POST   /api/predict/demand          Forecast demand
POST   /api/predict/reorder         Get reorder recommendation
POST   /api/score/supplier         Score supplier
POST   /api/insights/territory     Get territory insights
POST   /api/detect/fraud            Detect fraud risk
POST   /api/predict/churn           Predict churn
GET    /api/analytics/overview      Analytics overview
```

---

### Ecosystem Connector (Port 4399)

**Purpose:** Central hub for cross-service communication

**Features:**
- Event bus
- Cross-OS workflows
- Webhook hub
- Service status

**API Endpoints:**
```
POST   /api/events/demand           Emit demand signal
POST   /api/events/order           Emit order event
POST   /api/events                 Publish custom event
GET    /api/events/history         Event history
GET    /api/status/services        Service status
POST   /webhooks/rez-merchant      REZ Merchant webhook
POST   /webhooks/nextabizz         NextaBizz webhook
POST   /webhooks/rez-intelligence REZ Intelligence webhook
```

---

## Event Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           EVENT FLOW DIAGRAM                               │
└──────────────────────────────────────────────────────────────────────────────┘

1. DEMAND SIDE
   Consumer Orders → REZ Merchant → NextaBizz → Inventory Signal
                                              ↓
2. MARKETPLACE (NEXTABIZZ)
   RFQ Created → Quotes → Order → Fulfillment

3. INFRASTRUCTURE (NEXHA)
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │DistributionOS│───▶│ProcurementOS│───▶│Manufacturing│
   └─────────────┘     └─────────────┘     └─────────────┘
         │                   │                    │
         └───────────────────┼────────────────────┘
                             ↓
                    ┌─────────────────┐
                    │ Intelligence     │
                    │ (Predictions)   │
                    └─────────────────┘
```

---

## Integration Points

### REZ Ecosystem
| Service | Port | Integration |
|---------|------|-------------|
| REZ Merchant | 4003 | Merchant operations, inventory |
| REZ Intelligence | 4018 | Demand predictions, fraud detection |
| RABTUL Auth | 4002 | Authentication |

### External
| Service | Integration |
|---------|-------------|
| MongoDB | Primary database |
| Redis | Caching, queues |
| RABTUL Services | Auth, wallet, payments |

---

## Deployment

### Docker
```bash
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

### Environment
See `.env.example` for all variables.

---

## Quick Commands

```bash
# Install
pnpm install

# Build
pnpm build

# Initialize DB
npx tsx scripts/init-db.ts

# Seed data
npx tsx scripts/seed.ts

# Run services
pnpm dev:portal       # Port 4388
pnpm dev:distribution # Port 4300
pnpm dev:franchise    # Port 4310
pnpm dev:procurement  # Port 4320
pnpm dev:manufacturing # Port 4330
pnpm dev:finance      # Port 4340
pnpm dev:intelligence  # Port 4350
pnpm dev:connector     # Port 4399
```

---

## RBAC Roles

| Role | Description |
|------|-------------|
| super_admin | Full system access |
| admin | Platform administration |
| distributor_owner | Manage own distributor |
| distributor_manager | Day-to-day distributor ops |
| franchise_owner | Manage own franchise |
| franchise_manager | Day-to-day franchise ops |
| supplier_owner | Manage own supplier |
| supplier_manager | Day-to-day supplier ops |
| merchant_owner | Manage own merchant |
| merchant_staff | Merchant operations |
| auditor | Read-only audit access |
| support | Support operations |

---

## Metrics & Monitoring

### Health Check
```bash
curl http://localhost:4300/health
```

### Prometheus Metrics
```bash
curl http://localhost:4300/metrics
```

Key metrics:
- `http_requests_total` - Request counter
- `http_request_duration_seconds` - Latency histogram
- `db_operations_total` - Database operations
- `business_events_total` - Business events

---

## Security

- [x] HMAC webhook verification
- [x] RABTUL Auth integration
- [x] RBAC permissions
- [x] Rate limiting
- [x] Audit logging
- [x] TLS/HTTPS (via ingress)

---

## Status

| Component | Status | Notes |
|-----------|--------|-------|
| All Services | ✅ Ready | 8 services deployed |
| Database Layer | ✅ Ready | MongoDB with indexes |
| Auth | ✅ Ready | RABTUL integration |
| Monitoring | ✅ Ready | Prometheus + Sentry |
| WebSocket | ✅ Ready | Real-time events |
| Docker | ✅ Ready | docker-compose.yml |
| Kubernetes | ✅ Ready | k8s/ manifests |
| Documentation | ✅ Ready | CLAUDE.md + docs/ |

---

## Files

| File | Description |
|------|-------------|
| `package.json` | Root package with workspaces |
| `docker-compose.yml` | Full stack deployment |
| `.env.example` | Environment template |
| `CLAUDE.md` | Development documentation |
| `docs/DEPLOYMENT.md` | Deployment guide |
| `k8s/` | Kubernetes manifests |
| `scripts/init-db.ts` | Database initialization |
| `scripts/seed.ts` | Test data generator |

---

## Next Steps

1. Connect to production MongoDB Atlas
2. Wire up RABTUL Auth service
3. Deploy to Kubernetes cluster
4. Configure Prometheus + Grafana
5. Set up Sentry error tracking
6. Add API documentation (Swagger)
7. Write integration tests

---

## Contact

**Owner:** RTNM Group
**Documentation:** `RTNM-Group/nexha/CLAUDE.md`
