# HOJAI Developer Platform — Full Specification

> **Date:** 2026-06-22
>
> **Vision:** HOJAI is the platform that AI coding assistants (Claude Code, Cursor, Codex, ChatGPT, GitHub Copilot) know how to build on. A founder says "Build me an import/export marketplace" and a working application materializes.
>
> **Status:** Detailed specification for the developer platform that powers HOJAI Foundry

---

## 0. Executive Summary

The HOJAI Developer Platform is a **Lego-block architecture** that gives developers everything they need to build AI-native businesses, marketplaces, platforms, and operating systems. It consists of:

1. **7 Core SDKs** (modular, composable)
2. **9 Starter Kits** (prebuilt businesses for the 3 Year-1 layers)
3. **1 CLI** (`npx hojai create`)
4. **1 AI-native spec** (so Claude Code / Cursor / Codex understand the structure)
5. **1 Marketplace** (where developers publish and sell)

The platform is designed so that **any AI coding tool can scaffold a complete HOJAI project from a natural-language prompt.** This is the flywheel: more AI tools support HOJAI → more developers build on it → more SDKs and templates published → more AI tools learn about it.

---

## 1. The 7 Core SDKs (Lego Blocks)

Every SDK is a **separate npm package** with a single responsibility. Developers install only what they need.

### SDK Architecture (Lego Blocks)

```
┌─────────────────────────────────────────────┐
│           HOJAI Platform                     │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │   Layer 4: Starter Kits              │  │
│  │   (prebuilt businesses)              │  │
│  └──────────────────────────────────────┘  │
│                  ▲                          │
│  ┌───────────────┴────────────────────┐    │
│  │   Layer 3: Industry SDKs           │    │
│  │   (healthcare, hotel, restaurant)  │    │
│  └───────────────┬────────────────────┘    │
│                  ▲                          │
│  ┌───────────────┴────────────────────┐    │
│  │   Layer 2: Feature SDKs            │    │
│  │   (commerce, payment, reputation)  │    │
│  └───────────────┬────────────────────┘    │
│                  ▲                          │
│  ┌───────────────┴────────────────────┐    │
│  │   Layer 1: Foundation SDK          │    │
│  │   (identity, memory, twin, etc.)   │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Layer 1: Foundation SDK

**Package:** `@hojai/foundation`
**Repo:** `github.com/hojai-ai/foundation-sdk`
**What:** Core infrastructure every HOJAI app needs.

**Sub-modules:**

```typescript
import { CorpID, Memory, Twin, Trust, Flow, Policy, Economy } from '@hojai/foundation';

// CorpID — identity for users, agents, organizations
const user = await CorpID.create({ type: 'user', email: '...' });
const agent = await CorpID.create({ type: 'agent', role: 'sales' });

// Memory — persistent context across agents
await Memory.write('user-preferences', { userId, prefs });
const memory = await Memory.read('user-preferences', userId);

// Twin — digital twin for any entity
const userTwin = await Twin.create(user, { type: 'user' });
await userTwin.update({ lastOrder: orderId });

// Trust — SADA-backed trust scoring
const trustScore = await Trust.score({ entityId: user.id });

// Flow — workflow orchestration
const flow = await Flow.create('onboard-customer', [
  { agent: 'sales', task: 'send-welcome' },
  { agent: 'support', task: 'schedule-call' }
]);

// Policy — compliance rules
const allowed = await Policy.check({ user: user.id, action: 'export-data' });

// Economy — payments, escrow
const tx = await Economy.transfer({ from, to, amount, currency });
```

**Endpoints (HTTP fallback for non-Node):**
- `POST /api/v1/corpid` — create identity
- `GET /api/v1/corpid/:id` — retrieve
- `POST /api/v1/memory` — write
- `GET /api/v1/memory/:key` — read
- `POST /api/v1/twin` — create twin
- `PATCH /api/v1/twin/:id` — update
- `GET /api/v1/trust/:entityId` — get trust score
- `POST /api/v1/flow` — create workflow
- `POST /api/v1/policy/check` — check policy
- `POST /api/v1/economy/transfer` — transfer funds

---

### Layer 2: Feature SDKs

Six feature SDKs, each focused on a single capability.

#### 2.1 SUTAR SDK — `@hojai/sutar`

**What:** Build, deploy, and orchestrate AI agents.

```typescript
import { Agent, Workflow, Negotiation, Contract } from '@hojai/sutar';

// Create an agent
const procurement = new Agent({
  role: 'procurement',
  capabilities: ['rfq', 'negotiation', 'sourcing'],
  tools: ['@hojai/commerce', '@hojai/nexha'],
  memory: '@hojai/foundation'
});

// Deploy and run
await procurement.deploy();
const quote = await procurement.execute({
  intent: 'buy-rice',
  qty: 100,
  maxPrice: 50
});

// Multi-agent workflow
const team = new Workflow([
  procurement,
  new Agent({ role: 'finance' }),
  new Agent({ role: 'logistics' })
]);
const result = await team.execute({ mission: 'source-and-deliver-rice' });

// Negotiation between two SUTAR agents
const deal = await Negotiation.run({
  buyer: procurement,
  seller: supplierAgent,
  product: 'rice',
  constraints: { maxPrice: 50, deliveryBy: '2026-07-15' }
});

// Smart contract execution
const contract = await Contract.create({
  parties: [buyer.id, seller.id],
  terms: deal.terms,
  autoExecute: true
});
```

#### 2.2 Nexha SDK — `@hojai/nexha`

**What:** Connect to Global Nexha, publish capabilities, find counterparties, federate.

```typescript
import { Network, Discovery, Reputation, Opportunity, Federation } from '@hojai/nexha';

// Initialize your Nexha
const myNexha = new Network({
  corpid: 'nex-abc123',
  name: 'ABC Manufacturing',
  type: 'company'
});

// Publish capabilities (CapabilityOS)
await myNexha.publishCapabilities({
  manufacturing: {
    products: ['HR coils', 'CR sheets'],
    capacity: { tonsPerDay: 500 },
    minimumOrder: 100,
    leadTimeDays: 7,
    certifications: ['ISO9001', 'BIS'],
    countries: ['India', 'UAE']
  }
});

// Find suppliers (DiscoveryOS)
const suppliers = await Discovery.findSuppliers({
  capability: 'manufacturing.steel',
  minACI: 80,
  country: 'India',
  maxLeadTimeDays: 10
});
// Returns: ranked list with ACI scores

// Find opportunities (OpportunityOS)
const opportunities = await Opportunity.find({
  myCapabilities: myNexha.capabilities,
  industries: ['construction', 'automotive']
});
// Returns: matched opportunities the factory can fulfill

// Get reputation (ReputationOS)
const myACI = await Reputation.getACI(myNexha.corpid);
// Returns: { overall: 87, trust: 92, quality: 88, delivery: 85, ... }

// Join federation
await Federation.handshake('nex-xyz789');
```

#### 2.3 Commerce SDK — `@hojai/commerce`

**What:** Catalog, orders, merchants, inventory, payments, fulfillment.

```typescript
import { Catalog, Order, Merchant, Inventory, Payment } from '@hojai/commerce';

// Catalog
const product = await Catalog.create({
  sku: 'STEEL-HR-001',
  name: 'HR Steel Coil',
  price: 50000,
  currency: 'INR',
  inventory: 100
});

// Order
const order = await Order.create({
  buyer: 'cust-123',
  items: [{ sku: 'STEEL-HR-001', qty: 10 }],
  shipping: { address: '...', method: 'express' }
});

// Merchant onboarding
const merchant = await Merchant.onboard({
  businessName: 'ABC Steel',
  kyb: { documents: [...], verifiedBy: 'corpId' }
});

// Inventory sync
await Inventory.sync('STEEL-HR-001', { available: 95, reserved: 5 });

// Payment
const payment = await Payment.capture({
  orderId: order.id,
  method: 'card', // or 'wallet', 'escrow', 'bnpl', 'crypto'
  amount: 500000
});
```

#### 2.4 Payment SDK — `@hojai/payment`

**What:** Wraps RABTUL's payment infrastructure.

```typescript
import { Wallet, Escrow, BNPL, TradeFinance } from '@hojai/payment';

// Wallet
const wallet = await Wallet.create({ owner: 'user-123', currency: 'INR' });
await wallet.credit(10000);
await wallet.debit(5000);

// Escrow
const escrow = await Escrow.create({
  buyer: 'cust-123',
  seller: 'mer-456',
  amount: 100000,
  releaseOn: 'delivery-confirmed'
});

// BNPL
const bnpl = await BNPL.create({
  user: 'user-123',
  amount: 50000,
  installments: 3,
  interestRate: 0
});

// Trade finance
const lc = await TradeFinance.letterOfCredit({
  applicant: 'buyer-corp',
  beneficiary: 'seller-corp',
  amount: 1000000,
  expiry: '2026-12-31'
});
```

#### 2.5 Reputation SDK — `@hojai/reputation`

**What:** Publish and consume Autonomous Commerce Index (ACI) data.

```typescript
import { ACI, Trust, Dispute } from '@hojai/reputation';

// Get your ACI
const myACI = await ACI.get('corpid-abc');
// { overall: 87, dimensions: { trust: 92, quality: 88, ... } }

// Publish an event (improves your ACI)
await ACI.publishEvent({
  type: 'delivery.completed',
  orderId: 'ord-123',
  onTime: true,
  qualityScore: 95
});

// Compare entities
const comparison = await ACI.compare(['corpid-abc', 'corpid-xyz']);

// File a dispute
await Dispute.file({
  againstEntity: 'corpid-xyz',
  reason: 'late-delivery',
  evidence: [...]
});
```

#### 2.6 Discovery SDK — `@hojai/discovery`

**What:** Search the Global Nexha network for capabilities.

```typescript
import { Search, Filter, Rank } from '@hojai/discovery';

// Search
const results = await Search.capabilities({
  query: 'steel manufacturer',
  filters: {
    country: 'India',
    minACI: 75,
    certifications: ['ISO9001'],
    maxLeadTimeDays: 14
  },
  rankBy: 'aci', // or 'proximity', 'price', 'response-time'
  limit: 20
});
// Returns: ranked list of matching companies

// Geographic search
const nearby = await Search.nearby({
  capability: 'warehouse',
  location: { city: 'Mumbai', radiusKm: 50 },
  filters: { minRating: 4.0 }
});
```

---

### Layer 3: Industry SDKs (Year 2+)

Pre-built SDKs for specific industries. Each one extends the feature SDKs with industry-specific logic.

**Year 2 SDKs (planned):**
- `@hojai/healthcare` — patient records, appointments, prescriptions
- `@hojai/hospitality` — bookings, rooms, housekeeping
- `@hojai/restaurant` — menu, kitchen, orders
- `@hojai/logistics` — shipments, fleets, warehouses
- `@hojai/manufacturing` — BOM, production, machines
- `@hojai/realestate` — properties, listings, contracts
- `@hojai/education` — courses, students, assessments

**Each industry SDK provides:**
- Pre-configured data models
- Industry-specific workflows (built on SUTAR Workflow)
- Industry-specialist SUTAR agents
- Industry-specific compliance (Policy integration)
- Pre-built UI components (optional)

---

### Layer 4: Starter Kits (Prebuilt Businesses)

9 starter kits in Year 1 covering Layers 1, 2, 8 of the Platform-as-an-Economy.

**Year 1 Starter Kits:**

| # | Starter Kit | What it builds | Layer | When |
|---|---|---|---|---|
| 1 | `hojai-marketplace-starter` | Amazon/Flipkart-style marketplace | 1 (D2C) | Y1 Q1 |
| 2 | `hojai-b2b-platform-starter` | Alibaba/IndiaMART-style B2B | 2 (B2B) | Y1 Q1 |
| 3 | `hojai-company-starter` | Full autonomous company | 8 (Company Builder) | Y1 Q1 |
| 4 | `hojai-hotel-starter` | Hotel management | 3 (Industry OS) | Y1 Q2 |
| 5 | `hojai-restaurant-starter` | Restaurant + kitchen | 3 (Industry OS) | Y1 Q2 |
| 6 | `hojai-logistics-starter` | Logistics + delivery | 2 (B2B) | Y1 Q2 |
| 7 | `hojai-crm-starter` | CRM with SUTAR agents | 4 (Enterprise SW) | Y1 Q3 |
| 8 | `hojai-erp-starter` | ERP with SUTAR agents | 4 (Enterprise SW) | Y1 Q3 |
| 9 | `hojai-pos-starter` | POS with SUTAR agents | 3 (Industry OS) | Y1 Q4 |

**Each starter kit ships with:**
- Backend (Node.js + TypeScript)
- Frontend (Next.js or React)
- Mobile (Flutter or React Native)
- Pre-configured SUTAR agents
- Pre-connected CorpID, Memory, Twin, Reputation
- Sample data
- README + 30-min quickstart
- 50+ tests

**Example: `hojai-marketplace-starter` structure:**

```
hojai-marketplace-starter/
├── README.md
├── package.json
├── docker-compose.yml
├── .env.example
├── apps/
│   ├── backend/           # Express + TypeScript
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/  # Catalog, Order, Payment
│   │   │   ├── agents/    # SUTAR agents
│   │   │   └── index.ts
│   │   └── tests/
│   ├── frontend/          # Next.js
│   │   ├── app/
│   │   │   ├── buyer/     # Buyer portal
│   │   │   ├── seller/    # Seller portal
│   │   │   └── admin/     # Admin dashboard
│   │   └── components/
│   ├── mobile/            # Flutter
│   │   ├── lib/
│   │   └── android/, ios/
│   └── nexha/             # Nexha integration
│       └── capability.json  # CapabilityOS declaration
├── packages/
│   ├── types/             # Shared TypeScript types
│   ├── ui/                # Shared UI components
│   └── config/            # Shared config
└── docs/
    ├── quickstart.md
    ├── architecture.md
    └── api.md
```

---

## 2. The CLI: `npx hojai create`

The fastest way to start a HOJAI project. Lives in `@hojai/cli`.

```bash
$ npx hojai create
? What are you building?
❯ Marketplace (D2C)
  B2B Platform
  Hotel Management
  Restaurant
  Logistics
  Healthcare
  Education
  Manufacturing
  Real Estate
  CRM
  ERP
  POS
  HRMS
  Custom

? Business model?
❯ Marketplace
  D2C Storefront
  B2B Wholesale
  Hyperlocal
  Subscription
  Franchise
  Other

? Which AI workforce?
☑ CEO Agent (orchestrator)
☑ Sales Agent
☑ Marketing Agent
☑ Procurement Agent
☑ Finance Agent
☐ Legal Agent
☑ Support Agent
☐ Warehouse Agent

? Add SUTAR Department OS modules?
☑ CRM
☑ ERP
☑ POS
☐ HRMS
☐ LMS

? Brand name?
› TradeFlow

? Primary region?
❯ Middle East
  South Asia
  North America
  Europe
  Global

? Language?
› English, Arabic

? Generate project?
› Yes

✓ Creating project...
✓ Installing dependencies...
✓ Setting up SUTAR agents...
✓ Connecting to CorpID...
✓ Registering on CapabilityOS...
✓ Joining Global Nexha federation...

Done! Your company is ready.

Next steps:
  cd tradeflow
  npm run dev          # Start backend
  npm run dev:web      # Start web app
  npm run dev:mobile   # Start mobile app

Your Nexha: nex-tradeflow-abc123
ACI: 40 (Stage 1 — Founder Verified)
Federation: pending (run `npx hojai federate` to apply)
```

---

## 3. The AI-Native Spec (for Claude Code / Cursor / Codex)

This is the most important part. **The spec that tells AI coding tools how to build on HOJAI.**

### File: `hojai.ai.md` (auto-generated in every project)

A markdown file that AI tools read to understand the project structure.

```markdown
# HOJAI Project: TradeFlow

This is a HOJAI-powered import/export marketplace for the Middle East.

## Architecture
- Backend: Node.js + Express + TypeScript
- Frontend: Next.js (App Router)
- Mobile: Flutter
- Database: MongoDB
- AI: HOJAI SUTAR (16 agents)

## What this app does
- Buyers post RFQs for products
- Sellers respond with quotes
- SUTAR Procurement Agent negotiates automatically
- Trade finance is arranged via RABTUL
- Logistics via nexha-autonomous-logistics
- Settlement via Nexha Economy
- Reputation updates after each deal

## Key files
- `apps/backend/src/agents/` — SUTAR agent definitions
- `apps/backend/src/services/` — business logic
- `apps/backend/src/routes/` — HTTP endpoints
- `apps/nexha/capability.json` — CapabilityOS declaration
- `apps/frontend/app/buyer/` — buyer portal
- `apps/frontend/app/seller/` — seller portal

## HOJAI APIs used
- `@hojai/foundation` — CorpID, Memory, Twin
- `@hojai/sutar` — Agents
- `@hojai/commerce` — Catalog, Orders
- `@hojai/nexha` — Discovery, Reputation
- `@hojai/payment` — Escrow, BNPL

## How to extend
- Add a new SUTAR agent: create a file in `apps/backend/src/agents/`
- Add a new endpoint: create a file in `apps/backend/src/routes/`
- Update capabilities: edit `apps/nexha/capability.json`
- Add a new page: create a folder in `apps/frontend/app/`

## Conventions
- Use Zod for input validation
- Use `requireAuth` middleware on all `/api/v1/*` routes
- All agents must extend `BaseAgent` from `@hojai/sutar`
- All Nexha events must use `NexhaEvent` from `@hojai/nexha`
```

### File: `.hojai/schema.json` (machine-readable)

A JSON schema AI tools can query:

```json
{
  "hojaiVersion": "1.0",
  "projectType": "marketplace",
  "industry": "import-export",
  "region": "middle-east",
  "language": ["en", "ar"],
  "stack": {
    "backend": "node-express-typescript",
    "frontend": "nextjs",
    "mobile": "flutter",
    "database": "mongodb"
  },
  "agents": [
    { "role": "procurement", "purpose": "find suppliers, negotiate, place orders" },
    { "role": "sales", "purpose": "respond to RFQs, generate quotes" },
    { "role": "finance", "purpose": "handle payments, escrow, invoices" },
    { "role": "logistics", "purpose": "arrange shipping, track delivery" }
  ],
  "capabilities": {
    "import-export": {
      "products": ["general"],
      "regions": ["middle-east", "south-asia"],
      "currencies": ["USD", "AED", "INR"]
    }
  },
  "integrations": [
    "corpId",
    "sutar",
    "nexha",
    "commerce",
    "payment",
    "logistics"
  ],
  "conventions": {
    "validation": "zod",
    "auth": "corpId-jwt",
    "events": "nexha-event-bus",
    "tests": "vitest"
  }
}
```

### File: `hojai.code-workspace` (VSCode / Cursor)

```json
{
  "folders": [
    { "path": "apps/backend", "name": "Backend" },
    { "path": "apps/frontend", "name": "Web" },
    { "path": "apps/mobile", "name": "Mobile" },
    { "path": "apps/nexha", "name": "Nexha" },
    { "path": "packages/types", "name": "Types" }
  ],
  "settings": {
    "hojai.cli": "npx hojai",
    "hojai.docs": "https://docs.hojai.ai",
    "hojai.ai-context": "hojai.ai.md"
  },
  "extensions": {
    "recommendations": [
      "hojai.hojai-vscode",
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode"
    ]
  }
}
```

### How AI Tools Use This

**Claude Code / Cursor / Codex** read these files and:
1. Understand the project structure automatically
2. Know which HOJAI APIs to use for which task
3. Generate code that follows HOJAI conventions
4. Add new SUTAR agents correctly
5. Update CapabilityOS without breaking schema

**Example prompt:**
> "Add a Returns Agent to my marketplace. It should handle return requests, validate them against policy, and issue refunds."

The AI tool reads `hojai.ai.md`, sees this is a marketplace, creates `apps/backend/src/agents/returns.ts` extending `BaseAgent`, wires it to `@hojai/payment` for refunds, adds the route, updates tests. **All without manual instruction.**

---

## 4. The HOJAI Marketplace (Developer Economy)

Where developers publish and sell what they build.

### What can be published

| Category | Examples | Pricing |
|---|---|---|
| **Starter Kits** | `hojai-saas-starter`, `hojai-fintech-starter` | Free or paid |
| **Industry SDKs** | `@hojai/construction`, `@hojai/agriculture` | Free or paid |
| **SUTAR Agents** | Master Negotiator, Customs Agent, Tax Agent | Subscription |
| **Skills** | Negotiation Skill, Compliance Skill, Manufacturing Skill | Pay-per-use |
| **Workflows** | Onboarding Workflow, Returns Workflow | Subscription |
| **Plugins** | Stripe Plugin, Twilio Plugin, Maps Plugin | Free or paid |
| **UI Components** | Admin Dashboard Kit, Analytics Kit | One-time |
| **Themes** | Material Theme, Luxury Theme, Dark Mode | One-time |
| **Industry Templates** | Healthcare CRM, Restaurant POS, Hotel PMS | Subscription |

### Revenue share

| Type | Developer | HOJAI |
|---|---|---|
| **Free items** | 100% | 0% |
| **Paid items (under $100)** | 70% | 30% |
| **Paid items ($100+)** | 80% | 20% |
| **Subscriptions** | 70% (year 1) | 30% |
| **Enterprise licenses** | 60% | 40% |

### Developer earnings potential

By Year 5, top developers should be able to earn **$1M+/year** from HOJAI Marketplace. Just like top Shopify app developers, top WordPress theme developers, top AWS solution providers.

---

## 5. Repository Structure (GitHub org)

```
github.com/hojai-ai
│
├── foundation-sdk              # @hojai/foundation
├── sutar-sdk                   # @hojai/sutar
├── nexha-sdk                   # @hojai/nexha
├── commerce-sdk                # @hojai/commerce
├── payment-sdk                 # @hojai/payment (wraps RABTUL)
├── reputation-sdk              # @hojai/reputation
├── discovery-sdk               # @hojai/discovery
│
├── cli                         # @hojai/cli (npx hojai create)
│
├── starter-marketplace         # hojai-marketplace-starter
├── starter-b2b                 # hojai-b2b-platform-starter
├── starter-company             # hojai-company-starter
├── starter-hotel               # hojai-hotel-starter
├── starter-restaurant          # hojai-restaurant-starter
├── starter-logistics           # hojai-logistics-starter
├── starter-crm                 # hojai-crm-starter
├── starter-erp                 # hojai-erp-starter
├── starter-pos                 # hojai-pos-starter
│
├── industry-healthcare         # @hojai/healthcare
├── industry-hospitality         # @hojai/hospitality
├── industry-restaurant         # @hojai/restaurant
├── industry-logistics          # @hojai/logistics
├── industry-manufacturing      # @hojai/manufacturing
├── industry-realestate         # @hojai/realestate
├── industry-education          # @hojai/education
│
├── docs                        # docs.hojai.ai
├── examples                    # Example projects
│
├── acp-protocol                # ACP reference implementation
├── acp-spec                    # ACP specification (markdown)
│
└── .github
    ├── ISSUE_TEMPLATE
    ├── PULL_REQUEST_TEMPLATE
    └── CODEOWNERS
```

**Each repo is small and focused.** Average size: 500-2000 LOC. Easy for AI tools to understand.

---

## 6. The 18-Month Build Plan (HOJAI Developer Platform)

| Quarter | Deliverable |
|---|---|
| **Q1 (months 1-3)** | Foundation SDK v1, SUTAR SDK v1, Commerce SDK v1, Nexha SDK v1, CLI v1 (`npx hojai create`), 3 starter kits (marketplace, B2B, company), docs.hojai.ai v1 |
| **Q2 (months 4-6)** | Payment SDK v1, Reputation SDK v1, Discovery SDK v1, 3 more starter kits (hotel, restaurant, logistics), HOJAI Marketplace v1, 2 industry SDKs (healthcare, hospitality) |
| **Q3 (months 7-9)** | SDK v2 (add agents, workflows), 3 more starter kits (CRM, ERP, POS), 3 more industry SDKs (logistics, manufacturing, realestate), developer portal v1 |
| **Q4 (months 10-12)** | HOJAI Foundry v1 (AI startup generator), 9 starter kits total, 7 industry SDKs, marketplace v1.5 with paid items, 100 developers onboarded |
| **Q5-Q6 (months 13-18)** | SDK v3, HOJAI Foundry v2 (better AI generation), marketplace mature, 1,000 developers, 5,000 platforms built |

**By end of Y1:**
- 7 SDKs shipped
- 9 starter kits shipped
- 7 industry SDKs shipped
- CLI working
- HOJAI Marketplace v1 live
- 100 developers onboarded
- 50 platforms built

**By end of Y2 (Q5-Q8):**
- All SDKs v3
- HOJAI Foundry v2
- 1,000 developers onboarded
- 5,000 platforms built
- 50,000 companies using HOJAI APIs

---

## 7. The "AI Tools Know About HOJAI" Playbook

The most important strategic move: **make every AI coding tool natively understand HOJAI.**

### How

**Step 1: Publish a HOJAI skill file for each tool.**

| Tool | File | Where |
|---|---|---|
| **Claude Code** | `SKILL.md` | GitHub repo, published to skill directory |
| **Cursor** | `.cursorrules` | GitHub repo, installed via `npx hojai cursor` |
| **Codex** | `AGENTS.md` | GitHub repo, OpenAI plugin marketplace |
| **GitHub Copilot** | `copilot-instructions.md` | GitHub repo, VSCode marketplace |
| **Windsurf** | `.windsurfrules` | GitHub repo, Codeium marketplace |
| **ChatGPT** | GPT actions | OpenAI GPT store |

**Step 2: Submit to each tool's marketplace.**

- Claude Skills marketplace (if exists)
- Cursor extensions marketplace
- VSCode extensions marketplace
- OpenAI GPT store
- GitHub Copilot extensions

**Step 3: Maintain a HOJAI "AI context" repo.**

`github.com/hojai-ai/ai-context` — single source of truth for all AI tools.

Contains:
- `hojai.ai.md` — main context file
- `.hojai/schema.json` — machine-readable schema
- `examples/` — example projects AI tools learn from
- `prompts/` — common prompts developers use
- `patterns/` — best practices for HOJAI development

**Step 4: Run HOJAI hackathons with AI tool sponsors.**

- "Build a marketplace in 4 hours with Claude Code + HOJAI"
- "Build a CRM in 1 day with Cursor + HOJAI"
- Co-marketed with each AI tool

**Step 5: Track AI tool → HOJAI conversion in the marketplace.**

Every project built with HOJAI gets tagged with which AI tool was used. This data:
- Proves which AI tools are most popular for HOJAI
- Helps us optimize the experience for those tools
- Provides case studies for marketing

---

## 8. The Year-1 Developer Funnel

```
              Awareness
                   │
       (AI tool marketplace, content, ads)
                   │
                   ▼
              Interest
                   │
       (docs.hojai.ai, GitHub, examples)
                   │
                   ▼
              Signup
                   │
       (free HOJAI Cloud account, API key)
                   │
                   ▼
              First Project
                   │
       (npx hojai create, starter kit)
                   │
                   ▼
              Production Deploy
                   │
       (HOJAI Cloud, $200+/mo Starter)
                   │
                   ▼
              Scale
                   │
       (HOJAI Cloud $2K+/mo Growth)
                   │
                   ▼
              Publish on Marketplace
                   │
       (SDK, starter kit, agent, etc.)
                   │
                   ▼
              Revenue Share
                   │
       (developer earns 70-80% of sales)
```

**Targets:**
- 10,000 visitors/month by Q4
- 1,000 signups/month by Q4
- 200 first projects/month by Q4
- 50 production deploys/month by Q4
- 10 marketplace publishers/month by Q4

---

## 9. The "Build a Marketplace in 30 Minutes" Demo

This is the single most important demo for HOJAI Foundry. A founder with no coding experience should be able to:

1. Open `npx hojai create`
2. Choose "Marketplace"
3. Choose "B2B Wholesale"
4. Choose "Sales + Procurement + Finance + Logistics" agents
5. Name it "TradeFlow"
6. Pick "Middle East" + "English/Arabic"
7. Click Generate
8. Wait 30 seconds
9. Run `cd tradeflow && npm run dev`
10. See a working marketplace at `localhost:3000`
11. Deploy with `npx hojai deploy` → live at `tradeflow.hojai.app`

**In 30 minutes, a non-technical founder has:**
- A working B2B marketplace
- 4 AI agents running (Sales, Procurement, Finance, Logistics)
- A registered Nexha on Global Nexha
- ACI baseline of 40 (Stage 1)
- CapabilityOS declaration
- HOJAI Cloud deployment
- Mobile apps (iOS + Android) ready to ship

**This is the killer demo.** If we nail this, HOJAI becomes the default platform for AI-native businesses.

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **AI tools don't adopt HOJAI skill files** | Medium | High | We don't need all of them; even 1-2 is enough |
| **Developers don't use starter kits** | Medium | High | Make the demo so good that devs can't ignore it |
| **Marketplace doesn't take off** | High | Medium | Focus on internal use (Nexha) first; external marketplace is bonus |
| **SDKs are too low-level** | Medium | High | Provide starter kits on top; developers use kits first, SDKs later |
| **CLI is hard to discover** | Medium | High | Content marketing; AI tools advertise HOJAI as a destination |
| **Competitor copies the model** | Low | Medium | Network effects + AI tool integration = moat |

---

## 11. The Single Sentence

> **HOJAI Developer Platform is the Lego-block architecture that lets any developer (or any AI coding assistant) build AI-native businesses, marketplaces, platforms, and operating systems — and publish them on the HOJAI Marketplace.**

---

## 12. Next Steps

When approved:

1. **Build `@hojai/foundation` v1** (1-2 weeks) — the core SDK
2. **Build `npx hojai create` CLI v1** (1 week) — the entry point
3. **Build `hojai-marketplace-starter` v1** (2 weeks) — the killer demo
4. **Publish `hojai.ai.md` + `.hojai/schema.json`** (1 week) — the AI-native spec
5. **Build the docs site** (2 weeks) — docs.hojai.ai
6. **Launch the first 5 platforms in private beta** (Month 3) — iterate based on feedback
7. **Submit to AI tool marketplaces** (Month 4) — Cursor, VSCode, Claude Skills
8. **Public launch at HOJAI DevDay** (Month 6) — keynote, demos, free swag

---

*This spec is the bridge between the 18-month plan (immediate build) and the 5-year plan (Platform-as-an-Economy). The Developer Platform is what makes HOJAI infinitely extensible without us building every app ourselves.*

*Last updated: 2026-06-22*
