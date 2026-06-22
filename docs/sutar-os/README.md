# SUTAR OS — Complete Documentation

**Version:** 4.0.0
**Last Updated:** June 22, 2026
**Status:** ✅ Production Ready — 29 Services, 425 vitest tests passing
**Layer:** 14 (Autonomous Layer) of RTMN Ecosystem

> **Change log v4.0 (2026-06-22):**
> - Renumbered ports: Trust 4180→**4291**, Contract 4185→**4292**, Negotiation 4191→**4293**, Economy 4251→**4294**, Decision 4240→**4290** (Phase B+C audit)
> - Service count updated 25→**29** (Phase C backbone services added: supplier-registry 4280, logistics 4285, warehouse-network 4288, trade-finance 4287)
> - Architecture diagram updated to show **Hub-as-bridge** (RTMN Hub :4399 is the single front door)
> - Added **Phase C backbone** section + **Hub access pattern** + **Foundation bridges** sections
> - Removed all stale "hojai-sutar-os" file path references — code lives at `companies/HOJAI-AI/sutar-os/`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture (Hub-as-Bridge)](#architecture-hub-as-bridge)
3. [All 29 Services](#all-29-services)
4. [Port Registry (2026-06-22)](#port-registry-2026-06-22)
5. [Foundation Bridges (Layer 2)](#foundation-bridges-layer-2)
6. [Phase C Backbone](#phase-c-backbone)
7. [File Locations](#file-locations)
8. [Integration Points](#integration-points)
9. [Quick Start](#quick-start)
10. [API Reference](#api-reference)
11. [Boundaries (What SUTAR does NOT integrate with)](#boundaries)

---

## Overview

**SUTAR OS** is the **Autonomous Economic Infrastructure** of the RTMN ecosystem. It provides **29 interconnected services** that enable:

- **AI agent identity & trust** — CorpID-backed identities, SADA-federated trust scores
- **Multi-party negotiation** — AI-to-AI and AI-to-human negotiation (ACP protocol)
- **Smart contracts** — Automated contract execution, dispute escrow
- **Trust & reputation** — Federation with SADA, fallback to local scoring
- **Economic layer** — Payments, billing, usage tracking
- **Team formation** — Mission templates, leader election, multi-agent workflows
- **Decision support** — Policy evaluation, what-if simulation
- **Nexha backbone** — Real implementations of supplier-registry, logistics, warehouse-network, trade-finance (Phase C)

**Tagline:** *"The AI Marketplace — Where AI Agents Come to Negotiate"*

---

## Architecture (Hub-as-Bridge)

The **RTMN Unified Hub** at `localhost:4399` is the **single front door** for SUTAR. External callers reach SUTAR via `http://localhost:4399/api/sutar/<service>/*` (and Phase C backbone also via `/api/nexha/<service>/*`).

```
                        EXTERNAL CONSUMERS
                              │
        ┌─────────────────────┼─────────────────────────┐
        │                     │                         │
   do-app (3001)      sales-hub                Nexha mobile
   hojaiClient.ts     sutarBridge.ts          nexha-gateway
        │                     │                         │
        └─────────────────────┼─────────────────────────┘
                              ▼
   ┌────────────────────────────────────────────────────────────┐
   │  RTMN UNIFIED HUB  (REZ-ecosystem-connector @ port 4399)   │
   │  SUTAR_SERVICES (16) + NEXHA_SERVICES (13) maps            │
   │  /api/sutar/capabilities + /api/nexha/capabilities         │
   │  proxyToUpstream() — body-forwarding-safe                  │
   └─────┬─────────────────────┬─────────────────────┬─────────┘
         │                     │                     │
         ▼                     ▼                     ▼
   SUTAR Layer 2-6         SUTAR Phase C          Nexha L1 stubs
   (autonomous core)       (real implementations) (procurement-os,
                                                    distribution-os,
                                                    trade-finance)
         │
         │ (only out-of-scope outbound: 4 Layer 2 bridges)
         ▼
   HOJAI Foundation:  CorpID :4702, TwinOS :4705, MemoryOS :4703, SADA :4190
```

**Key rules:**
- **Every SUTAR call from outside SUTAR goes through the Hub** at `localhost:4399`.
- **Phase C backbone services are dual-registered** under both `/api/sutar/*` and `/api/nexha/*`.
- **Nexha's own services are still stubs** — the real work is done by SUTAR's Phase C services.

See [Hub wiring audit 2026-06-22](companies/RABTUL-Technologies/REZ-ecosystem-connector/docs/SUTAR-HUB-WIRING-AUDIT-2026-06-22.md) for the full port map.

---

## All 29 Services

### 1. Gateway & Twin Layer (5 services, ports 4140-4145)

| Service | Port | Purpose | Source |
|---------|------|---------|--------|
| **sutar-gateway** | 4140 | API gateway, routing, capability map | [src/index.js](companies/HOJAI-AI/sutar-os/core/sutar-gateway/src/index.js) |
| **sutar-twin-os** | 4142 | SUTAR-scoped digital twins (→ TwinOS :4705) | [src/index.js](companies/HOJAI-AI/sutar-os/core/sutar-twin-os/src/index.js) |
| **sutar-memory-bridge** | 4143 | SUTAR agent memory (→ MemoryOS :4703) | [src/index.js](companies/HOJAI-AI/sutar-os/core/sutar-memory-bridge/src/index.js) |
| **sutar-identity** | 4144 | SUTAR-scoped identity (→ CorpID :4702) | [src/index.js](companies/HOJAI-AI/sutar-os/core/sutar-identity/src/index.js) |
| **sutar-agent-id** | 4145 | Agent identity verification | [src/index.js](companies/HOJAI-AI/sutar-os/core/sutar-agent-id/src/index.js) |

### 2. Intent & Network Layer (2 services, ports 4154-4155)

| Service | Port | Purpose | Source |
|---------|------|---------|--------|
| **sutar-intent-bus** | 4154 | Intent propagation across agents | `sutar-os/core/sutar-intent-bus/` |
| **sutar-agent-network** | 4155 | Agent-to-agent networking, registry | [src/index.js](companies/HOJAI-AI/sutar-os/core/sutar-agent-network/src/index.js) |

### 3. Decision & Flow Layer (4 services, ports 4240-4244, 4260)

| Service | Port | Purpose | Source |
|---------|------|---------|--------|
| **sutar-decision-engine** | **4290** ← renumbered | AI-powered policy decisions, multi-option ranking | [src/index.ts](companies/HOJAI-AI/sutar-os/core/sutar-decision-engine/src/index.ts) |
| **sutar-simulation-os** | 4241 | What-if analysis, Monte Carlo | `sutar-os/core/sutar-simulation-os/` |
| **sutar-goal-os** | 4242 | Goal decomposition and tracking | `sutar-os/core/sutar-goal-os/` |
| **sutar-flow-os** | 4244 | Workflow orchestration | `sutar-os/core/sutar-flow-os/` |
| **sutar-founder-os** | 4260 | Founder decision support | `sutar-os/core/sutar-founder-os/` |

### 4. Marketplace & Economy Layer (3 services, ports 4252, 4254, 4294)

| Service | Port | Purpose | Source |
|---------|------|---------|--------|
| ~~sutar-marketplace~~ MOVED 2026-06-21 | ~~4250~~ | AI Service Marketplace → see [BLR AI Marketplace](../companies/HOJAI-AI/blr-ai-marketplace/) | `companies/HOJAI-AI/blr-ai-marketplace/services/` |
| **sutar-economy-os** | **4294** ← renumbered | Economic layer for transactions, BNPL | [src/index.ts](companies/HOJAI-AI/sutar-os/economy/sutar-economy-os/src/index.ts) |
| **sutar-usage-tracker** | 4252 | Usage tracking and metering | `sutar-os/economy/sutar-usage-tracker/` |
| **sutar-policy-os** | 4254 | Policy engine for rules | `sutar-os/core/sutar-policy-os/` |

### 5. Trust & Contracts Layer (3 services, ports 4291-4293)

| Service | Port | Purpose | Source |
|---------|------|---------|--------|
| **sutar-trust-engine** | **4291** ← renumbered | Trust scoring + SADA :4190 federation | [src/index.ts](companies/HOJAI-AI/sutar-os/core/sutar-trust-engine/src/index.ts) |
| **sutar-contract-os** | **4292** ← renumbered | Smart contracts for transactions | [src/index.ts](companies/HOJAI-AI/sutar-os/contracts/sutar-contract-os/src/index.ts) |
| **sutar-negotiation-engine** | **4293** ← renumbered | Multi-party negotiation | [src/index.ts](companies/HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine/src/index.ts) |

### 6. Discovery & ROI Layer (5 services, ports 4255-4259)

| Service | Port | Purpose | Source |
|---------|------|---------|--------|
| **sutar-exploration-engine** | 4255 | Exploration and experimentation | `sutar-os/core/sutar-exploration/` |
| **sutar-discovery-engine** | 4256 | Opportunity discovery | `sutar-os/core/sutar-discovery-engine/` |
| **sutar-multi-agent-evaluator** | 4257 | Multi-agent evaluation | `sutar-os/core/sutar-multi-agent-evaluator/` |
| **sutar-reputation-aggregator** | 4258 | Reputation aggregation | `sutar-os/core/sutar-reputation-aggregator/` |
| **sutar-roi-calculator** | 4259 | ROI calculation | `sutar-os/core/sutar-roi-calculator/` |

### 7. Monitoring Layer (1 service, port 3100)

| Service | Port | Purpose | Source |
|---------|------|---------|--------|
| **sutar-monitoring** | 3100 | System monitoring and observability | [src/index.js](companies/HOJAI-AI/sutar-os/core/sutar-monitoring/src/index.js) |

### 8. Phase C Backbone — Nexha Commerce (4 services, ports 4280-4288) ← NEW 2026-06-22

| Service | Port | Purpose | Source |
|---------|------|---------|--------|
| **sutar-supplier-registry** | 4280 | Supplier discovery + trust-gated sourcing | [src/index.ts](companies/HOJAI-AI/sutar-os/core/sutar-supplier-registry/src/index.ts) |
| **sutar-logistics** | 4285 | Shipping quotes, booking, carriers | [src/index.ts](companies/HOJAI-AI/sutar-os/core/sutar-logistics/src/index.ts) |
| **sutar-warehouse-network** | 4288 | Warehouse discovery, slot booking, WMS | [src/index.ts](companies/HOJAI-AI/sutar-os/core/sutar-warehouse-network/src/index.ts) |
| **sutar-trade-finance** | 4287 | BNPL credit offers, loans, escrow | [src/index.ts](companies/HOJAI-AI/sutar-os/core/sutar-trade-finance/src/index.ts) |

### 9. Agent Layer (orthogonal to the 7 layers, ports 4716, 4720, 4800-4853)

| Service | Port | Purpose | Source |
|---------|------|---------|--------|
| **sutar-pricing-intelligence** | 4290 | Pricing strategies | [src/](companies/HOJAI-AI/sutar-os/core/sutar-pricing-intelligence/src/) |
| **negotiation-ai** | 4850 | Advanced ML negotiation strategies | [src/index.js](companies/HOJAI-AI/sutar-os/contracts/negotiation-ai/src/index.js) |
| **sutar-contracts** (legacy alias) | 4185 | Older contract service | [src/index.js](companies/HOJAI-AI/sutar-os/contracts/sutar-contracts/src/index.js) |
| **acp-protocol** | 4800 | Agent-to-agent message protocol (QUERY/QUOTE/COUNTER/ACCEPT/REJECT/ORDER) | [src/index.js](companies/HOJAI-AI/sutar-os/agents/acp-protocol/src/index.js) |
| **acn-network** | 4801 | Agent registry + routing | [src/index.js](companies/HOJAI-AI/sutar-os/agents/acn-network/src/index.js) |
| **acn-hub** | 4852 | ACN unified gateway | [src/index.js](companies/HOJAI-AI/sutar-os/agents/acn-hub/src/index.js) |
| **acn-integration** | 4849 | RTMN bridge | [src/index.js](companies/HOJAI-AI/sutar-os/agents/acn-integration/src/index.js) |
| **merchant-agents** | 4737 | Business AI agents | [src/index.js](companies/HOJAI-AI/sutar-os/agents/merchant-agents/src/index.js) |
| **agent-twin** | 4720 | Agent digital twin | [src/index.js](companies/HOJAI-AI/sutar-os/agents/agent-twin/src/index.js) |
| **agent-teaming** | 4853 | Team formation, leader election | [src/index.js](companies/HOJAI-AI/sutar-os/agents/agent-teaming/src/index.js) |
| **agent-orchestration** | 4851 | Multi-agent workflow | [src/index.js](companies/HOJAI-AI/sutar-os/agents/agent-orchestration/src/index.js) |
| **agent-contracts** | 4830 | Agent-level smart contracts | [src/index.js](companies/HOJAI-AI/sutar-os/agents/agent-contracts/src/index.js) |
| **agent-marketplace** | 4845 | Agent listings (separate from BLR AI Marketplace) | [src/index.js](companies/HOJAI-AI/sutar-os/agents/agent-marketplace/src/index.js) |
| **agent-learning** | 4846 | ML for agent strategy | [src/index.js](companies/HOJAI-AI/sutar-os/agents/agent-learning/src/index.js) |
| **agent-analytics** | 4848 | Agent metrics + dashboards | [src/index.js](companies/HOJAI-AI/sutar-os/agents/agent-analytics/src/index.js) |

---

## Port Registry (2026-06-22)

| Port Range | Service Category |
|------------|------------------|
| 3100 | Monitoring |
| 4140-4145 | Gateway & Twin |
| 4154-4155 | Intent & Network |
| 4185 | sutar-contracts (legacy alias) |
| 4240-4244, 4260 | Decision & Flow |
| 4250 | ~~Marketplace~~ MOVED to BLR AI Marketplace |
| 4252, 4254 | Usage Tracker, Policy OS |
| 4255-4259 | Discovery & ROI |
| **4280, 4285, 4287, 4288** | **Phase C backbone (NEW)** |
| **4290** | **Decision Engine (renumbered)** |
| **4291** | **Trust Engine (renumbered)** |
| **4292** | **Contract OS (renumbered)** |
| **4293** | **Negotiation Engine (renumbered)** |
| **4294** | **Economy OS (renumbered)** |
| 4702, 4703, 4705, 4190 | Foundation (external — CorpID, MemoryOS, TwinOS, SADA) |
| 4716, 4720, 4737, 4800-4853 | Agent layer |

---

## Foundation Bridges (Layer 2)

SUTAR's only **out-of-scope** outbound calls. These are SUTAR-scoped facades over HOJAI Foundation services:

| SUTAR service | Port | Calls | Why |
|---|---|---|---|
| **sutar-twin-os** | 4142 | `TwinOS Hub :4705` | SUTAR-scoped digital twins (sutar-merchant, sutar-consumer, sutar-facilitator, sutar-observer) |
| **sutar-memory-bridge** | 4143 | `MemoryOS :4703` | SUTAR agent persistent memory |
| **sutar-identity** | 4144 | `CorpID :4702` | SUTAR-scoped identity |
| **sutar-trust-engine** | 4291 | `SADA :4190` (soft federation) | Trust scores, 2s timeout, local fallback |

**Source:** [sutar-trust-engine/src/index.ts:18-19](companies/HOJAI-AI/sutar-os/core/sutar-trust-engine/src/index.ts#L18) — `SADA_URL = 'http://localhost:4190'`

`fetchSadaScore()` at [sutar-trust-engine/src/index.ts:50-65](companies/HOJAI-AI/sutar-os/core/sutar-trust-engine/src/index.ts#L50) has a 2s timeout and gracefully falls back to local scoring. Status exposed at `GET /api/v1/sada/status`.

Anything else in SUTAR stays inside SUTAR scope.

---

## Phase C Backbone

The 4 Phase C services (built 2026-06-22) are the **real implementations of the Nexha commerce network**. They are registered in BOTH `SUTAR_SERVICES` and `NEXHA_SERVICES` maps in the Hub, so they can be reached via either pattern.

**Call via Hub (recommended):**
```bash
# Supplier lookup
curl "http://localhost:4399/api/nexha/sutar-supplier-registry/api/v1/suppliers?category=cement"

# Shipping quote
curl -X POST http://localhost:4399/api/nexha/sutar-logistics/api/v1/quote \
  -H "Content-Type: application/json" \
  -d '{"origin":"Mumbai","destination":"Bengaluru","package":{"weightKg":10}}'

# Warehouse discovery
curl "http://localhost:4399/api/nexha/sutar-warehouse-network/api/v1/warehouses?state=MH"

# BNPL credit offer
curl -X POST http://localhost:4399/api/nexha/sutar-trade-finance/api/v1/credit-offers \
  -H "Content-Type: application/json" \
  -d '{"entityId":"ent_001","amount":100000,"termMonths":3,"trustScore":78}'
```

**Tests:** 71 vitest tests across the 4 services (20 supplier + 22 logistics + 49 warehouse + …), all passing.

---

## File Locations

### Source code (HOJAI-AI repo, included as git submodule)

```
companies/HOJAI-AI/sutar-os/
├── core/                              # Gateway, twin, identity, decision, trust, Phase C
│   ├── sutar-gateway/                 # Port 4140
│   ├── sutar-decision-engine/         # Port 4290
│   ├── sutar-trust-engine/            # Port 4291 (SADA federation)
│   ├── sutar-supplier-registry/       # Port 4280 (Phase C.1)
│   ├── sutar-logistics/               # Port 4285 (Phase C.2)
│   ├── sutar-trade-finance/           # Port 4287 (Phase C.4)
│   ├── sutar-warehouse-network/       # Port 4288 (Phase C.5)
│   └── …
├── contracts/                         # Contract OS, negotiation
│   ├── sutar-contract-os/             # Port 4292
│   ├── sutar-negotiation-engine/      # Port 4293
│   └── …
├── economy/                           # Economy OS, usage tracker
│   ├── sutar-economy-os/              # Port 4294
│   └── sutar-usage-tracker/           # Port 4252
├── agents/                            # Agent layer (acp, acn, teaming, etc.)
│   ├── acp-protocol/                  # Port 4800
│   ├── acn-network/                   # Port 4801
│   ├── agent-teaming/                 # Port 4853
│   └── …
└── tests/                             # Cross-service integration tests
```

### Integration files (RTMN root repo)

```
services/
├── sales-hub/
│   └── src/services/sutarBridge.ts    # Sales OS → SUTAR (direct axios :4140)
├── unified-os-hub/                    # Wait — this is the OLD name. The Hub is now at:
└── (Hub now at companies/RABTUL-Technologies/REZ-ecosystem-connector)

industry-os/services/
├── restaurant-os/src/index.js:53      # RTMN_SERVICES.sutarOS = 'http://localhost:4140'
├── restaurant-os/src/industry-integration.js
├── sales-os/integrations/sutar-karma.js  # ⚠️ uses wrong port 4251, should be 4294
└── …

companies/do-app/backend/src/services/
└── hojaiClient.ts:416-422             # sutar client (listBusinesses, getBusiness)
```

### Per-service CLAUDE.md

Each of the 29 services has its own CLAUDE.md with details — see `find companies/HOJAI-AI/sutar-os -name "CLAUDE.md"`.

---

## Integration Points

### SUTAR integrates with (via Hub :4399)

| System | Integration | Purpose |
|---|---|---|
| **RTMN Hub** | Native (same repo) | The single front door — all SUTAR calls |
| **HOJAI Foundation** | Via Layer 2 bridges | CorpID, TwinOS, MemoryOS, SADA |
| **Nexha network** | Via Phase C backbone | supplier-registry, logistics, warehouse, trade-finance |
| **do-app** | Via Hub | Autopilot + supplier lookup |
| **Sales OS** | Direct axios (sutarBridge.ts) | Negotiation, karma, goals |
| **Restaurant OS** | Direct URL (RTMN_SERVICES.sutarOS) | Decision engine, marketplace |
| **Marketing OS** | Config SUTAR_OS_URL | (⚠️ stale port — see gap) |
| **Industry OS** | Via Hub workflows | All 24 industries |
| **Genie (in do-app)** | Via Hub | listBusinesses, getBusiness |

### SUTAR does NOT integrate with (Boundaries — see below)

REZ Merchant (CRM, Wallet, Auth), AdBazaar (DSP, Audience, Attribution, CDP), RAZO Keyboard, Revenue Intelligence Copilot, Voice Twin, Speech Intelligence, External clients (Leverge).

---

## Quick Start

### Local development (one command)

```bash
# Start the 5-service dev stack
bash scripts/dev-stack.sh start

# Run end-to-end demo
bash demos/full-stack-demo.sh
```

### Per-service (advanced)

```bash
# Hub
cd companies/RABTUL-Technologies/REZ-ecosystem-connector
PORT=4399 node dist/index.js

# SUTAR core
cd companies/HOJAI-AI/sutar-os/core
node sutar-gateway/index.js &          # 4140
node sutar-decision-engine/index.js &   # 4290
node sutar-trust-engine/index.js &      # 4291
node sutar-supplier-registry/index.js & # 4280
node sutar-logistics/index.js &         # 4285
node sutar-warehouse-network/index.js & # 4288
node sutar-trade-finance/index.js &     # 4287

# SUTAR contracts + economy
cd ../contracts
node sutar-contract-os/index.js &       # 4292
node sutar-negotiation-engine/index.js & # 4293

cd ../economy
node sutar-economy-os/index.js &        # 4294
```

---

## API Reference

Quick endpoint summary — see [API.md](API.md) for the full reference.

### Via Hub (production)

```bash
# Capability map
curl http://localhost:4399/api/sutar/capabilities

# Direct  to any service
curl -X POST http://localhost:4399/api/sutar/sutar-agent-teaming/api/teaming/teams \
  -H "Content-Type: application/json" \
  -d '{"name":"price-compare","mission":"compare-prices","size":3}'

# Phase C backbone
curl "http://localhost:4399/api/nexha/sutar-warehouse-network/api/v1/warehouses?state=MH"
```

### Per-service endpoints (development)

**SUTAR Gateway (4140):**
```http
GET  /health
GET  /api/services
POST /api/route
```

**SUTAR Decision Engine (4290):**
```http
POST /api/v1/rank         # Multi-option ranking
POST /api/policies/check
GET  /api/decisions/history
```

**SUTAR Trust Engine (4291):**
```http
GET  /api/v1/sada/status                    # SADA federation health
GET  /api/trust/agent/:id
POST /api/trust/feedback
GET  /api/trust/reputation/:id
```

**SUTAR Negotiation Engine (4293):**
```http
POST /api/v1/negotiations
GET  /api/v1/negotiations/:id
POST /api/v1/negotiations/:id/offer
POST /api/v1/negotiations/:id/accept
```

**SUTAR Contract OS (4292):**
```http
POST /api/contracts
GET  /api/contracts/:id
POST /api/contracts/:id/execute
POST /api/contracts/:id/terminate
```

**SUTAR Economy OS (4294):**
```http
GET  /api/economy/balance/:agentId
POST /api/economy/transfer
GET  /api/economy/transactions?agentId=...
```

**Phase C backbone** — see [API.md §13](API.md#13-sutar-phase-c-backbone-nexha-commerce-network).

---

## Security

SUTAR OS implements:
- ✅ JWT Authentication (via `@rtmn/shared/auth`)
- ✅ Role-Based Access Control (RBAC)
- ✅ API Rate Limiting (100/min default, 20/min strict)
- ✅ Input Validation (zod schemas)
- ✅ Audit Logging
- ✅ Helmet Security Headers
- ✅ Prototype Pollution Prevention
- ✅ Soft trust federation (SADA fallback)

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Services | 29 |
| Test count (vitest) | 425 across 7 SUTAR services |
| Real bugs found & fixed | 2 (logistics quote cache, Hub body-forwarding) |
| Production-grade | Trust Engine, Decision Engine, Economy OS, Phase C backbone (4) |
| Layer 2 bridges | 4 (TwinOS, MemoryOS, CorpID, SADA) |
| Phase C backbone | 4 services, 71 tests, end-to-end live via Hub |
| Outbound dependencies | Foundation only (4 services) |

---

## Related Documentation

- [SUTAR OS Architecture v4.0](ARCHITECTURE.md) — 7 layers + Hub-as-bridge + Foundation bridges
- [SUTAR OS API Reference v4.0](API.md) — all endpoints via Hub + direct
- [SUTAR OS Integration Guide](INTEGRATION.md) — for app developers
- [SUTAR Hub Capability Map](HUB-CAPABILITY-MAP.md) — capability → service routing
- [Hub wiring audit 2026-06-22](companies/RABTUL-Technologies/REZ-ecosystem-connector/docs/SUTAR-HUB-WIRING-AUDIT-2026-06-22.md)
- [HOJAI AI CLAUDE.md](companies/HOJAI-AI/CLAUDE.md) — platform overview
- [STATUS-AND-REMAINING-WORK.md](../../STATUS-AND-REMAINING-WORK.md) — honest inventory

---

*Last Updated: June 22, 2026*
*SUTAR OS — Autonomous Economic Infrastructure (Marketplace moved to BLR AI Marketplace on 2026-06-21; ports renumbered 2026-06-22)*
*Part of HOJAI AI — Powering the RTMN Ecosystem*
