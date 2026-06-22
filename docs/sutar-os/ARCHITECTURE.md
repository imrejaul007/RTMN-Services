# SUTAR OS Architecture

**Version:** 4.0.0  
**Last Updated:** June 22, 2026

> **Change log v4.0 (2026-06-22):**
> - Renumbered ports for trust, contract, negotiation, economy, decision engines (Phase B/C audit)
> - Added **Hub-as-bridge architecture** section — RTMN Hub (4399) is the only place SUTAR meets the rest of RTMN, Nexha, Department OS, and do-app
> - Added **SUTAR ↔ HOJAI Foundation bridges** section — the 4 Layer 2 services that connect SUTAR to TwinOS/MemoryOS/CorpID/SADA
> - Added **What SUTAR does NOT integrate with** section — clarifies boundaries with REZ Merchant, Genie, Copilot, RAZO
> - Updated all 4 data-flow diagrams to use current port numbers

---

## Overview

SUTAR OS is the **Autonomous Economic Infrastructure** (Layer 14) of the RTMN ecosystem. It provides ~29 services for AI agent commerce, negotiation, trust, contracts, decision-making, and team formation. SUTAR sits **behind the RTMN Unified Hub** at `localhost:4399` — every external caller reaches SUTAR via `http://localhost:4399/api/sutar/<service>/*` or `http://localhost:4399/api/nexha/<service>/*`.

**Tagline:** *The AI Marketplace — Where AI Agents Come to Negotiate*

---

## Hub-as-Bridge Architecture (CRITICAL — Read First)

The **RTMN Unified Hub** ([REZ-ecosystem-connector](companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts)) is the **single front door** for SUTAR. There are no direct cross-system imports.

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
   │  ──────────────────────────────────────────────────────    │
   │  • SUTAR_SERVICES map  (16 keys)  → upstream URL          │
   │  • NEXHA_SERVICES map  (13 keys)  → upstream URL          │
   │  • /api/sutar/capabilities  → capability → service key    │
   │  • /api/nexha/capabilities  → capability → service key    │
   │  • proxyToUpstream()  → forwards path + body + headers    │
   └─────┬─────────────────────┬─────────────────────┬─────────┘
         │                     │                     │
         ▼                     ▼                     ▼
   SUTAR Layer 2-6         SUTAR Phase C          Nexha L1 stubs
   (autonomous core)       (real implementations) (procurement-os,
                                                  distribution-os,
                                                  trade-finance,
                                                  franchise-os,
                                                  manufacturing-os,
                                                  intelligence-layer)
         │
         │ (only place SUTAR crosses out of its own scope)
         ▼
   HOJAI Foundation:  CorpID 4702, TwinOS 4705, MemoryOS 4703, SADA 4190
```

**Key rules:**
1. **Every SUTAR call from outside SUTAR goes through the Hub** at `localhost:4399`.
2. **Phase C backbone services live in Nexha** (ADR-0009 Phase 0, 2026-06-22) — `nexha-supplier-network` (4280), `nexha-distribution-network` (4285), `nexha-warehouse-network` (4288), `nexha-trade-finance-network` (4287), `nexha-pricing-network` (4286). The Hub exposes the new canonical `nexha-*` names in `NEXHA_SERVICES` and the old `sutar-*` names as **deprecation aliases** pointing at the same port. Removal target: Phase 1 of ADR-0009.
3. **Nexha's own L1 stubs (procurement-os, distribution-os, trade-finance) were deleted 2026-06-22** — their functionality is fully covered by the Phase C services now in Nexha.

See [Hub wiring audit 2026-06-22](companies/RABTUL-Technologies/REZ-ecosystem-connector/docs/SUTAR-HUB-WIRING-AUDIT-2026-06-22.md) for the full port map and removed-stale-entries list.

---

## 7-Layer Architecture (current port map, 2026-06-22)

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 7: Discovery & ROI                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Exploration│ │Discovery │ │Multi-Agent│ │Reputation│         │
│  │  (4255)  │ │  (4256)  │ │Evaluator  │ │Aggregator│         │
│  │          │ │          │ │  (4257)  │ │  (4258)  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐                                                   │
│  │   ROI    │                                                   │
│  │Calculator│                                                   │
│  │  (4259)  │                                                   │
│  └──────────┘                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 6: Trust & Contracts                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │  Trust   │ │Contracts │ │Negotiation│                       │
│  │  Engine  │ │   OS     │ │  Engine   │                       │
│  │  (4291)  │ │  (4292)  │ │  (4293)   │  ← renumbered 2026-06-22│
│  └──────────┘ └──────────┘ └──────────┘                       │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Marketplace & Economy                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Marketplace│ │ Economy  │ │  Usage   │ │  Policy  │         │
│  │(MOVED)   │ │   OS     │ │ Tracker  │ │   OS     │         │
│  │  (4250)  │ │  (4294)  │ │  (4252)  │ │  (4254)  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  Market moved to blr-ai-marketplace 2026-06-21                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Decision & Flow                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Decision │ │Simulation│ │ Goal OS  │ │ Network  │         │
│  │  Engine  │ │   OS     │ │          │ │ Learning │         │
│  │  (4290)  │ │  (4241)  │ │  (4242)  │ │  (4243)  │         │
│  │          │ │          │ │          │ │          │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐                                     │
│  │ Flow OS  │ │Founder OS│                                     │
│  │  (4244)  │ │  (4260)  │                                     │
│  └──────────┘ └──────────┘                                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Intent & Network                                       │
│  ┌──────────┐ ┌──────────┐                                     │
│  │  Agent   │ │  Intent  │                                     │
│  │ Network  │ │   Bus    │                                     │
│  │  (4155)  │ │  (4154)  │                                     │
│  └──────────┘ └──────────┘                                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Gateway & Twin + Foundation Bridges                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Gateway  │ │  Twin OS │ │ Memory   │ │Identity  │         │
│  │          │ │  →4705   │ │  →4703   │ │  →4702   │         │
│  │  (4140)  │ │  (4142)  │ │  (4143)  │ │  (4144)  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐                                                   │
│  │ Agent ID │                                                   │
│  │  (4145)  │                                                   │
│  └──────────┘                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Monitoring                                             │
│  ┌──────────┐                                                   │
│  │Monitoring│                                                   │
│  │  (3100)  │                                                   │
│  └──────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Note on ports:** Decision Engine renumbered 4240→**4290** (Phase B, 2026-06-22). Trust/Contract/Negotiation renumbered 4180/4185/4191→**4291/4292/4293**. Economy OS renumbered 4251→**4294**. Three stale entries removed from the Hub's `SUTAR_SERVICES` map (sutar-agent-reputation 4820, sutar-wallet-service 4840, sutar-dispute 4847) — see [Hub wiring audit](companies/RABTUL-Technologies/REZ-ecosystem-connector/docs/SUTAR-HUB-WIRING-AUDIT-2026-06-22.md).

---

## SUTAR ↔ HOJAI Foundation Bridges (Layer 2)

SUTAR's only **out-of-scope** outbound calls are the 4 Layer 2 bridge services. These are SUTAR-scoped facades over HOJAI Foundation services:

| SUTAR service | Port | Calls | Purpose |
|---|---|---|---|
| **sutar-twin-os** | 4142 | `TwinOS Hub :4705` | SUTAR-scoped digital twins (`sutar-merchant`, `sutar-consumer`, `sutar-facilitator`, `sutar-observer`) |
| **sutar-memory-bridge** | 4143 | `MemoryOS :4703` | SUTAR agent persistent memory across the 15 memory types |
| **sutar-identity** | 4144 | `CorpID :4702` | SUTAR-scoped identity (proxies CorpID issues/lookups) |
| **sutar-trust-engine** | 4291 | `SADA :4190` | Trust score federation with 2s timeout + local fallback |

**Source references:**
- [sutar-os/core/sutar-twin-os/src/index.js:36-37](companies/HOJAI-AI/sutar-os/core/sutar-twin-os/src/index.js#L36) — `TWINOS_URL = 'http://localhost:4705'`
- [sutar-os/core/sutar-memory-bridge/src/index.js:32](companies/HOJAI-AI/sutar-os/core/sutar-memory-bridge/src/index.js#L32) — `MEMORYOS_URL = 'http://localhost:4703'`
- [sutar-os/core/sutar-identity/src/index.js:31](companies/HOJAI-AI/sutar-os/core/sutar-identity/src/index.js#L31) — `CORPID_URL = 'http://localhost:4702'`
- [sutar-os/core/sutar-trust-engine/src/index.ts:18-19](companies/HOJAI-AI/sutar-os/core/sutar-trust-engine/src/index.ts#L18) — `SADA_URL = 'http://localhost:4190'`

The **Trust Engine ↔ SADA federation is soft**: `fetchSadaScore()` at [sutar-trust-engine/src/index.ts:50-65](companies/HOJAI-AI/sutar-os/core/sutar-trust-engine/src/index.ts#L50) has a 2s timeout and gracefully falls back to local scoring if SADA is unreachable. Status is exposed at `GET /api/v1/sada/status`.

**Anything else in SUTAR stays inside SUTAR scope.** No direct calls to Customer Twin (4895), Order Twin (4885), Wallet Twin (4896), Genie services, or any Department OS.

---

## Data Flow

### 1. Request Flow (via Hub)

```
External caller → Hub (4399) /api/sutar/<service>/*
   ↓
SUTAR Gateway (4140) or direct service port
   ↓
Auth Check (JWT via @rtmn/shared/auth)
   ↓
Route to service
   ↓
Intent Bus (4154) → Broadcast intent
   ↓
Decision Engine (4290) → Evaluate
   ↓
Agent Network (4155) → Find counterparty
   ↓
Negotiation Engine (4293) → Negotiate terms
   ↓
Contract OS (4292) → Execute contract
   ↓
Trust Engine (4291) → Update reputation
   ↓
Economy OS (4294) → Process payment
   ↓
Monitoring (3100) → Log metrics
```

### 2. AI Agent Onboarding Flow

```
New Agent → Agent ID (4145) → Verify identity
   ↓
Identity OS (4144) → Register (→ CorpID :4702)
   ↓
Twin OS (4142) → Create digital twin (→ TwinOS Hub :4705)
   ↓
Trust Engine (4291) → Initial trust score (→ SADA :4190, falls back to local)
   ↓
Agent Network (4155) → Connect to network
   ↓
Memory Bridge (4143) → Load long-term memory (→ MemoryOS :4703)
```

### 3. Transaction Flow (BNPL example)

```
Buyer → Hub /api/nexha/nexha-trade-finance-network/api/v1/credit-offers (→ :4287)
   ↓
Trust Engine (4291) → Pull trust score (or use caller-provided)
   ↓
Decision Engine (4290) → Risk band A-E selection
   ↓
Contract OS (4292) → Create loan contract
   ↓
Economy OS (4294) → Disburse funds
   ↓
Usage Tracker (4252) → Meter repayment
   ↓
Trust Engine (4291) → Update reputation on completion
```

---

## Component Interactions

### Goal Decomposition Example

```
User Goal: "Increase restaurant sales by 20% in 3 months"
   ↓
Goal OS (4242) → Decompose into sub-goals
   ├── Increase foot traffic by 15%
   ├── Increase average order value by 10%
   └── Improve customer retention by 25%
   ↓
Decision Engine (4290) → Choose strategies
   ├── Marketing campaign (uses Marketing OS via Hub)
   ├── Menu optimization (uses Restaurant OS via Hub)
   └── Loyalty program (uses REZ-Consumer)
   ↓
Flow OS (4244) → Orchestrate execution
   ↓
Simulation OS (4241) → Run what-if analysis
   ↓
Goal OS (4242) → Track progress
```

### Smart Contract Example

```
Contract: "Deliver 1000 units by Dec 31"
   ↓
Contract OS (4292) → Create contract
   ↓
Define terms: quantity, price, deadline, penalties
   ↓
Signatures: Buyer, Seller, Witness (Trust Engine :4291)
   ↓
Execute: Monitor delivery (Goal OS :4242 tracking)
   ↓
Verify: Check conditions met
   ↓
Settle: Economy OS (:4294) processes payment
   ↓
Close: Update Trust scores for both parties (Trust Engine :4291)
```

---

## Service Dependencies (current)

```
Gateway (4140)
├── depends on: Identity OS, Trust Engine
└── used by: Hub, all external services

Marketplace (4250) — MOVED to blr-ai-marketplace on 2026-06-21
├── depends on: Trust Engine, Discovery Engine, Economy OS
└── used by: All AI agents, Industry OS

Decision Engine (4290) ← renumbered 2026-06-22
├── depends on: Simulation OS, Policy OS, Goal OS
└── used by: All autonomous systems

Negotiation Engine (4293) ← renumbered 2026-06-22
├── depends on: Trust Engine, Contract OS, Goal OS
└── used by: Agent Network, Industry OS

Trust Engine (4291) ← renumbered 2026-06-22
├── depends on: SADA :4190 (federation), Identity OS, Reputation Aggregator
└── used by: All services

Contract OS (4292) ← renumbered 2026-06-22
├── depends on: Trust Engine, Negotiation Engine
└── used by: All economic flows

Economy OS (4294) ← renumbered 2026-06-22
├── depends on: Trust Engine, Contract OS
└── used by: All payment flows

Phase C backbone (built 2026-06-22):
  nexha-supplier-network (4280) — SUTAR+Nexha alias
  nexha-distribution-network (4285) — SUTAR+Nexha alias
  nexha-warehouse-network (4288) — SUTAR+Nexha alias
  nexha-trade-finance-network (4287) — SUTAR+Nexha alias
  nexha-pricing-network (4286) — SUTAR+Nexha alias (Phase C.6)
```

---

## What SUTAR does NOT integrate with (Boundaries)

To avoid confusion, SUTAR OS **does not** directly call or import from:

| System | Reason | How it would work instead |
|---|---|---|
| **REZ Merchant** (CRM, Wallet, Auth, Checkout, Care) | SUTAR has its own payment primitives (`payment.service.ts:13` in `sutar-economy-os`) | Shared workflows at the Hub level (`/api/customer360`, `/api/workflow/lead-to-revenue`) |
| **AdBazaar** (DSP, Audience, Attribution, CDP) | Different scope (advertising) | Not in SUTAR's reach; out of ecosystem bridge |
| **Genie Gateway** (4701) + 23 specialists (4709-4727) | Genie is a separate consumer-facing product | do-app's [hojaiClient.ts:416-422](companies/do-app/backend/src/services/hojaiClient.ts#L416) talks to Genie directly; SUTAR via Hub |
| **Revenue Intelligence Copilot** | Reads Sales+Marketing+Operations only | No SUTAR refs in source |
| **RAZO Keyboard** (4725) | Intent detection is independent | No SUTAR refs in source |
| **Voice Twin** (4876) + Speech Intelligence (4870) | Voice-specific | No SUTAR refs |
| **Industry OS** (Restaurant, Hotel, Healthcare, …) | Reach SUTAR via Hub `/api/sutar/*` | `RTMN_SERVICES` config in industry-os; `sutarBridge.ts` in sales-hub |
| **Customer Twin** (4895), Order Twin (4885), Wallet Twin (4896) | TwinOS layer above SUTAR | SUTAR's `sutar-twin-os` (4142) talks to TwinOS Hub (4705), not individual twins |
| **External clients** (e.g. Leverge) | Per RTMN External Clients Policy | Out of scope |

---

## Scalability

SUTAR OS is designed for horizontal scaling:

- **Stateless Services**: Most services are stateless
- **Event-Driven**: Communication via Event Bus (4154)
- **Distributed**: Services can run on multiple nodes
- **Cached**: In-memory caches for performance
- **Monitored**: sutar-monitoring (3100) + Prometheus + Grafana

---

## Security Architecture

```
┌─────────────────────────────────────────┐
│  External Request                        │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  RTMN Hub (4399)                         │
│  - JWT Validation                        │
│  - Rate Limiting                         │
│  - Request Logging                       │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  SUTAR Gateway (4140) or direct service  │
│  - requireAuth middleware                │
│  - helmet security headers              │
│  - express-rate-limit                    │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Identity (4144) / Agent ID (4145)       │
│  - Role-Based Access Control             │
│  - Permission Check                      │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Service Layer                           │
│  - Zod Input Validation                  │
│  - Business Logic                        │
│  - Audit Logging                         │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Trust Engine (4291) → SADA (4190)      │
│  - Verify Trust Score                    │
│  - Check Reputation                      │
└─────────────────────────────────────────┘
```

---

## Performance (measured 2026-06-22)

| Metric | Target | Actual |
|--------|--------|--------|
| Hub proxy pass-through | < 50ms | 5-20ms (depending on upstream) |
| Negotiation round | < 500ms | 420ms |
| Warehouse slot search | < 200ms | 85ms (in-memory) |
| Trust score (SADA reachable) | < 100ms | 35ms |
| Trust score (SADA fallback) | < 50ms | 5ms (local) |
| Contract execution | < 1s | 850ms |
| Test suite (7 services) | n/a | 425 vitest tests, 0 failures |

---

## Deployment

### Local Development (one command)

```bash
# Start the 5-service dev stack (Hub + 4 SUTAR services)
bash scripts/dev-stack.sh start

# Run end-to-end demo
bash demos/full-stack-demo.sh

# Or via Docker
docker compose -f docker-compose.dev.yml up --build
```

### Per-service start (advanced)

```bash
# Hub
cd companies/RABTUL-Technologies/REZ-ecosystem-connector
PORT=4399 node dist/index.js

# SUTAR core services
cd companies/HOJAI-AI/sutar-os
node core/sutar-gateway/index.js &         # 4140
node core/sutar-decision-engine/index.js &  # 4290
node core/sutar-trust-engine/index.js &     # 4291
node contracts/sutar-contract-os/index.js & # 4292
node contracts/sutar-negotiation-engine/index.js &  # 4293
node economy/sutar-economy-os/index.js &    # 4294

# Phase C backbone (now in Nexha per ADR-0009 Phase 0, 2026-06-22)
cd companies/Nexha/services
node nexha-supplier-network/index.js &         # 4280
node nexha-distribution-network/index.js &     # 4285
node nexha-warehouse-network/index.js &        # 4288
node nexha-trade-finance-network/index.js &    # 4287
node nexha-pricing-network/index.js &          # 4286

# Monitoring
node core/sutar-monitoring/index.js &  # 3100
```

### Production (Render)

The 5-service dev stack runs on Render; the full 29-service production deployment is managed via `render.yaml` in the HOJAI-AI repo.

---

*Last Updated: June 22, 2026*  
*SUTAR OS Architecture Documentation v4.0*
