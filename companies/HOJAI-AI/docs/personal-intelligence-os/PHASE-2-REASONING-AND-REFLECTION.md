# Personal Intelligence OS — Phase 2: Reasoning + Reflection

**Status:** ✅ Shipped (2026-06-22)
**Tagline:** *Genie stops answering questions and starts actually helping.*

---

## What this phase shipped

3 new services + 1 tool library + runtime/genie upgrades that turn Genie from "answers questions" into "solves problems":

| # | Component | Port | Tests | LOC |
|---|-----------|------|-------|-----|
| 2.1 | `lib/tool-registry.js` | library | (covered by 2.2 tests) | ~280 |
| 2.2 | `@hojai/reasoning-engine` | 4795 | 10/10 pass | ~530 |
| 2.3 | `@hojai/reflection-engine` | 4796 | 10/10 pass | ~250 |
| 2.4 | `@hokai/proactive-engine` + `lib/detectors.js` | 4797 | 12/12 pass | ~430 |
| 2.5 | runtime/genie 3-tier routing | 7100 | 15+33=48/48 pass | +90 |
| **Total** | **3 new services + 1 lib** | — | **80 tests pass** | **~1,580** |

All 23 Genie specialists in `products/genie/` are still untouched.

---

## The 3-tier routing decision (Phase 2.5)

When a user asks something, runtime/genie now decides:

```
/api/ask → isComplexRequest(question)?
              ↓ yes                    ↓ no
     ┌──────────────────┐    ┌──────────────────┐
     │ Reasoning Engine │    │  Intent Engine   │
     │   (port 4795)    │    │   (port 4792)    │
     │                  │    │                  │
     │ plan → execute → │    │ LLM-based intent │    ┌──────────────┐
     │ replan → synth   │    │ + specialist     │ →  │ keyword      │
     │                  │    │ dispatch         │    │ fallback     │
     └──────────────────┘    └──────────────────┘    └──────────────┘
```

The `isComplexRequest()` heuristic:
- 7 explicit patterns (trip planning, multi-step finance, "burned out", etc.)
- Fallback heuristic: 2+ clauses AND 2+ action verbs in the same question
- Conservative — better to skip reasoning than to misroute a simple question

If the Reasoning Engine is offline, the request falls through to the Intent Engine (Phase 1). If the Intent Engine is offline, it falls through to the keyword router (preserved). All 3 paths are opt-out via env flags.

---

## Service-by-service

### 2.1 Tool Registry (`platform/intelligence/reasoning-engine/lib/tool-registry.js`)

**Why:** The Reasoning Engine needs a uniform catalog of "things it can do." Without this, every LLM call would have to hardcode URLs, methods, and arg schemas.

**What it does:**
- 27 tools across 8 categories (commerce, calendar, people, wellness, goals, knowledge, ambient, system)
- Each tool: `{ name, category, description, service, method, path, args, costTier, latencyTier }`
- Adding a new tool = add one row, restart the engine. No new code branches.
- `toolsForPrompt({ categories })` returns a compact LLM-readable string

**Tool count by category:**
| Category | Count | Examples |
|----------|-------|----------|
| commerce | 3 | shop_product, get_budget_snapshot, add_expense |
| calendar | 4 | get_today_calendar, create_event, find_free_time |
| people | 2 | get_relationships_due, log_relationship_interaction |
| wellness | 2 | get_wellness_today, log_wellness |
| goals | 4 | get_active_goals, update_goal_progress, get_learning_queue |
| knowledge | 6 | remember_fact, search_memories, get_user_context, serendipity_resurface |
| ambient | 4 | generate_morning_briefing, generate_weekly_reflection, send_proactive_notification |
| system | 2 | classify_intent, ask_genie_conversation |

---

### 2.2 Reasoning Engine (port 4795)

**Why:** Real users ask complex things. "Plan me a Tokyo trip under $3K, focused on food, add to calendar." That needs 5+ tool calls, dependency ordering, re-planning on failure, and synthesis. The intent engine routes single intents. Reasoning solves problems.

**The loop (Plan → Execute → Replan → Synthesize):**

```
POST /api/reason { question, userId, userContext, conversationHistory }

1. PLAN  — LLM reads question + tool catalog, returns:
   { steps: [{ id, tool, args, dependsOn, reasoning }] }

2. EXECUTE — run steps in dependency order, parallel where possible
   - Batch: all steps with no remaining dependencies run together
   - Timeout: 30s wall clock, 5s per HTTP call
   - 7 step max per plan (configurable)

3. REPLAN (if any step failed) — LLM gets partial results + errors, returns:
   { shouldReplan, newSteps, reasoning }
   - Only fires if there are errors AND room for more steps
   - Can disable further replanning with a single tool failure

4. SYNTHESIZE — LLM gets question + plan + all results, returns final answer
   - Special-cased: single-tool results get a structured formatter (no LLM call)
   - Falls back to structured dump if LLM is unavailable
```

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/reason` | Full plan + execute + synthesize |
| POST | `/api/reason/plan` | Plan only (debugging) |
| POST | `/api/reason/execute` | Execute a pre-made plan (testing) |
| GET | `/api/reason/tools` | List tool catalog |
| GET | `/api/reason/stats` | Usage stats (avg elapsed, success rate, replan rate) |
| GET | `/health` | Health |

**Tests:** 10/10 pass — health, ready, tool catalog (27 tools), plan only, execute (all-down failure), parallel execution (< 3s for 3 independent steps), main reason endpoint, stats, auth, validation.

**Response shape:**
```json
{
  "requestId": "rsn_...",
  "answer": "I created the event, moved the money, and added it to your calendar.",
  "plan": {
    "reasoning": "User wants to schedule + pay + see what's left",
    "steps": [
      { "id": "s1", "tool": "create_event", "succeeded": true, "reasoning": "..." },
      { "id": "s2", "tool": "add_expense", "succeeded": true, "reasoning": "..." }
    ]
  },
  "replanned": false,
  "results": { "s1": { "tool": "create_event", "data_summary": "..." } },
  "errors": {},
  "elapsed_ms": 4250
}
```

---

### 2.3 Reflection Engine (port 4796)

**Why:** Day-to-day, the user is too close to see patterns. A weekly digest is the difference between "Genie is a tool I use" and "Genie is helping me be a better version of myself."

**The flow:**
1. Pull last 7 days of activity from memory-substrate (memories count, relationships, intent distribution)
2. Get a sample of recent facts (max 20)
3. Ask the LLM to generate:
   - `summary` (1-2 sentences, warm)
   - `insights[]` (3-5, each tied to a category + evidence)
   - `questions[]` (2-3 open reflective questions)
   - `nextWeekFocus` (1-2 words, e.g. "Relationships", "Recovery")
4. Save to PersistentMap, expose via history endpoint

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/reflection/weekly` | Generate this week's reflection |
| GET | `/api/reflection/:userId` | Get latest (within 14 days) |
| GET | `/api/reflection/:userId/history` | Last 12 weeks |
| POST | `/api/reflection/insight` | Log feedback (useful / obvious / wrong / loved) |

**Insight categories:** patterns, wins, struggles, relationships, goals, wellness, time, money.

**LLM fallback:** if the LLM is unavailable, the engine returns a templated reflection ("You had N new memories this week. That's a solid habit forming.") so the user always gets something.

**Tests:** 10/10 pass — health, ready, weekly generation (LLM fallback path), get latest, history, feedback logging, invalid feedback, auth, missing userId, 404 for unknown user.

---

### 2.4 Proactive Engine (port 4797)

**Why:** Genie should be there BEFORE you ask. But never annoying. The Proactive Engine enforces that balance.

**Core principles:**
- **Default OFF** — user has to explicitly enable
- **Per-category opt-in** — 5 categories: time, anomaly, opportunity, milestone, birthday
- **Quiet hours** — no notifications 10pm-7am (configurable), unless urgency is 5
- **Daily cap** — max 3 notifications/day (configurable)
- **Audit log** — every delivery is logged with feedback
- **Mute = disable category** — saying "mute this" disables that category in the user's prefs

**4 detector families (`lib/detectors.js`):**

| Family | Examples |
|--------|----------|
| **Time-based** | "You haven't called mom in 23 days", "You said you'd call mom every Sunday — it's been 9 days" |
| **Anomaly** | "You spent 180% of your usual this week", "Your sleep averaged 5.2h, 1.8h below your baseline" |
| **Opportunity** | "You have 4 free hours tomorrow — want to work on 'Ship PIO v1'?", "You have 3 reviews in your learning queue" |
| **Milestone** | "5 days until your 5K goal — you're at 80%", "Sarah's birthday is in 3 days" |

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/proactive/prefs` | Get user preferences |
| PUT | `/api/proactive/prefs` | Update preferences (enable, categories, quiet hours, daily cap) |
| POST | `/api/proactive/check` | Run all detectors, return filtered + capped candidates |
| POST | `/api/proactive/send` | Record a delivery |
| POST | `/api/proactive/feedback` | Log user feedback (useful / mute / wrong / loved) |
| GET | `/api/proactive/log/:userId` | Delivery log (last N days) |

**Flow:**
```
cron or app wakes up
    ↓
POST /api/proactive/check { userId, userData: { relationships, calendar, ... } }
    ↓
1. detect all candidates (no LLM, pure functions in lib/detectors.js)
2. filter by user prefs (enabled, categories, quiet hours, max urgency)
3. apply daily cap
4. personalize via LLM (using user's communication_style from onboarding)
    ↓
client picks which to actually push
    ↓
POST /api/proactive/send { userId, candidateId, candidate }
    ↓
user taps "mute"
    ↓
POST /api/proactive/feedback { deliveryId, feedback: "mute" }
    ↓
(category automatically disabled in user prefs)
```

**Tests:** 12/12 pass — health, default prefs (disabled), check returns 0 when disabled, enable, overdue-relationship detection, spending anomaly, free-time opportunity, delivery recording, mute disables category, log retrieval, daily cap enforcement, auth.

---

### 2.5 Runtime/genie wiring

**What changed in `runtime/genie/src/index.js`:**

1. **3 new env vars + 1 opt-out flag:**
```javascript
const REASONING_ENGINE_URL = process.env.REASONING_ENGINE_URL || 'http://localhost:4795';
const REFLECTION_ENGINE_URL = process.env.REFLECTION_ENGINE_URL || 'http://localhost:4796';
const PROACTIVE_ENGINE_URL = process.env.PROACTIVE_ENGINE_URL || 'http://localhost:4797';
const USE_REASONING_ENGINE = process.env.USE_REASONING_ENGINE !== 'false';
```

2. **`isComplexRequest()` heuristic** — 7 explicit patterns + a multi-clause + multi-verb fallback. Conservative: false negatives are better than false positives (a simple question routed to reasoning wastes 5-10s).

3. **`/api/ask` now does 3-tier routing:**
- If `isComplexRequest()` matches AND reasoning engine is enabled → call `/api/reason`, return the synthesized answer
- Otherwise → existing Intent Engine path
- Otherwise → existing keyword router

4. **Response payload updated:**
```json
{
  "answer": "...",
  "reasoning_engine_used": true,
  "intent_engine_used": false,
  "steps_planned": 3,
  "steps_succeeded": 3,
  ...
}
```

5. **`/api/pios/health` updated** to include the 3 new Phase 2 services + the `reasoning_engine_enabled` flag.

6. **Opt-out:** `USE_REASONING_ENGINE=false` restores Phase 1.6 behavior (intent engine only).

**Tests:**
- `complex-request.test.cjs`: 15 tests (7 complex + 8 simple cases)
- `pios-integration.test.cjs`: 33 tests (19 Phase 1 + 14 Phase 2.5)

---

## The user experience, before and after

### Before Phase 2

User: *"I just got paid. Move $500 to savings, pay the Visa bill, and tell me what's left."*

Genie: `lower.includes('paid')` → no match → fallback to genie-gateway. Gateway tries to find a specialist that handles "paid" → none. Returns generic "I don't know how to help with that."

### After Phase 2

User: *"I just got paid. Move $500 to savings, pay the Visa bill, and tell me what's left."*

1. `isComplexRequest()` matches the "I just got paid" pattern → Reasoning Engine
2. Plan: `[get_budget_snapshot, get_active_goals]` (parallel) → `[add_expense($500 to savings), add_expense(Visa bill amount)]` (parallel) → `[get_budget_snapshot]` (verify)
3. Execute all in dependency order
4. Synthesize: "Done. Moved $500 to savings, paid your Visa bill of $1,240. You have $3,180 left for the month. You're on track for your $4K savings goal — keep it up."

---

## How to run the new services

```bash
cd companies/HOJAI-AI
node platform/intelligence/reasoning-engine/src/index.js &      # 4795
node platform/intelligence/reflection-engine/src/index.js &     # 4796
node platform/intelligence/proactive-engine/src/index.js &      # 4797

# Start runtime/genie with all engines enabled (default)
node products/genie/genie-os/runtime/genie/src/index.js

# Or disable reasoning (Phase 1.6 behavior)
USE_REASONING_ENGINE=false node products/genie/genie-os/runtime/genie/src/index.js

# Health check
curl localhost:7100/api/pios/health
```

---

## Test results

```
=== Reasoning Engine ===          10/10 pass
=== Reflection Engine ===         10/10 pass
=== Proactive Engine ===          12/12 pass
=== complex-request.test.cjs ===  15/15 pass
=== pios-integration.test.cjs === 33/33 pass
                                  ─────────
                            TOTAL: 80/80 pass
```

Plus: 27 tools registered, 5 detector families, 4 insight categories, 5 proactive categories.

---

## What we deliberately did NOT do

- ❌ **No new specialists** — all 23 existing Genie services untouched
- ❌ **No new databases** — all 3 services use PersistentMap (in-memory + disk) for stats/history/prefs
- ❌ **No breaking changes** — `USE_REASONING_ENGINE=false` and `USE_INTENT_ENGINE=false` both restore prior behavior
- ❌ **No automatic scheduling** — the cron that triggers weekly reflection is the user's responsibility (we ship the service, not the cron job — that's a deploy decision)
- ❌ **No LLM lock-in** — the reasoning engine uses the shared `@rtmn/shared/lib/llm` abstraction; switch providers via env

---

## What's next (Phase 3)

Phase 3 (Month 3) is the **Personal Intelligence Score** + **Relationship Graph**:

- **PI Score dashboard** — visible proof that Genie is getting smarter. 7 sub-scores, 6 levels (Newborn → Soulmate).
- **Relationship Graph** — model the user's relationships with strength, last-contact, context, mentions
- **Learning OS v2** — actual spaced-repetition, surfacing things the user is about to forget
- **Genie widget** — the "what Genie knows about you" card on mobile/web

See [PHASE-3-PERSONAL-INTELLIGENCE-SCORE.md](PHASE-3-PERSONAL-INTELLIGENCE-SCORE.md).

---

*Last updated: 2026-06-22 (Phase 2 shipped)*
