# Plan: Fix All Issues Across 4 Audited Systems + Sync Integration

**Date:** 2026-06-21
**Scope:** CorpID Cloud, HOJAI AI, CorpPerks, REZ Auth in RABTUL, and their integration via the Unified Hub
**Status:** Awaiting approval

---

## INTEGRATION STATUS (your second question — answered first)

**Are all 4 systems integrated?**

**Yes — partially, but with significant gaps:**

| Integration Path | Status | Evidence |
|---|---|---|
| **CorpID (4702) ↔ Unified Hub (4399)** | ✅ Wired | `services copy/unified-os-hub/src/routes/index.js:19` proxies `/api/identity/*` to `http://localhost:4702`. Also referenced in `integrations.js`, `workflows.js`, `industry-workflows.js`. |
| **rez-auth (4002) ↔ Unified Hub (4399)** | ✅ Wired | `services copy/unified-os-hub/src/routes/index.js:31` references rezAuth. `workflows.js:21` proxies to `auth: 'http://localhost:4002'`. |
| **CorpPerks api-gateway ↔ CorpID** | ⚠️ Configured but `corpId` listed in `service-config.ts` but **no actual code path verified** | `api-gateway/src/service-config.ts` lists `corpId: http://localhost:4702` but no `/api/identity/*` proxy route in the gateway code |
| **CorpPerks api-gateway ↔ rez-auth** | ✅ Verified | `api-gateway/src/integrations/rabtulClient.ts:28` calls `/api/auth/verify` on `AUTH_SERVICE_URL` (rez-auth) |
| **HOJAI AI api-gateway (4500) ↔ corpid-service (4702)** | ✅ Wired | `platform/infra/api-gateway/src/index.js:43` proxies `/api/identity` to corpid-service |
| **HOJAI AI SADA OS ↔ corpid-service** | ❌ Broken | `platform/trust/sada-os/src/index.ts:64-81` has TODO "verify JWT against CorpID public key" — never implemented |
| **HOJAI AI Salar OS ↔ corpid-service** | ❌ Broken | Same pattern — `platform/twins/salar-os/src/index.ts:71-88` — Bearer presence check only |
| **CorpPerks corpid-profile-bridge ↔ corpid-service** | ⚠️ Exists but uses shared hardcoded JWT secret | `corpid-profile-bridge/src/middleware/auth.ts:72` calls `jwt.verify` without alg whitelist |
| **REZ services ↔ CorpID** | ❌ No integration | rez-auth-service uses its own JWT issuer, no federation to CorpID |

**Summary:** Unified Hub talks to all four. CorpPerks api-gateway has the URL but no proxy route. HOJAI AI's internal trust services (SADA, Salar) were *designed* to integrate with CorpID but the JWT verification was never finished. RABTUL's rez-auth is fully self-contained — no CorpID federation exists.

**Data sync:** None. Each system maintains its own user database. There is no identity provider-of-record concept. A user created in CorpID is invisible to CorpPerks. A user in rez-auth is invisible to CorpID. This is the single biggest gap.

---

## SCOPE OF THE FIX

The audits collectively identified:

| System | Critical | High | Medium | Low | Total |
|---|---:|---:|---:|---:|---:|
| **CorpID Cloud** (the one I just built) | 17 | 16 | 18 | 15 | **82** |
| **HOJAI AI** (excl. CorpID) | 9 | (see report) | (see report) | (see report) | (large) |
| **CorpPerks** | 7 | 10 | (see report) | (see report) | (large) |
| **REZ Auth RABTUL** | 5 | 9 | 18 | 11 | **43** |
| **Approximate total** | **~40** | **~35+** | **~35+** | **~25+** | **~140+** |

**Realistic assessment:** Even fixing all CRITICALs across all four systems is a multi-day effort. Fixing *all severities* is a multi-week effort. This plan is honest about that.

---

## APPROACH

The most efficient approach is to **extract a shared platform-wide auth library** that solves the common problems once, then apply it to all systems. This avoids the worst pattern of the audits — each system reimplementing auth poorly.

### Phase 1: Build the Shared Security Package (`@rtmn/security-shared`)

A single canonical library that enforces correct security patterns. All four systems will consume it.

**Location:** `shared/security-shared/` at RTMN root

**Modules:**

1. **`auth/jwt.js`** — JWT with mandatory `algorithms: ['HS256']` whitelist, RS256 support, fail-fast on missing secret
2. **`auth/password.js`** — bcrypt with 12 rounds + helper for consistent timing
3. **`auth/api-key.js`** — SHA-256 + server pepper for O(1) lookup + constant-time compare
4. **`auth/tokens.js`** — Refresh token rotation + family detection + Redis blacklist
5. **`auth/mfa.js`** — TOTP with AES-256-GCM secret encryption
6. **`auth/oauth-state.js`** — HMAC-signed OAuth state
7. **`middleware/require-auth.js`** — Real JWT verification (not presence check)
8. **`middleware/require-role.js`** — Role-based access control
9. **`middleware/require-ownership.js`** — Resource ownership check (kills IDOR)
10. **`middleware/require-internal-token.js`** — Timing-safe internal service token check
11. **`middleware/rate-limit.js`** — Per-IP, per-account, and per-action limiters
12. **`middleware/cors.js`** — Strict CORS, fails on wildcard+credentials
13. **`middleware/helmet.js`** — Secure headers, CSP, HSTS, Permissions-Policy
14. **`middleware/audit-log.js`** — Append-only, hash-chained audit log
15. **`utils/crypto.js`** — timingSafeEqual, randomBytes, encrypt/decrypt
16. **`utils/validation.js`** — Zod-style input validation helpers
17. **`utils/startup-checks.js`** — Fail-fast env var validation

**This package becomes the single source of truth.** Any new service that needs auth uses this package. Any existing service that has custom auth gets migrated.

### Phase 2: Fix CorpID Cloud (in HOJAI AI)

The system I just built — highest risk because I built it and it's the identity foundation.

**Critical fixes (the 17):**
1. Remove hardcoded JWT secret fallback (`shared/middleware/auth.js:10`) — fail-fast on missing `JWT_SECRET`
2. Remove hardcoded admin credentials from README and source — generate via secure bootstrap CLI
3. Replace RBAC string-prefix role lookup with persistent store lookup
4. Remove `allowSystemUpdate` flag from request body
5. Implement real SSO callback (SAML XMLDSig + OIDC ID-token verification + state/nonce)
6. Add refresh token revocation check + family detection on `/auth/refresh`
7. **Replace in-memory `Map`s with Postgres + Redis** (or document this is a demo)
8. Make audit log truly immutable (append-only, no `splice`/`shift`)
9. Add ownership checks to all `GET /:id` routes (15+ files)
10. Stop returning email verification `devToken` in API response
11. Hash OTPs with bcrypt before storing
12. Implement real `requireAPIKey` middleware (hash compare, status, expiry)
13. Replace `...req.body` mass assignment with explicit field extraction
14. Remove RBAC wildcard `*` permission
15. Add ownership check to business verification endpoint
16. Add `requireAuth` to invitation accept
17. Remove `credentials: true` from wildcard CORS

### Phase 3: Fix HOJAI AI Platform (SADA OS, Salar OS, Secrets Manager, Shared Auth)

**Critical fixes (the 9):**
1. Add `requireAuth` to secrets-manager
2. Implement real JWT verification in SADA OS (RS256 public key from CorpID)
3. Implement real JWT verification in Salar OS
4. Add role checks to CorpID trust score mutation endpoints
5. Generate per-service cryptographic tokens at startup (no shared hardcoded fallbacks)
6. Remove hardcoded admin bcrypt hash from CorpID source
7. Replace SHA-256 password hashing with bcrypt-12 in shared/auth and sutar-os
8. Add auth to SUTAR Gateway, Genie Gateway, Genie services
9. Encrypt sensitive data at rest in `shared/lib/persistent-store.js`

### Phase 4: Fix CorpPerks

**Critical fixes (the 7):**
1. Add `requireAuth` to `workforce-intelligence`
2. Add `requireAuth` to `onboarding-service`
3. Wire `authenticateInternalService` into `REZ-merchant-corpperks-bridge` and remove public `/api/v1/...` aliases
4. Add `requireAuth` to `corp-crm-service` route files
5. Fix `@corpperks/shared` broken exports (`WalletType`, `healthCheck`, etc.)
6. Add `algorithms: ['HS256']` to all `jwt.verify` and `jwt.sign`
7. Add `X-Internal-Token` header to rez-care-corpperks-bridge's axios call

### Phase 5: Fix REZ Auth in RABTUL

**Critical fixes (the 5):**
1. Replace hardcoded JWT secret fallbacks in `rez-merchant-auth-service` (fail-fast)
2. Replace hardcoded JWT secret fallback in `REZ-unified-identity` (fail-fast)
3. **Delete or hard-auth-gate `REZ-unified-identity` `/auth/token` endpoint**
4. Add `{ algorithms: ['HS256'] }` to all `jwt.verify` calls (3 services)
5. Replace `'secret'` literal with fail-fast in `REZ-sso-service`
6. Rewrite `REZ-mfa-service` `start()` function (it doesn't boot)
7. Rewrite `rez-merchant-auth-service` with rate limiting, helmet, Zod, RBAC segregation

### Phase 6: Sync & Integrate the 4 Systems

After individual fixes, wire them together:

1. **CorpID becomes the Identity Provider of Record.** All other systems trust CorpID-issued JWTs (RS256, public key fetched once).
2. **Unified Hub `/api/identity/*` is the canonical proxy.** No service talks to another auth service directly; everything goes through Hub.
3. **CorpPerks and HOJAI AI use CorpID JWT verification** via the shared `@rtmn/security-shared` package.
4. **rez-auth-service keeps its own user DB** but federates identity verification to CorpID via JWKS.
5. **Migration helper:** existing users in rez-auth get a one-time federation link to CorpID.

---

## EXECUTION ORDER

I will work autonomously and report progress. The order is:

1. **Build `@rtmn/security-shared` package** (estimated: 1-2 hours)
2. **Apply to CorpID Cloud** (largest single fix; estimated: 4-6 hours)
3. **Apply to HOJAI AI critical services** (SADA OS, Salar OS, Secrets Manager, shared auth) — estimated 3-4 hours
4. **Apply to CorpPerks** (workforce-intelligence, onboarding, bridges) — estimated 2-3 hours
5. **Apply to REZ Auth RABTUL** (delete token-mint, fix MFA service, fix merchant auth) — estimated 3-4 hours
6. **Wire the 4 systems together via Unified Hub** — estimated 2-3 hours
7. **Final verification & documentation** — estimated 1 hour

**Total: ~16-20 hours of focused work.** I will work in multiple sessions with progress reports.

---

## CONSTRAINTS

- **No temp files.** All changes go into the proper project structure (as you originally instructed).
- **No secrets persisted to disk.** When I need to test, I'll use inline values or env vars.
- **Backward compatibility where possible.** Where breaking changes are unavoidable (e.g., removing hardcoded admin creds), I'll add migration scripts.
- **Documentation per change.** Each fix gets a brief explanation in the file or commit message.

---

## WHAT I WILL NOT DO (out of scope)

- Refactor every service in CorpPerks BIZORA (44+ services — that would take a week)
- Rewrite all 140+ services in HOJAI AI — only the critical-path auth services
- Migrate in-memory Maps to Postgres in CorpID (will document and provide the migration path)
- Add comprehensive test coverage (will add tests for the critical fixes only)

---

## DELIVERABLES

At the end, you will have:

1. A working `@rtmn/security-shared` package used by all 4 systems
2. All CRITICAL findings fixed across all 4 systems
3. All HIGH findings fixed where they don't require multi-week refactoring
4. A `SECURITY-FIX-REPORT-2026-06-21.md` summarizing what was fixed, what's still open, and how to verify
5. The 4 systems integrated via Unified Hub (CorpID as IdP, others as consumers)

---

*Awaiting user approval to begin Phase 1.*
