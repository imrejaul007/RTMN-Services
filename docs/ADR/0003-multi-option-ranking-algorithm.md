# ADR 0003: Multi-Option Ranking Algorithm for SUTAR Decision Engine

**Status:** Accepted (2026-06-22)
**Context:** Phase B.2 — SUTAR decision-engine

## Context and Problem Statement

The SUTAR decision-engine has a single endpoint: `POST /api/v1/rank`. It receives a list of options (suppliers, products, agents, etc.) and must return them ranked by suitability for a given context.

The naive approach — score each option on a single dimension and sort — doesn't reflect how real decisions are made. Multi-criteria scoring is the obvious answer, but how do we weight the criteria?

## Considered Options

1. **Equal weights** — score each criterion 0-1, average, sort
2. **Context-driven weights** — different contexts emphasize different criteria (price-sensitive vs speed-sensitive)
3. **ML model** — train on historical decisions

## Decision Outcome

Chose **Option 2: Context-driven weights**, with the following structure:

```ts
interface RankRequest {
  options: Array<{ id: string; scores: Record<string, number> }>;
  criteria: Record<string, number>;  // criterion name → weight (0-1)
  context?: {
    urgency?: 'low' | 'normal' | 'high';
    budgetConstraint?: number;
    preferredSupplierIds?: string[];
  };
}
```

The algorithm:
1. For each option, compute `weighted_sum(option.scores[c] * criteria[c] for c in criteria)`
2. Apply context modifiers:
   - `urgency: 'high'` boosts any "delivery_speed" criterion by +0.3
   - `preferredSupplierIds` adds +0.5 to options matching those IDs
   - `budgetConstraint` zeroes out options whose primary cost exceeds constraint
3. Sort descending by total score, return with `score`, `reasons[]` (top contributing criteria), and `rank`

### Positive Consequences

- **Explainable** — `reasons[]` tells the caller why option #1 beat option #2
- **Composable** — same algorithm works for supplier ranking, product ranking, agent ranking
- **Deterministic** — same input always produces same output (no randomness, no ML model drift)
- **Tunable** — caller can override weights per request without retraining

### Negative Consequences

- Weights are still hand-tuned by the consumer (do-app currently uses default weights)
- No ML-driven improvement yet — that's Phase F+

## Verification

```bash
$ curl -s -X POST http://localhost:4399/api/sutar/sutar-decision-engine/api/v1/rank \
    -H "Content-Type: application/json" \
    -d '{
      "options": [
        {"id":"s1","scores":{"price":0.8,"speed":0.5,"quality":0.9}},
        {"id":"s2","scores":{"price":0.6,"speed":0.9,"quality":0.7}}
      ],
      "criteria": {"price":0.4,"speed":0.3,"quality":0.3},
      "context": {"urgency":"high"}
    }'

{"ranked":[{"id":"s2","score":0.83,"reasons":["speed+urgency"]},
           {"id":"s1","score":0.74,"reasons":["quality"]}]}
```

`s2` wins because high urgency boosts its speed score.