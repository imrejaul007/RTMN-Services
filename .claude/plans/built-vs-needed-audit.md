# RTMN Build Status Audit — What's Built vs What Needs Building

> **Date:** 2026-06-22
>
> **Source of truth:** `CANONICAL-PORT-REGISTRY.md` (machine-verified), `CLAUDE.md`, 9 strategic planning docs.

---

## 0. Executive Summary

**RTMN today: 75% built. The 25% gap = Global Nexha network services + HOJAI Foundry.**

---

## 1. What's BUILT (75%)

### HOJAI Foundation (~80%)

| Service | Port | Status |
|---|---|---|
| corpid-service | 4702 | ✅ |
| memory-os | 4703 | ✅ |
| memory-confidence | 4152 | ✅ |
| memory-context-engine | 4790 | ✅ |
| twin-memory-bridge | 4704 | ✅ |
| twinos-hub | 4705 | ✅ (86+ twins) |
| event-bus, secrets-manager, feature-flags, context-engine, tenant-manager | 4510, 4744-4747 | ✅ |

### SUTAR OS (~75%)

- 9 core engines (gateway, decision, trust, economy, monitoring, etc.) ✅
- 2 contract services (contract-os, negotiation-engine) ✅
- 1 economy service (**105 tests**) ✅
- 13+ agent services (orchestration, teaming, learning, analytics, etc.) ✅
- ACP protocol (spec v2.0 + reference impl) ✅

### Nexha Networks (5 built + 1 gateway)

- nexha-supplier-network (4280) — 20 tests ✅
- nexha-distribution-network (4285) — 22 tests ✅
- nexha-pricing-network (4286) — 31 tests ✅
- nexha-trade-finance-network (4287) — 38 tests ✅
- nexha-warehouse-network (4288) — 49 tests ✅
- nexha-gateway (5002) ✅

### Genie AI Suite (100%)

All 23 Genie services running, 13 test suites passing (78 assertions).

### Department OS (10 built)

Sales (5055), Customer Success (4050), Marketing (5500), Procurement (5096), Workforce (5077), Finance (4801), Operations (5250), CXO (5100), Revenue Intelligence (5400), Media (5600).

### Industry OS (24-26 mostly built)

All 24-26 vertical OS exist as services (mostly scaffolds).

### TwinOS (86+ twins)

11 main services + 86 individual twins across 15 categories.

### RTMN Companies (production code)

- RABTUL: 178+ services (auth, payments, wallet, BNPL, treasury)
- KHAIRMOVE: 30+ services (mobility, delivery, airport)
- StayOwn-Hospitality: 45+ services
- RisaCare: 56+ services
- Karma Foundation: 6+ services
- AdBazaar: 264 services (advertising + commerce media)
- do-app, razo-keyboard: built

### RTMN Hub

unified-os-hub (4399) routes 16+ SUTAR services.

---

## 2. What's NOT BUILT (the 25% gap)

### Critical Gaps (the Global Nexha network services)

| Service | Port | Priority |
|---|---|---|
| **CapabilityOS** | 4270 | P0 |
| **ReputationOS** (ACI scoring) | 4271 | P0 |
| **DiscoveryOS** | 4272 | P0 |
| **FederationOS** | 4273 | P1 |
| **OpportunityOS** | 4274 | P1 |
| **MarketOS** | 4275 | P1 |
| **Global Directory** | 4276 | P1 |
| **Nexha OS runtime** (Docker) | — | P1 |
| **nexha-autonomous-logistics** | 4293 | P0 (KHAIRMOVE gap) |

### Strategic Gaps (HOJAI Foundry)

- `@hojai/foundation` SDK ❌
- `@hojai/sutar`, `@hojai/nexha`, `@hojai/commerce`, `@hojai/payment`, `@hojai/logistics`, `@hojai/reputation`, `@hojai/discovery` SDKs ❌
- `npx hojai create` CLI ❌
- 9 starter kits (marketplace, B2B, company, hotel, restaurant, logistics, CRM, ERP, POS) ❌
- `hojai.ai.md` AI-native spec template ❌
- HOJAI Marketplace (template + skill + workflow marketplace) ❌

### Commerce Gaps (DO + REZ)

- DO app full agentic commerce (do-app exists but not as full agentic commerce) ⚠️ 30%
- REZ Coin L2 ❌
- REZ Wallet mobile app (rez-wallet exists but not consumer-facing) ⚠️ 40%
- ACS scoring engine ❌
- Dynamic commission engine ❌

### Marketing Gaps

- AI Marketing Agent (SUTAR) ❌
- WhatsApp Business API integration ❌
- Composer LLM ❌
- Channel adapters (email, push, SMS, voice) ❌
- Campaign Manager dashboard ❌

### Governance Gaps

- ACP Foundation ❌
- Federation Council ❌
- Trust Council ❌
- ACP open license ❌
- Conformance test suite ❌
- ACP SDKs (TypeScript, Python, Go, Java) ❌

---

## 3. What's PARTIALLY BUILT

- **nexha-gateway** — built for warehouse only, not extended
- **5 nexha networks** — built individually but not federated
- **RABTUL** — 178+ services but not wired to Nexha OS
- **do-app** — exists as standalone, not as agentic commerce
- **AdBazaar** — scoped correctly but not integrated with ReputationOS
- **24 Industry OS** — exist as services but mostly scaffolded

---

## 4. Numbers

| Metric | Count |
|---|---|
| Total services in RTMN | ~750+ |
| TypeScript files | ~58,000+ |
| JS files | ~10,800+ |
| Port assignments | ~150+ |
| Vitest tests passing | ~425 |
| TwinOS twins | 86+ |
| Genie services | 23 (all running) |
| Companies | 25+ |

---

## 5. The Critical Path (build order)

### Tier 1 (Months 1-6): Critical

1. **`@hojai/foundation` SDK v1** (2-3 weeks) — **START HERE**
2. **CapabilityOS v0.1** (3 weeks)
3. **ReputationOS v0.1 → v1.0** (8 weeks)
4. **DiscoveryOS v0.1** (3 weeks)
5. **nexha-autonomous-logistics** (8 weeks)
6. **Nexha OS runtime** (4 weeks)
7. **FederationOS** (4 weeks)

### Tier 2 (Months 7-12): Strategic

8. OpportunityOS + MarketOS (11 weeks)
9. HOJAI Foundry CLI + 3 starter kits (8 weeks)
10. 6 more HOJAI SDKs (8 weeks parallel)
11. Global Directory + 100 federated Nexhas (12 weeks)
12. REZ Coin L2 + Wallet (12 weeks)
13. Marketing Agent + WhatsApp (6 weeks)

### Tier 3 (Months 13-24): Scale

14. HOJAI Foundry v2-v5 (all 14 layers)
15. DO app full agentic commerce
16. 8 Industry Networks
17. ACP Foundation
18. Developer Platform mature

---

## 6. What NOT to Rebuild

- ❌ Don't rebuild CorpID, MemoryOS, TwinOS — built
- ❌ Don't rebuild the 5 nexha-* networks — built
- ❌ Don't rebuild SUTAR engines — built
- ❌ Don't rebuild Genie services — built
- ❌ Don't rebuild RABTUL's 178+ services — built

**What to build = the integration layer** (the 25% gap).

---

## 7. Recommendations

### Update planning docs

The 9 planning docs are ~95% accurate but should be updated to reference all existing built services (agent-orchestration, agent-teaming, agent-learning, agent-analytics, flow-os-canonical, SkillOS, Skill Marketplace, Workflow Marketplace, Knowledge Marketplace, GoalOS, Decision Engine, etc.).

### Update master CLAUDE.md

Reconcile "24 industry verticals" with actual 26+ in codebase.

### Build order

**Start with `@hojai/foundation` SDK v1.** It's the smallest thing but everything else depends on it.

---

*This audit was compiled by direct inspection. Last updated: 2026-06-22.*
