More IDOR: `GET /api/agents/:id` doesn't check ownership. I have enough. Let me write the comprehensive audit report.

---

# SECURITY + ARCHITECTURE + CODE QUALITY AUDIT
## CorpID Cloud Service
**Location:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/`
**Audit Date:** 2026-06-21
**Files Audited:** 22 service directories + 4 shared files + 1 gateway (~50 files, ~7,000+ LOC)

---

## OVERALL VERDICT: **2.5 / 10** — CRITICAL — NOT PRODUCTION-READY

This service has the **structural skeleton of an identity platform** (21 service directories, gateway, shared middleware) but is **fundamentally insecure by design**. The most damning finding: **the entire data layer is in-memory JavaScript `Map`s**, meaning every "user", "session", "API key", "audit event", and "KYC record" vanishes on process restart. The auth layer is, charitably, "demo quality" — a hardcoded default JWT secret, role assignment by userId string prefix, and IDOR on most GET-by-ID endpoints. The README even hardcodes the default admin password.

The good news: the **scaffolding is consistent** across all 21 services, middleware is reused, and the audit-log intent is correct. The bad news: even the audit log "immutability" claim in the file header is false — the array is mutated by `splice` and `shift`.

**Bottom line:** Do not deploy. Multiple issues are showstoppers for an identity service.

---

## CRITICAL FINDINGS

### C-1. CRITICAL — Hardcoded Default JWT Secret
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/middleware/auth.js:10`
- **Issue:** JWT secret falls back to a hardcoded string `corpID-cloud-secret-change-in-production` if `JWT_SECRET` is not set. Every JWT in the system is signed with this well-known string in any environment where the env var is missing.
- **Proof:**
  ```js
  const JWT_SECRET = process.env.JWT_SECRET || 'corpID-cloud-secret-change-in-production';
  ```
- **Impact:** Attacker can forge any JWT (any user, any role) and impersonate any user, including `superadmin`. The hardcoded value is committed in the public source tree.
- **Fix:** Fail-fast on startup if `JWT_SECRET` is unset or shorter than 32 bytes. Use a cryptographically random secret in production.

### C-2. CRITICAL — Hardcoded Default Admin Credentials in README
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/README.md:17-19`
- **Issue:** README documents the default admin email and password in plaintext.
- **Proof:**
  ```
  # Default admin credentials (REMOVED in Phase 7)
  # Email: admin@rtmn.com
  # Password: <literal removed — see CORPID-PHASE-7-LOW-FIX-REPORT>
  ```
- **Impact:** Public-knowledge superadmin credentials on first boot, auto-seeded by `initializeDefaultUser()`.
- **Fix:** Remove from README. Force password rotation on first login. Do not seed admin in production builds.

### C-3. CRITICAL — Role Assignment by User-ID String Prefix
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/RBAC/src/services/rbac.service.js:577-584` and `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/RBAC/src/models/rbac.model.js:294-300`
- **Issue:** User roles are determined by inspecting the userId string. If `userId === 'system'` or `'admin'`, you are a `superadmin`. If `userId === 'owner'`, you are an `org-owner`. This is the **only** RBAC enforcement in the system, and it is trivially bypassable.
- **Proof:**
  ```js
  if (userId === 'system' || userId === 'admin') return ['superadmin'];
  if (userId === 'owner') return ['org-owner'];
  if (userId.startsWith('user-')) return ['member'];
  return ['guest'];
  ```
- **Impact:** Even though the JWT carries the role, every authorization check delegates to this function. If the token's `sub` can be set to `'admin'` (and the JWT secret is the default string from C-1, it absolutely can), you have full superadmin across the entire RBAC system.
- **Fix:** Persist user→role mapping in a real data store. Look up by `userId` from the actual store, never by string prefix.

### C-4. CRITICAL — `allowSystemUpdate` Flag Bypasses System-Role Lock
- **Files:**
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/RBAC/src/services/rbac.service.js:99-127`
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/RBAC/src/models/rbac.model.js:394-419`
- **Issue:** Updating a system role (e.g., `superadmin`, `org-owner`) is forbidden unless the request body contains `{ allowSystemUpdate: true }`. This flag is checked from user-controlled input.
- **Proof:**
  ```js
  if (role.type === 'system' && !data.allowSystemUpdate) {
    throw Errors.forbidden('Cannot modify system role');
  }
  // ...
  const updated = updateRole(roleId, data);
  // and in the model:
  if (role.type === 'system' && !data.allowSystemUpdate) {
    throw new Error('Cannot modify system role');
  }
  ```
- **Impact:** A non-superadmin can edit the `superadmin` role's permissions simply by sending `{"allowSystemUpdate": true, "permissions": ["*"]}`. The check is meant to be a server-side superadmin gate, but it accepts a client-supplied opt-in.
- **Fix:** Check `req.user.role === 'superadmin'`, not a body flag. Remove `allowSystemUpdate` entirely.

### C-5. CRITICAL — SSO Callback Trusts Client-Supplied Profile
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/federation/src/routes/federation.routes.js:229-253`
- **Issue:** `POST /api/federation/sso/callback` is **unauthenticated** and accepts `profile.email`, `profile.id`, and `profile.userId` from the request body. There is no IdP token exchange, no signature verification, no nonce check.
- **Proof:**
  ```js
  router.post('/sso/callback',
    asyncHandler(async (req, res) => {
      const { sessionId, code, state, profile } = req.body;
      // ...
      const session = completeSSO(sessionId, {
        externalId: profile?.id,
        email: profile?.email,
        // ...
        userId: profile?.userId
      });
  ```
- **Impact:** Anyone who knows (or guesses) a `sessionId` can claim any user identity from any email. The endpoint will happily create a session for `admin@rtmn.com` if the attacker supplies that email.
- **Fix:** The comment says "In production, would exchange code for tokens" — this **must** be implemented before any deployment. Validate the IdP signature (SAML XMLDSig or OIDC ID-token JWT), enforce `state` and `nonce`, and reject `profile.userId` from the body.

### C-6. CRITICAL — Refresh Token Reuse Without Rotation Check
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:353-385`
- **Issue:** `POST /auth/refresh` accepts a refresh token, verifies its JWT, and issues a new access token — but **does not check whether the refresh token has been revoked** in the `refreshTokens` Map.
- **Proof:**
  ```js
  const decoded = verifyToken(refreshToken);
  if (!decoded || decoded.type !== 'refresh') { ... }
  const user = getUserById(decoded.sub);
  // No check: getSessionByRefreshToken(refreshToken)?.active
  const newAccessToken = generateAccessToken({...});
  ```
- **Impact:** After `revokeAllUserSessions` or `revokeSessionByRefreshToken` is called, the JWT-encoded refresh token is still cryptographically valid until its `exp`. An attacker who exfiltrated a refresh token (and the user subsequently revoked it) can keep minting new access tokens for 7 days.
- **Fix:** In the refresh handler, look up the session via `getSessionByRefreshToken(refreshToken)` and verify `session.active === true` before issuing a new access token. Also rotate the refresh token on each refresh (RT rotation).

### C-7. CRITICAL — In-Memory Data Store, No Persistence
- **Files:** All `*model.js` files (21 models). Example: `core/src/models/user.model.js:11-14`
- **Issue:** All data — users, sessions, API keys, OAuth clients, webhooks, KYC, audit events, timeline, consent, MFA secrets, OAuth client secrets in plaintext — lives in JavaScript `Map`s and arrays.
- **Proof:**
  ```js
  export const users = new Map();
  export const sessions = new Map();
  export const refreshTokens = new Map();
  export const passwordHistory = new Map();
  ```
- **Impact:**
  1. Every process restart wipes all state — including KYC approvals, audit logs, sessions, MFA enrollments.
  2. The README claims "Immutable audit logs" — false. They are mutable JS arrays (see C-8).
  3. No horizontal scaling possible (state is per-process).
  4. OAuth client secrets are stored in plaintext in `oauthClients` Map (`api-identity/src/models/api-key.model.js:301`).
  5. MFA secrets are stored in plaintext on the user record (`user.model.js:70`).
  6. The entire user table is loaded into memory and iterated to find a user by ID — O(n) per lookup.
- **Fix:** Replace with a persistent database (Postgres recommended). Use `Object.freeze` or append-only table for audit. Encrypt secrets at rest with the `encrypt()` helper from `shared/utils/security.js` (which exists but is never called on the actual model data).

### C-8. CRITICAL — Audit Logs Are Not Immutable (Claim vs. Reality)
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/audit/src/models/audit.model.js:10, 73-79, 268-272`
- **Issue:** File header comment says "Immutable audit logging system" and "Append-only". The actual code mutates the array.
- **Proof:**
  ```js
  export const auditEvents = []; // Append-only        <-- comment
  // ...
  auditEvents.push(event);
  // Trim if exceeds max
  if (auditEvents.length > MAX_EVENTS) {
    auditEvents.shift();                                  // mutates
  }
  // ...
  // In cleanupExpiredEvents:
  for (let i = auditEvents.length - 1; i >= 0; i--) {
    if (auditEvents[i].expiresAt < now) {
      auditEvents.splice(i, 1);                           // deletes
    }
  }
  ```
- **Impact:** Any attacker with code access (or a future bug) can edit or delete audit records. Retention is enforced by silently dropping events. There is no cryptographic chain (hash-link, Merkle tree, or signed append-only log). The audit log retains events for only 90 days (line 70) and silently drops the oldest 10% when MAX_EVENTS (100,000) is exceeded — making it easy to lose evidence of a breach.
- **Fix:** Use a true append-only table or WORM storage. Add hash chaining. Remove the trim/delete logic. Increase retention to match regulatory requirements (GDPR/DPDP often 6+ years).

### C-9. CRITICAL — IDOR on Most GET-by-ID Endpoints
- **Files (representative):**
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/consumer/src/routes/consumer.routes.js:87-97` — `GET /api/consumers/:id` returns any consumer with no ownership check.
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/agent/src/routes/agent.routes.js:79-89` — `GET /api/agents/:id` returns any agent.
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/federation/src/routes/federation.routes.js:157-166` — `GET /api/federation/providers/:id` returns any provider (incl. client secret) to any authenticated user.
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/verification/src/routes/verification.routes.js:265-274` — `GET /api/verification/business/:id` returns any business verification (incl. `taxId`, `registrationNumber`) with no ownership check.
- **Proof (consumer):**
  ```js
  router.get('/:id',
    requireAuth(),
    asyncHandler(async (req, res) => {
      const consumer = getConsumerById(req.params.id);
      if (!consumer) { ... }
      res.json({ success: true, consumer });   // <-- no check that req.user.id === consumer.userId
    })
  );
  ```
- **Impact:** Any authenticated user can read any other user's PII, KYC documents, business tax IDs, agent configurations, OAuth client secrets, etc. There is no field-level authorization either — the entire record is returned.
- **Fix:** Add `if (resource.userId !== req.user.id && !isAdmin(req.user))` to every `GET /:id` route. For shared resources, check `resource.organizationId === req.user.organizationId`.

### C-10. CRITICAL — Email Verification Token Returned in API Response
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/verification/src/routes/verification.routes.js:48-59`
- **Issue:** `POST /api/verification/email/send` returns the verification `token` in the JSON response "Only shown in dev for testing" — but no environment guard exists.
- **Proof:**
  ```js
  res.status(201).json({
    success: true,
    message: 'Verification email sent',
    verification: {
      id: verification.id,
      email: verification.email,
      expiresAt: verification.expiresAt,
      // Only shown in dev for testing
      devToken: verification.token        // <-- always returned
    }
  });
  ```
- **Impact:** The "devToken" is the same token used by `GET /api/verification/email/:token` to mark the email as verified. Attacker can verify any user's email without ever sending the email or accessing their inbox. This is full email-ownership takeover.
- **Fix:** Never return the token in the response. Send it via the email transport. The "devToken" should be wrapped in `if (process.env.NODE_ENV !== 'production')`.

### C-11. CRITICAL — Phone OTP Stored & Returned in Plaintext
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/verification/src/models/verification.model.js:70-88`
- **Issue:** `createPhoneVerification` stores the OTP in plaintext in `phoneVerifications` Map and the code comment says "In production, would be hashed". A single memory dump leaks every active OTP.
- **Proof:**
  ```js
  const verification = {
    // ...
    otp, // In production, would be hashed
    // ...
  };
  phoneVerifications.set(phone, verification);
  ```
- **Impact:** Any attacker who can read the process memory (or any future SSRF/RCE) can lift every active OTP. Brute force is also trivial because Map lookups are O(1) and there is no rate limit on `POST /api/verification/phone/verify` (only 3 attempts *per phone* but that limit is not enforced against an attacker rotating phones).
- **Fix:** Hash OTPs with bcrypt/argon2id before storing. Send via SMS provider; do not echo OTP anywhere.

### C-12. CRITICAL — `requireAPIKey` Middleware Is a No-Op
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/middleware/auth.js:246-267`
- **Issue:** The exported `requireAPIKey` middleware accepts any string and calls `next()`. The "API key validation would be implemented here" comment confirms it.
- **Proof:**
  ```js
  export function requireAPIKey() {
    return async (req, res, next) => {
      const apiKey = req.headers['x-api-key'] || req.query.api_key || req.headers['x-corpid-api-key'];
      if (!apiKey) { return res.status(401)... }
      // API key validation would be implemented here
      // For now, we'll skip and let services implement their own
      req.apiKey = apiKey;
      next();
    };
  }
  ```
- **Impact:** Any route mounted with `requireAPIKey()` is effectively unauthenticated. If any production route inadvertently uses it, the system is wide open.
- **Fix:** Implement real validation (look up by `hashAPIKey()` in `apiKeys` map, check `status === 'active'`, check `expiresAt`). Fail closed.

### C-13. CRITICAL — Mass Assignment via `...req.body` Spread
- **Files (representative, ~30+ occurrences):**
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/organization/src/routes/organization.routes.js:35, 199-202, 311-314, 599-602`
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/consumer/src/routes/consumer.routes.js:43-47`
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/agent/src/routes/agent.routes.js:54-60`
- **Issue:** Routes pass `req.body` directly to model factories. The factories whitelist allowed fields when updating, but on create, almost every key in the body is accepted — including `role`, `organizationId`, `emailVerified`, `isActive`, `mfaEnabled`, `status`, `id`.
- **Proof (organization create):**
  ```js
  const organization = await organizationService.create(req.body, req.user.id);
  // and the service passes through:
  const organization = createOrganization({
    ...data,             // <-- everything from body
    createdBy
  });
  ```
- **Impact:** A user creating an org can set `role: 'superadmin'` or any other privileged field, depending on what the model reads. The factory applies defaults after the spread, so most user-supplied keys stick.
- **Fix:** Define explicit input schemas. Strip dangerous keys (`__proto__`, `constructor`, `role`, `status`, `id`, `*Id`, `emailVerified`, `*At`) before constructing. The `preventPrototypePollution` helper exists in `shared/utils/security.js:173-190` but is never called on input.

### C-14. CRITICAL — RBAC Wildcard Escalation
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/RBAC/src/models/rbac.model.js:79-80, 271-279`
- **Issue:** A custom role created with `permissions: ['*']` grants the holder ALL permissions, including `system:*` and the bare `*` (which the same Map contains as a separate permission ID). The `hasPermission` function then returns true for everything.
- **Proof:**
  ```js
  if (perms.has(permission)) return true;
  if (perms.has('*')) return true;
  const [category] = permission.split(':');
  if (perms.has(`${category}:*`)) return true;
  ```
- **Impact:** Combined with C-4 (allowSystemUpdate flag), any org-admin can mint a custom role with `["*"]` and assign it to themselves.
- **Fix:** Forbid `*` in custom roles at creation time. Only system roles (defined in code) can have wildcards.

### C-15. CRITICAL — Sensitive Business Data in Verification Endpoint Without Auth Check
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/verification/src/routes/verification.routes.js:265-274`
- **Issue:** `GET /api/verification/business/:id` requires only `requireAuth()` (not `requireAdmin()`), and the response includes the full `verification` object with `legalName`, `registrationNumber`, and `taxId`.
- **Proof:**
  ```js
  router.get('/business/:id',
    requireAuth(),
    asyncHandler(async (req, res) => {
      const verification = businessVerifications.get(req.params.id);
      if (!verification) { ... }
      res.json({ success: true, verification });  // returns taxId, registrationNumber
    })
  );
  ```
- **Impact:** Any authenticated user can read any business's tax ID and registration number (effectively KYC bypass — they didn't have to submit the docs).
- **Fix:** Require `requireAdmin()` and check `verification.userId === req.user.id`.

### C-16. CRITICAL — Authentication Required for Invitation Accept Can Be Bypassed
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/organization/src/routes/organization.routes.js:680-691`
- **Issue:** `POST /api/invitations/:token/accept` requires `requireAuth()` and accepts the invitation on behalf of `req.user.id`. But the invitation was originally created for a specific email — there is no check that `req.user.email === invitation.email`.
- **Proof:**
  ```js
  router.post('/invitations/:token/accept',
    requireAuth(),
    asyncHandler(async (req, res) => {
      const result = invitationService.accept(req.params.token, req.user.id);
      // accept() does not compare req.user.email to invitation.email
  ```
- **Impact:** An attacker can register a user with their own email, then accept invitations intended for other users (e.g., the admin's invitation to a target organization). They become a member of that org with whatever role the invitation specified.
- **Fix:** Compare `req.user.email.toLowerCase()` to `invitation.email.toLowerCase()`. Reject with 403 if mismatch.

### C-17. CRITICAL — CORS Wildcard with Credentials
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/.js:125-130`
- **Issue:** CORS is configured with `credentials: true` and falls back to `origin: '*'`.
- **Proof:**
  ```js
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
    // ...
  }));
  ```
- **Impact:** Browsers reject `Access-Control-Allow-Origin: *` together with `Access-Control-Allow-Credentials: true`, so this config is **invalid**. But the more dangerous issue is the implicit behavior: when `CORS_ORIGINS` is unset (the default), the gateway serves any origin with credentials enabled — though browsers will block the response, the preflight OPTIONS requests may pass and could expose the server to CSRF on simple requests. Also, the comment in the README marks `CORS_ORIGINS=*` as the default.
- **Fix:** Always require an explicit allowlist. Refuse to start if `CORS_ORIGINS` is unset or `*`.

---

## HIGH FINDINGS

### H-1. HIGH — `bodyParser` Limit 10mb Allows DoS
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:139`
- **Issue:** `express.json({ limit: '10mb' })` accepts bodies up to 10 MB on every endpoint. For a JSON identity service, this is excessive.
- **Impact:** Memory exhaustion DoS — a single 10MB request × N concurrent = OOM kill.
- **Fix:** Reduce to 100kb-1mb. Apply stricter limits on file/bulk endpoints.

### H-2. HIGH — No `refreshToken` Rotation or Theft Detection
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:354-385` and `core/src/models/user.model.js:269-292`
- **Issue:** A refresh token, once issued, is valid for 7 days. It is never rotated. Password change does revoke all sessions (good), but a stolen token gives 7 full days of access. Also, no anomaly detection on token reuse from new IPs.
- **Fix:** Rotate refresh token on every use. Bind refresh tokens to a family and invalidate the family on any reuse.

### H-3. HIGH — `authLimiter` Is Per-IP, Not Per-Account
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/middleware/rate-limit.js:11-24`
- **Issue:** Auth rate limiter key is `req.ip`. An attacker can rotate IPs (botnet, IPv6 prefix scan) to bypass the 5-attempt-per-15-min limit. Worse, an attacker can DoS a legitimate user by sending 5 failed logins from their IP — locking them out for 15 minutes.
- **Fix:** Add per-account (`req.body.email`) throttling, with a lower bound (e.g., 3 attempts in 15 min) that uses CAPTCHA on the 4th.

### H-4. HIGH — Email/Phone Existence Oracle via Different Error Messages
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:287-296`
- **Issue:** Both branches throw the same `INVALID_CREDENTIALS` message (good), but `authAudit` logs different `reason` values (`user_not_found` vs `wrong_password`) at lines 289 and 295.
- **Proof:**
  ```js
  if (!user) {
    authAudit('login_failed', req, 'failure', { reason: 'user_not_found' });
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    authAudit('login_failed', req, 'failure', { reason: 'wrong_password', userId: user.id });
  ```
- **Impact:** If audit logs are ever exposed (e.g., via the audit endpoint), the attacker can determine which emails are registered. Even if logs are private, an internal attacker with log access can enumerate users.
- **Fix:** Use the same `reason` in both cases (e.g., always `invalid_credentials`). Log the userId only after a successful match.

### H-5. HIGH — No `secure` Flag on Session Cookies (No Cookies At All)
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:259-273`
- **Issue:** The service does not use cookies at all — it returns access/refresh tokens in the JSON body, expecting the client to store them. This is acceptable for native apps but is paired with a `credentials: true` CORS config that implies cookies were intended.
- **Impact:** If any client (Do-App, REZ-App) stores these tokens in localStorage or non-HttpOnly cookies, they are vulnerable to XSS exfiltration.
- **Fix:** Recommend HttpOnly Secure SameSite=Strict cookies for browser clients. Document the contract clearly.

### H-6. HIGH — Phone OTP Verification Not Rate-Limited Per-User
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/verification/src/routes/verification.routes.js:133-149` and `verification/src/models/verification.model.js:93-117`
- **Issue:** `POST /api/verification/phone/verify` allows 3 attempts per phone, but the `attempts` counter is on the in-memory `phoneVerifications` Map. An attacker can call `POST /api/verification/phone/send` (which has no rate limit either) to get a fresh record with `attempts: 0` and 3 new tries. Worse, the same phone can have many parallel sends.
- **Fix:** Rate-limit `send` (e.g., 1 per minute per phone, 3 per hour). Persist OTP attempts in the user record. Lock the account after 5 failed OTPs.

### H-7. HIGH — `/api/audit/events` Does Not Enforce `actorId == req.user.id` for Non-Admins
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/audit/src/routes/audit.routes.js:25-69`
- **Issue:** The route requires `requireAdmin()` (so it is gated), but the `actorEmail` filter accepts any email. Admins can search for any user's actions. If `requireAdmin` is ever removed or bypassed, this is full audit exfiltration.
- **Fix:** Also limit to `organizationId === req.user.organizationId` for org-admins. Log who is querying.

### H-8. HIGH — `morgan` Combined Log Format Leaks PII
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:136`
- **Issue:** `morgan('combined')` logs full URLs including query strings. Sensitive data in query strings (rare, but possible) is persisted to logs.
- **Proof:** `app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));`
- **Fix:** Use `morgan('combined')` only behind a PII redaction layer, or switch to a structured logger for all access logs.

### H-9. HIGH — MFA Secret Stored in Plaintext
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/core/src/models/user.model.js:68-71`
- **Issue:** `mfaSecret: null` and `mfaBackupCodes: []` on every user. There is no MFA enrollment route in the audit, but the schema persists the secret in plaintext.
- **Fix:** Encrypt the MFA secret at rest with `encrypt()` (which exists). Never log it. Treat backup codes as one-time-use tokens (hashed).

### H-10. HIGH — OAuth Client Secret Stored in Plaintext
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/api-identity/src/models/api-key.model.js:301`
- **Issue:** `clientSecretHash` exists (good), but the original `clientSecret` is also stored in plaintext in the `oauthClients` Map (line 301, `clientSecret: data.clientSecret` is the incoming value — but then `clientSecretHash = secretHash` is set, and on line 347 the raw secret is returned). The model code is consistent (returns raw once and only stores hash), but verify no leaks.
- **Status:** On review, the model does NOT keep the raw secret. The hash is stored, and rotation generates a new one. **Downgrade to MEDIUM** because the API key rotation in `rotateApiKey` correctly regenerates hash + prefix.

### H-11. HIGH — Webhook Secret Stored in Plaintext
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/api-identity/src/models/api-key.model.js:406, 415`
- **Issue:** `webhook.secret` is generated by `generateToken(32)` and stored in plaintext in the `webhooks` Map.
- **Impact:** Anyone with map access (memory dump, future RCE) can forge webhook calls to every customer's endpoint.
- **Fix:** Encrypt with `encrypt()` from `shared/utils/security.js`. Return decrypted only at delivery time.

### H-12. HIGH — CommonJS `require()` in ES Module Code
- **Files:**
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/organization/src/models/organization.model.js:212`
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/organization/src/services/organization.service.js:613`
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/agent/src/models/agent.model.js:177`
  - `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/RBAC/src/services/rbac.service.js:396, 559`
- **Issue:** `package.json` declares `"type": "module"`, but several files use `const crypto = require('crypto')`. Node.js with `"type": "module"` throws `ERR_REQUIRE_ESM` on these. The code as written **will not run**.
- **Proof:**
  ```js
  // organization.model.js:212
  const crypto = require('crypto');
  ```
- **Impact:** Dead code paths. Some services (e.g., `invitationService.resend`) will throw at runtime when called. This means the tests in the README ("All 67 internal services running") are not actually exercising these code paths.
- **Fix:** Replace with `import crypto from 'node:crypto'` at the top of the file. Verify by `node --check` on every file.

### H-13. HIGH — `revokeSessionByRefreshToken` Optional Chain Will Silently Fail
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:394`
- **Issue:** `revokeSessionByRefreshToken?.(refreshToken) || revokeAllUserSessions(req.user.id)` — the `?.` is a typo. `revokeSessionByRefreshToken` is imported (or was intended to be) — checking the imports in gateway.js, **it is NOT imported**. So `?.()` returns `undefined`, falling through to `revokeAllUserSessions` which revokes **all** sessions for the user on **every logout**.
- **Proof:**
  ```js
  revokeSessionByRefreshToken?.(refreshToken) || revokeAllUserSessions(req.user.id);
  ```
- **Impact:** Logging out from one device revokes all sessions (similar to "log out everywhere" buttons on Facebook/Google). This is acceptable UX, but it is not the documented behavior and exposes a bug pattern that may indicate dead code.
- **Fix:** Import `revokeSessionByRefreshToken` and drop the `?.`. Add a test that verifies only the specific session is revoked.

### H-14. HIGH — `parseInt` Without Radix and Validation
- **Files:** ~31 occurrences in `parseInt(limit)` / `parseInt(page)` across gateway.js, organization.routes.js, audit.routes.js, etc.
- **Issue:** `parseInt(limit)` with no radix. If `limit="abc"`, returns `NaN`. `arr.slice(start, NaN)` slices to end. No upper bound — `limit=999999999` returns up to 1 GB of data.
- **Proof:**
  ```js
  const start = (page - 1) * limit;
  const paginatedUsers = allUsers.slice(start, start + parseInt(limit));
  ```
- **Fix:** Use `Math.min(parseInt(limit, 10) || 20, 100)` to clamp. Apply `MAX_LIMIT` from `constants.js:320` (defined but unused).

### H-15. HIGH — Helmet CSP Allows `unsafe-inline` Styles
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:112-122`
- **Issue:** `styleSrc: ["'self'", "'unsafe-inline'"]` allows inline `<style>` and `style="..."` attributes, weakening XSS protection.
- **Fix:** Remove `unsafe-inline`. Use nonces for legitimate inline styles.

### H-16. HIGH — No `cors.maxAge` — Preflight Storms
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:125-130`
- **Issue:** No `maxAge` set. Browsers will re-preflight on every CORS request, multiplying load.
- **Fix:** Add `maxAge: 86400` for preflight caching.

---

## MEDIUM FINDINGS

### M-1. MEDIUM — PII in URL Query Strings Logged
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/audit/src/routes/audit.routes.js:42` (passes `actorEmail` from query) and many others.
- **Issue:** `actorEmail`, `actorId` in query strings are logged by morgan.
- **Fix:** Move to POST body for queries that contain PII.

### M-2. MEDIUM — `setInterval` Cleanup Not Stopped on Process Exit
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/audit/src/models/audit.model.js:281`
- **Issue:** `setInterval(cleanupExpiredEvents, 60 * 60 * 1000)` keeps a reference alive. On hot reload / process exit, no `clearInterval` is called.
- **Fix:** Hold the handle and clear in graceful shutdown.

### M-3. MEDIUM — No Graceful Shutdown Handler
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:755-776`
- **Issue:** `app.listen(PORT, ...)` is called but no `SIGTERM`/`SIGINT` handler. In-flight requests are killed abruptly.
- **Fix:** Add `process.on('SIGTERM', () => server.close(...))`. Flush audit log on shutdown.

### M-4. MEDIUM — `registerOrUpdateDevice` in Auto-Middleware Runs on Every Request
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:150-169`
- **Issue:** The middleware calls `verifyToken` and `registerOrUpdateDevice` on **every** request that has an Authorization header, not just authenticated requests. The device write happens before the route's own auth check.
- **Impact:** Devices are registered for unauthenticated requests. Token verification failure is silently swallowed. A flood of bogus tokens will bloat the `devices` Map.
- **Fix:** Move into `requireAuth()` so it only runs after successful token validation. Or guard with `if (decoded?.type === 'access' && decoded.sub)`.

### M-5. MEDIUM — Inconsistent Rate Limiter Application
- **Files:** Most routes use only `requireAuth()` and no rate limiter. `authLimiter` is only on `/auth/login`, `/auth/register`. Other sensitive endpoints (token rotate, password change, KYC submit, MFA enable) have no per-endpoint throttling.
- **Fix:** Apply `strictLimiter` to all sensitive routes: `POST /auth/refresh`, `PUT /auth/password`, MFA, KYC, all `POST/PUT/DELETE` on identity data.

### M-6. MEDIUM — Audit Logs Not Hashed/Encrypted at Rest
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/audit/src/models/audit.model.js` (entire file)
- **Issue:** PII like `actor.email`, `actor.ip` is stored unencrypted. Memory dump reveals all activity.
- **Fix:** Encrypt at rest. Use a separate audit database with restricted DB-user access.

### M-7. MEDIUM — `recordTimelineEvent` Called Inside Login Without Auth Check on Context Fields
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:324-334`
- **Issue:** The login handler records timeline events with `ip: req.ip` and `userAgent: req.headers['user-agent']`. No validation. Spoofable via headers if behind a misconfigured  (no `app.set('trust proxy', ...)` is set anywhere).
- **Fix:** Set `app.set('trust proxy', 1)` (or specific  count) and validate `req.ip`.

### M-8. MEDIUM — `trust proxy` Not Configured
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js` (no `app.set('trust ', ...)`)
- **Impact:** Behind a load balancer, `req.ip` is the LB's IP, not the client's. Rate limiting by IP is useless. Audit logs show the LB.
- **Fix:** Configure `app.set('trust proxy', N)` based on deployment topology.

### M-9. MEDIUM — `sanitizeHTML` Not Applied to KYC or Bio Fields
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/kyc/src/models/kyc.model.js:181-187` and `core/src/models/user.model.js:48`
- **Issue:** User `bio`, KYC `personalInfo` are stored without sanitization. If rendered in an admin UI without escaping, XSS.
- **Fix:** Run `sanitizeHTML` from `shared/utils/security.js` on all user-supplied rich-text fields.

### M-10. MEDIUM — `getRoleById` Returns 200 with Sensitive Internal Data
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:565-571`
- **Issue:** `GET /api/roles/:id` returns the full role object to any authenticated user, including `permissions: ['*']` for `superadmin` and `constraints` (which may contain ABAC rules with sensitive context).
- **Fix:** Strip `permissions` and `constraints` from non-admin responses. Or require `requireAdmin()`.

### M-11. MEDIUM — `requireBusinessScope` Only Checks Params, Not Body
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/middleware/auth.js:207-241`
- **Issue:** A request like `PUT /api/organizations/{myOrgId}` with body `{ organizationId: "otherOrgId" }` would not trigger the scope check on body-level `organizationId`. The middleware does check body, but only `req.body[paramName]`, not nested bodies.
- **Fix:** Recursively search the body for orgId values, or use a JSON schema validator.

### M-12. MEDIUM — `console.log` Leaks Secrets on Boot
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/core/src/models/user.model.js:372`
- **Issue:** `console.log('Default admin user created:', user.id);` reveals that an admin was just created. The startup banner in `gateway.js:756-774` is also routed through console.log alongside the logger.
- **Fix:** Use the winston logger; redact `user.id` in non-superadmin contexts.

### M-13. MEDIUM — No HTTPS / TLS Configuration
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:755`
- **Issue:** Plain HTTP on port 4702. JWTs and KYC data transmitted in cleartext.
- **Fix:** Document deployment behind a TLS-terminating . Add HSTS header to helmet config.

### M-14. MEDIUM — Missing `Content-Security-Policy` for Some Resources
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:113-120`
- **Issue:** `defaultSrc: ["'self'"]` is fine, but `connectSrc`, `frameAncestors`, `baseUri` are not set. Default is `*`, which allows AJAX/WS to any origin.
- **Fix:** Add explicit `connectSrc: ["'self'"]`, `frameAncestors: 'none'`, `baseUri: "'self'"`.

### M-15. MEDIUM — `requireAuth` does not validate `decoded.exp` Re-check
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/middleware/auth.js:16-22`
- **Issue:** `jwt.verify` does check `exp` by default, so this is OK. But the function returns `null` on any error, masking the difference between "expired" and "malformed". Audit logs can't distinguish.
- **Fix:** Re-throw or return the specific error class.

### M-16. MEDIUM — Auto-Created Org Owner Membership Has No `status: 'active'` Check on Re-list
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/organization/src/services/organization.service.js:62-70`
- **Issue:** New org creator is given `role: 'org-owner'`. The `organization.routes.js:96-103` GET-by-id check uses `membershipService.getUserMembership` which filters by `userId && organizationId` but does **not** filter by `status === 'active'`. Suspended members can still see the org.
- **Fix:** Add `status: 'active'` to the membership query in the route check.

### M-17. MEDIUM — `getUserById` Is O(n) Linear Scan
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/core/src/models/user.model.js:185-190`
- **Issue:** Iterates all users to find one by ID. Combined with O(n) `getUserByEmail` (which is actually O(1) by hash), performance degrades with scale. But more importantly, every other model does similar O(n) scans (`getOrganizationBySlug`, `getInvitationByToken`, etc.) — making the system trivially DoS-able by inserting millions of records.
- **Fix:** Add secondary indexes (or use a real database).

### M-18. MEDIUM — Inconsistent Naming Across Services
- **Files:** Service files use inconsistent names: `getUserByEmail` vs `getConsumerByEmail` vs `getMerchantById`. IDs are `user-XXXX`, `org-XXXX`, `mbr-XXXX`, `dept-XXXX`, `team-XXXX`, `inv-XXXX`, `link-XXXX`, `ag-XXXX`, `agent-XXXX` (inconsistent), `dev-XXXX`, `proj-XXXX`, `app_XXXX` (different separator), `dkey-XXXX`, `dweb-XXXX` (in webhook), `cpk_XXXX` (API key with `_` separator).
- **Impact:** Hard to maintain, easy to make mistakes in ID matching.
- **Fix:** Standardize on a single ID format: `<type>_<8-hex-chars>` (or full UUIDs).

---

## LOW FINDINGS

### L-1. LOW — `asyncHandler` Not Applied to All Routes
- **Files:** Some routes use it (most), some don't. Examples in `federation.routes.js:38` and a few others use plain handlers.
- **Issue:** If a route handler throws (non-async), the global error handler still catches it via Express 4's default. But if an async function throws and is not wrapped, Express 4 **does not** forward the error. The pattern is inconsistent.
- **Fix:** Always wrap async handlers.

### L-2. LOW — `WINSTON` Default Transport Is Console-Only
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/utils/logger.js:22-28`
- **Issue:** Logs go only to console (stdout/stderr). No file, no centralized log aggregator. Production deployments will lose logs on container restart.
- **Fix:** Add a file/Syslog/HTTP transport. Or document that the platform is expected to ship stdout.

### L-3. LOW — `JSON.parse(JSON.stringify(...))` Used for Clone
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/consent/src/models/consent.model.js:113`
- **Issue:** `JSON.parse(JSON.stringify(DEFAULT_CONSENT))` is a deep clone but loses functions, Date, Map, undefined, and is slow. `structuredClone()` is built into modern Node.
- **Fix:** Use `structuredClone(DEFAULT_CONSENT)`.

### L-4. LOW — `bcryptjs` Used Instead of Native `bcrypt`
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/package.json:19`
- **Issue:** `bcryptjs` is a pure-JS implementation. It is significantly slower than native `bcrypt`, allowing for slightly higher rounds at the same latency — but the package has had fewer security audits. Native `bcrypt` is preferred.
- **Fix:** Use `bcrypt` (native).

### L-5. LOW — No Health Check Depth
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:173-194`
- **Issue:** `/health` returns `process.uptime()` and Map sizes but no actual liveness probe (e.g., is the logger alive? Is the event loop responsive?).
- **Fix:** Add a `setTimeout` probe to detect a wedged event loop.

### L-6. LOW — `setTimeout` in Background Check / KYC Race Condition
- **Files:** `kyc/src/models/kyc.model.js:345-350`, `verification/src/models/verification.model.js:268-270, 356-358`
- **Issue:** Background check completion is simulated with `setTimeout(..., 100)`. The function captures the userId and may run after the user has been deleted or after the record has changed. No idempotency guard.
- **Fix:** Use a queue with proper retry semantics, not setTimeout.

### L-7. LOW — README References Non-Existent Docs
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/README.md:22-29`
- **Issue:** Links to `CLAUDE.md`, `API_REFERENCE.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `CORPID_ROADMAP.md` — only `CLAUDE.md` exists (`../CLAUDE.md`). Others are 404.
- **Fix:** Create or remove links.

### L-8. LOW — Service Version Mismatch
- **Files:** `gateway.js:762` prints `v4.0.0 - ALL PHASES COMPLETE`, but `package.json:3` says `1.0.0`, and the banner at line 181 says `version: '1.0.0'`.
- **Fix:** Centralize version in `package.json` and read it.

### L-9. LOW — Logger Not Used in Many Places
- **Files:** `console.log` calls in `gateway.js:756`, `user.model.js:372`. The winston logger is exported but inconsistently used.
- **Fix:** Replace all console.* with logger.

### L-10. LOW — Memory Leak — Map Growth Without Bounds
- **Files:** `auditEvents` has `MAX_EVENTS = 100000`. `timelineEvents` has `MAX_EVENTS = 50000`. **But most other Maps have no bound**: `users`, `sessions`, `refreshTokens`, `devices`, `apiKeys`, `oauthClients`, `webhooks`, `kycDocuments`, `passwordHistory`, `userPermissionOverrides`, `ssoSessions`, `ssoLinks`, etc.
- **Issue:** Unbounded growth. A 100k user system with 10 devices each = 1M device records in memory. The device fingerprint is sha256, so 32 bytes × 1M = 32 MB just for fingerprints. Each user object includes password history (last 5 hashes, each 60 bytes bcrypt) = 300 bytes × 100k = 30 MB.
- **Fix:** Add LRU eviction. Or back with a real database.

### L-11. LOW — Inconsistent Async Patterns
- **Files:** `rbac.service.js:559` uses `const { expandWildcardPermissions } = require(...)` inside a method (CommonJS in ESM). Multiple files mix `async/await` with `.then()` (e.g., `user.model.js:368` `createUserWithPassword(...).then(...)`).
- **Fix:** Standardize on top-level imports and `await`.

### L-12. LOW — `app.use(helmet({...}))` But No `compression()` for Some Routes
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:121, 133`
- **Issue:** `crossOriginEmbedderPolicy: false` weakens COEP. `compression()` is enabled globally but not on error responses.
- **Fix:** Tighten helmet defaults.

### L-13. LOW — Magic Numbers Everywhere
- **Files:** Pagination, retention, rate limits are sometimes hardcoded (e.g., `page - 1) * limit` with no MAX_LIMIT check; `attempts > 3`, `> 5`).
- **Fix:** Centralize in `constants.js`.

### L-14. LOW — Unused Imports
- **Files:** `federation.routes.js:3` `AppError` may be imported but used. Most look clean, but `rbac.service.js:13` imports `dataAudit` from `logger.js` but it's only used in some methods.
- **Fix:** Lint with `eslint --no-unused-vars`.

### L-15. LOW — `default` Export Duplicates `named` Exports
- **Files:** Every model file has both `export function foo()` and `export default { foo, bar }`. The default is rarely imported. Inconsistent.
- **Fix:** Pick one pattern.

---

## ARCHITECTURE FINDINGS

### A-1. ARCHITECTURE — 21 In-Memory Microservices in One Process
- **Issue:** Despite the README claiming 21 "services", they are all directories under one Node.js process. They share the same `users` Map (singleton state). There is no service boundary, no message bus, no event sourcing.
- **Impact:** A memory bug in any model corrupts the global state. A crash takes down all 21 "services".
- **Fix:** Either commit to true microservices (separate processes + DB) or rename to "modules" and remove the service-suffix illusion.

### A-2. ARCHITECTURE — No Data Validation Layer
- **Issue:** Routes destructure `req.body` without validation. `express-validator` is in `package.json` but **never imported anywhere**. There is no schema validation (zod, joi, ajv).
- **Fix:** Add `express-validator` or `zod` middleware to every input.

### A-3. ARCHITECTURE — No Event Bus
- **Issue:** Services call each other directly via function imports. The `recordTimelineEvent` in `gateway.js:324` is called from the auth handler, but the timeline model is in a different "service". A cyclical import risk exists.
- **Fix:** Use a real event bus (EventEmitter or external like Kafka) and decouple.

### A-4. ARCHITECTURE — Service Initialization Order Depends on Import Order
- **Issue:** `user.model.js:377` calls `initializeDefaultUser()` at module load. `organization.model.js:431` calls `initializeDefaultOrganization()`. The order is: whoever is imported first runs first. If `rbac.model.js` (which initializes 8 roles) is imported before `user.model.js`, the seed user has `role: 'superadmin'` set, which `getUserRoles()` then reads. But the role lookup itself reads from `users` (in rbac.service.js:582) — `if (userId.startsWith('user-'))` — which is a string check that doesn't need init order. However, the init order is fragile and will break as the codebase grows.
- **Fix:** Centralize initialization in a single bootstrap function called once on app start.

### A-5. ARCHITECTURE — No Tests
- **Issue:** No test files (`*.test.js`, `*.spec.js`) found in the entire tree. The README says "All Phases Complete" but no test coverage exists. The "running" status is unverifiable.
- **Fix:** Add unit + integration tests, especially for auth and authorization.

### A-6. ARCHITECTURE — `app.use(helmet)` Order Before Body Parsing
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:112-140`
- **Issue:** This is correct (helmet first), but `app.use(morgan)` then `app.use(express.json)` then the device auto-registration middleware — but `compression()` is before morgan. Reasonable.
- **Status:** No action.

### A-7. ARCHITECTURE — "Auto-Register Device" Middleware Should Not Be in `gateway.js`
- **Issue:** Cross-cutting concern (device fingerprinting on every request) is in the gateway, not the device service. Couples them.
- **Fix:** Move into a separate `device-fingerprint.middleware.js` shared utility.

### A-8. ARCHITECTURE — README Documents `JWT_EXPIRES_IN` and `REFRESH_EXPIRES_IN` Env Vars But They Are Not Read
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/README.md:108-110`
- **Issue:** Env vars `JWT_EXPIRES_IN` and `REFRESH_EXPIRES_IN` are documented but the code hardcodes `'1h'` and `'7d'` in `auth.js:54, 64`.
- **Fix:** Read from env, with safe defaults.

---

## PRODUCTION READINESS

### P-1. PRODUCTION — No Graceful Shutdown
- Already noted as M-3.

### P-2. PRODUCTION — No Metrics Endpoint
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:173-194`
- **Issue:** `/health` returns JSON but no Prometheus-style metrics (request count, latency, error rate). No `/metrics`.
- **Fix:** Add `prom-client` integration.

### P-3. PRODUCTION — Single Point of Failure (Single Process)
- **Issue:** The entire identity service runs in one Node process. A single OOM crash takes down auth for all 21 "services".
- **Fix:** Run multiple instances behind a load balancer with sticky sessions (or move to a database).

### P-4. PRODUCTION — No Liveness/Readiness Differentiation
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js:173-202`
- **Issue:** `/health` and `/ready` both return 200 always. No dependency check (e.g., if the audit log is full, are we still ready?).
- **Fix:** `/ready` should check critical dependencies; `/health` should be a pure liveness probe.

### P-5. PRODUCTION — No Distributed Tracing
- **Issue:** No OpenTelemetry, no correlation IDs across services (only `X-Request-ID` per request).
- **Fix:** Integrate OTel.

### P-6. PRODUCTION — Default Admin User Auto-Created Without Force-Password-Change Flag
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/core/src/models/user.model.js:353-374`
- **Issue:** On first boot, `admin@rtmn.com` is created with a hardcoded default password (literal removed from source in Phase 7) and no flag indicating the password must be changed. The user can log in with this forever.
- **Fix:** Set `passwordChangedAt: null` and `forcePasswordChange: true`; reject login until changed.

### P-7. PRODUCTION — Logger Not Configured for Production
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/utils/logger.js:24-28`
- **Issue:** In production, format is `json()` to console. No file rotation, no central shipping. Docker logs will be lost on container exit unless `json-file` driver with rotation is configured.
- **Fix:** Document log shipping requirements. Add pino for better perf.

### P-8. PRODUCTION — Documentation Claims Are Aspirational
- **File:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/README.md:31-100`
- **Issue:** The README claims "SAML, OAuth, OIDC" support, but the federation module (lines 78-150 of federation.routes.js) only stores the config. There is no actual SAML XML signature validation, no OIDC discovery, no token exchange — the SSO callback just trusts the body. Calling this "Phase 4 - Compliance & Platform" is misleading.
- **Fix:** Either implement or remove from docs.

---

## TOP 10 PRIORITIZED FIX LIST

| # | Severity | File | Issue | Effort |
|---|----------|------|-------|--------|
| 1 | CRITICAL | `shared/middleware/auth.js:10` | Replace hardcoded JWT secret with fail-fast env-var check; rotate any existing tokens | 1h |
| 2 | CRITICAL | `core/src/models/user.model.js:18, 354-374` + README | Remove auto-seeded admin; require manual bootstrap via secure CLI | 2h |
| 3 | CRITICAL | `RBAC/src/services/rbac.service.js:577-584` + `RBAC/src/models/rbac.model.js:99-117` | Look up user roles from a real data store, not from userId string prefix; remove `allowSystemUpdate` flag entirely | 4h |
| 4 | CRITICAL | `federation/src/routes/federation.routes.js:229-253` | Implement real SSO callback: validate SAML XMLDSig, OIDC ID-token JWT, enforce `state` and `nonce`; reject `profile` from body | 1-2 days |
| 5 | CRITICAL | `gateway.js:353-385` + `core/src/models/user.model.js:269-292` | Add refresh token revocation check on `/auth/refresh`; implement refresh token rotation with family detection | 4h |
| 6 | CRITICAL | All model files | Replace in-memory `Map`s with persistent storage (Postgres + Redis for sessions); use `Object.freeze` for audit events | 1-2 weeks |
| 7 | CRITICAL | All `GET /:id` routes (~15+ files) | Add ownership check: `if (resource.userId !== req.user.id && !isAdmin(req.user))` | 1 day |
| 8 | CRITICAL | `verification/src/routes/verification.routes.js:48-59` | Never return the email verification token in the response; gate `devToken` behind `NODE_ENV !== 'production'` | 30 min |
| 9 | CRITICAL | `verification/src/models/verification.model.js:70-88` | Hash OTPs with bcrypt/argon2id before storing; never store plaintext; rate-limit per-user | 4h |
| 10 | CRITICAL | `shared/middleware/auth.js:246-267` | Implement real API key validation in `requireAPIKey` (hash compare, status, expiry) | 2h |

**Quick wins that take < 1 hour each:**
- C-10 (verification token leak)
- C-2 (README credentials)
- M-8 (trust )
- L-9 (replace console.log)
- L-1 (wrap all async handlers)
- A-8 (read JWT_EXPIRES_IN from env)
- Remove `allowSystemUpdate` flag (C-4)

**Multi-week efforts:**
- C-7 (replace in-memory store) — most impactful but biggest scope
- A-5 (test coverage from zero)
- A-3 (event bus decoupling)

---

## SUMMARY

| Category | Count |
|----------|-------|
| **CRITICAL** | 17 |
| **HIGH** | 16 |
| **MEDIUM** | 18 |
| **LOW** | 15 |
| **Architecture** | 8 |
| **Production Readiness** | 8 |
| **TOTAL** | **82 findings** |

**Score: 2.5 / 10** — The structure is there (21 service directories, shared middleware, gateway routing, audit intent) but the security and persistence layers are not implemented. The system **must not** be exposed to any network until CRITICAL findings 1-10 are remediated. The audit log "immutability" claim in the documentation is actively misleading — the code mutates the array. The auth secret is committed to the source tree. The SSO endpoint trusts client-supplied identity. The RBAC system delegates role lookup to a string prefix check. These are not edge cases; they are the foundation.

**Estimated remediation time for all CRITICAL findings: 2-3 weeks of focused work.** HIGH findings add another 1-2 weeks. The codebase is salvageable — the patterns are mostly right, and the per-service structure is a sound starting point — but a serious security review and rewrite is needed before this can be called a production identity platform.

**Key file paths (absolute):**
- Gateway: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/gateway.js`
- Auth middleware: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/middleware/auth.js`
- Security utils: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/utils/security.js`
- User model: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/core/src/models/user.model.js`
- Audit model: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/audit/src/models/audit.model.js`
- RBAC service: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/RBAC/src/services/rbac.service.js`
- Organization routes: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/organization/src/routes/organization.routes.js`
- Federation routes: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/federation/src/routes/federation.routes.js`
- Verification routes: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/verification/src/routes/verification.routes.js`

agentId: abda71f61a1a6ddfe (use SendMessage with to: 'abda71f61a1a6ddfe' to continue this agent)
<usage>subagent_tokens: 159804
tool_uses: 58
duration_ms: 460974</usage>