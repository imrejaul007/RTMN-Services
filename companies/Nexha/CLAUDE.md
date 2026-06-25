# NeXha - CLAUDE.md

## What is NeXha?

**NeXha** is the autonomous business network — a federation of AI-powered business nodes (Nexhas) that negotiate, trade, and cooperate without human intermediaries. It is the network layer of the HOJAI Platform-as-an-Economy.

**Products:**
- **Nexha OS Runtime** — self-hostable Docker bundle (port 5002 gateway)
- **Nexha Federation OS** — federation management service (port 4273)
- **Nexha Network Services** — 25 services covering trade lifecycle, commerce, logistics, and payments

## Nexha OS Runtime

The canonical self-hostable bundle lives at `nexha-os-runtime/`. This is the production-ready Docker distribution of Nexha OS.

```bash
cd nexha-os-runtime

# Initialize (all tiers)
nexha init --tier standard
# Or via scripts
bash scripts/init.sh --tier standard
bash scripts/provision.sh   # auto-provisions CorpID + 8 agents
bash scripts/join-federation.sh
bash scripts/health-check.sh
```

**CLI** (`cli/`): `nexha init | register | federate | status | update | backup | destroy | logs`

## Services (25 services)

### Foundation (4 — all tiers)
| Service | Port | Description |
|---------|------|-------------|
| **nexha-gateway** | 5002 | Public API entry point |
| **corp-id** (via HOJAI-AI) | 4702 | Universal identity |
| **memory-os** (via HOJAI-AI) | 4703 | Multi-tier AI memory |
| **twinos-hub** (via HOJAI-AI) | 4705 | Digital twins platform |

### SUTAR OS (5 — Standard+)
| Service | Port | Notes |
|---------|------|-------|
| **sutar-gateway** | 4140 | Commerce gateway |
| **sutar-trust-engine** | 4291 | Trust scoring |
| **sutar-contract-os** | 4292 | Smart contracts |
| **sutar-negotiation-engine** | 4295 | Port 4293 reserved |
| **sutar-economy-os** | 4294 | Economic layer |

### Nexha Network (14 — Standard+)
| Service | Port | Description |
|---------|------|-------------|
| **nexha-federation-os** | 4273 | Federation management, auto-match, onboarding checklist |
| **nexha-supplier-network** | 4280 | Supplier discovery + scoring |
| **nexha-supplier-registry** | 4281 | Trade lifecycle: KYB→contract→RFQ→PO→shipment→payment |
| **nexha-pricing-network** | 4286 | Market price aggregation + dynamic pricing |
| **nexha-distribution-network** | 4285 | Distribution channel management |
| **nexha-trade-finance-network** | 4287 | Escrow + payment settlement |
| **nexha-warehouse-network** | 4288 | Slot booking + WMS |
| **nexha-business-directory** | 4360 | Business listings |
| **nexha-partner-graph** | 4363 | Partner relationships |
| **nexha-commerce-runtime** | 4364 | Trade operations |
| **nexha-contract-network** | 4289 | Contract lifecycle (create→sign→execute→terminate) |
| **nexha-compliance-network** | 4290 | KYB/KYC, regulatory checks, compliance alerts |
| **nexha-payment-network** | 4296 | Payment orchestration, escrow, settlement |
| **nexha-partner-network** | 4292 | Partner discovery, onboarding, relationship mgmt |
| **nexha-acp-messaging** | 4340 | AI-to-AI messaging |

### Enterprise-only (3)
| Service | Port | Description |
|---------|------|-------------|
| **nexha-capability-os** | 4270 | Capability registry + matching |
| **nexha-agent-marketplace** | 4250 | AI agent discovery + reviews (10 seeded agents) |
| **nexha-mission-planner** | 4362 | Multi-agent mission coordination |

### Monitoring (Enterprise)
| Service | Port |
|---------|------|
| **prometheus** | 9090 |
| **grafana** | 3001 |

## Docker Build

```bash
# From nexha-os-runtime/
docker compose --profile standard up -d

# Or build all images first
docker compose build
docker compose --profile standard up -d
```

## Nexha Federation

104 Nexhas seeded. Federation OS at `services/nexha-federation-os/` provides:
- Auto-match based on capabilities
- Onboarding checklist (5-step workflow)
- Handshake protocol (initiate → accept → trust-build)
- Tier system: founding, primary, secondary, observer

## Key Differentiators

| Feature | How |
|---------|-----|
| Self-hostable | `docker compose up` — no cloud dependency |
| Auto-provision | CorpID identity + 8 foundational agents seeded on first boot |
| Port conflict-free | 4293 reserved; negotiation engine uses 4295; payment uses 4296 |
| HOJAI-AI integration | 8 foundation services expected from HOJAI-AI submodule |
| 3-tier scaling | Lite (~1GB) → Standard (~4GB) → Enterprise (~8GB) |

## Developer Reference

- [nexha-os-runtime/CLAUDE.md](nexha-os-runtime/CLAUDE.md) — full runtime docs
- [nexha-os-runtime/README.md](nexha-os-runtime/README.md) — quick start + architecture
- [services/nexha-supplier-registry/](services/nexha-supplier-registry/) — complete trade lifecycle (Phase F flagship)
- [services/nexha-federation-os/](services/nexha-federation-os/) — federation management
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

### Seller Agent (Supplier Side)
- Guest supplier registration (no GST required)
- Supplier webhook for RFQ receipt
- Auto-quote generation from product catalog
- Counter-offer workflow
- Supplier reputation tracking
- SUTAR Trust + Reputation integration

### Commerce Memory
- Transaction history store
- Seasonal price pattern detection ("Diwali price spike")
- Supplier insight engine
- Buyer purchase patterns
- Cross-supplier opportunity detection

### Commerce Feed
- Activity stream for all participants
- Supplier product/promotion posts
- RFQ opportunity notifications
- Leaderboard/leaderboard

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
