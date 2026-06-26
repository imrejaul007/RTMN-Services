# TwinOS Graph Engine Upgrade Plan

**Date:** June 26, 2026
**Status:** Planning
**Owner:** RTMN / HOJAI AI

---

## Context

TwinOS (28 services, `platform/twins/`) provides a digital twin registry and relationship graph across the RTMN ecosystem. The current twinos-hub (4705) has **two phases of relationship enrichment already built** (Phase 1: trust/strength metadata; Phase 2: path finding), but three architectural layers from the 8-layer graph engine vision are entirely missing:

1. **Temporal edges** — relationships have no `start_time`/`end_time` for time-ranged and historical queries
2. **Event graph** — timeline entries are append-only logs, not graph nodes with causal links
3. **Dedicated graph engine** — BFS lives inside twinos-hub instead of a separate service

And one capability is missing entirely:
4. **Natural-language-to-graph-query layer** — Genie, CoPilot, and SUTAR cannot query the graph in natural language

---

## Audit Summary (Current State)

| Layer | Coverage | Location |
|---|---|---|
| Twin Registry | 70% ✅ | twinos-hub/src/index.js:92–354 |
| Graph Engine (BFS) | 50% ⚠️ | twinos-hub/src/index.js:2069–2199 |
| Relationship Engine (enriched) | 65% ⚠️ | twinos-hub/src/index.js:816–1053 |
| Temporal Engine | 0% ❌ | Missing |
| Event Graph | 0% ❌ | Missing (timeline is flat log, not graph) |
| Trust Engine | 25% ⚠️ | trust_score field + Nexha ReputationOS (external) |
| Semantic Layer | 30% ⚠️ | twin-capability-profile (port 4150) |
| Query Engine | 25% ⚠️ | Basic filter/search only |

**Key finding:** twinos-hub already has relationship enrichment (Phase 1, lines 915–1053) with `trust_score`, `strength`, `last_interaction`, `shared_memories`, `since`, `until` — but **no temporal queries**, **no graph algorithms**, and **no NL query layer**.

---

## Phase 1: Temporal Relationship Engine (within twinos-hub)

**File to change:** `platform/twins/twinos-hub/src/index.js`

### Changes

1. **Upgrade relationship schema** (lines 864–879) — already has `since`/`until` but they're not enforced:
   - Add `start_time` (ISO string, default: `now`)
   - Add `end_time` (ISO string, default: `null` = active)
   - Add `effective_range` computed field
   - Rename `until` → `end_time` for clarity

2. **Add temporal BFS** (new section after line 2199):
   ```
   GET /api/relationships/graph/:twinId?at=2024-03-15
   GET /api/relationships/graph/:twinId?from=2024-01-01&to=2024-06-01
   ```
   - Filter edges where `start_time <= query_at <= end_time` (or `end_time` is null)
   - Return temporal metadata in response (`active_at`, `expired`, `temporal_depth`)

3. **Add relationship validity endpoints**:
   ```
   POST /api/relationships/:id/expire
   PUT /api/relationships/:id/reactivate
   GET /api/relationships/history/:twinId?from=&to=
   ```

4. **Add time-travel query**:
   ```
   GET /api/graph/snapshot?at=2024-03-15
   ```
   Returns all twins and relationships as they existed at that timestamp.

### Files affected
- `twinos-hub/src/index.js` — ~80 lines added (temporal BFS + new endpoints)
- `twinos-hub/__tests__/twinos-hub.test.ts` — add temporal relationship tests (~20 new tests)

---

## Phase 2: twinos-graph-engine Service (NEW)

**New directory:** `platform/twins/twinos-graph-engine/`
**Suggested port:** **4715**
**Pattern:** Mirror twin-capability-profile (port 4150) structure

### Service Architecture

```
twinos-graph-engine (4715)
├── src/
│   ├── index.js           # Express server, all routes
│   ├── graph/
│   │   ├── algorithms.js  # BFS, DFS, Dijkstra, PageRank, community detection
│   │   ├── traversal.js   # Temporal BFS, weighted traversal
│   │   └── analytics.js   # Centrality, clustering, path analysis
│   └── stores/
│       └── graph-cache.js # In-memory graph materialized view (refreshes from twinos-hub)
├── __tests__/
│   └── twinos-graph-engine.test.ts
├── package.json
└── vitest.config.js
```

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/graph/traverse/:twinId` | BFS with depth, type, temporal filters |
| `GET` | `/api/graph/path` | Shortest path (BFS) |
| `GET` | `/api/graph/communities` | Louvain community detection |
| `GET` | `/api/graph/centrality` | PageRank + betweenness centrality |
| `GET` | `/api/graph/influencers` | Top-N by centrality score |
| `POST` | `/api/graph/recommend` | "Who should X connect with?" |
| `GET` | `/api/graph/stats` | Global graph statistics |

### Graph Algorithms (in `algorithms.js`)

1. **BFS traversal** — already in twinos-hub, ported here with temporal support
2. **Shortest path** (BFS) — already in twinos-hub, ported here
3. **PageRank** — iterative power method on the adjacency list
4. **Community detection** — Louvain algorithm (greedy modularity optimization)
5. **Betweenness centrality** — Brandes' algorithm
6. **Weighted traversal** — Dijkstra using `strength * trust_score` as edge weight

### Graph Cache

The service maintains an in-memory materialized view of the twin relationship graph (reads from twinos-hub's `twinRelationships` store via HTTP). Refreshes:
- On startup
- On webhook from twinos-hub (new `relationship.changed` event)
- On-demand via `POST /api/graph/refresh`

### Dependencies

```json
{
  "@rtmn/twinos-shared": "file:../twinos-shared",
  "express": "^4.18.2",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "compression": "^1.7.4",
  "morgan": "^1.10.0",
  "uuid": "^9.0.1"
}
```

### Files to create
- `platform/twins/twinos-graph-engine/package.json`
- `platform/twins/twinos-graph-engine/src/index.js` (~500 lines)
- `platform/twins/twinos-graph-engine/src/graph/algorithms.js` (~300 lines)
- `platform/twins/twinos-graph-engine/src/graph/traversal.js` (~150 lines)
- `platform/twins/twinos-graph-engine/src/graph/analytics.js` (~150 lines)
- `platform/twins/twinos-graph-engine/__tests__/twinos-graph-engine.test.ts` (~60 tests)
- `platform/twins/twinos-graph-engine/vitest.config.js`

---

## Phase 3: twinos-query-engine Service (NEW)

**New directory:** `platform/twins/twinos-query-engine/`
**Suggested port:** **4717**
**Pattern:** LLM-powered natural language interface to the graph

### Service Architecture

```
twinos-query-engine (4717)
├── src/
│   ├── index.js           # Express server
│   ├── nl-parser.js       # LLM prompt to extract { twinTypes, relTypes, timeRange, traversal }
│   ├── query-builder.js   # Converts parsed intent → graph query params
│   └── response-formatter.js # Formats graph results → natural language explanation
├── __tests__/
│   └── twinos-query-engine.test.ts
├── package.json
└── vitest.config.js
```

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/query` | Natural language → graph result |
| `GET` | `/api/query/explain` | "What does this query mean?" |
| `POST` | `/api/query/examples` | Example queries for a twin type |

### Main endpoint

```
POST /api/query
{
  "question": "Which customers who bought from merchant X also interacted with merchant Y in the last 30 days?",
  "twinId": "mer-X",
  "depth": 2
}
```

**Response:**
```json
{
  "answer": "Customer A and Customer B both purchased from Merchant X and have recent interactions with Merchant Y.",
  "query": {
    "from": "mer-X",
    "relTypes": ["purchased_from"],
    "toTwinType": "mer-Y",
    "relTypes2": ["interacted_with"],
    "timeRange": "last_30_days"
  },
  "results": { "nodes": [...], "edges": [...] },
  "confidence": 0.87,
  "explanation": "Found 2 customers: Customer A (trust: 0.82, last interaction: 3 days ago), Customer B (trust: 0.91, last interaction: 12 days ago)"
}
```

### LLM Parser Design

The `nl-parser.js` uses a structured prompt to extract graph query parameters:

```
You are a graph query parser. Given a natural language question about twin relationships, extract:
- sourceTwinType: the type of twin to start from
- relationshipTypes: types of relationships to follow
- targetTwinType: the type of twin to find
- timeRange: { from, to } or "last_N_days"
- filters: additional constraints (min_trust, min_strength)

Return JSON only. No explanation.
```

**LLM backend:** Uses Memory Context Engine (port 4793) or a configurable LLM endpoint. Falls back to rule-based extraction if LLM is unavailable.

### Query Pipeline

1. **Parse** — NL → structured query params (LLM or rule-based)
2. **Validate** — check twin types and relationship types exist
3. **Traverse** — call twinos-graph-engine (4715) with computed params
4. **Format** — transform graph result → natural language answer + data

### Files to create
- `platform/twins/twinos-query-engine/package.json`
- `platform/twins/twinos-query-engine/src/index.js` (~400 lines)
- `platform/twins/twinos-query-engine/src/nl-parser.js` (~200 lines)
- `platform/twins/twinos-query-engine/src/query-builder.js` (~150 lines)
- `platform/twins/twinos-query-engine/src/response-formatter.js` (~100 lines)
- `platform/twins/twinos-query-engine/__tests__/twinos-query-engine.test.ts` (~40 tests)
- `platform/twins/twinos-query-engine/vitest.config.js`

---

## Phase 4: Event Graph (within twinos-hub)

**File to change:** `platform/twins/twinos-hub/src/index.js`

### Changes

1. **Event nodes as graph citizens** — Add `caused_by` and `causes` fields to timeline events:
   ```javascript
   {
     id: `evt-${uuidv4().slice(0, 8)}`,
     twinId,
     type: 'state_change',
     at: new Date().toISOString(),
     by: 'system',
     payload: { from: 'active', to: 'suspended' },
     caused_by: null,      // null = root cause, or points to another event ID
     causes: [],           // IDs of events this event triggered
     confidence: 1.0       // certainty of causality
   }
   ```

2. **Causal chain endpoint**:
   ```
   GET /api/events/:eventId/causes    # Trace back to root cause
   GET /api/events/:eventId/effects   # Find all downstream effects
   GET /api/events/chain?from=&to=    # Find causal path between two events
   ```

3. **Event-based graph traversal**:
   ```
   GET /api/graph/affected?eventId=X  # Find all twins affected by this event
   GET /api/graph/event-history/:twinId # Full causal history of a twin
   ```

### Files affected
- `twinos-hub/src/index.js` — ~60 lines added (causal event schema + endpoints)

---

## Phase 5: Wire Everything Together

1. **Update RTMN Hub** (`services/unified-os-hub/`) — add routes:
   - `/api/twinos/graph-engine/*` → `localhost:4715`
   - `/api/twinos/query-engine/*` → `localhost:4717`

2. **Add startup script** — extend `start-twins.sh`:
   ```bash
   # Existing (ports 4705, 4704, 4793, etc.)
   # Add:
   node platform/twins/twinos-graph-engine/src/index.js &
   node platform/twins/twinos-query-engine/src/index.js &
   ```

3. **Add to CLAUDE.md** — document new ports 4715 and 4717

---

## File Manifest

| Action | File | Lines |
|---|---|---|
| Modify | `platform/twins/twinos-hub/src/index.js` | +140 |
| Modify | `platform/twins/twinos-hub/__tests__/twinos-hub.test.ts` | +20 tests |
| Create | `platform/twins/twinos-graph-engine/package.json` | ~25 |
| Create | `platform/twins/twinos-graph-engine/src/index.js` | ~500 |
| Create | `platform/twins/twinos-graph-engine/src/graph/algorithms.js` | ~300 |
| Create | `platform/twins/twinos-graph-engine/src/graph/traversal.js` | ~150 |
| Create | `platform/twins/twinos-graph-engine/src/graph/analytics.js` | ~150 |
| Create | `platform/twins/twinos-graph-engine/__tests__/twinos-graph-engine.test.ts` | ~200 |
| Create | `platform/twins/twinos-graph-engine/vitest.config.js` | ~10 |
| Create | `platform/twins/twinos-query-engine/package.json` | ~25 |
| Create | `platform/twins/twinos-query-engine/src/index.js` | ~400 |
| Create | `platform/twins/twinos-query-engine/src/nl-parser.js` | ~200 |
| Create | `platform/twins/twinos-query-engine/src/query-builder.js` | ~150 |
| Create | `platform/twins/twinos-query-engine/src/response-formatter.js` | ~100 |
| Create | `platform/twins/twinos-query-engine/__tests__/twinos-query-engine.test.ts` | ~120 |
| Create | `platform/twins/twinos-query-engine/vitest.config.js` | ~10 |
| **Total** | **17 files** | **~2,510 lines** |

---

## Implementation Order

```
Week 1-2: Phase 1 (Temporal Engine) — modify twinos-hub
          → 4 files changed, lowest risk, immediate value

Week 3-5: Phase 2 (Graph Engine Service) — new service at port 4715
          → 7 files created, most algorithmic work

Week 6-7: Phase 4 (Event Graph) — extend twinos-hub
          → causal event schema + 3 new endpoints

Week 8-9: Phase 3 (Query Engine) — new service at port 4717
          → 6 files created, LLM integration

Week 10: Phase 5 (Wiring) — RTMN Hub routes + startup scripts + docs
```

---

## Verification

After each phase, run:
```bash
cd platform/twins/twinos-hub && npm test
cd platform/twins/twinos-graph-engine && npm test    # after Phase 2
cd platform/twins/twinos-query-engine && npm test   # after Phase 3
```

Expected test counts after all phases:
- twinos-hub: ~50 tests (+20)
- twinos-graph-engine: ~60 tests (new)
- twinos-query-engine: ~40 tests (new)

---

## Rollback Plan

If any phase causes issues:
- **Phase 1:** Revert twinos-hub changes — temporal fields are additive, won't break existing queries
- **Phase 2:** Delete `twinos-graph-engine/` directory — twinos-hub's BFS remains intact
- **Phase 3:** Delete `twinos-query-engine/` directory — NL endpoint is new, no dependencies
- **Phase 4:** Revert twinos-hub event changes — causal fields are additive
- **Phase 5:** Remove routes from RTMN Hub — no data loss possible

---

## Open Questions (for user)

1. **LLM backend for query engine** — should we use Memory Context Engine (port 4793), a dedicated AI service, or make it pluggable?
2. **Persistent storage** — twinos-graph-engine uses in-memory cache. Should it persist to disk (leveldb/rocksdb) or stay ephemeral?
3. **Priority** — should Phase 3 (NL query engine) go before Phase 4 (event graph)? Event graph is architecturally foundational; NL query is higher-value for Genie/CoPilot users.
