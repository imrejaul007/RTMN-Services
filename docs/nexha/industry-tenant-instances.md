# industry-tenant-instances — ADR-0010 Phase 10 Architecture

> **Status:** ✅ Shipped (2026-06-23)
> **Service:** [`@rtmn/industry-tenant-instances`](../../industry-os/services/industry-tenant-instances/)
> **Port:** `4365`
> **Phase:** ADR-0010 Phase 10

This document explains the **design decisions** behind `industry-tenant-instances`
— the per-tenant Industry OS shard manager. It complements the service-level
[CLAUDE.md](../../industry-os/services/industry-tenant-instances/CLAUDE.md)
(which is the operational reference) by explaining the **why**.

---

## The problem

RTMN's vertical layer is 24+ Industry OS services: Healthcare, Finance, Hotel,
Restaurant, Legal, Education, etc. Each Industry OS today runs as a **single shared
instance** — one Healthcare OS, one Restaurant OS, etc.

This breaks down for **large** and **regulated** tenants:

| Tenant type | Why shared breaks |
|---|---|
| Hospital chain (1,000+ beds across 20 sites) | One tenant's load spikes another; can't isolate PHI |
| National bank | Compliance audit needs separate DB; can't coexist on shared infra |
| Hotel franchise | Per-brand customization; one franchise's outage hits another |
| Restaurant chain | Per-region data residency (e.g. EU customer data must stay in EU) |
| Government tenant | Cannot share compute with private sector tenants |

Each needs its own **shard** with:

1. **Dedicated compute / database** (no noisy neighbours).
2. **Compliance metadata** (HIPAA, PCI-DSS, GDPR, SOC2) stamped on the shard.
3. **Per-tenant API keys** (so tenant-side services can call back).
4. **Independent lifecycle** (suspend one tenant without affecting the rest).
5. **Independent usage metrics & limits** (for billing and capacity).

That's what `industry-tenant-instances` provides.

---

## Why a registry, not real provisioning

A real implementation of "provision an Industry OS shard" means standing up
a new MongoDB collection (or instance), a new Express process, a new DNS
record, and wiring them into the Hub. That's a lot of moving parts.

`industry-tenant-instances` is **the registry that tracks these shards**
and exposes the lifecycle controls. The actual provisioning of compute
and database is a side-effect that an external orchestrator (or a future
Phase 11+ service) performs, then reports back via
`POST /api/instances/:id/health` and `POST /api/instances/:id/usage`.

This split keeps the registry small, testable, and stateless (apart from
MongoDB), while letting ops choose their own provisioning layer
(Kubernetes, AWS RDS, Terraform, etc.).

---

## Why the `(tenantId, industry)` pair is the key

Phase 9 (`sutar-tenant-instances`) keys instances on `tenantId` alone
because the SUTAR layer is horizontal — every tenant gets **one** SUTAR shard.

Phase 10 is different. Industry OS is **vertical** — there are 24 separate
services. A single tenant may legitimately want:

- A **healthcare** instance (their hospital operations)
- A **finance** instance (their billing / payments)
- A **hotel** instance (their hospitality subsidiary)

So the natural key is `(tenantId, industry)` — one active instance per
**pair**, but a tenant can hold many pairs.

```js
// Valid:
tenantId: 't_hospital_group'
industry:  'healthcare'   → instance #1
industry:  'finance'      → instance #2  (different pair, both OK)
industry:  'hotel'        → instance #3  (different pair, both OK)

// Invalid (409 Conflict):
tenantId: 't_hospital_group'
industry:  'healthcare'   → instance #1 exists in PROVISIONING/ACTIVE/SUSPENDED
industry:  'healthcare'   → BLOCKED — same pair, would duplicate
```

Compound unique index `{ tenantId: 1, industry: 1 }` makes this enforced
at the DB level, not just the service level.

---

## Why three isolation levels (SHARED / DEDICATED / ISOLATED)

Not every tenant needs a separate database. Provisioning a dedicated
MongoDB instance is real cost (compute, ops, backups). The right answer
depends on tenant size and regulatory posture:

| Level | Provisioning effort | Cost | Compliance fit | Auto-activate |
|---|---|---|---|---|
| `SHARED` | None — same DB, logical `tenantId` partition | Near-zero | Small tenants, startups | ✅ Yes |
| `DEDICATED` | Dedicated collection or DB on shared cluster | Medium | Medium tenants, opt-in compliance | ❌ Manual |
| `ISOLATED` | Dedicated MongoDB instance, custom infra | High | Large / regulated (HIPAA, PCI-DSS) | ❌ Manual |

SHARED is the default and is **always auto-activated** (no infrastructure
to provision). DEDICATED and ISOLATED require explicit `autoActivate: true`
because real provisioning is expected to happen between provision and activation.

This mirrors AWS's shared/dedicated/hosted tenancy model and gives tenants
a smooth upgrade path: start SHARED, upgrade to DEDICATED when the tenant
grows, escalate to ISOLATED when regulators arrive.

---

## Why compliance metadata, not a separate service

HIPAA / PCI-DSS / GDPR / SOC2 / data residency are first-class
**properties of an Industry OS shard**, not separate services. The compliance
metadata travels with the shard — when the shard is suspended, its
compliance state is preserved; when it's destroyed, the audit trail
(in metadata + usage history) stays.

Putting compliance in the same record means:

- One query gets everything ops needs (`GET /api/instances/:id` returns
  the shard **and** its compliance framework, audit log flag, data residency).
- Limit checks can read compliance constraints directly (e.g. an
  ISOLATED HIPAA shard can't accidentally fall back to SHARED).
- Audit reporting is a `find({ 'compliance.framework': 'HIPAA' })` query.

---

## Why a state machine, not booleans

The lifecycle has 6 states with non-obvious transitions:

```
PROVISIONING → ACTIVE | SUSPENDED | DESTROYING | FAILED
ACTIVE       → SUSPENDED | DESTROYING | FAILED
SUSPENDED    → ACTIVE | DESTROYING | FAILED
DESTROYING   → DESTROYED | FAILED
DESTROYED    → ∅  (terminal)
FAILED       → DESTROYING
```

Storing this as `{ active: true, suspended: false, destroyed: false }`
booleans would let `destroyed: true, active: true` slip through (or any
other inconsistent combination). The state machine enforces:

- **Same-state transitions throw** (no silent no-ops on `DESTROYED → DESTROYED`).
- **Terminal-state guard** (you can't `suspend` a `DESTROYED` instance).
- **HTTP 422** with `{ from, to }` body so callers can react precisely.

This is the same pattern Phase 9 (SUTAR instances) and the earlier
commerce-runtime use. Consistency across services makes the API
predictable for do-app and REZ-Workspace clients.

---

## Why SHA-256 hashed API keys

Per-instance API keys (`ik_<48hex>`) authenticate **tenant-side services**
when they call back into their Industry OS shard. The key is the only
proof of identity. If the database is breached, plaintext keys would let
attackers impersonate tenants.

Storing the **SHA-256 hash** means:

- Breach of the registry DB doesn't leak usable keys.
- Plaintext is returned **only on create and rotate** — the two moments
  a caller genuinely needs it.
- Verification at request time is `crypto.createHash('sha256').update(key).digest('hex') === stored`.

The `apiKeyHash` field is **never** returned in any GET or list response —
the service layer strips it (`stripApiKeyHash`).

---

## Why daily usage counters + high-water marks

Two different metrics semantics in one row:

| Field | Semantics | Example |
|---|---|---|
| `apiCalls` | **Increment** (additive) — total per day | 100 + 75 + 50 = 225 |
| `recordsCreated` | **Increment** (additive) — total per day | 5 + 12 + 3 = 20 |
| `workflowsExecuted` | **Increment** (additive) — total per day | 2 + 1 + 4 = 7 |
| `errorCount` | **Increment** (additive) — total per day | 1 + 0 + 2 = 3 |
| `recordsActive` | **High-water mark** — last-seen value | 150 (most recent report) |
| `storageMbUsed` | **High-water mark** — last-seen value | 256 (most recent report) |

**Counters** are for billing ("you used 10,000 API calls this month").
**High-water marks** are for capacity ("your tenant currently holds
150 active records, 256 MB stored"). Mixing them in one model with
`$inc` for counters and `$set` for high-water marks keeps the model
simple and avoids the confusion of separate "current vs total" tables.

The compound unique index `(instanceId, date)` ensures exactly one row
per instance per day, even if `recordUsage` is called thousands of times
that day (the upsert merges into the same row).

---

## Why limit enforcement is advisory, not blocking

`GET /api/instances/:id/limits` returns **violations** but doesn't
auto-suspend or alert. Real enforcement happens in two places:

1. **Upstream caller** (the Industry OS service itself) checks the
   registry before admitting a write.
2. **External orchestrator** (e.g. a billing system or ops dashboard)
   polls `/limits` and decides what to do — throttle, alert, suspend.

This keeps the registry **stateless about enforcement**. It records
facts (how many API calls happened today); it doesn't unilaterally
take destructive actions based on those facts. The Hub, the Industry
OS service, and the ops team make the policy calls.

---

## Hub wiring

The Hub (`@rez/rez-ecosystem-connector@1.9.0`) exposes:

```
GET  /api/nexha/industry-tenant-instances/api/...
ANY  /api/nexha/industry-tenant-instances/api/<path>
GET  /api/nexha/capabilities   # 5 capabilities registered
```

The route prefix `/api/nexha/` (not `/api/sutar/`) reflects that
**industry-tenant-instances** is owned by `industry-os/` (RTMN), not by
`sutar-os/` (HOJAI-AI). This split matches the architectural ownership
and avoids future confusion when Phase 9 (`sutar-tenant-instances`,
SUTAR-layer) and Phase 10 (`industry-tenant-instances`, Industry-layer)
are referenced together.

**5 capabilities registered:**

| Capability | Maps to |
|---|---|
| `industry-tenant-instances` | self |
| `industry-shard` | self |
| `industry-isolation` | self |
| `industry-provisioning` | self |
| `industry-lifecycle` | self |

---

## Clients

Three SDKs consume the service:

| Client | Methods | Tests |
|---|---:|---:|
| `industry-tenant-instances` (vitest) | service + routes | 96 |
| `do-app/backend/src/services/hojaiClient.ts` (`sutar.industryTenantInstances.*`) | 16 | 20 |
| `REZ-Workspace/core/unified-fabric/src/connections/nexha.js` (`provisionIndustryInstance`, `listIndustryInstances`, etc.) | 17 | 20 |

All clients route through the Hub (`http://localhost:4399/api/nexha/industry-tenant-instances/api/...`),
keeping cross-language consumers (TypeScript, JavaScript) and cross-process
callers (Hub, do-app backend, REZ-Workspace core) consistent.

---

## What's NOT in Phase 10

Phase 10 deliberately does **not** include:

1. **Real provisioning** of compute / database. The service is the registry;
   a future phase (Phase 11+ or external ops layer) does the actual infra.
2. **Tenant-side authentication** of inbound API key calls. Phase 10 issues
   keys; verifying them at the Industry OS service is the responsibility
   of the upstream caller.
3. **Billing integration**. Usage metrics are recorded; integrating them
   with RABTUL invoicing is a separate phase.
4. **Multi-region replication** of a single shard. Each shard is in one
   region; cross-region replication is a future concern.

---

## See also

- [ADR-0010 — Multi-Tenant Federation](..//ADR/0010-MULTI-TENANT-FEDERATION.md)
- [Phase 9 — SUTAR Tenant Instances (parallel for horizontal layer)](./sutar-tenant-instances.md)
- [PHASE-LOG.md](./PHASE-LOG.md) — running log of all phases
- [Service CLAUDE.md](../../industry-os/services/industry-tenant-instances/CLAUDE.md) — operational reference
