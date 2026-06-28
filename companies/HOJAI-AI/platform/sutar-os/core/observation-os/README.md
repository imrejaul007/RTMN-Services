# ObservationOS

## Purpose
Live monitoring, logs, metrics, traces, and cost tracking for AI agents. Think: Datadog for AI agents.

## Key Features
- **Metrics Collection** — Per-agent metrics with aggregation
- **Distributed Tracing** — Operation traces with step-level duration
- **Alerting** — Severity-based alerts (low/medium/high/critical) with firing/resolved/acknowledged states
- **Cost Tracking** — Token and API cost aggregation per agent
- **Dashboard** — Overview of active alerts, critical issues, and latency
- **Time Window Filtering** — Metrics aggregated over configurable windows (1h, 24h)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /ready | Readiness probe |
| POST | /metrics | Submit metric data |
| GET | /api/agents/:agentId/metrics | Get agent metrics (last 100) |
| GET | /api/metrics/aggregate | Aggregate metrics (avg, count) |
| POST | /traces | Submit trace |
| GET | /api/agents/:agentId/traces | Get agent traces (filter by status) |
| POST | /alerts | Create alert |
| GET | /alerts | List alerts (filter by agentId/status) |
| PATCH | /alerts/:id/acknowledge | Acknowledge alert |
| GET | /costs | Cost aggregation (7d/30d) |
| GET | /dashboard | Overview dashboard |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | Yes | 4861 | Service port |

## Dependencies
- express
- @rtmn/shared
- uuid

## Commands
- `npm run dev` — Development mode
- `npm run build` — Build TypeScript
- `npm start` — Production start
- `npm test` — Run tests