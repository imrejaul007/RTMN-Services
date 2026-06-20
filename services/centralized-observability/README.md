# Centralized Observability (4153)

Foundation service that aggregates **metrics**, **traces**, **logs**, and **alerts** from across the HOJAI AI / RTMN ecosystem into one queryable hub. Pairs with the future observability-apis service (4172) for SDK-level access.

## Endpoints

- `GET  /health` / `/ready`
- `POST /api/metrics` — push a metric sample
- `GET  /api/metrics` — list/filter metrics
- `GET  /api/metrics/aggregate` — count/sum/avg/p50/p95/p99
- `POST /api/traces` — record a trace with spans
- `GET  /api/traces` / `GET /api/traces/:id`
- `POST /api/logs` — push a log line
- `GET  /api/logs` — search/filter
- `GET  /api/alerts` / `POST /api/alerts` / `PATCH /api/alerts/:id`
- `GET  /api/dashboards` / `POST /api/dashboards`
- `GET  /api/stats`

## Seed

8 metric samples (http_requests, ai_inference, db_query, cache_hit_ratio), 4 traces, 4 alerts (2 firing, 1 resolved, 1 warning), 2 dashboards.

## Run

```
npm install && npm start
bash tests/smoke.sh
bash tests/e2e.sh
```