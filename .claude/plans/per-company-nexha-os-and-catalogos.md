# Per-Company Nexha OS + CatalogOS Implementation Plan

> **Date:** 2026-06-25
> **Status:** Planning
> **TL;DR Audit's #1 Gap:** Per-company Nexha OS + CatalogOS not built

---

## 1. What Are We Building?

### A. Per-Company Nexha OS (`nexha-commerce-os`)

The **Shopify-equivalent for B2B autonomous commerce**. Every business (Nike, Amazon, Leverge, restaurant owner) runs their own Nexha OS instance.

```
Nike Nexha (per-company)
├── CatalogOS          — Product catalog + variants + pricing
├── OrderOS            — Purchase orders, fulfillment
├── SupplierOS         — Supplier discovery + management
├── WarehouseOS        — Inventory + slots
├── FinanceOS          — Invoices, payments, escrow
├── AgentOS            — CEO Agent, Marketing Agent, Finance Agent, etc.
└──
  └── Connects to Global Nexha Federation
```

**Already have:** Global Nexha federation layer (27 services).
**Missing:** Per-company commerce runtime + agents.

### B. CatalogOS

The **canonical product catalog layer**. One catalog, many channels (website, marketplace, DO, Global Nexha, AI agents).

```
CatalogOS
├── Products (name, SKU, images, variants, attributes)
├── Pricing (base, tiered, MOQ, lead time)
├── Inventory (warehouse, quantity, reserved)
├── Certifications (FSSAI, ISO, organic)
└── Channels (website, marketplace, DO, Global Nexha, agents)
```

---

## 2. Architecture

### Two-Layer Model

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         GLOBAL NEXHA (existing)                          │
│  CapabilityOS · ReputationOS · DiscoveryOS · FederationOS · OpportunityOS  │
│  SupplierNetwork · PricingNetwork · TradeFinance · WarehouseNetwork      │
│  ACP Messaging · CommerceRuntime · PartnerGraph                           │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ federation
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     PER-COMPANY NEXHA OS (new)                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ CatalogOS (port 4370) — Product catalog + variants + channels       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ OrderOS (port 4371) — PO lifecycle + fulfillment + returns          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ AgentOS (port 4372) — CEO/Marketing/Finance/Procurement agents      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ SupplierOS (port 4373) — Supplier discovery + management             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Each company gets a tenant-scoped instance of these services.           │
│  Tenant isolation via `tenantId` header (same pattern as commerce-runtime)│
└──────────────────────────────────────────────────────────────────────────┘
```

### Service Directory Structure

```
companies/Nexha/services/
├── nexha-commerce-os/              ← NEW: Per-company commerce bundle
│   ├── catalog-os/                  ← NEW: Catalog service (port 4370)
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── routes/catalog.routes.js
│   │   │   ├── services/catalog.service.js
│   │   │   └── models/
│   │   │       ├── Product.js
│   │   │       ├── Variant.js
│   │   │       ├── Pricing.js
│   │   │       └── Channel.js
│   │   ├── tests/catalog.test.js
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── order-os/                    ← NEW: Order service (port 4371)
│   ├── agent-os/                    ← NEW: AI workforce agents (port 4372)
│   ├── supplier-os/                 ← NEW: Supplier management (port 4373)
│   └── README.md
└──
```

---

## 3. Implementation Phases

### Phase 1: Foundation (CatalogOS)

**Goal:** Build CatalogOS — the product catalog that powers all channels.

**Services:** 1 new service (`catalog-os`, port 4370)

**What it does:**
- CRUD for products (name, SKU, description, images, category)
- Product variants (size, color, material)
- Pricing rules (base price, tiered pricing, MOQ, lead time)
- Inventory tracking (warehouse-ref, quantity, reserved)
- Certifications (FSSAI, ISO, organic, etc.)
- Channel publishing (publish to Global Nexha, DO, website)

**Data Model:**
```javascript
// Product
{
  tenantId: string,
  productId: string,
  sku: string,
  name: string,
  description: string,
  category: string,
  images: string[],
  variants: Variant[],
  basePrice: number,
  currency: string,
  moq: number,
  leadTimeDays: number,
  certifications: string[],
  inventory: { warehouseRef: string, quantity: number, reserved: number }[],
  channels: { name: string, published: boolean, channelProductId?: string }[],
  status: 'draft' | 'active' | 'archived',
  createdAt: Date,
  updatedAt: Date
}

// Variant
{
  variantId: string,
  sku: string,
  name: string,
  attributes: { key: string, value: string }[],
  priceAdjustment: number,
  inventory: number
}
```

**Routes:**
```
GET    /products              — list products (filter by category, status, channel)
POST   /products              — create product
GET    /products/:id          — get product
PUT    /products/:id          — update product
DELETE /products/:id          — archive product

GET    /products/:id/variants
POST   /products/:id/variants
PUT    /products/:id/variants/:vid
DELETE /products/:id/variants/:vid

GET    /products/:id/pricing
PUT    /products/:id/pricing

GET    /products/:id/inventory
PUT    /products/:id/inventory

POST   /products/:id/publish   — publish to channel (Global Nexha, DO, etc.)
POST   /products/:id/unpublish

GET    /channels              — list available channels
GET    /channels/:name/products — products on a channel
```

**Integrations:**
- On publish → `nexha-capability-os` (publish capability)
- On publish → `nexha-pricing-network` (submit pricing)
- On inventory change → `nexha-warehouse-network` (update stock)
- Uses `corp-id` for tenant identity

---

### Phase 2: OrderOS (Per-Company Purchase Orders)

**Goal:** Build OrderOS — per-company PO lifecycle tied to Global Nexha commerce.

**Services:** 1 new service (`order-os`, port 4371)

**What it does:**
- Create purchase orders from catalog
- PO state machine: DRAFT → SUBMITTED → ACKNOWLEDGED → FULFILLING → SHIPPED → DELIVERED → COMPLETED
- Integration with Global Nexha's `nexha-commerce-runtime` for cross-company orders
- Returns and refunds

**Data Model:**
```javascript
// PurchaseOrder
{
  tenantId: string,
  orderId: string,
  poNumber: string,
  supplierRef: string,
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'FULFILLING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED',
  items: {
    productId: string,
    variantId?: string,
    sku: string,
    quantity: number,
    unitPrice: number,
    delivered: number
  }[],
  subtotal: number,
  tax: number,
  shipping: number,
  total: number,
  currency: string,
  shippingAddress: object,
  notes: string,
  submittedAt: Date,
  completedAt: Date,
  externalOrderId?: string
}
```

**Routes:**
```
GET    /orders                 — list POs
POST   /orders                 — create PO
GET    /orders/:id
PUT    /orders/:id
DELETE /orders/:id             — cancel (if DRAFT)

POST   /orders/:id/submit      — submit to supplier
POST   /orders/:id/acknowledge
POST   /orders/:id/fulfill
POST   /orders/:id/ship
POST   /orders/:id/deliver
POST   /orders/:id/complete

POST   /orders/:id/returns
GET    /returns/:id
POST   /returns/:id/approve
POST   /returns/:id/reject

POST   /orders/:id/external    — link to Global Nexha order
```

**Integrations:**
- On submit → `nexha-commerce-runtime` (create global order)
- On ship → `nexha-distribution-network` (book shipment)
- On complete → `nexha-payment-network` (trigger payment)
- Uses `corp-id` for supplier verification

---

### Phase 3: AgentOS (AI Workforce)

**Goal:** Build AgentOS — the 5 core AI agents (CEO, Marketing, Finance, Procurement, Customer Care).

**Services:** 1 new service (`agent-os`, port 4372)

**What it does:**
- CEO Agent: goals, strategy, performance review
- Marketing Agent: campaigns, audience, content
- Finance Agent: invoicing, payments, cash flow
- Procurement Agent: supplier discovery, RFQs, PO creation
- Customer Care Agent: support tickets, resolution

**Architecture:**
Each agent is a class with:
- `role` — agent identity
- `capabilities` — what it can do
- `act(context)` — take action based on context
- `learn(memory)` — learn from past interactions

**Example CEO Agent:**
```javascript
class CEOAgent {
  role = 'CEO';
  capabilities = ['goal_setting', 'performance_review', 'strategy'];

  async act(context) {
    const kpis = await this.getKPIs(context.tenantId);
    const issues = this.identifyIssues(kpis);
    return this.generateRecommendations(issues);
  }
}
```

**Routes:**
```
GET    /agents                 — list all agents
GET    /agents/:id             — get agent details
POST   /agents/:id/act         — trigger agent action
GET    /agents/:id/history     — agent activity log

POST   /agents/ceo/goals
GET    /agents/ceo/kpis
POST   /agents/ceo/review

POST   /agents/marketing/campaigns
GET    /agents/marketing/audiences

POST   /agents/finance/invoices
GET    /agents/finance/payments

POST   /agents/procurement/rfqs
GET    /agents/procurement/suppliers

POST   /agents/support/tickets
GET    /agents/support/tickets/:id
```

**Integrations:**
- CEO → `nexha-market-os`
- Marketing → `nexha-agent-marketplace`
- Procurement → `nexha-supplier-registry`
- Finance → `nexha-payment-network`
- All → `corp-id`, `memory-os`

---

### Phase 4: SupplierOS (Per-Company Supplier Management)

**Goal:** Build SupplierOS — per-company supplier directory + RFQ management.

**Services:** 1 new service (`supplier-os`, port 4373)

**What it does:**
- Per-company supplier directory
- Supplier onboarding workflow
- RFQ creation and management
- Supplier performance tracking

**Data Model:**
```javascript
// CompanySupplier
{
  tenantId: string,
  supplierId: string,
  supplierRef: string,
  companyName: string,
  status: 'prospect' | 'onboarded' | 'suspended' | 'rejected',
  tier: 'bronze' | 'silver' | 'gold' | 'platinum',
  categories: string[],
  paymentTerms: string,
  creditLimit: number,
  performance: {
    onTimeDelivery: number,
    qualityScore: number,
    responseTime: number
  },
  contracts: Contract[],
  rfqs: RFQ[],
  createdAt: Date
}
```

**Routes:**
```
GET    /suppliers
POST   /suppliers
GET    /suppliers/:id
PUT    /suppliers/:id
DELETE /suppliers/:id

POST   /suppliers/:id/onboard
POST   /suppliers/:id/suspend

GET    /suppliers/:id/rfqs
POST   /suppliers/:id/rfqs
GET    /suppliers/:id/contracts
GET    /suppliers/:id/performance

GET    /rfqs
POST   /rfqs
GET    /rfqs/:id
POST   /rfqs/:id/quotes
POST   /rfqs/:id/award
```

**Integrations:**
- On onboard → `nexha-supplier-registry`
- On RFQ → `nexha-supplier-network`
- On award → `nexha-commerce-runtime`

---

## 4. Integration with Global Nexha

```
Per-Company Nexha                    Global Nexha
┌──────────────────┐               ┌──────────────────┐
│  CatalogOS        │──publishes───►│  CapabilityOS    │
│  (4370)           │               │  (4270)           │
└──────────────────┘               └──────────────────┘

┌──────────────────┐               ┌──────────────────┐
│  OrderOS          │──submits───►│  CommerceRuntime  │
│  (4371)           │               │  (4364)           │
└──────────────────┘               └──────────────────┘

┌──────────────────┐               ┌──────────────────┐
│  AgentOS          │──discovers──►│  DiscoveryOS     │
│  (4372)           │               │  (4272)           │
└──────────────────┘               └──────────────────┘

┌──────────────────┐               ┌──────────────────┐
│  SupplierOS       │──onboards───►│  SupplierRegistry │
│  (4373)           │               │  (4281)           │
└──────────────────┘               └──────────────────┘
```

### Multi-Tenant Isolation

Every service uses the same pattern as `nexha-commerce-runtime`:

```javascript
const tenantId = req.headers['x-tenant-id']
  || req.user?.tenantId
  || req.body?.tenantId;

if (!tenantId) {
  return res.status(401).json({ error: 'Tenant ID required' });
}

const products = await Product.find({ tenantId, ...filters });
```

---

## 5. Docker Integration

### Update `nexha-os-runtime/docker-compose.yml`

Add the 4 new services:

```yaml
  # ── Per-Company Commerce (Standard+) ───────────────────────────
  catalog-os:
    build:
      context: ../services/nexha-catalog-os
      dockerfile: Dockerfile
    profiles: [standard, enterprise]
    container_name: nexha-catalog-os
    restart: unless-stopped
    environment:
      <<: *common-env
      PORT: 4370
      CORPID_URL: http://corp-id:4702
    ports:
      - "4370:4370"
    depends_on:
      corp-id:
        condition: service_healthy

  order-os:
    build:
      context: ../services/nexha-order-os
      dockerfile: Dockerfile
    profiles: [standard, enterprise]
    container_name: nexha-order-os
    restart: unless-stopped
    environment:
      <<: *common-env
      PORT: 4371
      CORPID_URL: http://corp-id:4702
    ports:
      - "4371:4371"
    depends_on:
      corp-id:
        condition: service_healthy

  agent-os:
    build:
      context: ../services/nexha-agent-os
      dockerfile: Dockerfile
    profiles: [standard, enterprise]
    container_name: nexha-agent-os
    restart: unless-stopped
    environment:
      <<: *common-env
      PORT: 4372
      CORPID_URL: http://corp-id:4702
    ports:
      - "4372:4372"
    depends_on:
      corp-id:
        condition: service_healthy

  supplier-os:
    build:
      context: ../services/nexha-supplier-os
      dockerfile: Dockerfile
    profiles: [standard, enterprise]
    container_name: nexha-supplier-os
    restart: unless-stopped
    environment:
      <<: *common-env
      PORT: 4373
      CORPID_URL: http://corp-id:4702
    ports:
      - "4373:4373"
    depends_on:
      corp-id:
        condition: service_healthy
```

---

## 6. Port Registry Update

Add to `CANONICAL-PORT-REGISTRY.md`:

| Port | Service | Location | Status |
|---|---|---|---|
| 4370 | `nexha-catalog-os` | `Nexha/services/nexha-catalog-os` | Phase 1 |
| 4371 | `nexha-order-os` | `Nexha/services/nexha-order-os` | Phase 2 |
| 4372 | `nexha-agent-os` | `Nexha/services/nexha-agent-os` | Phase 3 |
| 4373 | `nexha-supplier-os` | `Nexha/services/nexha-supplier-os` | Phase 4 |

---

## 7. Hub Route Integration

Add to `NEXHA_SERVICES` in `RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts`:

```javascript
NEXHA_SERVICES = {
  // ... existing 19 entries ...
  'catalog-os':      'http://localhost:4370',
  'order-os':        'http://localhost:4371',
  'agent-os':        'http://localhost:4372',
  'supplier-os':     'http://localhost:4373',
}
```

Exposed as:
```
GET/POST http://localhost:4399/api/nexha/catalog-os/products
GET/POST http://localhost:4399/api/nexha/order-os/orders
GET/POST http://localhost:4399/api/nexha/agent-os/agents
GET/POST http://localhost:4399/api/nexha/supplier-os/suppliers
```

---

## 8. What to Build (Checklist)

### Phase 1 — CatalogOS (port 4370)
- [ ] `services/nexha-catalog-os/package.json`
- [ ] `services/nexha-catalog-os/src/index.js`
- [ ] `services/nexha-catalog-os/src/models/Product.js`
- [ ] `services/nexha-catalog-os/src/models/Variant.js`
- [ ] `services/nexha-catalog-os/src/routes/catalog.routes.js`
- [ ] `services/nexha-catalog-os/src/services/catalog.service.js`
- [ ] `services/nexha-catalog-os/tests/catalog.test.js`
- [ ] `services/nexha-catalog-os/Dockerfile`
- [ ] Update docker-compose.yml
- [ ] Update Hub routes
- [ ] Update port registry
- [ ] Update health-check.sh
- [ ] Update CLI status

### Phase 2 — OrderOS (port 4371)
- [ ] `services/nexha-order-os/` (all files)
- [ ] Update docker-compose.yml
- [ ] Update Hub routes
- [ ] Update port registry

### Phase 3 — AgentOS (port 4372)
- [ ] `services/nexha-agent-os/` (all files + 5 agents)
- [ ] Update docker-compose.yml
- [ ] Update Hub routes
- [ ] Update port registry

### Phase 4 — SupplierOS (port 4373)
- [ ] `services/nexha-supplier-os/` (all files)
- [ ] Update docker-compose.yml
- [ ] Update Hub routes
- [ ] Update port registry

---

## 9. Naming Clarification (Update Docs)

After implementation, update the naming to be unambiguous:

| Term | Meaning |
|---|---|
| **Nexha OS (per-company)** | The commerce runtime each business runs (CatalogOS + OrderOS + AgentOS + SupplierOS) |
| **Nexha OS Runtime** | The Docker bundle that packages all 31 services |
| **Global Nexha** | The federation layer (CapabilityOS, DiscoveryOS, etc.) |
| **SUTAR OS** | The AI workforce + economy layer |
| **HOJAI Foundation** | MemoryOS, TwinOS, SkillOS, FlowOS, PolicyOS, KnowledgeOS |

---

## 10. Success Criteria

1. CatalogOS can create products and publish to Global Nexha
2. OrderOS can create POs and link to global commerce runtime
3. AgentOS has all 5 agents with working `act()` methods
4. SupplierOS can onboard suppliers and send RFQs
5. All 4 services run in Docker and pass health checks
6. All services are in the Hub route table
7. 100+ unit tests across all 4 services
