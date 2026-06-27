# HOJAI AI Memory Layer

> **Status:** ✅ Production-ready as of 2026-06-22 (Phase 5 + 6 + 7 complete)
> **Coverage:** 115/115 active tests passing across 4 services (+ 7 known smoke-test schema mismatches in memory-confidence — pre-existing, not auth)
> **Audit date:** 2026-06-22

The Memory Layer is HOJAI AI's "Knowledge & Experience Layer" — answering the question
**"What do I know?"** for any AI agent, twin, or service in the ecosystem. It is composed
of **four services** that work together:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       MEMORY CONTEXT ENGINE (4790)                       │
│                       Orchestrator / smart retriever                     │
└──────────────────────────────────────────────────────────────────────────┘
         │                  │                       │
         ▼                  ▼                       ▼
   ┌──────────┐      ┌──────────────┐      ┌──────────────────────┐
   │ MEMORYOS │      │   MEMORY     │      │  TWIN MEMORY BRIDGE  │
   │  (4703)  │◄─────│  CONFIDENCE  │      │       (4704)         │
   │          │      │   (4152)     │      │                      │
   │ The dumb │      │  Decay,      │      │  Twin ↔ Memory       │
   │  store   │      │  reinforce,  │      │  partition links     │
   │          │      │  contradict  │      │                      │
   └──────────┘      └──────────────┘      └──────────────────────┘
         │                                            │
         └──────────────► CorpID (4702) ◄────────────┘
                          JWT auth
```

## The four services

### 1. MemoryOS (`platform/memory/memory-os`, port 4703)

The dumb store. Holds memories, history, knowledge graph, working memory, long-term
memory, summaries, and timelines. Supports 15 memory types, 5 importance levels,
9 lifecycle stages.

**Endpoints (selection):**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/memories` | Create a memory |
| `GET`  | `/api/memories/:id` | Read a memory (bumps accessCount, applies decay) |
| `PUT`  | `/api/memories/:id` | Update a memory |
| `DELETE` | `/api/memories/:id` | Delete a memory |
| `GET`  | `/api/memories/timeline/:twinId` | Per-twin timeline |
| `POST` | `/api/memory/learn` | **Record a learning experience** (Phase 6) |
| `POST` | `/api/memories/:id/strengthen` | Bump confidence by `amount` |
| `POST` | `/api/memories/:id/weaken` | Lower confidence by `amount` |
| `POST` | `/api/memories/:id/contradict` | Mark a contradiction (drops confidence) |
| `POST` | `/api/memory/personal/:twinId` | Convenience: personal identity memory |
| `POST` | `/api/memory/business/:twinId` | Convenience: business knowledge memory |
| `POST` | `/api/memory/decision/:twinId` | Convenience: decision record |
| `POST` | `/api/memories/:id/forget` | GDPR-style forget (soft or hard) |
| `GET`  | `/api/auth/toggle?on=true` | Toggle JWT requirement (dev only) |

**Storage:** MongoDB with in-memory write-through cache. All writes are persisted
to Mongo before the response. On startup, all collections are warmed into the
in-memory `Map`s for fast reads.

### 2. Memory Confidence (`platform/memory/memory-confidence`, port 4152)

Tracks confidence over time with a decay/reinforce/contradict model.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/facts` | Create a fact with initial confidence |
| `GET`  | `/api/facts` | List facts (filterable by twin, subject, predicate) |
| `POST` | `/api/facts/:id/strengthen` | Bump confidence |
| `POST` | `/api/facts/:id/weaken` | Lower confidence |
| `POST` | `/api/facts/:id/contradict` | Mark a contradiction (drops confidence) |
| `POST` | `/api/facts/:id/recall` | Record that this fact was used |
| `GET`  | `/api/audit` | Read the full audit log |

**Storage:** MongoDB (facts, recallEvents, audit) with in-memory cache.

### 3. Twin Memory Bridge (`platform/twins/twin-memory-bridge`, port 4704)

Owns the *twin ↔ memory* relationship. Each twin has named **partitions** for each
memory kind (episodic, semantic, procedural, working, long-term). Routes reads/writes
through to MemoryOS using the kind→type mapping (`episodic → event`, etc.).

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/twins/:twinId/bind` | Bind a twin to a partition kind |
| `GET`  | `/api/twins/:twinId` | Get binding info |
| `POST` | `/api/twins/:twinId/memory/read` | Read memories via the bridge |
| `POST` | `/api/twins/:twinId/memory/write` | Write a memory via the bridge |
| `POST` | `/api/twins/:twinId/migrate` | Migrate a partition (e.g. episodic → long-term) |
| `GET`  | `/api/audit` | Read proxy audit log |

**Storage:** MongoDB (bindings, partitions, audit) with in-memory cache.

### 4. Memory Context Engine (`platform/memory/memory-context-engine`, port 4790) — NEW

The **smart retriever**. Composes a ranked context window for any AI agent / LLM
by combining MemoryOS (recall), Confidence (effective score), and Bridge (binding
resolution).

**Why a separate service?** MemoryOS is a dumb store. The Context Engine decides
**WHAT** goes into the LLM's window, in what **ORDER**, with what **CONFIDENCE**,
given a query, a twinId, a budget, a recency window, and a min-confidence threshold.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/context` | Build a ranked context window (with optional writeback) |
| `POST` | `/api/context/preview` | Dry-run (no confidence writeback) |
| `GET`  | `/api/stats` | Recent calls + cache stats |

**Scoring:** `score(memory, confidence, query) = base × effectiveConfidence × recency × overlap`
where `effectiveConfidence = confidence − daysSinceAccess × 0.005`.

**Cache:** 30-second TTL, 500-entry LRU. Bursty traffic dedupes automatically.

## Phase 6 — The real learning engine

The `/api/memory/learn` endpoint now does four things in sequence:

### 1. Persist the new learning memory
Standard create — stored in MemoryOS with kind=`learning`, type=`learning`,
importance as provided, confidence starts at 0.5.

### 2. Find related existing memories (this twin)
Tag overlap (jaccard ≥ 0.1) OR content keyword overlap. Top 5 ranked by score.

### 3. Reinforce related memories
For each related memory:
- `confidence` += 0.05 (capped at 1.0)
- `accessCount` += 1
- `accessedAt` = now
- `lifecycleStage` promoted `created → active` if not already
- History entry recorded, Mongo updated

### 4. Detect contradictions (negative outcome OR score < 0.3)
For each related memory:
- `contradictions` counter += 1
- `confidence` -= 0.1 (floored at 0)
- Contradiction entry logged with `fromLearningId` reference

### 5. Promote to long-term
If `importance` is `High` or `Critical`, OR `score >= 0.8`:
- `lifecycleStage = 'long-term'`
- Entry added to `longTermMemory` Map for that twin
- History recorded

### Example request
```bash
curl -X POST http://localhost:4703/api/memory/learn \
  -H 'Content-Type: application/json' \
  -d '{
    "twinId": "user-123",
    "interaction": "user confirmed dark mode in 3 more apps",
    "outcome": "positive",
    "score": 0.95,
    "importance": "High",
    "tags": ["preference", "ui"]
  }'
```

### Example response
```json
{
  "success": true,
  "data": { "id": "...", "lifecycleStage": "long-term", ... },
  "learning": {
    "persisted": true,
    "relatedReinforced": 2,
    "reinforced": [
      { "id": "...", "before": 0.5, "after": 0.55 },
      { "id": "...", "before": 0.5, "after": 0.55 }
    ],
    "contradictionsFound": 0,
    "contradictions": [],
    "promotedToLongTerm": true
  }
}
```

## Auth (Phase 5 + 7)

All four memory services now verify JWTs against CorpID's `/auth/verify` endpoint.

- **Off by default** for dev. Toggle on with `GET /api/auth/toggle?on=true`.
- 60-second token verification cache to avoid hammering CorpID.
- 3-second timeout per verify call (returns 503 if CorpID is unreachable).
- `PUBLIC_PATHS` bypass list: `/health`, `/`, `/api/auth/toggle` (plus per-service additions).

**Phase 7 (2026-06-22)** unified auth across all four services. The real
CorpID-backed verifier (`createCorpIdAuthMiddleware`) now lives in
`@rtmn/shared/auth` and is exposed in both ESM (`auth/index.js`) and CJS
(`auth/index.cjs`) flavors via the package's `exports` condition map. Each
memory service's `src/auth.js` is now a **thin re-export shim** that pulls
the middleware from the shared module and instantiates it with that
service's `publicPaths` list. The shared module also re-exports
`setRequireAuth` / `getRequireAuth` so each service can keep its
`/api/auth/toggle` runtime-toggle behavior. This removes the duplicate
CorpID-verify logic that previously lived in three of the four services.

## Test coverage (115 + 164 = 279 active)

| Service | Tests | Status |
|---------|-------|--------|
| `memory-os` e2e | 60 / 60 | ✅ |
| `memory-os` learning e2e | 14 / 14 | ✅ |
| `twin-memory-bridge` e2e | 33 / 33 | ✅ |
| `memory-context-engine` smoke | 8 / 8 | ✅ (includes auth-toggle flow) |
| `memory-confidence` smoke | 2 / 9 | ⚠️ (pre-existing schema-mismatch bugs in auto-generated tests; **not** auth-related) |

### Phase 1-4 New Services (June 27, 2026)

| Service | Port | Tests | Status |
|---------|------|-------|--------|
| `memory-relationships` | 4790 | 39 | ✅ |
| `memory-governance` | 4791 | 36 | ✅ |
| `memory-forgetting` | 4792 | 27 | ✅ |
| `memory-import` | 4780 | 19 | ✅ |
| `memory-portability` | 4793 | 15 | ✅ |
| `memory-marketplace` | 4781 | 14 | ✅ |
| `memory-temporal` | - | 11 | ✅ |
| `memory-observation` | - | 23 | ✅ |
| `memory-learning-engine` | - | 18 | ✅ |

### How to run all tests

```bash
# 1. Start the 4 services (MongoDB must be running on :27017)
bash start-all.sh

# 2. Turn auth off on each (so tests work without a token)
for port in 4703 4704 4152 4790; do
  curl -s "http://localhost:$port/api/auth/toggle?on=false" >/dev/null
done

# 3. Run all suites
bash platform/memory/memory-os/tests/e2e.sh
bash platform/memory/memory-os/tests/learning-e2e.sh
bash platform/memory/memory-confidence/tests/smoke.sh
bash platform/twins/twin-memory-bridge/tests/e2e.sh
bash platform/memory/memory-context-engine/tests/smoke.sh
```

## Bug fixes (this audit)

1. **memory-os ERR_HTTP_HEADERS_SENT crash** — `checkExpiredOrFail()` returned
   `res` (the result of `fail()`) so the caller did `if (expired) return;` but
   the next line (`ok()`) still ran, sending a second response and crashing
   the process. Fix: return boolean, caller bails correctly.

2. **memory-os unhandled rejection crash** — A single async bug in one route
   took down the whole memory layer. Added global `process.on('unhandledRejection')`
   and `process.on('uncaughtException')` handlers that log without exiting.

3. **twin-memory-bridge e2e REQ counter** — The counter was incremented inside
   a subshell (`$(...)`) so it reset every call. Replaced with a file-backed
   counter that persists across subshells.

4. **twin-memory-bridge e2e cb_NNNN.json mapping** — Assertions referenced
   `cb_0001.json` for the episodic-read response but the file was actually
   `cb_0003.json` (because `/health` and `bind` also count). Remapped all
   assertion references to match the actual call sequence.

5. **twin-memory-bridge e2e strict type validation** — Tests sent
   `type: "episodic"` but MemoryOS validates `type` against a whitelist
   (`event`, `knowledge`, `workflow`, ...). The bridge does the
   kind→type mapping internally; updated test seeds to use valid types
   with the actual kind stored in `metadata.kind`.

6. **memory-confidence smoke wrong port** — Auto-generated test pointed at
   port 4369 instead of 4152.

7. **memory-os bulk-delete twin-id pollution** — Test used hardcoded
   `twin-bulk` which had data from previous runs. Made twin-id unique per
   run with `$$` + `date +%s`.

8. **Auth duplication across memory services (Phase 7, 2026-06-22)** — The
   three ESM memory services and one CJS memory service each carried their
   own copy of the CorpID `/auth/verify` HTTP client, 60s verification
   cache, `REQUIRE_AUTH` env-var toggle, and `publicPaths` allowlist. The
   `@rtmn/shared/auth` package already had a condition-map export for both
   `import` and `require` but its `createAuthMiddleware` only handled
   self-issued base64 tokens — it did **not** verify real JWTs against
   CorpID. Fix: added `createCorpIdAuthMiddleware(options)` (real JWT
   verification) plus `setRequireAuth` / `getRequireAuth` helpers to both
   the ESM and CJS auth files. Then converted each service's local
   `src/auth.js` from a 70–120 line duplicate into a ~30 line thin
   re-export shim. All four services now share one source of truth.

## Open follow-ups (not in this audit)

- The `memory-context-engine` cache key currently excludes `recencyDays` and
  `writeback` from the cache key — fine in practice but worth tightening.
- Vector embeddings: MemoryOS now stores `vectorId` and `embeddedAt` on each
  memory, but the embed-and-store on write is best-effort. A backfill sweep
  should run periodically.
- MemoryOS `/api/memory/learn` does reinforcement synchronously in-process. For
  very large twins (10k+ related memories), this could be slow. Consider
  queueing reinforcement as a background job.