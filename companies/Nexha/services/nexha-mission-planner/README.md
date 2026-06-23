# nexha-mission-planner

> Cross-tenant mission composition for the Nexha federation.
> **Port 4362** · MongoDB · ADR-0010 Phase 6 (2026-06-22) · 89 vitest tests

The mission planner composes multi-step, multi-tenant missions: a tenant
instantiates a template (or supplies a custom DAG), the planner resolves
each subtask to an agent in `nexha-business-directory`, and subtasks
progress through a strict state machine.

```
DRAFT → PLANNED → EXECUTING → COMPLETED
              ↓          ↓
            PAUSED     FAILED
              ↓
          CANCELLED (terminal)
```

Subtasks:
```
PENDING → ASSIGNED → IN_PROGRESS → COMPLETED
   ↓         ↓           ↓
 SKIPPED  BLOCKED     FAILED → PENDING (retry)
```

## Quick start

```bash
# 1. Install
cd companies/Nexha/services/nexha-mission-planner
npm install

# 2. Run tests (89 should pass)
npm test

# 3. Start the service
JWT_SECRET=... INTERNAL_SERVICE_TOKEN=... npm start

# Or use the dev stack (Hub + Mission Planner + directory + others)
cd ../../../
bash scripts/dev-stack.sh start
```

## Endpoints

```bash
# Health
curl http://localhost:4362/health

# Create a mission
curl -X POST http://localhost:4362/api/missions \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Open Mumbai Bistro",
    "subtasks": [
      {"name": "Find vegetables", "type": "find-supplier", "capability": "supplier-registry"},
      {"name": "Negotiate produce prices", "type": "negotiate-price", "capability": "pricing-network"}
    ]
  }'

# Or from a template (with {{placeholder}} substitution)
curl -X POST http://localhost:4362/api/missions \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Open Mumbai Bistro",
    "templateId": "open-restaurant",
    "context": {"city": "Mumbai", "budget": 50000}
  }'

# Plan (resolve agents + DRAFT → PLANNED)
curl -X POST http://localhost:4362/api/missions/$MISSION_ID/plan \
  -H "Authorization: Bearer $JWT" \
  -d '{"assignments": {"supplier-registry": {"agentId": "sup-1", "tenantId": "tenant-x"}}}'

# Run subtasks
curl -X POST http://localhost:4362/api/missions/$MISSION_ID/subtasks/$SUBTASK_ID/start \
  -H "Authorization: Bearer $JWT"

curl -X POST http://localhost:4362/api/missions/$MISSION_ID/subtasks/$SUBTASK_ID/complete \
  -H "Authorization: Bearer $JWT" \
  -d '{"result": {"found": 5}}'

# Stats
curl http://localhost:4362/api/stats -H "Authorization: Bearer $JWT"
```

## Templates

Templates are reusable mission definitions, either:
- **System templates** — `tenantId=null`, visible to everyone (`visibility=PUBLIC`).
- **Tenant-owned templates** — scoped to one tenant (`visibility=PRIVATE`).

A template defines a DAG of subtasks with `dependsOn` links. Inputs are
parametrized with `{{placeholder}}` syntax and substituted at mission
creation time.

```bash
# List all visible templates
curl http://localhost:4362/api/templates

# Create a private template
curl -X POST http://localhost:4362/api/templates \
  -H "Authorization: Bearer $JWT" \
  -d '{
    "templateId": "my-onboarding",
    "name": "Employee Onboarding",
    "category": "general",
    "visibility": "PRIVATE",
    "subtasks": [
      {"name": "Setup email", "type": "custom", "capability": "it-services"},
      {"name": "Add to payroll", "type": "custom", "capability": "hr-services",
       "dependsOn": ["setup-email"]}
    ]
  }'
```

## State machine guarantees

The service rejects illegal moves with HTTP 422 (`MISSION_INVALID_TRANSITION`).
For example:
- `COMPLETED → EXECUTING`: not allowed (terminal).
- Subtask with `dependsOn` whose dependency isn't `COMPLETED` or `SKIPPED`: blocked.
- Plan on a non-DRAFT mission: rejected.

Auto-promotion:
- `startSubtask` auto-promotes DRAFT/PLANNED mission → EXECUTING.
- `completeSubtask` / `skipSubtask` on the last non-terminal subtask → mission COMPLETED.
- `failSubtask` with no other IN_PROGRESS subtasks → mission FAILED.

## Related docs

- [CLAUDE.md](CLAUDE.md) — full architecture, design rationale, file map.
- [RTMN docs/nexha/mission-planner.md](../../../docs/nexha/mission-planner.md) — ecosystem-level overview.
- [ADR-0010 MULTI-TENANT FEDERATION](../../../docs/ADR/0010-MULTI-TENANT-FEDERATION.md) — strategic plan, all 11 phases.