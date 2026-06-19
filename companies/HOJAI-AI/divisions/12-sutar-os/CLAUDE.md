# Division 12 — SUTAR OS (Autonomous Economic OS)

> **Status:** 🟡 ~25% real code (6 of 25 services have working source), ❌ ~0% running (none of the 6 are started today)
> **Owner:** HOJAI AI (per user clarification — SUTAR is a HOJAI AI standalone product consumed by all RTMN OSes)
> **Architecture docs:** [docs/sutar-os/](../../../docs/sutar-os/) — complete 7-layer (or 12-layer per RABTUL docs) specification

---

## 1. Mission

**SUTAR OS is the Autonomous Economic Operating System of RTMN.** Per the user's clarification: **"SUTAR OS is a standalone product of HOJAI AI, and it's used by all different RTMN OS."**

This is a critical architectural clarification:

- **SUTAR OS is owned and built by HOJAI AI** (not by RTMN, not by any RTMN company)
- **All RTMN OSes consume SUTAR OS** as a service (RTMN Department OSes, Industry OSes, HOJAI AI products themselves)
- SUTAR is the **execution layer** for AI agents to actually do things in the RTMN economy

SUTAR enables AI agents to:
- Set and decompose **goals** autonomously
- Make **decisions** based on policies and simulations
- **Discover** services, agents, and opportunities
- **Negotiate** prices and terms with other agents
- Execute via **smart contracts**
- Earn and spend in an **economy**
- Build **trust** through reputation

## 2. Target State (per [docs/sutar-os/ARCHITECTURE.md](../../../docs/sutar-os/))

### 7-Layer Architecture (per docs/sutar-os/)

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 7: Discovery & ROI (5 services)                          │
│  Exploration (4255), Discovery (4256), Multi-Agent Evaluator (4257),
│  Reputation Aggregator (4258), ROI Calculator (4259)            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 6: Trust & Contracts (3 services)                         │
│  Trust Engine (4180), Contracts OS (4185), Negotiation Engine (4191) │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Marketplace & Economy (4 services)                     │
│  Marketplace/Salar OS (4250), Economy OS (4251),
│  Usage Tracker (4252), Policy OS (4254)                         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Decision & Flow (6 services)                           │
│  Decision Engine (4240), Simulation OS (4241), Goal OS (4242),
│  Network Learning (4243), Flow OS (4244), Founder OS (4260)     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Intent & Network (3 services)                          │
│  Intent Bus (4154), Agent Network (4155), REZ Bridge (4155)     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Gateway & Twin (5 services)                            │
│  Gateway (4140), Twin OS (4142), Memory Bridge (4143),
│  Identity OS (4144), Agent ID (4145)                            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Monitoring (1 service)                                 │
│  Monitoring (3100)                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Total: 25 services (7-layer), port range 3100-4260.** RABTUL docs also reference a **12-Layer Canonical Architecture** with 8 more services. The 7-layer is the canonical doc in `docs/sutar-os/`; the 12-layer is in RABTUL's REZ-trust-scorer CLAUDE.md.

## 3. Current State — What's Actually Built

### A. SUTAR Services with REAL source code (6 services, 2 have port conflict)

| SUTAR Service | Port | Location | Source | Layer |
|---|---|---|---|---|
| **Trust Engine** | 4180 | [companies/RABTUL-Technologies/REZ-trust-scorer/](../../../companies/RABTUL-Technologies/REZ-trust-scorer/) | TypeScript (config, middleware, utils, types) | Layer 6 — Trust |
| **Negotiation Engine** | 4191 | [companies/RABTUL-Technologies/REZ-negotiation-engine/](../../../companies/RABTUL-Technologies/REZ-negotiation-engine/) | TypeScript (models, routes, services) | Layer 6 — Trust |
| **Economy OS** | 4251 | [companies/RABTUL-Technologies/REZ-economy-os/](../../../companies/RABTUL-Technologies/REZ-economy-os/) | TypeScript (full stack) | Layer 5 — Economy |
| **Decision Engine** | 4240 | [industry-os/shared/decision-engine/](../../../industry-os/shared/decision-engine/) | JavaScript (routes/decisions.js, routes/policies.js) | Layer 4 — Decision |
| **Goal OS** | 4242 | [industry-os/shared/goal-os/](../../../industry-os/shared/goal-os/) | JavaScript (routes/goals.js) | Layer 4 — Goal |
| **Agent Economy** | 4251 | [industry-os/shared/agent-economy/](../../../industry-os/shared/agent-economy/) | JavaScript | Layer 5 — Economy |

### B. SUTAR Service Duplicates & Conflicts

- **Port 4251 conflict:** Both [REZ-economy-os](../../../companies/RABTUL-Technologies/REZ-economy-os/) and [agent-economy](../../../industry-os/shared/agent-economy/) claim port 4251. They're different implementations of "Economy OS". Need to decide which is canonical.
- **REZ-trust-scorer** (port 4180) and **REZ-sla-monitor** (port 4195) and **REZ-breach-detector** (port 4196) are RABTUL services but not tagged "SUTAR" in their CLAUDE.md — though they're called "SUTAR OS" services in the trust-scorer doc. They're more "RABTUL infra" than SUTAR core.
- **Memory Bridge (4143)** vs **MemoryOS (4703)** vs **twinos-hub (4705)** vs **industry-os/shared/memory-os** — the actual memory/twin functionality already exists in /services/, so SUTAR's Layer 2 (Twin/Memory) is essentially already covered by the runtime RTMN services.

### C. SUTAR Documentation (already complete)

| Doc | Location | Status |
|---|---|---|
| README | [docs/sutar-os/README.md](../../../docs/sutar-os/README.md) | ✅ 423 lines |
| Architecture | [docs/sutar-os/ARCHITECTURE.md](../../../docs/sutar-os/ARCHITECTURE.md) | ✅ 309 lines |
| API Reference | [docs/sutar-os/API.md](../../../docs/sutar-os/API.md) | ✅ 673 lines |
| Integration | [docs/sutar-os/INTEGRATION.md](../../../docs/sutar-os/INTEGRATION.md) | ✅ 557 lines |
| Older "Salar OS" docs | [docs/salar-os/](../../../docs/salar-os/) | ✅ Deprecated (now part of SUTAR) |

### D. SUTAR Bridges (4)

| Bridge | Location | Purpose |
|---|---|---|
| **BOA-SUTAR Bridge** | [companies/RTNM-Group/boa-sutar-bridge/](../../../companies/RTNM-Group/boa-sutar-bridge/) | Sync between BOA OS strategy and SUTAR execution |
| **REZ Sales → SUTAR Bridge** | [services/sales-hub/src/services/sutarBridge.ts](../../../services/sales-hub/src/services/sutarBridge.ts) | Sales hub integration |
| **SUTAR Marketplace integration** | [services/unified-os-hub/src/agent-marketplace.js](../../../services/unified-os-hub/src/agent-marketplace.js) | Unified OS hub integration |
| **SUTAR Karma integration** | [industry-os/services/sales-os/integrations/sutar-karma.js](../../../industry-os/services/sales-os/integrations/sutar-karma.js) | Sales OS karma integration |

### E. SUTAR Mocks (1)

| Service | Location | Purpose |
|---|---|---|
| **SUTAR Mock** | [companies/Nexha/sutar-mock/](../../../companies/Nexha/sutar-mock/) | Minimal mock for local commerce-identity development |

## 4. What's NOT Built (19 of 25 SUTAR services)

| # | SUTAR Service | Port | Status | Notes |
|---|---|---|---|---|
| 1 | **Monitoring** | 3100 | ❌ | Layer 1 — base observability |
| 2 | **Gateway** | 4140 | ❌ | Layer 2 — entry point |
| 3 | **Twin OS** (SUTAR-specific) | 4142 | ❌ | Layer 2 — distinct from /services/twinos-hub (4705) |
| 4 | **Memory Bridge** | 4143 | ❌ | Layer 2 — likely overlaps with /services/memory-os (4703) |
| 5 | **Identity OS** (SUTAR-specific) | 4144 | ❌ | Layer 2 — distinct from /services/corpid-service (4702) |
| 6 | **Agent ID** | 4145 | ❌ | Layer 2 — agent identity |
| 7 | **Intent Bus** | 4154 | ❌ | Layer 3 |
| 8 | **Agent Network** | 4155 | ❌ | Layer 3 — likely overlaps with /services/acn-network (4801) |
| 9 | **REZ Bridge** | 4155 | ❌ | Layer 3 |
| 10 | **Contracts OS** | 4185 | ❌ | Layer 6 — likely overlaps with /services/agent-contracts (4830) |
| 11 | **Simulation OS** | 4241 | ❌ | Layer 4 |
| 12 | **Network Learning** | 4243 | ❌ | Layer 4 |
| 13 | **Flow OS** | 4244 | ❌ | Layer 4 |
| 14 | **Marketplace (Salar OS)** | 4250 | ❌ | Layer 5 — likely overlaps with /services/agent-marketplace (4845) |
| 15 | **Usage Tracker** | 4252 | ❌ | Layer 5 |
| 16 | **Policy OS** | 4254 | ❌ | Layer 5 — note: there's also a REZ-policy-engine (4034) but that's RABTUL-specific |
| 17 | **Exploration** | 4255 | ❌ | Layer 7 |
| 18 | **Discovery** | 4256 | ❌ | Layer 7 |
| 19 | **Multi-Agent Evaluator** | 4257 | ❌ | Layer 7 |
| 20 | **Reputation Aggregator** | 4258 | ❌ | Layer 7 |
| 21 | **ROI Calculator** | 4259 | ❌ | Layer 7 |
| 22 | **Founder OS** | 4260 | ❌ | Layer 4 |

## 5. Gap Score

- **By architecture documentation:** ~100% (4 docs, complete 7-layer spec, ~2,000 lines)
- **By implementation:** ~24% (6 of 25 services have real source code; 2 have port conflicts)
- **By runtime:** ~0% (none of the 6 SUTAR services are running today — lsof on all 25 SUTAR ports returns nothing)

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **Start the 6 existing SUTAR services** (trust, negotiation, economy, decision, goal, agent-economy) — they're built, just not running | 🔴 P0 | 1-2 days — npm install, fix any compile errors, start them |
| 2 | **Resolve port 4251 conflict** (REZ-economy-os vs agent-economy) | 🔴 P0 | 1 hour — pick canonical, retire the other |
| 3 | **Gateway (4140)** — entry point for all SUTAR traffic | 🔴 P0 | 1-2 weeks |
| 4 | **Identity OS (4144)** — SUTAR-specific agent identity (vs CorpID 4702 for user identity) | 🟡 P1 | 1 week |
| 5 | **Intent Bus (4154)** — broadcast intent across SUTAR | 🟡 P1 | 1-2 weeks |
| 6 | **Contracts OS (4185)** — smart contracts (likely overlaps with /services/agent-contracts 4830) | 🟡 P1 | 1-2 weeks |
| 7 | **Marketplace / Salar OS (4250)** — service marketplace (likely overlaps with /services/agent-marketplace 4845) | 🟡 P1 | 2 weeks |
| 8 | **Flow OS (4244)** — workflow orchestration | 🟡 P1 | 1-2 weeks |
| 9 | **Simulation OS (4241)** — what-if analysis | 🟡 P1 | 2-3 weeks |
| 10 | **Goal OS (4242)** — already exists, just needs to be running | 🟢 P2 | hours |
| 11 | **Discovery (4256)** | 🟢 P2 | 1-2 weeks |
| 12 | **Twin OS (4142)** — SUTAR-specific (vs /services/twinos-hub 4705) | 🟢 P2 | 2 weeks |
| 13 | **Memory Bridge (4143)** — likely overlaps with /services/memory-os | 🟢 P2 | 1 week |
| 14 | **Usage Tracker (4252)** | 🟢 P2 | 1 week |
| 15 | **Policy OS (4254)** | 🟢 P2 | 1-2 weeks |
| 16 | **Reputation Aggregator (4258)** | 🟢 P2 | 1 week |
| 17 | **ROI Calculator (4259)** | 🟢 P2 | 1 week |
| 18 | **Multi-Agent Evaluator (4257)** | 🟢 P2 | 2 weeks |
| 19 | **Exploration (4255)** | 🟢 P2 | 1 week |
| 20 | **Network Learning (4243)** | 🟢 P3 | 2-3 weeks |
| 21 | **REZ Bridge (4155)** | 🟢 P3 | 1 week |
| 22 | **Agent ID (4145)** | 🟢 P3 | 1 week |
| 23 | **Agent Network (4155)** — likely overlaps with /services/acn-network | 🟢 P3 | 2 weeks |
| 24 | **Founder OS (4260)** | 🟢 P3 | 2-3 weeks |
| 25 | **Monitoring (3100)** | 🟢 P3 | 1-2 weeks |

## 7. Dependencies

- **Depends on:** Division 1 (Foundation — auth, eventing, secrets), Division 2 (Memory, Twin), Division 4 (agents)
- **Blocks:** Division 8 (Products run on SUTAR), Division 11 (Marketplace economy runs on SUTAR)
- **Consumed by:** **ALL RTMN OSes** — Department OS, Industry OS, HOJAI AI products, other RTMN companies

## 8. Open Questions

These are big — the docs say one thing, the code says another:

1. **SUTAR Twin OS (4142) vs /services/twinos-hub (4705):** Are these the same thing? Different scopes? If same, port conflict. Need to decide.
2. **SUTAR Memory Bridge (4143) vs /services/memory-os (4703):** Same question.
3. **SUTAR Agent Network (4155) vs /services/acn-network (4801):** Same question.
4. **SUTAR Marketplace (4250) vs /services/agent-marketplace (4845):** Same question.
5. **SUTAR Contracts OS (4185) vs /services/agent-contracts (4830):** Same question.
6. **SUTAR Negotiation Engine (4191) vs /services/negotiation-ai (4850):** Same question.
7. **REZ-economy-os (4251) vs industry-os/shared/agent-economy (4251) — port conflict, pick one.**
8. **7-layer vs 12-layer architecture** — docs/sutar-os says 7 layers, REZ-trust-scorer CLAUDE.md says "8th layer of 12-Layer". Which is canonical?
9. **Are the SUTAR docs still accurate?** They reference `hojai-ai/hojai-sutar-os/` paths that don't exist. Either the docs are stale, or the source needs to be reconstructed from the GitHub submodule.

## 9. Suggested Approach

Given the gap between docs and code, I recommend one of these:

**Option A — Start the 6 existing, document the rest (Recommended):**
- Get the 6 SUTAR services with real code running today
- Update docs to mark the 19 missing services as TODO
- Resolve the port-4251 conflict (pick canonical)
- Defer building the missing 19 until a later phase

**Option B — Reconcile SUTAR with existing RTMN services:**
- SUTAR docs are aspirational; the actual SUTAR uses existing RTMN services
- Rewrite the SUTAR docs to point at the RTMN services that fulfill each SUTAR role
- Less code, more accurate docs

**Option C — Hybrid:**
- Keep SUTAR as a *layered abstraction* (Layer 14 of RTMN)
- The "services" in SUTAR docs are *patterns*, not new services
- Each SUTAR service maps to one or more existing RTMN services

**My recommendation: Option A** — start the 6 that exist, then build the rest incrementally.

---

*See also: [docs/sutar-os/](../../../docs/sutar-os/) (the canonical SUTAR docs), [companies/RTNM-Group/boa-sutar-bridge/](../../../companies/RTNM-Group/boa-sutar-bridge/), [ACN-ARCHITECTURE.md](../../../../ACN-ARCHITECTURE.md)*

## 10. Correction From Previous Audit

The original Division 12 doc said:
- "**4 SUTAR services real** (REZ-trust-scorer, REZ-economy-os, REZ-sla-monitor, REZ-breach-detector)"
- "**21 of 25 SUTAR services don't have source code**"

This was wrong. The corrected picture:
- **6 SUTAR services with real code** (trust, negotiation, economy, decision-engine, goal-os, agent-economy)
- **REZ-sla-monitor and REZ-breach-detector are RABTUL services, not SUTAR core** (they're cross-cutting monitoring, not in the SUTAR layer architecture)
- **19 of 25 SUTAR services still missing** (this part was correct)
- **2 port conflicts exist** (4251 economy-os vs agent-economy, 4155 agent-network vs rez-bridge)
- **None of the 6 are running** — lsof on all 25 SUTAR ports returned nothing
