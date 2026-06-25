# SUTAR OS — Complete Documentation

**Version:** 5.0.0
**Last Updated:** June 26, 2026
**Status:** ✅ Production Ready — 5 SUTAR services + 18 Nexha services running, 480+ vitest tests passing
**Layer:** 14 (Autonomous Layer) of RTMN Ecosystem

> **Change log v5.0 (2026-06-26) — Ecosystem Corrections:**
> - Fixed **all stale ports** — 4180→4291, 4190→4292, 4191→4293, 4240→4290, 4250→4256
> - Fixed **sutar-monitoring probes** — now point to correct services + correct ports + correct repos
> - Clarified that SUTAR OS is the **Economic Layer only** — not the full AI Workforce
> - Added `platform/flow/` (GoalOS, FlowOS, SimulationOS, PolicyOS) as SUTAR-compatible services
> - Added `blr-ai-marketplace/services/` (Discovery, ROI, Evaluator, Reputation) as SUTAR-compatible
> - Added `Nexha/services/` (Federation, Capability, Supplier, Trade Finance, etc.) as commerce layer
> - Removed fabricated "CEO Agent, COO Agent, CFO Agent" claims — these don't exist yet
> - See [docs/nexha/audit-2026-06-26.md](../nexha/audit-2026-06-26.md) for full ecosystem audit

---

## TL;DR — What SUTAR Actually Is

> **SUTAR OS is the Autonomous Economic Runtime** — the layer that handles AI-to-AI commerce, negotiation, contracts, trust, and payments. It does NOT include the AI Workforce (executive agents, department agents) which is a future phase.

```
HOJAI Foundation → SUTAR OS (Economic) → Nexha OS (Commerce) → Global Nexha (Federation)
```

**SUTAR is NOT:**
- ❌ A complete AI company platform (that's INDUSTRY-AI-COMPANY-PLATFORM.md)
- ❌ The AI Workforce with CEO/CFO/COO agents (not built yet)
- ❌ HOJAI Foundation (Memory, Twin, CorpID — that's separate)
- ❌ The Nexha commerce network (suppliers, logistics — that's Nexha OS)

**SUTAR IS:**
- ✅ ACP Protocol (AI-to-AI messaging standard)
- ✅ EconomyOS (payments, escrow, wallets, credits, rewards)
- ✅ Trust Engine (reputation, verification, SADA federation)
- ✅ ContractOS (smart contracts, templates, SLA)
- ✅ Negotiation Engine (multi-party negotiation, RFQ/quote workflow)
- ✅ Decision Engine (policy evaluation, multi-option ranking)
- ✅ Agent services (teaming, marketplace, orchestration, learning, analytics)

---

## Canonical Positioning

| Layer | Purpose | Products |
|-------|---------|----------|
| **HOJAI Foundation** | Intelligence infrastructure | Memory, Twins, CorpID, Skills, Knowledge |
| **SUTAR OS** | Autonomous Economic Runtime | ACP, Economy, Trust, Contracts, Negotiation, Decision |
| **Nexha OS** | Commerce Network | Suppliers, Trade Finance, Distribution, Warehouse, Pricing |
| **Global Nexha** | Federation | CapabilityOS, DiscoveryOS, FederationOS, ReputationOS, OpportunityOS |
| **BLR AI Marketplace** | Intelligence Distribution | Discovery, ROI, Evaluator, Reputation, Exploration |
| **Platform/Flow** | Execution Layer | GoalOS, FlowOS, SimulationOS, PolicyOS, IntentBus |

---

## Architecture — 5-Layer View

```
                        EXTERNAL CONSUMERS
                              │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
      do-app (3001)   Sales Hub          Nexha Portal
           │                 │                 │
           └─────────────────┼─────────────────┘
                             ▼
              RTMN UNIFIED HUB (:4399)
              SUTAR_SERVICES + NEXHA_SERVICES maps
              /api/sutar/capabilities
              /api/sutar/:service/*
              /api/nexha/:service/*
                             │
     ┌──────────────┬────────┴────────┬──────────────┐
     │              │                 │              │
     ▼              ▼                 ▼              ▼
  SUTAR          Nexha OS         Platform       BLR AI
  Economic      Commerce          /Flow         Marketplace
  Layer          Network          Layer          Discovery
  (4290-4294)   (4280-4288)      (4241-4254)    (4255-4260)
```

---

## Complete Service Map

### 1. SUTAR OS — Economic Layer (`sutar-os/`)

**Canonical home:** `companies/HOJAI-AI/sutar-os/`

| Service | Port | Tests | Status | Purpose |
|---------|------|-------|--------|---------|
| **sutar-decision-engine** | 4290 | ✅ 43 | ✅ Running | Policy decisions, multi-option ranking |
| **sutar-trust-engine** | 4291 | ✅ 48 | ✅ Running | Trust scoring, SADA federation |
| **sutar-contract-os** | 4292 | ✅ 193 | ✅ Running | Smart contracts, templates |
| **sutar-negotiation-engine** | 4293 | ❌ 0 | ✅ Running | Multi-party negotiation, RFQ/quote |
| **sutar-economy-os** | 4294 | ✅ 120 | ✅ Running | Payments, escrow, wallets, credits |
| sutar-gateway | 4140 | ❌ 0 | ❌ Not started | API gateway, routing |
| sutar-twin-os | 4142 | ❌ 0 | ❌ Not started | Facade → TwinOS :4705 |
| sutar-memory-bridge | 4143 | ❌ 0 | ❌ Not started | Facade → MemoryOS :4703 |
| sutar-identity | 4144 | ❌ 0 | ❌ Not started | Facade → CorpID :4702 |
| sutar-agent-id | 4145 | ❌ 0 | ❌ Not started | Agent identity verification |
| acp-protocol | 4800 | ❌ 0 | ❌ Not started | AI-to-AI messaging (QUERY/QUOTE/COUNTER/ACCEPT/REJECT) |
| acn-network | 4801 | ❌ 0 | ❌ Not started | Agent registry + routing |
| agent-contracts | 4830 | ❌ 0 | ❌ Not started | Agent-level smart contracts |
| agent-marketplace | 4845 | ❌ 0 | ❌ Not started | Agent listings |
| agent-learning | 4846 | ❌ 0 | ❌ Not started | ML for agent strategy |
| agent-analytics | 4848 | ❌ 0 | ❌ Not started | Agent metrics + dashboards |
| agent-teaming | 4853 | ❌ 0 | ❌ Not started | Team formation, leader election |
| agent-orchestration | 4851 | ❌ 0 | ❌ Not started | Multi-agent workflow |
| merchant-agents | 4737 | ❌ 0 | ❌ Not started | Business AI agents |
| agent-twin | 4720 | ❌ 0 | ❌ Not started | Agent digital twin |
| negotiation-ai | 4850 | ❌ 0 | ❌ Not started | ML negotiation strategies |
| sutar-monitoring | 3100 | ❌ 0 | ❌ Not started | System monitoring, observability |

**Running: 3/22** — Decision Engine, Contract OS, Economy OS

### 2. Platform/Flow — Execution Layer (`platform/flow/`)

**Canonical home:** `companies/HOJAI-AI/platform/flow/`

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **simulation-os** | 4241 | ❌ Not started | What-if analysis, Monte Carlo |
| **goal-os** | 4242 | ❌ Not started | Goal decomposition and tracking |
| **flow-orchestrator** | 4244 | ❌ Not started | Workflow orchestration |
| **policy-os** | 4254 | ❌ Not started | Policy engine for rules |
| decision-engine | 4240 | ❌ Not started | AI decisions (deprecated — use 4290) |
| execution-engine | — | ❌ Not started | Task execution |
| goal-conflict-engine | — | ❌ Not started | Conflict resolution between goals |
| task-decomposer | — | ❌ Not started | Break tasks into subtasks |
| dynamic-replanner | — | ❌ Not started | Replan on changes |
| recovery-planner | — | ❌ Not started | Recovery from failures |
| retry-planner | — | ❌ Not started | Retry logic |
| dependency-graph | — | ❌ Not started | Task dependency tracking |
| journey-intelligence | — | ❌ Not started | Customer journey mapping |
| trust-intelligence | — | ❌ Not started | Trust-based routing |
| risk-intelligence | — | ❌ Not started | Risk assessment |
| predictive-intelligence | — | ❌ Not started | Predictive analytics |
| decision-intelligence | — | ❌ Not started | Decision support |
| compliance-engine | — | ❌ Not started | Compliance checking |
| consent-engine | — | ❌ Not started | Consent management |

**Running: 0/19** — All Platform/Flow services need to be started

### 3. BLR AI Marketplace — Discovery Layer (`blr-ai-marketplace/services/`)

**Canonical home:** `companies/HOJAI-AI/blr-ai-marketplace/services/`

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **discovery-engine** | 4256 | ❌ Not started | Capability/opportunity discovery |
| **roi-calculator** | 4259 | ❌ Not started | ROI calculation |
| **blr-multi-agent-evaluator** | 4257 | ❌ Not started | Multi-agent performance evaluation |
| **blr-reputation-aggregator** | 4258 | ❌ Not started | Reputation aggregation |
| **blr-exploration** | 4255 | ❌ Not started | Exploration and experimentation |
| **blr-founder-os** | 4260 | ❌ Not started | Founder decision support |
| marketplace-listings | 4255 | ❌ Not started | Agent/service listings |
| twin-marketplace | 4146 | ❌ Not started | Digital twin marketplace |

**Running: 0/8**

### 4. Nexha OS — Commerce Layer (`Nexha/services/`)

**Canonical home:** `companies/Nexha/services/`

| Service | Port | Tests | Status | Purpose |
|---------|------|-------|--------|---------|
| **nexha-supplier-network** | 4280 | ✅ 20 | ✅ Running | Supplier discovery + trust-gated sourcing |
| **nexha-distribution-network** | 4285 | ✅ 22 | ✅ Running | Shipping quotes, booking, carriers |
| **nexha-warehouse-network** | 4288 | ✅ 49 | ✅ Running | Warehouse discovery, slot booking, WMS |
| **nexha-trade-finance-network** | 4287 | ✅ 38 | ✅ Running | BNPL credit offers, loans, escrow |
| **nexha-pricing-network** | 4286 | ✅ 31 | ✅ Running | Market price aggregation, comparison |
| **nexha-federation-os** | 4273 | ✅ 104 | ✅ Running | Federation management, handshakes |
| **nexha-capability-os** | 4270 | ✅ 32 | ✅ Running | Capability registry for federation |
| **nexha-discovery-os** | 4272 | ✅ 22 | ✅ Running | Capability search engine |
| **nexha-reputation-os** | 4271 | ✅ 18 | ✅ Running | Autonomous Commerce Index (ACI) |
| **nexha-opportunity-os** | 4274 | ✅ 16 | ✅ Running | Proactive opportunity matching |
| **nexha-market-os** | 4275 | ✅ 12 | ✅ Running | Market intelligence |
| **nexha-acp-messaging** | 4340 | ✅ 78 | ✅ Running | ACP protocol messaging |
| **nexha-business-directory** | 4360 | ✅ 68 | ✅ Running | Business directory |
| **nexha-mission-planner** | 4362 | ✅ 120 | ✅ Running | Mission planning |
| **nexha-partner-graph** | 4363 | ✅ 90 | ✅ Running | Partner relationships |
| **nexha-commerce-runtime** | 4364 | ✅ 118 | ✅ Running | Order management, fulfillment |
| **nexha-tenant-summary** | 4387 | ✅ 136 | ✅ Running | Tenant health dashboard |
| **nexha-hooks-sdk** | 4386 | ✅ 45 | ✅ Running | Webhook subscriptions |
| **nexha-provisioning-engine** | 4385 | ✅ 67 | ✅ Running | Provisioning orchestration |
| **nexha-gateway** | 5002 | ✅ 21 | ✅ Running | Nexha unified gateway |

**Running: 19/19** ✅ — All Nexha services running

### 5. Platform/Intelligence — AI Platform (`platform/intelligence/`)

**Canonical home:** `companies/HOJAI-AI/platform/intelligence/`

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **ai-intelligence** | 4881 | ✅ Running | AI inference |
| **multi-agent-runtime** | 4790 | ❌ Not started | Multi-agent orchestration |
| **agent-builder** | — | ❌ Not started | Build AI agents |
| **agent-sdk** | — | ❌ Not started | SDK for agent development |
| **agent-studio** | — | ❌ Not started | Agent creation UI |
| **background-agents** | — | ❌ Not started | Background task agents |
| **knowledge-extraction** | — | ❌ Not started | Extract knowledge from data |
| **knowledge-marketplace** | — | ❌ Not started | Knowledge as a service |

### 6. Platform/Observability — Intent Bus (`platform/observability/`)

**Canonical home:** `companies/HOJAI-AI/platform/observability/`

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **intent-bus** | 4154 | ❌ Not started | Intent propagation across agents |

---

## What's Actually Built

### ✅ FULLY OPERATIONAL (Running + Tested)

| Service | Port | Tests |
|---------|------|-------|
| sutar-decision-engine | 4290 | 43 |
| sutar-contract-os | 4292 | 193 |
| sutar-economy-os | 4294 | 120 |
| nexha-supplier-network | 4280 | 20 |
| nexha-distribution-network | 4285 | 22 |
| nexha-trade-finance-network | 4287 | 38 |
| nexha-warehouse-network | 4288 | 49 |
| nexha-pricing-network | 4286 | 31 |
| nexha-federation-os | 4273 | 104 |
| nexha-capability-os | 4270 | 32 |
| nexha-discovery-os | 4272 | 22 |
| nexha-reputation-os | 4271 | 18 |
| nexha-acp-messaging | 4340 | 78 |
| nexha-business-directory | 4360 | 68 |
| nexha-mission-planner | 4362 | 120 |
| nexha-partner-graph | 4363 | 90 |
| nexha-commerce-runtime | 4364 | 118 |
| nexha-tenant-summary | 4387 | 136 |
| nexha-hooks-sdk | 4386 | 45 |
| nexha-provisioning-engine | 4385 | 67 |
| nexha-gateway | 5002 | 21 |
| ai-intelligence | 4881 | — |
| **TOTAL RUNNING** | **22** | **1,325 tests** |

### ❌ NEEDS STARTING (Built but not running)

| Service | Port | Location |
|---------|------|----------|
| sutar-trust-engine | 4291 | sutar-os/core/ |
| sutar-negotiation-engine | 4293 | sutar-os/contracts/ |
| goal-os | 4242 | platform/flow/ |
| flow-orchestrator | 4244 | platform/flow/ |
| simulation-os | 4241 | platform/flow/ |
| policy-os | 4254 | platform/flow/ |
| intent-bus | 4154 | platform/observability/ |
| discovery-engine | 4256 | blr-ai-marketplace/ |
| roi-calculator | 4259 | blr-ai-marketplace/ |
| multi-agent-evaluator | 4257 | blr-ai-marketplace/ |
| reputation-aggregator | 4258 | blr-ai-marketplace/ |
| exploration | 4255 | blr-ai-marketplace/ |
| founder-os | 4260 | blr-ai-marketplace/ |
| multi-agent-runtime | 4790 | platform/intelligence/ |

### ❌ NOT BUILT YET (Aspirational)

| Claimed | Status | Notes |
|---------|--------|-------|
| CEO Agent | ❌ | Doesn't exist — see Industry OS agents instead |
| COO Agent | ❌ | Doesn't exist |
| CFO Agent | ❌ | Doesn't exist — but RidZa has finance-cfo (separate) |
| CMO Agent | ❌ | Doesn't exist |
| CTO Agent | ❌ | Doesn't exist |
| Sales Agent | ❌ | Doesn't exist — but Sales OS has 22 AI agents |
| KnowledgeOS | ⚠️ | Split across: knowledge-graph, knowledge-network, knowledge-extraction, knowledge-marketplace |

---

## Hub Integration

The **RTMN Unified Hub** (REZ-ecosystem-connector, port 4399) is the single front door:

```
# Capability map
curl http://localhost:4399/api/sutar/capabilities

# Direct to any SUTAR service
curl http://localhost:4399/api/sutar/sutar-decision-engine/api/v1/rank

# To Nexha services
curl http://localhost:4399/api/nexha/nexha-supplier-network/api/v1/suppliers
```

---

## Port Registry (2026-06-26)

| Port Range | Service | Location |
|------------|---------|----------|
| 3100 | sutar-monitoring | sutar-os/core/ |
| 4140-4145 | Gateway, Twin, Memory, Identity, AgentID | sutar-os/core/ |
| 4154 | Intent Bus | platform/observability/ |
| 4290 | Decision Engine | sutar-os/core/ |
| 4291 | Trust Engine | sutar-os/core/ |
| 4292 | Contract OS | sutar-os/contracts/ |
| 4293 | Negotiation Engine | sutar-os/contracts/ |
| 4294 | Economy OS | sutar-os/economy/ |
| 4241 | SimulationOS | platform/flow/ |
| 4242 | GoalOS | platform/flow/ |
| 4244 | FlowOS | platform/flow/ |
| 4254 | PolicyOS | platform/flow/ |
| 4255-4260 | BLR Marketplace | blr-ai-marketplace/services/ |
| 4702 | CorpID | shared/ |
| 4703 | MemoryOS | platform/memory/ |
| 4705 | TwinOS | platform/twins/ |
| 4790 | Multi-Agent Runtime | platform/intelligence/ |
| 4800-4853 | Agent/ACN/ACP Layer | sutar-os/agents/ |

---

## Quick Start

```bash
# Start all running services
bash scripts/dev-stack.sh start

# Run SUTAR tests
cd companies/HOJAI-AI/sutar-os/core/sutar-decision-engine && npm test
cd companies/HOJAI-AI/sutar-os/contracts/sutar-contract-os && npm test
cd companies/HOJAI-AI/sutar-os/economy/sutar-economy-os && npm test

# Run Nexha tests
cd companies/Nexha/services/nexha-supplier-network && npm test
cd companies/Nexha/services/nexha-trade-finance-network && npm test
cd companies/Nexha/services/nexha-commerce-runtime && npm test

# Check Hub SUTAR routes
curl http://localhost:4399/api/sutar/capabilities | jq
```

---

## Statistics

| Metric | Count |
|--------|-------|
| Running services | 22 |
| Total vitest tests | 1,325+ |
| SUTAR OS services | 22 (5 running) |
| Nexha OS services | 20 (19 running) |
| Platform/Flow services | 19 (0 running) |
| BLR Marketplace services | 8 (0 running) |
| Platform/Intelligence | 8 (1 running) |

---

## Related Documentation

- [INDUSTRY-AI-COMPANY-PLATFORM.md](../../INDUSTRY-AI-COMPANY-PLATFORM.md) — Complete 15-layer view
- [docs/sutar-os/ARCHITECTURE.md](ARCHITECTURE.md) — Architecture diagrams
- [docs/sutar-os/API.md](API.md) — API reference
- [docs/nexha/nexha-os.md](../nexha/nexha-os.md) — Nexha OS documentation
- [companies/HOJAI-AI/CLAUDE.md](../../companies/HOJAI-AI/CLAUDE.md) — HOJAI platform overview
- [docs/nexha/audit-2026-06-26.md](../nexha/audit-2026-06-26.md) — Full ecosystem audit

---

*Last Updated: June 26, 2026*
*SUTAR OS — Autonomous Economic Runtime*
*Part of HOJAI AI — Powering the RTMN Ecosystem*
