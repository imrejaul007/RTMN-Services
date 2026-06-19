# Tenant Manager

> **Service:** `rtmn-tenant-manager`
> **Port:** 4747
> **Layer:** Foundation (Layer 1)
> **Division:** HOJAI AI - Division 1 (Foundation)
> **Owner:** HOJAI AI
> **Status:** Scaffolded (in-memory)

Multi-tenant data isolation, project grouping, role-based membership, API key
management, and usage metering for the RTMN / HOJAI AI B2B surface. This
service is **required before any B2B offering** is exposed to external
customers.

---

## Why this exists

The foundation division ships the lowest-level platform primitives. A
multi-tenant boundary is one of them: every other service that stores customer
data needs to know *which tenant* it is operating on behalf of, and to enforce
that boundary. Without a tenant manager, the platform is single-tenant by
default - which blocks the entire B2B roadmap.

This service owns:
- the tenant record (the root identity for billing, quotas, region)
- projects (sub-organizations within a tenant)
- members (user -> tenant -> role mapping)
- API keys (machine-to-machine auth for tenant integrations)
- usage / metering (the raw events that feed Billing)

---

## Quick start

```bash
cd services/tenant-manager
npm install
npm start
# TenantManager running on port 4747
```

Health check:

```bash
curl http://localhost:4747/health
curl http://localhost:4747/api/health
```

The service starts with **pre-seeded data** (see "Pre-seeded data" below) and
prints the seed API key to the console - copy it now, it will not be shown
again.

---

## Plans

| Plan | maxUsers | maxProjects | monthlyRequestLimit |
|------|---------:|------------:|--------------------:|
| `free` | 3 | 1 | 10,000 |
| `starter` | 10 | 5 | 100,000 |
| `pro` | 50 | 25 | 1,000,000 |
| `enterprise` | 5,000 | 500 | 50,000,000 |

Limits are defined in `src/index.js` (`PLAN_LIMITS`) and enforced at the
project and member endpoints. Wiring to Billing for hard enforcement and
overage is a TODO.

## Roles

`owner`, `admin`, `member`, `viewer`, `billing`. Role semantics are not yet
enforced on every endpoint (this service is the source of role truth, not the
authoritative guard for everything downstream) - downstream services should
consult `/api/tenants/:id/members/:userId` via the API Gateway.

## Tenant status

`active`, `suspended`, `deleted`. Deletion is **soft** - the record stays so
audits resolve.

## Regions

`us-east`, `us-west`, `eu-west`, `eu-central`, `ap-south`, `ap-east`,
`me-central`. Region is recorded on the tenant; data residency enforcement is a
TODO.

---

## API

### Tenants

| Method | Path | Notes |
|--------|------|-------|
| `POST`   | `/api/tenants` | Create. Body: `name`, `slug`, `plan?`, `status?`, `metadata?`, `settings?`, `region?` |
| `GET`    | `/api/tenants` | List. Query: `status`, `plan`, `region` |
| `GET`    | `/api/tenants/:id` | By id |
| `GET`    | `/api/tenants/by-slug/:slug` | By slug |
| `PUT`    | `/api/tenants/:id` | Partial update (name/plan/metadata/settings/region) |
| `DELETE` | `/api/tenants/:id` | Soft delete (status -> `deleted`) |
| `POST`   | `/api/tenants/:id/suspend` | Set status `suspended` |
| `POST`   | `/api/tenants/:id/activate` | Set status `active` |

### Projects

| Method | Path | Notes |
|--------|------|-------|
| `POST`   | `/api/tenants/:id/projects` | Body: `name`, `slug`, `metadata?` |
| `GET`    | `/api/tenants/:id/projects` | List for tenant |
| `GET`    | `/api/projects/:projectId` | By id |
| `PUT`    | `/api/projects/:projectId` | Update name / metadata |
| `DELETE` | `/api/projects/:projectId` | Hard delete (project only) |

### Members

| Method | Path | Notes |
|--------|------|-------|
| `POST`   | `/api/tenants/:id/members` | Body: `userId`, `email`, `role?`, `projectIds?` |
| `GET`    | `/api/tenants/:id/members` | List |
| `PUT`    | `/api/tenants/:id/members/:userId` | Update role / projectIds |
| `DELETE` | `/api/tenants/:id/members/:userId` | Remove |

### API keys

| Method | Path | Notes |
|--------|------|-------|
| `POST`   | `/api/tenants/:id/keys` | Body: `name`, `scopes?`, `expiresAt?` - **returns plaintext once** |
| `GET`    | `/api/tenants/:id/keys` | List - **never returns plaintext** |
| `DELETE` | `/api/tenants/:id/keys/:keyId` | Revoke (sets `revokedAt`) |
| `POST`   | `/api/keys/validate` | Body `{ key }` - returns `{ valid, tenantId, tenantSlug, scopes, keyId }` |

API keys are 32-character random strings. Only the SHA-256 hash is stored.
Plaintext is returned **only** at creation time and is printed to the console
once during pre-seed.

### Usage / metering

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/tenants/:id/usage` | Body: `metric`, `quantity`, `timestamp?`, `metadata?` |
| `GET`  | `/api/tenants/:id/usage` | Filter by `metric`, `from`, `to`, `limit` |
| `GET`  | `/api/tenants/:id/usage/aggregate` | `{ total, count }` per metric, with monthly limit from plan |

### Audit

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/tenants/:id/audit` | Per-tenant audit log |
| `GET` | `/api/audit` | Global; filter by `tenantId`, `action`, `limit` |

### Health

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | Static service info (plans, roles, regions) |
| `GET` | `/api/health` | Counts (tenants, projects, keys, usage, audit) |

---

## Pre-seeded data

On first start the service seeds:

- 1 tenant: **Acme Corp** (slug `acme-corp`, plan `pro`, region `us-east`)
- 2 members:
  - `owner@acme.com` (role: `owner`)
  - `admin@acme.com` (role: `admin`)
- 1 project: **Main App** (slug `main-app`)
- 1 API key (printed to stdout at startup)
- 5 usage events across `calls`, `storage_gb`, `ai_tokens`

Both members are pre-bound to the `main-app` project.

---

## Storage

Currently in-memory (`Map`). Data is lost on restart.

### TODO (persistence)

Replace the Maps with a Postgres backend. Per-tenant row-level security
policies should be the primary isolation mechanism - this service should only
ever see one tenant per query, and DB-level RLS is the safety net.

---

## Integrations

### TODO (CorpID sync)

`members[].userId` should be sourced from CorpID (port 4702). Today the API
accepts any string. Once CorpID is the source of truth, the Tenant Manager
should resolve `email -> userId` via CorpID before accepting a member add.

### TODO (Billing)

Usage events recorded here should be forwarded to the Billing service for
invoice generation and overage alerting. Plan-limit enforcement on this
service is currently advisory - hard limits should live in Billing so quota
changes propagate without a code deploy here.

### TODO (data residency)

Region is captured but not enforced. Writes to a tenant from outside its
declared region should be rejected at the API Gateway using `X-Region` headers
or the requester's known deployment zone.

---

## Security

- `helmet` security headers on every response
- CORS open (tighten before production)
- API keys stored as SHA-256 hash only - plaintext returned exactly once
- No authentication middleware yet - the API Gateway (port 4000) is expected
  to terminate auth and inject tenant context
- Append-only audit log; soft-delete on tenants preserves audit trails

---

## File layout

```
services/tenant-manager/
├── CLAUDE.md
├── package.json
└── src/
    └── index.js
```

Pattern follows `services/event-bus/src/index.js` (CommonJS, express, uuid,
in-memory Map) per project convention.

---

*Last updated: 2026-06-19*
*Part of the HOJAI AI Foundation Division.*
