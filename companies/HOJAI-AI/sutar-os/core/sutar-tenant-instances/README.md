# sutar-tenant-instances

**SUTAR Per-Tenant Instance Manager.** Manages the lifecycle of per-tenant SUTAR shards (provisioning, suspension, resumption, destruction) for large tenants that need isolated runtime environments.

> **ADR-0010 Phase 9 (2026-06-22).** Port: **4141**.

## Quick start

```bash
# Install
npm install

# Run (dev)
npm run dev

# Run (prod)
npm start

# Test
npm test
```

## What it does

Most tenants share a single SUTAR cluster. When a tenant is large, regulated, or has strict SLA requirements, they get their own **isolated SUTAR shard** (dedicated database, custom limits, custom routes). This service tracks who has one and exposes the operational controls.

| Isolation Level | Database | When to use |
|---|---|---|
| **SHARED** | Same as everyone | Default — 95% of tenants |
| **DEDICATED** | Separate MongoDB | Medium tenants |
| **ISOLATED** | Separate DB + custom limits + custom routes | Regulated industries, large chains |

## Provision an instance

```bash
curl -X POST http://localhost:4141/api/instances \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "t_acme",
    "isolationLevel": "DEDICATED",
    "region": "us-east-1",
    "limits": {
      "maxAgents": 50,
      "maxMissionsPerDay": 200,
      "maxApiCallsPerMinute": 120,
      "storageMbLimit": 1024
    },
    "routes": [
      { "pathPrefix": "/api/restaurant", "upstreamUrl": "https://acme.example.com/api" }
    ],
    "tags": ["prod", "tier1"]
  }'

# Response
# {
#   "instanceId": "sti_a1b2c3d4e5f6g7h8",
#   "tenantId": "t_acme",
#   "status": "ACTIVE",
#   "isolationLevel": "DEDICATED",
#   "_apiKey": "sk_<48hex>",  ← save this; shown only once
#   ...
# }
```

## Lifecycle

```bash
# Suspend
curl -X POST http://localhost:4141/api/instances/$INSTANCE_ID/suspend \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"reason":"maintenance window"}'

# Resume
curl -X POST http://localhost:4141/api/instances/$INSTANCE_ID/resume \
  -H "Authorization: Bearer $ADMIN_JWT"

# Destroy (irreversible)
curl -X POST http://localhost:4141/api/instances/$INSTANCE_ID/destroy \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"reason":"contract ended"}'

# Rotate API key
curl -X POST http://localhost:4141/api/instances/$INSTANCE_ID/rotate-key \
  -H "Authorization: Bearer $ADMIN_JWT"
```

## Usage tracking

```bash
# Record an event
curl -X POST http://localhost:4141/api/instances/$INSTANCE_ID/usage \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"apiCalls": 100, "missionsCreated": 5, "errorCount": 1}'

# Read usage (today + past 6 days)
curl http://localhost:4141/api/instances/$INSTANCE_ID/usage \
  -H "Authorization: Bearer $ADMIN_JWT"

# Check limits
curl http://localhost:4141/api/instances/$INSTANCE_ID/limits \
  -H "Authorization: Bearer $ADMIN_JWT"
# {
#   "instanceId": "sti_...",
#   "status": "ACTIVE",
#   "limits": { ... },
#   "violations": []
# }
```

## State machine

```
PROVISIONING ─┬─► ACTIVE ─┬─► SUSPENDED ─┬─► ACTIVE (resume)
              │           │              ├─► DESTROYING → DESTROYED
              │           └─► DESTROYING → DESTROYED
              │           └─► FAILED ─────► DESTROYING → DESTROYED
              ├─► SUSPENDED ─┬─► ACTIVE
              │              └─► DESTROYING
              ├─► DESTROYING → DESTROYED
              └─► FAILED
```

Same-state transitions throw (no silent no-ops).

## Auth

Two modes (either is accepted):

1. **JWT (HS256)** with `roles: ['sutar:admin']` claim.
2. **Internal token** (`x-internal-token` header) + `X-Tenant-Id` header. Used by the RTMN Hub.

```bash
# JWT
curl -H "Authorization: Bearer $ADMIN_JWT" http://localhost:4141/api/instances

# Internal token (Hub)
curl -H "x-internal-token: $TOKEN" -H "x-tenant-id: t_admin" http://localhost:4141/api/instances
```

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the full architecture document.

See [docs/ADR/0010-MULTI-TENANT-FEDERATION.md](../../../docs/ADR/0010-MULTI-TENANT-FEDERATION.md) for the ADR-0010 plan.

## Tests

```bash
npm test
```

75 tests across 2 files (state machine + HTTP layer).

## Environment

| Var | Default | Purpose |
|---|---|---|
| `SUTAR_TENANT_INSTANCES_PORT` | `4141` | HTTP port |
| `SUTAR_TENANT_INSTANCES_MONGO_URI` | `mongodb://localhost:27017/sutar_tenant_instances` | Mongo URI |
| `SUTAR_TENANT_INSTANCES_INTERNAL_TOKEN` | `sti-internal-dev-token` | Internal token (Hub auth) |
| `JWT_SECRET` | `dev-secret-change-me` | JWT signing secret |