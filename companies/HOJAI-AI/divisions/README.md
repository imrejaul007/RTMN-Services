# HOJAI AI — 11 Strategic Divisions

> **The architecture of HOJAI AI as the AI Infrastructure Company of RTMN.**
> Each division below has its own `CLAUDE.md` with a Current State → Target State gap analysis, list of owning services, port map, and what's missing.

---

## The 11 Divisions

| # | Division | One-line | Current State | Gap |
|---|----------|----------|---------------|-----|
| 1 | [AI Foundation](./01-foundation/) | Identity, auth, gateway, eventing — everything required to run AI | 🟢 ~70% | small |
| 2 | [AI Infrastructure Cloud](./02-infrastructure-cloud/) | MemoryOS, TwinOS, FlowOS, PolicyOS, etc. — the OS primitives | 🟡 ~40% | medium-large |
| 3 | [AI Intelligence Cloud](./03-intelligence-cloud/) | The brain — per-industry/per-company intelligence modules | 🟡 ~30% | large |
| 4 | [AI Agent Cloud](./04-agent-cloud/) | Agent runtime, builder, orchestration, multi-agent systems | 🟢 ~80% | small-medium |
| 5 | [AI Communication Cloud](./05-communication-cloud/) | Voice, phone, WhatsApp, email, SMS, chat, meetings, translation | 🟡 ~60% | medium |
| 6 | [AI Data & Knowledge Cloud](./06-data-knowledge-cloud/) | Knowledge graph, vector DB, RAG, ETL, feature store | 🟡 ~30% | large |
| 7 | [AI Training & Model Platform](./07-training-model-platform/) | Foundation models, fine-tuning, RLHF, model serving, AI safety | 🔴 ~5% | **largest** |
| 8 | [AI Products](./08-products/) | Genie, Razo, Copilots, FounderOS, Bizora, HIB, CXO OS | 🟢 ~70% | medium |
| 9 | [AI Industry Solutions](./09-industry-solutions/) | 26+ Industry OS (Restaurant, Hotel, Retail, Healthcare, etc.) | 🟢 ~95% (breadth) | medium (depth) |
| 10 | [AI Developer Platform](./10-developer-platform/) | APIs, SDKs, CLI, sandbox, webhooks, observability | 🟡 ~40% | medium |
| 11 | [AI Marketplace & Network](./11-marketplace-network/) | Agent/skill/workflow marketplaces, trust, reputation, federation | 🟡 ~30% | medium-large |

**Coverage: ~45% across the platform.** ~55% is net-new build.

---

## Critical Findings From The Audit

These came up in the audit and are worth flagging before reading the per-division docs:

1. **Most "missing" things in the plan actually exist** under different names (e.g. Knowledge Graph is in `services/knowledge-base`, SUTAR OS is in `services/merchant-agents`).
2. **Division #7 (Training & Model Platform) is the single biggest gap.** The entire division is essentially missing — no GPU pipeline, no model serving, no RLHF. This is also the most expensive to build.
3. **Division #3 has 22 intelligence sub-domains listed** but only 5 are real services today. Most are aspirational.
4. **Division #9 (Industry Solutions) has 56 directories** but most are scaffolds. The breadth is there; the depth isn't.
5. **Two of the items in your plan don't exist anywhere**:
   - **"Micro Intelligence"** — searched the whole repo, no code, no docs. Either a placeholder or a name conflict.
   - **"FlowOS / SkillOS / GoalOS / SimulationOS / PolicyOS"** — none of these OS primitives exist. They're in your plan but not in code. Need to be built (or renamed to point at existing services).

---

## How To Read These Docs

Each division's `CLAUDE.md` follows the same structure:

```
1. Mission — what this division owns
2. Target State — what the plan says it should be
3. Current State — what's actually built (with file paths + port numbers)
4. Gap Score — % of the target that's built today
5. Gap List — ordered by priority
6. Dependencies — what other divisions this depends on / blocks
7. Open Questions — anything that needs user clarification
```

Reading order: 1 → 2 → 3 → 11. Foundation first, Marketplace last. But Division #7 (Training) is the strategic bottleneck and worth reading regardless.

---

*Created: 2026-06-19*
*Companion to: [../CLAUDE.md](../CLAUDE.md) (brand layer), [../../CLAUDE.md](../../CLAUDE.md) (RTMN root)*