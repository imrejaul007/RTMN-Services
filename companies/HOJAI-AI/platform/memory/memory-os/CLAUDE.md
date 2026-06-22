# MemoryOS — The Knowledge & Experience Layer

> **Status:** ✅ Production-ready v2.1.0 (Phases 5 + 6 + 7 — June 22, 2026)
> **Role:** The "dumb store" that holds every memory, history, knowledge-graph node, working-memory token, long-term entry, summary, and timeline.
> **Port:** 4703
> **Tagline:** *"What do I know?"*
> **Owner:** HOJAI AI Platform team

## Mission

MemoryOS is the canonical persistent memory for the entire HOJAI AI / Genie / TwinOS ecosystem. It is intentionally **a dumb store** — it stores everything, it doesn't decide what's important. Two adjacent services do that:

- **Memory Confidence (4152)** — "how reliable is this fact right now?"
- **Memory Context Engine (4790)** — "what subset should I send to the LLM for this question?"

MemoryOS is consumed by **every** consumer that needs to remember: Genie, CoPilot, Razo, TwinOS, SUTAR, SADA, all 24 industry OS. They all read from here, all write to here.

## Architecture (v2.1)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MemoryOS (4703)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │  MEMORIES      │  │  KNOWLEDGE     │  │  WORKING / LONG-TERM   │  │
│  │  (15 types)    │  │  GRAPH         │  │  (per-twin)            │  │
│  │                │  │  (nodes+edges) │  │                        │  │
│  └────────────────┘  └────────────────┘  └────────────────────────┘  │
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │  TIMELINES     │  │  SUMMARIES     │  │  ANALYTICS             │  │
│  │  (per-twin)    │  │                │  │  (growth, by-type,     │  │
│  │                │  │                │  │   recall-frequency)    │  │
│  └────────────────┘  └────────────────┘  └────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  LEARNING (Phase 6) — /api/memory/learn                          │  │
│  │  Score-based reinforcement + contradiction detection             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  MongoDB ⇄ PersistentMap (write-through cache)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Memory Types (15)

| Type | Description | Examples |
|------|-------------|----------|
| `general` | Catch-all for facts / conversations | "User mentioned X" |
| `preference` | User preferences | Theme, language, notification settings |
| `event` | Events & appointments | Meetings, reminders, deadlines |
| `decision` | Decisions made by agents | "Agent chose route A" |
| `transaction` | Financial transactions | Purchases, payments, expenses |
| `context` | Session context | Current task, recent queries |
| `fact` | Verified facts | User name, birthdate, location |
| `observation` | System-observed | Detected pattern, sensor reading |
| `workflow` | Workflow steps (used for procedural kind) | "How to do X" |
| `knowledge` | Semantic knowledge | "User knows about Y" |
| `experience` | Past experience (used by /api/memory/learn) | "Last time we tried Z..." |
| `summary` | AI-generated summary | Daily/weekly digests |
| `working` | Current working memory token | (separate endpoint) |
| `longterm` | Long-term entry | (separate endpoint) |
| `identity` | Identity/credential-related | "User's email is..." |

## Endpoints (44)

### Memories CRUD

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/memories` | Create a memory |
| `GET`  | `/api/memories` | List with filters (`twinId`, `type`, `importance`, `lifecycleStage`, `limit`, `offset`) |
| `GET`  | `/api/memories/search` | Search (`q`, `twinId`, `type`, `mode`, `limit`) |
| `GET`  | `/api/memories/:id` | Get one (bumps `accessCount`, applies decay) |
| `PUT`  | `/api/memories/:id` | Update |
| `DELETE` | `/api/memories/:id` | Delete |
| `POST` | `/api/memories/bulk-create` | Bulk insert |
| `POST` | `/api/memories/bulk-delete` | Bulk delete |
| `GET` | `/api/memories/by-importance/:level` | Filter by importance level |
| `POST` | `/api/memories/:id/forget` | Mark forgotten (soft delete via lifecycle) |
| `POST` | `/api/memories/cleanup-expired` | Sweep expired (per retention policy) |

### Lifecycle

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/memories/:id/transition` | Move to a new `lifecycleStage` (active → archived → expired) |
| `GET`  | `/api/memories/:id/history` | All transitions for this memory |
| `POST` | `/api/memories/:id/revert` | Revert last transition |

### Confidence

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/memories/:id/confidence` | Current effective confidence + 4 signals |
| `POST` | `/api/memories/:id/strengthen` | Bump `baseConfidence` by `amount` |
| `POST` | `/api/memories/:id/weaken` | Lower `baseConfidence` by `amount` |
| `POST` | `/api/memories/:id/contradict` | Mark a contradiction (drops confidence, links to opposing memory) |

### Learning (Phase 6)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/memory/learn` | **Record a learning experience** with `score` (0..1); auto-promotes high-score or reinforces, low-score registers contradiction |

Body: `{ twinId, content, score, importance?, tags?, relatedMemoryId? }`

### Knowledge Graph

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/knowledge-graph/nodes` | Add a node |
| `GET`  | `/api/knowledge-graph/nodes/:id` | Get node + outgoing edges |
| `POST` | `/api/knowledge-graph/edges` | Add a directed edge |
| `GET`  | `/api/knowledge-graph/walk` | BFS/DFS from a node up to N hops |

### Working Memory (per twin, current-task token)

| Method | Path | Purpose |
|--------|------|---------|
| `PUT`  | `/api/memory/working/:twinId` | Set working memory (replaces) |
| `GET`  | `/api/memory/working/:twinId` | Get working memory |

### Long-term Memory (per twin, key-value)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/memory/longterm/:twinId` | Add/update an entry (`key`, `value`, `kind`) |
| `GET`  | `/api/memory/longterm/:twinId` | List entries (filter by `kind`) |

### Timelines

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/memories/timeline/:twinId` | Per-twin timeline |
| `GET` | `/api/memories/timeline` | All timelines (admin) |
| `GET` | `/api/twins/:twinId/memories` | Per-twin memories (alias) |

### Summaries

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/memories/summarize` | Trigger a summary pass over a set of memories |
| `GET`  | `/api/memories/summaries` | List summaries |

### Sharing & Audit

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/memories/:id/sharing` | Set sharing (public/private/team) |
| `GET`  | `/api/memories/:id/sharing` | Get sharing settings |
| `GET`  | `/api/memories/:id/audit` | Per-memory audit log |
| `GET`  | `/api/audit` | Global audit |

### Analytics

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/memories/analytics/growth` | Memory count over time |
| `GET` | `/api/memories/analytics/by-type` | Count grouped by type |
| `GET` | `/api/memories/analytics/recall-freq` | Top recalled memories |

### Auth & Ops

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/auth/toggle?on=true` | Runtime toggle of `REQUIRE_AUTH` |
| `GET`  | `/health` | Liveness — counts, storage backend, vector DB link |
| `GET`  | `/ready` | Readiness probe |
| `GET`  | `/api/memory/types` | List the 15 memory types (public) |
| `GET`  | `/api/memory/importance-levels` | List the 5 importance levels (public) |
| `GET`  | `/api/memory/lifecycle-stages` | List the 9 lifecycle stages (public) |
| `GET`  | `/api/services` | Service discovery (public) |

## Importance Levels (5)

`Critical` → `High` → `Medium` → `Low` → `Trivial`

## Lifecycle Stages (9)

`new` → `active` → `reinforced` → `contradicted` → `archived` → `expired` → `forgotten` → `merged` → `split`

## Example

```bash
# Create a memory
curl -X POST http://localhost:4703/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "twinId":"demo",
    "content":"User prefers vegetarian food",
    "type":"preference",
    "importance":"High"
  }'

# Search memories
curl "http://localhost:4703/api/memories/search?q=vegetarian&twinId=demo"

# Learn from a positive experience
curl -X POST http://localhost:4703/api/memory/learn \
  -H "Content-Type: application/json" \
  -d '{"twinId":"demo","content":"Recommend X worked well","score":0.9}'

# Promote to long-term
curl -X POST http://localhost:4703/api/memory/longterm/demo \
  -H "Content-Type: application/json" \
  -d '{"key":"preferred_diet","value":"vegetarian","kind":"preference"}'

# Set working memory
curl -X PUT http://localhost:4703/api/memory/working/demo \
  -H "Content-Type: application/json" \
  -d '{"currentTask":"book restaurant","context":"..."}'
```

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `memoryos: http://localhost:4703`
- **unified-os-hub (4399)** — `/api/memory/*` routes to this service
- **Memory Confidence (4152)** — `POST /api/sync-from-memoryos` ingests from here
- **Memory Context Engine (4790)** — `MEMORYOS_URL` upstream
- **Twin Memory Bridge (4704)** — proxies read/write through here for partition resolution

## Storage

- **Primary:** MongoDB (single database, multiple collections: `memories`, `nodes`, `edges`, `working`, `longterm`, `summaries`, `audit`)
- **Write-through cache:** `PersistentMap` so reads survive a Mongo outage
- **Vector DB:** optional `http://localhost:4780` for embedding-based search (best-effort; if down, falls back to keyword)

## Env

```env
PORT=4703
VECTOR_DB_URL=http://localhost:4780  # optional
CORPID_URL=http://localhost:4702      # for JWT verification
REQUIRE_AUTH=false                    # default off in dev
MONGODB_URL=mongodb://localhost:27017/hojai
```

## Auth (Phase 7)

JWT verification via `@rtmn/shared/auth` (CorpID-backed `createCorpIdAuthMiddleware`). Local `src/auth.js` is a thin shim re-exporting from the shared module. Public paths: `/health`, `/`, `/api/services`, `/api/memory/types`, `/api/memory/importance-levels`, `/api/memory/lifecycle-stages`, `/api/auth/toggle`.

## Tests (60/60 e2e + 14/14 learning)

- `tests/e2e.sh` — 60 assertions covering all CRUD, search, lifecycle, confidence, knowledge-graph, working/long-term, bulk, sharing, analytics
- `tests/learning-e2e.sh` — 14 assertions covering the Phase 6 learning endpoint (positive, negative, neutral, low-importance, cleanup)

## Open follow-ups

- `/api/memory/learn` runs reinforcement synchronously in-process. For very large twins (10k+ related memories), consider queueing as a background job
- Vector embedding on write is best-effort. A backfill sweep should run periodically
- Per-memory retention policies (currently global)
- Memory expiry sweeper is on-demand (`/api/memories/cleanup-expired`) — should be cron

## Connected Services

| Service | Port | Uses MemoryOS |
|---------|------|---------------|
| Genie Gateway | 4701 | ✅ User context |
| Genie Briefing | 4712 | ✅ Tasks & insights |
| Genie Calendar | 4709 | ✅ Event storage |
| TwinOS Hub | 4705 | ✅ Context sync |
| RAZO Keyboard | 4725 | ✅ Conversation memory |
| Memory Confidence | 4152 | ✅ Read + sync |
| Memory Context Engine | 4790 | ✅ Search + working |
| Twin Memory Bridge | 4704 | ✅ Read/write proxy |
| All 24 Industry OS | varies | ✅ Customer memory |

---

*Last Updated: 2026-06-22 (Phase 5 + 6 + 7)*
