# Experiment Tracking (4781)

Self-contained ML experiment tracking. Replaces external W&B / MLflow with in-repo service for tighter integration.

## Endpoints

- `GET /health` — health check
- `GET /api/projects` / `POST /api/projects` — list/create projects
- `GET /api/experiments` / `POST /api/experiments` — list/create experiments (filter by `?project_id=`)
- `GET /api/runs` / `POST /api/runs` — list/create runs (filter by `?experiment_id=&status=`)
- `GET /api/runs/:id` — run detail
- `POST /api/runs/:id/finish` — mark run completed
- `POST /api/runs/:id/log` — log a metric point
- `GET /api/runs/:id/metrics` — aggregated metrics (by name, sorted by step)
- `POST /api/runs/:id/artifacts` — register an artifact
- `GET /api/runs/:id/artifacts` — list artifacts
- `POST /api/compare` — compare runs on a metric

## Run

```bash
npm install
PORT=4781 npm start
```

## Test

```bash
./tests/smoke.sh
./tests/e2e.sh
```