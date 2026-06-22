# sutar-reputation-aggregator

> **Service:** SUTAR OS Reputation Aggregator
> **Port:** 4258
> **Layer:** 7 (Exploration + Discovery + Evaluator + Reputation + ROI)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

Aggregate reputation signals from **5 sources** into a single canonical
score per entity (agent, twin, contract, organization):

| Source | What it represents |
|--------|---------------------|
| `agent-reputation` | From `/services/agent-reputation` (4820) |
| `contracts` | Score derived from contract success rate (signed/fulfilled/settled) |
| `network-routing` | Score derived from message delivery success rate in `/services/sutar-agent-network` |
| `memory-attestations` | Score derived from cross-attestations in `/services/sutar-identity` |
| `manual` | Manually set score (admin override) |

Aggregate = simple average of all source scores (0-100). Equal weights for
now; can add per-source weights later.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + sources list |
| POST | `/api/entities` | Register an entity with initial source scores |
| GET | `/api/entities` | List entities (filter by ?type, sorted by aggregate desc) |
| GET | `/api/entities/:id` | Get one entity |
| POST | `/api/entities/:id/scores` | Add or update a source score |
| GET | `/api/leaderboard` | Top-N entities (filter by ?type, default n=10) |
| POST | `/api/entities/:id/sync` | Best-effort sync from agent-reputation (4820) |
| GET | `/api/audit` | Recent changes |

## Entity shape

```json
{
  "entityId": "agent-restaurant-001",
  "type": "agent",
  "scores": {
    "agent-reputation": 85,
    "contracts": 90,
    "network-routing": 88,
    "memory-attestations": 80
  },
  "aggregate": 85.75,
  "lastUpdated": "2026-06-20T..."
}
```

## Next steps

- Add per-source weights (configurable)
- Compute `contracts` and `network-routing` scores automatically by pulling
  from `/services/sutar-contracts` and `/services/sutar-agent-network`
- Persist entities to MongoDB (currently in-memory Map)
- Add a decay function so older scores count less over time
