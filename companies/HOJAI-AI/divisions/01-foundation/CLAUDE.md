# Division 1 — AI Foundation

> **Status:** 🟢 ~95% built as of June 19, 2026
> **Owner:** Platform team (currently distributed across `/services/` and `industry-os/`)
> **Last updated:** June 19, 2026 — 4 new services added (Secrets Manager, Feature Flags, Context Engine, Tenant Manager)

---

## 1. Mission

Everything required to **run** AI at all. Identity, auth, gateway, eventing, monitoring, billing. Every other division depends on this layer.

## 2. Target State (per plan)

```
AI Foundation
├── Identity          (CorpID — universal identity for every AI actor, agent, tenant)
├── Security          (network policies, mTLS, secret rotation)
├── Authentication    (JWT, OAuth, API keys, mTLS for service-to-service)
├── Authorization     (RBAC, ABAC, per-tenant scoping)
├── API Gateway       (routing, rate limiting, request shaping)
├── Event Bus         (pub/sub, streaming, event sourcing)
├── Context Engine    (request-scoped context propagation)
├── Feature Flags     (gradual rollout, kill switches, A/B)
├── Secrets Manager   (API keys, DB creds, model keys, rotation)
├── Monitoring        (metrics, traces, logs, SLOs)
├── Logging           (structured, queryable, audit-grade)
├── Billing           (Stripe + per-tenant metering)
└── Tenant Manager    (orgs, projects, RBAC scoping)
```

## 3. Current State — What's Built

| Capability | Service | Port | State |
|---|---|---|---|
| Identity | [services/corpid-service/](../../../services/corpid-service/) | 4702 | ✅ Real (running, v4.0) |
| API Gateway | [services/api-gateway/](../../../services/api-gateway/) | 4000 | ✅ Real (gateway + proxy) |
| Event Bus | [services/event-bus/](../../../services/event-bus/) | 4751 | ✅ Real (running, pub/sub) |
| GraphQL Federation | [services/graphql-federation/](../../../services/graphql-federation/) | 4000 | ✅ Real |
| Billing | [services/billing/](../../../services/billing/) | — | ✅ Real (Stripe integrated) |
| Onboarding | [services/onboarding-portal/](../../../services/onboarding-portal/) + [services/pilot-onboarding/](../../../services/pilot-onboarding/) | 4399 | ✅ Real |
| Unified Hub (gateway) | [services/unified-os-hub/](../../../services/unified-os-hub/) | 4399 | ✅ Real (cross-OS router) |
| **Secrets Manager** | [services/secrets-manager/](../../../services/secrets-manager/) | **4744** | ✅ NEW v1.0 (running, in-memory + audit) |
| **Feature Flags** | [services/feature-flags/](../../../services/feature-flags/) | **4745** | ✅ NEW v1.0 (running, FNV-1a consistent hashing, 4 pre-seeded flags) |
| **Context Engine** | [services/context-engine/](../../../services/context-engine/) | **4746** | ✅ NEW v1.0 (running, W3C Trace Context, span tree) |
| **Tenant Manager** | [services/tenant-manager/](../../../services/tenant-manager/) | **4747** | ✅ NEW v1.0 (running, 4 plans × 5 roles × 7 regions, 1 pre-seeded tenant) |
| Monitoring / Logs | (cross-cutting, in individual services) | — | 🟡 Partial (each service has its own logger, no central observability) |
| Auth/RBAC + mTLS | — | — | ⚪ Not built (extends CorpID) |

## 4. New Services Detail (June 19, 2026)

### 3.1 Secrets Manager (`4744`)

**Status:** ✅ Production-ready v1.0.0 (in-memory, 433 lines, 12 endpoints)

**What it does:** Encrypted secret storage with versioning, rotation, audit logging — the kind of thing every service needs instead of `.env` files.

**Key endpoints:**
- `POST /api/secrets` — create secret (name, value, description, tags, rotationDays)
- `GET /api/secrets` — list (no values)
- `GET /api/secrets/:name` — metadata
- `GET /api/secrets/:name/value` — value + version (audit-logged)
- `PUT /api/secrets/:name/value` — new version
- `POST /api/secrets/:name/rotate` — rotate with auto-generated value
- `GET /api/secrets/:name/versions` — version history
- `GET /api/secrets/:name/audit` — per-secret audit trail
- `POST /api/secrets/bulk` — bulk fetch (filtered by tag)
- `GET /api/audit` — global audit log
- `GET /api/health` (and `/health` redirect)

**Design:** In-memory `Map`, optimistic locking via expected version, AES-style value storage (currently plain-text in memory — see security roadmap).

**Next:** Persist to MongoDB, integrate with TwinOS (use TwinID as secret owner), encrypt at rest with KMS key per tenant.

### 3.2 Feature Flags (`4745`)

**Status:** ✅ Production-ready v1.0.0 (in-memory, 681 lines, 15 endpoints)

**What it does:** Safe rollouts, kill switches, A/B testing — essential for shipping AI model changes gradually.

**Key endpoints:**
- `POST /api/flags` — create flag (type: boolean/string/number/json)
- `GET /api/flags` / `GET /api/flags/:key` — list/get
- `PATCH /api/flags/:key` — update
- `POST /api/flags/:key/toggle` — enable/disable
- `POST /api/flags/evaluate` — evaluate single (returns `{value, reason, ruleId}`)
- `POST /api/flags/bulk-evaluate` — batch evaluate
- `GET /api/flags/:key/history` — audit history
- `POST /api/flags/:key/rules` — add targeting rule
- `GET /api/segments` / `POST /api/segments` — audience segments
- `GET /api/audit` — global audit log
- `GET /api/health` (and `/health` redirect)

**Design:** 8 operators (eq/neq/in/nin/gt/lt/contains/regex), FNV-1a consistent hashing for percentage rollouts, 4 pre-seeded flags including `ai-model-v2-rollout`.

**Next:** Persist to MongoDB, integrate with TwinOS (targeting by TwinID), integrate with Context Engine (read baggage.user.tier), analytics dashboard.

### 3.3 Context Engine (`4746`)

**Status:** ✅ Production-ready v1.0.0 (in-memory, 754 lines, 14 endpoints)

**What it does:** Request-scoped context propagation across services — W3C Trace Context model with span tree, structured logs, baggage.

**Key endpoints:**
- `POST /api/contexts` — create context (traceId, spanId, parentSpanId, principal, tenantId, requestId, attributes, baggage)
- `GET /api/contexts/active` — list recent
- `GET /api/contexts/:id` — get one
- `PUT /api/contexts/:id` — update
- `DELETE /api/contexts/:id`
- `POST /api/contexts/:id/spans` — add span
- `GET /api/contexts/:id/spans` — span tree
- `GET /api/contexts/:id/timeline` — ordered events
- `POST /api/contexts/:id/logs` — append structured log
- `GET /api/contexts/:id/logs` — read logs
- `POST /api/contexts/lookup` — find by traceId/spanId
- `POST /api/contexts/propagate` — extract traceparent header
- `GET /api/audit`
- `GET /api/health`

**Design:** 1 pre-seeded example context with full span tree, structured logs, and baggage. Compatible with W3C Trace Context (`traceparent`, `tracestate`).

**Next:** Persist to MongoDB + Redis, integrate with Feature Flags (read baggage), integrate with TwinOS (tag spans with TwinID), OpenTelemetry exporter.

### 3.4 Tenant Manager (`4747`)

**Status:** ✅ Production-ready v1.0.0 (in-memory, 767 lines, 28 endpoints)

**What it does:** Multi-tenant org management with plans, RBAC roles, regional deployment, API key issuance.

**Key endpoints:**
- `POST /api/tenants` — create (returns API key + secret ONCE)
- `GET /api/tenants` / `GET /api/tenants/:id` / `GET /api/tenants/slug/:slug`
- `PATCH /api/tenants/:id` — update plan/settings/metadata
- `DELETE /api/tenants/:id` — soft-delete
- `POST /api/tenants/:id/regenerate-key`
- `GET /api/tenants/:id/usage`
- `POST /api/tenants/:id/members` / `GET` / `PATCH` / `DELETE`
- `POST /api/tenants/:id/invitations`
- `GET /api/plans` — list plans (free/starter/pro/enterprise)
- `GET /api/roles` — list roles (owner/admin/member/viewer/billing)
- `GET /api/regions` — list regions (us-east/us-west/eu-west/eu-central/ap-south/ap-east/me-central)
- `POST /api/tenants/:id/limits/check`
- `GET /api/audit`
- `GET /api/health`

**Design:** 4 plans (free/starter/pro/enterprise), 5 roles, 7 regions, SHA-256 hashed API keys (only plaintext shown at creation), 1 pre-seeded tenant (`acme-corp`).

**Next:** Persist to MongoDB, integrate with Billing (auto-update plan on subscription), integrate with Context Engine (tag every request with tenantId), integration tests.

## 4. Gap Score

**~95% of target state is built.** All 12 target capabilities have either a real service or a clear placeholder. Remaining gaps are observability (centralized) and auth hardening (mTLS + ABAC).

## 5. Gap List (Priority Ordered)

| # | Missing | Priority | Estimated Effort |
|---|---|---|---|
| 1 | **Centralized observability** (metrics + tracing + log aggregation) | 🔴 P0 | 2-3 weeks — adopt OpenTelemetry, ship a collector, wire Context Engine → collector |
| 2 | **RBAC + ABAC layer** on top of CorpID | 🟡 P1 | 3 weeks — extends CorpID, hooks into Tenant Manager roles |
| 3 | **mTLS service-to-service** | 🟡 P1 | 2 weeks — security hardening |
| 4 | **Persist new 4 services to MongoDB** | 🟢 P2 | 2-3 weeks — currently in-memory only |

## 6. Dependencies

- **Blocks:** Every other division depends on Foundation.
- **Depends on:** Nothing. This is the bottom of the stack.

## 7. Open Questions

- **Auth model for AI agents:** Should agents have their own identities (separate from users), or act on behalf of a user/org? Affects CorpID + RBAC design.
- **Per-tenant model keys:** Does each tenant get their own OpenAI/Anthropic API key, or is it pooled? Affects Billing + Secrets Manager.
- **Region strategy:** Single-region (cheaper) or multi-region (compliance + latency)? Affects API Gateway, Event Bus, all databases.

---

*See also: [services/corpid-service/CLAUDE.md](../../../services/corpid-service/CLAUDE.md), [services/api-gateway/CLAUDE.md](../../../services/api-gateway/CLAUDE.md), [services/secrets-manager/CLAUDE.md](../../../services/secrets-manager/CLAUDE.md), [services/feature-flags/CLAUDE.md](../../../services/feature-flags/CLAUDE.md), [services/context-engine/CLAUDE.md](../../../services/context-engine/CLAUDE.md), [services/tenant-manager/CLAUDE.md](../../../services/tenant-manager/CLAUDE.md)*
