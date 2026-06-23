# Personal Intelligence OS (PIOS) — Runtime/Genie Wiring Roadmap

> **Status:** ✅ **Phases 1–9 COMPLETE** (June 22, 2026)
> **Total Specialists Wired:** 23 of 23 (100%)
> **Total Delegation Routes:** ~80
> **Total Test Assertions:** 115 (10 base + 105 voice-razo), 0 failures
> **Last Updated:** 2026-06-22

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

The voice-razo.test.mjs file (105 assertions) verifies:
- Every new route exists and returns the expected HTTP status
- Every new route is auth-gated (returns 401 without a Bearer token)
- The `/api/genie-services/health` endpoint lists every specialist
- The earlier `/api/test.js` smoke tests still pass (regression check)

These tests **don't** require any downstream service to be running — they verify the routing surface, not the actual delegation. This makes them fast and reliable.

### E2E tests (downstream running)

For each specialist we could add E2E tests that:
1. Spawn the specialist as a child process
2. Spawn runtime/genie
3. Make a real auth'd request
4. Verify the delegated response

**Status:** Not yet implemented. The pattern is documented in the wake-word + device-integration + listening-modes E2E tests (3 services, 34 assertions, takes ~30s).

### Aggregator tests

`/api/genie/personal/:userId` would benefit from a single E2E test that verifies the parallel fanout returns the expected per-specialist shape.

---

## 🗺️ What's Left (Future Work)

### 1. Intent detection in `/api/ask` (low coverage)

The current `/api/ask` only handles 6 intents via keyword matching:
- shopping, calendar, money, wellness, goals, remember

The 23 specialists offer many more intents:
- "tell me about my relationship with X" → relationship-os
- "should I do X?" → thinking-engine
- "where will I be in 5 years" → life-gps
- "make me a podcast about X" → creation-os
- "I need advice on X" → consultant-agent
- "log a journal entry" → companion-service
- "create a routine for me" → execution-engine
- "enroll me in a course" → life-university

**Recommendation:** Replace the keyword ladder with a call to `/api/genie/intent` (which already exists) and dispatch based on the returned intent string. This would make `/api/ask` truly route-to-the-right-specialist.

### 2. Per-specialist E2E tests

Each of the 23 specialists deserves at least one E2E test that exercises a real call through runtime/genie. Pattern: see genie-wake-word-service/tests/e2e-voice-pipeline.test.mjs.

### 3. Aggregator response normalization

`/api/genie/personal/:userId` currently returns each specialist's native response shape. For consistency, we should normalize to a common envelope:
```json
{
  "up": 12, "total": 15,
  "specialists": {
    "memoryGraph": { "ok": true, "data": { ...normalized... } },
    "relationships": { "ok": false, "error": "downstream_unreachable" },
    ...
  }
}
```

### 4. Per-user caching

The aggregator calls 15 services in parallel. For a power user who hits the dashboard every 30 seconds, this is wasteful. Add a 5-second response cache keyed on `userId + specialist`.

### 5. Webhook fanout for proactive notifications

Today the specialists push via the event bus, but do-app / REZ-Workspace need WebSockets or webhooks to surface "your relationship-os has new insights" or "your thinking-engine finished a long analysis". Out of scope for runtime/genie — this belongs in a separate notification service.

### 6. Documentation per specialist in `do-app-genieos-integration.md`

The do-app integration doc should be updated to list every new route so client developers know what they can call.

---

## 📈 Numbers

| Metric | Before Phase 8 | After Phase 9 |
|--------|---------------|---------------|
| Specialists wired to runtime/genie | 9 / 23 | **23 / 23** |
| Delegation routes in runtime/genie | ~30 | **~80** |
| Specialists in `/api/genie-services/health` | 9 + 3 voice | **23 + 3 voice** |
| Aggregator routes | 0 | **1** (`/api/genie/personal/:userId`) |
| Intent-engine integration | env var only | **+ tryGenieGateway fallback + /api/genie/intent endpoint** |
| Test assertions | 49 | **115** |

---

## 🎯 TL;DR

**Before:** 9 specialists reachable through runtime/genie. /api/ask had a hand-rolled 6-intent keyword ladder. No aggregator. No intent-engine integration. No way to see the health of all specialists in one place.

**After:** ALL 23 specialists reachable. 80+ delegation routes. A 15-fanout aggregator at `/api/genie/personal/:userId`. Intent-engine falls through when the keyword ladder doesn't match. One endpoint to see the health of all 23. 115 test assertions, all passing.

Next milestone: **Replace the keyword ladder in `/api/ask` with an intent-engine dispatch** so every question routes to the right specialist. This is the last big piece before runtime/genie is truly "the personal intelligence gateway".
