# sutar-tenant-instances

**SUTAR Per-Tenant Instance Manager.** Provisions, suspends, resumes, destroys, and monitors isolated SUTAR shards for large tenants that need their own runtime environment (dedicated database, custom limits, custom routes).

> **ADR-0010 Phase 9 (2026-06-22).** Port: **4141** (configurable via `SUTAR_TENANT_INSTANCES_PORT`).

## What this service does

Most tenants share a single SUTAR cluster (Nexha OS default). But when a tenant is large (e.g. a chain with 500+ restaurants), regulated (healthcare, finance), or has strict SLA requirements, they need their own **isolated SUTAR shard**:

| Isolation Level | What it means | When to use |
|---|---|---|
| **SHARED** | Default. Same database as everyone else; logical isolation by `tenantId`. | 95% of tenants. |
| **DEDICATED** | Separate MongoDB database; logical isolation by `tenantId`. | Medium tenants that want data separation. |
| **ISOLATED** | Separate database + custom limits + optional route overrides + dedicated health checks. | Regulated industries, large chains, government. |

This service is the **registry and lifecycle manager** for those shards. It does not run the shards themselves — it tracks who has one, in what state, with what limits, and exposes the operational controls (suspend, resume, destroy, rotate key, usage, limits check).

## State machine

```
              ┌─────────────┐
              │ PROVISIONING│
              └──────┬──────┘
                     │ auto-activate (SHARED) or manual
                     ▼
              ┌─────────────┐         ┌────────────┐
       ┌─────►│   ACTIVE    │────────►│ SUSPENDED  │──┐
       │      └──┬─────┬───┘         └────┬───────┘  │
       │         │     │                  │          │
       │         │     │ destroy           │ destroy  │ resume
       │         │     ▼                  ▼          │
       │         │  ┌──────────┐     ┌──────────┐    │
       │         │  │DESTROYING│────►│ DESTROYED│    │
       │         │  └────┬─────┘     └──────────┘    │
       │         │       │ failed                    │
       │         │       ▼                           │
       │         │   ┌──────────┐                    │
       │         └──►│  FAILED  │◄───────────────────┘
       │             └────┬─────┘
       │                  │ destroy
       │                  ▼
       └─────────────►DESTROYING → DESTROYED
```

Same-state transitions are **always errors** (no-op guard).

## Endpoints

All routes are protected. Auth accepts either:

1. **JWT (HS256)** with `roles: ['sutar:admin']` claim. (`Authorization: Bearer <token>`)
2. **Internal token** for Hub cross-service calls. (`x-internal-token: <token>` + `X-Tenant-Id: <admin-tenant>`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `GET` | `/ready` | Readiness probe |
| `GET` | `/` | Service descriptor (statuses, isolation levels, endpoints) |
| `POST` | `/api/instances` | Provision a new instance for a tenant |
| `GET` | `/api/instances` | List instances (filter by `status`, `tenantId`, `isolationLevel`, `region`) |
| `GET` | `/api/instances/:id` | Fetch one |
| `GET` | `/api/instances/by-tenant/:tenantId` | Find the active instance for a tenant |
| `PATCH` | `/api/instances/:id` | Update region / tags / limits / routes / metadata |
| `POST` | `/api/instances/:id/suspend` | Suspend an instance (`{ reason }`) |
| `POST` | `/api/instances/:id/resume` | Resume a suspended instance |
| `POST` | `/api/instances/:id/destroy` | Destroy an instance (`{ reason }`) |
| `POST` | `/api/instances/:id/fail` | Mark an instance as failed (`{ reason }`) |
| `POST` | `/api/instances/:id/rotate-key` | Rotate the API key (returns new plaintext once) |
| `POST` | `/api/instances/:id/health` | Record a health check (`{ status }`) |
| `POST` | `/api/instances/:id/usage` | Record a usage event |
| `GET` | `/api/instances/:id/usage` | Read usage (today + past 6 days) |
| `GET` | `/api/instances/:id/limits` | Check limit violations |
| `GET` | `/api/stats` | Aggregate stats (instances by status/isolation, total usage) |

## Data model

### TenantInstance

| Field | Type | Notes |
|---|---|---|
| `instanceId` | string | `sti_<16hex>` (unique) |
| `tenantId` | string | The owning tenant |
| `status` | enum | PROVISIONING / ACTIVE / SUSPENDED / DESTROYING / DESTROYED / FAILED |
| `isolationLevel` | enum | SHARED / DEDICATED / ISOLATED |
| `region` | string | Default `'global'` |
| `namespace` | string | e.g. `sutar_tenant_acme_corp` |
| `databaseUri` | string? | null for SHARED; mongodb URI for DEDICATED/ISOLATED |
| `apiKeyHash` | string | SHA-256 of the API key (never plaintext at rest) |
| `limits` | object | `{ maxAgents, maxMissionsPerDay, maxApiCallsPerMinute, storageMbLimit }` |
| `routes` | array | `[{ pathPrefix, upstreamUrl, enabled }]` — request overrides |
| `tags` | string[] | Free-form tags |
| `metadata` | object | Free-form |
| `provisionedAt` | date | |
| `suspendedAt` | date? | |
| `destroyedAt` | date? | |
| `lastHealthCheckAt` | date? | |
| `healthCheckStatus` | enum | healthy / degraded / unhealthy / unknown |

Compound unique index on `instanceId`.

### UsageMetric

Daily counters per instance:

| Field | Type | Notes |
|---|---|---|
| `instanceId` | string | |
| `tenantId` | string | denormalized for fast lookup |
| `date` | string | ISO date (YYYY-MM-DD) |
| `apiCalls` | number | Increments per event |
| `missionsCreated` | number | Increments |
| `missionsCompleted` | number | Increments |
| `missionsFailed` | number | Increments |
| `errorCount` | number | Increments |
| `agentsActive` | number | Set (high-water mark) |
| `storageMbUsed` | number | Set (high-water mark) |

Compound unique index on `(instanceId, date)`.

## Provisioning flow

```js
// 1. Provision
const inst = await provisionInstance({
  tenantId: 't_acme',
  isolationLevel: 'DEDICATED',         // or 'ISOLATED'
  region: 'us-east-1',
  limits: { maxAgents: 50, maxMissionsPerDay: 200, maxApiCallsPerMinute: 120 },
  routes: [{ pathPrefix: '/api/restaurant', upstreamUrl: 'https://acme.example.com/api' }],
  tags: ['prod', 'tier1'],
});

// inst._apiKey is the plaintext — shown ONCE. Save it.
console.log(inst.instanceId, inst._apiKey);

// 2. The tenant now calls SUTAR with their API key
// 3. They get their own database, their own limits, their own routes
```

## Why this matters

- **Isolation for regulated industries**: Healthcare (HIPAA), finance (PCI-DSS), and government tenants often need to prove their data is logically isolated. DEDICATED/ISOLATED instances satisfy this.
- **SLA differentiation**: Large tenants can pay for higher limits, faster health checks, custom routes.
- **Resource governance**: Prevents one noisy tenant from degrading the cluster for everyone.
- **Soft multi-tenancy**: Same SUTAR cluster, separate physical resources.

## What it does NOT do

This service is the **registry** of instances. It does not:

- Provision the actual database (would call out to Terraform / K8s / DBAAS in production).
- Run SUTAR services itself (that's `sutar-gateway`, `sutar-decision-engine`, etc.).
- Validate API keys (the consuming SUTAR service does that).

In production, the provisioning step would chain to:
- Create the MongoDB database (or sharded cluster).
- Apply limits via MongoDB roles.
- Deploy per-tenant SUTAR sidecars (if needed).
- Update the instance status to ACTIVE on success.

For SHARED instances (the default), no infrastructure work is needed — just create the registry entry.

## Tests

```bash
npm test
```

75 tests across 2 files:
- `instanceService.test.js` (43 tests) — state machine, provisioning, conflicts, usage, limits.
- `routes.test.js` (32 tests) — HTTP layer, auth gates, validation, full lifecycle.

## Security

- All routes require auth (JWT with `sutar:admin` role OR internal token).
- API keys are stored as SHA-256 hashes; plaintext is returned only on creation/rotation.
- Internal token is environment-driven (`SUTAR_TENANT_INSTANCES_INTERNAL_TOKEN`) so production deploys can rotate without code changes.
- Same-state transitions throw `StateTransitionError` (no silent no-ops on already-DESTROYED).

## Environment

| Var | Default | Purpose |
|---|---|---|
| `SUTAR_TENANT_INSTANCES_PORT` | 4141 | HTTP port |
| `SUTAR_TENANT_INSTANCES_MONGO_URI` | `mongodb://localhost:27017/sutar_tenant_instances` | Mongo URI |
| `SUTAR_TENANT_INSTANCES_INTERNAL_TOKEN` | `sti-internal-dev-token` | Internal token (Hub auth) |
| `JWT_SECRET` | `dev-secret-change-me` | JWT signing secret |
| `NODE_ENV` | - | `production` enables combined log format |

## See also

- [Nexha docs](../../../../docs/nexha/) — federation architecture
- [ADR-0010](../../../docs/ADR/0010-MULTI-TENANT-FEDERATION.md) — full phase plan
- [nexha-commerce-runtime](../../../../../../Nexha/services/nexha-commerce-runtime/CLAUDE.md) — Phase 8 (sister service)