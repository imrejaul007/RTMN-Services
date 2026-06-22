# sutar-multi-agent-evaluator

> **Service:** SUTAR OS Multi-Agent Evaluator
> **Port:** 4257
> **Layer:** 7 (Exploration + Discovery + Evaluator + Reputation + ROI)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

Score a multi-agent plan across **5 dimensions**:

| Dimension | What it measures |
|-----------|------------------|
| `completeness` | Fraction of required intents that have an agent assigned |
| `efficiency` | Ratio of agents to intents (more intents per agent = better, capped at 1.0) |
| `redundancy` | 0 if one agent handles all intents, 1 if no agent handles >1 intent |
| `coordination` | `1 / max(1, agentCount)` — fewer agents = lower coordination cost |
| `capability_coverage` | Fraction of required capabilities that are covered by at least one agent's manifest |

Plus an `overall` score (average of all dimensions, 0-1).

Also supports **head-to-head comparison** of N plans and returns a ranked
leaderboard.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + dimensions |
| POST | `/api/evaluations` | Score a single plan |
| GET | `/api/evaluations` | List evaluations (sorted by overall desc) |
| GET | `/api/evaluations/:id` | Get one evaluation |
| POST | `/api/evaluations/compare` | Compare N plans, return ranked winner + rankings |
| GET | `/api/audit` | Recent evaluations |

## Plan shape

```json
{
  "name": "Plan A",
  "intents": [
    { "intentType": "negotiate_price", "agentId": "agent-1", "capabilities": ["negotiate"] },
    { "intentType": "book_table", "agentId": "agent-2", "capabilities": ["transact"] }
  ],
  "requiredCapabilities": ["negotiate", "transact"]
}
```

## Next steps

- Add a 6th dimension: `cost` (each agent has an estimated $/execution cost)
- Add ML-based scoring once we have enough training data
- Persist evaluations + outcomes (which plan was chosen and how it performed)
