# HOJAI AI — 5-Phase Production Readiness Plan

> **Date:** 2026-06-21
> **Status:** Plan v1, awaiting approval
> **Goal:** Take HOJAI AI from "178 scaffold services" to genuinely production-ready, phase by phase, without breaking anything live.
> **Total services in scope:** 178
> **Total LOC in scope:** ~90,000 lines

---

## 0. Context — Why This Plan Exists

### Audit findings (2026-06-21)

| Dimension | Current state | Required for "go live" |
|---|---|---|
| **Storage** | 130/178 services (73%) use in-memory `Map`. Data lost on restart. | Persistent storage for at least the top 20 services by traffic. |
| **Auth** | ~50 services have ZERO auth. 30+ services have critical bypasses (hardcoded tokens, JWT without verify, `SKIP_AUTH=true` env kill switch). | Every service must require a valid token, and no production code should accept a hardcoded default. |
| **Tests** | 7/178 services (3.9%) have real unit tests. 90/116 smoke tests pass on ANY HTTP code (even 500s). | All smoke tests must assert specific status codes. At least 1 unit-test file per service. |
| **AI/ML** | 0 of 23 Genie services call an LLM. All "AI" is keyword matching. | At least 3 flagship Genie services must make real LLM calls. |
| **Operations** | 2% have graceful shutdown. 0% validate env vars at startup. 6% have Dockerfiles. | Every service must have: graceful shutdown, env validation, /health + /ready, Dockerfile. |
| **BLR UI** | Next.js `package.json` exists but no `app/`, `components/`, `lib/`, or `public/` directories. `npm run dev` will fail. | A working browse → cart → checkout flow. |
| **Division CLAUDE.md claims** | All 12 say "🟢 100% DONE" but reality is 30-40% at best. | Replace with honest status. |

### The two non-negotiables

1. **Zero auth bypasses can ship to production.** This is security — no compromise.
2. **Data loss on restart is unacceptable** for the 20 highest-traffic services.

Everything else (LLM calls, BLR UI, Dockerfiles, CI) is a P1.

---

## 1. Strategy

### Depth over breadth

We are NOT going to upgrade all 178 services in five phases. The strategy is:

- **Phase 1:** Lock down security (auth bypasses, hardcoded secrets, env validation). Every service gets the minimum to be safe.
- **Phase 2:** Persist the top 20 services by traffic. Migrate from `new Map()` → `@rtmn/shared/lib/persistent-store` (file-backed JSON). One shared migration.
- **Phase 3:** Fix the test suite. Replace auto-generated `"any"` assertions with specific expected codes. Add one unit-test file per service. Fix the silent `exit 0` skip.
- **Phase 4:** Operations. Graceful shutdown, `/ready` endpoints, Dockerfiles, root docker-compose, .env.example, .github/workflows scoped to HOJAI.
- **Phase 5:** Make it real AI + ship BLR storefront. Wire OpenAI/Anthropic into 3 flagship Genie services. Build the Next.js storefront with browse + cart + checkout. Then replace all 12 division CLAUDE.md files with honest status.

### Existing reusable code (do NOT reinvent)

- **`@rtmn/shared/lib/persistent-store`** (356 lines) — file-backed JSON store with Mongoose-like API. Already tested. Drop-in for `new Map()`.
- **`@rtmn/shared/lib/logger`** (47 lines) — winston-based structured logger. JSON in production, pretty in dev.
- **`@rtmn/shared/lib/errors`** — typed error classes (`AppError`, `NotFoundError`, `ValidationError`).
- **`@rtmn/shared/lib/database`** (MongoDB connector with `getTenantModel` helper).
- **`@rtmn/shared/auth/index.js`** — auth middleware factory (`createAuthMiddleware`, `createIndustryAuth`).
- **Existing Dockerfile template** at `products/hib/helpdesk-ticketing-service/Dockerfile` — copy pattern for all 168 missing.
- **Existing good test pattern** at `products/founder-os/founder-os-product/test/founder-os.test.js` (247 lines) — copy for unit tests.
- **`corpID-service` (v3.0.0)** — the gold standard. Use as reference implementation.

### What "done" means per phase

A phase is done when:
- All listed files are committed
- All smoke tests in the phase pass with specific expected codes (not "any")
- A pre-commit hook or CI check verifies the phase invariants (e.g., "no `Map()` left in scope" for Phase 2)
- A `PHASE-N-SUMMARY.md` is written and checked in

---

## 2. Phase 1 — Security Lockdown (Week 1)

**Goal:** Zero auth bypasses, zero hardcoded secrets, fail-fast env validation.

### 2.1 Fix the 30+ auth bypasses

For every service with no auth, add `createAuthMiddleware` from `@rtmn/shared/auth`. Pattern:

```js
// Before (insecure):
app.post('/api/foo', async (req, res) => { ... });

// After:
import { createAuthMiddleware } from '@rtmn/shared/auth';
const requireAuth = createAuthMiddleware({ required: true });
app.post('/api/foo', requireAuth, async (req, res) => { ... });
```

**Services to fix (all have no auth today):**

| Group | Services | Severity |
|---|---|---|
| All 7 Copilots | `products/copilots/{agent,business,executive,finance,marketing,sales,support}-copilot` | CRITICAL |
| All 7 sutar-os/core | `sutar-os/core/{sutar-gateway,sutar-identity,sutar-agent-id,sutar-agent-network,sutar-twin-os,sutar-memory-bridge,sutar-monitoring}` | CRITICAL |
| All 7 BLR marketplace | `blr-ai-marketplace/services/{discovery-engine,roi-calculator,blr-exploration,blr-founder-os,blr-multi-agent-evaluator,blr-reputation-aggregator,twin-marketplace}` | CRITICAL |
| 9 platform/infra | `platform/infra/{secrets-manager,feature-flags,billing,usage-tracker,api-gateway,sandbox,ai-safety,sla-manager,onboarding-portal}` | CRITICAL |
| 2 platform/identity | `platform/identity/{customer-support-service,tenant-manager}` | HIGH |

**Total: 32 services to add auth to.**

### 2.2 Remove hardcoded JWT secret fallback

In `platform/identity/corpid-service/src/index.js:31` and `src/index.persistent.js:37`:

```js
// Before:
const JWT_SECRET = process.env.JWT_SECRET || 'corpID-secret-change-in-production';

// After:
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET env var is required');
  process.exit(1);
}
```

Same pattern for all 9 genie-os services that have:
```js
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'hojai-internal-service-token-change-me';
```

### 2.3 Wire real JWT verification in salar-os and sada-os

Currently both services accept any `Authorization: Bearer <anything>` without calling `jwt.verify()`. Add a `verifyJwt()` call to `@rtmn/shared/auth` that signs and verifies against `JWT_SECRET`. Then call it in salar-os and sada-os.

### 2.4 Remove `SKIP_AUTH` dev bypass

In 4 HIB services (`helpdesk-ticketing`, `support-escalation`, `support-sla`, `knowledge-base`), remove:
```js
if (process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true') { ... }
```

Keep the `NODE_ENV === 'development'` branch only for localhost dev (auto-detect by binding to 127.0.0.1). Never trust an env var to grant admin.

### 2.5 Add fail-fast env validation

Create `shared/lib/env.js` (new file, ~50 lines):
```js
export function requireEnv(vars) {
  const missing = vars.filter(v => !process.env[v]);
  if (missing.length) {
    console.error(`FATAL: Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}
```

Then in every service's `src/index.js`:
```js
import { requireEnv } from '@rtmn/shared/lib/env';
requireEnv(['PORT', 'CORPID_URL', 'JWT_SECRET']);
```

### 2.6 Add validation script to package.json (root)

```json
"scripts": {
  "audit:auth": "node scripts/audit-auth.js",
  "audit:secrets": "node scripts/audit-secrets.js"
}
```

`scripts/audit-auth.js` greps for unprotected `app.post` / `app.put` / `app.delete` calls and exits non-zero if any are found outside `app.use(requireAuth, ...)`.

### 2.7 Phase 1 deliverables

- [ ] 32 services have `requireAuth` middleware on all mutating routes
- [ ] 0 hardcoded JWT secret fallbacks in production code
- [ ] 0 hardcoded internal token fallbacks in production code
- [ ] 0 `SKIP_AUTH` branches
- [ ] `shared/lib/env.js` created and used by all services
- [ ] `scripts/audit-auth.js` exits 0 on clean repo
- [ ] `PHASE-1-SUMMARY.md` written
- [ ] All existing smoke tests still pass

### 2.8 Files to create/modify

| New | Modified |
|---|---|
| `shared/lib/env.js` | 32 service `src/index.js` files |
| `scripts/audit-auth.js` | `platform/identity/corpid-service/src/index.js:31` |
| `scripts/audit-secrets.js` | `platform/identity/corpid-service/src/index.persistent.js:37` |
| `PHASE-1-SUMMARY.md` | 9 genie-os service index files |
| | 4 HIB service `middleware/auth.ts` files |
| | `platform/twins/salar-os/src/index.ts` (JWT verify) |
| | `platform/trust/sada-os/src/index.ts` (JWT verify) |
| | `shared/auth/index.js` (add `verifyJwt`) |

**Estimated effort: 1 week, 1 engineer.**

---

## 3. Phase 2 — Persistence for Top 20 Services (Weeks 2-3)

**Goal:** Top 20 services by traffic survive process restart. No data loss.

### 3.1 Pick the top 20 services

Ranked by combined criticality (sensitive data, external dependencies, frequency of use):

| # | Service | Why it matters |
|---|---|---|
| 1 | `sutar-os/agents/agent-wallets` | **CRITICAL** — wallet state, payments |
| 2 | `platform/infra/billing` | **CRITICAL** — payment data |
| 3 | `platform/infra/secrets-manager` | **CRITICAL** — secrets |
| 4 | `sutar-os/agents/agent-economy` | **CRITICAL** — economic balances |
| 5 | `sutar-os/contracts/sutar-contracts` | Smart contract state |
| 6 | `platform/identity/tenant-manager` | Multi-tenant isolation |
| 7 | `sutar-os/agents/agent-contracts` | Agent agreements |
| 8 | `products/genie/genie-money-os` | User financial data |
| 9 | `products/genie/genie-relationship-os` | Personal CRM |
| 10 | `products/genie/genie-memory-graph` | Identity graph |
| 11 | `products/genie/genie-wellness-os` | Health data |
| 12 | `products/genie/genie-companion-service` | User conversations |
| 13 | `products/genie/genie-calendar-service` | Calendar events |
| 14 | `products/genie/genie-memory-inbox` | Universal inbox |
| 15 | `sutar-os/agents/agent-reputation` | Trust scores |
| 16 | `sutar-os/agents/agent-twin` | Agent identity |
| 17 | `sutar-os/contracts/dispute-resolution` | Dispute cases |
| 18 | `sutar-os/contracts/negotiation-ai` | Negotiation state |
| 19 | `platform/twins/wallet-twin` | Wallet twin |
| 20 | `platform/twins/payment-twin` | Payment twin |

### 3.2 Migration pattern (mechanical)

```js
// Before (in src/index.js):
const users = new Map();
app.post('/api/users', (req, res) => {
  users.set(req.body.id, req.body);
  res.json({ id: req.body.id });
});

// After (in src/index.js):
import { createModel } from '@rtmn/shared/lib/persistent-store';
const User = createModel('User', { key: 'id', dataDir: process.env.DATA_DIR });
app.post('/api/users', requireAuth, async (req, res) => {
  const user = await User.create(req.body);
  res.json(user);
});
```

The `persistent-store` API is Mongoose-like:
- `Model.create(data)`, `Model.findOne(query)`, `Model.find(query)`, `Model.updateOne(query, update)`, `Model.deleteOne(query)`
- Backed by JSON files in `dataDir` (default: `./data`)
- Survives restart. Atomic writes via temp file + rename.

### 3.3 Provide a migration script

Create `scripts/migrate-to-persistent.js` that automates the mechanical refactor:

```js
// scripts/migrate-to-persistent.js
// Usage: node scripts/migrate-to-persistent.js <service-path>
// Scans src/index.js for `new Map()` and `const X = {}`,
// replaces with `createModel()` calls.
```

This is a string-replace script, not a full AST transform. It handles the common cases (90% of the 20 services). The remaining 10% get manual review.

### 3.4 Add migration test pattern

For each migrated service, add a `test/persistence.test.js` that:
1. Writes a record
2. Kills the process (or just calls `model._save()`)
3. Reads the same record back
4. Asserts it matches

### 3.5 Phase 2 deliverables

- [ ] 20 services migrated from `Map` to `persistent-store`
- [ ] `scripts/migrate-to-persistent.js` exists and works on a sample service
- [ ] 20 new `test/persistence.test.js` files
- [ ] `shared/lib/persistent-store` v1.1 with `find()` returning proper array
- [ ] `PHASE-2-SUMMARY.md` written
- [ ] `data/` directories added to `.gitignore` (so test data doesn't commit)

### 3.6 Files to create/modify

| New | Modified |
|---|---|
| `scripts/migrate-to-persistent.js` | 20 service `src/index.js` files |
| 20 `test/persistence.test.js` files | `shared/lib/persistent-store.js` (v1.1) |
| `PHASE-2-SUMMARY.md` | Root `.gitignore` (add `data/`) |

**Estimated effort: 2 weeks, 1 engineer.**

---

## 4. Phase 3 — Real Test Suite (Weeks 4-5)

**Goal:** Smoke tests assert specific outcomes. One unit-test file per service. No silent skip.

### 4.1 Fix the auto-generated `"any"` pattern

The current `tests/smoke.sh` template uses `expect_code="any"`, which passes on HTTP 500. Replace with:

```bash
# Before:
run "auto GET /health" GET "/health" "" "" "any"

# After (script regenerates smoke.sh with inferred or explicit expectations):
run "GET /health returns 200" GET "/health" "" "" "200"
run "GET /api/foo without auth returns 401" GET "/api/foo" "" "" "401"
run "POST /api/foo with bad payload returns 400" POST "/api/foo" '{"bad":true}' "application/json" "400"
```

For endpoints that legitimately return 404, accept "200 OR 404". For "I don't know what this returns", mark it as `// TODO: assert specific code` and skip.

### 4.2 Provide a smoke-test regenerator

Create `scripts/regen-smoke-tests.js` that:
1. Scans each service's `src/index.js` for `app.get/post/put/delete` declarations
2. Extracts the path and method
3. Generates a smoke test that calls each endpoint once
4. Uses `200` as default expected code, `401` for routes that have `requireAuth`
5. Marks uncertain cases as `// TODO: verify`
6. Writes to `tests/smoke.sh`

### 4.3 Add unit-test file to every service

Pattern (use `founder-os-product` as template):

```js
// test/<service-name>.test.js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

test('GET /health returns 200', async () => {
  const res = await request(app).get('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'healthy');
});

test('GET /api/foo without auth returns 401', async () => {
  const res = await request(app).get('/api/foo');
  assert.strictEqual(res.status, 401);
});
```

Add to every `package.json`:
```json
"scripts": { "test": "node --test test/" }
```

### 4.4 Fix the silent `exit 0` skip

Current pattern in `tests/smoke.sh`:
```bash
if ! curl ...; then
  echo "  SKIP  Service not running at ${BASE_URL}"
  exit 0  # ← BUG: silent skip masks outages
fi
```

Replace with:
```bash
if ! curl ...; then
  echo "  FAIL  Service not running at ${BASE_URL}"
  exit 1  # ← CI should fail
fi
```

### 4.5 Add test report to CLAUDE.md

For every service, after tests pass, append:
```markdown
## Test Status
- Unit tests: 8 passing
- Smoke tests: 16 passing (no "any" assertions)
- Last run: 2026-06-21
```

### 4.6 Phase 3 deliverables

- [ ] All 116 smoke tests assert specific status codes (no `"any"`)
- [ ] 0 silent `exit 0` skips
- [ ] 178 unit-test files exist (at least 1 test per service)
- [ ] `npm test` works in every service
- [ ] `PHASE-3-SUMMARY.md` written
- [ ] Test status appended to every service CLAUDE.md

### 4.7 Files to create/modify

| New | Modified |
|---|---|
| `scripts/regen-smoke-tests.js` | 116 `tests/smoke.sh` files |
| 171 `test/*.test.js` files | 178 `package.json` files (add test script) |
| `PHASE-3-SUMMARY.md` | 178 service CLAUDE.md files |

**Estimated effort: 2 weeks, 1 engineer.**

---

## 5. Phase 4 — Operations (Weeks 6-7)

**Goal:** Every service is deployable. Dockerfiles, env validation, graceful shutdown, /ready.

### 5.1 Add graceful shutdown to every service

One shared module: `shared/lib/shutdown.js` (~30 lines):

```js
// shared/lib/shutdown.js
export function installGracefulShutdown(server, cleanup = async () => {}) {
  const handler = async (signal) => {
    console.log(`[shutdown] received ${signal}, draining...`);
    server.close(async () => {
      await cleanup();
      process.exit(0);
    });
    // Force exit after 30s
    setTimeout(() => process.exit(1), 30_000).unref();
  };
  process.on('SIGTERM', () => handler('SIGTERM'));
  process.on('SIGINT', () => handler('SIGINT'));
}
```

Usage in every service:
```js
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
const server = app.listen(PORT, ...);
installGracefulShutdown(server, async () => {
  await mongoose.disconnect();
});
```

### 5.2 Add /ready endpoint to every service

```js
app.get('/ready', async (req, res) => {
  // Check DB connection
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: 'not-ready', reason: 'db-down' });
  }
  // Check critical dependencies
  res.json({ status: 'ready' });
});
```

Use `mongoose.connection.readyState` for Mongo services, file existence for persistent-store services.

### 5.3 Generate Dockerfile for every service

Template at `scripts/Dockerfile.template`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/ ./src/
COPY data/ ./data/ 2>/dev/null || true
EXPOSE ${PORT}
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:${PORT}/health || exit 1
CMD ["node", "src/index.js"]
```

For TypeScript services, add a build step:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm ci --production
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
```

Script `scripts/gen-dockerfile.js` walks every service and writes a `Dockerfile` from the template.

### 5.4 Create root `docker-compose.yml`

Only orchestrate the top 20 services from Phase 2 (the ones with persistent storage). Plus Mongo, Redis, and the 3 AI providers. Network config: a single `hojai-net` bridge.

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:7
    volumes: ['mongo-data:/data/db']
    ports: ['27017:27017']
  
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
  
  sutar-gateway:
    build: ./sutar-os/core/sutar-gateway
    ports: ['4140:4140']
    env_file: ./sutar-os/core/sutar-gateway/.env
    depends_on: [mongo]
  
  agent-wallets:
    build: ./sutar-os/agents/agent-wallets
    ports: [...]
    volumes: ['./data/agent-wallets:/app/data']
    depends_on: [mongo]
  
  # ... 18 more services
```

### 5.5 Add .env.example to every service

```bash
# scripts/gen-env-example.js walks every service and writes a .env.example
# listing the env vars referenced in src/index.js
```

### 5.6 Add `.github/workflows/hojai-ci.yml`

```yaml
name: HOJAI AI CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: cd companies/HOJAI-AI && npm ci
      - run: cd companies/HOJAI-AI && npm run audit:auth
      - run: cd companies/HOJAI-AI && npm test
      - run: cd companies/HOJAI-AI && npm run audit:secrets
```

### 5.7 Replace console.log with structured logger

For every service, replace `console.log` with `logger.info({...}, 'message')` using `@rtmn/shared/lib/logger`. Script-based where possible (sed pattern), manual for the 30+ files that have non-trivial log calls.

### 5.8 Phase 4 deliverables

- [ ] 178 services have `installGracefulShutdown()` called
- [ ] 178 services have `/ready` endpoint
- [ ] 178 Dockerfiles exist
- [ ] Root `docker-compose.yml` orchestrates top 20 + Mongo + Redis
- [ ] 178 `.env.example` files exist
- [ ] `.github/workflows/hojai-ci.yml` runs audit + tests on every PR
- [ ] All services use `@rtmn/shared/lib/logger` instead of `console.log`
- [ ] `docker compose up` brings up top 20 services successfully
- [ ] `PHASE-4-SUMMARY.md` written

### 5.9 Files to create/modify

| New | Modified |
|---|---|
| `shared/lib/shutdown.js` | 178 service `src/index.js` files (graceful shutdown) |
| `scripts/Dockerfile.template` | 178 service `src/index.js` files (/ready) |
| `scripts/gen-dockerfile.js` | 178 service `package.json` files (deps) |
| `scripts/gen-env-example.js` | 178 service source files (console.log → logger) |
| `docker-compose.yml` (root) | |
| `.github/workflows/hojai-ci.yml` | |
| 168 `Dockerfile` files | |
| 169 `.env.example` files | |
| `PHASE-4-SUMMARY.md` | |

**Estimated effort: 2 weeks, 1 engineer + 1 DevOps.**

---

## 6. Phase 5 — Real AI + BLR Storefront + Honest Docs (Weeks 8-10)

**Goal:** Make the AI products actually call LLMs. Build BLR storefront UI. Replace aspirational division docs with honest status.

### 6.1 Wire real LLM calls into 3 flagship Genie services

Choose the 3 highest-impact:

| Service | Current state | New behavior |
|---|---|---|
| `genie-companion-service` (2,776 LOC) | Keyword-based "emotion" matching | Real emotion detection via Claude Sonnet (uses `ai-emotion` prompt template) |
| `genie-thinking-engine` (1,106 LOC) | Basic ToT scaffold | Real ReAct / Tree-of-Thought loop with tool registry |
| `genie-money-os` (2,895 LOC) | Financial CRUD | Real financial advice using Claude with `ai-finance-advisor` prompt template |

Shared module: `shared/lib/llm.js` (~80 lines):
```js
// shared/lib/llm.js
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude({ system, messages, model = 'claude-sonnet-4-5', maxTokens = 2000 }) {
  const res = await anthropic.messages.create({
    model, max_tokens: maxTokens, system, messages,
  });
  return res.content[0].text;
}
```

Add 3 prompt templates: `shared/prompts/{emotion,thinking,finance}.md`. Each is versioned and testable.

### 6.2 Build BLR AI Marketplace storefront

Next.js 14 app. Three pages minimum:

1. **`/`** — Home. Hero + featured listings (calls `discovery-engine` /api/indexes/featured).
2. **`/listings`** — Browse. Category filter + search (calls `discovery-engine` /api/search).
3. **`/checkout`** — Cart + Stripe checkout (calls `roi-calculator` for pricing, then creates a `purchase` via Stripe API).

Components needed (~15):
- `Header`, `Footer`, `Hero`, `CategoryCard`, `ProductCard`, `PricingTable`, `CartItem`, `SearchBar`, `Filters`, `Pagination`, `EmptyState`, `LoadingSpinner`, `ErrorBoundary`, `StripeCheckout`, `OrderSummary`

Use the existing `package.json` deps (Next 14, React 18, Tailwind, Framer Motion, Zustand). No new dependencies.

### 6.3 Replace aspirational division docs

For every `divisions/0X-*/CLAUDE.md`, replace the "🟢 100% DONE" line with an honest status table:

```markdown
## Status (as of 2026-06-21, after Phase 1-5)

| Aspect | Coverage | Status |
|---|---|---|
| Services in scope | 11 | |
| Services with auth | 11/11 (100%) | ✅ |
| Services with persistent storage | 11/11 (100%) | ✅ |
| Services with unit tests | 11/11 (100%) | ✅ |
| Services with /ready endpoint | 11/11 (100%) | ✅ |
| Services with Dockerfiles | 11/11 (100%) | ✅ |
| Services with graceful shutdown | 11/11 (100%) | ✅ |
| Services calling real LLM | 0/11 (0%) | ❌ (not in scope) |
| Services with real ML logic | 0/11 (0%) | ❌ (not in scope) |
| **Production ready** | **Yes (with caveats)** | 🟡 |
```

For divisions that have no real services (e.g., Division 7 training — only fine-tuning code, no GPU), write "❌ NOT production-ready. Aspirational."

### 6.4 Phase 5 deliverables

- [ ] 3 Genie services make real LLM calls
- [ ] `shared/lib/llm.js` exists
- [ ] 3 prompt templates in `shared/prompts/`
- [ ] BLR storefront has 3 pages (home, listings, checkout)
- [ ] 15+ React components built
- [ ] BLR storefront runs: `cd blr-ai-marketplace && npm run dev` → http://localhost:3000
- [ ] All 12 division CLAUDE.md files rewritten with honest status
- [ ] `PHASE-5-SUMMARY.md` written
- [ ] Final `GO-LIVE-CHECKLIST.md` produced

### 6.5 Files to create/modify

| New | Modified |
|---|---|
| `shared/lib/llm.js` | 3 Genie service `src/index.js` (LLM integration) |
| `shared/prompts/{emotion,thinking,finance}.md` | 12 `divisions/0X-*/CLAUDE.md` files |
| `blr-ai-marketplace/app/{page,layout}.tsx` | `blr-ai-marketplace/package.json` (add Stripe) |
| `blr-ai-marketplace/app/listings/page.tsx` | |
| `blr-ai-marketplace/app/checkout/page.tsx` | |
| 15 React components | |
| `GO-LIVE-CHECKLIST.md` | |
| `PHASE-5-SUMMARY.md` | |

**Estimated effort: 3 weeks, 1 frontend engineer + 1 AI engineer.**

---

## 7. Critical Files (the surface area of this plan)

| Path | What changes | Frequency |
|---|---|---|
| `shared/lib/{env,shutdown,llm}.js` | New shared modules | 3 new files |
| `shared/lib/persistent-store.js` | Bumped to v1.1 (better find() API) | 1 file |
| `shared/prompts/*.md` | 3 prompt templates | 3 new files |
| 178 service `src/index.js` files | Auth, shutdown, /ready, logger | All services touched |
| 178 service `Dockerfile` files | New | All services |
| 178 service `.env.example` files | New | All services |
| 178 service `test/*.test.js` files | New unit tests | All services |
| 116 service `tests/smoke.sh` files | Regenerated | All smoke tests |
| 12 `divisions/0X-*/CLAUDE.md` files | Rewritten with honest status | All 12 |
| `docker-compose.yml` (root) | New orchestration | 1 new file |
| `.github/workflows/hojai-ci.yml` | New CI | 1 new file |
| `blr-ai-marketplace/app/*` | New Next.js pages | ~5 new files |
| `blr-ai-marketplace/components/*` | New React components | ~15 new files |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Migration breaks running services | High | Phase 1+2 keep existing `Map` as fallback, switch to `persistent-store` via env var. Blue/green deploy. |
| Auth changes break callers | High | Add `auth-soft-mode=true` env var that accepts both old and new auth for 2-week transition. |
| Test regeneration produces false confidence | Medium | Phase 3 also adds 1 hand-written unit test per service that asserts a real business behavior. |
| BLR storefront scope creep | Medium | Lock the 3 pages in Phase 5. Defer "user accounts" and "ratings" to v2. |
| LLM costs explode | Medium | Cache LLM responses for 1 hour by default. Add `LLM_BUDGET_PER_DAY` env var. |
| Division docs become demoralizing | Low | Frame as "current state — here's the path forward", not "you're a failure". |
| Scope creep beyond 10 weeks | High | Strict phase gate. No P2 work in current phase. |

---

## 9. Effort Summary

| Phase | Duration | Engineers | Files touched | Outcome |
|---|---|---|---|---|
| 1. Security | 1 week | 1 | ~50 | Zero auth bypasses |
| 2. Persistence | 2 weeks | 1 | ~25 | 20 services survive restart |
| 3. Tests | 2 weeks | 1 | ~300 | Real test coverage |
| 4. Operations | 2 weeks | 1 + 1 DevOps | ~700 | Deployable via `docker compose up` |
| 5. AI + UI + Docs | 3 weeks | 1 FE + 1 AI | ~50 | Real LLM + BLR storefront + honest docs |
| **Total** | **10 weeks** | **avg 1.5** | **~1,100** | **Production-ready** |

---

## 10. Definition of Done (overall)

HOJAI AI is "production-ready" when ALL of these are true:

- [ ] 178/178 services have auth (Phase 1)
- [ ] 20/20 top services have persistent storage (Phase 2)
- [ ] 178/178 services have ≥1 unit test (Phase 3)
- [ ] 178/178 services have /ready + graceful shutdown (Phase 4)
- [ ] 178/178 services have Dockerfile + .env.example (Phase 4)
- [ ] `docker compose up` brings up the platform end-to-end (Phase 4)
- [ ] 3 Genie services make real LLM calls (Phase 5)
- [ ] BLR storefront runs at http://localhost:3000 (Phase 5)
- [ ] All 12 division CLAUDE.md files have honest status (Phase 5)
- [ ] `GO-LIVE-CHECKLIST.md` is signed off by both product and engineering leads

---

## 11. Order of Operations (the actual sequence)

```
Week 1:  Phase 1 — Security lockdown (auth, secrets, env validation)
Week 2:  Phase 2 — Persistence (start with 5 highest-criticality services)
Week 3:  Phase 2 — Persistence (remaining 15 services)
Week 4:  Phase 3 — Test regeneration + unit tests (week A: 50 services)
Week 5:  Phase 3 — Test regeneration + unit tests (week B: 50 services, then the rest)
Week 6:  Phase 4 — Operations (graceful shutdown, /ready, Dockerfiles)
Week 7:  Phase 4 — Operations (docker-compose, .env.example, CI workflow)
Week 8:  Phase 5 — Real AI (wire LLM into 3 Genie services)
Week 9:  Phase 5 — BLR storefront (home, listings, checkout)
Week 10: Phase 5 — Honest docs (12 division CLAUDE.md files), GO-LIVE-CHECKLIST
```

Each week ends with a `PHASE-N-SUMMARY.md` and a demo to product team. The plan is reviewable at every phase boundary, so we can stop early if needed.

---

## 12. What This Plan Does NOT Do

- ❌ Build 500+ skills to match the marketing claims
- ❌ Train new foundation models (not in scope; would be 5+ year, $50M+ effort)
- ❌ Touch Leverge code (4761-4765) — external client
- ❌ Touch RABTUL/REZ-Merchant services — external client
- ❌ Make all 178 services "real AI" — only 3 flagship services
- ❌ Implement the full multi-agent runtime (ReAct loop) — that's a separate, larger project
- ❌ Build BLR user accounts, ratings, or social features — out of scope for go-live
- ❌ Migrate to a real message bus (Kafka, NATS) — in-memory event-bus is acceptable for v1

---

## Next step

Approve this plan → start Phase 1 (auth + secrets). Phase 1 is a 1-week sprint with clear deliverables and zero ambiguity. Once Phase 1 is done, the platform is safe to expose to any production traffic, even if everything else stays the same.
