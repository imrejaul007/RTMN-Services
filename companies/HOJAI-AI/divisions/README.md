# HOJAI AI — 11+1 Strategic Divisions

> **The architecture of HOJAI AI as the AI Infrastructure Company of RTMN.**
> Each division below has its own `CLAUDE.md` with a Current State → Target State gap analysis, list of owning services, port map, and what's missing.

---

## The 12 Divisions

| # | Division | One-line | Current State | Gap |
|---|----------|----------|---------------|-----|
| 1 | [AI Foundation](./01-foundation/) | Identity, auth, gateway, eventing — everything required to run AI | 🟢 ~70% | small |
| 2 | [AI Infrastructure Cloud](./02-infrastructure-cloud/) | MemoryOS, TwinOS, FlowOS, PolicyOS, etc. — the OS primitives | 🟡 ~40% | medium-large |
| 3 | [AI Intelligence Cloud](./03-intelligence-cloud/) | The brain — per-industry/per-company intelligence modules + Micro Intelligence fallback pattern | 🟢 ~75% breadth / ~40% depth | large |
| 4 | [AI Agent Cloud](./04-agent-cloud/) | Agent runtime, builder, orchestration, multi-agent systems | 🟢 ~80% | small-medium |
| 5 | [AI Communication Cloud](./05-communication-cloud/) | Voice, phone, WhatsApp, email, SMS, chat, meetings, translation | 🟡 ~60% | medium |
| 6 | [AI Data & Knowledge Cloud](./06-data-knowledge-cloud/) | Knowledge graph, vector DB, RAG, ETL, feature store | 🟡 ~30% | large |
| 7 | [AI Training & Model Platform](./07-training-model-platform/) | Foundation models, fine-tuning, RLHF, model serving, AI safety | 🔴 ~5% | **largest** |
| 8 | [AI Products](./08-products/) | Genie, Razo, Copilots, FounderOS, Bizora, HIB, CXO OS | 🟢 ~70% | medium |
| 9 | [AI Industry Solutions](./09-industry-solutions/) | 26+ Industry OS (Restaurant, Hotel, Retail, Healthcare, etc.) | 🟢 ~95% (breadth) | medium (depth) |
| 10 | [AI Developer Platform](./10-developer-platform/) | APIs, SDKs, CLI, sandbox, webhooks, observability | 🟡 ~40% | medium |
| 11 | [AI Marketplace & Network](./11-marketplace-network/) | Agent/skill/workflow marketplaces, trust, reputation, federation | 🟡 ~30% | medium-large |
| 12 | [SUTAR OS](./12-sutar-os/) | Autonomous Economic OS — 25 services across 7 layers for AI to execute all tasks | 🟡 ~24% code, ~0% running (6 of 25 built, none started) | huge |

**Coverage: ~45-50% across the platform.** ~50% is net-new build.

---

## Critical Findings From The Audit (Updated 2026-06-19)

After a deeper search and user clarification, **several original findings were corrected**:

### Things I got wrong the first time:
1. **Company Intelligence is NOT 0% built** — there are **53 intelligence-related directories** across companies. REZ alone has 11 atlas-intelligence sub-services. AssetMind and RisnaEstate have real source. About 5 companies have real intelligence code; ~20 are scaffolds.
2. **SUTAR OS is huge and didn't belong in Division 2** — moved to its own Division 12 (25 services, 7 layers, port 3100-4260).
3. **Micro Intelligence is a strategy pattern**, not a service — embedded per-app AI fallback with circuit breaker.

### Things clarified by the user (2026-06-19):
1. **REZ Atlas is AdBazaar's product** — it uses HOJAI Intelligence internally. So the 11 atlas-intelligence-* services are AdBazaar's domain wrappers, not standalone REZ intelligence.
2. **SUTAR OS is a HOJAI AI standalone product** — consumed by all RTMN OSes. It's NOT a "layer of RTMN" — it's a separate platform that RTMN calls.
3. **Bizora is a HOJAI AI standalone product** (Enterprise AI Workspace) — like SUTAR, it's not a Company Intelligence. Removed from the Company Intelligence list.

### Things corrected in the SUTAR audit (2026-06-19):
1. **6 SUTAR services with real code exist** (not 4 as originally said):
   - RABTUL: REZ-trust-scorer (4180), REZ-negotiation-engine (4191), REZ-economy-os (4251)
   - industry-os/shared: decision-engine (4240), goal-os (4242), agent-economy (4251)
2. **REZ-sla-monitor and REZ-breach-detector are RABTUL cross-cutting services, not SUTAR core** — removed from SUTAR count
3. **Port 4251 conflict** — both REZ-economy-os and agent-economy claim 4251. Need to pick canonical.
4. **None of the 6 SUTAR services are running today** (lsof on all 25 SUTAR ports returns nothing)
5. **19 of 25 SUTAR services still missing** (the original "21 missing" was close — actual is 19 if you count the 6 that exist)

### Things that turned out to be correct:
1. **Division #7 (Training & Model Platform) is the single biggest gap** (~5%).
2. **Division #9 (Industry Solutions) has 56 dirs but most are scaffolds** sharing placeholder port 5010.
3. **Division #4 (Agent Cloud) is the strongest** (~80% — ACN ecosystem).
4. **Vector DB + RAG Platform are the highest-leverage missing pieces** in Division #6.

### Things still unresolved (need user input):
1. **Many SUTAR services overlap with existing /services/** (Twin OS 4142 vs twinos-hub 4705, Memory 4143 vs memory-os 4703, Agent Network 4155 vs acn-network 4801, etc.) — should SUTAR be a *layered abstraction* over RTMN, or a parallel platform?

---

## How To Read These Docs

Each division's `CLAUDE.md` follows the same structure:

```
1. Mission — what this division owns
2. Target State — what the plan says it should be
3. Current State — what's actually built (with file paths + port numbers)
4. What's NOT Built — the gap
5. Gap Score — % of the target that's built today
6. Gap List — ordered by priority
7. Dependencies — what other divisions this depends on / blocks
8. Open Questions — anything that needs user clarification
```

Reading order: 1 → 2 → 3 → 12. Foundation first, SUTAR last. But Division #7 (Training) is the strategic bottleneck and worth reading regardless.

---

*Created: 2026-06-19, updated 2026-06-19 with per-company intelligence audit and SUTAR as separate division*
*Companion to: [../CLAUDE.md](../CLAUDE.md) (brand layer), [../../CLAUDE.md](../../CLAUDE.md) (RTMN root)*