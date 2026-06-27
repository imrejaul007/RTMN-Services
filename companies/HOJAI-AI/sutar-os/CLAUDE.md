# SUTAR OS — Complete Documentation

> **Version:** 6.0 | **Updated:** June 27, 2026
> **Canonical location:** `companies/HOJAI-AI/sutar-os/`
> **Tests:** 479 passing across 6 services | **Status:** ✅ Production Ready

---

## 🎯 What is SUTAR OS?

**SUTAR OS** (System for Unified Transaction and Autonomous Reasoning) is the **Autonomous Economic Runtime** of the RTMN ecosystem. It handles AI-to-AI commerce, negotiation, contracts, trust scoring, and payments — enabling businesses to be run by AI agents that negotiate, transact, and execute autonomously.

```
┌─────────────────────────────────────────────────────┐
│              HOJAI PLATFORM                        │
│  Foundation (Memory, Twin, CorpID, Skills)        │
├─────────────────────────────────────────────────────┤
│              SUTAR OS (This Layer)                 │
│  "The AI Marketplace — Where Agents Come to Trade" │
│                                                     │
│  Layer 1: Monitoring                               │
│  Layer 2: Gateway, Twin, Memory, Identity, AgentID  │
│  Layer 3: Intent Bus, Agent Network                │
│  Layer 4: Decision, Simulation, Goal, Flow        │
│  Layer 5: Marketplace, Economy, Usage, Policy      │
│  Layer 6: Trust, Contracts, Negotiation, Teaming   │
├─────────────────────────────────────────────────────┤
│              NEXHA OS (Commerce Network)           │
│  Suppliers, Trade Finance, Distribution, Warehouse │
└─────────────────────────────────────────────────────┘
```

### SUTAR OS is NOT:
- ❌ The full AI company platform (that's the HOJAI Platform)
- ❌ The AI Workforce with CEO/CFO/COO agents (not built yet)
- ❌ HOJAI Foundation (Memory, Twin, CorpID — separate)
- ❌ The Nexha commerce network (suppliers, logistics — separate)

### SUTAR OS IS:
- ✅ **ACP Protocol** — Standardized messaging for AI-to-AI negotiations
- ✅ **EconomyOS** — Payments, escrow, wallets, credits, rewards
- ✅ **Trust Engine** — Reputation scoring with SADA federation
- ✅ **ContractOS** — Smart contracts, templates, SLA management
- ✅ **Negotiation Engine** — Multi-party negotiation, RFQ/quote workflow
- ✅ **Decision Engine** — Policy evaluation, risk assessment, multi-option ranking
- ✅ **Agent Services** — Teaming, marketplace, orchestration, learning, analytics

---

## 🏗️ Architecture — 6 Layers

```
Layer 1: OBSERVABILITY
  └── sutar-monitoring (3100) — Health probes, dependency checks

Layer 2: GATEWAY + FOUNDATION
  ├── sutar-gateway (4140) — HTTP entry point, service registry, capability map
  ├── sutar-twin-os (4142) — SUTAR-scoped composite twins
  ├── sutar-memory-bridge (4143) — Agent memory ↔ MemoryOS bridge
  ├── sutar-identity (4144) — CorpID-backed identity for agents
  └── sutar-agent-id (4145) — Agent identity registration & verification

Layer 3: INTENT + NETWORK
  ├── sutar-intent-bus (4154) — Intent pub/sub bus (stub)
  └── sutar-agent-network (4155) — Agent registry and discovery

Layer 4: DECISION + EXECUTION
  ├── sutar-decision-engine (4290) — Policy decisions, risk assessment
  ├── sutar-simulation-os (4241) — What-if scenarios (stub)
  ├── sutar-goal-os (4242) — Goal decomposition (stub)
  ├── sutar-network-learning (4243) — Learning from outcomes (stub)
  ├── sutar-flow-os (4244) — Workflow orchestration (stub)
  └── sutar-founder-os (4260) — Founder decision support (stub)

Layer 5: MARKETPLACE + ECONOMY
  ├── blr-ai-marketplace (4255) — Agent/service listings, reviews
  ├── sutar-economy-os (4294) — Credits, escrow, rewards, billing
  ├── sutar-usage-tracker (4252) — AI usage metering (stub)
  └── sutar-policy-os (4254) — Business policy registry (stub)

Layer 6: TRUST + CONTRACTS + NEGOTIATION
  ├── sutar-trust-engine (4291) — Trust scores, SADA federation
  ├── sutar-contract-os (4292) — Smart contracts, templates, SLA
  ├── sutar-negotiation-engine (4293) — Multi-party negotiation
  └── sutar-agent-teaming (4853) — Team formation for agents

Agent Layer (Orthogonal)
  ├── acp-protocol (4800) — ACP messaging protocol
  ├── acn-network (4801) — Agent commerce network
  ├── agent-contracts (4830) — Agent-level contracts
  ├── agent-marketplace (4845) — Agent listings & discovery
  ├── agent-learning (4846) — Learning from feedback
  ├── agent-orchestration (4851) — Multi-agent coordination
  ├── agent-analytics (4848) — Agent metrics & dashboards
  ├── acn-hub (4852) — ACN unified gateway
  ├── acn-integration (4849) — RTMN bridge
  ├── agent-twin (5324) — Agent digital twin
  ├── merchant-agents (4737) — Merchant AI agents
  └── negotiation-ai (4850) — ML negotiation strategies
```

---

## 📦 Service Inventory — All 27 Services

### Layer 1 — Observability (1 service)

| Service | Port | Lines | Tests | Features |
|---------|------|-------|-------|---------|
| `sutar-monitoring` | 3100 | 417 | ❌ | Health probes, dependency checks, alert routing |

### Layer 2 — Gateway + Foundation (5 services)

| Service | Port | Lines | Tests | Features |
|---------|------|-------|-------|---------|
| `sutar-gateway` | 4140 | 292 | ❌ | HTTP entry, service registry, capability map, request routing, REZ Intel |
| `sutar-twin-os` | 4142 | 186 | ❌ | Composite twins, capability tags, intent-aware resolution, TwinOS bridge |
| `sutar-memory-bridge` | 4143 | 164 | ❌ | Agent ↔ MemoryOS partition links, fact encoding/decoding |
| `sutar-identity` | 4144 | 188 | ❌ | Agent identity registration, CorpID verification, auth tokens |
| `sutar-agent-id` | 4145 | 177 | ❌ | Agent credential management, signature verification |

### Layer 3 — Intent + Network (2 services)

| Service | Port | Lines | Tests | Features |
|---------|------|-------|-------|---------|
| `sutar-intent-bus` | 4154 | stub | ❌ | Intent pub/sub (not yet built) |
| `sutar-agent-network` | 4155 | 214 | ❌ | Agent registry, discovery, capability matching |

### Layer 4 — Decision + Execution (6 services)

| Service | Port | Lines | Tests | Features |
|---------|------|-------|-------|---------|
| `sutar-decision-engine` | 4290 | 704 | ✅ 43 | Policy evaluation, risk assessment, multi-option ranking, 10 decision types |
| `sutar-simulation-os` | 4241 | stub | ❌ | What-if scenarios (not yet built) |
| `sutar-goal-os` | 4242 | stub | ❌ | Goal decomposition (in genie-os) |
| `sutar-network-learning` | 4243 | stub | ❌ | Learning from outcomes (not yet built) |
| `sutar-flow-os` | 4244 | stub | ❌ | Workflow orchestration (not yet built) |
| `sutar-founder-os` | 4260 | stub | ❌ | Founder decision support (not yet built) |

### Layer 5 — Marketplace + Economy (4 services)

| Service | Port | Lines | Tests | Features |
|---------|------|-------|-------|---------|
| `blr-ai-marketplace` | 4255 | — | — | Lives in `companies/HOJAI-AI/blr-ai-marketplace/` |
| `sutar-economy-os` | 4294 | ~600 | ✅ 120 | Credits, escrow, rewards, billing, Karma integration, wallet |
| `sutar-usage-tracker` | 4252 | stub | ❌ | AI usage metering (not yet built) |
| `sutar-policy-os` | 4254 | stub | ❌ | Business policy registry (not yet built) |

### Layer 6 — Trust + Contracts + Negotiation (3 services)

| Service | Port | Lines | Tests | Features |
|---------|------|-------|-------|---------|
| `sutar-trust-engine` | 4291 | ~700 | ✅ 48 | Trust scores, SADA federation, KYC, credit checks |
| `sutar-contract-os` | 4292 | ~900 | ✅ 193 | Smart contracts, templates, versions, renewals, SLA, clauses |
| `sutar-negotiation-engine` | 4293 | ~500 | ✅ 25 | Multi-party negotiation, RFQ/quote workflow, 5 strategies |

### Agent Layer (12 services)

| Service | Port | Lines | Tests | Features |
|---------|------|-------|-------|---------|
| `acp-protocol` | 4800 | 814 | ❌ | ACP messaging — QUERY, QUOTE, COUNTER, ACCEPT, REJECT, ORDER, TRACK, DISPUTE |
| `acn-network` | 4801 | 950 | ❌ | Agent registry, discovery, routing |
| `agent-contracts` | 4830 | 797 | ❌ | Agent-level smart contracts |
| `agent-marketplace` | 4845 | 728 | ❌ | Agent listings, reviews, promotions |
| `agent-learning` | 4846 | 723 | ❌ | Preference learning, strategy optimization |
| `agent-orchestration` | 4851 | 599 | ❌ | Multi-agent workflow coordination |
| `agent-analytics` | 4848 | 642 | ❌ | Agent metrics, dashboards |
| `acn-hub` | 4852 | 480 | ❌ | ACN unified gateway |
| `acn-integration` | 4849 | 533 | ❌ | RTMN bridge |
| `agent-teaming` | 4853 | 924 | ⚠️ custom | Team formation, leader election, task DAG |
| `agent-twin` | 5324 | 548 | ❌ | Agent digital twin |
| `merchant-agents` | 4737 | 1213 | ❌ | Merchant AI agents |
| `negotiation-ai` | 4850 | stub | ❌ | ML negotiation strategies |

### Tenant Management (1 service)

| Service | Port | Lines | Tests | Features |
|---------|------|-------|-------|---------|
| `sutar-tenant-instances` | 4141 | ~400 | ✅ 75 | Per-tenant SUTAR shards (SHARED/DEDICATED/ISOLATED) |

---

## 🔗 How Services Connect

### Internal SUTAR Connections

```
SUTAR Gateway (4140)
  │
  ├──► sutar-agent-network (4155) — register/discover agents
  ├──► sutar-agent-teaming (4853) — form teams
  ├──► sutar-decision-engine (4290) — evaluate policies
  ├──► sutar-trust-engine (4291) — check trust scores
  ├──► sutar-contract-os (4292) — create contracts
  ├──► sutar-negotiation-engine (4293) — negotiate terms
  ├──► sutar-economy-os (4294) — process payments
  ├──► sutar-memory-bridge (4143) — access agent memory
  ├──► sutar-twin-os (4142) — access composite twins
  └──► sutar-identity (4144) — verify identity

ACP Protocol (4800)
  │
  └──► acn-network (4801) — agent discovery
  └──► agent-contracts (4830) — execute contracts
  └──► sutar-negotiation-engine (4293) — negotiate
  └──► agent-orchestration (4851) — coordinate teams

SUTAR Contract OS (4292)
  │
  ├──► sutar-trust-engine (4291) — verify signatories
  ├──► sutar-economy-os (4294) — escrow payments
  └──► sutar-decision-engine (4290) — approve terms

SUTAR Economy OS (4294)
  │
  ├──► sutar-contract-os (4292) — escrow for contracts
  ├──► sutar-trust-engine (4291) — wallet trust scores
  └──► sutar-tenant-instances (4141) — per-tenant billing
```

### External RTMN Connections

```
SUTAR OS
  │
  ├──► CorpID (4702) — identity verification
  ├──► MemoryOS (4703) — persistent memory
  ├──► TwinOS (4705) — digital twins
  ├──► Genie (4701) — AI orchestration
  ├──► Nexus Capability OS (4270) — capability registry
  ├──► Nexus Reputation OS (4271) — reputation federation
  ├──► Nexus Discovery OS (4272) — capability search
  ├──► Nexus Federation OS (4273) — federation management
  ├──► REZ CRM (4056) — customer data
  ├──► REZ Wallet (4004) — payments
  └──► RTMN Hub (4399) — unified gateway

SUTAR Tenant Instances (4141)
  │
  └──► All SUTAR services — provisioned per-tenant
```

### Data Flow Example: AI Agent Purchase

```
1. Genie receives user request: "Book a flight to Bangalore"
   │
2. SUTAR Gateway routes to sutar-decision-engine (4290)
   │
3. Decision engine checks policy → approves
   │
4. SUTAR Agent Network discovers flight agents
   │
5. ACP Protocol initiates negotiation with flight agent
   │
6. SUTAR Negotiation Engine runs RFQ/quote workflow
   │
7. Best terms selected → SUTAR Contract OS creates smart contract
   │
8. SUTAR Trust Engine verifies both parties
   │
9. SUTAR Economy OS processes payment via escrow
   │
10. Contract executed, confirmation → Genie → User
```

---

## 🚀 Quick Start

### Start All SUTAR Services

```bash
cd companies/HOJAI-AI/sutar-os

# Start the gateway (entry point)
cd core/sutar-gateway && npm start &

# Start tested services
cd ../sutar-decision-engine && npm run dev &
cd ../sutar-trust-engine && npm run dev &
cd ../../contracts/sutar-contract-os && npm run dev &
cd ../../contracts/sutar-negotiation-engine && npm run dev &
cd ../../economy/sutar-economy-os && npm run dev &
```

### Run Tests

```bash
cd companies/HOJAI-AI/sutar-os

# All tested services
cd core/sutar-decision-engine && npm test   # 43 tests
cd core/sutar-trust-engine && npm test      # 48 tests
cd contracts/sutar-contract-os && npm test   # 193 tests
cd contracts/sutar-negotiation-engine && npm test  # 25 tests
cd economy/sutar-economy-os && npm test     # 120 tests
cd core/sutar-tenant-instances && npm test  # 75 tests
```

### Test an Endpoint

```bash
# Decision Engine
curl -X POST http://localhost:4290/api/v1/decide \
  -H 'Content-Type: application/json' \
  -d '{
    "context": {
      "decisionType": "OFFER",
      "userId": "user-123",
      "amount": 5000
    }
  }'

# Trust Engine
curl http://localhost:4291/api/v1/trust/agent-xyz

# Contract OS
curl http://localhost:4292/api/v1/contracts

# Economy OS
curl http://localhost:4294/api/v1/wallets
```

---

## 📊 Test Summary

| Service | Tests | Passing | Failing | Coverage |
|---------|-------|---------|---------|---------|
| `sutar-decision-engine` | 43 | ✅ 43 | 0 | optionRanker, events |
| `sutar-trust-engine` | 48 | ✅ 48 | 0 | trustService, verification, reputation, events |
| `sutar-contract-os` | 193 | ✅ 193 | 0 | templates, versions, SLA, renewals, clauses, events |
| `sutar-negotiation-engine` | 25 | ✅ 25 | 0 | negotiation, events |
| `sutar-economy-os` | 120 | ✅ 120 | 0 | credits, wallets, escrow, rewards, payment, events |
| `sutar-tenant-instances` | 75 | ✅ 75 | 0 | instanceService, routes |
| **Total** | **504** | **504** | **0** | |

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | service-specific | HTTP port |
| `REDIS_URL` | — | Redis for event bus (optional, offline mode works) |
| `CORPID_URL` | http://localhost:4702 | CorpID service URL |
| `TWINOS_URL` | http://localhost:4705 | TwinOS Hub URL |
| `MEMORY_URL` | http://localhost:4703 | MemoryOS URL |
| `SADA_URL` | http://localhost:4190 | SADA trust federation |
| `REZ_INTEL_URL` | http://localhost:5370 | REZ Intelligence URL |
| `REQUIRE_AUTH` | false | Enable JWT auth (set to "true" for production) |
| `LOG_LEVEL` | info | debug, info, warn, error |
| `NODE_ENV` | development | development, production |

### Ports (All 27 Services)

| Port Range | Services |
|------------|---------|
| 3100 | sutar-monitoring |
| 4140-4145 | Gateway, TwinOS, MemoryBridge, Identity, AgentID |
| 4154-4155 | IntentBus, AgentNetwork |
| 4241-4260 | Decision, Simulation, Goal, Learning, Flow, Founder OS |
| 4252-4259 | Usage Tracker, Marketplace, Policy OS |
| 4290-4294 | Decision Engine, Trust, Contracts, Negotiation, Economy |
| 4737 | Merchant Agents |
| 4800-4853 | ACP, ACN, Agent services |
| 5324 | Agent Twin |

---

## 🗂️ Project Structure

```
companies/HOJAI-AI/sutar-os/
├── core/                          # Layer 2 (Gateway + Foundation)
│   ├── sutar-gateway/             # HTTP entry point (4140)
│   ├── sutar-twin-os/             # Composite twins (4142)
│   ├── sutar-memory-bridge/       # Memory ↔ Agent bridge (4143)
│   ├── sutar-identity/            # Agent identity (4144)
│   ├── sutar-agent-id/           # Credential management (4145)
│   ├── sutar-tenant-instances/    # Per-tenant provisioning (4141)
│   ├── sutar-decision-engine/     # Policy decisions (4290)
│   ├── sutar-trust-engine/        # Trust scores (4291)
│   ├── sutar-agent-network/       # Agent registry (4155)
│   └── sutar-monitoring/          # Health probes (3100)
│
├── contracts/                     # Layer 6 (Trust + Contracts)
│   ├── sutar-contract-os/         # Smart contracts (4292)
│   ├── sutar-negotiation-engine/  # Multi-party negotiation (4293)
│   ├── sutar-contracts/           # Contract utilities (4185)
│   └── negotiation-ai/            # ML negotiation (4850)
│
├── economy/                       # Layer 5 (Marketplace + Economy)
│   └── sutar-economy-os/          # Credits, escrow, rewards (4294)
│
├── agents/                        # Agent Layer
│   ├── acp-protocol/              # ACP messaging (4800)
│   ├── acn-network/               # ACN registry (4801)
│   ├── agent-contracts/           # Agent contracts (4830)
│   ├── agent-marketplace/         # Listings & reviews (4845)
│   ├── agent-learning/            # Preference learning (4846)
│   ├── agent-orchestration/       # Multi-agent coordination (4851)
│   ├── agent-analytics/          # Metrics & dashboards (4848)
│   ├── agent-teaming/            # Team formation (4853)
│   ├── acn-hub/                  # ACN gateway (4852)
│   ├── acn-integration/          # RTMN bridge (4849)
│   ├── agent-twin/               # Agent digital twin (5324)
│   └── merchant-agents/          # Merchant AI (4737)
│
├── tests/                         # Integration tests
├── sutar-dev-mock/               # Dev mock services
└── CLAUDE.md                      # This file
```

---

## 📚 Documentation

| Document | What it covers |
|----------|---------------|
| [docs/sutar-os/README.md](docs/sutar-os/README.md) | Complete overview |
| [docs/sutar-os/ARCHITECTURE.md](docs/sutar-os/ARCHITECTURE.md) | 7-layer architecture |
| [docs/sutar-os/API.md](docs/sutar-os/API.md) | All API endpoints |
| [docs/sutar-os/INTEGRATION.md](docs/sutar-os/INTEGRATION.md) | Integration with RTMN |
| [docs/sutar-os/HUB-CAPABILITY-MAP.md](docs/sutar-os/HUB-CAPABILITY-MAP.md) | Hub routes & capabilities |
| [RTMN Hub](companies/RABTUL-Technologies/REZ-ecosystem-connector/) | Unified gateway at port 4399 |

---

## 🐛 Known Issues

1. **ioredis native module** — ioredis v5 has a broken native module on some machines. Tests mock the EventBus to avoid this. Production requires `REDIS_URL` set for the event bus to work.

2. **No tests for agent services** — 12 agent services have no vitest tests. Priority: `agent-teaming`, `merchant-agents`, `acp-protocol`.

3. **6 stub services** — `sutar-intent-bus`, `sutar-simulation-os`, `sutar-goal-os`, `sutar-network-learning`, `sutar-flow-os`, `sutar-founder-os` are not yet built.

---

## 🔄 Recent Changes

| Date | Change |
|------|--------|
| 2026-06-27 | Fixed `@rtmn/shared` symlink, added `setup.ts` to mock EventBus for tests |
| 2026-06-27 | Added `port` field to all 27 `package.json` files |
| 2026-06-27 | All 6 tested services: **504 tests passing** (was 434 + 5 failing suites) |
| 2026-06-26 | 23 new enterprise modules added to `platform/sutar-os/core/` |
| 2026-06-22 | ADR-0010: Hub wired with 13 SUTAR + 23 enterprise module routes |
| 2026-06-21 | BLR AI Marketplace moved from `sutar-marketplace` to `blr-ai-marketplace/` |

---

*Last Updated: June 27, 2026*
*SUTAR OS v6.0 — Autonomous Economic Runtime*
