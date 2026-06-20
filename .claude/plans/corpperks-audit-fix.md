# CorpPerks Complete Audit Fix — Implementation Plan

**Date:** June 20, 2026
**Audit source:** CORPPERKS-AUDIT-JUNE-20-2026.md (in progress, this plan is the implementation)

**Decisions (confirmed):**
- Scope: **Full audit remediation** — all Tier 1-3 audit findings
- Wallet target: **Local RTMN rez-wallet-service** (RABTUL-Technologies/rez-wallet-service, port 4004)
- Wallet implementation: **Use existing rez-wallet-service as backend** — don't rebuild

**Source-of-truth audit doc:** `/Users/rejaulkarim/Documents/RTMN/companies/CorpPerks/CORPPERKS-AUDIT-JUNE-20-2026.md` (write at end of Tier 1)

---

## Phase 0 — Set up shared auth + audit middleware (CRITICAL FOUNDATION)

Before fixing any service, build the shared middleware that fixes will reuse.

**Files to create:**
- `companies/CorpPerks/shared/middleware/auth.ts` — single `requireAuth()`, `requireAdmin()`, `requireInternal()`, `requireTenant()` (re-export from existing api-gateway versions)
- `companies/CorpPerks/shared/middleware/internal-token.ts` — `requireInternal()` with `crypto.timingSafeEqual` (replaces 15 hand-rolled broken checks)
- `companies/CorpPerks/shared/middleware/cors.ts` — `secureCors()` helper that rejects `*` in production
- `companies/CorpPerks/shared/middleware/graceful-shutdown.ts` — SIGTERM/SIGINT handler that closes MongoDB
- `companies/CorpPerks/shared/middleware/error-handler.ts` — strips stack traces in production
- `companies/CorpPerks/shared/middleware/pagination.ts` — caps `limit` at 100
- `companies/CorpPerks/shared/clients/rez-wallet.ts` — typed client for `rez-wallet-service` (port 4004)

**Files to update:**
- `companies/CorpPerks/shared/index.ts` — re-export the new modules
- Each service's `package.json` — add `"@corpperks/shared": "file:../shared"` if not already

**Outcome:** Every subsequent fix can `import { requireAuth } from '@corpperks/shared'` instead of inventing a new auth check.

---

## Phase 1 — Tier 1 Critical Security (BLOCKS ANY DEPLOY)

Fix in this order — each is independent.

### 1.1 Lock down payroll service (4 route files, no auth)
**File:** `companies/CorpPerks/payroll-service/src/routes/`
- `payroll.routes.ts`
- `tax.routes.ts`
- `advance.routes.ts`
- `reimbursement.routes.ts`

**Fix:** Add `router.use(requireAuth)` and `router.use(requireTenant)` at the top of each file. Remove `X-Tenant-Id` header trust. Apply `authorize('admin', 'hr_manager')` on write endpoints.

### 1.2 Lock down backend hotel routes
**File:** `companies/CorpPerks/backend/src/routes/hotelRoutes.ts`
**Fix:** Apply `requireAuth` middleware. Derive `corporateId`/`employeeId` from JWT, drop `x-corporate-id`/`x-employee-id` header trust.

### 1.3 Lock down rez-corp-integration-service
**File:** `companies/CorpPerks/rez-corp-integration-service/src/index.ts`
**Fix:** Add `requireInternal` globally. Replace `app.use(cors())` with `secureCors()`. Replace stub endpoints with real wallet/order/payment calls (see Phase 3).

### 1.4 Lock down rez-corporate-service
**File:** `companies/CorpPerks/rez-corporate-service/src/index.ts`
**Fix:** Apply `requireAuth` (already imported!) to the 28 routes that currently lack it. Cards, GST, travel approvals all need auth.

### 1.5 Fix payroll logger infinite recursion
**File:** `companies/CorpPerks/payroll-service/src/utils/logger.ts:23-45`
**Fix:** Each method calls `logger.X(...)` recursively. Replace with `console.X(...)` inside method body, OR import the shared PII-redacting logger.

### 1.6 Remove hardcoded JWT/internal-token fallbacks
**15 files** identified in audit finding #6. Replace `|| 'dev-secret-...'` with fail-fast throw at startup if env var missing.

### 1.7 Delete `.env` files with secrets
- `companies/CorpPerks/backend/.env`
- `companies/CorpPerks/restopapa/.env`
- `companies/CorpPerks/restopapa/backend/.env`
**Fix:** Delete. Strengthen `.gitignore`. Add boot check.

### 1.8 Lock down ai-agents-service X-User-Id trust
**File:** `companies/CorpPerks/ai-agents-service/src/routes/agentRoutes.ts`
**Fix:** Replace `req.headers['x-user-id']` with JWT-derived `req.user.id`. Reject if missing.

---

## Phase 2 — Tier 1 Corporate Wallet (the user-facing feature)

### 2.1 Make rez-corp-integration-service actually call rez-wallet-service
**File:** `companies/CorpPerks/rez-corp-integration-service/src/index.ts:33-80`

Replace each stub:
- `/benefits/credit` → real `axios.post('http://localhost:4004/wallet/credit', ...)` with category, employeeId, amount, idempotency key
- `/travel/book` → real order creation via RABTUL Order Service
- `/expenses/track` → real analytics
- `/corporate/sync` → real auth sync

Use the new shared client from Phase 0.

### 2.2 Update REZ-merchant-corpperks-bridge rabtulClient
**File:** `companies/CorpPerks/REZ-merchant-corpperks-bridge/src/integrations/rabtulClient.ts`

Change default `RABTUL_WALLET_URL` from `https://rez-wallet-service.onrender.com` to `http://localhost:4004` (local dev). Make prod URL an env var.

### 2.3 Wire docker-compose.prod.yml wallet env vars
**File:** `companies/CorpPerks/docker-compose.prod.yml`

Add to `corperks-api` env: `RABTUL_WALLET_URL=http://rez-wallet-service:4004`, `RABTUL_AUTH_URL=http://rez-auth-service:4002`.

### 2.4 Document the wallet integration
Update `companies/CorpPerks/docs/WALLET-SYSTEM.md`:
- Note: Wallet backend is local RABTUL `rez-wallet-service` (port 4004)
- Add the corporate categories with their monthly limits
- Show the end-to-end flow: company allocates → employee spends → merchant reconciles

### 2.5 Build employee bills flow
**New files in `rez-corporate-service/src/routes/`:**
- `bills.routes.ts` — upload bill, OCR, categorize, route for approval
- `approvals.routes.ts` — workflow integration (already exists as `workflow-service`)
- `reimbursements.routes.ts` — settle approved bills back to corporate wallet or personal wallet

Use existing `rez-corporate-service` models; reuse `requireAuth` middleware.

---

## Phase 3 — Tier 1 Deployment Wiring (so it actually runs)

### 3.1 Fix CorpID port defaults (4 files)
All say `:4701`, should be `:4702`:
- `api-gateway/src/service-config.ts:83`
- `shared/config/production.ts:43`
- `shared/integrations/index.ts:45`
- `docs/INTEGRATIONS.md:96`

**Fix:** Replace with single source of truth at `shared/config/corpid.ts`. Import in all 4 places.

### 3.2 Add real RTMN Hub client
**File:** `companies/CorpPerks/shared/clients/rtmn-hub.ts` (new)
**Fix:** Real client pointed at `:4399`. Wire api-gateway routes `/api/customer360/*` etc. through it.

### 3.3 Fix root Dockerfile
**File:** `companies/CorpPerks/Dockerfile`
**Fix:** Currently a generic SUTAR template pointing at port 4240. Replace with the actual backend Dockerfile (multi-stage Node 20 build).

### 3.4 Fix dev docker-compose.yml
**File:** `companies/CorpPerks/docker-compose.yml`
**Fix:** Drop references to non-existent `../rez-corpperks-service` and `../rez-hotel-service`. Keep MongoDB + a single service (backend) so dev actually starts.

### 3.5 Fix docker-compose.prod.yml
**File:** `companies/CorpPerks/docker-compose.prod.yml`
- Remove `config/mongodb/mongod.conf` reference (file doesn't exist)
- Add missing env vars (21 missing — backend reads 27, compose provides 6)
- Add wallet service to the stack
- Add api-gateway (currently missing)

### 3.6 Add 34 missing services to render.yaml
**File:** `companies/CorpPerks/render.yaml`
**Fix:** Add `api-gateway`, all 15 corpid sub-services not present, AI agent services, all bridges.

### 3.7 Delete stub services (decide for each)
- `rez-stayown-service` — DELETE (8 lines, no value)
- `rez-corp-integration-service` — KEEP and fix (Phase 2.1)
- `rez-payroll-service` — DELETE (in-memory Map, redundant with rez-corporate-service)

Remove deleted services from `docker-compose.prod.yml` and `render.yaml`.

### 3.8 Fix broken RABTUL/REZ-corpperks-intelligence
**File:** `companies/RABTUL-Technologies/REZ-corpperks-intelligence/src/index.ts`
**Fix:** Either delete the file/dir (if not needed) or rewrite with proper express setup. Current code references undefined `app`.

---

## Phase 4 — Tier 2 High-Severity Fixes

### 4.1 Switch payroll to decimal.js
**File:** `companies/CorpPerks/payroll-service/src/services/payroll.service.ts`
**Fix:** Add `decimal.js` dep. Wrap all salary math in `new Decimal(...)`. Use `Decimal128` in Mongoose schemas.

### 4.2 Add audit logging
**File:** `companies/CorpPerks/shared/middleware/audit-log.ts` (new)
**Fix:** Helper that writes `{ userId, action, resource, resourceId, ip, timestamp }` to `auditlogs` collection. Apply on all payroll/employee read+write routes.

### 4.3 Fix JWT verify (algorithm restriction)
**Files:** All `jwt.verify(token, secret)` calls — add `{ algorithms: ['HS256'] }`.

### 4.4 Fix NoSQL regex injection
**Files:** `backend/src/routes/employees/employeeRoutes.ts:124-129`, `userRoutes.ts:30-34`, etc.
**Fix:** Wrap user input in `escape-string-regexp`. Add Express middleware that rejects query keys starting with `$`.

### 4.5 Fix leave balance update
**File:** `backend/src/routes/leave/leaveRoutes.ts:163-167`
**Fix:** `findByIdAndUpdate` with function value doesn't work. Use `findById → mutate → save`.

### 4.6 Lock down login (tenant scoping)
**File:** `backend/src/routes/auth/authRoutes.ts:25-64`
**Fix:** Add `tenantId` to login filter. Default `role: 'employee'` on self-registration, not `admin`. Add `strictLimiter` on login (5/15min).

### 4.7 Fix CORS wildcards everywhere
**Files:** 12+ identified in audit finding #8.
**Fix:** Replace with `secureCors()` from shared middleware. Reject boot if `CORS_ORIGINS=*` and `NODE_ENV=production`.

### 4.8 Add TLS to MongoDB
**Files:** All `mongoose.connect()` calls — 15+ services.
**Fix:** Use `mongodb+srv://` or add `{ tls: true }`. Document required `MONGODB_CA_FILE` env var.

### 4.9 Replace local loggers with shared PII-redacting logger
**Files:** 50+ services have local loggers.
**Fix:** Migrate to `shared/logger.ts`. ESLint rule banning local logger files.

---

## Phase 5 — Tier 3 Cleanup & Consistency

### 5.1 Delete CLEANUP-BACKUP-20260525/
**Path:** `companies/CorpPerks/CLEANUP-BACKUP-20260525/`
**Fix:** Verify nothing live references it. `git rm -r`. (Already confirmed: live tree doesn't reference it.)

### 5.2 Delete duplicate .env.gitignore
**Path:** `companies/CorpPerks/.env.gitignore`
**Fix:** `git rm` — duplicates `.gitignore`.

### 5.3 Rename placeholder corpid packages
**Files:** 7 corpid sub-services with `"name": "@corpid/placeholder"`
**Fix:** Rename to actual service names in package.json + tsconfig paths.

### 5.4 Reconcile doc counts
**Files:** All `CORPPERKS-*-AUDIT*.md`, `CORPPERKS-DEPLOYMENT-STATUS.md`, `CLAUDE.md`
**Fix:** Establish single canonical CORPPERKS-AUDIT-JUNE-20-2026.md. Replace counts in older docs with "see CORPPERKS-AUDIT-JUNE-20-2026.md".

### 5.5 Implement missing BIZORA bridges
**Files:** `BIZORA/services/retail-os/` and `BIZORA/services/fitness-os/` (don't exist)
**Fix:** Create stubs modeled on existing `salon-os/` (smallest existing bridge).

### 5.6 Add missing service to CI matrix
**File:** `.github/workflows/ci.yml` and `deploy.yml`
**Fix:** Add HR services, AI services, bridges, all web apps to build matrix. Add mobile apps to EAS Build matrix.

---

## Phase 6 — Final audit doc + verification

### 6.1 Write CORPPERKS-AUDIT-JUNE-20-2026.md
**Path:** `companies/CorpPerks/CORPPERKS-AUDIT-JUNE-20-2026.md`
**Contents:** Consolidated diff from prior audits + this fix's verification (test runs, health checks, security scan output).

### 6.2 Verify each fix
- Run `npm run typecheck` in each modified service
- Run `npm test` (the new tests added for wallet flow, auth, decimal precision)
- Curl `/health` on each fixed service
- Confirm bridge actually credits the wallet (integration test)

---

## Out of scope (separate plans)

These are larger efforts that need their own planning:
- Migrate from `bcryptjs` to `argon2id` (audit finding #30)
- Add MongoDB CSFLE for PAN/UAN/bank account (finding #11)
- Build real RTMN MemoryOS/TwinOS clients (integration audit)
- Mobile app EAS Build setup (deployment audit)
- Convert local `corpid/` to point at parent RTMN CorpID (architectural decision)

---

## Verification checkpoints

After each phase:
1. `npm run typecheck` passes in modified services
2. No new `console.log` introduced
3. All new endpoints have `requireAuth` or `requireInternal`
4. `docker-compose.prod.yml config` validates (run `docker compose config`)
5. No new hardcoded URLs/ports in production code

After Phase 6:
1. End-to-end test: company allocates ₹5,000 meal benefit → employee spends at merchant → merchant reconciles
2. Security scan: no open CORS, no missing auth on sensitive endpoints
3. All health endpoints respond 200
