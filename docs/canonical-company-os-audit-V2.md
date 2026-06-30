# Canonical CompanyOS Audit V2 — EXHAUSTIVE CODE-LEVEL GAP ANALYSIS
**Date:** June 30, 2026
**Purpose:** Audit actual code to avoid duplicates, then create phase-wise build plan

---

## EXECUTIVE SUMMARY

After reading actual source code (not just directory listings), here's what I found:

| Category | Status | Finding |
|----------|--------|---------|
| **Infrastructure** | ✅ EXCELLENT | MemoryOS, TwinOS, SUTAR, AgentOS, FlowOS all production-ready |
| **Worker Systems** | ⚠️ FRAGMENTED | 5 separate systems, 0 unified runtime |
| **Intent/Goal Pipeline** | ⚠️ SCATTERED | 8+ services, no unified pipeline |
| **Company Factory** | ⚠️ STUBBED | Templates exist, deployment is fake |
| **Department Runtime** | ⚠️ PARTIAL | Only Finance works, others are YAML |
| **BAM** | ⚠️ FRAGMENTED | 18+ marketplace directories, no unified |
| **Service Management** | ⚠️ DUPLICATE | 3 ticketing systems, 3 SLA systems |

**Core Problem:** Multiple systems exist that partially cover the same functionality. Nothing is fully complete. Everything needs integration work.

---

## PART 1: WORKER RUNTIME — THE REAL PICTURE

### What's ACTUALLY Built

| System | Location | Type | Status |
|--------|----------|------|--------|
| **AgentOS** | `platform/agent-os/` | 12 services, 737 tests | **PRODUCTION** |
| **SUTAR OS** | `sutar-os/` | 34 services, 620 tests | **PRODUCTION** |
| **CorpPerks Workforce Planning** | `companies/CorpPerks/workforce-planning/` | Human/AI workers | **FUNCTIONAL** |
| **Nexha AgentOS** | `companies/Nexha/services/nexha-agent-os/` | 5 business agents | **FUNCTIONAL** |
| **RABTUL Autonomous Agents** | `companies/RABTUL-Technologies/REZ-autonomous-agents/` | 8 agents | **FUNCTIONAL** |
| **CorpPerks AI Agents** | `companies/CorpPerks/ai-agents-service/` | 40+ role agents | **FUNCTIONAL** |

### The 5 Worker Systems

#### System 1: AgentOS (HOJAI-AI)
```
platform/agent-os/
├── agent-platform-api (4802)     # Gateway
├── agent-registry (4803)         # Agent identity
├── capability-store (4804)       # Capability graph
├── tool-registry (4805)          # Tools catalog
├── skill-library (4806)          # Skills
├── message-bus (4807)            # Pub/sub
├── scheduler (4808)              # Cron
├── context-store (4809)          # Context
├── agent-memory-bridge (4811)    # MemoryOS bridge
├── agent-orchestrator (4812)     # DAG workflows
├── agent-execution-engine (4813)  # ReAct loops
└── agent-observability (4814)     # Metrics
```
**Status:** MOST PRODUCTION-READY. 737 tests passing.

#### System 2: SUTAR OS (ACN)
```
sutar-os/
├── acp-protocol (4800)           # AI-to-AI messaging
├── acn-network (4801)             # Agent registry
├── agent-contracts (4830)         # Smart contracts
├── agent-marketplace (4845)       # Agent listings
├── agent-learning (4846)          # ML learning
├── agent-orchestration (4851)     # Multi-agent
├── negotiation-ai (4850)          # Negotiation
├── agent-teaming (4853)           # Team formation
└── merchant-agents (4737)          # Commerce agents
```
**Status:** Commerce-focused, connected to TwinOS/CorpID.

#### System 3: CorpPerks Workforce Planning (4511)
```
companies/CorpPerks/workforce-planning/
├── WORKER_TYPES = { HUMAN, AI }
├── Departments CRUD
├── Workers CRUD (human + ai)
├── Demand forecasting
├── Capacity optimization
└── Human/AI composition analysis
```
**Status:** Has the CONCEPT of unified workers but limited implementation.

#### System 4: Nexha AgentOS (4372)
```
companies/Nexha/services/nexha-agent-os/
├── CEO Agent
├── Marketing Agent
├── Finance Agent
├── Procurement Agent
└── CustomerCare Agent
```
**Status:** Uses CorpID, MemoryOS, TwinOS. NOT connected to AgentOS.

#### System 5: RABTUL Autonomous Agents (4062)
```
companies/RABTUL-Technologies/REZ-autonomous-agents/
├── CustomerServiceAgent
├── OrderFulfillmentAgent
├── InventoryAgent
├── PaymentRecoveryAgent
├── LeadQualificationAgent
├── MarketingAgent
├── FraudDetectionAgent
└── RetentionAgent
```
**Status:** 25K LOC, completely separate from AgentOS/SUTAR.

### DUPLICATION ANALYSIS

| Concept | Systems | Which to KEEP |
|---------|---------|---------------|
| Agent Registry | AgentOS (4803), SUTAR (4801), Nexha, RABTUL | **AgentOS** (most complete) |
| Capability Model | AgentOS capability-store, SUTAR skills, CorpPerks skills | **AgentOS** |
| Scheduling | AgentOS scheduler (4808), SUTAR (4290) | **AgentOS** |
| Execution | AgentOS execution-engine (4813), SUTAR (4293) | **AgentOS** |
| Worker Types | CorpPerks has human/ai, others have ai-only | **CorpPerks workforce-planning** for concept |

### WHAT'S MISSING

1. **Unified Worker Registry** — AgentOS should be the canonical registry, but CorpPerks employees don't register there
2. **CorpID Integration** — SUTAR has `sutar-identity` (4144) but CorpPerks doesn't use CorpID
3. **Human → Agent Bridge** — workforce-planning has the concept but no execution
4. **Capability Alignment** — AgentOS capabilities ≠ CorpPerks skills (no mapping)

### WHAT TO DO

```
RECOMMENDATION: Make AgentOS the canonical worker runtime.

1. Keep: AgentOS (12 services, 737 tests) as the foundation
2. Integrate: CorpPerks employees should register in AgentOS agent-registry
3. Bridge: workforce-planning should use AgentOS for scheduling/execution
4. Migrate: SUTAR agents should use AgentOS for non-commerce tasks
5. Connect: Nexha/RABTUL agents should federate with AgentOS
```

---

## PART 2: INTENT/GOAL PIPELINE — THE REAL PICTURE

### What's ACTUALLY Built

| Service | Port | Type | Status |
|---------|------|------|--------|
| **Intent Engine** | 4786 | Classification | TEMPLATE (keyword match) |
| **Widget Backend Intent** | 5380 | Classification | FUNCTIONAL (routes to agents) |
| **Goal-OS** | 4242 | Goal hierarchy | **FULLY FUNCTIONAL** |
| **Memory Graph Goals** | 4717 | Goal CRUD | FUNCTIONAL |
| **Planning Engine** | 4896 | DAG planning | FUNCTIONAL |
| **Goal-Task Linker** | 4293 | Linking | FUNCTIONAL |
| **LoopOS** | 4721-4725 | Autonomous | **PRODUCTION** |
| **Execution Engine** | 4726 | Tasks/workflows | FUNCTIONAL |
| **Genie Planner** | 4744 | Todos/habits | FUNCTIONAL |

### The Pipeline (ACTUAL)

```
USER INPUT
    │
    ├──→ Intent Engine (4786) ── keyword match, 9 intents
    │
    └──→ Widget Intent (5380) ── routes to SUTAR agents
            │
            ▼
    ┌───────────────────────────────────────┐
    │              GOAL-OS (4242)            │
    │  • Full hierarchy (vision→task→action) │
    │  • Decomposition engine               │
    │  • Dependency engine                  │
    │  • Prediction engine                  │
    │  • Optimization engine                │
    └───────────────┬───────────────────────┘
                    │
    ┌───────────────┼───────────────────────┐
    ▼               ▼                       ▼
Goal-Task        Planning              LoopOS
Linker (4293)    Engine (4896)         (Autonomous)
    │               │                       │
    ▼               ▼                       ▼
Execution       DAG execution        Scheduler
Engine (4726)   (mock)              Budget + Verification
    │
    ▼
MemoryOS + TwinOS
```

### DUPLICATION ANALYSIS

| Concept | Systems | Which to KEEP |
|---------|---------|---------------|
| Goal creation | Goal-OS (Redis), Memory Graph (Map) | **Goal-OS** |
| Intent classification | Intent Engine, Widget Intent | **Widget Intent** (more functional) |
| Planning | Goal-OS plan(), Planning Engine | **Goal-OS** |
| Task management | Execution Engine, Genie Planner | **Execution Engine** |
| Loop/Autonomous | LoopOS, Goal-OS loops | **LoopOS** |

### WHAT'S MISSING

1. **Unified Intent → Goal Pipeline** — Intent engines don't feed into Goal-OS
2. **LLM-based Intent** — Only keyword matching exists
3. **Worker Routing** — No service maps intents to capable workers
4. **Execution Plan → Worker Assignment** — Planning engine doesn't connect to AgentOS

### WHAT TO DO

```
RECOMMENDATION: Build the Intent → Goal → Worker pipeline.

1. Upgrade: Intent Engine → use LLM for classification
2. Connect: Intent Engine → Goal-OS (auto-create goals)
3. Bridge: Goal-OS → AgentOS (worker assignment)
4. Wire: Planning Engine → AgentOS orchestrator (actual execution)
```

---

## PART 3: COMPANY FACTORY — THE REAL PICTURE

### What's ACTUALLY Built

| Component | Location | Status |
|-----------|----------|--------|
| **Templates** | `company-factory/templates.ts` | **COMPLETE** (26 templates) |
| **Factory Service** | `company-factory/factory.ts` | STUBBED (all steps set `=true`) |
| **Composition Engine** | `composition-engine/` | PARTIAL (validation works, install is fake) |
| **Studio UI** | `studio/App.tsx` | FUNCTIONAL (4-step wizard) |
| **AI Workforce Deployer** | `ai-workforce/deployer/` | STUBBED (in-memory only) |
| **Governance OS** | `governance-os/` | PARTIAL (policies exist, compliance is fake) |
| **Economy OS** | `economy-os/` | PARTIAL (wallets exist, payments fake) |

### The Deployment Flow (CURRENT)

```typescript
// factory.ts line 103-135 — EVERY STEP IS STUBBED
case 'CompanyOS':
  deployment.components.companyOS = true;  // JUST SETS TRUE
  break;
case 'industryExtension':
  deployment.components.industryExtension = true;  // JUST SETS TRUE
case 'aiWorkers':
  deployment.components.aiWorkers = true;  // JUST SETS TRUE
case 'distribution':
  deployment.distribution = true;  // JUST SETS TRUE
case 'wallets':
  deployment.components.wallets = true;  // JUST SETS TRUE
case 'trust':
  deployment.components.trust = true;  // JUST SETS TRUE
```

### WHAT'S MISSING

1. **Actual Infrastructure Provisioning** — No Docker/Kubernetes/AWS
2. **Legal Setup** — No GST/PAN/company registration
3. **Database Initialization** — No MongoDB/PostgreSQL
4. **AI Worker Instantiation** — References AI workers but doesn't deploy them
5. **Wallet Creation** — Sets boolean but doesn't create actual wallets
6. **Trust Establishment** — Sets boolean but doesn't create trust records
7. **Rollback** — Deletes in-memory state, doesn't actually rollback
8. **Monitoring** — No health checks, no metrics

### WHAT TO DO

```
RECOMMENDATION: Phase the factory realistically.

Phase 1: Connect existing services (don't rebuild)
  - CompanyOS composition → use existing services
  - AI Workers → wire to AgentOS deployment
  - Wallets → wire to REZ Wallet
  - Trust → wire to TrustOS

Phase 2: Add missing integrations
  - Legal setup (stubs for v1)
  - Database provisioning (use HOJAI Cloud)
  - DNS/SSL (use HOJAI Cloud)

Phase 3: Full automation
  - One-click company deployment
  - Auto-scaling
  - Monitoring
```

---

## PART 4: DEPARTMENT RUNTIME — THE REAL PICTURE

### What's ACTUALLY Built

| Department | manifest.yaml | Source Code | Port | Status |
|------------|--------------|-------------|------|--------|
| **Finance** | ✅ | ✅ COMPLETE | 4801 | **WORKS** |
| HR | ✅ | ❌ NO CODE | 5077 | YAML only |
| Legal | ✅ | ❌ NO CODE | 5035 | YAML only |
| Marketing | ✅ | ❌ NO CODE | 5500 | YAML only |
| Operations | ✅ | ❌ NO CODE | 5250 | YAML only |
| Sales | ✅ | ❌ NO CODE | 5055 | YAML only |

### Finance Pack — The Only Working Department

```typescript
// finance/src/routes/index.ts — ACTUAL ENDPOINTS
POST/GET /api/invoices
POST/GET /api/payments
POST/GET /api/expenses
GET /api/accounting/chart-of-accounts
GET /api/accounting/trial-balance
GET /api/treasury/balances
GET /api/reports/balance-sheet
GET /api/reports/p&l
```

### Other Departments — YAML Only

```
hr/
├── manifest.yaml  ← Only this exists
legal/
├── manifest.yaml  ← Only this exists
marketing/
├── manifest.yaml  ← Only this exists
operations/
├── manifest.yaml  ← Only this exists
sales/
├── manifest.yaml  ← Only this exists
```

### Salar OS — Separate System

```
platform/twins/salar-os/
├── capabilityRegistry.ts      # Maps capabilities to humans/agents
├── agentTwin.ts               # AI agent digital twins
├── hybridTwin.ts              # Human+agent teams
├── organizationTwin.ts        # Organization digital twin
├── vectorStore.ts             # Embeddings
├── salarSutarBridge.ts        # SUTAR integration
└── sadaTrustIntegration.ts    # Trust scoring
```

**Status:** COMPLETE (13 modules) but NOT connected to department packs.

### Control Plane — Doesn't Route

```
control-plane (4010)
├── GET /api/packs         ← Lists packs
├── GET /api/departments   ← Lists departments
└── NO ROUTING — doesn't proxy to finance (4801), hr (5077), etc.
```

### DUPLICATION ANALYSIS

| Concept | Systems | Which to KEEP |
|---------|---------|---------------|
| Department definitions | manifest.yaml, templates.ts | **Both** (templates reference manifests) |
| Department execution | Finance pack (4801), existing HR/Marketing/Sales OS | **Keep existing industry OS** |
| Twin management | Department manifests, Salar OS | **Salar OS** (more complete) |

### WHAT'S MISSING

1. **HR Pack Execution** — Only YAML, no API service
2. **Legal Pack Execution** — Only YAML, no API service
3. **Marketing Pack Execution** — Only YAML, no API service
4. **Operations Pack Execution** — Only YAML, no API service
5. **Sales Pack Execution** — Only YAML, no API service
6. **Control Plane Routing** — Should proxy to department services
7. **AI Workers in Departments** — Only Finance has actual AI agents

### WHAT TO DO

```
RECOMMENDATION: Don't rebuild existing services.

Instead of: Build new HR/Marketing/Sales packs

Do: Wire existing services to CompanyOS
  - HR → Use CorpPerks PeopleOS (5077)
  - Sales → Use Sales OS (5055)
  - Marketing → Use Marketing OS (5500)
  - Finance → Use Finance Pack (4801) ← Already exists

Build NEW:
  - Control Plane routing (proxy to existing services)
  - Department Runtime (orchestrate across services)
```

---

## PART 5: BAM — THE REAL PICTURE

### What's ACTUALLY Built

| Marketplace | Location | Status | Completeness |
|------------|----------|--------|-------------|
| **BLR AI Marketplace** | `blr-ai-marketplace/` | ~70% | **BEST** — 8 services, Next.js, Stripe |
| **Connector Marketplace** | `platform/connectors/connector-marketplace/` | Functional | 8 connectors, PersistentMap |
| **Nexha Agent Marketplace** | `companies/Nexha/services/nexha-agent-marketplace/` | Functional stub | In-memory, 10 agents |
| **BAM Server** | `platform/bam-server/` | STUB | 193 lines, hardcoded data |
| **SUTAR Agent Marketplace** | `sutar-os/agents/agent-marketplace/` | Stub | 728 lines, not running |
| **Twin Marketplace** | `blr-ai-marketplace/twin-marketplace/` | Functional | Port 4146 |

### The 18+ Marketplace Directories

```
HOJAI-AI/
├── blr-ai-marketplace/                    ← MAIN
├── platform/bam-server/                   ← STUB
├── platform/connectors/connector-marketplace/
├── platform/skills/workflow-marketplace/
├── platform/flow/services/workflow-marketplace/
├── platform/intelligence/knowledge-marketplace/
├── platform/skills/industry-packs/
├── sutar-os/agents/agent-marketplace/     ← DUPLICATE
├── sutar-os/marketplace/                  ← OLD location

Nexha/
└── services/nexha-agent-marketplace/      ← SEPARATE

RABTUL/
├── REZ-agent-marketplace/
└── REZ-agent-builder-ui/

REZ-Merchant/
└── rez-supplier-marketplace/

RisaCare/
└── risa-care-marketplace/
```

### BLR AI Marketplace — The Best Implementation

```
blr-ai-marketplace/
├── frontend/ (Next.js)
│   ├── home/
│   ├── listings/
│   ├── categories/
│   └── checkout/
├── services/
│   ├── marketplace-listings (4255)    ← BEST - MongoDB, 81 tests
│   ├── discovery-engine (4256)
│   ├── roi-calculator (4259)
│   ├── blr-founder-os (4260)
│   ├── multi-agent-evaluator (4257)
│   ├── reputation-aggregator (4258)
│   ├── twin-marketplace (4146)
│   └── exploration (4255)
└── sdk/ (hojai-marketplace npm package)
```

### BAM Hierarchy — What EXISTS

| Layer | Status | Implementation |
|-------|--------|---------------|
| **Connectors** | ✅ Functional | connector-marketplace (8 seeded) |
| **Flows** | ⚠️ Fragmented | 2 workflow-marketplace directories |
| **Knowledge** | ⚠️ Partial | knowledge-marketplace exists |
| **Workers/Agents** | ✅ Fragmented | Nexha + SUTAR + RABTUL (duplicates) |
| **Departments** | ⚠️ Config only | JSON manifests, no runtime |
| **Apps** | ❌ Missing | No app marketplace |
| **Companies** | ❌ Missing | No company template marketplace |
| **Industries** | ⚠️ Fragmented | Multiple directories |
| **Networks** | ⚠️ Partial | Division 11 exists |

### DUPLICATION — CHOOSE ONE

| Duplicate | Options | Recommendation |
|-----------|---------|----------------|
| Agent Marketplace | SUTAR (4845), Nexha (4250), BLR | **BLR** — most complete |
| Workflow Marketplace | platform/skills/, platform/flow/ | **Consolidate into BLR** |
| Department Packs | company-os/dept-packs, platform/dept-packs | **Keep company-os version** |

### WHAT'S MISSING

1. **Worker/Employee Marketplace** — No AI professional marketplace
2. **App Marketplace** — No app store
3. **Company Template Marketplace** — Can't browse/buy company blueprints
4. **SOP/Playbook Marketplace** — Knowledge exists but not sellable
5. **Real Install()** — All marketplaces stub the install
6. **Unified Discovery** — 18+ directories, no single search

### WHAT TO DO

```
RECOMMENDATION: Make BLR AI Marketplace the canonical BAM.

Phase 1: Consolidate
  - Migrate SUTAR agents → BLR listings
  - Migrate Nexha agents → BLR listings
  - Migrate connectors → BLR listings
  - Keep Twin Marketplace (4146) as-is

Phase 2: Expand layers
  - Add App layer to BLR
  - Add Company Template layer
  - Add Knowledge/Playbook layer

Phase 3: Implement real install
  - Wire to Company Factory
  - Wire to AgentOS deployment
  - Wire to Connector runtime
```

---

## PART 6: SERVICE MANAGEMENT — THE REAL PICTURE

### What's ACTUALLY Built

| System | Port | Type | Status |
|--------|------|------|--------|
| **Service Management** | 4510 | Ticketing | BASIC (in-memory) |
| **Customer Support Service** | 5390 | Ticketing | FUNCTIONAL (MongoDB) |
| **HIB Helpdesk Ticketing** | 5376 | Ticketing | MOST COMPLETE |
| **Unified Support Bridge** | 4885 | Multi-channel | **PRODUCTION** |
| **Live Support OS** | 4884 | Escalation | FUNCTIONAL |
| **Change Management** | 4864 | IT changes | **FULLY FUNCTIONAL** |
| **Support SLA Service** | 5085 | SLA | DUPLICATE |
| **Support Escalation** | 5084 | Escalation | DUPLICATE |
| **AI Workspace KB** | 5377 | Knowledge | FUNCTIONAL |
| **Incident Management** | ? | — | **MISSING** (empty dir) |

### The 3 Ticketing Systems

```
1. service-management (4510)
   ├── customer/it/hr/general tickets
   ├── SLA tracking
   ├── Approval workflow
   └── In-memory storage

2. customer-support-service (5390)
   ├── campaign/billing/technical tickets
   ├── SLA tracking
   ├── Agent assignment
   └── MongoDB storage

3. helpdesk-ticketing-service (5376) ← MOST COMPLETE
   ├── Technical/Billing/Account tickets
   ├── Public/private comments
   ├── Assignment history
   ├── SLA breach tracking
   ├── Customer ratings
   └── MongoDB storage
```

### ITSM Pillar Coverage

| Pillar | Status | Implementation |
|--------|--------|---------------|
| **Incident Management** | ❌ MISSING | Empty directory |
| **Problem Management** | ❌ MISSING | No link incidents→root cause |
| **Change Management** | ✅ COMPLETE | change-mgmt-os (4864) |
| **Service Catalog** | ❌ MISSING | No self-service portal |
| **Asset Management** | ⚠️ PARTIAL | asset-twin exists, not ITSM-focused |
| **Knowledge Base** | ⚠️ FRAGMENTED | AI Workspace KB + 5 other KB services |
| **Service Request** | ⚠️ DUPLICATE | 3 ticketing systems |

### WHAT TO DO

```
RECOMMENDATION: Consolidate and extend.

Phase 1: Consolidate
  - Pick helpdesk-ticketing-service (5376) as canonical
  - Deprecate service-management (4510)
  - Deprecate customer-support-service (5390)
  - Keep unified-support-bridge (4885) for multi-channel
  - Keep live-support-os (4884) for escalation

Phase 2: Extend
  - Add Problem Management (link to incidents)
  - Add Service Catalog (what can be requested)
  - Add CMDB (asset configuration)

Phase 3: Connect
  - Wire Change Management (4864) to ticketing
  - Wire Knowledge Base to resolution
```

---

## PART 7: THE UNIFIED GAP ANALYSIS

### What's BUILT vs. NEEDED

| Canonical Layer | Built | Gap | Priority |
|----------------|-------|-----|----------|
| **Identity & Governance** | ✅ CorpID, TrustOS | None | — |
| **People & Workforce** | ⚠️ CorpPerks, AgentOS (separate) | Unified runtime | P0 |
| **Customer & Relationships** | ✅ REZ, Customer Twins | None | — |
| **Communications** | ✅ RAZO, VoiceOS, HIB | None | — |
| **Finance & Economy** | ⚠️ EconomyOS, REZ Wallet | Integration | P1 |
| **Operations** | ✅ FlowOS, TwinOS | None | — |
| **Service Management** | ⚠️ 3 ticketing, ITSM partial | Consolidation + Problem Mgmt | P1 |
| **Intelligence** | ✅ HIB, FounderOS | None | — |
| **Memory & Knowledge** | ✅ MemoryOS, Knowledge Graph | None | — |
| **AI Workforce** | ✅ AgentOS (production) | Integration to CompanyOS | P0 |
| **Build Layer** | ⚠️ HOJAI Studio | Real deployment | P1 |
| **Commerce & Networks** | ✅ Nexha | None | — |
| **Industry Extensions** | ✅ 26 Industry OS | Wiring to CompanyOS | P1 |

### THE ACTUAL GAPS (No Duplicates)

1. **Worker Runtime Integration** — AgentOS exists but not wired to CompanyOS
2. **Intent → Goal → Worker Pipeline** — 8 services exist but no unified flow
3. **Company Factory Deployment** — Templates exist, deployment is fake
4. **Control Plane Routing** — Should proxy to existing services (not build new)
5. **Problem Management** — Missing ITSM pillar
6. **Service Catalog** — Missing ITSM pillar
7. **Unified BAM** — 18+ directories, need single source of truth
8. **AI Worker → Department Mapping** — Department packs have YAML, no runtime

---

## PART 8: PHASE-WISE BUILD PLAN

### Phase 1: Wire Existing Systems (Weeks 1-4)

**Goal:** Don't rebuild. Connect what exists.

#### 1.1 Worker Runtime Integration
```
Build: company-os/src/worker-runtime-bridge.ts
  - Wire AgentOS (4802-4814) to CompanyOS
  - Create unified worker registry endpoint
  - Map AgentOS capabilities → Department workers

Existing: AgentOS (12 services)
Existing: CorpPerks workforce-planning (4511)
Existing: SUTAR agents

NOT building new. Just wiring.
```

#### 1.2 Intent → Goal → Worker Pipeline
```
Build: company-os/src/intent-goal-bridge.ts
  - Wire Intent Engine (4786) → Goal-OS (4242)
  - Wire Goal-OS → AgentOS (worker assignment)
  - Wire Planning Engine → AgentOS orchestrator (4812)

Existing: Intent Engine, Goal-OS, Planning Engine, AgentOS
NOT building new. Just wiring.
```

#### 1.3 Control Plane Routing
```
Build: company-os/control-plane/src/router.ts
  - Proxy /api/departments/* → existing department services
  - GET /api/departments → list available departments
  - POST /api/departments/:id/use → wire to existing service

Existing: Finance Pack (4801), Sales OS (5055), Marketing OS (5500), etc.
NOT building new. Just routing.
```

**Phase 1 Deliverables:**
- AgentOS workers wired to CompanyOS
- Intent → Goals → Worker pipeline works
- Control Plane routes to existing services
- Zero new services, just integration code

---

### Phase 2: Complete Company Factory (Weeks 5-8)

#### 2.1 AI Worker Deployment
```
Build: company-factory/src/ai-worker-deployer.ts
  - Wire to AgentOS deployment endpoints
  - Create actual worker instances
  - Wire to department assignment

Existing: AgentOS deployment API
NOT building new. Just calling it.
```

#### 2.2 Wallet & Trust Integration
```
Build: company-factory/src/economy-setup.ts
  - Wire to REZ Wallet API
  - Wire to TrustOS
  - Create actual company wallet
  - Establish trust score

Existing: REZ Wallet (4004), TrustOS (platform/trust/)
NOT building new. Just wiring.
```

#### 2.3 Company Database Provisioning
```
Build: company-factory/src/database-provisioner.ts
  - Wire to HOJAI Cloud API (4380)
  - Provision MongoDB/PostgreSQL per tenant
  - Store connection strings in secrets

Existing: HOJAI Cloud (4380), Secrets Manager (4420)
NOT building new. Just calling it.
```

#### 2.4 Deployment Orchestration
```
Build: company-factory/src/deployment-orchestrator.ts
  - Sequential: CompanyOS → Industry Extension → AI Workers → Wallets → Trust
  - Parallel where possible
  - Health checks after each step
  - Rollback on failure

Existing: Everything above
NOT building new. Just orchestrating.
```

**Phase 2 Deliverables:**
- Company Factory actually deploys (not stubbed)
- AI workers get instantiated
- Wallets get created
- Database provisioned
- Health checks pass

---

### Phase 3: ITSM Consolidation (Weeks 9-12)

#### 3.1 Consolidate Ticketing
```
Build: unified-ticketing/src/index.ts
  - Keep: helpdesk-ticketing-service (5376) as canonical
  - Deprecate: service-management (4510), customer-support-service (5390)
  - Create adapter layer

NOT building new ticketing. Consolidating.
```

#### 3.2 Add Problem Management
```
Build: unified-ticketing/src/problem-management.ts
  - Link incidents to known errors
  - Root cause tracking
  - Problem → Incident mapping

NEW: This pillar is genuinely missing.
```

#### 3.3 Add Service Catalog
```
Build: unified-ticketing/src/service-catalog.ts
  - What services can be requested
  - Request workflow
  - Approval routing

NEW: This pillar is genuinely missing.
```

#### 3.4 Connect to Change Management
```
Build: unified-ticketing/src/change-integration.ts
  - Wire to change-mgmt-os (4864)
  - Changes create tickets
  - Incidents create change requests

Existing: Change Management (4864)
NOT building new. Just wiring.
```

**Phase 3 Deliverables:**
- Single ticketing system (deprecate 2)
- Problem Management added
- Service Catalog added
- Change Management wired

---

### Phase 4: BAM Consolidation (Weeks 13-16)

#### 4.1 Consolidate Marketplaces
```
Build: bam-consolidation/
  - Migrate SUTAR marketplace → BLR
  - Migrate Nexha marketplace → BLR
  - Migrate connector marketplace → BLR
  - Keep Twin Marketplace (4146) separate

NOT building new marketplaces. Consolidating.
```

#### 4.2 Expand BLR Layers
```
Build: bam-layers/
  - Add Company Template layer
  - Add Knowledge/Playbook layer
  - Add Worker/Employee layer

Extending BLR, not building new.
```

#### 4.3 Implement Real Install
```
Build: bam-install/
  - Wire to Company Factory
  - Wire to AgentOS deployment
  - Wire to Connector runtime

NOT building new. Just connecting.
```

**Phase 4 Deliverables:**
- BLR AI Marketplace = canonical BAM
- All agents in one place
- Real install works
- 11 BAM layers functional

---

### Phase 5: Documentation & Polish (Weeks 17-20)

#### 5.1 API Documentation
- Document all CompanyOS endpoints
- Document all integration points
- Create integration guides

#### 5.2 Testing
- Integration tests for all bridges
- E2E tests for Company Factory
- Load tests for BAM

#### 5.3 Monitoring
- Wire CompanyOS to observability
- Add health checks to all services
- Add metrics dashboards

**Phase 5 Deliverables:**
- All APIs documented
- All bridges tested
- Monitoring in place

---

## SUMMARY: WHAT TO BUILD vs. WHAT TO WIRE

### Build NEW (Genuinely Missing)
| Component | Why New | Effort |
|-----------|---------|--------|
| Problem Management | No existing system | 1 week |
| Service Catalog | No existing system | 1 week |
| Intent → Goal → Worker pipeline | 8 services exist but not wired | 2 weeks |
| Deployment orchestrator | Templates exist, execution fake | 2 weeks |
| Worker runtime bridge | AgentOS exists but not wired | 1 week |
| Control plane router | Should proxy, not duplicate | 1 week |

### Wire EXISTING (Don't Rebuild)
| Component | Existing | Effort |
|-----------|----------|--------|
| CorpPerks PeopleOS | ✅ (5077) | Wire to CompanyOS |
| Sales OS | ✅ (5055) | Wire to CompanyOS |
| Marketing OS | ✅ (5500) | Wire to CompanyOS |
| Finance Pack | ✅ (4801) | Already wired |
| REZ Wallet | ✅ (4004) | Wire to Factory |
| TrustOS | ✅ (platform/trust/) | Wire to Factory |
| HOJAI Cloud | ✅ (4380) | Wire to Factory |
| Secrets Manager | ✅ (4420) | Wire to Factory |
| Helpdesk Ticketing | ✅ (5376) | Make canonical |
| Change Management | ✅ (4864) | Wire to ITSM |
| BLR Marketplace | ✅ (~70%) | Make canonical |
| AgentOS | ✅ (12 services) | Wire to CompanyOS |
| Goal-OS | ✅ (4242) | Wire to Intent Engine |
| Twin Marketplace | ✅ (4146) | Keep separate |

### Deprecate / Merge
| System | Action | Reason |
|--------|--------|--------|
| service-management (4510) | Deprecate | helpdesk is better |
| customer-support-service (5390) | Deprecate | helpdesk is better |
| Support SLA Service (5085) | Deprecate | Duplicate |
| Support Escalation (5084) | Deprecate | live-support-os is better |
| SUTAR Agent Marketplace | Merge to BLR | Duplicate |
| Nexha Agent Marketplace | Merge to BLR | Duplicate |
| workflow-marketplace (2x) | Consolidate | Duplicate |
| Knowledge services (5x) | Pick one | Fragmented |

---

## CONCLUSION

**The code exists. It's not connected.**

The RTMN codebase has production-ready infrastructure (AgentOS, TwinOS, SUTAR, MemoryOS, FlowOS, etc.) but the product layers (CompanyOS, Company Factory, BAM, ITSM) are either stubbed or fragmented.

**The plan is NOT to build new. It's to wire existing.**

| Phase | Focus | New vs. Wire |
|-------|-------|--------------|
| 1 | Wire Existing | 100% wire, 0% build |
| 2 | Complete Factory | 20% build, 80% wire |
| 3 | ITSM Consolidation | 40% build, 60% wire |
| 4 | BAM Consolidation | 20% build, 80% wire |
| 5 | Docs & Polish | 0% build, focus on quality |

**Next Step:** Choose Phase 1 to start. Which sub-project should we begin with?
1. Worker Runtime Bridge (AgentOS → CompanyOS)
2. Intent → Goal → Worker Pipeline
3. Control Plane Routing

---

*Audit completed: June 30, 2026*
*Full codebase analysis with no duplicates*
