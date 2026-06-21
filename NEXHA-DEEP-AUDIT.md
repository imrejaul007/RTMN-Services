# Nexha Deep Audit + Implementation Plan

> **Date:** 2026-06-21
> **Scope:** Every file under `/Users/rejaulkarim/Documents/RTMN/companies/Nexha` (L1) — `commerce-identity`, `portal`, `sutar-mock`, top-level configs and docs.
> **Companion to:** [NEXHA-AUDIT.md](NEXHA-AUDIT.md) (structural/port/scope audit covering all 6 Nexha locations).
> **Status:** 🔴 Read-only. No files modified. Findings + implementation plan only.

---

## Executive Summary

The local directory `/Users/rejaulkarim/Documents/RTMN/companies/Nexha/` contains **a working deployable slice** of one product line: identity + onboarding + reputation + a Next.js portal. It is **production-shaped** (Dockerfiles, Render+Vercel configs, Caddyfile, env templates, winston logger, helmet, JWT, graceful shutdown) but has **~25 real bugs and ~30 doc/code mismatches**.

The biggest issues are in the **portal**: 4 of 11 pages are UI shells with hardcoded mock data, the password-set step in registration is broken (uses empty JWT), and one page (`upgrade`) literally has an `alert("coming soon!")` placeholder. Several auth/authorization bugs let any caller mint an "admin" CorpID, see other buyers' PII, or forge ratings.

A clean **implementation plan** below covers 7 phases, ordered by safety (no deploy-blocking changes last). Estimated total wall-clock for a careful dev: **~16 hours of code work + 4 hours of test/verify**.

The "extract to its own GitHub repo" goal is feasible — the L1 codebase is genuinely self-contained (no cross-service code deps). What's missing for a clean extraction is: bug fixes, a README rewrite that matches the actual code, removal of committed secrets, and a port-registry reconciliation.

---

## 1. What's Actually in This Directory

| Path | LOC | Purpose |
|---|---:|---|
| `commerce-identity/` | ~5,991 (75 files) | Identity, KYC, reputation, guest onboarding API |
| `portal/` | ~1,461 (14 files) | Next.js 16 B2B portal UI |
| `sutar-mock/` | ~343 (2 files) | In-process mock of SUTAR OS for local dev |
| Top-level | 5 docs + 4 configs | CLAUDE.md, DEPLOY.md, FEATURES-LIST.md, ONBOARDING.md, render.yaml, docker-compose.yml, Caddyfile |

**3 services + portal + 5 docs.** That's the entire local footprint.

### The L1 vs L2 reality

L1 is a **deployment slice** for the Render+Vercel deployment. The other 7 NeXha services (DistributionOS, FranchiseOS, ProcurementOS, ManufacturingOS, TradeFinance, Intelligence, Ecosystem Connector) all live in `companies/REZ-Workspace/companies/Nexha/` (L2). Per your direction, L2 is the source of truth for the full product line, and Nexha will be extracted into its own GitHub repo. The local `companies/Nexha/` is the **local mirror + Render deploy unit** — what gets extracted is L1 + L2 (the union).

The implementation plan below treats L1 as the codebase to clean up; L2 is referenced as the source of services that will come along when Nexha is extracted.

---

## 2. Findings — Bugs (Functional)

> Severity legend: 🔴 critical (security/data-loss) · 🟠 high (broken feature) · 🟡 medium (incorrect behavior) · 🟢 low (cosmetic).

### 2.1 Authentication & authorization

| # | Sev | Where | Bug |
|---|---|---|---|
| B-AUTH-1 | 🔴 | `commerce-identity/src/routes/corpid.routes.ts:17` | `POST /api/corpid/issue` is public; anyone can mint a CorpID with any role. Combined with the prefix-fallback in login (see B-AUTH-2), this means anyone can mint an "admin" corpId. |
| B-AUTH-2 | 🔴 | `commerce-identity/src/routes/auth.routes.ts:25` | Role determined by corpId string prefix: `SUP*` → supplier, `BUY*` → buyer, anything else → **admin**. Anyone who knows this can mint an admin corpId via `B-AUTH-1` and call admin routes. |
| B-AUTH-3 | 🔴 | `commerce-identity/src/routes/rating.routes.ts:16-17` | `raterCorpId: req.corpId \|\| req.body.raterCorpId` and `raterRole: req.role \|\| req.body.raterRole \|\| 'buyer'`. With `requireAuth('strict')` the `req.corpId` from JWT is authoritative — but a forged JWT (because B-AUTH-2 lets anyone get an admin token) means anyone can submit ratings as anyone. |
| B-AUTH-4 | 🔴 | `commerce-identity/src/routes/supplier.routes.ts:39` | `isSelf = req.header('x-corp-id') === supplier.corpId`. Anyone can set the `x-corp-id` header to any value and view full supplier PII (bank details, document URLs). The header check is purely client-asserted. |
| B-AUTH-5 | 🟠 | `commerce-identity/src/routes/buyer.routes.ts:32-37` | `GET /api/buyers/:corpId` is `requireAuth('public')` and returns the full buyer record (phone, address, GSTIN, PAN, payment scores) with no auth check. |
| B-AUTH-6 | 🟠 | `commerce-identity/src/services/auth.service.ts:21` | `JWT_SECRET = process.env.JWT_SECRET \|\| 'dev-secret-change-me'` — if env is unset, login works with a known fallback secret. Anyone running without explicit env gets a known JWT. |
| B-AUTH-7 | 🟠 | `commerce-identity/src/middleware/auth.middleware.ts:60-70` | Internal-key path: if `INTERNAL_API_KEY` is empty, the `crypto.timingSafeEqual` branch is skipped (correct), but the code then falls through to the 401 response with no useful hint that the env var is missing. |
| B-AUTH-8 | 🟠 | `commerce-identity/src/routes/guest.routes.ts:79-92` | `POST /api/guest-suppliers/:guestId/convert` is `requireAuth('strict')` — but doesn't check that the caller is the guest themselves or an admin. Any authenticated user could convert any guest. |

### 2.2 Registration & onboarding

| # | Sev | Where | Bug |
|---|---|---|---|
| B-REG-1 | 🟠 | `portal/app/onboard-supplier/page.tsx:63-69` | Password-set step uses `localStorage.getItem('nexha_token')` — but user never logged in (this is registration). Token is empty; the call to `/api/auth/password` will fail with 401. **Password is never actually set on the backend after registration.** |
| B-REG-2 | 🟠 | `portal/app/onboard-supplier/page.tsx:65` | Hardcoded `http://localhost:8000/api/auth/password` (not using `lib/api.ts` and not using `process.env.NEXT_PUBLIC_API_URL`). Breaks in production. |
| B-REG-3 | 🟠 | `portal/app/upgrade/page.tsx:125` | `alert('Upgrade submission coming soon!')` — upgrade form is a stub. Doesn't call `convertGuest`. |
| B-REG-4 | 🟡 | `commerce-identity/src/routes/supplier.routes.ts:11-29` | `POST /api/suppliers` requires `requireAuth('strict')` but new suppliers have no JWT yet. Combined with `corpid.routes` (B-AUTH-1), there's no clean first-time-supplier flow: they can mint a corpId, then can't register. |
| B-REG-5 | 🟡 | `commerce-identity/src/routes/auth.routes.ts:36-46` | `POST /api/auth/password` requires existing JWT — but there's no `POST /api/auth/register` flow to set initial credentials. Dead-end. |
| B-REG-6 | 🟡 | `commerce-identity/src/services/supplier.service.ts:73-89` | GSTIN document validation: sets `verified: true` based on regex match, sets `verifiedAt: new Date()`, then conditionally sets `verified: false` if checksum fails — but doesn't unset `verifiedAt`. A "verified" timestamp on a doc that's now unverified. |
| B-REG-7 | 🟡 | `commerce-identity/src/services/guest-supplier.service.ts:97` | OTP code stored in plaintext in MongoDB (`otpHistory[].code`). The model comment says "hashed in production"; the implementation doesn't hash. Privacy concern. |
| B-REG-8 | 🟡 | `commerce-identity/src/services/guest-supplier.service.ts:172` | `if (latestOtp.code !== code)` — plain string equality, not timing-safe. Low risk for 6-digit OTP but inconsistent with the timing-safe internal-key pattern elsewhere. |

### 2.3 SUTAR bridge & integration

| # | Sev | Where | Bug |
|---|---|---|---|
| B-SUT-1 | 🟠 | `commerce-identity/src/services/sutar-bridge.service.ts:16-18` | Defaults: `SUTAR_IDENTITY = ... \|\| 'http://localhost:4702'` (real CorpID port), but `.env` overrides to `:4799` (sutar-mock). Production-vs-dev intent is confused. |
| B-SUT-2 | 🟠 | `commerce-identity/src/services/sutar-bridge.service.ts:84-91` | `pushReputation` is defined and exported but **never called from anywhere**. The actual reputation sync happens via `reputation.service.ts:319-325` which uses raw `fetch` (different code path, different request shape). Two paths for the same thing. |
| B-SUT-3 | 🟠 | `commerce-identity/.env:5-9` | All 5 SUTAR URLs point at `localhost:4799`. This file is **committed to git** — anyone with repo read gets the (dev) wiring. If this is going to a separate repo, .env must be removed from git. |
| B-SUT-4 | 🟡 | `commerce-identity/src/services/sutar-bridge.service.ts:121` | `emitEvent` reads `SUTAR_EVENT_BUS_URL` but the local `.env` doesn't set it (so the function silently no-ops in dev). The reputation service's direct-fetch path also reads `SUTAR_REPUTATION_URL` and works. Two paths again. |
| B-SUT-5 | 🟡 | `commerce-identity/src/services/reputation.service.ts:319` | Direct `fetch` to SUTAR bypasses the bridge abstraction. If the bridge changes (e.g., adds retry), this path won't get the fix. |

### 2.4 Portal pages — broken or stub

| # | Sev | Where | Bug |
|---|---|---|---|
| B-PORTAL-1 | 🟠 | `portal/app/products/page.tsx` | "My Products" page is a UI shell. No API call to fetch products. "+ Add Product" button has no handler. |
| B-PORTAL-2 | 🟠 | `portal/app/rfqs/page.tsx` | RFQs page hardcodes 2 mock RFQs (`RFQ-001`, `RFQ-002`). No API call. "+ Create RFQ" button has no handler. |
| B-PORTAL-3 | 🟠 | `portal/app/ratings/page.tsx` | Hardcoded mock data in `reviews` array AND shows overall score as hardcoded `0` while showing 5-star breakdown bars. Visually contradictory. |
| B-PORTAL-4 | 🟠 | `portal/app/upgrade/page.tsx` | Upgrade form is a stub (alert "coming soon!"). |
| B-PORTAL-5 | 🟡 | `portal/app/dashboard/page.tsx:142-144` | Hardcoded "API Status" UI claims SUTAR/MongoDB are UP based on string length, not actual health checks. |
| B-PORTAL-6 | 🟡 | `portal/lib/api.ts:6` | JWT stored in `localStorage`. XSS-vulnerable. Should be httpOnly cookie or sessionStorage. |
| B-PORTAL-7 | 🟡 | `portal/lib/api.ts:14` | No error response shape validation — assumes every response has `{success, data}`. |

### 2.5 Misc code bugs

| # | Sev | Where | Bug |
|---|---|---|---|
| B-MISC-1 | 🟠 | `commerce-identity/src/services/auth.service.ts:60` | `entity.metadata = entity.metadata \|\| {}` — fine, but the next line `(entity.metadata as Record<string, unknown>)['passwordHash'] = hash;` mutates a Mixed Mongoose field without validation. Type schema bypass. |
| B-MISC-2 | 🟡 | `commerce-identity/src/app.ts:18` | `ALLOWED_ORIGINS` default includes `https://*.vercel.app` — broad wildcard allows any vercel.app subdomain. Combined with `requireAuth('public')` on `POST /api/corpid/issue`, an attacker on a vercel.app subdomain could trigger CorpID minting. |
| B-MISC-3 | 🟡 | `commerce-identity/src/services/reputation.service.ts:131-141` | `overallPct` math: divides by `totalWeight * 100` but multiplies by `100` already inside the loop — net result is correct, but the formula is hard to verify by inspection. Risk of silent regression. |
| B-MISC-4 | 🟡 | `portal/next.config.ts:5` | `output: 'standalone'` is fine, but `Dockerfile` line 22 `COPY --from=builder /app/.next/standalone ./` assumes standalone output. Confirmed compatible. No bug — verification. |
| B-MISC-5 | 🟢 | `portal/.env.local` and `portal/.env.production.local` | Both files are **committed to git**. `.env.local` has dev URL; `.env.production.local` is empty/template. Should add to `.gitignore`. |

---

## 3. Findings — Security

| # | Sev | Where | Issue |
|---|---|---|---|
| S-1 | 🔴 | `commerce-identity/.env` (committed) | `JWT_SECRET=dev-secret-change-me-in-production-please` and `INTERNAL_API_KEY=change-me-in-production` are committed. Anyone with repo read can mint valid JWTs. |
| S-2 | 🔴 | `commerce-identity/src/middleware/auth.middleware.ts:60-70` | Internal-key auth uses `Buffer.from(internalKey).length === Buffer.from(INTERNAL_KEY).length && crypto.timingSafeEqual(...)`. Length check is correct but the comparison runs *only if lengths match* — Node will throw on `timingSafeEqual` with mismatched lengths, which is why the length check exists. Fine, but the pattern should be extracted to a helper. |
| S-3 | 🟠 | `portal/.vercel/project.json` | Contains real Vercel `projectId` and `orgId`. Minor leak; not a secret per se but unusual to commit. |
| S-4 | 🟠 | `portal/lib/api.ts:6` | JWT in `localStorage` — XSS-readable. Standard SPA footgun. |
| S-5 | 🟡 | `commerce-identity/src/services/whatsapp.service.ts:79` | Dev mode logs the actual OTP code to console and to the SUTAR event bus. Intentional for dev but if `WHATSAPP_PROVIDER` is unset in production, OTPs leak. Document the requirement. |
| S-6 | 🟡 | `commerce-identity/src/models/supplier.model.ts:113-119` | `bankDetails.accountNumber` stored unencrypted. Comment says "encrypted at rest in production" — but implementation doesn't encrypt. Privacy compliance risk for India (DPDP Act). |
| S-7 | 🟡 | `commerce-identity/src/services/sutar-bridge.service.ts:25` | `x-internal-key` header sent to SUTAR. Falls back to empty string if env unset — means SUTAR gets empty-key requests. SUTAR-side should reject; verify. |
| S-8 | 🟢 | `commerce-identity/src/index.ts:31-34` | Startup error logged with stack — fine in dev, may leak info in prod logs. Standard. |

---

## 4. Findings — Doc/Code Mismatches

| # | Where | Mismatch |
|---|---|---|
| DC-1 | `commerce-identity/README.md:170` says "In production the `corpid-jwt` mode is replaced with a real JWT issued by `rez-auth-service`" — but `auth.middleware.ts:36-58` uses real JWTs (HMAC-signed via `jsonwebtoken`), and `auth.service.ts:81-99` issues them internally. The README describes the wrong architecture. |
| DC-2 | `commerce-identity/README.md:165` lists auth modes as `internal-key`, `corpid-jwt`, `guest-otp`. The actual code has `jwt`, `internal-key`, `guest-token`, `public` — 4 modes, not 3, and named differently. |
| DC-3 | `commerce-identity/README.md:127-154` says auth via headers (`x-internal-key` or `x-corp-id`). The actual implementation is Bearer token via `Authorization: Bearer ...`. |
| DC-4 | `companies/Nexha/CLAUDE.md:30-40` lists 10 services at ports 4300-5002. **None of those services are in this directory.** Only 3 exist here. |
| DC-5 | `companies/Nexha/CLAUDE.md:143` says `NEXT_PUBLIC_API_URL=http://localhost:4388/api`. Actual portal uses `:3000` and `:8000`. |
| DC-6 | `companies/Nexha/CLAUDE.md:42-56` "Security (Hardened June 13, 2026)" lists features like "RBAC with 12 roles", "Zod schemas", "WebSocket", "Prometheus metrics" — **none of these exist in the codebase**. CLAUDE.md was copy-pasted from L2. |
| DC-7 | `companies/Nexha/CLAUDE.md:266` says "Production Ready ✅" but `commerce-identity/src/services/whatsapp.service.ts` has the dev-mode OTP fallback. |
| DC-8 | `companies/Nexha/FEATURES-LIST.md:1` says Version 4.0.0; `companies/Nexha/CLAUDE.md:265` says Version 3.0.0. Both describe the full 10-service product; neither describes the actual 3-service L1. |
| DC-9 | `commerce-identity/.env.example:18-19` says `JWT_SECRET=dev-secret-change-me-in-production-please`. This is a public template file — fine to commit, but the matching `.env` (line 10) has the same value, which means the `.env` file is just a copy of the example, not real secrets. |
| DC-10 | `companies/Nexha/CLAUDE.md:486-498` shows a code example calling `http://localhost:4702/api/trust/score/...` and `http://localhost:4703/api/context/get`. Neither call exists in any source file. |
| DC-11 | `commerce-identity/src/services/sutar-bridge.service.ts:21` `post()` swallows all errors with `return null`. Means failures are silent. Comment says "failures are logged" but the code path `logger.warn` runs but `return null` happens regardless. |
| DC-12 | `portal/package.json:13` uses Next 16.2.9. `portal/AGENTS.md:3` warns "This is NOT the Next.js you know. This version has breaking changes". The implementation uses standard `useRouter`, `Link`, `useState` patterns that work in Next 13-15, but compatibility with 16 is unverified. |

---

## 5. Findings — Configuration & Deploy

| # | Sev | Where | Issue |
|---|---|---|---|
| C-1 | 🟠 | `commerce-identity/.env` | Committed to git. Must be removed for the separate-repo extraction. |
| C-2 | 🟠 | `portal/.env.local`, `portal/.env.production.local` | Committed. Add to `.gitignore`. |
| C-3 | 🟠 | `render.yaml:62` | `ALLOWED_ORIGINS` defaults to `http://localhost:3000,http://localhost:3001`. Production deployment needs the Vercel URL added. The deploy doc says to do this manually after Vercel deploys; OK but fragile. |
| C-4 | 🟡 | `render.yaml:55-58` | `MONGODB_URI` is `sync: false` — must be set manually in Render dashboard. Comment says so but it's easy to miss. |
| C-5 | 🟡 | `docker-compose.yml:72,76` | Uses `${JWT_SECRET:?Please set JWT_SECRET}` — fails fast if env unset. Good. |
| C-6 | 🟡 | `Caddyfile:25-36` | Entire `commerce-identity-api` block is commented out. The Caddyfile works only on `localhost:3000` and `localhost:8443` for dev. Production Caddyfile config is TODO. |
| C-7 | 🟡 | `portal/vercel.json` | Specifies `regions: ["sin1"]` (Singapore). Fine. |
| C-8 | 🟡 | `portal/Dockerfile:7` | `RUN npm ci --ignore-scripts` — skips lifecycle scripts (correct for security), but if any package needs postinstall (e.g., Prisma), this will break. Currently no such deps, but document the choice. |
| C-9 | 🟢 | `commerce-identity/dist/` | Built output is committed. 50+ files. Bloats the repo. Should add to `.gitignore` and rebuild on deploy. |
| C-10 | 🟢 | `portal/.next/` | Next.js build output committed. Same as C-9. |

---

## 6. Findings — Architecture & Cross-Tree Gaps

| # | Where | Issue |
|---|---|---|
| A-1 | All top-level docs | `companies/Nexha/CLAUDE.md` and `companies/Nexha/FEATURES-LIST.md` describe the full L2 product (10 services) but the L1 directory only has 3 services. Anyone reading the local CLAUDE.md will think DistributionOS, ProcurementOS, etc. live in this directory — they don't. |
| A-2 | `commerce-identity/README.md:24` | "The service bridges to **SUTAR OS** (the trust layer of the RTMN ecosystem)" — but the SUTAR URLs in `.env` all point at the local `sutar-mock` (4799), not real SUTAR. In production this needs to be reconfigured; the README should make that crystal clear. |
| A-3 | `companies/Nexha/CLAUDE.md:20-25` Quick Start | `cd RTNM-Group/nexha` — there's no `RTNM-Group` subdir in this directory. Instructions are copy-pasted from L2. |
| A-4 | L2 ↔ L1 overlap | L2 procurement-os (4867 LOC) is a different service from L1 commerce-identity (~6k LOC). They don't share code. The "full Nexha product" combines both. For separate-repo extraction, BOTH need to come along. |
| A-5 | `companies/Nexha/CLAUDE.md:474-501` RTMN Foundation Services | Lists integration points with CorpID (4702), MemoryOS (4703), GoalOS (4242), Decision Engine (4240), Agent Economy (4251). **None of these are actually wired in code.** The README implies integration that doesn't exist. |
| A-6 | `commerce-identity/README.md:236-238` "Out-of-Scope" | Lists rez-auth-service, treasury/payouts, document storage as handled by other services. But the actual code DOES JWT issuance internally. The "out-of-scope" claim contradicts the implementation. |

---

## 7. Implementation Plan

> **Ordering rationale:** Phase 1 is foundation (no deploy impact). Phase 2 is secret/credential cleanup (must happen before any external deploy). Phase 3 is security fixes (no behavior change for legitimate users). Phase 4 is functional bug fixes. Phase 5 is portal completion. Phase 6 is doc rewrite. Phase 7 is separate-repo extraction. Each phase ends with a verification step.

### Phase 1 — Repo hygiene & build cleanup
**Goal:** Lint, type-check, and build cleanly with committed output removed.

| Step | Action | Files |
|---|---|---|
| 1.1 | Add `.gitignore` for `dist/`, `.next/`, `node_modules/` at the directory root | new `companies/Nexha/.gitignore` |
| 1.2 | `git rm -r --cached commerce-identity/dist portal/.next` (preserves local files, untracks from git) | git index only |
| 1.3 | Verify `tsc --noEmit` passes for both services | terminal |
| 1.4 | Verify `npm run build` works for both services | terminal |
| 1.5 | Verify `portal` builds with `next build` and `tsc --noEmit` | terminal |
| 1.6 | Run `npm audit --omit=dev` and record vulnerabilities | terminal output saved to AUDIT-NOTES.md |
| **Verify** | Both services compile; build outputs not in git; audit report saved. |

### Phase 2 — Secret & env-file cleanup
**Goal:** No real secrets in git. `.env.example` is the source of truth for env structure.

| Step | Action | Files |
|---|---|---|
| 2.1 | `git rm --cached commerce-identity/.env portal/.env.local portal/.env.production.local` | git index |
| 2.2 | Add `.env`, `.env.local`, `.env.production.local` to `companies/Nexha/.gitignore` | `.gitignore` |
| 2.3 | Replace committed `.env` content with a comment block referencing `.env.example` and explaining what each operator must set | `commerce-identity/.env` |
| 2.4 | Audit `.env.example` files — verify they match what code actually reads (no missing vars, no unused vars) | both `.env.example` files |
| 2.5 | Rotate the JWT_SECRET and INTERNAL_API_KEY in any running Render deployment (assume they were published via `.env`) | Render dashboard |
| 2.6 | Document in DEPLOY.md that secrets must be rotated when extracting the repo | `DEPLOY.md` |
| **Verify** | `grep -r "JWT_SECRET\|INTERNAL_API_KEY" --include="*.env*" companies/Nexha/` shows only `.env.example` with placeholder values. |

### Phase 3 — Security fixes
**Goal:** All B-AUTH-*, S-* critical items resolved.

| Step | Action | Files | Fixes |
|---|---|---|---|
| 3.1 | Move role determination off corpId prefix; load role from DB or JWT payload | `auth.routes.ts:25`, `auth.service.ts` | B-AUTH-2 |
| 3.2 | Make `POST /api/corpid/issue` require `requireAuth('internal-key')` AND validate that the calling corpId is authorized to mint new corpIds | `corpid.routes.ts` | B-AUTH-1 |
| 3.3 | In `rating.routes.ts`, ignore `req.body.raterCorpId` and `req.body.raterRole`; always use JWT values | `rating.routes.ts` | B-AUTH-3 |
| 3.4 | In `supplier.routes.ts`, replace `x-corp-id` header check with JWT `req.corpId` comparison; require `requireAdmin` for full PII | `supplier.routes.ts` | B-AUTH-4 |
| 3.5 | In `buyer.routes.ts`, change `GET /api/buyers/:corpId` to `requireAuth('strict')` and check `req.corpId === :corpId \|\| req.role === 'admin'` | `buyer.routes.ts` | B-AUTH-5 |
| 3.6 | Remove fallback `JWT_SECRET` in `auth.service.ts:21`; throw on startup if unset | `auth.service.ts` | B-AUTH-6 |
| 3.7 | Add ownership/admin check to `POST /api/guest-suppliers/:guestId/convert` | `guest.routes.ts` | B-AUTH-8 |
| 3.8 | Tighten CORS: remove `https://*.vercel.app` wildcard; require explicit URL in `ALLOWED_ORIGINS` | `app.ts:18` | B-MISC-2 |
| 3.9 | Move JWT from `localStorage` to httpOnly cookie (set by backend on login, sent automatically) | `portal/lib/api.ts` + new `set-cookie` in auth.routes | S-4 |
| 3.10 | Add a request-rate-limiter middleware (express-rate-limit) — declared in CLAUDE.md but not actually wired | new `middleware/rate-limit.ts` | — |
| 3.11 | Hash stored OTP codes (bcrypt) instead of plaintext; update verify path to compare hashes | `guest-supplier.model.ts`, `guest-supplier.service.ts` | B-REG-7 |
| 3.12 | Hash bank account numbers at rest OR mark as "do not store" and require re-entry per session | `supplier.model.ts`, `supplier.service.ts` | S-6 |
| **Verify** | Re-read B-AUTH-* and S-* items; rerun audit. All 🔴 items resolved or documented as accepted risk. |

### Phase 4 — Functional bug fixes (backend)
**Goal:** Registration flow works end-to-end; SUTAR bridge is consistent.

| Step | Action | Files | Fixes |
|---|---|---|---|
| 4.1 | Add `POST /api/suppliers/public-register` that combines `corpid/issue` + supplier creation in one authenticated-with-internal-key call | new route | B-REG-4 |
| 4.2 | Add `POST /api/auth/register` that creates a corpId AND sets the initial password in one atomic call | new route in `auth.routes.ts` | B-REG-5 |
| 4.3 | Document the recommended public flow: `register` → `login` → use portal | new doc | — |
| 4.4 | In `reputation.service.ts`, replace direct `fetch` with `SutarBridgeService.pushReputation`; mark the direct fetch path as deprecated | `reputation.service.ts`, `sutar-bridge.service.ts` | B-SUT-2, B-SUT-5 |
| 4.5 | Unify the SUTAR URL defaults: if `SUTAR_BASE_URL` is set, derive all others from it; remove per-var `\|\| 'http://localhost:4702'` fallbacks | `sutar-bridge.service.ts:16-18` | B-SUT-1 |
| 4.6 | Fix `verifiedAt` inconsistency: when GSTIN checksum fails, also clear `verifiedAt` | `supplier.service.ts:73-89` | B-REG-6 |
| 4.7 | Switch OTP comparison to `crypto.timingSafeEqual` for consistency | `guest-supplier.service.ts:172` | B-REG-8 |
| 4.8 | Add `crypto.randomBytes` audit — confirm `id-generator.ts` uses `crypto.randomBytes`/`randomInt`, not `Math.random()` | `id-generator.ts` | — |
| **Verify** | `npm run build` passes; manual flow test: register → login → submit rating → check rating persists. |

### Phase 5 — Portal completion
**Goal:** 4 broken pages wired to real API calls; password-set during registration actually works.

| Step | Action | Files | Fixes |
|---|---|---|---|
| 5.1 | Add `confirmPassword` field to onboarding flow; on step 2 success, call `/api/auth/register` (from Phase 4) which sets the password atomically | `onboard-supplier/page.tsx`, `auth.routes.ts` | B-REG-1, B-REG-2 |
| 5.2 | Replace `lib/api.ts` localhost hardcode with `process.env.NEXT_PUBLIC_API_URL` everywhere | `portal/app/onboard-supplier/page.tsx:65` | B-REG-2 |
| 5.3 | Implement "Create RFQ" form + POST to `/api/rfqs` (requires new backend endpoint or documented stub) | `rfqs/page.tsx` | B-PORTAL-2 |
| 5.4 | Implement "Add Product" form + POST to `/api/products` (new backend endpoint) | `products/page.tsx` | B-PORTAL-1 |
| 5.5 | Implement "Submit Rating" form + POST to `/api/ratings` | `ratings/page.tsx` | B-PORTAL-3 |
| 5.6 | Wire `upgrade/page.tsx` to call `/api/guest-suppliers/:guestId/convert` | `upgrade/page.tsx` | B-PORTAL-4 |
| 5.7 | Replace hardcoded "API Status" mock with real health-check fetch from `/health` | `dashboard/page.tsx` | B-PORTAL-5 |
| 5.8 | Add error toasts for failed API calls (currently only the inline error state in forms) | `lib/api.ts` + toast component | — |
| **Verify** | Manual click-through: home → onboard-guest → onboard-supplier → dashboard → RFQs → ratings → upgrade → profile. Each shows real data. |

### Phase 6 — Documentation rewrite
**Goal:** All docs match the actual code (or vice versa). The L1 directory can be understood from its docs alone.

| Step | Action | Files | Fixes |
|---|---|---|---|
| 6.1 | Rewrite `companies/Nexha/CLAUDE.md` to describe ONLY what's in this directory (3 services + portal). Mark L2 services as "available in the full NeXha product, separate repo." | `CLAUDE.md` | DC-4, DC-5, DC-6, DC-7, A-1, A-3, A-5 |
| 6.2 | Reconcile versions: pick one (3.0.0 or 4.0.0) and use it everywhere | `CLAUDE.md`, `FEATURES-LIST.md` | DC-8 |
| 6.3 | Rewrite `commerce-identity/README.md` Authentication section to match actual JWT implementation; remove "header-based stand-in" claim | `commerce-identity/README.md` | DC-1, DC-2, DC-3 |
| 6.4 | Move "Out-of-Scope" section out of commerce-identity/README.md (or update it to reflect that JWT IS issued here) | `commerce-identity/README.md:236-238` | A-6, DC-9 |
| 6.5 | Add `SECURITY.md` documenting: (a) dev secrets must never reach prod, (b) OTP hashing, (c) bank details encryption at rest, (d) CORS policy | new `SECURITY.md` | S-5, S-6 |
| 6.6 | Add `RUNBOOK.md` with: (a) how to verify deployment health, (b) common errors and fixes, (c) how to rotate secrets, (d) backup/restore for MongoDB | new `RUNBOOK.md` | — |
| 6.7 | Update `FEATURES-LIST.md` to be a L1-only feature list (or split into L1-FEATURES.md and link to L2's full list) | `FEATURES-LIST.md` | DC-8 |
| **Verify** | A new dev can read `CLAUDE.md` + `RUNBOOK.md` and answer "what does this directory do?" correctly. |

### Phase 7 — Extract to separate GitHub repo
**Goal:** Local `companies/Nexha/` (L1 + L2 services that don't exist locally but will be merged) becomes `github.com/RTNM-Group/nexha`.

| Step | Action | Files |
|---|---|---|
| 7.1 | Create the new GitHub repo `RTNM-Group/nexha` (private or org-internal) | gh CLI |
| 7.2 | Move L1 from RTMN repo: `git mv companies/Nexha nexha` (in a worktree). | worktree |
| 7.3 | Copy L2 services from `companies/REZ-Workspace/companies/Nexha/` into the new local tree (Nexha is its own product; L2 is also its content). | shell copy |
| 7.4 | Reconcile package namespaces: pick `@nexha/*` or `@rez/nexha-*` for the merged tree (recommend `@nexha/*` for clarity in the new repo). | shell rename |
| 7.5 | Reconcile shared libs: L1 has 0 shared, L2 has 6. Move them all into a `packages/` workspace. | shell mv + workspace config |
| 7.6 | Write a top-level `README.md` for the new repo that supersedes L1's CLAUDE.md and L2's README. | new repo root |
| 7.7 | Set up CI/CD in the new repo (GitHub Actions matrix for all services). | new repo CI |
| 7.8 | Configure Render deploys to pull from the new repo. | Render dashboard |
| 7.9 | Update `industry-os/render.yaml` line 33 to keep pointing at the existing Render deployment URLs (no change to URLs — just the source repo changes). | `industry-os/render.yaml` |
| 7.10 | Update `companies/RisaCare/risa-care-dental-inventory-service/src/services/nexha-integration.js` if its `NEXHA_PROCUREMENT` env var changes. | as needed |
| 7.11 | Update root `CLAUDE.md` External Clients Policy to remove Nexha (per earlier user decision). | root `CLAUDE.md` |
| 7.12 | Update `STATUS-AND-REMAINING-WORK.md` to reflect that Nexha is now in its own repo. | `STATUS-AND-REMAINING-WORK.md` |
| 7.13 | Update `CANONICAL-PORT-REGISTRY.md` with a Nexha (RTMN-internal) section listing all 10 ports. | `CANONICAL-PORT-REGISTRY.md` |
| **Verify** | New repo builds and deploys independently. RTMN repo no longer contains `companies/Nexha/`. Industry OS and Risacare integrations continue to work. |

---

## 8. Estimated effort

| Phase | Effort | Risk if skipped |
|---|---|---|
| Phase 1 (hygiene) | 30 min | Bloated repo, slow clones, confusing for new contributors |
| Phase 2 (secrets) | 1 hour | Secrets in public repo when extracted; any Render deploy compromised |
| Phase 3 (security) | 4-6 hours | Production deploy with public auth bypass = data leak |
| Phase 4 (functional backend) | 3-4 hours | Registration is broken; users can't onboard |
| Phase 5 (portal) | 4-6 hours | Half the portal pages are stubs; product feels unfinished |
| Phase 6 (docs) | 2-3 hours | New contributors can't navigate; "is this real?" confusion |
| Phase 7 (extract) | 4-8 hours | Can't cleanly separate Nexha from RTMN monorepo |
| **Total** | **~20-30 hours** | — |

Most phases can run in parallel. Phases 3, 4, 5 are the highest-impact for "can we ship it?"

---

## 9. Quick-win checklist (if you want to ship in 24 hours)

The minimum viable path to "extracted, secure, functional":

- [ ] **Phase 2.1-2.3** (rotate secrets, remove `.env` from git) — 1 hour, mandatory
- [ ] **Phase 3.1-3.7** (close the auth bypasses) — 4 hours, mandatory
- [ ] **Phase 4.1-4.3** (registration flow works) — 2 hours, mandatory
- [ ] **Phase 5.1-5.2** (portal password-set works) — 1 hour, mandatory
- [ ] **Phase 6.1, 6.3** (rewrite CLAUDE.md + commerce-identity README.md to match reality) — 1.5 hours
- [ ] **Phase 7** (extract to separate repo) — 4 hours

That's ~14 hours of focused work for a clean, secure, functional, extracted, documented NeXha. The portal polish (Phase 5.3-5.7) and deeper doc rewrite (Phase 6.4-6.7) can wait for a follow-up.

---

## 10. Files referenced (audit read every one of these)

### commerce-identity (all source)
- `src/index.ts`, `src/app.ts`
- `src/config/database.ts`, `src/config/logger.ts`
- `src/middleware/auth.middleware.ts`, `src/middleware/error.middleware.ts`
- `src/models/supplier.model.ts`, `buyer.model.ts`, `guest-supplier.model.ts`, `rating.model.ts`
- `src/services/auth.service.ts`, `supplier.service.ts`, `buyer.service.ts`, `guest-supplier.service.ts`, `reputation.service.ts`, `sutar-bridge.service.ts`, `whatsapp.service.ts`
- `src/routes/auth.routes.ts`, `supplier.routes.ts`, `buyer.routes.ts`, `corpid.routes.ts`, `guest.routes.ts`, `rating.routes.ts`
- `src/utils/id-generator.ts`, `validators.ts`
- `package.json`, `tsconfig.json`, `Dockerfile`, `.env`, `.env.example`, `README.md`, `API.md`, `FEATURES.md`

### portal (all source)
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/page.module.css`
- `app/login/page.tsx`, `app/dashboard/page.tsx`, `app/onboard-guest/page.tsx`, `app/onboard-supplier/page.tsx`, `app/products/page.tsx`, `app/profile/page.tsx`, `app/ratings/page.tsx`, `app/rfqs/page.tsx`, `app/upgrade/page.tsx`
- `lib/api.ts`
- `next.config.ts`, `tsconfig.json`, `package.json`, `Dockerfile`, `vercel.json`, `eslint.config.mjs`
- `.env.local`, `.env.production.local`, `.gitignore`
- `.vercel/project.json`, `AGENTS.md`, `CLAUDE.md`, `README.md`

### sutar-mock (all source)
- `src/index.ts`, `package.json`, `tsconfig.json`, `Dockerfile`

### Top-level
- `CLAUDE.md`, `DEPLOY.md`, `FEATURES-LIST.md`, `ONBOARDING.md`
- `docker-compose.yml`, `render.yaml`, `Caddyfile`

### Related (for context, not in this directory)
- `companies/REZ-Workspace/companies/Nexha/` — L2 source of truth (procurement-os, distribution-os, etc.)
- `companies/RisaCare/.../nexha-integration.js` — RisaCare dental integration that consumes Nexha
- `industry-os/render.yaml:33` — Industry OS env wiring to `https://nexha.onrender.com`
- `services copy/unified-os-hub/src/routes/index.js` — Hub (no `/api/nexha/*` routes)
- Root `CLAUDE.md`, `STATUS-AND-REMAINING-WORK.md`, `CANONICAL-PORT-REGISTRY.md`

---

*Audit performed by reading every file under `/Users/rejaulkarim/Documents/RTMN/companies/Nexha/` on 2026-06-21. No files were modified.*
*See also: [NEXHA-AUDIT.md](NEXHA-AUDIT.md), [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md), [CANONICAL-PORT-REGISTRY.md](CANONICAL-PORT-REGISTRY.md)*
