# NextaBizz - B2B Procurement Platform

## Product Identity

**Name:** NextaBizz
**Parent Company:** NeXha (Unified Commerce Network Infrastructure)
**Location:** `RTNM-Group/nexha/nextabizz/`

---

## NeXha Ecosystem

```
NeXha - Unified Commerce Network Infrastructure
│
├── DistributionOS (4300)     - Distributor & wholesaler management
├── FranchiseOS (4310)       - Multi-location franchise operations
├── ProcurementOS (4320)      - Supplier network & RFQ
├── ManufacturingOS (4330)    - Production & BOM management
├── TradeFinance (4340)       - BNPL, credit lines, invoice financing
├── IntelligenceLayer (4350)  - AI predictions & analytics
├── EcosystemConnector (4399) - Central event bus & orchestration
│
└── NextaBizz                - B2B Procurement Platform (THIS PRODUCT)
    ├── apps/web/            - Main B2B dashboard
    ├── apps/supplier-portal/ - Supplier-facing portal
    ├── packages/            - Shared types, auth, webhooks
    └── services/            - Auto-RFQ, scoring, integrations
```

---

## What is NextaBizz?

**NextaBizz** is a B2B Procurement Platform that:
- Connects merchants (buyers) with suppliers
- Manages RFQs, purchase orders, and supplier relationships
- Integrates with RestoPapa for inventory signals
- Auto-generates RFQs when inventory is low
- Provides supplier performance scoring

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Supplier Directory** | Browse and search verified suppliers by category, rating |
| **RFQ Management** | Create, submit, and award quotes |
| **Purchase Orders** | Full PO lifecycle (draft → delivered) |
| **Auto-RFQ** | Auto-generate RFQs from inventory signals |
| **Supplier Scoring** | Performance metrics (on-time, quality, price) |
| **BNPL Credit** | Credit lines for merchants |
| **Inventory Signals** | Real-time stock alerts from RestoPapa |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NextaBizz                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Web App    │  │  Supplier    │  │  Auto-RFQ    │       │
│  │  (Dashboard) │  │   Portal     │  │   Engine     │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         └──────────────────┼──────────────────┘               │
│                            │                                  │
│  ┌─────────────────────────┴───────────────────────────────┐  │
│  │                    API Layer                           │  │
│  │  ├── Suppliers   ├── RFQs   ├── Orders   ├── Signals   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                  │
│  ┌─────────────────────────┴───────────────────────────────┐  │
│  │               Integration Services                       │  │
│  │  ├── RestoPapa Sync   ├── ReZ Merchant   ├── Hotel PMS   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                  │
│  ┌─────────────────────────┴───────────────────────────────┐  │
│  │              NeXha Ecosystem Connector (4399)         │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Services

| Service | Description |
|---------|-------------|
| `auto-rfq` | Auto-generates RFQs from inventory signals |
| `scoring-engine` | Supplier performance scoring |
| `reorder-engine` | Reorder recommendations |
| `payment-settlement` | Payment processing |
| `chat` | Chat service for buyers |

---

## Database (Supabase)

| Table | Purpose |
|-------|---------|
| `suppliers` | B2B vendors with GST, rating, categories |
| `supplier_products` | Products offered by suppliers |
| `merchants` | B2B buyers linked to REZ merchant IDs |
| `credit_lines` | BNPL credit facilities |
| `inventory_signals` | Real-time stock alerts |
| `rfqs` | Request for Quotes |
| `purchase_orders` | PO lifecycle |
| `rfq_responses` | Supplier quotes |
| `supplier_scores` | Performance metrics |

---

## Integrations

### Inbound
| Source | Events | Action |
|--------|--------|--------|
| RestoPapa | `inventory.*` | Creates signals, auto-generates RFQs |
| ReZ Merchant | `inventory.*` | Syncs merchant inventory |
| Hotel PMS | `booking.*` | Triggers service RFQs |

### Outbound
| Target | Events | Purpose |
|--------|--------|---------|
| ReZ Mind | `product_search`, `order_placed` | Buyer intent signals |
| NeXha Intelligence | Supplier scores | AI predictions |

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Auth
AUTH_SERVICE_URL=https://rez-auth-service.onrender.com

# Webhooks
WEBHOOK_SECRET=your-webhook-secret

# NeXha Services
NEXHA_PROCUREMENT_OS_URL=http://localhost:4320
NEXHA_CONNECTOR_URL=http://localhost:4399
```

---

## Commands

```bash
# From NeXha root
pnpm dev:nextabizz     # Start NextaBizz dev
pnpm build             # Build all packages

# From nextabizz directory
pnpm dev               # Dev all apps
pnpm build             # Build all
pnpm lint              # Lint all
```

---

## Security

- [x] HMAC webhook verification
- [x] RABTUL Auth integration
- [x] Supabase Row Level Security (RLS)
- [x] Rate limiting on API routes
- [x] Input validation with Zod
- [x] Timing-safe token comparison

---

## Related

| Product | Purpose |
|---------|---------|
| **NeXha** | Parent - Unified Commerce Network |
| **ProcurementOS** | NeXha service - RFQ & supplier management |
| **TradeFinance** | NeXha service - BNPL & credit |
| **RestoPapa** | Integration - Restaurant inventory signals |
