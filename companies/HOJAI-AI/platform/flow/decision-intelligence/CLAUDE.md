# Decision Intelligence Service v1.0

> **Port:** 4756
> **Division:** HOJAI AI - Division 3 (Intelligence Cloud)
> **Status:** ✅ Production Ready (in-memory, single-process)
> **Layer:** Department OS / AI Infrastructure

AI-powered decision support and recommendation engine. Implements the **Decision Intelligence** + **Recommendation Intelligence** modules of HOJAI AI's Division 3 (Intelligence Cloud). Provides next-best-action recommendations, content recommendations, and multi-criteria decision analysis.

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/decision-intelligence
npm install
npm start
# or: PORT=4756 node src/index.js
```

```bash
curl http://localhost:4756/health
```

---

## Capabilities

### 1. Recommendation Engine
Four algorithms on a user-item affinity matrix (built from an event log):
- **Collaborative filtering** — item-item cosine similarity over user event vectors
- **Content-based** — tag + attribute overlap with the user profile (Jaccard on tags)
- **Popularity** — most-interacted-with items globally
- **Hybrid** — configurable weighted blend (default `collaborative=0.5, content=0.3, popularity=0.2`)

Event types and weights: `view=1, click=2, like=3, purchase=5`.

### 2. Next Best Action (NBA)
For sales / customer success — score each candidate action by:
```
score = (expectedValue * p(success) * goalAlignment) - cost
```
`p(success)` is estimated from `customer.tier`, `customer.lifecycleStage`, and `customer.nps`. `goalAlignment` is a lookup over the action's tags for the requested goal.

Supported goals: `revenue`, `retention`, `expansion`, `engagement`.

### 3. Decision Framework
- **WSM** (Weighted-Sum Model) — sum of normalized weighted scores; optional sensitivity sweep on one criterion.
- **TOPSIS** (Technique for Order Preference by Similarity to Ideal Solution) — column-normalize, weight, compute closeness coefficient to the positive-ideal solution. Supports positive/negative impact criteria.

---

## Endpoints (18)

### Recommendations
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/recommend/items` | Top-k items for a user |
| `POST` | `/api/recommend/items/batch` | Top-k for many users |
| `POST` | `/api/recommend/event` | Record a user-item interaction |
| `GET`  | `/api/recommend/similarity/:itemId` | Find similar items (collaborative + content) |

### Next Best Action
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/nba` | Rank candidate actions for a customer |
| `POST` | `/api/nba/actions` | Register a reusable action template |
| `GET`  | `/api/nba/actions` | List templates |

### Decision Framework
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/decision/wsm` | Weighted-Sum Model with optional sensitivity analysis |
| `POST` | `/api/decision/topsis` | TOPSIS closeness-coefficient ranking |

### Status & Introspection
| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/health` | Liveness + counts (also `/health` redirects) |
| `GET`  | `/api/stats` | Aggregate counts |
| `GET`  | `/api/audit` | Audit log (filterable by `op`, `principal`, `limit`) |
| `GET`  | `/api/methods` | List available algorithms |

---

## Examples

### Get hybrid recommendations for a user
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"userId":"u1","k":3}' \
  http://localhost:4756/api/recommend/items
```

### Record an event
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"userId":"u1","itemId":"i3","eventType":"purchase"}' \
  http://localhost:4756/api/recommend/event
```

### Next best action for a churn-risk customer
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "customer": {"tier":"gold","lifecycleStage":"churn_risk","nps":-10},
    "goal":"retention"
  }' \
  http://localhost:4756/api/nba
```

### WSM vendor selection
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "alternatives":[
      {"name":"VendorA","scores":{"price":0.7,"quality":0.8,"support":0.6}},
      {"name":"VendorB","scores":{"price":0.5,"quality":0.9,"support":0.8}},
      {"name":"VendorC","scores":{"price":0.9,"quality":0.6,"support":0.5}}
    ],
    "weights":{"price":0.3,"quality":0.5,"support":0.2}
  }' \
  http://localhost:4756/api/decision/wsm
```

### TOPSIS ranking
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "alternatives":[
      {"name":"X","scores":{"cost":250,"speed":5,"reliability":0.95}},
      {"name":"Y","scores":{"cost":300,"speed":8,"reliability":0.90}},
      {"name":"Z","scores":{"cost":200,"speed":4,"reliability":0.85}}
    ],
    "criteria":["cost","speed","reliability"],
    "weights":{"cost":0.4,"speed":0.3,"reliability":0.3},
    "impacts":{"cost":"negative","speed":"positive","reliability":"positive"}
  }' \
  http://localhost:4756/api/decision/topsis
```

---

## Pre-seeded Data

- **5 users** — `u1`..`u5` with diverse tiers, regions, and tag preferences
- **20 items** — `i1`..`i20` across SaaS, CRM, analytics, marketing, hospitality, etc.
- **~50 sample events** — deterministic seeded interactions so hybrid recommendations return useful results on first call
- **3 NBA templates** — "Send NPS survey", "Offer upgrade discount", "Schedule check-in call"

The recommender works cold-start: if a user has no history, the hybrid blends in popularity + content from their profile tags.

---

## Data Model

All state lives in-process. Maps to swap for a real database:

| In-memory | Schema |
|-----------|--------|
| `users: Map<id, {id,name,preferences[],tier,attributes}>` | `users` table |
| `items: Map<id, {id,name,tags[],popularity,attributes}>` | `items` table |
| `events: Array<{id,userId,itemId,eventType,weight,timestamp,metadata}>` | `events` table (append-only) |
| `userItemAffinity: Map<userId, Map<itemId, score>>` | derived view (recomputable) |
| `nbaTemplates: Map<id, template>` | `nba_templates` table |
| `auditLog: Array<{id,timestamp,op,...}>` | `audit_log` table |

`recomputeAffinity()` is called after every event write; safe to call concurrently because it runs single-threaded in the Node event loop.

---

## Constraints

- Pure CommonJS, no TypeScript
- `Math` built-ins only — no external ML libraries (cosine / Jaccard are inlined)
- In-memory `Map` storage; not horizontally scaled
- Single-process; affinity recompute is O(events)

## Future Work

- Persistent store (PostgreSQL / MongoDB)
- Item-item precomputation cache (avoid recompute on every `/items` call)
- Real ML backend (matrix factorization, embeddings) via HOJAI Intelligence (4881)
- Tenant scoping and JWT-bound audit (via CorpID)
- A/B testing wrapper for hybrid weights

---

*Part of HOJAI AI Division 3 — Intelligence Cloud. Companion services: `customer-intelligence` (4885), `sales-intelligence` (5181), `ai-intelligence` (4881).*
