# NeXha - CLAUDE.md

## What is NeXha?

**NeXha** is the Unified Commerce Network Infrastructure for RTNM Group.
- Positioned as "The Operating System for Commerce Networks"
- Connects manufacturers, distributors, franchises, retailers, suppliers, and merchants
- **Products:** NeXha OS + NextaBizz (B2B Procurement)

## Products

| Product | Description | Location |
|---------|-------------|----------|
| **NeXha OS** | Core microservices (10 services) | `./` |
| **NextaBizz** | B2B Procurement Platform (Supabase-backed) | `./nextabizz/` |

## Quick Start

```bash
cd RTNM-Group/nexha
pnpm install
pnpm dev:portal    # Start portal (port 4388)
pnpm dev:distribution  # Start DistributionOS
pnpm dev:nextabizz  # Start NextaBizz
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Nexha Gateway** | 5002 | Unified API gateway (HOJAI Bridge entry) |
| **DistributionOS** | 4300 | Distributor management, van sales, route optimization, delivery tracking, returns |
| **FranchiseOS** | 4310 | Franchise operations, royalty calculation, compliance monitoring |
| **ProcurementOS** | 4320 | Supplier & RFQ, Supplier Agent, Deal State Machine, capability matching |
| **ManufacturingOS** | 4330 | Production & BOM |
| **TradeFinance** | 4340 | BNPL, credit lines, FX conversion, dispute resolution |
| **Intelligence** | 4350 | AI predictions (Exponential Smoothing), fraud detection, churn prediction |
| **Ecosystem Connector** | 4399 | Event bus, cross-OS orchestration with real API calls |
| **Portal** | 4388 | B2B Marketplace (Next.js) |
| **NextaBizz** | 3000 | B2B Procurement Platform (Supabase-backed) |

## Security (Hardened June 13, 2026)

- ✅ Authentication on all 10 services
- ✅ RBAC with 12 roles
- ✅ Webhook signature verification (HMAC-SHA256) — mandatory, no bypass
- ✅ Rate limiting (express-rate-limit)
- ✅ Input validation (Zod schemas)
- ✅ CORS configured
- ✅ Timing-safe token comparison (crypto.timingSafeEqual)
- ✅ Math.random() → crypto.randomInt()
- ✅ MongoDB connected to all 6 core services
- ✅ Authorization header forwarding in gateway (all routes)
- ✅ Default webhook secrets removed — services fail-fast if not configured
- ✅ Graceful shutdown handlers (SIGTERM/SIGINT)
- ✅ Distributed tracing with x-trace-id propagation

## Running Services

```bash
# Install dependencies
pnpm install

# Start all services
pnpm dev

# Or start individual services
pnpm dev:distribution   # Port 4300
pnpm dev:franchise    # Port 4310
pnpm dev:procurement # Port 4320
pnpm dev:manufacturing # Port 4330
pnpm dev:trade-finance # Port 4340
pnpm dev:intelligence  # Port 4350
pnpm dev:connector    # Port 4399
pnpm dev:portal      # Port 4388

# Run tests
pnpm test

# Build
pnpm build
```

## Design System

### Color Palette
- **Primary:** `#6366f1` (Indigo)
- **Secondary:** `#8b5cf6` (Purple)
- **Accent:** `#f59e0b` (Amber)
- **Success:** `#22c55e` (Green)
- **Background:** `#0a0a0f` (Dark)
- **Surface:** `rgba(20, 20, 35, 0.8)` (Dark Surface)
- **Text:** `#ffffff` (White)
- **Text Muted:** `#64748b` (Gray)

### Typography
- Font Family: Inter (Google Fonts)
- Weights: 400, 500, 600, 700, 800

### Design Patterns
- Dark theme with gradient accents
- Glassmorphism effects (`backdropFilter: blur`)
- Smooth transitions (`transition: all 0.3s`)
- Hover states with glow effects
- Card-based layouts with rounded corners (`borderRadius: 20px`)
- Gradient backgrounds for headers and CTAs

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NeXha Ecosystem                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐ │
│  │DistributionOS│   │ FranchiseOS  │   │ProcurementOS│   │Manufacturing│ │
│  │    :4300   │   │    :4310   │   │    :4320   │   │   :4330  │ │
│  └──────────────┘   └──────────────┘   └──────────────┘   └────────────┘ │
│                              │                                        │
│                     ┌────────┴────────┐                             │
│                     │  Connector    │                             │
│                     │    :4399    │                             │
│                     └──────────────┘                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │ TradeFinance │   │Intelligence │   │   Portal    │            │
│  │    :4340   │   │    :4350   │   │    :4388   │            │
│  └──────────────┘   └──────────────┘   └──────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
```

## Portal Pages

| Route | Purpose | Design |
|-------|---------|--------|
| `/` | Landing page | Dark theme, gradient hero, animated stats |
| `/distributors` | Find distributors | Card grid with filters |
| `/manufacturers` | Find manufacturers | List view with certs |
| `/franchises` | Browse franchises | Gradient cards, investment details |
| `/suppliers` | **NextaBizz** | Links to B2B Procurement |

## Environment

```bash
NEXT_PUBLIC_API_URL=http://localhost:4388/api
```

## Production Features

- ✅ MongoDB with pooling
- ✅ RABTUL Auth
- ✅ RBAC (12 roles)
- ✅ WebSocket
- ✅ Prometheus metrics
- ✅ Docker Compose
- ✅ Kubernetes manifests
- ✅ CI/CD (GitHub Actions)
- ✅ Tests (Jest)
- ✅ Swagger docs
- ✅ React Native mobile
- ✅ Webhook signature verification
- ✅ Rate limiting
- ✅ Zod input validation

## New Features (June 13, 2026)

### Supplier Agent Service (`procurement-os/src/services/agent.service.ts`)
- Multi-channel communication: Email, SMS, WhatsApp, API/webhook
- RFQ dispatch with structured messages
- Negotiation tracking (initial → counter_offer → accepted/rejected)
- SLA monitoring with reminder automation
- Session management per deal

### Deal State Machine (`procurement-os/src/services/deal.service.ts`)
- Full procurement lifecycle: RFQ → Quotes → Negotiation → Award → Order → Fulfillment → Payment → Completed
- State transition validation (prevents invalid transitions)
- Quote recording with round tracking
- Fulfillment status updates (processing → shipped → delivered)
- Payment settlement tracking
- Full state history audit trail

### Ecosystem Orchestrator (`ecosystem-connector/src/services/orchestrator.ts`)
- Real API calls (not just webhooks) with proper error handling
- Event chaining: inventory.low → Intelligence → Procurement → Supplier Agent → Quote → Award → Order → Payment
- Supplier quote received events
- Deal awarded workflow with PO creation
- Payment received events with deal settlement

### Capability Matching (`procurement-os/src/services/procurement.service.ts`)
- 7-dimension supplier scoring: category, capacity, lead time, delivery regions, payment terms, certifications, min order value
- Match score 0-100 with reasons per dimension
- Integration with RFQ creation

### DistributionOS Enhancements
- Route optimization: TSP nearest-neighbor with Haversine distance + traffic factor
- Delivery tracking: GPS lat/lng + ETA + status updates
- Returns handling (RMA): create → approve → reject → receive → refund
- MongoDB persistence (6 models: Distributor, Route, VanSale, Collection, ReturnRequest, CollectionTarget)

### TradeFinance Enhancements
- FX Currency Conversion: INR/USD/EUR/GBP with rate tracking
- Dispute Resolution: create → evidence → messages → escalation → decision
- Credit line management with BNPL settlement

### FranchiseOS Enhancements
- Compliance Monitoring: audit scheduling, checklists, violation tracking, scoring, trend analysis
- Full audit lifecycle: scheduled → in_progress → completed

### Intelligence Layer
- Real ML forecasting: Exponential Smoothing (Holt's method), Weighted Moving Average
- MAPE accuracy tracking
- Day-of-week seasonality detection
- Fraud detection with velocity/pattern analysis
- Churn prediction with RFM scoring

### NextaBizz API Routes
- Real Supabase DB operations (rfqs, rfq_responses, rfq_invitations tables)
- Quote submission with validation
- RFQ status updates with quote awarding

## Key Files

| File | Purpose |
|------|---------|
| `portal/src/app/page.tsx` | Landing page |
| `portal/src/app/distributors/page.tsx` | Distributors marketplace |
| `portal/src/app/franchises/page.tsx` | Franchise marketplace |
| `portal/src/app/manufacturers/page.tsx` | Manufacturers marketplace |
| `docs/swagger.yaml` | API documentation |
| `docker-compose.yml` | Full stack |
| `k8s/` | Kubernetes manifests |

## Design Resources

- Google Fonts: Inter
- Icons: Emoji (📦 🚚 🏪 🏭 💊)
- Gradients: Indigo to Purple (`#6366f1` → `#8b5cf6`)

---

# NeXha - Complete Company Information

**Company:** Nexha - Unified Commerce Network Infrastructure
**Role in RTNM:** Provides commerce services to all ecosystem companies
**GitHub:** github.com/RTNM-Group/nexha
**Version:** 3.0.0
**Status:** Production Ready ✅ + Full Transaction Flow + Supplier Agent Network

---

## Company Overview

NeXha is "The Operating System for Commerce Networks" - connecting manufacturers, distributors, franchises, retailers, suppliers, and merchants. It provides comprehensive B2B commerce infrastructure.

### Role in RTNM Ecosystem
- Nexha → provides commerce to everyone in the RTNM ecosystem
- Connected to HOJAI AI for AI/ML capabilities
- Uses RABTUL for infrastructure services
- Integrates with REZ Merchant for merchant platform

---

## Products & Services (Ports 4300-4399)

### Microservices
| Service | Port | Purpose |
|---------|------|---------|
| Nexha Gateway | 5002 | Unified API gateway (HOJAI Bridge entry) |
| DistributionOS | 4300 | Distributor management, van sales, route optimization, delivery tracking, returns |
| FranchiseOS | 4310 | Multi-location franchise operations, royalty, compliance monitoring |
| ProcurementOS | 4320 | B2B marketplace, RFQ, Supplier Agent, Deal State Machine, capability matching |
| ManufacturingOS | 4330 | Production & BOM management |
| TradeFinance | 4340 | BNPL, credit lines, working capital, FX conversion, dispute resolution |
| Intelligence | 4350 | AI predictions (Exponential Smoothing), fraud detection, churn prediction |
| Ecosystem Connector | 4399 | Event bus, cross-OS orchestration with real API calls |
| Portal | 4388 | B2B Marketplace (Next.js) |
| NextaBizz | 3000 | B2B Procurement Platform (Supabase-backed) |

---

## All Features

### DistributionOS (4300)
- Distributor Management (MongoDB)
- Van Sale Operations
- Collection Management (Cash/UPI/card/cheque)
- Route Optimization (TSP nearest-neighbor + Haversine)
- Delivery Tracking (GPS + ETA + status updates)
- Returns Handling (RMA): create → approve → reject → receive → refund
- Inventory Tracking
- Sales Analytics
- Commission Calculation
- Brand Management
- Performance Metrics

### FranchiseOS (4310)
- Franchise Network Management
- Brand Management
- Royalty Calculation (percentage or fixed)
- Performance Tracking
- Compliance Monitoring (audit, checklists, violations, scoring)
- Territory Management
- Franchisee Onboarding
- Agreement Management
- Full Audit Trail

### ProcurementOS (4320)
- Supplier Directory (registration, verification)
- Supplier Agent (Email, SMS, WhatsApp, API)
- RFQ Management (create, open, close, award)
- Purchase Orders
- Capability Matching (7-dimension scoring)
- Deal State Machine (17 states with transition validation)
- Marketplace
- Negotiation Tracking (multi-round sessions)
- Quote Comparison
- Payment Reconciliation

### FranchiseOS (4310)
- Franchise Network Management
- Brand Management
- Royalty Calculation
- Performance Tracking
- Location Management
- Compliance Monitoring
- Financial Reporting
- Territory Management

### ProcurementOS (4320)
- Supplier Directory
- RFQ Management
- Purchase Orders
- Price Comparison
- Inventory Procurement
- Delivery Tracking
- Quality Rating
- Contract Management

### ManufacturingOS (4330)
- BOM Management
- Production Planning
- Quality Control
- MRP Integration
- Work Order Management
- Machine Scheduling
- Production Analytics
- Cost Tracking

### TradeFinance (4340)
- BNPL (Buy Now Pay Later) with credit line settlement
- Credit Lines with utilization tracking
- Working Capital
- Invoice Financing
- Payment Gateway (Razorpay, UPI)
- Credit Scoring (crypto.randomInt)
- EMI Calculator
- Risk Assessment
- FX Currency Conversion (INR/USD/EUR/GBP)
- Dispute Resolution (evidence, messages, escalation)

### Intelligence (4350)
- Demand Prediction (Exponential Smoothing, MAPE accuracy)
- Reorder Recommendations (urgency levels)
- Supplier Scoring (weighted: quality 30%, delivery 25%, price 20%)
- Territory Intelligence (retailer coverage, growth)
- Fraud Detection (velocity analysis, pattern matching)
- Churn Prediction (RFM scoring)
- Price Optimization
- Trend Analysis
- Anomaly Detection
- Customer Segmentation

### Ecosystem Connector (4399)
- Event Bus (CloudEvents spec, 1000 event history)
- Ecosystem Orchestrator (real API calls, not just webhooks)
- Cross-Service Communication
- Webhook Management
- Event History
- Event Replay
- Subscription Management (with priority)
- Real-time Notifications
- Audit Trail
- Workflows: Inventory → Procurement → Agent → Quote → Award → Order → Payment

---

## HOJAI Integration

### Connected Services
| HOJAI Service | Port | Purpose |
|--------------|------|---------|
| HOJAI Bridge | 5140 | Universal product connector |
| HOJAI Memory | 4520 | Customer memory |
| HOJAI Intelligence | 4530 | ML predictions |
| SkillNet Runtime | 5120 | Skill execution |

### Integration Endpoints
- GET /api/nexha/:company/franchise
- GET /api/nexha/:company/distribution
- GET /api/nexha/:company/procurement
- POST /api/nexha/demand-signal
- POST /api/nexha/rfq
- GET /api/services/status

---

## Security (Hardened June 13, 2026)

- JWT Authentication via RABTUL (all 10 services)
- RBAC with 12 roles
- HMAC-SHA256 webhook verification (mandatory, no bypass)
- Authorization header forwarding in gateway
- Rate limiting (express-rate-limit)
- Zod input validation
- CORS configuration
- Non-root Docker containers
- PII redaction in logs
- Default secrets removed — services fail-fast if not configured
- Timing-safe comparison (crypto.timingSafeEqual)
- Graceful shutdown (SIGTERM/SIGINT)
- Distributed tracing (x-trace-id propagation)

---

## Deployment

### Docker Compose
```bash
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/ -n nexha
```

---

## Documentation

- README.md - Overview
- DEPLOY.md - Deployment guide
- PRODUCTION.md - Production checklist
- SOT.md - Source of Truth
- FEATURES-LIST.md - Complete features
- RTNM-COMPANIES-AUDIT.md - RTNM ecosystem overview
- RTNM-PRODUCTS-FEATURES-AUDIT.md - All RTNM products

---

**Last Updated:** June 14, 2026

---

## RTMN Foundation Services Integration

NeXha connects to RTMN Foundation Services for identity, memory, and economy:

| Foundation Service | Port | NeXha Integration |
|-------------------|------|-------------------|
| **CorpID** | 4702 | Supplier/Merchant identity, trust scores |
| **MemoryOS** | 4703 | Supplier preferences, transaction memory |
| **GoalOS** | 4242 | Distribution goals, delivery targets |
| **Decision Engine** | 4240 | Supplier credit decisions, risk assessment |
| **Agent Economy** | 4251 | Supplier karma, SLA bonds |

### Connection Example

```javascript
// Supplier trust check
const trustRes = await fetch('http://localhost:4702/api/trust/score/{supplierCorpId}');

// Memory recall
const memoryRes = await fetch('http://localhost:4703/api/context/get', {
  method: 'POST',
  body: JSON.stringify({ corpId: supplierCorpId })
});
```

---

*Foundation Services: `services/corpid-service/`, `services/memory-os/`, `services/goal-os/`, `services/decision-engine/`, `services/agent-economy/`*
