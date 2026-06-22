# NeXha - Source of Truth

> **Last Updated:** June 13, 2026
> **Status:** Production Ready + Full Transaction Flow + Supplier Agent Network
> **Version:** 3.0.0

---

## What is NeXha?

**NeXha** is the Unified Commerce Network Infrastructure for RTNM Group.
- Positioned as "The Operating System for Commerce Networks"
- Connects manufacturers, distributors, franchises, retailers, suppliers, and merchants
- Provides infrastructure for B2B commerce operations

---

## Products

| Product | Description |
|---------|-------------|
| **NeXha OS** | Core infrastructure services (8 microservices) |
| **NextaBizz** | B2B Procurement Platform (see `nextabizz/`) |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          NeXha Ecosystem                              │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐ │
│  │Distribution│  │ Franchise  │  │Procurement│  │ Manufacturing │ │
│  │   OS     │  │    OS     │  │    OS     │  │      OS       │ │
│  │  :4300   │  │   :4310   │  │  :4320    │  │    :4330      │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────┘ │
│                            │                                          │
│                    ┌───────┴───────┐                              │
│                    │   Connector  │                              │
│                    │    :4399     │                              │
│                    └───────────────┘                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│  │TradeFinance│  │Intelligence│  │  Portal   │                  │
│  │  :4340    │  │  :4350     │  │  :4388    │                  │
│  └────────────┘  └────────────┘  └────────────┘                  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    NextaBizz (B2B Procurement)              │  │
│  │  ├── Web App (Dashboard)  ├── Supplier Portal              │  │
│  │  ├── Auto-RFQ Engine     └── Integration Services          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Mobile App (Expo React Native)           │  │
│  │  ├── Distributors  ├── Suppliers  ├── Credit  ├── RFQs     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Design System

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#6366f1` | Buttons, links, accents |
| Secondary | `#8b5cf6` | Gradients, highlights |
| Accent | `#f59e0b` | CTAs, warnings |
| Success | `#22c55e` | Verified, success states |
| Error | `#ef4444` | Error states |
| Background | `#0a0a0f` | Page background |
| Surface | `rgba(20,20,35,0.8)` | Cards, modals |
| Text | `#ffffff` | Primary text |
| Text Muted | `#64748b` | Secondary text |
| Border | `rgba(255,255,255,0.05)` | Card borders |

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| H1 | Inter | 800 | 2.5rem+ |
| H2 | Inter | 700 | 2rem |
| H3 | Inter | 600 | 1.25rem |
| Body | Inter | 400 | 1rem |
| Small | Inter | 500 | 0.875rem |
| Caption | Inter | 500 | 0.75rem |

### Gradients

```css
/* Primary */
background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);

/* Success */
background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);

/* Warning */
background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
```

### Spacing

| Name | Value | Usage |
|------|-------|-------|
| xs | 0.5rem | Tight spacing |
| sm | 1rem | Small gaps |
| md | 1.5rem | Standard gaps |
| lg | 2rem | Section padding |
| xl | 4rem | Large sections |
| 2xl | 6rem | Hero sections |

---

## Services Inventory

### Core OS Services

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| **Nexha Gateway** | 5002 | - | Unified API gateway (HOJAI Bridge entry) |
| **DistributionOS** | 4300 | nexha_distribution | Distributor management, van sales, route optimization, delivery tracking, returns |
| **FranchiseOS** | 4310 | nexha_franchise | Multi-location franchise operations, royalty, compliance monitoring |
| **ProcurementOS** | 4320 | nexha_procurement | Supplier network, RFQ, Supplier Agent, Deal State Machine, capability matching |
| **ManufacturingOS** | 4330 | nexha_manufacturing | Production & BOM management |
| **TradeFinance** | 4340 | nexha_finance | BNPL, credit lines, invoice financing, FX conversion, dispute resolution |
| **Intelligence** | 4350 | nexha_intelligence | AI predictions (Exponential Smoothing), fraud detection, churn prediction |
| **Connector** | 4399 | nexha_connector | Central event bus, cross-OS orchestration with real API calls |
| **Portal** | 4388 | - | B2B Infrastructure Marketplace (Next.js) |
| **NextaBizz** | 3000 | Supabase | B2B Procurement Platform |

### Mobile App

| Screen | Description |
|--------|-------------|
| Login | OTP authentication |
| Home | Dashboard with menu |
| Distributors | Find distributors |
| Suppliers | Find suppliers (NextaBizz) |
| Franchises | Browse franchises |
| Credit | BNPL & credit management |
| RFQs | Track requests |
| Profile | User settings |

### NextaBizz Services

| Component | Location | Description |
|-----------|----------|-------------|
| **Web Dashboard** | `nextabizz/apps/web/` | B2B procurement dashboard |
| **Supplier Portal** | `nextabizz/apps/supplier-portal/` | Supplier-facing portal |
| **Auto-RFQ Engine** | `nextabizz/services/auto-rfq/` | Auto-generate RFQs from inventory |
| **Scoring Engine** | `nextabizz/services/scoring-engine/` | Supplier performance scoring |
| **Reorder Engine** | `nextabizz/services/reorder-engine/` | Automated reorder suggestions |
| **Payment Settlement** | `nextabizz/services/payment-settlement/` | Payment processing (BNPL, credit, UPI) |
| **Chat Service** | `nextabizz/services/chat/` | Vendor communication |
| **RestoPapa Integration** | `nextabizz/services/integrations/restopapa/` | Inventory signal sync |
| **ReZ Merchant Integration** | `nextabizz/services/integrations/rez-merchant/` | Inventory sync, order sync |
| **Hotel PMS Integration** | `nextabizz/services/integrations/hotel-pms/` | Hotel sync |

### Shared Packages

| Package | Purpose |
|---------|---------|
| `@rez/auth-middleware` | Authentication middleware for all services |
| `@rez/webhook-sdk` | HMAC verification, WebSocket, RBAC, Monitoring |
| `@rez/auth-client` | RABTUL OAuth2 authentication |
| `@rez/shared-types` | Canonical Zod schemas |
| `@rez/event-types` | CloudEvent type definitions |
| `@rez/integration-framework` | Universal partner connectors |

---

## Portal Pages

### Pages Inventory

| Route | File | Description | Design |
|-------|------|-------------|--------|
| `/` | `page.tsx` | Landing page | Dark theme, gradient hero, animated stats |
| `/distributors` | `distributors/page.tsx` | Find distributors | Card grid, filters, search |
| `/manufacturers` | `manufacturers/page.tsx` | Find manufacturers | List view, certifications |
| `/franchises` | `franchises/page.tsx` | Browse franchises | Investment cards, ROI |
| `/suppliers` | `suppliers/page.tsx` | **NextaBizz** | Links to NextaBizz B2B Procurement |

### Portal Features

- Modern dark theme with glassmorphism
- Gradient accents on buttons and icons
- Smooth hover transitions
- Card-based layouts with rounded corners (20-24px)
- Modal dialogs for detail views
- Responsive grid layouts
- Real-time search and filtering
- Animated counters and statistics

---

## API Reference

### DistributionOS (Port 4300)

```
POST   /api/distributors              Create distributor
GET    /api/distributors             List distributors
GET    /api/distributors/:id         Get distributor
PATCH  /api/distributors/:id         Update distributor
POST   /api/distributors/:id/activate
POST   /api/distributors/:id/suspend
GET    /api/distributors/:id/performance
POST   /api/van-sales               Create van sale
POST   /api/van-sales/:id/start      Start van sale
POST   /api/van-sales/:id/complete   Complete van sale
POST   /api/collections              Record collection
POST   /api/routes                  Create route
```

### FranchiseOS (Port 4310)

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

### ProcurementOS (Port 4320)

```
POST   /api/suppliers               Register supplier
GET    /api/suppliers              Search suppliers
GET    /api/suppliers/:id           Get supplier
GET    /api/suppliers/:id/capabilities
POST   /api/suppliers/:id/capabilities
GET    /api/suppliers/match        Match suppliers to requirements
GET    /api/marketplace/products    Browse products
POST   /api/rfqs                   Create RFQ
GET    /api/rfqs                   List RFQs
GET    /api/rfqs/:id               Get RFQ with quotes
POST   /api/rfqs/:id/close        Close RFQ
POST   /api/rfqs/:id/quotes/:quoteId/accept
POST   /api/deals                  Create deal
GET    /api/deals                  List deals
GET    /api/deals/:id              Get deal
POST   /api/deals/:id/quotes       Record quote
POST   /api/deals/:id/award       Award deal
PATCH  /api/deals/:id/fulfillment  Update fulfillment
POST   /api/deals/:id/payment      Settle payment
POST   /api/deals/:id/cancel       Cancel deal
POST   /api/deals/:id/complete     Complete deal
GET    /api/deals/:id/best-quote   Get best quote
GET    /api/deals/stats/all        Deal statistics
GET    /api/agents/sessions/:dealId
GET    /api/agents/sessions/:dealId/messages
POST   /api/agents/rfq             Send RFQ to supplier
POST   /api/agents/response        Record supplier response
POST   /api/agents/sessions/:dealId/remind
POST   /api/agents/sessions/:dealId/counter
POST   /api/orders/from-quote/:id  Create order from quote
```

### ManufacturingOS (Port 4330)

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

### TradeFinance (Port 4340)

```
POST   /api/credits/apply           Apply for credit
GET    /api/credits/:id            Get credit line
POST   /api/credits/:id/approve    Approve credit
POST   /api/credits/:id/use        Use credit
POST   /api/bnpl/create           Create BNPL transaction
POST   /api/bnpl/:id/pay           Make BNPL payment
POST   /api/loans/apply            Apply for loan
POST   /api/invoices/finance      Finance invoice
GET    /api/fx/rates              Get FX rates
GET    /api/fx/rates/:from/:to    Get specific rate
POST   /api/fx/convert            Convert currency
GET    /api/disputes              List disputes
POST   /api/disputes             Create dispute
GET    /api/disputes/:id         Get dispute
POST   /api/disputes/:id/evidence Add evidence
POST   /api/disputes/:id/messages Add message
POST   /api/disputes/:id/escalate Escalate dispute
POST   /api/disputes/:id/resolve  Resolve dispute
```

### Intelligence (Port 4350)

```
POST   /api/predict/demand          Forecast demand (7-day with MAPE accuracy)
POST   /api/predict/reorder         Get reorder recommendation
POST   /api/score/supplier         Score supplier (weighted metrics)
POST   /api/insights/territory     Get territory insights
POST   /api/detect/fraud           Detect fraud risk (velocity analysis)
POST   /api/predict/churn          Predict churn (RFM scoring)
GET    /api/analytics/overview     Analytics overview
```

### Connector (Port 4399)

```
POST   /api/events/demand           Emit demand signal
POST   /api/events/order           Emit order event
POST   /api/events/quote           Emit quote received
POST   /api/events/deal/award      Emit deal awarded
POST   /api/events/payment         Emit payment received
POST   /api/events                 Publish custom event
GET    /api/events/history         Event history
GET    /api/status/services        Service status
POST   /webhooks/rez-merchant      REZ Merchant webhook
POST   /webhooks/nextabizz         NextaBizz webhook
POST   /webhooks/rez-intelligence  REZ Intelligence webhook
```

---

## Tests

### Test Files

| File | Coverage |
|------|----------|
| `tests/distribution.test.ts` | Distributor CRUD, Van Sales, Collections |
| `tests/franchise.test.ts` | Franchise lifecycle, Royalty calculations |
| `tests/intelligence.test.ts` | Demand forecasting, Fraud detection, Churn prediction |

### Running Tests

```bash
pnpm test
```

---

## CI/CD Pipeline

### GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR | Lint, Type check, Test, Build |
| `deploy.yml` | Manual | Staging/Production deployment |
| `schedule.yml` | Daily | Dependency checks |

### CI Pipeline Steps

```
Push → CI Workflow
  ├── Lint (ESLint)
  ├── Type Check (TypeScript)
  ├── Test (Jest)
  └── Build (TypeScript)
       │
       └── (on main branch)
            └── Docker Build & Push

Manual → Deploy Workflow
  ├── Staging deployment
  └── Production deployment
```

---

## Mobile App

### NeXha Mobile (React Native/Expo)

**Location:** `mobile/`

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/` | OTP authentication |
| Home | `/home` | Main dashboard |
| Distributors | `/distributors` | Find distributors |
| Franchises | `/franchises` | Browse opportunities |
| RFQs | `/rfq` | Manage RFQs |
| Profile | `/profile` | Account settings |

### Tech Stack

- React Native (Expo)
- React Navigation
- TanStack Query
- Zustand

---

## Integration Points

### REZ Ecosystem

| Service | Port | Integration |
|---------|------|-------------|
| REZ Merchant | 4003 | Merchant operations |
| REZ Intelligence | 4018 | Demand predictions |
| RABTUL Auth | 4002 | Authentication |

### External

| Service | Purpose |
|---------|---------|
| MongoDB | Primary database |
| Redis | Caching, queues |
| NextaBizz | Supplier marketplace |

---

## RBAC Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full system access |
| `admin` | Platform administration |
| `distributor_owner` | Manage own distributor |
| `distributor_manager` | Day-to-day distributor ops |
| `franchise_owner` | Manage own franchise |
| `franchise_manager` | Day-to-day franchise ops |
| `supplier_owner` | Manage own supplier |
| `supplier_manager` | Day-to-day supplier ops |
| `merchant_owner` | Manage own merchant |
| `merchant_staff` | Merchant operations |
| `auditor` | Read-only audit access |
| `support` | Support operations |

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

**Key Metrics:**
- `http_requests_total` - Request counter
- `http_request_duration_seconds` - Latency histogram
- `db_operations_total` - Database operations
- `business_events_total` - Business events

---

## Security Checklist

- [x] HMAC webhook verification (all 8 services)
- [x] RABTUL Auth integration
- [x] RBAC permissions (12 roles)
- [x] Rate limiting (express-rate-limit)
- [x] Input validation (Zod schemas)
- [x] CORS configuration
- [x] Timing-safe token comparison
- [x] crypto.randomInt() for secure randomness
- [x] Audit logging
- [x] TLS/HTTPS (via ingress)

---

## Unit Tests

| Test File | Coverage |
|-----------|----------|
| `tests/distribution.test.ts` | DistributionOS |
| `tests/franchise.test.ts` | FranchiseOS |
| `tests/intelligence.test.ts` | IntelligenceLayer |
| `tests/procurement.test.ts` | ProcurementOS |
| `tests/manufacturing.test.ts` | ManufacturingOS |
| `tests/trade-finance.test.ts` | TradeFinance |
| `tests/connector.test.ts` | EcosystemConnector |

---

## Deployment

### Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

---

## Complete File Inventory

```
nexha/
├── docs/
│   ├── swagger.yaml              ← OpenAPI 3.0 spec
│   └── DEPLOYMENT.md            ← Deployment guide
├── tests/
│   ├── setup.ts
│   ├── distribution.test.ts
│   ├── franchise.test.ts
│   └── intelligence.test.ts
├── .github/workflows/
│   ├── ci.yml                  ← CI pipeline
│   ├── deploy.yml              ← Deployment
│   └── schedule.yml             ← Scheduled tasks
├── mobile/                      ← React Native app
│   ├── App.tsx
│   ├── src/screens/
│   └── README.md
├── portal/                      ← Next.js frontend
│   ├── src/app/
│   │   ├── page.tsx             ← Landing page
│   │   ├── distributors/page.tsx
│   │   ├── franchises/page.tsx
│   │   ├── manufacturers/page.tsx
│   │   └── suppliers/page.tsx
│   └── next.config.js
├── shared/
│   ├── webhook-sdk/
│   ├── auth-client/
│   ├── shared-types/
│   └── integration-framework/
├── distribution-os/              ← Port 4300
├── franchise-os/                 ← Port 4310
├── procurement-os/              ← Port 4320
├── manufacturing-os/             ← Port 4330
├── trade-finance/               ← Port 4340
├── intelligence-layer/          ← Port 4350
├── ecosystem-connector/         ← Port 4399
├── k8s/                        ← Kubernetes manifests
├── scripts/
│   ├── init-db.ts              ← Database setup
│   └── seed.ts                 ← Test data
├── docker-compose.yml
├── package.json                 ← Workspace root
├── .env.example
├── CLAUDE.md                   ← Development guide
└── SOT.md                     ← This document
```

---

## Quick Commands

```bash
# Install
pnpm install

# Build
pnpm build

# Initialize database
npx tsx scripts/init-db.ts

# Seed test data
npx tsx scripts/seed.ts

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm type-check

# Run services
pnpm dev:portal       # Port 4388
pnpm dev:distribution # Port 4300
pnpm dev:franchise     # Port 4310
pnpm dev:procurement  # Port 4320
pnpm dev:manufacturing # Port 4330
pnpm dev:finance      # Port 4340
pnpm dev:intelligence  # Port 4350
pnpm dev:connector     # Port 4399
```

---

## Next Steps

1. Connect to production MongoDB Atlas
2. Wire up RABTUL Auth service
3. Deploy to Kubernetes cluster
4. Configure Prometheus + Grafana
5. Set up Sentry error tracking
6. Write more integration tests
7. Add API documentation (Swagger UI)

---

## Contact

**Owner:** RTNM Group
**Documentation:** `RTNM-Group/nexha/CLAUDE.md`
**Design System:** This SOT - Design System section
