# CrisisOS

## Purpose
Incident management, war rooms, playbooks, and disaster recovery for SUTAR OS. Think: PagerDuty for AI agents.

## Key Features
- **Incidents** — Create, track, escalate, and resolve incidents with severity levels
- **Playbooks** — Automated response playbooks triggered by category/severity
- **War Rooms** — Real-time collaboration spaces during incidents
- **Backups** — Backup configuration and trigger management
- **Stats** — Incident analytics, resolution times, playbook usage
- **Timeline** — Complete audit trail for every incident

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check with incident/playbook counts |
| GET | /ready | Readiness probe |
| GET | /api/incidents | List incidents (filter by status/severity/category/assignee) |
| GET | /api/incidents/:id | Get incident details |
| POST | /api/incidents | Create incident |
| PATCH | /api/incidents/:id | Update incident |
| POST | /api/incidents/:id/timeline | Add timeline entry |
| POST | /api/incidents/:id/escalate | Escalate to critical |
| GET | /api/playbooks | List playbooks |
| GET | /api/playbooks/:id | Get playbook |
| POST | /api/playbooks | Create playbook |
| POST | /api/playbooks/:id/execute | Execute playbook |
| GET | /api/war-rooms | List war rooms |
| POST | /api/war-rooms | Create war room |
| POST | /api/war-rooms/:id/join | Join war room |
| POST | /api/war-rooms/:id/close | Close war room |
| POST | /api/war-rooms/:id/notes | Add notes |
| GET | /api/backups | List backups |
| POST | /api/backups | Create backup |
| POST | /api/backups/:id/trigger | Trigger backup |
| GET | /api/stats | Incident statistics |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | Yes | 4863 | Service port |

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