# HOJAI AI — 11+1 Strategic Divisions

> **The architecture of HOJAI AI as the AI Infrastructure Company of RTMN.**
> Each division below has its own `CLAUDE.md` with a Current State → Target State gap analysis, list of owning services, port map, and what's missing.

> **Architecture v2 (June 20, 2026) — applies across all 12 divisions:**
> 1. **Everything has a Twin** — TwinOS (4705) v3.0 with 70+ canonical twins
> 2. **Each Twin owns its Memory** — Twin Memory Bridge (4704)
> 3. **MemoryOS is consumed BY Intelligence** — not the other way around
> 4. **Intelligence Layer consumes Twin + Memory + Skills** — 37 agents at port 4881
> 5. **Flow Orchestrator (4244) is the orchestration layer** — Genie / CoPilot / SUTAR connect here, NOT directly to TwinOS / MemoryOS / Intelligence / SkillOS / PolicyOS

---

## The 12 Divisions

| # | Division | One-line | Current State | Gap |
|---|----------|----------|---------------|-----|
| 1 | [AI Foundation](./01-foundation/) | Identity, auth, gateway, eventing, observability — everything required to run AI | 🟢 ~95% | small |
| 2 | [AI Infrastructure Cloud](./02-infrastructure-cloud/) | TwinOS, MemoryOS, SkillOS, FlowOS, PolicyOS + **Flow Orchestrator, Twin Memory Bridge, Reasoning Runtime** (Architecture v2) | 🟢 ~92% (post-v2) | small |
| 3 | [AI Intelligence Cloud](./03-intelligence-cloud/) | The brain — per-industry/per-company intelligence modules + Micro Intelligence fallback | 🟢 ~92% breadth / ~65% depth | medium |
| 4 | [AI Agent Cloud](./04-agent-cloud/) | Agent runtime, builder, orchestration, multi-agent systems | 🟢 ~80% | small-medium |
| 5 | [AI Communication Cloud](./05-communication-cloud/) | Voice, phone, WhatsApp, email, SMS, chat, meetings, translation | 🟡 ~60% | medium |
| 6 | [AI Data & Knowledge Cloud](./06-data-knowledge-cloud/) | Vector DB, RAG, KG, ETL, document intelligence, **Connector Hub** | 🟢 ~88% (Connector Hub shipped) | small-medium |
| 7 | [AI Training & Model Platform](./07-training-model-platform/) | Inference, prompts, cache, registry, safety, eval, fine-tuning, synthetic data, GPU | 🟢 ~50% | medium |
| 8 | [AI Products](./08-products/) | Genie, Razo, Copilots, FounderOS, Bizora, HIB, CXO OS — products that compose from Div 1-7 | 🟢 ~70% | medium |
| 9 | [AI Industry Solutions](./09-industry-solutions/) | 26+ Industry OS (Restaurant, Hotel, Retail, Healthcare, etc.) | 🟢 ~95% breadth / ~40% depth | medium (depth) |
| 10 | [AI Developer Platform](./10-developer-platform/) | APIs, SDKs, CLI, sandbox, webhooks, observability — for 3rd-party devs | 🟢 ~70% (post-v2: Sandbox + Webhooks shipped) | medium |
| 11 | [AI Marketplace & Network](./11-marketplace-network/) | Agent/Skill/Prompt marketplaces, trust, reputation, federation | 🟢 ~55% (post-v2: Skill + Prompt Marketplaces shipped) | medium-large |
| 12 | [SUTAR OS](./12-sutar-os/) | Autonomous Economic OS — 25 services across 7 layers for AI to execute all tasks | 🟢 ~76% effective | medium |

**Coverage: ~75-80% across the platform.** ~20-25% is net-new build.

---

## Architecture v2 (June 20, 2026) — What Changed

The audit identified 5 architectural principles that the existing implementation did not fully honor. The v2 work shipped 8 new services + wired them into ai-intelligence (4881) and the RTMN Hub (4399) to make these principles real.

### The 5 Principles

| # | Principle | Before v2 | After v2 |
|---|-----------|-----------|----------|
| 1 | **Everything has a Twin** | TwinOS Hub at v3.0 (70+ twins), but most consumers had their own ad-hoc identity | TwinOS Hub v3.0 + 14 dedicated twin services; every consumer expected to use a Twin |
| 2 | **Each Twin owns its Memory** | Twin → Memory was implicit (passed as twinId in body) | **Twin Memory Bridge (4704)** — bind/resolve/query "what memory does this twin own?" |
| 3 | **MemoryOS is consumed BY Intelligence** | Some intelligence code imported MemoryOS | Documentation enforced; ai-intelligence (4881) routes to MemoryOS via FlowOS or direct, not the reverse |
| 4 | **Intelligence consumes Twin + Memory + Skills** | ai-intelligence routed to Memory but not Twin/Skill/Vector as first-class | ai-intelligence now exposes 37 agents including Twin / Memory / Skill / Vector / RAG / Graph / Knowledge / TwinMemoryBridge |
| 5 | **FlowOS as orchestrator** | Consumers called TwinOS/MemoryOS/SkillOS directly | **Flow Orchestrator (4244)** — plan-based composition; 5 templates, 8 step types; foundation registry overridable |

### The 8 New Services (June 20, 2026)

| Service | Port | Division | Purpose |
|---------|------|----------|---------|
| [flow-orchestrator](../services/flow-orchestrator/) | **4244** | 2 — Infrastructure Cloud | The orchestration layer; 5 templates, 8 step types, execution engine |
| [reasoning-runtime](../services/reasoning-runtime/) | **4253** | 2 — Infrastructure Cloud | CoT / ReAct / ToT reasoning with auditable traces |
| [twin-memory-bridge](../services/twin-memory-bridge/) | **4704** | 2 — Infrastructure Cloud | "Each Twin owns its Memory" — bind/resolve memory partitions per twin |
| [connector-hub](../services/connector-hub/) | **4785** | 6 — Data & Knowledge | 8 SaaS connectors (Salesforce, HubSpot, Stripe, Shopify, Slack, Notion, Sheets, Twilio) |
| [sandbox](../services/sandbox/) | **4100** | 10 — Developer Platform | Free isolated test environment with API key + namespace + TTL |
| [webhook-bus](../services/webhook-bus/) | **4110** | 10 — Developer Platform | Event subscriptions + delivery with exponential backoff |
| [skill-marketplace](../services/skill-marketplace/) | **4120** | 11 — Marketplace | Buy/sell skills separately from agents; featured + trending + reviews |
| [prompt-marketplace](../services/prompt-marketplace/) | **4130** | 11 — Marketplace | Buy/sell prompt templates; versioned + reviewed |

All 8 are wired into:
- **ai-intelligence (4881)** — exposed as 8 new agents (29 → 37 total) with extended route table
- **unified-os-hub (4399)** — routed at `/api/flow/`, `/api/reasoning/`, `/api/twin-memory/`, `/api/connectors/`, `/api/sandbox/`, `/api/webhooks/`, `/api/skills-market/`, `/api/prompts-market/`

### Verified End-to-End

```
Hub (4399) /api/flow/api/templates       → 5 templates returned
Hub (4399) /api/flow/api/executions/sync → 4-step plan executed, status: completed
Hub (4399) /api/twin-memory/api/twins/X/bind → partition created, twin owns memory
Hub (4399) /api/reasoning/api/traces     → ReAct reasoning with 11 steps, conclusion returned
```

---

## Critical Findings From The Audit (Updated 2026-06-20)

After a deeper search and Architecture v2 upgrade, **several original findings were corrected or resolved**:

### Things I got wrong the first time:
1. **Company Intelligence is NOT 0% built** — there are **53 intelligence-related directories** across companies. REZ alone has 11 atlas-intelligence sub-services.
2. **SUTAR OS is huge and didn't belong in Division 2** — moved to its own Division 12.
3. **Micro Intelligence is a strategy pattern**, not a service — embedded per-app AI fallback with circuit breaker.

### Things clarified by the user (2026-06-19):
1. **REZ Atlas is AdBazaar's product** — it uses HOJAI Intelligence internally.
2. **SUTAR OS is a HOJAI AI standalone product** — consumed by all RTMN OSes.
3. **Bizora is a HOJAI AI standalone product** (Enterprise AI Workspace) — like SUTAR.

### Architecture v2 corrections (2026-06-20):
1. **FlowOS existed as multiple impls but no canonical orchestrator** — shipped Flow Orchestrator (4244) as the plan-based orchestrator that consumers go through.
2. **Twin↔Memory link was implicit** — shipped Twin Memory Bridge (4704) to make it explicit and queryable.
3. **Reasoning logic was scattered across agents** — shipped Reasoning Runtime (4253) as a single auditable framework with 3 strategies (CoT/ReAct/ToT).
4. **Division 10 (Developer Platform) was 40%** — shipped Sandbox (4100) + Webhook Bus (4110) → now ~70%.
5. **Division 11 (Marketplace) was 30%** — shipped Skill Marketplace (4120) + Prompt Marketplace (4130) → now ~55%.
6. **Division 6 (Data) was 80%** — shipped Connector Hub (4785) with 8 SaaS connectors → now ~88%.

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

Reading order: 1 → 2 → 12. Foundation first, SUTAR last. But Division #2 (Infrastructure Cloud) is where Architecture v2 lives, so read it next.

---

*Updated: 2026-06-20 — Architecture v2 upgrade (Flow Orchestrator, Twin Memory Bridge, Reasoning Runtime + 5 marketplace/dev services) + every division CLAUDE.md updated for consistency*
*Companion to: [../CLAUDE.md](../CLAUDE.md) (brand layer), [../../CLAUDE.md](../../CLAUDE.md) (RTMN root)*
