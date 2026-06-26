# PolicyOS — Universal Governance Platform

> **Version:** v1.3.1 | **Port:** 4254 | **Status:** ✅ Production Ready
> **Path:** `companies/HOJAI-AI/platform/flow/policy-os/`
> **Package:** `@hojai/policy-os` | **Node:** ≥20

---

## 🎯 Mission

PolicyOS is the **single source of truth for governance** across the entire RTMN ecosystem. Every AI agent, product, or service delegates policy decisions here — instead of each rolling its own authorization logic.

```
Before PolicyOS                     After PolicyOS
─────────────────                    ──────────────────────────────────────
Genie → hardcoded rules             Genie → POST /api/policies/evaluate
CoPilot → custom auth               CoPilot → POST /api/policies/evaluate
SUTAR OS → bespoke checks           SUTAR OS → POST /api/policies/evaluate
RTMN Hub → ad-hoc permissions       RTMN Hub → POST /api/check/role
                                        ↓
                              PolicyOS (one place to author, audit, update)
```

---

## 🏗️ Architecture

```
policy-os/src/
├── index.js                    ← App wiring + boot (the entry point)
├── expression-evaluator.js     ← Safe AST-based expression parser (NO eval/Function)
├── services/
│   └── events.js               ← EventBus singleton (Redis pub/sub via @rtmn/shared)
├── middleware/
│   └── auth.js                 ← Auth factory: HS256 JWT + service token + API key
├── routes/
│   ├── policies.js             ← Policy CRUD + lifecycle + evaluation
│   ├── rbac.js                ← Roles, RBAC checks, ABAC checks
│   ├── apikeys.js             ← API key + token issuance
│   ├── approvals.js            ← Multi-step approval workflows
│   ├── webhooks.js            ← Real-time event webhooks (HMAC-SHA256)
│   └── analytics.js           ← Analytics + audit log
└── lib/
    ├── validation.js            ← Policy schema validator (zero-dep)
    └── evaluation.js           ← Core evaluation engine (pure functions)
```

### Design Principles

| # | Principle | Implementation |
|---|-----------|---------------|
| 1 | **Fail-closed** | Every evaluation path defaults to `allowed: false` |
| 2 | **Time-bound** | `effectiveFrom` / `effectiveUntil` enforced on every call |
| 3 | **Explicit composition** | `anyOf` / `allOf` / `majority` must be declared |
| 4 | **Audit everything** | Every decision, change, and check is logged to JSONL |
| 5 | **Safe expressions** | Custom AST parser — **never** `eval`, `new Function`, or `with()` |
| 6 | **Zero prototype pollution** | Blocked paths: `__proto__`, `constructor`, `prototype` |
| 7 | **HS256-only JWT** | Algorithm pinning prevents `alg=none` attacks |

---

## 🔌 All 47 Endpoints

### Health (3)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Service banner + version |
| `GET` | `/health` | Liveness + store counts |
| `GET` | `/ready` | Readiness probe |

### Policy CRUD (9)
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/policies` | Create a policy |
| `GET` | `/api/policies` | List all (filter: category, status, owner) |
| `GET` | `/api/policies/registry` | Registry overview + counts by category/status |
| `GET` | `/api/policies/:id` | Get one policy |
| `PATCH` | `/api/policies/:id` | Update (partial, version-bumped) |
| `DELETE` | `/api/policies/:id?hard=true` | Hard delete or soft retire |
| `POST` | `/api/policies/:id/submit` | draft → review |
| `POST` | `/api/policies/:id/approve` | review → published |
| `POST` | `/api/policies/:id/archive` | published → archived |

### Evaluation (5)
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/policies/evaluate` | Evaluate context → allow/deny |
| `POST` | `/api/policies/evaluate-batch` | Batch evaluate multiple contexts |
| `POST` | `/api/policies/simulate` | Dry-run without audit log |
| `POST` | `/api/policies/validate` | Schema validation only |
| `POST` | `/api/composition-evaluate` | Evaluate composed policy group |

### Bulk Operations (2)
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/policies/bulk` | Create many policies (207 Multi-Status) |
| `POST` | `/api/policies/bulk-publish` | Publish many at once |

### API Keys & Tokens (4)
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/apikeys` | Issue an API key |
| `GET` | `/api/apikeys` | List keys (secrets redacted) |
| `DELETE` | `/api/apikeys/:key` | Revoke a key |
| `POST` | `/api/tokens` | Mint an HS256 JWT (admin only) |

### RBAC & ABAC (8)
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/roles` | Create a role |
| `GET` | `/api/roles` | List all roles |
| `GET` | `/api/roles/:role` | Get one role |
| `POST` | `/api/roles/:role/assign` | Assign role to user |
| `GET` | `/api/users/:userId/roles` | Get user's roles |
| `GET` | `/api/users` | List users |
| `POST` | `/api/check/role` | RBAC permission check |
| `POST` | `/api/check/abac` | ABAC attribute check |

### Approvals (4)
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/approvals` | Start approval workflow |
| `POST` | `/api/approvals/:id/decide` | Approve or reject |
| `GET` | `/api/approvals/:id` | Get approval status |
| `GET` | `/api/approvals` | List approvals (filter: status, strategy, requesterId) |

### Webhooks (5)
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/webhooks` | Register webhook (HMAC-SHA256 signed) |
| `GET` | `/api/webhooks` | List webhooks |
| `GET` | `/api/webhooks/:id` | Get one |
| `DELETE` | `/api/webhooks/:id` | Remove |
| `POST` | `/api/webhooks/:id/test` | Test delivery |

### Analytics (5)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/analytics/overview` | Total evals, allow/deny rate |
| `GET` | `/api/analytics/policies` | Top 25 policies by eval count |
| `GET` | `/api/analytics/policies/:id` | Single policy metrics |
| `GET` | `/api/analytics/denial-reasons` | Top 20 denial reasons |
| `GET` | `/api/analytics/timeseries` | Daily eval counts (up to 30 days) |

### Audit (2)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/audit` | Query audit log (filter: policyId, userId, type, from, to) |
| `GET` | `/api/audit/export` | Download full audit as JSON |

---

## 📦 Key Features

### 1. Policy Engine
- **Rule-based evaluation**: `if: { conditions } → then: { allow: bool }`
- **Condition operators**: `eq`, `gt`, `lt`, `gte`, `lte`, `in`, `notIn`, `contains`, `startsWith`, `endsWith`, `exists`, `notExists`, `truthy`, `falsy`
- **Categories**: `security`, `business`, `commerce`, `ai`, `financial`, `privacy`, `memory`, `twin`, `skill`
- **Lifecycle**: draft → review → published → archived / retired
- **Time bounds**: `effectiveFrom` / `effectiveUntil` — policies auto-expire
- **Versioning**: Every PATCH bumps version, stores diff history

### 2. Policy Composition
```json
{
  "composition": {
    "mode": "allOf",
    "policyIds": ["pol-fraud", "pol-budget", "pol-compliance"]
  }
}
```
- **`anyOf`**: At least one must allow
- **`allOf`**: Every policy must allow
- **`majority`**: Threshold fraction (e.g. `0.5` = >50%)

### 3. Safe Expression Evaluator
Custom AST parser — **NO `eval`**, **NO `new Function`**, **NO `with()`**:
```
context.user.trustScore >= 50 && context.amount <= 5000
context.user.attributes.vip === true
```
Blocked: `__proto__`, `constructor`, `prototype`, `hasOwnProperty`, `toString`, `valueOf`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`
Max expression length: 1000 chars

### 4. Approval Workflows
Strategies: `single` | `multi` | `sequential` | `parallel` | `emergency`
- Sequential: approvers must approve in declared order
- Parallel: all must approve (any reject ends it)
- Emergency: single approver sufficient

### 5. RBAC + ABAC
- **RBAC**: Role → Permissions (with wildcard prefix, e.g. `policies:*`)
- **ABAC**: User attributes + context → policy evaluation

### 6. Webhooks
Events: `policy.created`, `policy.updated`, `policy.deleted`, `policy.evaluated`, `policy.retired`, `policy.approved`, `policy.archived`, `approval.created`, `approval.decided`, `role.created`, `role.assigned`, `apikey.created`, `apikey.revoked`, `webhook.created`, `webhook.deleted`
- HMAC-SHA256 signed payload
- 5s delivery timeout
- Retry tracking per delivery

### 7. Analytics
- Per-policy: allow/deny counts, by-actor breakdown, by-reason breakdown, by-day time-series
- Global: overview with allow rate percentage
- Track fail-closed calls under `__fail_closed__`

### 8. Audit Log
- Append-only JSONL file
- Automatic rotation at 10,000 entries
- Archives to `data/policy-os/audit/archives/`
- Exportable as JSON

---

## 🔗 Ecosystem Connections

PolicyOS connects to and is consumed by the following RTMN services:

### Foundation Services
| Service | Port | Connection |
|---------|------|-----------|
| **RTMN Hub** | 4399 | Proxies `/api/policies/evaluate` to PolicyOS for cross-OS governance |
| **RTMN Hub** | 4399 | `/api/sutar/*` routes delegate authorization checks here |
| **Flow Orchestrator** | — | Calls `POST /api/policies/evaluate` for every decision |
| **@rtmn/shared** | — | Uses `requireAuth`, `requireEnv`, `installGracefulShutdown` |
| **PersistentStore** | — | File-backed JSON storage via `@rtmn/shared/lib/persistent-store.js` |
| **EventBus** | — | Redis pub/sub via `@rtmn/shared/lib/eventbus` (src/services/events.js) |

### HOJAI AI Products
| Product | Connection |
|---------|-----------|
| **Genie AI** | Evaluates AI action confidence thresholds (`pol-ai-autonomy`) |
| **CoPilot** | Checks skill execution scopes (`pol-skill-execution`) |
| **SUTAR OS** | Budget + financial policy enforcement |
| **TwinOS** | Twin sharing consent checks (`pol-twin-sharing`) |
| **MemoryOS** | Privacy + data export policies (`pol-data-export`) |
| **RAZO Keyboard** | Intent routing authorization |
| **AgentOS** | Agent capability and execution policies |

### Department OS
| OS | Port | How it uses PolicyOS |
|----|------|---------------------|
| **Sales OS** | 5055 | `pol-shopping-budget` for deal approval thresholds |
| **Marketing OS** | 5500 | Campaign budget + audience access policies |
| **Procurement OS** | 5096 | Supplier + purchase order approvals |
| **Finance OS** | 4801 | Financial transaction limits |
| **Operations OS** | 5250 | Incident + risk policy decisions |
| **Revenue Intelligence OS** | 5400 | Pricing + promotion policy evaluation |

### Industry OS
| Industry OS | How it uses PolicyOS |
|-------------|---------------------|
| **Healthcare OS** (5020) | Patient data access, prescription authority |
| **Restaurant OS** (5010) | Order amount thresholds, dietary compliance |
| **Hotel OS** (5025) | Booking limits, loyalty tier permissions |
| **Legal OS** (5035) | Contract approval workflows |
| **Finance OS** (5220) | Transaction limits, KYC policy checks |

### Other HOJAI Flow Services
| Service | Connection |
|---------|-----------|
| **Compliance Engine** | Maps regulatory requirements to PolicyOS policies |
| **Consent Engine** | Per-user consent linked to privacy policies |
| **Governance SDK** | `companies/HOJAI-AI/shared/lib/governance-sdk.js` — client wrapper |
| **Nexha Services** | ACP messaging + capability policies |
| **BAM (BLR AI Marketplace)** | Skill installation + agent capability policies |

---

## 🧪 Testing

```bash
# Unit tests (Node built-in test runner — no extra deps)
npm run test:events        # events.test.mjs
npm run test:auth          # auth.test.mjs

# Shell-based integration tests (require service running on :4254)
bash tests/smoke.sh        # Health + basic auth
bash tests/e2e.sh          # Full policy lifecycle
bash tests/expression.test.sh    # Expression evaluator
bash tests/persistence.test.sh   # Store flush

# All tests
npm test
```

### Unit Test Status (v1.3.1)
- ✅ `events.test.mjs` — EventBus singleton, emit with tenant isolation
- ✅ `auth.test.mjs` — JWT hardening (legacy token rejection, HS256 pinning, alg=none attack)

---

## 🔒 Security

| Feature | Implementation |
|---------|---------------|
| JWT Auth | HS256-only, algorithm pinning, `TokenExpiredError` handled |
| Service tokens | Cryptographically random (`createServiceToken()` — UUID-based) |
| API keys | Prefix `pk_`, prefix logged on revocation |
| Rate limiting | 20 eval/min + 20 write/min (env-overridable) |
| Helmet | CSP + CORS + COEP + COOP headers |
| Input validation | Zero-dep policy schema validator |
| Expression safety | AST parser, blocked prototype paths, 1000-char limit |
| Audit non-blocking | `setImmediate` + async hooks — never blocks caller |
| Graceful shutdown | Flush all stores, 5s grace period |

---

## 🚀 Startup

```bash
# Development
npm start
# → Port 4254

# With auth disabled (local dev)
POLICYOS_REQUIRE_AUTH=false npm start

# Production
npm start
POLICYOS_REQUIRE_AUTH=true \
JWT_SECRET=your-secret \
POLICYOS_SERVICE_TOKEN=svc_... \
POLICYOS_CORS_ORIGIN=https://yourapp.com \
POLICYOS_EVAL_LIMIT=100 \
POLICYOS_WRITE_LIMIT=50 \
PORT=4254
```

---

## 🐳 Docker

```bash
# Build
docker build -t hojai/policy-os:1.3.1 .

# Run
docker run -d -p 4254:4254 \
  -e POLICYOS_REQUIRE_AUTH=true \
  -e JWT_SECRET=your-secret \
  -e NODE_ENV=production \
  hojai/policy-os:1.3.1
```

---

## 📁 File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `src/index.js` | ~420 | App wiring, boot, stores, audit, webhook delivery |
| `src/expression-evaluator.js` | ~305 | Safe AST expression parser |
| `src/services/events.js` | ~115 | EventBus singleton wrapper |
| `src/middleware/auth.js` | ~100 | Auth factory (JWT + token + API key) |
| `src/routes/policies.js` | ~280 | Policy CRUD + evaluation routes |
| `src/routes/rbac.js` | ~130 | RBAC + ABAC routes |
| `src/routes/apikeys.js` | ~80 | API key + token routes |
| `src/routes/approvals.js` | ~180 | Approval workflow routes |
| `src/routes/webhooks.js` | ~130 | Webhook CRUD routes |
| `src/routes/analytics.js` | ~120 | Analytics + audit routes |
| `src/lib/validation.js` | ~130 | Schema validator |
| `src/lib/evaluation.js` | ~250 | Pure evaluation functions |
| **Total source** | **~2,240 LOC** | |

---

## 🔧 Scripts

| Script | What it does |
|--------|-------------|
| `npm start` | Start service on port 4254 |
| `npm run dev` | Start with `--watch` (auto-restart on change) |
| `npm test` | Unit tests + shell integration tests |
| `npm run test:events` | EventBus unit tests |
| `npm run test:auth` | Auth hardening unit tests |
| `npm run lint` | ESLint on `src/` |
| `npm run lint:fix` | ESLint + auto-fix |
| `npm run format` | Prettier format all files |
| `npm run check` | Syntax check all source files |

---

## 🌐 Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4254` | HTTP port |
| `POLICYOS_REQUIRE_AUTH` | `true` | Require authentication |
| `JWT_SECRET` | — | Required for JWT verification (must be set in prod) |
| `POLICYOS_SERVICE_TOKEN` | auto-generated | Service-to-service token |
| `POLICYOS_CORS_ORIGIN` | `null` (allow-all) | CORS allowed origins (comma-separated) |
| `POLICYOS_EVAL_LIMIT` | `20` | Rate limit for eval endpoints (req/min) |
| `POLICYOS_WRITE_LIMIT` | `20` | Rate limit for write endpoints (req/min) |
| `POLICYOS_AUDIT_MAX` | `10000` | Max audit entries in memory before rotation |
| `HOJAI_DATA_DIR` | `./data/` | Data directory for stores and audit logs |
| `NODE_ENV` | — | Set to `test` to suppress console logs |

---

## 📊 Seeded Data (6 Policies)

| Policy | Category | Purpose |
|--------|---------|---------|
| `pol-shopping-budget` | financial | Auto-allow ≤₹5000, require approval above |
| `pol-payment-fraud` | security | Block users with trust score < 50 |
| `pol-data-export` | privacy | Require approval for >100 record exports |
| `pol-ai-autonomy` | ai | Require AI confidence ≥ 0.7 |
| `pol-skill-execution` | skill | Verify user has required skill scope |
| `pol-twin-sharing` | twin | Require owner consent for twin sharing |

---

## Related Documentation

- [Governance SDK](../../shared/lib/governance-sdk.js) — Client SDK for callers
- [Compliance Engine](../compliance-engine/CLAUDE.md) — Regulatory framework
- [Consent Engine](../consent-engine/CLAUDE.md) — User consent management
- [Flow OS Architecture](../flow/OS.md) — How PolicyOS fits in the Flow OS
- [CANONICAL-PORT-REGISTRY.md](../../../../CANONICAL-PORT-REGISTRY.md) — Port 4254 registration
