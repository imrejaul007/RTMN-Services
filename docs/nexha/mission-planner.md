# Mission Planner — `nexha-mission-planner`

> **ADR-0010 Phase 6** · Port 4362 · MongoDB · 89 vitest tests · 2026-06-22

The Mission Planner composes multi-step, multi-tenant missions for the
Nexha federation. It is the **execution plane's brain**: a tenant
declares a mission (from a template or with a custom DAG), the planner
resolves each subtask to an agent in `nexha-business-directory`, and
subtasks progress through a strict state machine.

A single mission can span multiple tenants — that's the point of
"federation". The mission owner is one tenant; the agents performing
each subtask can be from any other tenant.

## Why this exists

Nexha connects autonomous businesses. Most real work requires **multiple
agents** to collaborate:

- "Open a restaurant" → procurement agent + pricing agent + banking agent
- "Build an apartment" → architect + contractor + materials supplier + bank
- "Launch a marketing campaign" → creative agent + audience agent + ad-buyer

Each agent lives in a different tenant. The mission planner is the
orchestration layer that lets one tenant compose work performed by
agents across the federation.

## Lifecycle

```
        ┌──────┐
        │ DRAFT│ (just created from template or subtasks)
        └──┬───┘
           │ plan (resolve agents)
           ▼
       ┌────────┐
       │PLANNED │
       └───┬────┘
           │ startMission (or auto on first startSubtask)
           ▼
       ┌─────────┐
   ┌──►│EXECUTING│◄──┐
   │   └─┬───┬───┘   │
   │     │   │       │ retry
   │     │   │ pause │
   │     │   ▼       │
   │     │ ┌──────┐  │
   │     │ │PAUSED│──┘
   │     │ └──────┘
   │     │
   │     │ all subtasks COMPLETED|SKIPPED → COMPLETED (terminal)
   │     │ no more IN_PROGRESS/ASSIGNED → FAILED
   │     ▼
   │  ┌─────────┐
   │  │COMPLETED│ (terminal)
   │  └─────────┘
   │
   └──── any state ──► CANCELLED (terminal)
```

## Subtask lifecycle

```
PENDING → ASSIGNED → IN_PROGRESS → COMPLETED (terminal)
   ↓         ↓           ↓
 SKIPPED  BLOCKED     FAILED → PENDING (retry)
```

Subtasks can declare `dependsOn: [subtaskId1, ...]`. `startSubtask`
rejects with HTTP 422 if any dependency is not yet `COMPLETED` or
`SKIPPED`. `skipSubtask` unblocks dependents.

## Cross-tenant participation

A mission is owned by one tenant (`tenantId`), but each subtask can be
assigned to an agent of a different tenant (`assignedTenant`). The
`participants[]` array is the audit trail of which tenants were
involved.

```
mission.tenantId        = 'restaurant-owner'
subtask.assignedAgent   = 'veg-supplier-bot-7'
subtask.assignedTenant  = 'greenleaf-co'
subtask.assignedAgent   = 'pricing-ai-2'
subtask.assignedTenant  = 'pricing-network'

mission.participants = ['restaurant-owner', 'greenleaf-co', 'pricing-network']
```

The `getMission` endpoint allows read access to anyone in
`participants[]`, regardless of which tenant they belong to.

## Templates with `{{placeholder}}` substitution

Templates are reusable DAG definitions. They can be:
- **System templates** — `tenantId=null`, `visibility=PUBLIC`. Shipped with
  the service, available to everyone.
- **Tenant-owned templates** — `visibility=PRIVATE`. Only the owning
  tenant can instantiate them.

Inputs are parametrized with `{{placeholder}}` syntax. At mission creation
time, the caller's `context` is substituted:

```jsonc
// Template
{
  "templateId": "open-restaurant",
  "subtasks": [
    {
      "name": "Find vegetables",
      "type": "find-supplier",
      "capability": "supplier-registry",
      "inputs": { "location": "{{city}}", "budget": "{{budget}}" }
    }
  ]
}

// Instantiation
{
  "name": "Open Mumbai Bistro",
  "templateId": "open-restaurant",
  "context": { "city": "Mumbai", "budget": 50000 }
}

// Result mission
{
  "subtasks": [{
    "name": "Find vegetables",
    "type": "find-supplier",
    "capability": "supplier-registry",
    "inputs": { "location": "Mumbai", "budget": 50000 }
  }]
}
```

## Capabilities

| Capability | Subtask type | Resolves to |
|---|---|---|
| `supplier-registry` | `find-supplier` | nexha-supplier-network |
| `pricing-network` | `negotiate-price` | nexha-pricing-network |
| `acp-messaging` | `execute-acp-message` | nexha-acp-messaging |
| `marketplace-listings` | `install-listing` | marketplace-listings (HOJAI AI) |
| (custom) | `custom` | caller-provided resolver |

When `planMission` is called, the caller passes a `resolveAgent` function
that maps `(capability, subtaskType)` → `{ agentId, tenantId }`. In
production, this typically queries `nexha-business-directory` to find
agents that match the capability. Tests pass a hardcoded resolver.

## State machine enforcement

The service rejects illegal moves with HTTP 422 (`MISSION_INVALID_TRANSITION`).
This is much safer than silently corrupting state. Examples:

| Action | Result |
|---|---|
| `transitionMission(DRAFT, EXECUTING)` without `planMission` first | 422 |
| `transitionMission(COMPLETED, EXECUTING)` | 422 (terminal) |
| `startSubtask` with unmet dependency | 422 ("blocked by ..." ) |
| `startSubtask` on PENDING (without planMission) | 422 |
| `completeSubtask` from FAILED | 422 (no IN_PROGRESS → COMPLETED) |
| `failSubtask` without `error` in body | 400 (validation) |

## Auto-promotion

To keep the API ergonomic, the service auto-promotes state when obvious:

- **`startSubtask` on DRAFT/PLANNED mission** → auto-promotes mission to `EXECUTING`,
  sets `startedAt`.
- **`completeSubtask` on the last non-terminal subtask** → auto-promotes mission
  to `COMPLETED`, sets `completedAt`.
- **`skipSubtask` on the last non-terminal subtask** → same as above.
- **`failSubtask` with no other IN_PROGRESS/ASSIGNED subtasks** → auto-promotes
  mission to `FAILED`.

This means a typical client flow is just:
1. `createMission`
2. `planMission` (with resolver)
3. `startSubtask` + `completeSubtask` × N

The mission naturally flows through the state machine without explicit
`startMission` calls.

## Visibility & access control

- **Owner** (`mission.tenantId`): full access — read, update, plan, all transitions.
- **Participants** (anyone in `mission.participants[]`): read-only via `GET /api/missions/:id`.
- **Internal callers** (`x-internal-token`): can read any mission via the `crossTenant` flag.
- **Other tenants**: 404 (no information disclosure).

## Related services

| Service | Port | Role |
|---|---|---|
| [nexha-business-directory](business-directory.md) | 4360 | Resolves capabilities → agents |
| [nexha-acp-messaging](acp-messaging.md) | 4340 | `execute-acp-message` subtasks |
| [nexha-supplier-network](supplier-network.md) | 4280 | `find-supplier` subtasks |
| [nexha-pricing-network](pricing-network.md) | 4286 | `negotiate-price` subtasks |
| [marketplace-listings](marketplace-listings.md) | 4250 | `install-listing` subtasks |

## Env vars

| Var | Default | Purpose |
|---|---|---|
| `MISSION_PLANNER_PORT` | `4362` | Port to listen on |
| `MONGODB_URI` | `mongodb://localhost:27017/nexha_mission_planner` | MongoDB connection |
| `JWT_SECRET` | `''` | HS256 secret for JWT verification |
| `INTERNAL_SERVICE_TOKEN` | `''` | Token for `x-internal-token` callers |

## Endpoints

See the [service CLAUDE.md](../../companies/Nexha/services/nexha-mission-planner/CLAUDE.md)
for the full endpoint list. All endpoints go through the RTMN Hub at
`/api/nexha/nexha-mission-planner/*`.

## Tests

89 vitest tests across 2 files in `companies/Nexha/services/nexha-mission-planner/__tests__/`.
Plus 14 do-app client tests and 17 REZ-Workspace client tests = **120 new tests** in Phase 6.

```bash
cd companies/Nexha/services/nexha-mission-planner && npm test
```

## Files

| File | Location |
|---|---|
| Service code | `companies/Nexha/services/nexha-mission-planner/src/` |
| Tests | `companies/Nexha/services/nexha-mission-planner/__tests__/` |
| Service CLAUDE.md | `companies/Nexha/services/nexha-mission-planner/CLAUDE.md` |
| Service README.md | `companies/Nexha/services/nexha-mission-planner/README.md` |
| Hub wiring | `companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts` |
| do-app client | `companies/do-app/backend/src/services/hojaiClient.ts` |
| REZ-Workspace client | `companies/REZ-Workspace/core/unified-fabric/src/connections/nexha.js` |