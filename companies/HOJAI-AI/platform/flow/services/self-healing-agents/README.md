# FlowOS Self-Healing Agents

## Purpose
Auto-recovery and optimization for agent workflows. Detect failures and automatically recover.

## Key Features
- **Failure Detection** — Track agent and workflow failures
- **Auto-Recovery** — Automatic recovery strategies (retry, restart, fallback)
- **Recovery Tracking** — Monitor recovery success rates
- **Agent Health** — Track agent health scores

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /api/failures | Report a failure |
| GET | /api/failures | List all failures |
| GET | /api/recoveries | List all recoveries |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5366 | Service port |

## Commands
- `npm start` — Start service
- `npm test` — Run tests