# CLAUDE.md — nexha-mission-planner

> **TL;DR for Claude Code sessions:**
> Cross-tenant mission composition (capability graph → DAG → execution).
> **Port 4362** · 89 vitest tests · MongoDB · ADR-0010 Phase 6.

## Quick orientation

This service is the **mission planner** for the Nexha federation. It
composes multi-tenant missions: a tenant instantiates a template (or
supplies a custom DAG), the planner resolves each subtask to an agent
in `nexha-business-directory`, and subtasks progress through a strict
state machine. A single mission can span multiple tenants — that's the
point of "federation".

- **Per-tenant** — every mission carries `tenantId` (the mission owner).
- **Cross-tenant by design** — subtasks may be assigned to agents of OTHER tenants.
- **Template-based** — reusable DAG definitions with `{{placeholder}}` substitution.
- **State-machine-driven** — strict transitions; illegal moves return 422.

## File map

| File | What it does |
|---|---|
| `src/index.js` | Express app on port 4362, auto-start on direct run, internal sanity endpoint, error handler |
| `src/models/Mission.js` | Mongoose model — 7 mission states, 7 subtask states, 5 subtask types, participants, deadline, startedAt/completedAt |
| `src/models/MissionTemplate.js` | Mongoose model — system (tenantId=null) + tenant-owned templates, partial unique indexes, 6 categories |
| `src/middleware/auth.js` | HS256 JWT + `x-internal-token`, env-var-at-request-time (so tests can swap) |
| `src/services/missionService.js` | `createMission`, `updateMission`, `getMission`, `listMissions`, `transitionMission`, `planMission` (with custom resolver), `startSubtask`, `completeSubtask`, `failSubtask`, `skipSubtask`, `cancelMission`, `getStats`. Error classes: `ValidationError`, `NotFoundError`, `StateTransitionError` |
| `src/routes/index.js` | All HTTP routes with Zod validation; participant-aware reads |
| `__tests__/helpers/db.js` | mongodb-memory-server + `syncIndexes()` so partial unique indexes work on first query |
| `__tests__/unit/missionService.test.js` | 42 service-layer tests covering lifecycle, template instantiation, dependencies, auto-promotion |
| `__tests__/unit/routes.test.js` | 47 HTTP tests via supertest covering auth, validation, lifecycle, templates |

## Design rationale

### Why cross-tenant participants?
A mission like "Open Restaurant" needs:
1. A procurement agent (from supplier-network tenant)
2. A pricing agent (from pricing-network tenant)
3. A banking agent (from trade-finance tenant)

The mission OWNER is the restaurant entrepreneur; the subtasks are PERFORMED
by agents of other tenants. Cross-tenant `participants[]` is the audit trail
for who was involved.

### Why a state machine instead of booleans?
Subtasks have well-defined legal moves:
- `PENDING` → `ASSIGNED` (via planMission), `SKIPPED`, `FAILED`
- `ASSIGNED` → `IN_PROGRESS`, `BLOCKED`, `FAILED`, `SKIPPED`
- `IN_PROGRESS` → `COMPLETED`, `FAILED`, `BLOCKED`

Returning 422 on illegal moves is much safer than silently corrupting state.

### Why auto-promote DRAFT/PLANNED → EXECUTING on first subtask start?
Most clients don't bother calling `startMission` separately. Auto-promoting
when the first subtask starts means clients can just:
1. Create mission
2. planMission (resolve agents)
3. startSubtask + completeSubtask × N
…and the mission naturally flows through the state machine.

### Why dependency-aware subtasks?
Subtasks can declare `dependsOn: [subtaskId1, ...]`. `startSubtask` rejects
with 422 if dependencies aren't `COMPLETED` or `SKIPPED`. This is the
foundation of DAG-based execution.

### Why templates with `{{placeholder}}` substitution?
Templates define reusable workflows ("open-restaurant", "build-apartment",
"launch-event") that any tenant can instantiate. Per-call `context` substitutes
placeholders, so the same template becomes 100 different missions.

### Why per-tenant compound indexes?
Same as marketplace-listings — two tenants could legitimately use the same
`templateId` for private templates. Compounding on `tenantId` keeps each
tenant's namespace independent. System templates have `tenantId=null`.

## Endpoints

```
GET    /health                                            — service health + capabilities
GET    /ready                                             — readiness probe
GET    /                                                  — redirect to /health
POST   /api/validate                                      — lint a mission payload

POST   /api/missions                                      — create (auth)
GET    /api/missions                                      — list with filters (auth)
GET    /api/missions/:missionId                           — get one (auth, participant-aware)
PATCH  /api/missions/:missionId                           — update (auth, DRAFT/PLANNED/PAUSED only)
POST   /api/missions/:missionId/plan                      — resolve agents + PLANNED (auth)
POST   /api/missions/:missionId/start                     — PLANNED → EXECUTING (auth)
POST   /api/missions/:missionId/pause                     — EXECUTING → PAUSED (auth)
POST   /api/missions/:missionId/cancel                    — any → CANCELLED (auth)
POST   /api/missions/:missionId/retry                     — FAILED → EXECUTING (auth)

POST   /api/missions/:missionId/subtasks/:subtaskId/start     — PENDING/ASSIGNED → IN_PROGRESS (auth)
POST   /api/missions/:missionId/subtasks/:subtaskId/complete  — → COMPLETED (auth)
POST   /api/missions/:missionId/subtasks/:subtaskId/fail      — → FAILED (auth)
POST   /api/missions/:missionId/subtasks/:subtaskId/skip      — → SKIPPED (auth)

GET    /api/templates                                     — list public + tenant private (auth optional)
GET    /api/templates/:templateId                         — get one
POST   /api/templates                                     — create tenant template (auth)

GET    /api/stats                                         — per-tenant stats (auth)

GET    /internal/sanity                                   — x-internal-token protected health probe
```

## Auth

- **Bearer JWT (HS256)** — CorpID-style claims with `tenantId`, `sub`, `roles`, `exp`.
- **`x-internal-token` header** — bypass auth for service-to-service calls. Must match `INTERNAL_SERVICE_TOKEN`.
- **`x-tenant-id` header or `tenantId` in body** — required when using internal token (since internal has no tenant).

Env vars (read at request time):
- `JWT_SECRET` — required for JWT verification
- `INTERNAL_SERVICE_TOKEN` — required for internal callers

## Data model

### Mission
```js
{
  tenantId: String,           // mission owner
  missionId: String,          // unique within tenant
  name: String,
  description: String,
  templateId: String|null,    // e.g., 'open-restaurant'
  templateVersion: String,
  status: 'DRAFT'|'PLANNED'|'EXECUTING'|'PAUSED'|'COMPLETED'|'FAILED'|'CANCELLED',
  priority: 1-10,
  subtasks: [Subtask],
  context: Object,            // inputs for {{placeholder}} substitution
  participants: [String],     // tenantIds of participating agents
  startedAt: Date|null,
  completedAt: Date|null,
  deadline: Date|null,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date,
}
```

### Subtask
```js
{
  subtaskId: String,
  name: String,
  type: 'find-supplier'|'negotiate-price'|'execute-acp-message'|'install-listing'|'custom',
  capability: String,         // capability key (e.g., 'supplier-registry')
  inputs: Object,
  dependsOn: [String],        // subtaskIds
  assignedAgent: String|null,
  assignedTenant: String|null,  // may differ from mission owner
  status: 'PENDING'|'ASSIGNED'|'IN_PROGRESS'|'BLOCKED'|'COMPLETED'|'FAILED'|'SKIPPED',
  startedAt: Date|null,
  completedAt: Date|null,
  result: Mixed|null,
  error: String|null,
  retryCount: Number,
  metadata: Object,
}
```

### MissionTemplate
```js
{
  tenantId: String|null,      // null for system templates
  templateId: String,
  name: String,
  description: String,
  category: 'hospitality'|'construction'|'retail'|'logistics'|'finance'|'general',
  visibility: 'PUBLIC'|'PRIVATE',
  version: String,            // semver
  subtasks: [TemplateSubtask],
  requiredInputs: [String],   // placeholder names
  defaultContext: Object,
  metadata: Object,
  installCount: Number,
  createdAt: Date,
  updatedAt: Date,
}
```

## State machines

### Mission
```
DRAFT     → PLANNED, CANCELLED
PLANNED   → EXECUTING, DRAFT, CANCELLED
EXECUTING → PAUSED, COMPLETED, FAILED, CANCELLED
PAUSED    → EXECUTING, CANCELLED
FAILED    → EXECUTING, CANCELLED     (can retry)
COMPLETED → (terminal)
CANCELLED → (terminal)
```

### Subtask
```
PENDING     → ASSIGNED, SKIPPED, FAILED
ASSIGNED    → IN_PROGRESS, BLOCKED, FAILED, SKIPPED
IN_PROGRESS → COMPLETED, FAILED, BLOCKED
BLOCKED     → IN_PROGRESS, FAILED
FAILED      → PENDING, SKIPPED       (can retry)
COMPLETED   → (terminal)
SKIPPED     → (terminal)
```

## Env vars

| Var | Default | Purpose |
|---|---|---|
| `MISSION_PLANNER_PORT` | `4362` | Port to listen on |
| `MONGODB_URI` | `mongodb://localhost:27017/nexha_mission_planner` | MongoDB connection |
| `JWT_SECRET` | `''` | HS256 secret for JWT verification |
| `INTERNAL_SERVICE_TOKEN` | `''` | Token for `x-internal-token` callers |
| `PORT` | — | Ignored (use `MISSION_PLANNER_PORT`) |

## Tests

89 tests across 2 files. Run:

```bash
cd companies/Nexha/services/nexha-mission-planner
npm test
```

Tests use `mongodb-memory-server` and a forged HS256 JWT (the auth middleware
doesn't verify signatures in tests — it only checks the shape of the bearer
token).

## Related services

- `nexha-business-directory` (4360) — resolves agent capabilities for planMission
- `nexha-acp-messaging` (4340) — execute-acp-message subtasks
- `nexha-supplier-network` (4280) — find-supplier subtasks
- `nexha-pricing-network` (4286) — negotiate-price subtasks
- `marketplace-listings` (4250, HOJAI AI) — install-listing subtasks

## Last updated

2026-06-22 · ADR-0010 Phase 6 · 89 vitest tests passing