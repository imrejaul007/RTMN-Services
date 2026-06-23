# nexha-provisioning-engine

> **ADR-0011 Phase 12 (2026-06-23)** — Declarative provisioning plans for per-tenant instances.

## What it does

The provisioning engine is the **control plane** for bringing up (and tearing down) per-tenant SUTAR instances and per-tenant industry OS instances. It does NOT call Kubernetes or AWS directly — it produces a **declarative plan** (YAML or JSON) that an **external orchestrator** consumes.

This keeps RTMN **cloud-agnostic** and lets operators plug in their own orchestrator (k8s, terraform, Ansible, anything that can read YAML).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  nexha-provisioning-engine (4385)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /api/plans                  Create a plan                    │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────────────────────────────────────────────┐           │
│  │           provisioningService.createPlan()           │           │
│  │   • Validates input with Zod                         │           │
│  │   • Generates planId + planVersion                   │           │
│  │   • Computes resources[] from isolation level        │           │
│  │   • Emits PlanCreated event                          │           │
│  └─────────────────────────────────────────────────────┘           │
│       │                                                             │
│       ▼                                                             │
│  Plan: PENDING ─► APPLYING ─► READY ─► RECONCILING                 │
│           │           │          │           │                       │
│           ▼           ▼          ▼           ▼                       │
│        CANCELLED  FAILED     DESTROYING  DESTROYED                  │
│                                                                     │
│  GET /api/plans/:id/plan.yaml   YAML view for orchestrator        │
│  GET /api/plans/:id/plan.json   JSON view for orchestrator        │
│                                                                     │
│  POST /api/plans/:id/transition  Orchestrator reports status change │
│  POST /api/plans/:id/apply       Orchestrator reports resource done │
│  POST /api/plans/:id/fail-resource Orchestrator reports resource failed │
│  POST /api/plans/:id/outputs     Orchestrator reports final outputs │
│                                                                     │
│  Emits HOOK EVENTS (via nexha-hooks-sdk):                           │
│    provisioning.plan.created                                       │
│    provisioning.plan.transitioned                                  │
│    provisioning.plan.ready                                         │
│    provisioning.plan.failed                                        │
│    provisioning.plan.destroyed                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## State Machine

```
                 ┌──────────────┐
                 │   PENDING    │  Initial state after createPlan
                 └──────┬───────┘
                        │ transition(APPLYING)
                        ▼
                 ┌──────────────┐
        ┌────────│   APPLYING   │────────┐
        │        └──────┬───────┘        │
        │               │ transition     │
        │               ▼                │
        │        ┌──────────────┐        │
        │        │    READY     │        │
        │        └──────┬───────┘        │
        │               │                │
        │  transition   │                │  any resource fails
        │  (DESTROYING) │                │  fail-resource
        │               │                ▼
        │               │         ┌──────────────┐
        │               │         │   FAILED     │
        │               │         └──────┬───────┘
        │               │                │
        │               ▼                │
        │        ┌──────────────┐        │
        └───────►│  DESTROYING  │◄───────┘
                 └──────┬───────┘
                        │ markDestroyed
                        ▼
                 ┌──────────────┐
                 │  DESTROYED   │  Terminal state
                 └──────────────┘

  Any state ──── cancel() ────► CANCELLED  (Terminal)
```

## Resource Generation

The engine auto-generates a `resources[]` array based on **isolation level** and **target kind**:

| Isolation | Target = SUTAR_INSTANCE | Target = INDUSTRY_OS_INSTANCE |
|-----------|------------------------|-------------------------------|
| `SHARED`  | 1 resource: shared API key | 1 resource: shared API key |
| `DEDICATED` | 4 resources: Deployment, Service, Ingress, dedicated DB schema | 4 resources: Deployment, Service, Ingress, dedicated DB |
| `ISOLATED` | 4 resources: separate namespace Deployment/Service/Ingress + isolated cluster DB | 4 resources: same pattern, isolated cluster |

The orchestrator interprets these `kind` values and acts accordingly. RTMN does not embed any cloud-specific logic.

## API

### POST /api/plans

Create a plan:

```json
{
  "tenantId": "t_x",
  "targetKind": "SUTAR_INSTANCE",
  "isolationLevel": "DEDICATED",
  "region": "us-east-1",
  "spec": { "industry": "healthcare", "compliance": ["HIPAA"] },
  "metadata": { "requestedBy": "user_123" }
}
```

Returns the full plan JSON with generated `planId`, `planVersion`, `resources[]`, `status: PENDING`.

### GET /api/plans/:id/plan.yaml

Returns the plan as YAML (with `apiVersion: rtmn.io/v1`, `kind: ProvisioningPlan`):

```yaml
apiVersion: rtmn.io/v1
kind: ProvisioningPlan
metadata:
  planId: pp_abc
  tenantId: t_x
  targetKind: SUTAR_INSTANCE
status:
  phase: PENDING
spec:
  isolationLevel: DEDICATED
  region: us-east-1
resources:
  - name: sutar-deployment
    kind: Deployment
    spec: { /* orchestrator-defined shape */ }
  - name: sutar-service
    kind: Service
    spec: { /* ... */ }
  - name: sutar-ingress
    kind: Ingress
    spec: { /* ... */ }
  - name: sutar-db
    kind: Database
    spec: { /* ... */ }
```

### POST /api/plans/:id/transition

Orchestrator reports state change:

```json
{ "toStatus": "APPLYING", "actor": "k8s-controller-1" }
```

### POST /api/plans/:id/apply

Report one resource successfully applied:

```json
{ "resourceName": "sutar-deployment", "outputs": { "deploymentName": "sutar-t-x", "replicas": 1 } }
```

### POST /api/plans/:id/fail-resource

Report a resource failed (plan goes to FAILED if any resource fails):

```json
{ "resourceName": "sutar-db", "reason": "db cluster at capacity" }
```

### POST /api/plans/:id/outputs

Record the final outputs of the plan (e.g. `{ "host": "sutar.x.com", "port": 4141, "apiKey": "..." }`).

## Authentication

- **External callers (UI / API):** JWT with `provisioning:admin` role.
- **Orchestrator callbacks:** Internal token via `x-internal-token` header.
- **Service-to-service (Nexha Hub):** Bearer JWT issued by CorpID.

## Hub Wiring

Exposed at the RTMN Hub (4399):

```
GET  http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans
POST http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans
GET  http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id
GET  http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id/plan.json
GET  http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id/plan.yaml
POST http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id/transition
POST http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id/apply
POST http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id/fail-resource
POST http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id/outputs
POST http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id/cancel
POST http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id/destroy
POST http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id/mark-destroyed
GET  http://localhost:4399/api/nexha/nexha-provisioning-engine/api/plans/:id/events
GET  http://localhost:4399/api/nexha/nexha-provisioning-engine/api/stats
```

## Capabilities registered at the Hub

| Capability | Purpose |
|------------|---------|
| `provisioning-engine` | The engine itself |
| `provisioning-plan` | Plan CRUD |
| `tenant-provisioning-state` | State machine transitions |
| `plan-reconciliation` | Drift detection / re-apply |

## Tests

- `provisioningService.test.js` — **37 tests** (state machine, resource generation, validation, transitions, outputs, cancel/destroy, events, stats)
- `routes.test.js` — **30 tests** (HTTP contract, auth, URL routing, error handling)
- **Total: 67 vitest tests, 0 failures**