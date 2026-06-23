# Personal Intelligence OS (PIOS) — Runtime/Genie Wiring Roadmap

> **Status:** ✅ **Phases 1–15 COMPLETE** (June 23, 2026)
> **Total Specialists Wired:** 23 of 23 (100%)
> **Total Delegation Routes:** ~82
> **Total Test Assertions:** 165 (10 base + 141 voice-razo + 24 e2e-aggregator), 0 failures
> **Last Updated:** 2026-06-23

---

## 🎯 Mission

Wire **every** HOJAI-AI Genie specialist to the central `runtime/genie` service so that:

1. **External clients (do-app, REZ-Workspace, nexha-client, salar-client)** can reach all 23 specialists through a single gateway (`/api/genie-*/...`) without needing to know individual service URLs
2. **`/api/ask` becomes truly intelligent** — every specialist is reachable from natural-language questions
3. **Operators can see the health of all 23 specialists in one place** (`/api/genie-services/health`)
4. **Personal snapshots are one HTTP call away** (`/api/genie/personal/:userId` fans out to all 15+ specialists in parallel)

---

## 📊 Audit (June 22, 2026)

### Specialists Status (23/23)

| # | Specialist | Port | Phase | Routes | Health Entry |
|---|-----------|------|-------|--------|--------------|
| 1 | genie-gateway | 4701 | pre-existing | pre-existing | ✅ |
| 2 | genie-briefing-service | 4712 | pre-existing | pre-existing | ✅ |
| 3 | genie-calendar-service | 4709 | pre-existing | pre-existing | ✅ |
| 4 | genie-money-os | 4724 | pre-existing | pre-existing | ✅ |
| 5 | genie-wellness-os | 4723 | pre-existing | pre-existing | ✅ |
| 6 | genie-shopping-agent | 4728 | pre-existing | pre-existing | ✅ |
| 7 | genie-wake-word-service | 4767 | pre-existing | pre-existing | ✅ |
| 8 | genie-listening-modes | 4768 | pre-existing | pre-existing | ✅ |
| 9 | genie-device-integration | 4769 | pre-existing | pre-existing | ✅ |
| 10 | genie-memory-inbox | 4710 | Phase 8 | 2 | ✅ |
| 11 | genie-universal-search | 4713 | Phase 8 | 1 | ✅ |
| 12 | genie-serendipity-service | 4714 | Phase 8 | 1 | ✅ |
| 13 | genie-memory-graph | 4717 | Phase 8 cont. | 1 | ✅ |
| 14 | genie-relationship-os | 4718 | Phase 8 cont. | 7 | ✅ |
| 15 | genie-learning-os | 4722 | Phase 8 cont. | 6 | ✅ |
| 16 | genie-companion-service | 4716 | **Phase 9** | 3 | ✅ |
| 17 | genie-smart-forgetting-service | 4715 | **Phase 9** | 4 | ✅ |
| 18 | genie-thinking-engine | 4719 | **Phase 9** | 5 | ✅ |
| 19 | genie-life-gps | 4721 | **Phase 9** | 4 | ✅ |
| 20 | genie-execution-engine | 4726 | **Phase 9** | 3 | ✅ |
| 21 | genie-life-university | 4727 | **Phase 9** | 4 | ✅ |
| 22 | genie-creation-os | 4298 | **Phase 9** | 5 | ✅ |
| 23 | genie-consultant-agent | 4739 | **Phase 9** | 3 | ✅ |

### Plus: Voice OS, Voice Twin, RAZO Keyboard, Voice Commerce (3-tier voice + comms platform)

### Plus: 22 PIOS connectors (Phase 1–6)

---

## 🏗️ Phase History

### Phase 1–6: Foundation (pre-existing)

The earlier work built 22 PIOS connectors and 9 horizontal Department OS services. This is documented in the existing CLAUDE.md files.

### Phase 7: Voice wiring (commit `f527c91a` + `2900da80` + `4e7194af`)

Added wake-word + device-integration + listening-modes to runtime/genie, plus the voice-pipeline E2E test.

### Phase 8: Memory specialists (commits `4e7194af` + `35a764d4`)

Wired 6 long-term memory specialists:
- **memory-inbox** (capture thoughts), **universal-search** (search everywhere), **serendipity** (random memories)
- **memory-graph** (unified graph overview), **relationship-os** (people + interactions), **learning-os** (curriculum + progress)

17 new delegation routes. Test count: 39 → 63.

### Phase 9: Final 8 specialists + aggregator + intent-engine (this commit)

Wired the final 8 specialists that round out the 23-specialist surface:
- **companion-service** (life story + journal + milestones)
- **thinking-engine** (decision support, brainstorming, SWOT, research)
- **life-gps** (future-self, life goals, vision, regret-prevention)
- **execution-engine** (tasks, automations, routines, workflows)
- **life-university** (courses, lessons, certifications)
- **creation-os** (TTS, podcast, music, voiceover, video projects)
- **consultant-agent** (domain-specific advice — restaurant, startup, marketing)
- **smart-forgetting-service** (retention curves, archive, presets)

**Plus:**
- `/api/genie/personal/:userId` — aggregator that fans out to 15 specialists in parallel
- `/api/genie/intent` — explicit intent-engine endpoint
- Extended `tryGenieGateway` in `/api/ask` to fall back to intent-engine when the keyword ladder doesn't match

**Result:** Test count: 63 → 105 (+42 new). Total runtime/genie: **115 assertions, 0 failed**.

### Phase 10: INTENT_DISPATCH table + extended intent catalog (commit `e294780f`)

Built the dispatch table that maps every intent-engine intent (now 27, was 9) to a specialist with method, path, and body shape. This is the runtime/genie brain: classify once via intent-engine, then route to the right specialist without paying a round-trip on every question.

**runtime/genie/src/index.js:**
- `INTENT_DISPATCH` — table of 27 intents → `{ specialist, method, path, buildBody }`
- `SPECIALIST_URLS` — map of 17 specialist names → their base URLs
- `resolveDispatch(entry, user, question)` — resolves a dispatch entry to a concrete URL + body
- `dispatchByIntent(question, user)` — classify via intent-engine, route via table, return `{ ok, delegated, intent, confidence, answer }`
- `POST /api/genie/dispatch` — classify + route in one call (new endpoint, auth-gated)

**intent-engine/src/index.js:**
- `INTENT_CATALOG` extended 9 → 27 intents. New: remember, recall, serendipity, money, wellness, calendar, relationships, learn, skills, decide, brainstorm, analyze, research, future, life_goals, journal, story, mood, tasks, routine, create, consult, forget. Original 9 (search/buy/cancel/support/compare/recommend/track/return/greet) preserved for backward compat.

**Routing examples now covered:**
| Question | Intent | Specialist |
|----------|--------|------------|
| "should I move to NYC?" | `decide` | genie-thinking-engine |
| "make me a podcast about cooking" | `create` | genie-creation-os |
| "tell me about my relationship with Sarah" | `relationships` | genie-relationship-os |
| "where will I be in 5 years" | `future` | genie-life-gps |
| "I need advice on my restaurant" | `consult` | genie-consultant-agent |
| "log a journal entry" | `journal` | genie-companion-service |
| "create a morning routine" | `routine` | genie-execution-engine |
| "enroll me in Python 101" | `learn` | genie-learning-os |
| "find that article about X" | `recall` | genie-memory-inbox |
| "archive my old memories" | `forget` | genie-smart-forgetting-service |

**Result:** Test count: 105 → 107 (+2 dispatch auth-gate tests). Total runtime/genie: **117 assertions, 0 failed**. `/api/ask` still uses keyword ladder as fast-path; intent-engine is now the secondary fallback after the ladder misses (via `tryGenieGateway`), and `/api/genie/dispatch` is the explicit classify+route endpoint for callers that want both.

### Phase 11: Wire `dispatchByIntent()` into `/api/ask` as primary path (commit `d74aad85`)

Phase 10 built the dispatch table; Phase 11 wires the same dispatch logic into `/api/ask` so natural-language questions route to the right specialist — not just the explicit `/api/genie/dispatch` endpoint.

**runtime/genie/src/index.js — new `/api/ask` flow:**
1. **Keyword ladder (fast-path):** Catches the 6 most common intents without a network round-trip to intent-engine.
2. **`dispatchByIntent()` (medium-cost):** Classifies via intent-engine, then routes to the right specialist via the `INTENT_DISPATCH` table. Covers the remaining 21 intents the keyword ladder doesn't catch (decide, brainstorm, analyze, future, journal, mood, tasks, routine, create, consult, forget, relationships, learn, recall, serendipity, life_goals, skills, research, story, etc).
3. **`tryGenieGateway()` (last-resort):** Handles intents the dispatch table doesn't route yet (greet, support, recommend, track, return) and serves as a defensive fallback when intent-engine is unreachable.
4. **Memory-based greeting:** The original last-resort message when nothing else matched.

**Bug fix:** `INTENT_ENGINE_URL` default port was 4792 but intent-engine actually runs on 4786. The wrong default would have silently failed every dispatch call unless operators set `INTENT_ENGINE_URL` explicitly. Now defaults to 4786.

**Response shape extended:** `/api/ask` now returns `classified_intent` and `dispatch_failed` alongside `delegated_to` so callers can see the routing decision (which intent was classified, whether dispatch fell through to genie-gateway).

**Result:** Test count: 107 → 111 (+4 Phase 11 regression coverage). Total runtime/genie: **121 assertions, 0 failed**. `/api/ask` now covers all 27 catalog intents end-to-end via the keyword ladder + dispatch path; genie-gateway handles only the 5 dispatch-table gaps.

### Phase 12: Aggregator response normalization (commit `d5120029`)

The `/api/genie/personal/:userId` aggregator returned each specialist's native response shape, forcing clients (do-app, REZ-Workspace) to write defensive code for every specialist's format. Phase 12 normalizes every specialist's data into a stable `{kind, count, ...}` envelope.

**runtime/genie/src/index.js:**
- `SHAPERS` — per-key shaper map covering all 15 aggregator keys
- `normalizeList()` — picks the first array field from a candidate list and wraps it in `{kind, count, items, raw}`
- `normalizeSpecialistData()` — applies `SHAPERS[key]` to a parallelFetch result, with graceful fallback to `{kind:raw, count:0, raw}` for unknown specialists and `{ok:false, error:'shape_failed'}` on throw
- Aggregator — applies `normalizeSpecialistData` to every result, adds `kindCounts` (memories/people/courses/plans/activity/raw/errors) so clients get an at-a-glance view of which domains are populated
- Exports — `SHAPERS`, `normalizeSpecialistData`, `normalizeList` (for testability)

**Per-domain shapes:**
| Domain | Shape |
|---|---|
| memories | `{ kind, count, items, raw }` — memoryGraph, memoryInbox, serendipity |
| people | `{ kind, count, people, raw }` (relationships), `{ kind, count, health, raw }` (relationshipHealth) |
| courses | `{ kind, count, courses, raw }` — learning, university |
| plans | `{ kind, count, nextSteps, raw }` (lifeGps), `{ kind, count, goals, raw }` (lifeGoals), `{ kind, count, decision, options, raw }` (thinking) |
| activity | `{ kind, count, entries, raw }` (companion), `{ kind, count, tasks, raw }` (execution), `{ kind, count, sessions, raw }` (consultant), `{ kind, count, projects, raw }` (creation), `{ kind, count, presets, raw }` (forgetting) |

**Raw payload preserved** under `.raw` so clients that need the full downstream response can still reach it — zero breakage for existing consumers.

**Result:** Test count: 111 → 127 (+16 Phase 12 coverage). Total runtime/genie: **137 assertions, 0 failed**. Clients can now iterate `data.specialists` and access `data.kind + data.count` uniformly without inspecting each specialist's native response format.

### Phase 13: Aggregator cache with 5s TTL (commit `05f76d7f`)

The aggregator fans out to 15 specialists in parallel on every request. Power users hitting the dashboard every 30 seconds were re-fanning 15 services 2×/minute for no behavioral benefit. Phase 13 adds a 5-second TTL cache keyed on `userId` so subsequent requests within the window serve the cached payload.

**runtime/genie/src/index.js:**
- `AGGREGATOR_CACHE_TTL_MS` — 5000ms default (env-overridable)
- `AGGREGATOR_CACHE_ENABLED` — true default (env-overridable)
- `aggregatorCache` — in-memory `Map<userId, {expiresAt, payload}>`
- `pruneAggregatorCache` — lazy cleanup of expired entries (no background timer)
- `getCachedAggregator` / `setCachedAggregator` — cache primitives
- `invalidateAggregatorCache(userId | undefined)` — manual invalidation (one user or all)
- `_aggregatorCacheStats` — ops view (size / live / expired / ttlMs / enabled)
- Aggregator endpoint — cache lookup, `?fresh=true` bypasses, payload cached on fresh fetch, response includes `cached` + `cacheAgeMs`
- New endpoints:
  - `GET /api/genie/personal/_cache` — cache stats
  - `DELETE /api/genie/personal/_cache` — invalidate all or one userId
- Exports — `aggregatorCache`, `getCachedAggregator`, `setCachedAggregator`, `invalidateAggregatorCache`, `_aggregatorCacheStats`, `AGGREGATOR_CACHE_TTL_MS`, `AGGREGATOR_CACHE_ENABLED` (for tests + ops)

**Result:** Test count: 127 → 141 (+14 Phase 13 coverage). Total runtime/genie: **151 assertions, 0 failed**. A user polling the aggregator every 30s now triggers only one fanout per 5s window — 6× reduction in downstream traffic for power users.

---

## 🔌 API Surface (the new namespace)

All new routes live under `/api/genie-*/...` so they don't conflict with the PIOS connectors under `/api/pios/*`.

### Aggregator
- `GET /api/genie/personal/:userId` — fans out to 15 specialists, returns `{ up, total, specialists: { ... } }`

### Memory & capture
- `POST /api/genie-inbox/capture`, `GET /api/genie-inbox/recent`
- `GET /api/genie-search?q=...&kind=...`
- `GET /api/genie-serendipity/random`

### Knowledge graph + relationships + learning
- `GET /api/genie-graph/:userId`
- 7 routes under `/api/genie-relationships/:userId/...`
- 6 routes under `/api/genie-learning/:userId/...`

### Decision support + execution + life planning
- 5 routes under `/api/genie-thinking/...`
- 3 routes under `/api/genie-execution/...`
- 4 routes under `/api/genie-life-gps/...`
- 4 routes under `/api/genie-university/...`

### Content + relationships + forgetting
- 5 routes under `/api/genie-creation/...`
- 3 routes under `/api/genie-consult/...`
- 3 routes under `/api/genie-companion/:userId/...`
- 4 routes under `/api/genie-forgetting/...`

### Intent engine
- `POST /api/genie/intent` — explicit intent classification endpoint
- `tryGenieGateway` in `/api/ask` now falls back to intent-engine when the 6-intent keyword ladder doesn't match

### Health
- `GET /api/genie-services/health` — lists ALL 23 specialists + voice-os + razo + voice-twin, returns per-service up/down + latency

---

## 🛠️ Design Patterns

### 1. Non-invasive downstream calls

Every new route is a thin delegation layer:
```js
app.get('/api/genie-X/:userId/Y', authMiddleware, async (req, res) => {
  const r = await axios.get(`${GENIE_X_URL}/X/${req.params.userId}/Y`, {
    headers: { 'x-internal-token': INTERNAL_SERVICE_TOKEN },
    timeout: 3000,
    validateStatus: () => true,
  });
  if (r.status >= 400) return res.status(r.status).json(r.data);
  res.json({ success: true, data: r.data, delegated_to: 'genie-X', meta: { ... } });
});
```

We never modify the downstream specialist — we just call it from runtime/genie.

### 2. Graceful degradation

When a specialist is unreachable, runtime/genie returns:
```json
{ "success": false, "error": { "code": "DOWNSTREAM", "message": "genie-X unreachable" }, "meta": { ... } }
```

The caller (do-app, REZ-Workspace, etc.) can decide whether to retry, fall back, or show a "this feature is offline" message.

### 3. Opt-in/opt-out via env flags

Every specialist has its own `GENIE_X_URL` env var (defaulting to `http://localhost:PORT`). The `USE_INTENT_ENGINE`, `USE_VOICE_OS`, `USE_RAZO` flags turn features off entirely.

### 4. Auth at the edge

All delegation routes are under `authMiddleware` (user JWT). The downstream services see an `x-internal-token` header so they trust the call came from runtime/genie. The user's identity is propagated through the request body (`userId`, `corpId`).

---

## 🧪 Testing Strategy

### Surface tests (no downstream running)

The `voice-razo.test.mjs` file (141 assertions) verifies:
- Every new route exists and returns the expected HTTP status
- Every new route is auth-gated (returns 401 without a Bearer token)
- The `/api/genie-services/health` endpoint lists every specialist
- The earlier `/api/test.js` smoke tests still pass (regression check)
- The `normalizeSpecialistData` SHAPERS map (Phase 12)
- The aggregator cache: hits, misses, expiry, stats, multi-user isolation (Phase 13)

These tests **don't** require any downstream service to be running — they verify the routing surface and the normalization/cache contracts in-process, not the actual delegation. This makes them fast and reliable.

### E2E tests (downstream running) ✅ IMPLEMENTED (Phase 15)

The `e2e-aggregator.test.mjs` file (24 assertions) drives real HTTP traffic through the fanout against in-process mock specialists:
- 5 mock specialists on ephemeral ports (memories, people, courses, plans, activity), each enforcing `x-internal-token` on protected routes (mimics real specialists).
- All 23 `GENIE_*_URL` env vars actually fanned out to (not just bound as `const` at module load time).
- One specialist pointed at `DEAD_PORT=1` to verify graceful degradation.
- The `/api/genie-services/health` aggregator exercised end-to-end (28 services in parallel).
- The `/api/pios/health` aggregator exercised end-to-end (22 services in parallel).
- All 14 auth-gated delegation routes verified to return 401 without Bearer.
- Cache mgmt endpoints (`/api/genie/personal/_cache`) verified auth-gated.
- `/api/ask`, `/api/genie/intent`, `/api/genie/dispatch` verified auth-gated.

**Pattern:** for each specialist we could add deeper child-process E2E tests (spawn the specialist as a child process, run a real auth'd request, verify the delegated response). The pattern is documented in the wake-word + device-integration + listening-modes E2E tests (3 services, 34 assertions, ~30s). Phase 15's in-process approach is the most valuable E2E we can run without a MongoDB instance — it verifies the wiring, the token contract, the graceful-degradation path, and the auth gate against real HTTP traffic, all without any external dependency.

---

## 🗺️ What's Left (Future Work)

### 1. Per-specialist E2E tests ✅ DONE (Phase 15)

The Phase 15 E2E test (`runtime/genie/test/e2e-aggregator.test.mjs`) verifies the runtime/genie ↔ specialist surface end-to-end with real HTTP traffic:
- 5 in-process Express mock specialists on ephemeral ports (memories, people, courses, plans, activity), each enforcing `x-internal-token` on protected routes (mimics real specialists).
- All 23 `GENIE_*_URL` env vars honored and actually fanned-out to (not just bound as `const` at module load time).
- One specialist (`genie-money-os`) pointed at `DEAD_PORT=1` to verify graceful degradation: response is `'down'` with the dead URL echoed back, not a 500.
- The `/api/genie-services/health` endpoint is exercised end-to-end (calls 23 specialists + voice + razo = 28 total in parallel).
- The `/api/pios/health` endpoint is exercised (22 PIOS services).
- All 14 auth-gated delegation routes verified to return 401 without Bearer token (paths mirror the canonical surface in `src/index.js`).
- `/api/ask`, `/api/genie/intent`, `/api/genie/dispatch`, `/api/genie/personal/:userId` return 401.
- 24 assertions, 0 failures, fully Mongo-free.

**Notable design decision:** the test sets `NODE_ENV='test'` (not `'e2e'`). The source's `start()` gates both auto-listen and `/ready` registration behind `NODE_ENV !== 'test'`, and since we point at a dead Mongo URI, `mongoose.connect` retries forever. `/ready` is a Mongo-dependent deployment probe, not an API contract we can verify in-process — covered separately in any environment with a real Mongo.

### 2. Webhook fanout for proactive notifications

Today the specialists push via the event bus, but do-app / REZ-Workspace need WebSockets or webhooks to surface "your relationship-os has new insights" or "your thinking-engine finished a long analysis". Out of scope for runtime/genie — this belongs in a separate notification service.

### 3. Documentation ✅ DONE (Phase 14)

The client-developer API reference is at `.claude/plans/runtime-genie-api-reference.md` (274 lines, 11 sections):
1. Quick reference (port, base URL, content-type, auth scheme)
2. Auth (Bearer JWT, where to get a token)
3. Aggregator (`/api/genie/personal/:userId` with cache + envelope contract)
4. Intent dispatch (`/api/genie/dispatch` for explicit classify+route)
5. Intent classification (`/api/genie/intent` for classify-only)
6. `/api/ask` (natural-language → intent dispatch → specialist)
7. Health (`/api/genie-services/health`, `/api/pios/health`)
8. Cache management (`/api/genie/personal/_cache` GET/DELETE)
9. Per-specialist routes (the full `/api/genie-*/*` matrix)
10. Env vars (every `GENIE_*_URL`, `USE_*`, `MONGODB_URI`, `JWT_SECRET`)
11. Error envelope (`{ success: false, error: { code, message }, meta }`)

This is the source-of-truth reference for do-app, REZ-Workspace, nexha-client, and salar-client.

---

## 📈 Numbers

| Metric | Before Phase 8 | After Phase 9 | After Phase 10 | After Phase 11 | After Phase 12 | After Phase 13 | After Phase 14 | After Phase 15 |
|--------|---------------|---------------|----------------|----------------|----------------|----------------|----------------|----------------|
| Specialists wired to runtime/genie | 9 / 23 | **23 / 23** | **23 / 23** | **23 / 23** | **23 / 23** | **23 / 23** | **23 / 23** | **23 / 23** |
| Delegation routes in runtime/genie | ~30 | **~80** | **~82** (+2 dispatch endpoints) | **~82** (same) | **~82** (same) | **~84** (+2 cache mgmt endpoints) | **~84** (same) | **~84** (same) |
| Specialists in `/api/genie-services/health` | 9 + 3 voice | **23 + 3 voice** | **23 + 3 voice** | **23 + 3 voice** | **23 + 3 voice** | **23 + 3 voice** | **23 + 3 voice** | **23 + 3 voice** |
| Aggregator routes | 0 | **1** (`/api/genie/personal/:userId`) | **1** (unchanged) | **1** (unchanged) | **1** + normalized envelope (kind/count/kindCounts) | **1** + 5s cache (GET stats, DELETE invalidate) | **1** (unchanged) | **1** (unchanged) |
| Intent-engine integration | env var only | **+ tryGenieGateway fallback + /api/genie/intent endpoint** | **+ INTENT_DISPATCH table (27 intents) + /api/genie/dispatch** | **+ dispatchByIntent wired into /api/ask as primary path** | (unchanged) | (unchanged) | (unchanged) | (unchanged) |
| Intent catalog size | 9 | 9 | **27** | **27** | **27** | **27** | **27** | **27** |
| Test assertions | 49 | **115** | **117** | **121** | **137** | **151** | **151** | **165** (+24 e2e-aggregator) |
| Documentation pages | 0 | 0 | 0 | 0 | 0 | 0 | **1** (runtime-genie-api-reference.md, 274 lines) | **1** (unchanged) |

---

## 🎯 TL;DR

**Before:** 9 specialists reachable through runtime/genie. /api/ask had a hand-rolled 6-intent keyword ladder. No aggregator. No intent-engine integration. No way to see the health of all specialists in one place.

**After:** ALL 23 specialists reachable. 84 delegation routes. A 15-fanout aggregator at `/api/genie/personal/:userId` returning a normalized `{kind, count, ...}` envelope per specialist, with a 5s TTL cache for power users. Intent-engine falls through when the keyword ladder doesn't match. One endpoint to see the health of all 23. 165 test assertions (141 surface + 24 E2E), all passing.

**Phases 10–15 added:**
- **Phase 10:** 27-intent dispatch table mapping any classified intent to its specialist — exposed at `/api/genie/dispatch`.
- **Phase 11:** Wired the same dispatch logic into `/api/ask` as the primary path so natural-language questions route to the right specialist — covering all 27 catalog intents end-to-end.
- **Phase 12:** Normalized the aggregator's per-specialist data into a stable `{kind, count, items, …}` schema so clients can iterate uniformly.
- **Phase 13:** 5-second TTL cache on the aggregator (with `?fresh=true` bypass and cache management endpoints) — 6× reduction in downstream traffic for a polling user.
- **Phase 14:** Client-developer API reference (`runtime-genie-api-reference.md`, 274 lines) covering auth, aggregator, dispatch, intent, /api/ask, health, cache mgmt, per-specialist routes, env vars, error envelope.
- **Phase 15:** Per-specialist E2E test (`e2e-aggregator.test.mjs`, 24 assertions) that drives real HTTP traffic through the fanout against in-process mock specialists — verifies graceful degradation, auth gating, and the 28-service `/api/genie-services/health` aggregator end-to-end without requiring Mongo.

**Next milestone:** Webhook fanout for proactive notifications (out of scope for runtime/genie — separate notification service).
