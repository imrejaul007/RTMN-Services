# Division 12 — SUTAR OS (Autonomous Economic OS)

> **Status:** 🟢 ~50% documented (full architecture docs at `docs/sutar-os/`); 🟡 ~20% running (only REZ-trust-scorer + REZ-economy-os + REZ-sla-monitor + REZ-breach-detector are real)
> **Owner:** RTNM-Group / BOA-SUTAR + SUTAR OS teams

---

## 1. Mission

**SUTAR OS (formerly "Salar OS") is the Autonomous Economic Operating System of RTMN.** Per the user's clarification: **"SUTAR OS is a standalone product of HOJAI AI, and it's used by all different RTMN OS."**

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

This is **not** infrastructure, **not** intelligence, **not** products — it's the **execution OS** that sits between Intelligence (which decides what to do) and the lower-level agents that do it.

## 2. Target State (per plan + actual SUTAR docs)

### 7-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 7: Discovery & ROI                                       │
│  Exploration (4255), Discovery (4256), Multi-Agent Evaluator (4257),
│  Reputation Aggregator (4258), ROI Calculator (4259)            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 6: Trust & Contracts                                     │
│  Trust Engine (4180), Contracts OS (4185), Negotiation Engine (4191) │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Marketplace & Economy                                  │
│  Marketplace/Salar OS (4250), Economy OS (4251),
│  Usage Tracker (4252), Policy OS (4254)                         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Decision & Flow                                        │
│  Decision Engine (4240), Simulation OS (4241), Goal OS (4242),
│  Network Learning (4243), Flow OS (4244), Founder OS (4260)   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Intent & Network                                       │
│  Intent Bus (4154), Agent Network (4155), REZ Bridge (4155)   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Gateway & Twin                                         │
│  Gateway (4140), Twin OS (4142), Memory Bridge (4143),
│  Identity OS (4144), Agent ID (4145)                            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Monitoring                                             │
│  Monitoring (3100)                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Total: 25 services, port range 3100-4260.**

## 3. Current State — What's Actually Built

### A. SUTAR Components with REAL source code

| SUTAR Service | Port | Actual Location | State |
|---|---|---|---|
| **Trust Engine** (SUTAR Layer 6) | 4180 | [companies/RABTUL-Technologies/REZ-trust-scorer/](../../../companies/RABTUL-Technologies/REZ-trust-scorer/) | ✅ Real (CLAUDE.md, src/, package.json) |
| **Economy OS** (SUTAR Layer 5) | 4251 | [companies/RABTUL-Technologies/REZ-economy-os/](../../../companies/RABTUL-Technologies/REZ-economy-os/) | ✅ Real (full source, src/middleware/) |
| **SLA Monitor** (SUTAR Layer 1) | (monitoring) | [companies/RABTUL-Technologies/REZ-sla-monitor/](../../../companies/RABTUL-Technologies/REZ-sla-monitor/) | ✅ Real |
| **Breach Detector** (SUTAR Layer 1) | (monitoring) | [companies/RABTUL-Technologies/REZ-breach-detector/](../../../companies/RABTUL-Technologies/REZ-breach-detector/) | ✅ Real |

**4 SUTAR services are real, with full TypeScript source code.**

### B. SUTAR Mock (for local dev)

| Service | Location | Purpose |
|---|---|---|
| **SUTAR Mock** | [companies/Nexha/sutar-mock/](../../../companies/Nexha/sutar-mock/) | Minimal mock for local commerce-identity development |

### C. SUTAR Bridges

| Bridge | Location | Purpose |
|---|---|---|
| **BOA-SUTAR Bridge** | [companies/RTNM-Group/boa-sutar-bridge/](../../../companies/RTNM-Group/boa-sutar-bridge/) | Sync between BOA OS strategy and SUTAR execution |
| **REZ Sales → SUTAR Bridge** | [services/sales-hub/src/services/sutarBridge.ts](../../../services/sales-hub/src/services/sutarBridge.ts) | Sales hub integration |
| **SUTAR Marketplace integration** | [services/unified-os-hub/src/agent-marketplace.js](../../../services/unified-os-hub/src/agent-marketplace.js) | Unified OS hub integration |
| **SUTAR Karma integration** | [industry-os/services/sales-os/integrations/sutar-karma.js](../../../industry-os/services/sales-os/integrations/sutar-karma.js) | Sales OS karma integration |

### D. SUTAR Components that are MISSING (need build)

The SUTAR docs reference paths like `hojai-ai/hojai-sutar-os/` for all the components, but those paths don't exist as actual source code in the parent repo. They live in the (now-removed) `hojai-ai` submodule on GitHub.

The missing components include:

| SUTAR Service | Port | Status |
|---|---|---|
| Gateway | 4140 | ❌ |
| Twin OS | 4142 | ❌ (real one is `services/twinos-hub` on port 4705, different scope) |
| Memory Bridge | 4143 | ❌ (real one is `services/memory-os` on 4703, different scope) |
| Identity OS | 4144 | ❌ (real one is `services/corpid-service` on 4702, different scope) |
| Agent ID | 4145 | ❌ |
| Intent Bus | 4154 | ❌ |
| Agent Network | 4155 | ❌ (similar to `services/acn-network` on 4801) |
| REZ Bridge | 4155 | ❌ |
| Contracts OS | 4185 | ❌ (similar to `services/agent-contracts` on 4830) |
| Negotiation Engine | 4191 | ❌ (similar to `services/negotiation-ai` on 4850) |
| Decision Engine | 4240 | ❌ |
| Simulation OS | 4241 | ❌ |
| Goal OS | 4242 | ❌ (similar to genie-life-gps on 4721) |
| Network Learning | 4243 | ❌ |
| Flow OS | 4244 | ❌ |
| Founder OS | 4260 | ❌ |
| Marketplace (Salar OS) | 4250 | ❌ (similar to `services/agent-marketplace` on 4845) |
| Usage Tracker | 4252 | ❌ |
| Policy OS | 4254 | ❌ |
| Exploration | 4255 | ❌ |
| Discovery | 4256 | ❌ |
| Multi-Agent Evaluator | 4257 | ❌ |
| Reputation Aggregator | 4258 | ❌ |
| ROI Calculator | 4259 | ❌ |
| Monitoring | 3100 | ❌ (similar to `services/reports-dashboard` on 4874) |

### E. SUTAR Documentation (already exists)

| Doc | Location | Status |
|---|---|---|
| README | [docs/sutar-os/README.md](../../../docs/sutar-os/README.md) | ✅ Full, 423 lines |
| Architecture | [docs/sutar-os/ARCHITECTURE.md](../../../docs/sutar-os/ARCHITECTURE.md) | ✅ Full, 309 lines |
| API Reference | [docs/sutar-os/API.md](../../../docs/sutar-os/API.md) | ✅ Full, 673 lines |
| Integration | [docs/sutar-os/INTEGRATION.md](../../../docs/sutar-os/INTEGRATION.md) | ✅ Full, 557 lines |

## 4. What's NOT Built

**21 of 25 SUTAR services don't have source code.** Only 4 are real (Trust, Economy, SLA Monitor, Breach Detector). The rest need to be built, or acknowledged as "this overlaps with existing services in Division 4 / 11."

## 5. Gap Score

- **By architecture documentation:** ~100% (4 docs, complete 7-layer spec)
- **By implementation:** ~20% (4 of 25 services real)
- **By integration:** ~30% (4 bridges exist)

**Honest verdict:** SUTAR OS is **architecturally defined** but **mostly unbuilt**. The docs paint a vision; the code shows 4 real services + 1 mock + 4 bridges.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **Gateway (4140)** — the entry point. All external requests flow through here. | 🔴 P0 | 4-6 weeks |
| 2 | **Identity OS (4144)** — agent identity, distinct from user identity (CorpID 4702) | 🔴 P0 | 4 weeks |
| 3 | **Decision Engine (4240)** — autonomous policy decisions | 🔴 P0 | 6-8 weeks |
| 4 | **Goal OS (4242)** — goal decomposition and tracking | 🔴 P0 | 4-6 weeks |
| 5 | **Contracts OS (4185)** — smart contracts | 🟡 P1 | 6-8 weeks (similar to existing agent-contracts) |
| 6 | **Negotiation Engine (4191)** — AI-to-AI negotiation | 🟡 P1 | 6-8 weeks |
| 7 | **Marketplace / Salar OS (4250)** — service marketplace | 🟡 P1 | 8-12 weeks |
| 8 | **Flow OS (4244)** — workflow orchestration | 🟡 P1 | 4-6 weeks |
| 9 | **Simulation OS (4241)** — what-if analysis | 🟡 P1 | 8-12 weeks |
| 10 | **Discovery (4256)** — opportunity detection | 🟢 P2 | 4-6 weeks |
| 11 | **Usage Tracker (4252)** | 🟢 P2 | 4 weeks |
| 12 | **Policy OS (4254)** | 🟢 P2 | 4-6 weeks |
| 13 | **Reputation Aggregator (4258)** | 🟢 P2 | 4 weeks |
| 14 | **ROI Calculator (4259)** | 🟢 P2 | 4 weeks |
| 15 | **Multi-Agent Evaluator (4257)** | 🟢 P2 | 6 weeks |
| 16 | **Agent Network (4155)** — distinct from acn-network on 4801? | 🟢 P2 | TBD |
| 17 | **REZ Bridge (4155)** | 🟢 P3 | 2 weeks |
| 18 | **Agent ID (4145)** | 🟢 P3 | 2 weeks |
| 19 | **Intent Bus (4154)** | 🟢 P3 | 4 weeks |
| 20 | **Network Learning (4243)** | 🟢 P3 | 6-8 weeks |
| 21 | **Monitoring (3100)** | 🟢 P3 | 2-4 weeks |
| 22 | **Founder OS (4260)** | 🟢 P3 | 8-12 weeks |
| 23 | **Twin OS (4142)** — conflict with services/twinos-hub 4705 | 🟢 P3 | TBD |
| 24 | **Memory Bridge (4143)** — conflict with services/memory-os 4703 | 🟢 P3 | TBD |
| 25 | **Exploration (4255)** | 🟢 P3 | 4 weeks |

## 7. Dependencies

- **Depends on:** Division 1 (Foundation — auth, eventing), Division 2 (Memory, Twin), Division 4 (agents)
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
7. **What are the actual 25 SUTAR services in production?** The docs say 25, but only 4 are real. Are the other 21 in the GitHub submodule? Or aspirational?
8. **Is SUTAR OS a separate platform from RTMN, or a layer inside RTMN?** Per user clarification, **SUTAR OS is a HOJAI AI product consumed by RTMN**. So it's not a "layer of RTMN" — it's a **separate platform that RTMN calls**.
9. **Salar OS (4250) vs SUTAR OS:** Docs clarify "Salar OS = Marketplace component of SUTAR OS" — so Salar is a submodule of SUTAR, not a separate thing. (Note: there's also an older "Salar OS" branding that's been renamed to SUTAR.)
10. **Are the SUTAR docs still accurate?** They reference `hojai-ai/hojai-sutar-os/` paths that don't exist. Either the docs are stale, or the source needs to be reconstructed from the GitHub submodule.

## 9. Suggested Approach

Given the gap between docs and code, I recommend one of these:

**Option A — Treat SUTAR as a build roadmap (most realistic):**
- Acknowledge that SUTAR is 25 services documented, 4 built
- Build out the missing 21 services incrementally over 6-12 months
- Resolve the overlaps with `/services/` (TwinOS, Memory, etc.) — most likely SUTAR should use the existing services rather than rebuild them

**Option B — Reconcile SUTAR with existing RTMN services:**
- SUTAR docs are aspirational; the actual SUTAR uses existing RTMN services
- Rewrite the SUTAR docs to point at the RTMN services that fulfill each SUTAR role
- Less code, more accurate docs

**Option C — Hybrid:**
- Keep SUTAR as a *layered abstraction* (Layer 14 of RTMN)
- The "services" in SUTAR docs are *patterns*, not new services
- Each SUTAR service maps to one or more existing RTMN services

**My recommendation: Option C** — it matches reality and avoids creating duplicate services.

---

*See also: [docs/sutar-os/](../../../docs/sutar-os/) (the canonical SUTAR docs), [companies/RTNM-Group/boa-sutar-bridge/](../../../companies/RTNM-Group/boa-sutar-bridge/)*