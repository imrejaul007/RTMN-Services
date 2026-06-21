# Consolidated Security Audit Report — RTMN Identity Layer

**Date:** 2026-06-21
**Scope:** Four audits covering the RTMN identity, authentication, and authorization surface
**Auditor:** Claude (Opus 4.8) — independent source-code review

---

## TL;DR — Headline Scores

| Component | Score | Verdict | Critical | High | Total |
|---|---:|---|---:|---:|---:|
| **CorpID Cloud** (HOJAI AI) | **2.5 / 10** | 🔴 NOT PRODUCTION-READY | 17 | 16 | **82** |
| **HOJAI AI platform** (excl. CorpID) | **4.5 / 10** | 🟠 Systemic weaknesses | (see report) | (see report) | (see report) |
| **CorpPerks** | **4.5 / 10** | 🟠 4 critical remain | 7 | 10 | (see report) |
| **REZ Auth in RABTUL** | **4.5 / 10** | 🟠 Tale of two ecosystems | 5 | 9 | **43** |

**Aggregate posture: 🚨 4.0 / 10 — None of the four systems should be exposed to production traffic in their current state.** Every system has at least 5 critical issues; the CorpID Cloud I just built is the worst-scoring.

---

## 1. CorpID Cloud (in HOJAI AI) — Score: 2.5/10

**Path:** `companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/`
**Full report:** [`CORPID-AUDIT-REPORT-2026-06-21.md`](companies/HOJAI-AI/platform/identity/corpid-service/docs/CORPID-AUDIT-REPORT-2026-06-21.md)

### Top Critical Issues
| # | Issue | File |
|---|-------|------|
| C-1 | Hardcoded default JWT secret (`'corpID-cloud-secret-change-in-production'`) | `shared/middleware/auth.js:10` |
| C-2 | Hardcoded admin creds in README (`admin@rtmn.com` / `TempPass123!`) | `README.md:17-19` |
| C-3 | RBAC role lookup by **userId string prefix** (`if userId === 'admin' → superadmin`) | `RBAC/src/services/rbac.service.js:577-584` |
| C-4 | `allowSystemUpdate` flag in request body bypasses system-role lock | `RBAC/src/services/rbac.service.js:99-127` |
| C-5 | SSO callback trusts client-supplied `profile` (no IdP signature check) | `federation/src/routes/federation.routes.js:229-253` |
| C-6 | Refresh token not checked against revocation list — stolen tokens work for 7 days | `gateway.js:353-385` |
| C-7 | **Entire data layer is in-memory `Map`s** — all data lost on restart, no scaling, secrets in plaintext | All `*model.js` |
| C-8 | Audit log "immutability" claim is false — code mutates with `splice`/`shift` | `audit/src/models/audit.model.js:73-79, 268-272` |
| C-9 | IDOR on 15+ `GET /:id` endpoints — any authenticated user reads any other user's PII | `consumer`, `agent`, `federation`, `verification` routes |
| C-10 | Email verification **token returned in API response** — full email takeover | `verification/src/routes/verification.routes.js:48-59` |
| C-11 | Phone OTPs stored and returned in plaintext | `verification/src/models/verification.model.js:70-88` |
| C-12 | `requireAPIKey` middleware is a no-op | `shared/middleware/auth.js:246-267` |
| C-13 | Mass assignment via `...req.body` spread | Multiple route files |
| C-14 | RBAC wildcard permission `*` allows full escalation | `RBAC/src/models/rbac.model.js` |
| C-15 | Sensitive business data (taxId, registrationNumber) returned without ownership check | `verification/src/routes/verification.routes.js:265-274` |
| C-16 | Invitation accept can be bypassed | `organization/routes` |
| C-17 | CORS wildcard with credentials | `gateway.js` |

**Verdict:** The structure is correct (21 services, shared middleware, audit intent), but the security and persistence layers are not implemented. **Estimated remediation: 2-3 weeks for CRITICALs, 4-5 weeks total for production-grade.**

---

## 2. HOJAI AI Platform (excluding CorpID) — Score: 4.5/10

**Path:** `companies/HOJAI-AI/`
**Full report:** [`HOJAI-AI-AUDIT-REPORT-2026-06-21.md`](companies/HOJAI-AI/HOJAI-AI-AUDIT-REPORT-2026-06-21.md)

### Top Critical Issues
| # | Issue | File |
|---|-------|------|
| C-1 | **Secrets Manager has NO authentication** — `/api/secrets/:name/value` returns plaintext secrets to anyone | `platform/infra/secrets-manager/src/index.js:150-422` |
| C-2 | **SADA OS auth middleware only checks if `Authorization: Bearer …` header is present, never verifies signature** (TODO comment in code) | `platform/trust/sada-os/src/index.ts:64-81` |
| C-3 | **Salar OS same auth bypass** — TODO admits JWT verification not implemented | `platform/twins/salar-os/src/index.ts:71-88` |
| C-4 | CorpID trust score escalation: `PUT /api/trust/score/:corpId` requires only `requireAuth` (not role) | `platform/identity/corpid-service/src/index.js:1213-1301` |
| C-5 | **Shared hardcoded internal token `'hojai-internal-service-token-change-me'`** in 11+ services (Genie AgentOS, MemoryOS, GoalOS, FlowOS, CorpID, PolicyOS, SkillOS, TwinOS, Salar root, etc.) | Multiple |
| C-6 | Hardcoded bcrypt admin credentials in CorpID source | `platform/identity/corpid-service/src/index.js:76-86` |
| C-7 | **Unsalted SHA-256 password hashing** | `sutar-os/agents/agent-economy/src/index.js:127`, `shared/auth/routes.js:64` |
| C-8 | SUTAR Gateway, Genie Gateway have **zero authentication** | Gateway services |
| C-9 | Password hashes stored in plaintext JSON files via `shared/lib/persistent-store.js` | `shared/lib/persistent-store.js` |

### Systemic Issues
- **119+ services with wildcard CORS**
- **15+ services with hardcoded JWT fallback secrets**
- `shared/auth/index.js` uses **base64 encoding instead of real JWT signatures** (trivial forgery)

---

## 3. CorpPerks — Score: 4.5/10

**Path:** `companies/CorpPerks/`
**Full report:** *(in audit tool result — not yet saved to disk; primary report at the conclusion below)*

### Top Critical Issues
| # | Issue | File |
|---|-------|------|
| C-1 | **`workforce-intelligence` has NO authentication on any route** — `/api/workforce/high-risk` and `PATCH /exit-monitoring/clearance` publicly accessible | `workforce-intelligence/src/index.ts:100-470` |
| C-2 | **`onboarding-service` has NO authentication** | `onboarding-service/src/index.ts:47` |
| C-3 | **`REZ-merchant-corpperks-bridge` explicitly mounts public `/api/v1/benefits/employee/:employeeId` with comment "Public routes for People app"** | `REZ-merchant-corpperks-bridge/src/index.ts:118-119` |
| C-4 | `corp-crm-service` has no auth — relies on accidental 400s from missing `req.tenantId` | `corp-crm-service/src/middleware/auth.ts:13-21` |
| C-5 | **`@corpperks/shared` library exports non-existent symbols** — broken build | `shared/index.ts:70-77,85` |
| C-6 | `jwt.verify` without `algorithms` whitelist across `sso-service`, `corpid-profile-bridge`, `BIZORA/auth-service` (4 sites) | Multiple |
| C-7 | `rez-care-corpperks-bridge` calls upstream auth without `X-Internal-Token` header | `rez-care-corpperks-bridge/src/middleware/auth.ts:22` |

### Other Highs
- OAuth refresh tokens stored **unencrypted** in MongoDB
- `companyCheckMiddleware` trusts `x-company-id` header for tenancy (bypassable)
- Predictable `INTERNAL_SERVICE_TOKEN` fallback (`'dev-only-internal-token-do-not-use-in-prod'`) in 7+ services
- SSO service missing JWT `exp` validation
- 14+ BIZORA services still lack auth (incl. `people-os` exposing employee/payroll/leave/attendance)
- 2 committed `.env.production` files in git

### Strengths
- `@corpperks/shared` is well-designed (correct `requireAuth`, `requireTenant`, `secureCors`, `auditLog`)
- Most June 20 critical bugs are verified fixed in source

---

## 4. REZ Authentication in RABTUL — Score: 4.5/10

**Path:** `companies/RABTUL-Technologies/`
**Full report:** [`REZ-AUTH-AUDIT-REPORT-2026-06-21.md`](companies/RABTUL-Technologies/REZ-AUTH-AUDIT-REPORT-2026-06-21.md)

### Top Critical Issues
| # | Issue | File |
|---|-------|------|
| F-03 | **`REZ-unified-identity` ships an unauthenticated token-minting endpoint** — anyone can mint a valid JWT for any user | `REZ-unified-identity/src/index.ts:653-668` |
| F-01 | Hardcoded JWT secret fallbacks in merchant auth (`'your-jwt-secret-min-64-chars-for-merchants'` and `'your-refresh-secret-change-in-production'`) | `rez-merchant-auth-service/src/services/merchantAuth.ts:35, 37` |
| F-04/F-05 | `jwt.verify` called WITHOUT `algorithms` whitelist (alg-confusion / `alg: none` exposure) | `REZ-unified-identity/src/index.ts:692`, `rez-merchant-auth-service/src/services/merchantAuth.ts:421, 489, 581` |
| F-06 | **`'secret'` literal used as JWT secret** in SSO (3 sites); OTPs `console.log`'d; user store is in-process `Map` | `REZ-sso-service/src/sso.ts:69, 73, 250, 347` |
| F-09 | **`REZ-mfa-service` won't even start** — `app.listen` never called, server uninitialized at use site | `REZ-mfa-service/src/index.ts:100-153` |

### Strengths (rez-auth-service is the gold standard)
- Proper refresh token rotation
- Role-segregated JWT secrets
- Algorithms whitelist `['HS256']`
- IP allowlisting
- Timing-safe compares
- MFA support
- Audit logs

### What's broken around it
- 4 of 8 "auth-adjacent" services are scaffold-only, broken, or use `'secret'` as JWT secret
- Two services (`REZ-unified-identity`, `rez-merchant-auth-service`) are **ship-blockers**

---

## Cross-System Patterns

These systemic issues appear across multiple systems and indicate platform-wide patterns:

| Pattern | CorpID | HOJAI AI | CorpPerks | RABTUL Auth |
|---|:---:|:---:|:---:|:---:|
| Hardcoded JWT secret fallback | 🔴 | 🔴 | — | 🔴 |
| JWT verify without `algorithms` whitelist | — | — | 🔴 | 🔴 |
| Hardcoded admin credentials | 🔴 | 🔴 | — | — |
| Auth middleware that doesn't actually verify | — | 🔴 | — | — |
| Unauthenticated endpoints returning sensitive data | 🔴 | 🔴 | 🔴 | 🔴 |
| Predictable shared internal-service token | — | 🔴 | 🔴 | — |
| Wildcard CORS | 🔴 | 🔴 | 🟡 | 🟡 |
| In-memory data store for production | 🔴 | — | — | 🔴 |
| Plaintext password/secrets storage | 🔴 | 🔴 | 🟡 | 🟡 |
| No rate limiting on auth endpoints | 🟡 | 🟡 | 🟡 | 🟡 |

**The most alarming pattern:** Auth middleware that *looks correct* but **doesn't verify signatures** (HOJAI AI), or that **checks only header presence** (CorpID requires all-bearer header but trusts the prefix logic). This is worse than missing auth — it gives false confidence.

---

## Recommended Prioritized Fix Order (Aggregated)

### Week 1 — Stop the Bleeding
1. **Disable public token-minting endpoint** in `REZ-unified-identity` (1-line change — F-03)
2. **Remove hardcoded admin credentials** from CorpID and HOJAI AI source trees (rotate any leaked creds)
3. **Force-fail on missing `JWT_SECRET`** in CorpID, HOJAI AI, rez-merchant-auth-service
4. **Add `{ algorithms: ['HS256'] }`** to every `jwt.verify` and `{ algorithm: 'HS256' }` to every `jwt.sign` across all four systems
5. **Add real `requireAuth` middleware** to `workforce-intelligence`, `onboarding-service`, `corp-crm-service` (CorpPerks)
6. **Wire `authenticateInternalService` into `REZ-merchant-corpperks-bridge`** and remove public `/api/v1/...` aliases

### Week 2-3 — Fix Auth Core
7. **Implement real SSO callback** in CorpID (SAML XMLDSig, OIDC ID-token JWT, `state`/`nonce`)
8. **Replace string-prefix role lookup** in CorpID RBAC with persistent store
9. **Add JWT signature verification** to SADA OS and Salar OS in HOJAI AI
10. **Implement real API key validation** in CorpID `requireAPIKey` middleware
11. **Add ownership checks** to every `GET /:id` in CorpID (15+ routes)
12. **Fix `@corpperks/shared` broken exports**
13. **Encrypt OAuth refresh tokens at rest** in CorpPerks sso-service

### Week 3-5 — Persistence & Hardening
14. **Replace in-memory `Map`s** in CorpID with Postgres + Redis
15. **Implement proper audit log** (append-only, hash-chained, longer retention)
16. **Add timing-safe token comparison** everywhere
17. **Remove predictable shared internal-service tokens** in HOJAI AI and CorpPerks (use Vault/KMS)
18. **Hash OTPs and verification tokens** before storage
19. **Repair `REZ-mfa-service`** (it doesn't start)
20. **Reconcile the shared internal-service token across the ecosystem** (one token, in vault, rotated quarterly)

### Week 6+ — Compliance & Monitoring
21. Implement CSP, HSTS, Permissions-Policy consistently
22. Add distributed tracing and metrics endpoints
23. Implement graceful shutdown in all services
24. Add automated security tests (IDOR, JWT alg confusion, CORS)
25. Set up secrets scanning in CI (pre-commit + GitHub)

---

## Final Verdict

**No system should be deployed to production as-is.** The flagship CorpID Cloud I built scores 2.5/10 with 17 critical issues — including hardcoded secrets, trivial role-escalation, unauthenticated SSO callbacks, and a misleading "immutable audit log" claim. The surrounding HOJAI AI platform, CorpPerks, and RABTUL auth all share systemic problems: hardcoded JWT secrets, auth middleware that doesn't actually verify, and predictable shared tokens that turn "internal" auth into public auth.

The good news: most of these are **fixable with focused work**. The pattern across all four systems is consistent enough that **a single platform-wide auth library + secrets manager + middleware package could be extracted and applied everywhere**, raising the average score from 4.0 to 8+ within a sprint.

The bad news: until that work is done, **none of these should be exposed to any untrusted network** — including internal microservices that may be reachable from other RTMN services via misconfigured ingress.

---

*Report generated: 2026-06-21*
*Auditor: Claude (Opus 4.8)*
*Methodology: Independent source-code review with grep, glob, and per-file analysis*
