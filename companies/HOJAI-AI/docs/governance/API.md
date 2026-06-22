# Governance Platform — API Reference

> **Base URLs:** `http://localhost:4254` (policy-os) · `http://localhost:4261` (compliance) · `http://localhost:4262` (consent)
> **Auth:** `X-Service-Token: <token>` (issued at service start, see logs) or `Authorization: Bearer <jwt>` or `X-API-Key: <key>`
> **Content-Type:** `application/json` for all POST/PATCH

All endpoints are JSON in, JSON out. Errors look like:
```json
{ "error": "human-readable message" }
```
Validation errors additionally include an `errors: string[]` array.

---

## policy-os (port 4254)

### Health

```
GET /health         # {status, version, counts, ...}
GET /ready          # {ready: true}
```

### Policy CRUD

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/policies` | Create a policy |
| GET | `/api/policies` | List (`?category=`, `?status=`, `?owner=`) |
| GET | `/api/policies/registry` | Full registry with byCategory + byStatus counts |
| GET | `/api/policies/:id` | Get one |
| PATCH | `/api/policies/:id` | Partial update |
| DELETE | `/api/policies/:id?hard=true` | Delete (soft by default, `?hard=true` for full remove) |
| POST | `/api/policies/validate` | Dry-run validation, returns 400 on bad input |
| POST | `/api/policies/bulk` | Create many in one call (returns 207) |
| POST | `/api/policies/bulk-publish` | Move many policies to `published` in one call |

#### Policy body shape

```json
{
  "id": "pol-payment-approval",          // optional; auto-generated
  "name": "Payment approval threshold",
  "description": "...",
  "category": "financial",                 // one of: security, business, commerce, ai, financial, privacy, memory, twin, skill
  "priority": 50,                          // int, default 50
  "status": "draft",                       // draft | review | published | archived | retired
  "rules": [
    { "if": { "context.amount": { "lte": 100 } }, "then": { "allow": true, "action": "auto_allow_small" } },
    { "if": { "context.amount": { "gt": 5000 } }, "then": { "allow": false, "action": "require_approval" } }
  ],
  "exceptions": [{ "name": "CEO override", "condition": "context.user.role == 'ceo'" }],
  "actions": { "onAllow": { "log": "approved" }, "onDeny": { "log": "denied" } },
  "approvals": { "strategy": "multi", "requiredApprovers": ["u-manager", "u-admin"] },
  "composition": {                         // optional; mutually exclusive with rules-based eval
    "mode": "allOf",                       // anyOf | allOf | majority
    "policyIds": ["pol-a", "pol-b"],
    "threshold": 0.5                        // only for mode=majority
  },
  "effectiveFrom": "2026-07-01T00:00:00Z",  // optional ISO-8601
  "effectiveUntil": "2026-12-31T23:59:59Z", // optional ISO-8601
  "tags": ["payments", "v2"],
  "owner": "u-admin"
}
```

### Evaluation

```
POST /api/policies/evaluate
Body: { policyId?: string, context: { action, user?, ... } }
Returns: { allowed, reasons[], suggestions[], policyUsed, matchedRule, evaluatedAt, composition? }
```

If `policyId` is omitted, the engine auto-resolves by `context.category` if present.

```
POST /api/policies/evaluate-batch
Body: { evaluations: [{ policyId?, context }, ...] }
Returns: { count, results: [...] }
```

```
POST /api/policies/simulate
Body: same as evaluate
Returns: same as evaluate, but no audit entry is written
```

```
POST /api/composition-evaluate
Body: { composition: { mode, policyIds[], threshold? }, context: {...} }
Returns: { evaluatedAt, allowed, mode, allows, total, memberResults[] }
```

### Approvals

| Method | Path |
|---|---|
| POST | `/api/policies/:id/submit` |
| POST | `/api/policies/:id/approve` |
| POST | `/api/policies/:id/archive` |
| POST | `/api/approvals` (create approval request) |
| POST | `/api/approvals/:id/decide` |
| GET | `/api/approvals/:id` |
| GET | `/api/approvals` |

### Roles & API keys

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/roles` | Create role |
| GET | `/api/roles` | List roles |
| GET | `/api/roles/:role` | Get role + permissions |
| POST | `/api/roles/:role/assign` | Assign role to user |
| GET | `/api/users/:userId/roles` | List user's roles |
| GET | `/api/users` | List users |
| POST | `/api/apikeys` | Create API key |
| GET | `/api/apikeys` | List API keys |
| DELETE | `/api/apikeys/:key` | Revoke |
| POST | `/api/tokens` | Issue short-lived token |

### Webhooks

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/webhooks` | Subscribe (body: `{url, events[], secret?, active?}`) |
| GET | `/api/webhooks` | List (secrets are stripped) |
| GET | `/api/webhooks/:id` | Get one |
| DELETE | `/api/webhooks/:id` | Remove |
| POST | `/api/webhooks/:id/test` | Send a test event |

**Events you can subscribe to** (these are the `type` values in `/api/audit`):
- `policy.created`, `policy.updated`, `policy.deleted`, `policy.retired`
- `policy.submitted`, `policy.approved`, `policy.archived`, `policy.published`
- `policy.evaluated`, `composition.evaluated`
- `webhook.created`, `webhook.deleted`
- `apikey.created`, `apikey.revoked`

**Delivery contract:** every webhook POST has:
- `Content-Type: application/json`
- `X-PolicyOS-Event: <event-type>`
- `X-PolicyOS-Delivery: <delivery-id>`
- `X-PolicyOS-Signature: sha256=<hmac-hex-of-body>`
- Body: `{ "event": "...", "audit": {...full audit entry...}, "deliveryId": null }`

5-second delivery timeout. Failures are recorded but don't retry — webhook subscribers should re-fetch via `/api/audit` if they miss an event.

### Analytics

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/analytics/overview` | Totals: policies evaluated, allow/deny counts, allow rate |
| GET | `/api/analytics/policies` | Top 25 most-evaluated policies |
| GET | `/api/analytics/policies/:id` | Per-policy counters + byActor / byReason / byDay |
| GET | `/api/analytics/denial-reasons` | Top 20 denial reasons |
| GET | `/api/analytics/timeseries?days=N` | Daily totals for the last N days (max 30) |

### Audit

| Method | Path |
|---|---|
| GET | `/api/audit?type=&from=&to=&policyId=&userId=&action=` |
| GET | `/api/audit/export` | Download as JSON file |

---

## compliance-engine (port 4261)

### Health
```
GET /health         # {status, version, counts: {controls, policies, evidence, attestations}}
```

### Frameworks & controls
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/frameworks` | List 5 built-in frameworks (GDPR, SOC2, HIPAA, PCI-DSS, ISO27001) |
| GET | `/api/frameworks/:id/controls` | All controls in a framework |
| GET | `/api/controls` | All 32 controls across all frameworks |
| GET | `/api/controls/:id` | One control |

### Policy mapping
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/policies` | Map a policy: `{name, controlIds[], evidenceTypes[]}` |
| GET | `/api/policies` | List |
| GET | `/api/policies/:id` | One |
| DELETE | `/api/policies/:id` | Unmap |

### Coverage
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/coverage?framework=gdpr` | Mapped / uncovered / coverage rate |
| GET | `/api/frameworks/:id/snapshot` | Full readiness: summary + per-control status (`attested` / `evidence-pending` / `mapped` / `uncovered`) |

### Evidence
| Method | Path |
|---|---|
| POST | `/api/evidence` (body: `{controlId, kind, summary, source?, capturedBy?, capturedAt?, metadata?}`) |
| GET | `/api/evidence?controlId=&kind=&limit=` |
| GET | `/api/evidence/:id` |

### Attestations
| Method | Path |
|---|---|
| POST | `/api/attestations` (body: `{controlId, attestedBy, validUntil?, notes?}`; validUntil defaults to +90d) |
| GET | `/api/attestations?controlId=&status=` |
| POST | `/api/attestations/:id/revoke` |

### Audit
```
GET /api/audit?type=&from=&to=
```

---

## consent-engine (port 4262)

### Health
```
GET /health
```

### Purposes (catalog)
```
GET /api/purposes    # 11 predefined: marketing.email, marketing.sms, ..., research.aggregated
```

### Consent lifecycle
| Method | Path | Body |
|---|---|---|
| POST | `/api/consents` | `{subjectId, purpose, source?, evidence?, validUntil?, metadata?}` |
| GET | `/api/consents/:id` | — |
| POST | `/api/consents/:id/withdraw` | — |
| POST | `/api/consents/withdraw` | `{subjectId, purpose}` — withdraws all active for that pair |

### Lookup
| Method | Path | Body |
|---|---|---|
| POST | `/api/check` | `{subjectId, purpose}` → **the main endpoint** |
| GET | `/api/subjects/:subjectId/consents?status=&purpose=` | List all |
| GET | `/api/subjects/:subjectId/summary` | Counts by purpose + status |

**`/api/check` response shape:**
```json
{
  "allowed": true,                  // false = no active consent (or expired / withdrawn)
  "subjectId": "u-alice",
  "purpose": "marketing.email",
  "consentId": "cs-...",
  "grantedAt": "2026-06-21T...",
  "validUntil": null,
  "source": "signup-form"
}
```

### Audit
```
GET /api/audit?type=&from=&to=&subjectId=
```

---

## flow-orchestrator (port 4244)

> See [flow-orchestrator source](../../platform/flow/flow-orchestrator/) for full reference. Highlights:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health |
| GET | `/api/plans` | List plans |
| POST | `/api/plans` | Create a plan |
| GET | `/api/plans/:id` | Get |
| DELETE | `/api/plans/:id` | Delete |
| POST | `/api/plans/:id/version` | New version |
| GET | `/api/plans/:id/versions` | List versions |
| POST | `/api/plans/:id/rollback` | Roll back |
| GET | `/api/templates` | Reusable templates |
| POST | `/api/templates/:name/instantiate` | Materialize a template |
| POST | `/api/executions` | Start a plan execution |
| POST | `/api/executions/sync` | Run a plan inline, return the result |
| GET | `/api/executions/:id` | Get execution status |
| POST | `/api/executions/:id/feedback` | Record feedback |
| GET | `/api/policy-cache` | Cached policy decisions (read-through cache) |
| DELETE | `/api/policy-cache` | Invalidate |
| GET | `/api/analytics/plans` | Plan metrics |
| GET | `/api/analytics/steps` | Step metrics |
| GET | `/api/analytics/bottlenecks` | Slow steps |
| GET | `/api/step-registry` | Available step types |
| GET | `/api/foundation` | Foundation key-value store |
| PUT | `/api/foundation/:key` | Update |
| GET | `/api/audit` | Audit |

---

## Rate limits

| Endpoint class | Default | Env var |
|---|---|---|
| Writes (POST/PATCH/DELETE) | 20 / minute | `POLICYOS_WRITE_LIMIT` (etc.) |
| Evaluations | 100 / minute | `POLICYOS_EVAL_LIMIT` |
| Reads (GET) | no limit (express default) | — |

429 response includes `Retry-After` header.
