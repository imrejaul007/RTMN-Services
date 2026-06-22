# Personal Intelligence OS — Phase 1 Foundation

**Status:** ✅ Complete (2026-06-22)
**Tagline:** *The architectural bones that make every future Genie feature work.*

---

## What this phase shipped

Five new services + one LLM abstraction layer that turn Genie from a "service router" into a system that can **think, remember, and grow**.

| # | Service | Port | Tests | Lines of Code |
|---|---------|------|-------|---------------|
| 1.1 | `@rtmn/shared/lib/llm` (Anthropic, OpenAI, Google, Ollama) | library | 5 pass | ~800 |
| 1.2 | `@hojai/memory-substrate` | 4791 | 5 pass | ~370 |
| 1.3 | `@hojai/intent-engine` | 4792 | 7 pass | ~290 |
| 1.4 | `@hojai/cold-start-onboarding` | 4793 | 9 pass | ~320 |
| 1.5 | `@hojai/morning-briefing-v2` | 4794 | 9 pass | ~280 |
| 1.6 | runtime/genie wiring (intent engine + 4 new URLs) | 7100 | 19 pass | +200 |
| **Total** | **5 new services + 1 library** | — | **54 tests pass** | **~2,260** |

All 23 Genie specialist services in `products/genie/` remain **untouched**, per the plan.

---

## The architecture, in one diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         USER ASKS A QUESTION                             │
│                       (via do-app, nexha, web, etc.)                    │
└──────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                       runtime/genie (port 7100)                        │
│                                                                          │
│  /api/ask → classifyIntent()                                            │
│              ↓ (LLM-based)                ↓ (keyword fallback)         │
│      ┌─────────────────────┐        ┌──────────────────────┐          │
│      │   intent-engine     │        │  classifyByKeywords  │          │
│      │     (port 4792)     │        │  (preserved for back │          │
│      │                     │        │   compat)            │          │
│      └─────────────────────┘        └──────────────────────┘          │
│              ↓                                                            │
│      executeRouting() → calls the right specialist                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
        ↓                       ↓                       ↓
   ┌──────────┐          ┌──────────┐          ┌──────────────┐
   │ shopping │          │ calendar │          │ 23 specialists│
   │  (4728)  │          │  (4709)  │          │  (all running)│
   └──────────┘          └──────────┘          └──────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│         PARALLEL DATA LAYER (used by all specialists)                  │
│                                                                          │
│   ┌──────────────────────┐    ┌──────────────────────┐                │
│   │  memory-substrate    │    │  cold-start-onboard  │                │
│   │      (port 4791)     │    │       (port 4793)    │                │
│   │                      │    │                      │                │
│   │  GET  /api/context   │    │  12-Q conversation   │                │
│   │  POST /api/memory    │    │  Seeds memory + twin │                │
│   │  PUT  /api/twin      │    │  Generates PI-Score  │                │
│   │  POST /api/relate    │    │                      │                │
│   └──────────────────────┘    └──────────────────────┘                │
│              ↑                                ↑                          │
│              └──────── used by ──────────────┘                          │
│                          │                                               │
│                  ┌──────────────────────┐                                │
│                  │  morning-briefing-v2 │                                │
│                  │      (port 4794)     │                                │
│                  │                      │                                │
│                  │  Composes daily      │                                │
│                  │  briefing from       │                                │
│                  │  5 data sources      │                                │
│                  └──────────────────────┘                                │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│              LLM PROVIDER ABSTRACTION (used by intent + briefing)       │
│                                                                          │
│  shared/lib/llm/                                                         │
│  ├── client.js          (factory + normalized response)                │
│  ├── cost.js            (USD pricing per model)                        │
│  ├── structured.js      (JSON schema → provider-specific dispatch)    │
│  └── providers/                                                       │
│      ├── anthropic.js   (Claude — default)                              │
│      ├── openai.js      (GPT-5)                                        │
│      ├── google.js      (Gemini 3)                                     │
│      └── ollama.js      (local Llama 3.3)                              │
│                                                                          │
│  Switch provider = change LLM_PROVIDER env var. NO code change.        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Service-by-service

### 1.1 LLM Provider Abstraction Layer

**Why:** Lock-in to one LLM vendor is an existential risk. Architecture should treat the LLM as a replaceable component.

**What it does:**
- Factory: `createLLMClient({ provider: 'anthropic' | 'openai' | 'google' | 'ollama' })`
- Normalized response: `{ text, usage, cost, latencyMs, model, provider, finishReason }`
- Cost tracking: per-model USD pricing for Claude 4.5, GPT-5, Gemini 3, Llama 3.3
- Structured output: JSON schema → provider-specific (Anthropic tool_use, OpenAI response_format json_schema strict, Google responseSchema, Ollama format:'json')
- Streaming: all 4 providers support SSE streaming

**How to switch providers:**
```bash
# Default: Anthropic Claude Haiku 4.5
export LLM_PROVIDER=anthropic

# Or: OpenAI GPT-5 mini
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...
export LLM_MODEL=gpt-5-mini

# Or: Google Gemini 3 Flash
export LLM_PROVIDER=google
export GOOGLE_API_KEY=AIza...

# Or: Local Ollama
export LLM_PROVIDER=ollama
export LLM_MODEL=llama-3.3-8b
```

**Tests:** 5/5 pass (exports, factory, cost, API key validation, structured output dispatch).

---

### 1.2 Memory Substrate API (port 4791)

**Why:** Right now every Genie specialist calls MemoryOS, TwinOS, Bridge, and Confidence separately. That's 4 round-trips, 4 different auth models, 4 different freshness guarantees. The substrate unifies them.

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/context/:userId?query=...&limit=20` | Compose LLM context window (fans to Context Engine 4790) |
| POST | `/api/memory` | Atomic multi-store write (MemoryOS + Bridge) |
| GET | `/api/memory/:userId/search?q=...` | Search with confidence scoring |
| GET | `/api/twin/:userId` | Get the user's Personal Twin |
| PUT | `/api/twin/:userId/preferences` | Update preferences (also writes as memory) |
| POST | `/api/relate` | Create a relationship link |
| GET | `/api/relationships/:userId` | Get all known relationships |
| GET | `/api/health-summary/:userId` | For Reflection / Intelligence Score |

**Audit log:** every read/write is logged via PersistentMap. Caller identity, action, payload, timestamp.

**Graceful degradation:** if Memory Context Engine is down, the substrate reads MemoryOS + TwinOS directly. Callers always get a response.

**Tests:** 5/5 pass (health, ready, auth, validation, health-summary route).

---

### 1.3 Intent Engine (port 4792)

**Why:** The current `/api/ask` in runtime/genie uses `lower.includes('buy') || lower.includes('shop') || lower.includes('order')` to detect shopping intent. That's a 2020-era keyword router. We need an LLM that reads the question, the recent conversation, and the user's memories — then picks the right specialist.

**The big idea:** A central registry of 10 specialists. Adding a new specialist = one config row, not new code branches.

**Specialist Registry (10):**

```javascript
const SPECIALIST_REGISTRY = [
  { id: 'genie-shopping-agent', intents: ['shop', 'buy', 'compare_prices', ...] },
  { id: 'genie-calendar-service', intents: ['calendar', 'schedule', 'meeting', ...] },
  { id: 'genie-money-os', intents: ['budget', 'spend', 'finance', ...] },
  { id: 'genie-wellness-os', intents: ['wellness', 'health', 'sleep', ...] },
  { id: 'genie-relationship-os', intents: ['contact', 'birthday', 'reach_out', ...] },
  { id: 'genie-learning-os', intents: ['learn', 'study', 'practice', ...] },
  { id: 'genie-briefing-service', intents: ['briefing', 'summary', 'today', ...] },
  { id: 'genie-life-gps', intents: ['direction', 'goal', 'purpose', ...] },
  { id: 'memory-substrate', intents: ['remember', 'forget', 'recall', ...] },
  { id: 'genie-conversation', intents: ['chat', 'talk', 'reflect', ...] },
];
```

**The LLM prompt** (concise version):
> You are the intent router. Pick the SINGLE best specialist. If unsure (confidence < 0.6), pick "genie-conversation". Always provide a one-sentence reasoning. Return JSON.

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/intent/extract` | Extract intent from a message (no routing) |
| POST | `/api/intent/route` | Extract + return full routing plan (URL, endpoint, method) |
| GET | `/api/intent/specialists` | List the 10 known specialists |

**Fallback:** if the LLM is unavailable, the engine returns `targetSpecialist: 'genie-conversation', confidence: 0, fallback: true`. The caller then has the option to use the keyword router (preserved in runtime/genie).

**Tests:** 7/7 pass (health, ready, specialists list, auth, intent extract w/ fallback, full routing plan, validation).

---

### 1.4 Cold-Start Onboarding (port 4793)

**Why:** A Genie that knows NOTHING about you is a search box. A Genie that knows "your wife's birthday is March 14, you're trying to run a 5K by June, and you hate meetings" is a partner. Most AI products skip this and pay for it forever in low engagement.

**The 12 questions** (psychologically ordered):

1. Name? *(identity)*
2. What do you do? *(work)*
3. Where are you live? *(location)*
4. Family? *(relationships)*
5. 2-3 things you care about? *(values)*
6. 90-day goal? *(goals)*
7. What drains your energy? *(wellness)*
8. What gives you energy? *(wellness)*
9. How should Genie talk? *(style)*
10. What should Genie NEVER bring up? *(boundaries)*
11. Anything to remind you about? *(commitments)*
12. Anything else? *(open)*

**The flow:**

```
POST /api/onboarding/start
  → returns { sessionId, currentQuestion: Q1 }
POST /api/onboarding/answer  × 12
  → each call returns the next question + extracted facts
POST /api/onboarding/complete
  → bulk-writes to memory-substrate
  → generates Personal Intelligence Score v0
  → returns "you're all set" payload
```

**Personal Intelligence Score v0** (the structure that the Reflection Engine will fill in):
```json
{
  "overall": 0,
  "components": {
    "memory": 0, "context": 0, "learning": 0,
    "relationships": 0, "goals": 0, "wellness": 0, "reflection": 0
  },
  "note": "This is your starting point. The score grows as you use Genie."
}
```

**Tests:** 9/9 pass (health, ready, list, start, all 12 answers, session state, complete, auth, invalid session).

---

### 1.5 Morning Briefing v2 (port 4794)

**Why:** A daily engagement hook. If a user opens the app once a day and sees something personal, useful, and warm, retention is solved. The existing genie-briefing-service is a static specialist with hard-coded sections — we needed an LLM-composed one.

**The flow:**
1. Cron job hits `POST /api/briefing/morning` at 7am user-local
2. Service fans out to: calendar, relationships, wellness, memory-substrate, goals — **in parallel**
3. Builds structured sections (each marked `available: true/false`)
4. LLM composes a 2-3 sentence personal note
5. Saves to history, returns composed message

**Graceful degradation:** every downstream call has a 3s timeout and never throws. If calendar is down, the user still gets "you have N active goals" — just without the calendar line.

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/briefing/morning` | Generate today's briefing |
| POST | `/api/briefing/morning/expand` | Expand a section on demand |
| GET | `/api/briefing/history/:userId` | Last 7 days |

**Tests:** 9/9 pass (health, ready, briefing w/ all downstreams down, history, expand, expand w/ no briefing, auth, validation, structure).

---

### 1.6 Runtime Wiring

**What changed in `runtime/genie/src/index.js`:**

1. **5 new env vars** with sensible defaults (port 4791-4794, opt-out flag):
```javascript
const INTENT_ENGINE_URL = process.env.INTENT_ENGINE_URL || 'http://localhost:4792';
const MEMORY_SUBSTRATE_URL = process.env.MEMORY_SUBSTRATE_URL || 'http://localhost:4791';
const MORNING_BRIEFING_V2_URL = process.env.MORNING_BRIEFING_V2_URL || 'http://localhost:4794';
const COLD_START_ONBOARDING_URL = process.env.COLD_START_ONBOARDING_URL || 'http://localhost:4793';
const USE_INTENT_ENGINE = process.env.USE_INTENT_ENGINE !== 'false';
```

2. **3 new helper functions:**
- `classifyIntent()` — calls the new LLM engine, returns routing plan or null
- `classifyByKeywords()` — preserved verbatim for backward compat
- `executeRouting()` — dispatches the routing plan to the right specialist URL

3. **`/api/ask` now:** try intent engine first, fall back to keyword routing, then to genie-gateway. The response payload now includes `intent_engine_used: true/false` and `intent: { primaryIntent, confidence, reasoning }` so we can observe the routing in production.

4. **New endpoint `/api/pios/health`** — reports the health of all 4 new Phase 1 services + the intent engine toggle state.

**Opt-out:** set `USE_INTENT_ENGINE=false` and the runtime behaves exactly as before.

**Tests:** 19/19 pass (env vars, helpers, endpoint, payload fields, opt-out flag, all 23 specialists still referenced).

---

## What we deliberately did NOT do

- ❌ **No new specialists** — all 23 existing Genie services are untouched. The intent engine delegates to them, doesn't replace them.
- ❌ **No schema migrations** — the substrate calls existing MemoryOS + TwinOS APIs as-is.
- ❌ **No breaking changes** — `USE_INTENT_ENGINE=false` restores the old behavior. The keyword router is preserved in code.
- ❌ **No infrastructure changes** — all 4 new services are lightweight Node/Express, no DB required (use in-memory maps + PersistentMap for audit/history).
- ❌ **No new LLM vendor lock-in** — the abstraction layer means we can switch from Claude to GPT-5 to local Llama with one env var.

---

## How to run the new services

```bash
# Start the 4 new services (each in its own terminal or via PM2)
cd companies/HOJAI-AI
node platform/memory/memory-substrate/src/index.js &        # 4791
node platform/intelligence/intent-engine/src/index.js &     # 4792
node platform/onboarding/cold-start-onboarding/src/index.js & # 4793
node platform/intelligence/morning-briefing-v2/src/index.js &  # 4794

# Start runtime/genie with intent engine enabled (default)
node products/genie/genie-os/runtime/genie/src/index.js
# → logs: "intent-engine enabled (USE_INTENT_ENGINE=true)"

# Or disable it for A/B comparison
USE_INTENT_ENGINE=false node products/genie/genie-os/runtime/genie/src/index.js

# Health check for the new layer
curl localhost:7100/api/pios/health
```

---

## Test results

```
=== LLM tests ===                    5/5 pass
=== memory-substrate ===             5/5 pass
=== intent-engine ===                7/7 pass
=== cold-start-onboarding ===        9/9 pass
=== morning-briefing-v2 ===          9/9 pass
=== runtime/genie wiring ===        19/19 pass
                                    ─────────
                            TOTAL: 54/54 pass
```

---

## What's next (Phase 2)

Phase 2 (Month 2) is the **Reasoning Layer** + **Reflection Engine**:

- **Reasoning Layer** — multi-step planning, not single-shot LLM calls. The LLM decomposes a complex request into steps, picks a tool for each, executes, and re-plans.
- **Reflection Engine** — weekly insights generated from memory-substrate activity. "This week you had 12 conversations, 3 were about money, your mood score went up 8% — what changed?"
- **Proactive Intelligence** — opt-in notifications when the system spots something worth surfacing. "You haven't called your mom in 23 days."

See `PHASE-2-REASONING-AND-REFLECTION.md` (coming June 2026).

---

*Last updated: 2026-06-22*
*Authored as part of the Personal Intelligence OS roadmap*
