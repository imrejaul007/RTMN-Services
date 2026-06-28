# SafetyOS

## Purpose
Kill switches, rate limits, behavior monitoring, and containment for AI agents. Think: Airbag for AI agents.

## Key Features
- **Kill Switches** — Global and per-agent safety switches with hard stops
- **Rate Limiting** — Per-agent-type and per-action rate limits (minute/hour)
- **Behavior Rules** — Pattern-based detection for spam, compliance, safety, cost
- **Containment** — Isolate and release suspicious agents
- **Emergency Stop** — Global stop/resume for all agents
- **Event Logging** — Complete audit trail of safety events

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /ready | Readiness probe |
| GET | /api/killswitches | List kill switches (filter by scope/enabled) |
| POST | /api/killswitches | Create kill switch |
| POST | /api/killswitches/:id/trigger | Trigger (disable) kill switch |
| POST | /api/killswitches/:id/enable | Re-enable kill switch |
| GET | /api/ratelimits | List rate limits |
| POST | /api/ratelimits | Create rate limit |
| POST | /api/check/:agentType/:action | Check rate limit |
| GET | /api/rules | List behavior rules (filter by category) |
| POST | /api/rules | Create behavior rule |
| GET | /api/containment/:agentId | Check agent containment |
| POST | /api/contain/:agentId | Contain agent |
| POST | /api/release/:agentId | Release agent |
| POST | /api/emergency/stop | Global emergency stop |
| POST | /api/emergency/resume | Resume from emergency |
| GET | /api/events | Event log |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | Yes | 4862 | Service port |

## Dependencies
- express
- @rtmn/shared
- uuid

## Commands
- `npm run dev` — Development mode
- `npm run build` — Build TypeScript
- `npm start` — Production start
- `npm test` — Run tests