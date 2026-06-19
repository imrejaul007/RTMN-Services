# Evaluation Harness (4775)

> **Status:** ✅ Production-ready v1.0.0 (in-memory, 800 lines index + 8 scorer modules)
> **Owner:** HOJAI AI Platform team
> **Last updated:** June 19, 2026

---

## Purpose

The **quality control layer** for every LLM call in HOJAI AI. Define benchmarks (collections of test cases), run them against any model, score responses, compare results. Lets you measure model/prompt changes **before shipping** — the difference between "we shipped it and it got worse" and "we shipped it and we know it's better".

## Why this exists

Every model upgrade, every prompt tweak, every fine-tune is a regression risk. Without an eval harness:
- You change a prompt and don't know if quality went up or down
- You upgrade gpt-4o → gpt-4o-2024-08 and discover 3 weeks later that JSON-mode output broke
- You fine-tune a model and ship it because "the loss went down" without measuring actual quality

With the eval harness:
```javascript
// Run a benchmark against a model
const run = await fetch('http://localhost:4775/api/run', {
  method: 'POST',
  body: JSON.stringify({
    benchmarkId: 'basic-qa',
    model: 'gpt-4o-mini',
    scorerTypes: ['exact-match', 'substring-match']
  })
});
// → returns run with per-test-case scores + aggregate pass rate

// Compare two runs to see which version is better
const cmp = await fetch('http://localhost:4775/api/compare', {
  method: 'POST',
  body: JSON.stringify({ runIdA: '...', runIdB: '...' })
});
// → winner + per-test-case deltas
```

## How a run executes

```
Client → POST /api/run
       ↓
   For each test case in benchmark:
       ↓
       1. Apply promptTemplate ({{input}} substitution)
       2. POST to inference-gateway (4770) /api/complete with the prompt
       3. Get back {text, usage, latencyMs}
       4. Run each scorer from scorerTypes
       5. Store per-test-case result
       ↓
   Aggregate scores, pass rate, total tokens, total cost
       ↓
   Return full Run object
```

If inference-gateway is unreachable for one test case, the case is marked with `{error, score: 0, passed: false}` but the run continues for other cases.

## The 8 scorer types

Each in `src/eval/*.js`:

| Scorer | Returns | Use case |
|--------|---------|----------|
| `exact-match` | 0 or 1 | Closed-form QA with one correct answer |
| `substring-match` | 0 or 1 (fraction matched) | "Output must mention X" |
| `substring-absence` | 0 or 1 | "Output must NOT mention Y" |
| `json-schema-match` | 0 or 1 | Structured output validation |
| `token-overlap` | 0-1 (Jaccard) | Soft similarity (open-ended answers) |
| `levenshtein-similarity` | 0-1 | Edit-distance similarity |
| `numeric-tolerance` | 0-1 | Numeric answers within ±tolerance |
| `regex-match` | 0 or 1 | Custom pattern matching |

Each scorer is `{type, description, score}`. Read the source of each file to confirm the actual export shape.

## Endpoint inventory

### Benchmark CRUD
- `POST /api/benchmarks`
- `GET /api/benchmarks` (filter `?category=`)
- `GET /api/benchmarks/:idOrSlug`
- `PATCH /api/benchmarks/:idOrSlug`
- `DELETE /api/benchmarks/:idOrSlug`
- `POST /api/benchmarks/:idOrSlug/test-cases`

### Run
- `POST /api/run` — body `{benchmarkId, model, promptTemplate?, scorerTypes?}`
- `GET /api/runs` (filter `?benchmarkId=` or `?model=`)
- `GET /api/runs/:runId`
- `DELETE /api/runs/:runId`

### Compare
- `POST /api/compare` — body `{runIdA, runIdB}`
- `GET /api/comparisons` / `GET /api/comparisons/:id`

### Scorers
- `GET /api/scorers` / `GET /api/scorers/:type`

### Stats & audit
- `GET /api/stats` / `GET /api/audit`
- `GET /api/health` (and `/health` redirect)

## Pre-seeded data

- 2 benchmarks:
  - `basic-qa` — 10 factual questions, scored with exact-match + substring-match
  - `json-format` — 5 JSON-output requests, scored with json-schema-match
- 2 example runs (one per model) with stubbed responses
- 1 example comparison

## CI/CD use case

```yaml
# .github/workflows/llm-regression.yml
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - run: npm start &  # spin up gateway, harness
      - run: |
          curl -X POST http://localhost:4775/api/run \
            -H "Content-Type: application/json" \
            -d '{"benchmarkId":"basic-qa","model":"gpt-4o-mini"}'
          # fail the PR if pass rate dropped below baseline
```

## See also

- [services/inference-gateway/](../inference-gateway/) — what this calls to produce outputs
- [services/prompt-manager/](../prompt-manager/) — change a prompt, run a benchmark
- [services/model-registry/](../model-registry/) — upgrade a model version, run a benchmark
- [Division 7 — Training & Model Platform](../companies/HOJAI-AI/divisions/07-training-model-platform/CLAUDE.md)
