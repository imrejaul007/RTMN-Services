# ConstitutionalOS

## Purpose
Mission, Values, Ethics, Red Lines, and Authority Boundaries for the SUTAR OS autonomous agent framework. Think: PolicyOS = How to act | ConstitutionalOS = Why and when NOT to act.

## Key Features
- **Missions** — Organizational mission statements with priority and source tracking
- **Values** — Core values ranked by weight for decision-making
- **Red Lines** — Hard stops, warnings, and approval-required rules
- **Authority** — Per-agent-type permission scopes and value limits
- **Escalation Paths** — Multi-level escalation procedures for different scenarios
- **Principles** — Decision-making principles with do/don't examples
- **Agent Authorization** — Check if an agent action is within constitutional bounds
- **Audit Log** — Complete audit trail of all constitutional decisions

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check with summary counts |
| GET | /ready | Readiness probe |
| GET | /api/missions | List all active missions |
| POST | /api/missions | Create a new mission |
| GET | /api/values | List values sorted by weight |
| POST | /api/values | Create a new value |
| GET | /api/red-lines | List red lines (filter by category/severity) |
| POST | /api/red-lines | Create a new red line |
| POST | /api/check/:actionType | Check if action violates red lines |
| GET | /api/authority/:agentType | Get authority rules for agent type |
| POST | /api/authority | Create authority rule |
| GET | /api/escalations | List all escalation paths |
| POST | /api/escalations/:scenario/escalate | Trigger escalation |
| GET | /api/principles | List decision principles |
| POST | /api/principles | Create a principle |
| GET | /api/logs | Audit log (filter by type) |
| POST | /api/agent/:agentType/authorize | Check agent action authorization |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | Yes | 4855 | Service port |

## Dependencies
- express
- @rtmn/shared
- uuid

## Commands
- `npm run dev` — Development mode
- `npm run build` — Build TypeScript
- `npm start` — Production start
- `npm test` — Run tests