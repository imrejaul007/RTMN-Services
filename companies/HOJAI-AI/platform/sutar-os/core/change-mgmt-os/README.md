# ChangeMgmtOS

## Purpose
Change requests, approvals, rollout tracking, and rollback management for SUTAR OS deployments. Think: GitHub PRs for AI agent changes.

## Key Features
- **Change Lifecycle** — Draft → Submit → Approve → Test → Roll Out → Complete
- **Templates** — Pre-built change templates (Feature Release, Hotfix, Security Patch)
- **Phases** — Multi-phase rollout with progress tracking
- **Rollback** — One-click rollback with metrics tracking
- **Audit Logs** — Complete audit trail of all change actions
- **Multi-dimensional Filtering** — Filter by status, priority, type, owner

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /ready | Readiness probe |
| GET | /api/changes | List changes (filter by status/priority/type/owner) |
| GET | /api/changes/:id | Get change details |
| POST | /api/changes | Create change |
| PUT | /api/changes/:id | Update change |
| POST | /api/changes/:id/submit | Submit for approval |
| POST | /api/changes/:id/approve | Approve change |
| POST | /api/changes/:id/reject | Reject change |
| POST | /api/changes/:id/start | Start rollout |
| POST | /api/changes/:id/phases/:phaseId/complete | Complete phase |
| POST | /api/changes/:id/complete | Complete change |
| POST | /api/changes/:id/rollback | Trigger rollback |
| GET | /api/templates | List templates |
| GET | /api/audit | Audit logs |
| GET | /api/stats | Change statistics |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | Yes | 4864 | Service port |

## Dependencies
- express
- @rtmn/shared
- uuid
- zod
- cors
- helmet

## Commands
- `npm run dev` — Development mode
- `npm run build` — Build TypeScript
- `npm start` — Production start
- `npm test` — Run tests