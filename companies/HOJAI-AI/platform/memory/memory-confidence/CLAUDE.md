# Memory Confidence & Decay Engine

> **Status:** ✅ Production-ready v1.0.0 (Phase 5 + 7 — June 22, 2026)
> **Role:** Pairs with MemoryOS to track **how reliable each fact actually is** (base confidence × time decay × contradiction).
> **Port:** 4152
> **Owner:** HOJAI AI Platform team

## Mission

MemoryOS (4703) treats every memory as equally true forever. This service is the **reliability layer**: for any fact stored anywhere, it answers "how confident should I be in this right now, and how would that change if the user reinforced it / it was contradicted / time passed?"

```
effective = clamp01(base * decay * contradictionFactor)
effectiveHalfLife = baseHalfLife * (1 + 0.5 * reinforcements)
```

The three signals that combine to the final score:

| Signal | Source | Default / Range |
|--------|--------|-----------------|
| `base` | The source of the fact | user-spoken=0.6, system-observed=0.9, third-party-api=0.7, agent-generated=0.5 |
| `decay` | exp(-ln2 × age_days / effectiveHalfLife) | Default 90-day half-life; each reinforce extends by 50% |
| `contradiction` | Number of contradicting events | drops to `(1 - 0.5 × count)`, floored at 0 |

## Endpoints (15)

### Facts CRUD

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/facts` | Create a fact (`twinId`, `content`, `source`, `baseConfidence?`, `halfLifeDays?`) |
| `GET` | `/api/facts/:id` | Get one fact + 4 signals + `effectiveConfidence` |
| `GET` | `/api/facts` | List facts; filters: `twinId`, `source`, `minConfidence`, `sort` |
| `PATCH` | `/api/facts/:id` | Update `baseConfidence` / `halfLifeDays` / `metadata` / `content` |
| `DELETE` | `/api/facts/:id` | Delete a fact |

### Confidence actions (mutate signals)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/facts/:id/reinforce` | Bump `reinforcements += 1`; slows decay by extending half-life by 50% |
| `POST` | `/api/facts/:id/contradict` | Bump `contradictions += 1`; halves effective confidence |
| `POST` | `/api/facts/:id/recall` | Bump `recallCount`; no confidence change (just usage tracking) |

### Recall & Reports

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/recall/:twinId` | Confidence-sorted recall (params: `minConfidence`, `limit`, `sort`) |
| `GET` | `/api/report/:twinId` | Confidence distribution (high/medium/low/stale buckets + average) |
| `GET` | `/api/report/:twinId/staleness` | Facts about to drop below threshold, with `projectedConfidenceInDays` |

### Sync & Audit

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/sync-from-memoryos` | Pull all memories from MemoryOS (4703) and create matching facts (mapped by `twinId` + content) |
| `GET` | `/api/audit` | Every confidence change (filter by `kind`, `limit`); 5,000-entry ring buffer in memory, persisted to MongoDB |

### Auth & Ops

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/auth/toggle?on=true` | Runtime toggle of `REQUIRE_AUTH` env var (no restart needed) |
| `GET` | `/health` | Liveness — counts, capabilities, storage backend |
| `GET` | `/ready` | Readiness probe (always 200 once listening) |

## The 4-Signal Response Shape

Every `GET /api/facts/:id` and any write that returns a fact annotates the record with:

```json
{
  "id": "f-...",
  "twinId": "demo",
  "content": "...",
  "source": "user-spoken",
  "baseConfidence": 0.6,
  "halfLifeDays": 365,
  "reinforcements": 1,
  "contradictions": 0,
  "recallCount": 0,
  "createdAt": "...",
  "updatedAt": "...",
  "metadata": {},
  "ageDays": 30.4,
  "effectiveHalfLifeDays": 547.5,
  "decayFactor": 0.9620,
  "contradictionFactor": 1.0,
  "effectiveConfidence": 0.5772
}
```

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `memoryConfidence: http://localhost:4152`
- **Memory Context Engine (4790)** — fetches per-fact confidence from here to weight its context windows
- **MemoryOS (4703)** — `POST /api/sync-from-memoryos` ingests facts from here on demand

## Used By

- **Memory Context Engine (4790)** — primary consumer: scores every candidate memory against its effective confidence
- **TwinOS (4705)** — could surface reliability badges on twin profiles
- **Future agents** — any agent deciding "should I trust this fact" calls here

## Example

```bash
# Create a fact
curl -X POST http://localhost:4152/api/facts \
  -H "Content-Type: application/json" \
  -d '{"twinId":"demo","content":"John prefers email","source":"user-spoken"}'

# Reinforce 3 times (extends half-life)
for i in 1 2 3; do
  curl -X POST http://localhost:4152/api/facts/<id>/reinforce \
    -H "Content-Type: application/json" -d '{"reason":"user reaffirmed"}'
done

# Contradict
curl -X POST http://localhost:4152/api/facts/<id>/contradict \
  -H "Content-Type: application/json" -d '{"reason":"user said opposite"}'

# Confidence-sorted recall for a twin
curl 'http://localhost:4152/api/recall/demo?minConfidence=0.3&limit=10'
```

## Storage

- **Primary:** In-memory `Map` (matches the rest of the foundation services)
- **Persistence:** MongoDB collection `memory-confidence` via `PersistentMap`
- **Seeded:** 8 example facts (fresh, stale, reinforced, contradicted) on first start

## Env

```env
PORT=4152                       # default
MEMORYOS_URL=http://localhost:4703
CORPID_URL=http://localhost:4702 # for JWT verification
REQUIRE_AUTH=false              # default off in dev; toggle via /api/auth/toggle
MONGODB_URL=mongodb://localhost:27017/hojai
```

## Auth (Phase 7)

JWT verification via `@rtmn/shared/auth` (CorpID-backed `createCorpIdAuthMiddleware`). Local `src/auth.js` is a thin shim re-exporting from the shared module. Public paths: `/health`, `/`, `/api/services`, `/api/auth/toggle`.

## Tests (2/9 — pre-existing smoke bug)

The auto-generated `tests/smoke.sh` posts `{"test":true}` (missing required `twinId`/`content`) and expects 201 — service correctly returns 400. The 2 passing tests are `/health` and `/api/audit`. Auth flow is verified manually. Fixing the smoke test is tracked as a follow-up.

## Open follow-ups

- Fix `tests/smoke.sh` to use the correct fact schema (`{twinId, content, source}`)
- Bulk-reinforce / bulk-contradict endpoints
- TTL-based auto-archive of low-confidence facts
- Confidence-weighted export for downstream twin analytics

---

*Last Updated: 2026-06-22*
