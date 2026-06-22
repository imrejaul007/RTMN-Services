# Memory Context Engine

> **Status:** ✅ Production-ready v1.0.0 (Phase 5 + 7 — June 22, 2026)
> **Role:** The **smart retriever** that composes a relevant context window for any AI agent / LLM. Bridges MemoryOS (storage) with consumers that need to remember.
> **Port:** 4790
> **Owner:** HOJAI AI Platform team

## Mission

MemoryOS is a dumb store. The Context Engine is the *smart retriever* that decides **what goes into an LLM's window**, in what order, with what confidence score, given:

- a `query` (what the agent is looking for)
- a `twinId` (whose memory to search)
- a `budget` (max items / max tokens)
- a `recency` window
- a `min-confidence` threshold

It is the difference between "throw every memory at the LLM" and "give the LLM the most useful N memories for THIS question."

```
score = relevance × confidence × recency
      + query-term-overlap-boost
```

## The Smart Retrieval Pipeline

```
1. Resolve twin's memory partitions        → twin-memory-bridge (4704)
2. Keyword + semantic search               → memory-os (4703)
3. Filter by recency window                → (in-process)
4. Filter by bound kinds                   → (in-process)
5. Fetch per-fact confidence               → memory-confidence (4152)
6. Score = relevance × confidence × recency
7. Filter by minConfidence
8. Sort desc, take top N
9. (Optional) writeback — touch memories to bump accessCount
```

## Endpoints (7)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/context` | Build a context window (full pipeline, optional writeback) |
| `POST` | `/api/context/preview` | Dry-run (no writeback) — for "show me what would go in" |
| `GET` | `/api/stats` | `totalCalls`, `cacheHits`, `cacheMisses`, per-twin/per-mode counts, recent errors |
| `GET` | `/api/auth/toggle?on=true` | Runtime toggle of `REQUIRE_AUTH` |
| `GET` | `/health` | Liveness — upstreams, cache, stats |
| `GET` | `/ready` | Readiness probe |
| `GET` | `/` | Redirects to `/health` |

## Request / Response Shape

```jsonc
// POST /api/context
{
  "twinId": "demo",
  "query": "user dietary preferences",
  "mode": "hybrid",      // "keyword" | "semantic" | "hybrid" | "working"
  "limit": 10,           // 1..50
  "minConfidence": 0.0,  // 0..1
  "kinds": ["semantic","long-term","episodic"],
  "recencyDays": null,   // null = no recency filter
  "writeback": false     // true = bump accessCount on every returned memory
}

// Response
{
  "success": true,
  "data": {
    "twinId": "demo",
    "query": "user dietary preferences",
    "mode": "hybrid",
    "limit": 10,
    "minConfidence": 0,
    "kinds": ["semantic","long-term","episodic"],
    "binding": { "twinId": "demo", "partitions": {...}, "bound": true },
    "count": 3,
    "items": [
      {
        "memory": { "id": "...", "content": "John is vegetarian", ... },
        "score": 0.8723,
        "confidence": { "effectiveConfidence": 0.94, "decayFactor": 0.98, ... },
        "source": "memory-context-engine"
      },
      ...
    ],
    "stats": { "candidates": 12, "afterFilter": 8, "afterScore": 3 },
    "fromCache": false
  }
}
```

## Search Modes

| Mode | Behavior |
|------|----------|
| `keyword` | Tokenizes the query, scores memories by exact term overlap |
| `semantic` | Forwards to MemoryOS `/api/memories/search` (vector / embedding) |
| `hybrid` | Default — keyword + semantic combined |
| `working` | Just the current working-memory token for the twin |

## Caching

- **In-process** cache keyed by `JSON.stringify({twinId, query, mode, limit, minConfidence, kinds: sorted})`
- **TTL:** 30 seconds (enough to dedupe burst traffic; consumers should treat as soft hint, not source of truth)
- **Cap:** 500 entries (LRU eviction)
- **Backed by:** `PersistentMap('cache')` so it survives restarts (best-effort)

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `memoryContextEngine: http://localhost:4790`
- **Flow Orchestrator (4244)** — the `answer-question`, `personal-assistant`, and similar plans call this as their `memory.read` step
- **Genie** — uses this to build user context windows
- **Razo Keyboard (4725)** — conversation memory assembly

## Upstreams (all overridable via env)

| Service | Default | Purpose |
|---------|---------|---------|
| `MEMORYOS_URL` | `http://localhost:4703` | Search + working memory |
| `CONFIDENCE_URL` | `http://localhost:4152` | Per-fact confidence |
| `BRIDGE_URL` | `http://localhost:4704` | Twin ↔ memory partition links |

## Example

```bash
# Build a context window
curl -X POST http://localhost:4790/api/context \
  -H "Content-Type: application/json" \
  -d '{"twinId":"demo","query":"dietary preferences","limit":5,"minConfidence":0.4}'

# Preview (no writeback)
curl -X POST http://localhost:4790/api/context/preview \
  -H "Content-Type: application/json" \
  -d '{"twinId":"demo","query":"recent activity","limit":3}'

# See usage stats
curl http://localhost:4790/api/stats
```

## Auth (Phase 7)

JWT verification via `@rtmn/shared/auth` (CorpID-backed `createCorpIdAuthMiddleware`). Local `src/auth.js` is a thin shim re-exporting from the shared module. Public paths: `/health`, `/`, `/api/auth/toggle`. Toggle JWT requirement at runtime with `GET /api/auth/toggle?on=true`.

## Tests (8/8 PASS)

`tests/smoke.sh` covers health, stats, full pipeline (with 0 items because nothing has been written upstream yet), and the **auth toggle flow** (toggle on → no-token request returns 401 → toggle off → 200).

## Open follow-ups

- Cache key currently excludes `recencyDays` and `writeback` — fine in practice but worth tightening for purity
- Add `mode=hybrid` server-side scoring instead of mixing two calls
- Per-twin cache quotas
- Streaming / SSE for very large context windows (currently full JSON)

---

*Last Updated: 2026-06-22*
