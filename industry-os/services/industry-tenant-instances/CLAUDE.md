# industry-tenant-instances

> **Per-Tenant Industry OS Instance Manager** — ADR-0010 Phase 10 (2026-06-22).
> Provisions, suspends, resumes, and destroys **isolated Industry OS shards**
> per large or regulated tenant.

**Port:** `4365`
**Package:** `@rtmn/industry-tenant-instances`
**Repo:** [imrejaul007/rtmn](https://github.com/imrejaul007/rtmn) → `industry-os/services/industry-tenant-instances/`

---

## What this service does

Most RTMN tenants share a single Industry OS instance (e.g. one Restaurant OS).
Large tenants — enterprise healthcare systems, hospital chains, banks — need:

1. **Dedicated compute / database** so other tenants can't impact them.
2. **Compliance metadata** (HIPAA, PCI-DSS, GDPR, SOC2) recorded on the instance.
3. **Per-tenant API keys** (rotated independently) for tenant-side auth.
4. **Independent lifecycle**: suspend one tenant without freezing the rest.
5. **Independent usage metrics & limits** for billing and capacity.

`industry-tenant-instances` is the lifecycle manager for those shards.

---

## Why this exists

ADR-0010 (Multi-Tenant Federation) lays out the 11 phases that turn RTMN from a single
shared bus into a federation of tenant-scoped services. **Phase 9** introduced
**SUTAR Tenant Instances** (port 4141) for autonomous-economy isolation.
**Phase 10** is the parallel for the **Industry OS layer**: a hospital chain
gets its own `healthcare` instance, a bank gets its own `finance` instance.

---

## State machine

```
              ┌──────────────┐
              │ PROVISIONING │──┐
              └──────┬───────┘  │
                     │          │
                     ▼          │ (autoActivate:false)
              ┌──────────────┐  │ (or SHARED isolation)
              │    ACTIVE    │◀─┘
              └──┬───────┬───┘
                 │       │
        suspend  │       │  fail
                 ▼       ▼
         ┌──────────┐  ┌────────┐
         │SUSPENDED │  │ FAILED │
         └────┬─────┘  └───┬────┘
              │            │
       resume │            │ destroy
              │            │
              ▼            ▼
         ┌──────────┐  ┌────────────┐
         │  ACTIVE  │  │ DESTROYING │
         └──────────┘  └─────┬──────┘
                            │
                            ▼
                       ┌──────────┐
                       │ DESTROYED│ (terminal)
                       └──────────┘
```

Allowed transitions:

| From → To | Allowed |
|-----------|---------|
| `PROVISIONING → ACTIVE / SUSPENDED / DESTROYING / FAILED` | ✅ |
| `ACTIVE → SUSPENDED / DESTROYING / FAILED` | ✅ |
| `SUSPENDED → ACTIVE / DESTROYING / FAILED` | ✅ |
| `DESTROYING → DESTROYED / FAILED` | ✅ |
| `FAILED → DESTROYING` | ✅ |
| `DESTROYED → anything` | ❌ (terminal) |

`assertTransition` throws `StateTransitionError` (HTTP 422) for any forbidden
or same-state transition.

---

## Isolation levels

| Level | Database | Use case |
|-------|----------|----------|
| `SHARED` | shared RTMN DB, tenant-id partition | small tenants, fast onboarding (default; auto-activates) |
| `DEDICATED` | dedicated MongoDB collection / schema on shared cluster | medium tenants, compliance opt-in |
| `ISOLATED` | dedicated MongoDB instance (separate `databaseUri`) | large / regulated tenants (HIPAA, PCI-DSS) |

---

## Auth — dual mode

1. **JWT** (`Authorization: Bearer <token>`) requires `industry:admin` role on the
   `roles` claim. Token must include `tenantId`.
2. **Internal token** (`x-internal-token: <token>` + `x-tenant-id: <tenantId>`)
   for Hub-to-service calls. Token: `INDUSTRY_TENANT_INSTANCES_INTERNAL_TOKEN`.

`requireAuth` returns:
- 401 if no token / malformed / bad signature
- 400 if internal token but missing `X-Tenant-Id`
- 403 if JWT valid but no `industry:admin` role

---

## HTTP API

All routes prefixed with `/api/instances` unless noted.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/api/instances` | `{ tenantId, industry, isolationLevel?, region?, namespace?, databaseUri?, apiKey?, limits?, compliance?, routes?, tags?, metadata?, autoActivate? }` | `201` + instance with `_apiKey` |
| `GET` | `/api/instances` | query: `status, tenantId, industry, isolationLevel, region, complianceFramework, limit, offset` | `200` + `{ instances, total, limit, offset }` |
| `GET` | `/api/instances/:id` | — | `200` + instance (no `apiKeyHash`) |
| `GET` | `/api/instances/by-tenant/:tenantId?industry=…` | — | `200` + instance |
| `PATCH` | `/api/instances/:id` | `{ isolationLevel?, region?, limits?, compliance?, routes?, tags?, metadata? }` | `200` + instance |
| `POST` | `/api/instances/:id/suspend` | `{ reason? }` | `200` + instance |
| `POST` | `/api/instances/:id/resume` | — | `200` + instance |
| `POST` | `/api/instances/:id/destroy` | `{ reason? }` | `200` + instance |
| `POST` | `/api/instances/:id/fail` | `{ reason? }` | `200` + instance |
| `POST` | `/api/instances/:id/rotate-key` | — | `200` + `{ instanceId, _apiKey }` |
| `POST` | `/api/instances/:id/health` | `{ status: 'healthy'\|'degraded'\|'unhealthy'\|'unknown' }` | `200` + instance |
| `POST` | `/api/instances/:id/usage` | `{ apiCalls?, recordsCreated?, recordsUpdated?, workflowsExecuted?, errorCount?, recordsActive?, storageMbUsed? }` | `200` + usage |
| `GET` | `/api/instances/:id/usage?date=&startDate=` | — | `200` + `{ instanceId, tenantId, industry, start, end, metrics[] }` |
| `GET` | `/api/instances/:id/limits` | — | `200` + `{ instanceId, status, limits, violations[] }` |
| `GET` | `/api/stats?industry=` | — | `200` + `{ instances: { total, byStatus, byIndustry, byIsolation }, usage: { totals } }` |
| `GET` | `/health` | — | `200` + `{ status: 'ok' }` |
| `GET` | `/ready` | — | `200` + `{ status: 'ready' }` |
| `GET` | `/` | — | service descriptor |
| `GET` | `/api/validate` | — | `{ ok: true }` |

Error codes:

| Code | Class |
|------|-------|
| `400` | `ValidationError`, Zod failure |
| `401` | Missing/invalid auth |
| `403` | JWT without `industry:admin` role |
| `404` | `NotFoundError` |
| `409` | `ConflictError` (duplicate tenant+industry pair, or `instanceId` clash) |
| `422` | `StateTransitionError` (forbidden transition, terminal state) |
| `500` | Unhandled error |

---

## Models

### IndustryInstance

```js
{
  instanceId: 'iti_<16hex>',         // unique
  tenantId:   't_001',
  industry:   'healthcare',          // enum: 24 industries
  status:     'PROVISIONING'|'ACTIVE'|'SUSPENDED'|'DESTROYING'|'DESTROYED'|'FAILED',
  isolationLevel: 'SHARED'|'DEDICATED'|'ISOLATED',
  region:     'global',
  namespace:  'industry_healthcare_t_001',
  databaseUri: 'mongodb://...',      // null for SHARED
  apiKeyHash: '<sha256>',            // never returned; _apiKey returned only on create/rotate
  limits: {
    maxApiCallsPerMinute:    600,
    maxRecordsPerTenant:     100000,
    storageMbLimit:          1024,
    maxConcurrentWorkflows:  50,
  },
  compliance: {
    framework:             'HIPAA',
    auditLogEnabled:       true,
    dataResidencyRegion:   'us-east-1',
    encryptionAtRest:      true,
    encryptionInTransit:   true,
    notes:                 '...',
  },
  routes: [
    { pathPrefix: '/healthcare', upstreamUrl: 'http://...', enabled: true },
    ...
  ],
  tags:     ['prod'],
  metadata: {},
  provisionedAt:    Date,
  suspendedAt:      Date|null,
  destroyedAt:      Date|null,
  lastHealthCheckAt: Date|null,
  healthCheckStatus: 'healthy'|'degraded'|'unhealthy'|'unknown',
}
```

Indexes:
- `{ instanceId }` unique
- `{ tenantId }`
- `{ status }`
- `{ tenantId, industry }`
- `{ industry, status }`
- `{ tenantId, status }`

### UsageMetric

Daily counters (one row per `instanceId + date`):

```js
{
  instanceId: 'iti_<...>',
  tenantId:   't_001',
  industry:   'healthcare',
  date:       '2026-06-22',      // ISO YYYY-MM-DD
  apiCalls:           100,       // additive
  recordsCreated:     5,         // additive
  recordsUpdated:     12,        // additive
  workflowsExecuted:  2,         // additive
  errorCount:         1,         // additive
  recordsActive:      150,       // high-water
  storageMbUsed:      256,       // high-water
}
```

---

## Conflict semantics

**One active instance per `(tenantId, industry)` pair.**

A tenant may hold instances for **multiple industries** simultaneously
(`t_001` can have a healthcare AND a finance instance at the same time),
but cannot hold two healthcare instances. A new provision returns 409 if
any non-terminal instance (`PROVISIONING|ACTIVE|SUSPENDED`) already exists
for the pair. After `destroy` → `DESTROYED`, a new provision is allowed.

---

## API key handling

- API keys are prefixed `ik_` (industry key), followed by 48 hex chars (24 random bytes).
- **Plaintext is returned only on create (`provisionInstance`) and rotate (`rotateApiKey`).**
- Storage is the SHA-256 hash (`apiKeyHash`, 64-char hex).
- Hash is **never** included in any GET / list response.
- Rotation generates a new key, hashes it, and returns plaintext once.

---

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `INDUSTRY_TENANT_INSTANCES_PORT` | `4365` | HTTP port |
| `INDUSTRY_TENANT_INSTANCES_MONGO_URI` / `MONGO_URI` | `mongodb://localhost:27017/industry_tenant_instances` | MongoDB |
| `INDUSTRY_TENANT_INSTANCES_INTERNAL_TOKEN` | `iti-internal-dev-token` | Internal-token shared secret |
| `JWT_SECRET` | `dev-secret-change-me` | HS256 secret |

---

## Run

```bash
cd industry-os/services/industry-tenant-instances
npm install
npm start        # production
npm run dev      # nodemon-style watch
npm test         # 96 tests
```

---

## Tests

96 vitest tests across 2 files:

| File | Tests | Covers |
|------|-------|--------|
| `__tests__/unit/instanceService.test.js` | 47 | provisioning, lifecycle, conflict, compliance, usage, limits, stats |
| `__tests__/unit/routes.test.js` | 49 | auth gates, Zod validation, status codes, HTTP layer |

Both files share a single MongoMemoryServer via `globalThis[STATE_KEY]` so they
don't fight over port 27017 in parallel.

---

## Wire-up

- **Hub route:** `POST /api/sutar/industry-tenant-instances/<path>` (added to
  `RABTUL-Technologies/REZ-ecosystem-connector` at v1.9.0)
- **Capability namespace:** `sutar.industryTenantInstances` (do-app client)
- **REZ-Workspace:** `NexhaConnection` exposes `provisionIndustryInstance`,
  `listIndustryInstances`, etc.

---

## See also

- [ADR-0010 Multi-Tenant Federation](../../docs/ADR/0010-MULTI-TENANT-FEDERATION.md) — full 11-phase plan
- [Phase 9 — SUTAR Tenant Instances](../sutar-tenant-instances) — parallel for SUTAR layer
- [docs/nexha/PHASE-LOG.md](../../docs/nexha/PHASE-LOG.md) — running log of phases A-J
