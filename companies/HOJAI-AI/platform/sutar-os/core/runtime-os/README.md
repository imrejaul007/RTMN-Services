# RuntimeOS

## Purpose
Agent lifecycle, scheduling, resource limits, scaling, and hot swaps for AI agents. Think: Kubernetes for AI employees.

## Key Features
- **Agent Lifecycle** — Create, start, stop, pause, restart agents
- **Resource Management** — CPU, memory, and token quotas per agent
- **Scheduling** — Cron-based job scheduling for agents
- **Pods** — Agent grouping with isolation levels (shared/sandbox/dedicated)
- **Auto-scaling** — Min/max instance scaling per pod
- **Event Logging** — Complete audit trail of agent lifecycle events

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check with agent counts |
| GET | /ready | Readiness probe |
| GET | /api/agents | List agents (filter by status/type) |
| POST | /api/agents | Create new agent |
| PATCH | /api/agents/:id/status | Update agent status |
| POST | /api/agents/:id/restart | Restart agent |
| DELETE | /api/agents/:id | Stop agent |
| POST | /api/agents/:id/resources | Update resource limits |
| GET | /api/quotas/:teamId | Get team quota |
| POST | /api/quotas | Create team quota |
| GET | /api/schedule | List schedules (filter by agentId) |
| POST | /api/schedule | Create schedule |
| PATCH | /api/schedule/:id | Update schedule |
| GET | /api/pods | List pods |
| POST | /api/pods | Create pod |
| PATCH | /api/pods/:id/scale | Scale pod instances |
| GET | /api/events | Event log (filter by type) |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | Yes | 4860 | Service port |

## Dependencies
- express
- @rtmn/shared
- uuid
- zod

## Commands
- `npm run dev` — Development mode
- `npm run build` — Build TypeScript
- `npm start` — Production start
- `npm test` — Run tests