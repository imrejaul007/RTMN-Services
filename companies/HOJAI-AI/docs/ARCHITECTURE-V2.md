# HOJAI AI — Architecture v2

> **Date:** June 20, 2026
> **Status:** ✅ Implemented and smoke-tested (36/36 tests pass)
> **Authored by:** HOJAI AI architecture team

This document captures the architectural upgrade that took HOJAI AI from "lots of useful services" to a **coherent orchestration platform** with five non-negotiable design principles.

---

## Why we changed

In the v1 architecture, every consumer (Genie, CoPilot, SUTAR, industry products, agents) had to wire calls to TwinOS, MemoryOS, SkillOS, PolicyOS, and Intelligence on its own. That produced:

- **Duplicated glue** — the same "resolve twin → read memory → call AI → write memory" pattern rewritten in 5+ places
- **Inconsistent memory ownership** — MemoryOS had a flat key-value store; nothing tied memory to a specific twin's lifecycle
- **No common reasoning layer** — each consumer picked its own (or no) chain-of-thought / ReAct strategy
- **No standard plan semantics** — retries, timeouts, audit, and policy gates were re-implemented differently per consumer

The fix is **Architecture v2**: 5 principles, 8 new services, and a single orchestration layer that everyone goes through.

---

## The 5 Principles

| # | Principle | What it means in code |
|---|-----------|------------------------|
| **1** | **MemoryOS is consumed BY Intelligence** | `ai-intelligence` (4881) reads/writes through `MemoryOS` (4703). The reverse — MemoryOS trying to invoke AI — is forbidden. MemoryOS stores, Intelligence decides. |
| **2** | **Everything has a Twin** | 24+ twin services cover every entity: customer, order, wallet, employee, lead, deal, product, asset, payment, property, area, buyer, industry, inventory, merchant, organization, partner, referral, user, voice, plus `twinos-hub` and `twinos-shared`. If a thing is interesting, it has a twin. |
| **3** | **Each Twin owns its own Memory** | The new `twin-memory-bridge` (4704) binds a twin ID to memory partitions of 5 kinds: episodic, semantic, procedural, working, long-term. Memory lifecycle = twin lifecycle. |
| **4** | **Intelligence consumes Twin + Memory + Skills** | `ai-intelligence` (4881) advertises and routes to TwinOS (4705), MemoryOS (4703), SkillOS (4743). The new `twin-memory-bridge` (4704) is the canonical way to access twin-scoped memory from intelligence. |
| **5** | **FlowOS is the orchestrator** | `flow-orchestrator` (4244) is the single entry point for Genie, CoPilot, SUTAR, products, and agents. Plans + templates + step library + audit. Consumers do NOT call TwinOS/MemoryOS/Intelligence/SkillOS/PolicyOS directly — they hand an intent to FlowOS. |

---

## The architecture (who calls whom)

```
Consumers (Genie, CoPilot, SUTAR, products, agents)
                  │
                  ▼
         ┌────────────────────┐
         │  unified-os-hub    │   HTTP gateway — /api/{prefix}/...  (port 4399)
         │   (4399)           │
         └────────────────────┘
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
 ┌─────────────┐      ┌──────────────┐
 │ ai-         │      │ flow-        │   Plan-based orchestrator (4244)
 │ intelligence│      │ orchestrator │
 │ (4881)      │      │              │   ──► TwinOS (4705)
 │             │      │              │   ──► MemoryOS (4703)
 │ AI routing  │      │              │   ──► SkillOS (4743)
 │ brain       │      │              │   ──► PolicyOS (4254)
 │             │      │              │   ──► Intelligence (4881)
 └─────────────┘      └──────────────┘
       │                     │
       │            ┌────────┴────────┐
       │            ▼                 ▼
       │     ┌──────────┐    ┌──────────────┐
       │     │ twin-    │    │ reasoning-   │  CoT/ReAct/ToT
       │     │ memory-  │    │ runtime      │  (4253)
       │     │ bridge   │    └──────────────┘
       │     │ (4704)   │
       │     └──────────┘
       │            │
       ▼            ▼
  ┌────────────────────────────┐
  │  Foundation                │
  │  TwinOS (4705)             │
  │  MemoryOS (4703)           │
  │  SkillOS (4743)            │
  │  PolicyOS (4254)           │
  │  + 24 twin services        │
  │  + Genie voice services    │
  │  + REZ/AdBazaar services   │
  └────────────────────────────┘
```

**Key flow:** A consumer (e.g. Genie) hits the Hub with `/api/flow/...`. The Hub forwards to `flow-orchestrator`. Flow Orchestrator runs a plan: `twin.resolve → memory.read → intelligence.call → policy.check → skill.execute → memory.write`. Each step actually calls its foundation service with a 1.5s timeout and degrades gracefully if the foundation is down. The full trace (timing, inputs, outputs, source) is recorded for audit.

---

## The 8 new services (Architecture v2 additions)

| Service | Port | Role | What it adds |
|---------|------|------|--------------|
| **flow-orchestrator** | 4244 | Orchestration | Plans, executions, templates, step library, audit |
| **reasoning-runtime** | 4253 | Reasoning | Chain-of-Thought, ReAct, Tree-of-Thought with auditable traces |
| **twin-memory-bridge** | 4704 | Twin-Memory binding | "Each twin owns its memory" — 5 kinds, partition resolution, audit |
| **connector-hub** | 4785 | Integrations | 8 SaaS connectors (Salesforce, HubSpot, Stripe, Shopify, Slack, Notion, Google Sheets, Twilio) with uniform adapter contract |
| **sandbox** | 4100 | Dev platform | Free isolated test environment with API key, namespace scoping, TTL, reset |
| **webhook-bus** | 4110 | Dev platform | Event subscriptions, exponential-backoff delivery, per-delivery audit |
| **skill-marketplace** | 4120 | Marketplace | Buy/sell skills separately from agents — featured, trending, reviews |
| **prompt-marketplace** | 4130 | Marketplace | Buy/sell prompt templates — versioned, tagged, reviewed, renderable |

All 8 are wired into:
- `unified-os-hub` (4399) — Hub routes: `/api/flow/...`, `/api/reasoning/...`, `/api/twin-memory/...`, `/api/connectors/...`, `/api/sandbox/...`, `/api/webhooks/...`, `/api/skills-market/...`, `/api/prompts-market/...`
- `ai-intelligence` (4881) — `/api/route` advertises them as services; `/api/agents` exposes 8 new agents (29 → **37 total**)

---

## What Flow Orchestrator ships with

### Step library (8 step types)
| Step | What it does | Foundation call |
|------|--------------|-----------------|
| `twin.resolve` | Resolve a twin for an entity | `GET {twinOS}/api/twins/:id` |
| `memory.read` | Read twin's memory (kind-scoped) | `GET {twin-memory-bridge}/api/twins/:id/memory?kind=...` (preferred) or `{memoryOS}/api/memories/timeline/:id` (fallback) |
| `memory.write` | Write a record into a twin's memory | `POST {twin-memory-bridge}/api/twins/:id/memory/record` |
| `intelligence.call` | Invoke AI brain (analyze/answer/decide/simulate/recommend/negotiate/chat) | `POST {intelligence}/api/intelligence/:task` |
| `policy.check` | Gate an action through a policy | `POST {policyOS}/api/policies/evaluate` |
| `skill.execute` | Run a skill from SkillOS | `POST {skillos}/api/skills/:id/execute` |
| `hook.pre` | User-defined pre-step extension | local |
| `hook.post` | User-defined post-step extension | local |

Every step has a 1.5s timeout. If a foundation is unreachable, the step records a `fallback` source with the error and the plan continues or fails according to its own policy (currently fail-open in dev).

### Templates (5 pre-built plans)

| Template | Steps | Use case |
|----------|-------|----------|
| `answer-question` | `twin.resolve → memory.read(semantic) → intelligence.call(answer) → memory.write(experience)` | Q&A with memory |
| `decide-and-act` | `twin.resolve → memory.read(working) → policy.check → intelligence.call(decide) → skill.execute → memory.write(procedural)` | Action with policy gate |
| `simulate-then-recommend` | `twin.resolve → memory.read(long-term) → intelligence.call(simulate) → intelligence.call(recommend) → memory.write(semantic)` | What-if analysis |
| `negotiate-and-execute` | `twin.resolve → memory.read(episodic) → policy.check → intelligence.call(negotiate) → skill.execute → memory.write(procedural)` | Multi-party negotiation |
| `personal-assistant` (genie) | `twin.resolve → memory.read(semantic) → intelligence.call(chat) → memory.write(episodic)` | Genie personal flow |

### Sync execution

```bash
POST /api/executions/sync
{
  "templateName": "answer-question",
  "twinId": "cust_123",
  "context": { "question": "What's my order status?" },
  "timeoutMs": 8000
}

# Response:
{
  "id": "...",
  "status": "completed",
  "planName": "answer-question",
  "trace": [
    { "index": 0, "type": "twin.resolve",       "result": { "source": "twinos" } },
    { "index": 1, "type": "memory.read",       "result": { "source": "twin-memory-bridge", "count": 3 } },
    { "index": 2, "type": "intelligence.call", "result": { "source": "ai-intelligence" } },
    { "index": 3, "type": "memory.write",      "result": { "source": "twin-memory-bridge" } }
  ],
  "output": { ... },
  "durationMs": 287
}
```

---

## How the 5 principles map to code

### Principle 1 — MemoryOS is consumed BY Intelligence
- `ai-intelligence` (4881) advertises `memory: 'http://localhost:4703'` in its service map (line 414)
- `flow-orchestrator` reads memory via `twin-memory-bridge` (4704) first, falls back to `memoryOS` (4703) second
- MemoryOS itself does not import or call any AI service

### Principle 2 — Everything has a Twin
24 twin services in `companies/HOJAI-AI/services/`, each owning its entity's lifecycle:
`agent-twin, area-twin, asset-twin, buyer-twin, customer-twin, deal-twin, employee-twin, industry-twin, inventory-twin, lead-twin, merchant-twin, order-twin, organization-twin, partner-twin, payment-twin, product-twin, property-twin, referral-twin, user-twin, voice-twin, wallet-twin, twinos-hub, twinos-shared, twin-memory-bridge`

### Principle 3 — Each Twin owns its own Memory
- `twin-memory-bridge` (4704) implements the binding
- 5 memory kinds: `episodic, semantic, procedural, working, long-term`
- Bind: `POST /api/twins/:id/bind { kind: 'episodic' }` → returns `partitionId`
- Resolve: `GET /api/twins/:id/binding` → returns all partitions for the twin
- Memory: `GET /api/twins/:id/memory?kind=episodic` → returns that kind's records

### Principle 4 — Intelligence consumes Twin + Memory + Skills
- `ai-intelligence` (4881) service map exposes: `twin: 'http://localhost:4705'`, `memory: 'http://localhost:4703'`, `skill: 'http://localhost:4743'`
- `twin-memory-bridge` (4704) wired in as `twinMemoryBridge: 'http://localhost:4704'` for twin-scoped memory
- `ai-intelligence` capabilities: `twinMemoryBind`, `twinMemoryResolve`, `skillMarketplaceList`, `connectorSearch`, etc.
- `reasoning-runtime` (4253) is a sibling that Intelligence can dispatch to for CoT/ReAct/ToT

### Principle 5 — FlowOS is the orchestrator
- `flow-orchestrator` (4244) is wired in `unified-os-hub` (4399) at route `/api/flow/:path(*)`
- 5 templates, 8 step types, audit log, plan CRUD
- `ai-intelligence` exposes `flowOrchestrator` as both a service and an agent with 11 capabilities
- Genie, CoPilot, SUTAR, products, agents → Hub → Flow Orchestrator → Foundation
- Consumers do NOT call TwinOS/MemoryOS/Intelligence/SkillOS/PolicyOS directly

---

## Smoke test (verified end-to-end)

`/tmp/arch-v2-smoke.mjs` exercises every new service through the Hub. **36/36 pass:**

```
── 1. Health ──                    ✅ Hub (4399)  ✅ ai-intelligence (4881)
── 2. Service registry ──          ✅ All 8 new services advertised
── 3. Flow Orchestrator (4244) ──  ✅ 5 templates  ✅ sync execution  ✅ trace
── 4. Twin Memory Bridge (4704) ── ✅ bind  ✅ binding  ✅ memory query
── 5. Reasoning Runtime (4253) ──  ✅ ReAct trace (20 steps)
── 6. Connector Hub (4785) ──      ✅ 8 connectors  ✅ search
── 7. Sandbox (4100) ──            ✅ create  ✅ get
── 8. Webhook Bus (4110) ──        ✅ subscribe  ✅ dispatch
── 9. Skill Marketplace (4120) ──  ✅ 6 categories  ✅ 5 listings
── 10. Prompt Marketplace (4130) ── ✅ 4 prompts  ✅ render substitutes vars
── 11. AI Intelligence (4881) ──   ✅ 37 agents registered
── 12. Route map ──                ✅ All 8 new service URLs advertised
```

---

## Operational notes

### Resilience
- Every Flow Orchestrator step has a 1.5s timeout and degrades to a `fallback` source if the foundation is unreachable
- The Hub (`unified-os-hub`) wraps downstream errors as 502 with a structured payload: `{ success: false, error, service }`
- Connector-hub has 8 seeded adapters; switching to real SaaS APIs requires only the `CONNECTIONS` credentials registry (no secrets stored)

### Security
- All 8 new services use Helmet + CORS + compression (same as v1)
- Rate limiting is delegated to the Hub (default 100/min, configurable per service)
- Sandbox (4100) generates a unique API key shown only at creation time, rotated on reset

### Observability
- Every Flow Orchestrator execution records: id, planId, twinId, status, startedAt, completedAt, durationMs, trace[], output[]
- Webhook Bus records every delivery attempt with status and latency
- Twin-Memory Bridge records every bind/resolve/record with timestamp
- Reasoning Runtime records every step (thought/action/observation/score)

---

## Migration guide for consumers

If you are a consumer (Genie, CoPilot, SUTAR, product, agent) and you used to call:

```js
// v1 — every consumer reimplements this glue
const twin = await fetch(`${twinOS}/api/twins/${id}`);
const mems = await fetch(`${memoryOS}/api/memories/timeline/${id}`);
const ai   = await fetch(`${intelligence}/api/intelligence/answer`, { ... });
const save = await fetch(`${memoryOS}/api/memory/personal/${id}`, { ... });
```

You now do:

```js
// v2 — one call, Flow Orchestrator handles the rest
const result = await fetch(`${hub}/api/flow/api/executions/sync`, {
  method: 'POST',
  body: JSON.stringify({
    templateName: 'answer-question',
    twinId: id,
    context: { question: '...' }
  })
});
```

If you need a custom flow, define a plan once and call `/api/flow/api/executions/sync` with `planId` instead of `templateName`.

---

## What changed in code

| File | Change |
|------|--------|
| `services/flow-orchestrator/src/index.js` | NEW — 4244, real foundation calls with 1.5s timeout, graceful fallback |
| `services/reasoning-runtime/src/index.js` | NEW — 4253, CoT/ReAct/ToT with auditable traces |
| `services/twin-memory-bridge/src/index.js` | NEW — 4704, twin → partition binding, 5 memory kinds |
| `services/connector-hub/src/index.js` | NEW — 4785, 8 SaaS adapters (search route fixed: moved before `/:id` to avoid Express precedence bug) |
| `services/sandbox/src/index.js` | NEW — 4100, free isolated test environment |
| `services/webhook-bus/src/index.js` | NEW — 4110, event subscriptions + backoff |
| `services/skill-marketplace/src/index.js` | NEW — 4120, skill marketplace |
| `services/prompt-marketplace/src/index.js` | NEW — 4130, prompt marketplace |
| `services/ai-intelligence/src/index.ts` | +8 services in `/api/route`, +8 agents (29→37), +8 capabilities |
| `services/unified-os-hub/src/index.js` | +8 SERVICE_MAP entries, +8 registry entries, +8 service URLs |
| All 8 services | `CLAUDE.md` documenting endpoints, wiring, and next steps |
| `companies/HOJAI-AI/CLAUDE.md` | Architecture v2 section added |
| `divisions/README.md` | Architecture v2 section added |
| `divisions/02-infrastructure-cloud/CLAUDE.md` | Updated to reflect v2 |
| `divisions/06-data-knowledge-cloud/CLAUDE.md` | Updated to reflect v2 (Connector Hub) |
| `divisions/10-developer-platform/CLAUDE.md` | Updated to reflect v2 (Sandbox, Webhook Bus) |
| `divisions/11-marketplace-network/CLAUDE.md` | Updated to reflect v2 (Skill, Prompt Marketplaces) |

---

## What's next

- Add WebSocket / SSE streaming to Flow Orchestrator for long-running plans
- Wire `twin-memory-bridge` into the `twinos-hub` registry so any twin can auto-bind to default memory partitions
- Add a `flow-templates` marketplace (templates as published artifacts)
- Replace Connector Hub stubs with real OAuth-based vendor SDKs
- Add OpenTelemetry tracing across all 8 new services → Flow Orchestrator → Foundation

---

*This document is the canonical reference for Architecture v2. Last updated: June 20, 2026.*
