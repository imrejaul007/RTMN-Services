# sutar-tenant-instances — Architecture

> **ADR-0010 Phase 9 (2026-06-22).** The lifecycle manager for per-tenant SUTAR shards. Port **4141**.

## Why this service exists

By default, every Nexha tenant runs on a **shared SUTAR cluster**:
- One MongoDB database, all tenants mixed together, isolated by `tenantId` field.
- One set of SUTAR services (gateway, decision engine, economy, etc.).
- One rate limit, one storage limit.

This works for 95% of tenants. But for the **other 5%**, sharing is not acceptable:

| Tenant type | Why they need isolation |
|---|---|
| **Healthcare (HIPAA)** | Cannot co-mingle PHI with other tenants in a shared DB |
| **Finance (PCI-DSS)** | Card data must be in a separate, audited environment |
| **Government** | Sovereign data residency (data must stay in specific region) |
| **Large enterprise (chain of 500+ restaurants)** | Need higher rate limits, dedicated health monitoring, custom routes |
| **Multi-region nexhas** | Need a regional SUTAR shard for latency |

`sutar-tenant-instances` is the **registry** of those shards. It tracks who has one, in what state, with what limits, and exposes the operational controls (suspend, resume, destroy, rotate key, usage, limits check).

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   RTMN Hub (4399)                            │
│                                                              │
│  /api/sutar/sutar-tenant-instances/* ───► this service (4141)│
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              sutar-tenant-instances                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ TenantInstance│  │ TenantInstance│  │ TenantInstance│     │
│  │  t_acme      │  │  t_finance   │  │  t_gov       │     │
│  │  ACTIVE      │  │  DEDICATED   │  │  ISOLATED    │     │
│  │  SHARED      │  │  us-east-1   │  │  eu-west-1   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                  │                  │               │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐       │
│  │ Shared Mongo │  │ Separate DB  │  │ Separate DB  │       │
│  │ (SUTAR)      │  │ (acme)       │  │ (gov)        │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌──────────────┐                                            │
│  │ UsageMetric  │  daily counters per instance               │
│  │ (compound)   │  apiCalls, missionsCreated, etc.          │
│  └──────────────┘                                            │
└──────────────────────────────────────────────────────────────┘
```

The service is **stateless** — it does NOT run the shards themselves. It tracks the metadata. The actual SUTAR services (gateway, decision engine, economy, etc.) run elsewhere; the instance record tells them where to route and what limits to enforce.

## Isolation levels

| Level | Database | Limits | Routes | When to use |
|---|---|---|---|---|
| **SHARED** | Same MongoDB | Shared pool | None (default routing) | 95% of tenants — the default |
| **DEDICATED** | Separate MongoDB | Custom | Optional overrides | Medium tenants — data separation |
| **ISOLATED** | Separate MongoDB | Custom (strict) | Custom (full override) | Regulated industries — full control |

### SHARED (auto-activate)

The tenant's data lives in the same MongoDB as everyone else, isolated by `tenantId` in compound unique indexes. No infrastructure work. The instance record is created and immediately moved to ACTIVE.

```js
// Create a SHARED instance — fast, no infra
const inst = await provisionInstance({ tenantId: 't_small' });
// inst.status === 'ACTIVE' immediately
```

### DEDICATED (requires autoActivate or real provisioning)

The tenant gets their own MongoDB database. In production, `provisionInstance` would chain to a DBAAS API (MongoDB Atlas, AWS DocumentDB) to create the database. In dev/tests, pass `autoActivate: true` to skip the provisioning step.

```js
const inst = await provisionInstance({
  tenantId: 't_medium',
  isolationLevel: 'DEDICATED',
  databaseUri: 'mongodb://cluster.acme.example/t_acme',
  autoActivate: true, // skip provisioning callback in dev/tests
});
```

### ISOLATED (full control)

Like DEDICATED plus:
- Custom limits (max agents, max API calls/min, max storage)
- Custom route overrides (a request to `/api/foo` from this tenant goes to a different upstream)
- Dedicated health checks

```js
const inst = await provisionInstance({
  tenantId: 't_hospital',
  isolationLevel: 'ISOLATED',
  region: 'us-east-1',
  databaseUri: 'mongodb://hipaa-cluster/hospital',
  limits: {
    maxAgents: 25,
    maxMissionsPerDay: 100,
    maxApiCallsPerMinute: 60,
    storageMbLimit: 512,
  },
  routes: [
    { pathPrefix: '/api/patient', upstreamUrl: 'https://hipaa.hospital.example/api' },
  ],
  tags: ['hipaa', 'tier1'],
  autoActivate: true,
});
```

## State machine

```
                ┌──────────────┐
                │ PROVISIONING │ ← initial state
                └──────┬───────┘
                       │ auto-activate (SHARED) or manual
                       ▼
                ┌──────────────┐         ┌─���───────────┐
         ┌─────►│    ACTIVE    │────────►│  SUSPENDED  │──┐
         │      └──┬─────┬─────┘         └──────┬──────┘  │
         │         │     │                      │         │ resume
         │         │     │ destroy              │ destroy │
         │         │     ▼                      ▼         │
         │         │  ┌────────────┐     ┌────────────┐   │
         │         │  │ DESTROYING │────►│ DESTROYED  │   │
         │         │  └─────┬──────┘     └────────────┘   │
         │         │        │ failed                    │
         │         │        ▼                           │
         │         │   ┌──────────┐                     │
         │         └──►│  FAILED  │◄────────────────────┘
         │             └────┬─────┘
         │                  │ destroy
         │                  ▼
         └─────────────► DESTROYING → DESTROYED
```

**Key invariants:**

- **Same-state transitions throw** — calling `suspendInstance` on an already-SUSPENDED instance returns 422.
- **DESTROYED is terminal** — no transitions out.
- **FAILED → DESTROYING** — operators can recover failed instances by tearing them down.
- **PROVISIONING → ACTIVE** is the only "happy" auto-transition (SHARED only).

## Auth

Two modes, both verified:

1. **JWT (HS256)** with `roles: ['sutar:admin']` claim. Issued by CorpID.
2. **Internal token** (`x-internal-token` header) + `X-Tenant-Id` header. Used by the RTMN Hub.

Both routes reject missing/invalid auth (401) and missing role (403).

## API keys

Each instance has an API key (`apiKeyHash`) used by the tenant to authenticate to SUTAR. Keys are:
- Generated as `sk_<48hex>` (24 random bytes → 48 hex chars).
- Hashed with SHA-256 before storage. Plaintext is NEVER stored.
- Returned ONCE on `provisionInstance` or `rotateApiKey` (in `_apiKey` field).
- Rotated via `POST /api/instances/:id/rotate-key`.

If the tenant loses their key, the admin must rotate it.

## Usage tracking

Daily counters per instance:

| Field | Type | Aggregation |
|---|---|---|
| `apiCalls` | counter | increments per request |
| `missionsCreated` | counter | increments |
| `missionsCompleted` | counter | increments |
| `missionsFailed` | counter | increments |
| `errorCount` | counter | increments |
| `agentsActive` | high-water mark | last value wins |
| `storageMbUsed` | high-water mark | last value wins |

`getUsage` returns the past 7 days by default (or a custom range with `startDate`/`date` params).

## Limit enforcement

`checkLimits(instanceId)` returns the violations:

```json
{
  "instanceId": "sti_abc",
  "status": "ACTIVE",
  "limits": {
    "maxAgents": 100,
    "maxMissionsPerDay": 1000,
    "maxApiCallsPerMinute": 600,
    "storageMbLimit": 1024
  },
  "violations": [
    { "metric": "apiCalls", "limit": 864000, "actual": 950000 },
    { "metric": "status", "limit": "ACTIVE", "actual": "SUSPENDED" }
  ]
}
```

Limits checked:
- `apiCalls` per day (computed as `maxApiCallsPerMinute * 1440`)
- `missionsCreated` per day
- `storageMbUsed` vs `storageMbLimit`
- `status === SUSPENDED` (always a violation — instance is paused)

When a violation is detected, the SUTAR gateway (or the orchestrator) can:
- Throttle the tenant (delay requests)
- Notify ops
- Suspend the instance automatically

## What this service does NOT do

This is the **registry**. It does NOT:

- Provision the actual database (would call out to Terraform / DBAAS / K8s in production).
- Run SUTAR services itself (that's `sutar-gateway`, `sutar-decision-engine`, etc.).
- Validate API keys (the consuming SUTAR service does that).
- Take enforcement action on limit violations (just reports them).

In production, the provisioning step would chain to:
1. Create the MongoDB database (or sharded cluster).
2. Apply limits via MongoDB roles.
3. Deploy per-tenant SUTAR sidecars (if needed).
4. Update the instance status to ACTIVE on success.
5. On destroy: revoke tokens, drop the database, call K8s delete, etc.

For SHARED instances (the default), no infrastructure work is needed — just create the registry entry and auto-activate.

## Production rollout

When a tenant upgrades from SHARED → DEDICATED or ISOLATED:

```
1. Tenant requests upgrade via console
2. Admin calls POST /api/instances { tenantId, isolationLevel: 'DEDICATED' }
   → Returns instanceId, status='PROVISIONING', _apiKey (call it OLD_KEY for now)
3. Provisioning callback fires:
   - DBAAS creates database
   - Limits applied via MongoDB roles
   - Status → ACTIVE
4. Admin updates tenant config to use the new instance
5. Tenant switches to using OLD_KEY against the new instance
6. Old SHARED instance: destroy with reason='migrated'
```

## See also

- [ADR-0010 — Multi-Tenant Federation](../ADR/0010-MULTI-TENANT-FEDERATION.md) — full 11-phase plan
- [nexha commerce runtime](./commerce-runtime.md) — Phase 8 (sister service)
- [nexha partner graph](./partner-graph.md) — Phase 7 (sister service)
- [sutar-tenant-instances CLAUDE.md](../../companies/HOJAI-AI/sutar-os/core/sutar-tenant-instances/CLAUDE.md) — service doc