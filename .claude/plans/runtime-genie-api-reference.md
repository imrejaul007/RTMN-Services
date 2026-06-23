# Runtime/Genie — API Reference for Client Developers

> **For:** do-app, REZ-Workspace, nexha-client, salar-client, and any external consumer
> **Base URL:** `http://localhost:<GENIE_PORT>` (default 7100)
> **Auth:** All routes (except `/health`) require `Authorization: Bearer <jwt>`
> **Last updated:** June 22, 2026 (Phases 1–13 complete)

The runtime/genie service is the **personal intelligence gateway** to all 23 HOJAI-AI Genie specialists. Every specialist is reachable through a single base URL + JWT — clients don't need to know individual service ports, URLs, or auth tokens.

## Quick reference

| Surface | Pattern | Purpose |
|---|---|---|
| Aggregator | `GET /api/genie/personal/:userId` | One-call personal snapshot (15 specialists, 5s cache) |
| Intent dispatch | `POST /api/genie/dispatch` | Classify question → route to right specialist |
| Intent classification only | `POST /api/genie/intent` | Just classify, no dispatch |
| Health | `GET /api/genie-services/health` | Up/down status of all 23 specialists + voice-os + razo |
| Cache mgmt | `GET/DELETE /api/genie/personal/_cache` | Aggregator cache stats + invalidation |
| Natural language | `POST /api/ask` | Conversational entry point (auto-routes to specialist) |

## Auth

All routes require a Bearer JWT issued by `/api/auth/signup` or `/api/auth/login`. Downstream services see the request body carrying `userId` and `corpId`; the `x-internal-token` header is added by runtime/genie and not exposed to clients.

```bash
curl -X POST http://localhost:7100/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"u@example.com","password":"...","name":"User"}'
# → { success, data: { token, user: { id, email, name, corpId, twinId } } }
```

## 1. Aggregator — `GET /api/genie/personal/:userId`

One call returns a personal snapshot from 15 specialists in parallel. **5s TTL cache** — pass `?fresh=true` to bypass.

**Response shape:**
```json
{
  "success": true,
  "data": {
    "userId": "u-123",
    "up": 12,
    "total": 15,
    "kindCounts": {
      "memories": 2, "people": 1, "courses": 1, "plans": 3, "activity": 4, "raw": 0, "errors": 3
    },
    "specialists": {
      "memoryGraph":      { "ok": true,  "data": { "kind": "memories", "count": 42, "items": [...], "raw": {...} } },
      "memoryInbox":      { "ok": true,  "data": { "kind": "memories", "count": 5,  "items": [...], "raw": {...} } },
      "serendipity":      { "ok": false, "error": "downstream_unreachable" },
      "relationships":    { "ok": true,  "data": { "kind": "people",   "count": 8,  "people": [...], "raw": {...} } },
      "relationshipHealth": { "ok": true, "data": { "kind": "people",   "count": 0,  "health": null, "raw": null } },
      "learning":         { "ok": true,  "data": { "kind": "courses",  "count": 3,  "courses": [...], "raw": {...} } },
      "university":       { "ok": true,  "data": { "kind": "courses",  "count": 2,  "courses": [...], "raw": {...} } },
      "lifeGps":          { "ok": true,  "data": { "kind": "plans",    "count": 3,  "nextSteps": [...], "raw": {...} } },
      "lifeGoals":        { "ok": true,  "data": { "kind": "plans",    "count": 5,  "goals": [...], "raw": {...} } },
      "thinking":         { "ok": true,  "data": { "kind": "plans",    "count": 4,  "decision": {...}, "options": [...], "raw": {...} } },
      "companion":        { "ok": true,  "data": { "kind": "activity", "count": 12, "entries": [...], "raw": {...} } },
      "execution":        { "ok": true,  "data": { "kind": "activity", "count": 7,  "tasks": [...], "raw": {...} } },
      "consultant":       { "ok": true,  "data": { "kind": "activity", "count": 3,  "sessions": [...], "raw": {...} } },
      "creation":         { "ok": true,  "data": { "kind": "activity", "count": 2,  "projects": [...], "raw": {...} } },
      "forgetting":       { "ok": true,  "data": { "kind": "activity", "count": 4,  "presets": [...], "raw": {...} } }
    }
  },
  "meta": { "cached": false, "cacheAgeMs": 0, "timestamp": "2026-06-22T..." }
}
```

**Normalized envelope (per specialist):**
- `ok: true` → `{ ok, data: { kind, count, ...itemsKey, raw } }` — `raw` is the unaltered downstream response for clients that need the full payload
- `ok: false` → `{ ok, error: 'downstream_unreachable' | 'shape_failed', shapeError?, raw? }`

**Per-domain shapes:**
| Domain | `kind` | Items key | Shape |
|---|---|---|---|
| memories | `memories` | `items` | `{ kind, count, items, raw }` |
| people (relationships) | `people` | `people` | `{ kind, count, people, raw }` |
| people (relationshipHealth) | `people` | — | `{ kind, count, health, raw }` |
| courses (learning) | `courses` | `courses` | `{ kind, count, courses, raw }` |
| courses (university) | `courses` | `courses` | `{ kind, count, courses, raw }` |
| plans (lifeGps) | `plans` | `nextSteps` | `{ kind, count, nextSteps, raw }` |
| plans (lifeGoals) | `plans` | `goals` | `{ kind, count, goals, raw }` |
| plans (thinking) | `plans` | `options` | `{ kind, count, decision, options, raw }` |
| activity (companion) | `activity` | `entries` | `{ kind, count, entries, raw }` |
| activity (execution) | `activity` | `tasks` | `{ kind, count, tasks, raw }` |
| activity (consultant) | `activity` | `sessions` | `{ kind, count, sessions, raw }` |
| activity (creation) | `activity` | `projects` | `{ kind, count, projects, raw }` |
| activity (forgetting) | `activity` | `presets` | `{ kind, count, presets, raw }` |

**Cache control:**
- `?fresh=true` — bypass the cache, force a real fanout
- `meta.cached: true` — response came from cache
- `meta.cacheAgeMs` — milliseconds since the cached payload was created

## 2. Intent dispatch — `POST /api/genie/dispatch`

Classify a free-form question and route it to the right specialist. Returns the specialist's response.

**Request:**
```json
{ "text": "should I move to NYC?" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ok": true,
    "delegated": "genie-thinking-engine",
    "intent": "decide",
    "confidence": 0.92,
    "answer": "Routed to genie-thinking-engine (confidence 92%): {...}"
  },
  "meta": { "timestamp": "..." }
}
```

When dispatch fails (intent-engine unreachable, or intent not in dispatch table), the response includes `ok: false`, `reason`, and an `answer` that the caller can surface to the user.

## 3. Intent classification only — `POST /api/genie/intent`

Classify without dispatching — useful when the client wants to decide what to do based on the intent.

**Request:** `{ "text": "..." }`
**Response:** `{ success, data: { intent, confidence, reasoning }, delegated_to: 'intent-engine' }`

## 4. Natural language — `POST /api/ask`

Conversational entry point. Auto-routes via:
1. Keyword ladder (fast-path) for 6 common intents
2. `dispatchByIntent` for all 27 catalog intents
3. Genie-gateway fallback for the 5 dispatch-table gaps
4. Memory-based greeting as last resort

**Request:** `{ "question": "..." }`
**Response:** `{ success, data: { answer, delegated_to, classified_intent, dispatch_failed, memories_used, goals_used, conversation_id } }`

## 5. Health — `GET /api/genie-services/health`

Per-specialist up/down status.

```json
{
  "success": true,
  "data": {
    "total": 28,
    "up": 23,
    "voice_os_enabled": true,
    "razo_enabled": true,
    "services": {
      "genie-gateway": { "status": "up", "latency": 200 },
      "genie-thinking-engine": { "status": "down", "url": "..." },
      ...
    }
  }
}
```

## 6. Cache management — `GET/DELETE /api/genie/personal/_cache`

- `GET` — view cache stats: `{ size, live, expired, ttlMs, enabled }`
- `DELETE` — invalidate all entries, or one userId: pass `?userId=u-123` or body `{ userId }`

## Per-specialist routes

Each specialist is also reachable directly under its own namespace. The full route inventory:

### Memory & capture
- `POST /api/genie-inbox/capture` — capture a thought
- `GET /api/genie-inbox/recent?userId=...&limit=...` — recent captures
- `GET /api/genie-search?q=...&kind=...` — universal search
- `GET /api/genie-serendipity/random?userId=...` — random memory

### Knowledge graph + relationships + learning
- `GET /api/genie-graph/:userId` — memory graph
- `/api/genie-relationships/:userId/dashboard` — relationship dashboard
- `/api/genie-relationships/:userId/stale?minStrength=...&minDays=...&limit=...` — stale relationships
- `/api/genie-relationships/:userId/:personId` — single relationship
- `/api/genie-relationships/:userId/:personId/interactions` — interaction history
- `/api/genie-relationships/:userId/:personId/strength` — strength score
- `/api/genie-relationships/:userId/insights` — relationship insights
- `/api/genie-relationships/health/:userId/overview` — relationship health
- `/api/genie-learning/:userId/progress?threshold=...&limit=...` — due for review
- `/api/genie-learning/:userId/courses` — enrolled courses
- `/api/genie-learning/:userId/:courseId` — course detail
- `/api/genie-learning/:userId/:courseId/complete` — mark complete
- `/api/genie-learning/:userId/skills` — skill mastery
- `/api/genie-learning/insights` — learning insights

### Decision support + execution + life planning
- `/api/genie-thinking/decide/pros-cons` — pros/cons
- `/api/genie-thinking/decide/go-no-go` — go/no-go decision
- `/api/genie-thinking/brainstorm` — generate ideas
- `/api/genie-thinking/analyze/swot` — SWOT analysis
- `/api/genie-thinking/research/summarize` — research summary
- `/api/genie-execution/:userId/tasks` — list/create tasks
- `/api/genie-execution/:userId/automations/:id/run` — run automation
- `/api/genie-life-gps/:userId/future-self` — future self
- `/api/genie-life-gps/:userId/next` — next steps
- `/api/genie-life-gps/:userId/goals` — list/create life goals
- `/api/genie-university/:userId/progress` — university progress
- `/api/genie-university/courses` — browse courses
- `/api/genie-university/courses/:courseId/lessons/:lessonId/complete` — mark complete
- `/api/genie-university/verify/:verificationId` — verify certificate

### Content + relationships + forgetting
- `/api/genie-creation/tts` — text-to-speech
- `/api/genie-creation/podcast` — generate podcast
- `/api/genie-creation/music` — generate music
- `/api/genie-creation/voiceover` — voiceover
- `/api/genie-creation/:userId/projects` — list video projects
- `/api/genie-consult/domains` — list consult domains
- `/api/genie-consult/ask` — ask consultant
- `/api/genie-consult/:userId/history` — consultation history
- `/api/genie-companion/:userId/story` — life story
- `/api/genie-companion/:userId/journal` — list/create journal entries
- `/api/genie-companion/:userId/milestones` — milestones
- `/api/genie-forgetting/config` — get retention config
- `/api/genie-forgetting/config` (PUT) — update retention config
- `/api/genie-forgetting/presets` — list forgetting presets
- `/api/genie-forgetting/cleanup` — run cleanup

### Voice OS + Voice Twin + RAZO Keyboard
- `POST /api/voice/wake` — start wake-word session
- `POST /api/voice/wake/:sessionId/audio` — push audio
- `POST /api/voice/synthesize` — TTS
- `POST /api/voice/transcribe` — STT
- `POST /api/voice/nlu/intent` — NLU intent
- `POST /api/voice/calls` — place call
- `POST /api/voice/agents/:id/invoke` — invoke voice agent
- `POST /api/voice/commerce/checkout` — voice checkout
- `GET /api/voice/twin/:userId/profiles` — voice profiles
- `POST /api/voice/twin/synthesize` — twin TTS
- `POST /api/voice/twin/transcribe` — twin STT
- `POST /api/razo/intent` — RAZO intent detection

### Foundation
- `POST /api/auth/signup` — create account
- `POST /api/auth/login` — login
- `GET /api/auth/me` — current user

## Environment variables (runtime/genie)

| Var | Default | Purpose |
|---|---|---|
| `GENIE_PORT` | 7100 | runtime/genie port |
| `MONGODB_URI` | mongodb://localhost:27017/hojai | Mongo connection |
| `JWT_SECRET` | (required) | JWT signing secret |
| `INTERNAL_SERVICE_TOKEN` | (required) | Service-to-service auth |
| `INTENT_ENGINE_URL` | http://localhost:4786 | intent-engine base URL |
| `GENIE_*_URL` | per-specialist | override individual specialist URLs |
| `USE_INTENT_ENGINE` | true | toggle intent-engine |
| `USE_VOICE_OS` | true | toggle Voice OS |
| `USE_RAZO` | true | toggle RAZO Keyboard |
| `AGGREGATOR_CACHE_TTL_MS` | 5000 | aggregator cache TTL |
| `AGGREGATOR_CACHE_ENABLED` | true | toggle aggregator cache |

## Error envelope

All errors return:
```json
{ "success": false, "error": { "code": "NOT_FOUND|DOWNSTREAM|UNAUTHORIZED|...", "message": "..." }, "meta": { "timestamp": "..." } }
```

## Why runtime/genie vs calling specialists directly

1. **Single auth point** — one JWT, one place to verify
2. **Graceful degradation** — runtime/genie returns `{ok:false, error:'downstream_unreachable'}` when a specialist is down, instead of letting the client see raw axios errors
3. **Normalized aggregator response** — clients can iterate `data.specialists` and access `kind + count + items` uniformly
4. **5s aggregator cache** — power users don't re-fanout 15 services every 30s
5. **Intent-engine dispatch** — free-form questions route to the right specialist automatically
6. **No per-specialist config** — clients don't need to know the 23 specialist ports, the `x-internal-token`, or which one is currently healthy
