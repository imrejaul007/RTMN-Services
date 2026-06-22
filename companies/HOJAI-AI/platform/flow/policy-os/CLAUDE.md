# PolicyOS (port 4254)

> **Status:** ✅ Production-ready v1.3.0 (Governance suite — June 22, 2026)
> **Role:** The universal governance, trust, authorization, compliance, and decision policy platform for the HOJAI AI / RTMN ecosystem.
> **Owner:** HOJAI AI Platform team

## Mission

Before PolicyOS, every consumer (Genie, CoPilot, SUTAR, RTMN OS, products) had to roll its own authorization and policy enforcement — leading to inconsistent rules, missing audit trails, and no way to compose policies across services.

**PolicyOS is the single point of contact** for policy authoring, evaluation, simulation, and audit. It exposes:

- **Policies** — versioned JSON documents (rules + composition + time bounds)
- **Roles & RBAC** — assignable role sets
- **ABAC** — attribute-based checks via `subject.action.resource` with conditions
- **Composition** — `anyOf` / `allOf` / `majority` policy grouping
- **Time bounds** — `effectiveFrom` / `effectiveUntil` enforcement
- **Webhooks** — HMAC-SHA256 signed notifications on policy events
- **Analytics** — evaluation counts, denial reasons, time-series
- **Approvals** — multi-step policy review workflow
- **Audit** — append-only log of every check, decision, and change

## Design Principles

| # | Principle | How PolicyOS implements it |
|---|-----------|----------------------------|
| 1 | Fail-CLOSED by default | `evaluatePolicy` returns `{allowed: false}` when no rule matches. Never implicit-permit. |
| 2 | Time-bound enforcement | `effectiveFrom` / `effectiveUntil` checked on every evaluation. A policy not yet effective is denied. |
| 3 | Composition is explicit | `anyOf` / `allOf` / `majority` are required, not implicit. |
| 4 | Audit is non-bypassable | Every evaluate / check / change emits an audit entry. |
| 5 | Auth at every write | `requireAuth` + `customAuth` + `writeLimiter` (20 req/min default) on every write path. |
| 6 | Per-service tokens | The governance SDK mints a service-specific token for each consumer; per-service keys supported. |

## Endpoints (47)

### Policy CRUD (8)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/policies` | Create a policy (draft or active) |
| GET | `/api/policies` | List all policies |
| GET | `/api/policies/registry` | Public registry (filtered, name + category) |
| GET | `/api/policies/:id` | Get one policy |
| PATCH | `/api/policies/:id` | Update a policy |
| DELETE | `/api/policies/:id` | Delete a policy |
| POST | `/api/policies/:id/submit` | Submit for review |
| POST | `/api/policies/:id/approve` | Approve a submitted policy |
| POST | `/api/policies/:id/archive` | Archive (soft delete) |

### Evaluation (5)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/policies/evaluate` | Evaluate one subject/action/resource against all matching policies |
| POST | `/api/policies/evaluate-batch` | Batch evaluate (multiple subjects) |
| POST | `/api/policies/simulate` | Simulate without persisting an audit entry |
| POST | `/api/policies/validate` | Schema-validate a policy body |
| POST | `/api/composition-evaluate` | Evaluate a composed set of policies |

### Bulk (2)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/policies/bulk` | Create many policies in one call |
| POST | `/api/policies/bulk-publish` | Publish many draft policies atomically |

### API Keys & Tokens (4)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/apikeys` | Create an API key |
| GET | `/api/apikeys` | List API keys |
| DELETE | `/api/apikeys/:key` | Revoke an API key |
| POST | `/api/tokens` | Mint a service token |

### Roles & RBAC (7)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/roles` | Create a role |
| GET | `/api/roles` | List roles |
| GET | `/api/roles/:role` | Get one role |
| POST | `/api/roles/:role/assign` | Assign a role to a user |
| GET | `/api/users/:userId/roles` | Get a user's roles |
| GET | `/api/users` | List users |
| POST | `/api/check/role` | RBAC check |
| POST | `/api/check/abac` | ABAC check |

### Approvals (4)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/approvals` | Start an approval workflow |
| POST | `/api/approvals/:id/decide` | Approve / reject |
| GET | `/api/approvals/:id` | Get approval status |
| GET | `/api/approvals` | List approvals |

### Audit (2)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/audit` | Audit log |
| GET | `/api/audit/export` | Export audit (CSV) |

### Webhooks (5)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/webhooks` | Register a webhook (HMAC-SHA256 signed) |
| GET | `/api/webhooks` | List webhooks |
| GET | `/api/webhooks/:id` | Get a webhook |
| DELETE | `/api/webhooks/:id` | Remove a webhook |
| POST | `/api/webhooks/:id/test` | Send a test event |

### Analytics (5)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/analytics/overview` | Top-line counts |
| GET | `/api/analytics/policies` | Per-policy evaluation counts |
| GET | `/api/analytics/policies/:id` | Single policy analytics |
| GET | `/api/analytics/denial-reasons` | Most common deny reasons |
| GET | `/api/analytics/timeseries` | Time-series of allow/deny |

### Health (3)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness + counts |
| GET | `/ready` | Readiness probe |
| GET | `/` | Service banner |

## Policy Schema (lightweight, zero-dep)

```json
{
  "id": "pol-uuid",
  "name": "Restaurant procurement requires approval > $5000",
  "category": "procurement",
  "status": "active",
  "rules": [
    { "effect": "allow", "conditions": [...], "actions": ["approve"] }
  ],
  "composition": { "op": "allOf" },
  "effectiveFrom": "2026-06-01T00:00:00Z",
  "effectiveUntil": "2026-12-31T23:59:59Z",
  "version": 1,
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Rate Limits

| Path group | Default | Env override |
|------------|---------|--------------|
| Read (`GET`) | 20 req/min | `POLICYOS_EVAL_LIMIT` |
| Write (`POST`/`PATCH`/`DELETE`) | 20 req/min | `POLICYOS_WRITE_LIMIT` |

## Storage

`PersistentStore` (file-backed JSON in `data/`) — async writes with `flush()` on graceful shutdown. No external DB required.

## Tests

`tests/` — 9 test files:
- `smoke.sh` — health + auth
- `e2e.sh` — full lifecycle
- `expression.test.sh` — CEL-like expression evaluator
- `auth.test.sh` — RBAC + ABAC
- `persistence.test.sh` — store + flush
- `webhook-analytics.test.sh` — webhooks + analytics
- `phase6.test.sh` — composition + time bounds + bulk ops + validation
- `governance-sdk.test.sh` — SDK smoke
- `sla.test.sh`, `workflow.test.sh` — operational tests

## Related

- [Compliance Engine](../compliance-engine/CLAUDE.md) — regulatory framework mapping
- [Consent Engine](../consent-engine/CLAUDE.md) — per-purpose user consent
- [Governance SDK](../../shared/lib/governance-sdk.js) — client wrapper
- [Governance docs](../../docs/governance/) — API, integration, tests
