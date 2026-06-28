# eval-continuous — Continuous Evaluation Platform

> Phase 31 of the HOJAI AI 40-phase plan.
> Runs eval suites, tracks metrics over time, and gates deployments.

## Quick Start

```bash
cd platform/training/eval-platform/eval-continuous
npm install
npm start        # Port 4888
npm test         # vitest
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness probe |
| POST | `/api/runs` | Trigger an eval run |
| GET | `/api/runs` | List runs (filter: `?service=&suite=&status=&limit=`) |
| GET | `/api/runs/:id` | Get run details |
| GET | `/api/metrics` | Current metrics (`?service=&suite=`) |
| GET | `/api/metrics/trend` | Metrics over time |
| GET | `/api/baseline` | Get baseline (`?service=&suite=`) |
| POST | `/api/baseline` | Set baseline |
| GET | `/api/gates/:service` | Check if deployment is gated (`?suite=`) |
| POST | `/api/gates` | Check multiple services |

## Examples

```bash
# Trigger a run
curl -X POST :4888/api/runs -H 'Content-Type: application/json' \
  -d '{"service":"sutar-economy-os","suite":"vitest"}'

# Set baseline from a run
curl -X POST :4888/api/baseline -H 'Content-Type: application/json' \
  -d '{"service":"sutar-economy-os","suite":"vitest","runId":"<run-id>"}'

# Check if gated
curl :4888/api/gates/sutar-economy-os?suite=vitest
```

## Architecture

- File-based JSON storage in `./data/` (runs.json, baselines.json)
- Simulated eval runner (in production, would exec npm test or curl test services)
- Deployment gating: gated if verdict=fail OR quality regresses >5% vs baseline
- All timestamps in ISO 8601 format

## Env vars

- `PORT` — server port (default 4888)
