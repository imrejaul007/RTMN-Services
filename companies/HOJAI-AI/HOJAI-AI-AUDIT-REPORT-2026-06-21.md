# HOJAI AI Platform - Security & Architecture Audit Report

**Audit Date:** 2026-06-21
**Auditor:** Claude (automated security audit)
**Scope:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/` (entire HOJAI AI platform)
**Methodology:** Static source analysis, configuration review, pattern detection

---

## ⚠️ EXECUTIVE SUMMARY - VERDICT

**Overall Security Posture Score: 4.5 / 10 — POOR / NOT PRODUCTION READY**

The HOJAI AI platform demonstrates **systemic security weaknesses** consistent with rapid early-stage development. While individual services (CorpID, TwinOS Hub, twinos-shared library) implement reasonable patterns, the broader ecosystem has **dangerous defaults that compromise security across the entire platform**:

- **Shared hardcoded fallback secrets** in 30+ services — any single service compromise exposes all services
- **Authentication bypass in critical trust infrastructure** (SADA OS, Salar OS) — JWT only checks for presence, never verifies signature
- **Mass wildcard CORS** in 119+ services — credential theft via cross-origin attacks possible
- **No authentication on secrets manager** — service designed to protect secrets is itself unprotected
- **Multiple weak hashing schemes** (unsalted SHA-256, hardcoded bcrypt hash for admin)
- **Critical privilege escalation** in CorpID — any authenticated user can modify trust scores for any entity
- **Sensitive personal data (passwords) stored in plaintext JSON files**

The platform is architecturally sound but **operationally insecure**. Fixing these issues should be considered a **P0 priority** before any production deployment handling real user data or financial transactions.

---

## OVERVIEW - COMPONENTS DISCOVERED

### Top-Level Structure

```
companies/HOJAI-AI/
├── platform/                    # 12 categories, 60+ services
│   ├── connectors/              # External integrations
│   ├── flow/                    # Workflow OS (goal-os, etc.)
│   ├── identity/                # ⭐ CorpID, customer-support, tenant-manager
│   │   ├── corpid-service/      # Universal identity (port 4702)
│   │   ├── customer-support-service/
│   │   └── tenant-manager/      # ⚠️ NO AUTH
│   ├── infra/                   # Infrastructure
│   │   ├── ai-safety/
│   │   ├── billing/
│   │   ├── feature-flags/
│   │   └── secrets-manager/     # ⚠️ NO AUTH, NO ENCRYPTION
│   ├── intelligence/            # 12 AI services (most without auth)
│   │   ├── ai-intelligence/
│   │   ├── graph-database/
│   │   ├── inference-gateway/
│   │   ├── reasoning-runtime/   # ⚠️ NO AUTH
│   │   ├── micro-intelligence/  # ⚠️ NO AUTH (circuit breakers!)
│   │   └── ... (7 more)
│   ├── memory/                  # Memory services
│   ├── observability/           # 6 services, most without auth
│   │   ├── event-bus/           # ⚠️ NO AUTH
│   │   ├── intent-bus/          # ⚠️ NO AUTH
│   │   └── ... (4 more)
│   ├── skills/                  # Skill management
│   ├── training/                # ML training
│   ├── trust/                   # ⭐ SADA OS (port 4190)
│   │   └── sada-os/             # ⚠️ AUTH BYPASS
│   └── twins/                   # 24 digital twin services
│       ├── twinos-hub/          # TwinOS registry (port 4705)
│       ├── twinos-shared/       # Auth library (@rtmn/twinos-shared)
│       ├── salar-os/            # ⚠️ AUTH BYPASS
│       └── customer-twin/, order-twin/, wallet-twin/, etc. (22 more)
├── sutar-os/                    # AI Marketplace + Economic Layer
│   ├── core/                    # 7 services (sutar-gateway, etc.)
│   │   ├── sutar-gateway/       # ⚠️ NO AUTH
│   │   └── ... (6 more)
│   ├── agents/                  # 14 services (ACP, ACN, etc.)
│   ├── contracts/               # Smart contracts
│   ├── economy/                 # Economy layer
│   └── marketplace/             # 7 services (most without auth)
├── products/                    # Consumer-facing products
│   └── genie/                   # 25 Genie AI services
│       ├── genie-os/            # Main genie runtime
│       ├── genie-gateway/       # ⚠️ NO AUTH
│       └── ... (23 more, mostly no auth)
├── shared/                      # Shared libraries
│   ├── auth/                    # ⚠️ Uses base64 (NOT real JWT)
│   └── lib/                     # database, logger, persistent-store
├── divisions/                   # 12 division docs (mostly README)
└── docs/, scripts/, leverge/, blr-ai-marketplace/, salar/
```

**Service Inventory:**
- **Total services with code:** ~166
- **Total Express services with routes:** ~140
- **Services with no authentication:** ~80+
- **Services with hardcoded JWT fallback secrets:** 15+
- **Services sharing the same hardcoded internal token:** 11+

---

## 🔴 CRITICAL FINDINGS (P0)

### C-1: Secrets Manager Has NO Authentication

**Severity:** CRITICAL
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/infra/secrets-manager/src/index.js`
**Issue:** The service designed to protect secrets has zero authentication on any endpoint

**Proof:**
- Line 118: `app.use(cors({ origin: '*', methods: [...] }))` — open CORS
- Line 150: `app.post('/api/secrets', (req, res) => {` — no auth
- Line 218: `app.get('/api/secrets/:name/value', (req, res) => {` — exposes plaintext secrets without auth
- Line 431: `// TODO: In production, integrate with Vault / AWS Secrets Manager for HA + replication.`
- Line 432: `// TODO: In production, add RBAC checks here (verify caller via CorpID JWT before each op).`

**Impact:** Anyone on the network can read, create, update, or delete any secret in the system. Secrets Manager is the centralized place where API keys and credentials are intended to live — but it's wide open.

**Recommended Fix:**
1. Add `requireAuth` middleware to all routes immediately
2. Add role-based access control (superadmin/admin only for mutations)
3. Audit log who accessed which secret when
4. Encrypt values at rest before persisting

---

### C-2: SADA OS Authentication Bypass

**Severity:** CRITICAL
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/trust/sada-os/src/index.ts`
**Issue:** The trust/authentication/verification platform (SADA OS) accepts any Bearer token as valid without verification

**Proof:**
- Lines 64-81 (`authMiddleware`):
```javascript
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Service-to-service auth via internal token
  if (req.headers['x-internal-token'] === INTERNAL_TOKEN) return next();

  // User-facing JWT auth (CorpID-issued)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // TODO: verify JWT against CorpID public key (port 4702)
    // For now we trust the Bearer header presence — full verify in next iteration
    return next();
  }
```
- Line 50: `const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-only-internal-token-do-not-use-in-prod';` — hardcoded fallback
- Line 549-575: `POST /verification/:verificationId/approve` — anyone with a Bearer header can approve KYC verifications
- Line 337: `POST /governance/policies` — anyone can create governance policies

**Impact:** The "Trust, Governance & Risk Platform" has no actual trust verification. An attacker can:
- Approve any KYC verification (`/verification/:id/approve`)
- Set any entity's trust score to 100 (line 1233 in CorpID also allows this)
- Create governance policies that block legitimate operations
- Modify trust scores to enable fraud

**Recommended Fix:**
1. Verify JWT signature against CorpID public key (RS256/ES256)
2. Validate JWT issuer and expiration
3. Implement role-based access control on sensitive endpoints
4. Remove the dev-only token fallback in production

---

### C-3: Salar OS Authentication Bypass

**Severity:** CRITICAL
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/salar-os/src/index.ts`
**Issue:** Same Bearer-token-presence-check pattern as SADA OS — full auth bypass

**Proof:**
- Lines 71-88 (`authMiddleware`):
```typescript
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Service-to-service auth via internal token
  if (req.headers['x-internal-token'] === INTERNAL_TOKEN) return next();
  // User-facing JWT auth (CorpID-issued)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // TODO: verify JWT against CorpID public key (port 4702)
    // For now we trust the Bearer header presence — full verify in next iteration
    return next();
  }
```
- Line 60: `const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'corpid-internal-token';` — hardcoded
- Lines 192-205: All major routes mounted under `authMiddleware` which has the bypass

**Impact:** Salar OS manages workforce intelligence (capabilities, AI agents, trust, SADA bridge). The auth bypass means anyone can:
- Map any capability to any agent
- Modify agent trust scores
- Trigger SADA verification
- Access payment integrations

**Recommended Fix:** Same as C-2 — implement real JWT verification.

---

### C-4: CorpID Trust Score Privilege Escalation

**Severity:** CRITICAL
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** Any authenticated user can set trust scores for ANY entity, and modify namespaces/API keys

**Proof:**
- Lines 1213-1235: `GET /api/trust/score/:corpId` (no role check) and `PUT /api/trust/score/:corpId` (only requires authentication)
- Lines 1250-1273: Namespace create/delete with only `requireAuth`
- Lines 1277-1301: API key create/delete with only `requireAuth`
- Line 1223: `app.put('/api/trust/score/:corpId', requireAuth, ...)` — no role check
- Line 1230: `by: req.user.id,` — any user can update trust scores for any corpId

**Impact:** A regular authenticated user can:
- Set their own trust score to platinum (100)
- Set another user's trust score to 0 (block them)
- Delete any namespace
- Delete other users' API keys

This is the universal identity provider — these endpoints are used by every Industry OS, SUTAR OS, and decision engine.

**Recommended Fix:**
1. Add `requireRole('superadmin', 'admin')` to all trust score mutation endpoints
2. Add ownership/tenant validation for namespace and API key operations
3. Audit log all trust score changes

---

### C-5: Multiple Services Share the Same Hardcoded Internal Token

**Severity:** CRITICAL
**Components:** 11+ services
**Issue:** A single hardcoded internal token (`'hojai-internal-service-token-change-me'`) is the fallback for service-to-service auth across multiple Genie services. Any compromise of one exposes all.

**Proof — token usage map:**

| Service | File:Line |
|---------|-----------|
| Genie AgentOS | `products/genie/genie-os/runtime/agentos/src/index.js:10` |
| Genie (main) | `products/genie/genie-os/runtime/genie/src/index.js:14` |
| Genie SUTAR | `products/genie/genie-os/runtime/sutar/src/index.js:11` |
| Genie MemoryOS | `products/genie/genie-os/foundation/memoryos/src/index.js:10` |
| Genie GoalOS | `products/genie/genie-os/foundation/goalos/src/index.js:10` |
| Genie FlowOS | `products/genie/genie-os/foundation/flowos/src/index.js:11` |
| Genie CorpID | `products/genie/genie-os/foundation/corpid/src/index.js:11` |
| Genie PolicyOS | `products/genie/genie-os/foundation/policyos/src/index.js:10` |
| Genie SkillOS | `products/genie/genie-os/foundation/skillos/src/index.js:10` |
| Genie TwinOS | `products/genie/genie-os/foundation/twinos/src/index.js:10` |
| Salar (root) | `salar/src/index.js:16` |
| Salar OS | `platform/twins/salar-os/src/index.ts:60` (uses 'corpid-internal-token') |
| SADA OS | `platform/trust/sada-os/src/index.ts:50` (uses 'dev-only-internal-token-do-not-use-in-prod') |

**Impact:** If any one of these services is compromised (e.g., SSRF, prototype pollution, RCE), the attacker gains access to all 11+ services that trust this same token. The token is hardcoded in source code and trivially recoverable.

**Recommended Fix:**
1. Each service should generate its own cryptographic token at startup
2. Use asymmetric keys (public/private) for service-to-service auth
3. Implement token rotation
4. Remove the hardcoded fallbacks before deploying anywhere

---

### C-6: Hardcoded Admin Bcrypt Hash in Source

**Severity:** CRITICAL
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** Default admin user credentials are hardcoded in source code, including the password hash

**Proof:**
- Lines 76-86:
```javascript
users.set('admin@rtmn.com', {
  id: 'user-admin-001',
  email: 'admin@rtmn.com',
  passwordHash: '$2a$12$jF9TgKv/ARtGRm2kaFgAMuO0qH3MBUtQo.MKL6opKqvPKAOaAhWMy', // TempPass123!
  name: 'Admin User',
  role: 'superadmin',
  businessId: 'RTMN-HQ',
  ...
});
```
- The hash `$2a$12$jF9TgKv/ARtGRm2kaFgAMuO0qH3MBUtQo.MKL6opKqvPKAOaAhWMy` corresponds to password `TempPass123!`
- Persistent version (line 73-79 of `index.persistent.js`) creates the same admin on first run

**Impact:** Anyone with access to the source code (including the public GitHub repo) can:
- Log in as `admin@rtmn.com` with `TempPass123!` if the service has been deployed without changing defaults
- Gain `superadmin` role → access to all businesses, users, trust scores

**Recommended Fix:**
1. Remove the hardcoded admin user from source
2. Generate first admin via a secure bootstrap process
3. Document required password rotation on first deployment
4. Audit logs for any deployments that still have this default

---

### C-7: Unsalted SHA-256 Password Hashing

**Severity:** CRITICAL
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/sutar-os/agents/agent-economy/src/index.js` and `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/shared/auth/routes.js`
**Issue:** Passwords hashed with unsalted SHA-256 — trivially defeated by rainbow tables

**Proof:**
- `sutar-os/agents/agent-economy/src/index.js:127-129`:
```javascript
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}
```
- `shared/auth/routes.js:64`:
```javascript
const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
```
- Same pattern at `shared/auth/routes.js:122` and `:246` (default password `default123`)

**Impact:** SHA-256 is a fast hash designed for speed, not password storage. An attacker with the password hash database can:
- Crack most passwords in minutes using rainbow tables (e.g., for `password123` → known SHA-256)
- Crack any 8-char lowercase password in hours with commodity GPU

**Recommended Fix:** Use bcrypt (already used by CorpID and others) or argon2id for all password hashing.

---

### C-8: Genie Gateway and Major Routers Have NO Authentication

**Severity:** CRITICAL
**Component:** Multiple Genie and SUTAR services
**Issue:** Central gateway routers accept all requests without any authentication

**Proof:**
- `products/genie/genie-gateway/src/index.js`: Only has rate limiter, no auth middleware (`grep -n "auth\|jwt" ... = 0`)
- `sutar-os/core/sutar-gateway/src/index.js`: No authentication at all (`grep -n "auth\|verify\|jwt" ... = 0`)
- `sutar-os/marketplace/sutar-exploration/src/index.js`: No authentication (`grep -n "auth\|verify\|jwt" ... = 0`)
- `products/genie/genie-os/runtime/genie/src/index.js`: Has `cors()` open, only auth on a few endpoints

**Impact:** The SUTAR Gateway routes all marketplace, agent commerce, and economic operations. With no auth:
- Anyone can list agents, query capabilities, route payments
- Anyone can interact with the agent commerce network
- Anyone can trigger negotiations and contracts

**Recommended Fix:** Add `authMiddleware` to all gateway routes. Use service-to-service auth for internal calls.

---

### C-9: Persistent Store Stores Passwords in Plaintext JSON Files

**Severity:** CRITICAL
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/shared/lib/persistent-store.js`
**Issue:** CorpID persistent version stores all data (including password hashes and JWT refresh tokens) in plaintext JSON files

**Proof:**
- Lines 79-81: `const raw = fs.readFileSync(this.filePath, 'utf8'); const entries = JSON.parse(raw);`
- Lines 113-114: `fs.writeFileSync(tmpPath, JSON.stringify(entries, null, 2), 'utf8'); fs.renameSync(tmpPath, this.filePath);`
- Persistent CorpID (`corpID/src/index.persistent.js:45-50`) uses this store for `User`, `RefreshToken`, `ApiKey`, `TrustScore`
- Default data path: `<service-name>/data/` or `/tmp/hojai-<service>`

**Impact:** Anyone with filesystem access (Docker escape, shared volume, backup access) can read all user credentials and active JWT refresh tokens. No encryption at rest.

**Recommended Fix:**
1. Add AES-256-GCM encryption at rest
2. Use a KMS-managed master key
3. Or migrate to a real database (MongoDB/Postgres) before production

---

## 🟠 HIGH SEVERITY FINDINGS (P1)

### H-1: Hardcoded JWT Secrets in 15+ Services

**Severity:** HIGH
**Components:** Multiple services
**Issue:** Hardcoded fallback JWT_SECRET values when `JWT_SECRET` env var is not set

**Proof:** Complete list of files with hardcoded JWT fallback:

```
companies/HOJAI-AI/products/founder-os/founder-os-product/src/index.js:39
  'founder-os-secret-change-in-production'
companies/HOJAI-AI/products/startup-studio/startup-studio/src/index.js:43
  'startup-studio-secret-change-in-production'
companies/HOJAI-AI/products/company-builder/company-builder-suite/src/index.js:42
  'company-builder-secret-change-in-production'
companies/HOJAI-AI/products/genie/genie-os/runtime/genie/src/index.js:13
  'hojai-development-secret-min-32-chars-please-change-in-production-xyz'
companies/HOJAI-AI/products/investor-copilot/investor-copilot/src/index.js:42
  'investor-copilot-secret-change-in-production'
companies/HOJAI-AI/sutar-os/agents/agent-twin/src/index.js:27
  'rtmn-twin-secret-change-in-production'
companies/HOJAI-AI/salar/src/index.js:15
  'hojai-development-secret-min-32-chars-please-change-in-production-xyz'
companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/middleware/auth.js:10
  'corpID-cloud-secret-change-in-production'
companies/HOJAI-AI/platform/identity/corpid-service/src/index.js:31
  'corpID-secret-change-in-production'
companies/HOJAI-AI/platform/identity/corpid-service/src/index.persistent.js:37
  'corpID-secret-change-in-production'
companies/HOJAI-AI/platform/twins/property-twin/src/index.js:27
  'rtmn-twin-secret-change-in-production'
companies/HOJAI-AI/platform/twins/deal-twin/src/index.js:27
  'rtmn-twin-secret-change-in-production'
companies/HOJAI-AI/platform/twins/buyer-twin/src/index.js:27
  'rtmn-twin-secret-change-in-production'
companies/HOJAI-AI/platform/twins/twinos-shared/src/index.js:33
  'rtmn-twin-shared-default-secret-change-me'
```

**Impact:** If `JWT_SECRET` is not set in production (deployment mistake), services fall back to a publicly known secret. Any attacker who knows this code (it's in the public repo) can:
- Forge valid JWT tokens for any user
- Impersonate any business
- Bypass all authentication

**Recommended Fix:**
1. Throw an error if `JWT_SECRET` is not set — never fall back to a hardcoded value
2. Use a secrets manager to inject at runtime
3. Add startup validation that rejects weak secrets

---

### H-2: CORS Wildcard Origin on 119+ Services

**Severity:** HIGH
**Components:** Most services in HOJAI AI
**Issue:** Services use `cors()` or `origin: '*'` — allows any website to make authenticated cross-origin requests

**Proof:**
- 119 files use `cors()` with no origin restriction
- Example: `platform/identity/corpid-service/src/index.js:109`: `origin: process.env.CORS_ORIGINS?.split(',') || '*'`
- Customer twin at line 43: `app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true }))`

**Impact:** Combined with JWT-based auth, an attacker can host a malicious webpage that makes authenticated API calls on behalf of a logged-in user. This enables:
- CSRF-style attacks that bypass SameSite cookie protections (using Bearer tokens)
- Data exfiltration of customer twins, business data, orders

**Recommended Fix:**
1. Each service should have an explicit allow-list of origins (e.g., `['https://app.rtmn.io', 'https://admin.rtmn.io']`)
2. Remove `credentials: true` unless absolutely necessary
3. Audit each service's CORS config

---

### H-3: tenant-manager Has NO Authentication

**Severity:** HIGH
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/tenant-manager/src/index.js`
**Issue:** The tenant management service allows anyone to create, delete, suspend tenants

**Proof:**
- Line 36: `app.use(cors());` — open CORS
- All routes have NO auth middleware:
  - Line 159: `app.post('/api/tenants', ...)` — create tenant
  - Line 200: `app.get('/api/tenants', ...)` — list all tenants
  - Line 245: `app.delete('/api/tenants/:id', ...)` — delete tenant
  - Line 255: `app.post('/api/tenants/:id/suspend', ...)` — suspend tenant
  - Line 279: `app.post('/api/tenants/:id/projects', ...)` — create project

**Impact:** An attacker can:
- Enumerate all tenants in the system (PII leak)
- Delete tenants (denial of service)
- Suspend any tenant
- Create fake tenants/projects
- Create fake API keys for service-to-service auth

**Recommended Fix:** Add `requireAuth` middleware to ALL routes immediately, with role-based access control for mutations.

---

### H-4: Most Genie Services Have No Rate Limiting

**Severity:** HIGH
**Component:** 25+ Genie services
**Issue:** Only 2 of 25+ Genie services use rate limiting (`grep` confirmed)

**Proof:**
- `grep -r "rateLimit" products/genie --include="*.js" --include="*.ts" | wc -l = 2`
- Of 25+ Genie services, only `genie-gateway` and a couple others have any rate limit
- Examples of unprotected services: `genie-shopping-agent`, `genie-calendar-service`, `genie-money-os`, `genie-wellness-os`, etc.

**Impact:** Trivially exploitable for:
- Brute-force attacks on AI agent auth tokens
- Token-burning attacks (consume LLM tokens to rack up costs)
- Resource exhaustion / DoS

**Recommended Fix:** Add `defaultLimiter` and `authLimiter` to all Genie services, especially those that interact with external services or paid AI models.

---

### H-5: Reasoning Runtime and Circuit Breakers Have No Auth

**Severity:** HIGH
**Components:**
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/intelligence/reasoning-runtime/src/index.js`
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/intelligence/micro-intelligence/src/index.js`

**Issue:** The reasoning runtime and circuit breaker controllers are completely unauthenticated

**Proof:**
- reasoning-runtime line 33: `app.use(cors());` — open CORS
- reasoning-runtime lines 251-313: All `/api/templates`, `/api/traces`, `/api/audit` routes are unauthenticated
- micro-intelligence line 242: `app.use(cors({ origin: '*', methods: [...] }))` — wildcard CORS
- micro-intelligence lines 273-358: All `/api/breakers/*` endpoints (CRUD) are unauthenticated
  - Line 318: `app.patch('/api/breakers/:name/state', ...)` — anyone can open/close circuit breakers
  - Line 337: `app.post('/api/breakers/:name/reset', ...)` — anyone can reset breakers

**Impact:**
- Anyone can read all reasoning traces (potential PII and prompt leakage)
- Anyone can disable circuit breakers across the entire platform
- Anyone can modify fallbacks (changing system behavior)

**Recommended Fix:** Add `requireAuth` to all routes. Circuit breaker operations should require admin role.

---

### H-6: Event Bus and Intent Bus Have No Auth

**Severity:** HIGH
**Components:**
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/observability/event-bus/src/index.js`
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/observability/intent-bus/src/index.js`

**Issue:** Event bus and intent bus accept events from anyone and allow subscription to all events

**Proof:**
- event-bus line 45: `app.use(cors());`
- event-bus lines 340-476: All `/api/events/*`, `/api/subscriptions/*` routes are unauthenticated
  - Line 340: POST events (anyone can inject events)
  - Line 374: GET all events (anyone can read all events)
  - Line 416: POST subscriptions
- intent-bus line 37: `app.use(cors());` — only protection is CORS, which is wide open

**Impact:**
- An attacker can inject fake events (e.g., "user X purchased product Y" → triggers downstream workflows)
- An attacker can subscribe to all events (privacy leak)
- Event replay attacks possible (line 404, 476)

**Recommended Fix:** Add authentication. Use service-to-service auth for internal event producers.

---

### H-7: corpID-cloud requireAPIKey Accepts Any Key

**Severity:** HIGH
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/shared/middleware/auth.js`
**Issue:** The `requireAPIKey` middleware accepts ANY X-API-Key without validation

**Proof:**
- Lines 246-266:
```javascript
export function requireAPIKey() {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || ...
    if (!apiKey) {
      return res.status(401)...
    }
    // API key validation would be implemented here
    // For now, we'll skip and let services implement their own
    req.apiKey = apiKey;
    next();
  };
}
```

**Impact:** Comment in code explicitly says "For now, we'll skip". Any service using `requireAPIKey` is effectively unprotected.

**Recommended Fix:** Either remove this middleware until properly implemented, or implement actual API key validation (lookup in store, verify hash).

---

### H-8: shared/auth Uses Base64 (Not Real JWT)

**Severity:** HIGH
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/shared/auth/index.js`
**Issue:** The shared auth library used by many services creates tokens by base64-encoding JSON, NOT signing with JWT

**Proof:**
- Lines 24-31:
```javascript
function createToken(payload, expiresIn = 86400000) {
  const token = Buffer.from(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + expiresIn
  })).toString('base64');
  return token;
}
```
- Lines 33-43: `verifyToken` just decodes base64 and checks `exp` — no signature verification

**Impact:** Anyone can:
1. Decode any base64 token (it's not encrypted)
2. Modify the payload (change role from `customer` to `owner`)
3. Re-encode as base64
4. Get full admin access

This is a **trivial authentication bypass** for any service using this shared auth library.

**Recommended Fix:** Use real JWT with HMAC (HS256) or asymmetric signing (RS256). The comment in the code even says "for demo - use real JWT in production".

---

### H-9: CORS with credentials and wildcard origin

**Severity:** HIGH
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** CorpID sets `credentials: true` with wildcard origin `*`

**Proof:**
- Lines 108-113:
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));
```

**Impact:** Browser security model disallows `Access-Control-Allow-Origin: *` with credentials, but the misconfiguration still allows CSRF via simpler attacks (no preflight needed for simple requests). Combined with Bearer tokens (often stored in localStorage), this enables cross-origin token theft.

**Recommended Fix:** Use explicit allow-list of origins when `credentials: true`.

---

## 🟡 MEDIUM SEVERITY FINDINGS (P2)

### M-1: In-Memory Storage Across Most Services

**Severity:** MEDIUM
**Components:** Most services including CorpID, twin services, sal-ar, etc.
**Issue:** Data lost on restart, no persistence, no replication, no backups

**Proof:**
- `platform/identity/corpid-service/src/index.js:54-60`: Multiple `new Map()` for users, businesses, sessions, etc.
- `platform/twins/customer-twin/src/index.js:52-63`: 9 in-memory Maps for customer data
- `sutar-os/agents/agent-economy/src/index.js`: All state in Maps
- `platform/identity/tenant-manager/src/index.js`: All tenant data in Maps

**Impact:** Production deployments will lose data on:
- Service restart
- Crash
- Deployment update
- Pod rescheduling

**Recommended Fix:** Persist to a real database (MongoDB/PostgreSQL) — services should not be deployed to production with in-memory state.

---

### M-2: Weak Password Policy Allows 8-Char Passwords

**Severity:** MEDIUM
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** Minimum 8-character password with no breach checking

**Proof:**
- Lines 404-407: `body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)`

**Impact:** 8 characters is below NIST 800-63B recommended minimum (12+ chars for human passwords). No check against breached password lists (HaveIBeenPwned).

**Recommended Fix:** Require minimum 12 characters, integrate with HIBP API for breach checking, or implement passkey/WebAuthn.

---

### M-3: No CSRF Protection on State-Changing Endpoints

**Severity:** MEDIUM
**Components:** All services
**Issue:** State-changing endpoints (POST, PUT, DELETE) lack CSRF protection

**Proof:** No CSRF middleware found anywhere in the platform (`grep -r "csurf\|csrf" companies/HOJAI-AI --include="*.js" --include="*.ts" --exclude-dir=node_modules` returned nothing)

**Impact:** While Bearer tokens mitigate CSRF for header-based auth, endpoints that accept token from cookie (if any) are vulnerable. The wildcard CORS issue makes this worse.

**Recommended Fix:** Implement CSRF token validation or use SameSite=Strict cookies if any cookie-based auth exists.

---

### M-4: Logout Doesn't Invalidate Access Tokens

**Severity:** MEDIUM
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** `/auth/logout` only revokes the refresh token; access tokens remain valid until expiry

**Proof:**
- Lines 694-711: Only `refreshTokens.delete(refreshToken)` is called. Access tokens (1h lifetime) remain valid.

**Impact:** A leaked access token cannot be revoked before its 1h expiry.

**Recommended Fix:** Maintain a JWT denylist (Redis) for revoked access tokens. Check on each request.

---

### M-5: PII Returned in API Responses Without Field Filtering

**Severity:** MEDIUM
**Component:** Various services
**Issue:** Sensitive user fields may be returned unnecessarily

**Proof:**
- CorpID `/auth/me` (line 717-742): Returns full user object including email, businessId
- Customer twin (line 152-185): Returns customer data + all related twins (behavior, segment, family, AI memory)
- TwinOS hub `/api/twins` (line 552-585): Returns full twin data including custom metadata

**Impact:** PII over-exposure in API responses. Should be field-filtered based on requester's role.

**Recommended Fix:** Implement field-level access control. Use DTOs to define what fields are returned to which roles.

---

### M-6: No Audit Logging Across Most Services

**Severity:** MEDIUM
**Components:** Most services except CorpID
**Issue:** Only CorpID has winston-based structured logging. Most services use `morgan('tiny')` or `console.log`

**Proof:**
- `shared/lib/logger.js`: Minimal logger
- Most services use `morgan('tiny')` — only HTTP-level logs, no business event logs
- No PII access logs, no security event logs

**Impact:** Cannot investigate security incidents. No record of who accessed what data when.

**Recommended Fix:** Implement structured logging (JSON) for security events: auth attempts, role changes, PII access, trust score changes.

---

### M-7: Refresh Tokens Persisted Indefinitely in Maps

**Severity:** MEDIUM
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** Refresh tokens stored in `refreshTokens` Map with no cleanup, grows unbounded

**Proof:**
- Line 243-248: `refreshTokens.set(token, { ...expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) })`
- No cleanup task exists
- Memory leak over time

**Impact:** Memory exhaustion in long-running deployments.

**Recommended Fix:** Periodic cleanup of expired tokens, or use Redis with built-in TTL.

---

### M-8: Customer Twin Business Scope Bypass for `admin` Role

**Severity:** MEDIUM
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/customer-twin/src/index.js`
**Issue:** Line 162 checks `req.user.role !== 'admin'` but should also include 'superadmin'

**Proof:**
- Line 162: `if (customer.businessId !== req.user.businessId && req.user.role !== 'admin') {`

**Impact:** Superadmins (with higher privilege) are blocked from cross-tenant access while admins have full access. This is inconsistent.

**Recommended Fix:** Use proper role hierarchy: `if (!['admin', 'superadmin'].includes(req.user.role) && customer.businessId !== req.user.businessId)`.

---

### M-9: No HTTPS Enforcement

**Severity:** MEDIUM
**Components:** All services
**Issue:** No middleware to redirect HTTP to HTTPS or set HSTS headers

**Impact:** In production, without HTTPS, Bearer tokens and PII can be intercepted on the wire.

**Recommended Fix:** Use a reverse proxy (nginx) for TLS termination, or add `helmet.hsts()` middleware.

---

## 🟢 LOW SEVERITY FINDINGS (P3)

### L-1: Verbose Error Messages in Non-Production

**Severity:** LOW
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** Error messages include errorId in non-production which could leak implementation details

**Proof:** Line 394: `...(process.env.NODE_ENV !== 'production' && { errorId })`

**Impact:** Information disclosure in dev mode.

**Recommended Fix:** Strip errorId in any deployment, or only enable in true local dev.

---

### L-2: Unused Password Hash Field on Update

**Severity:** LOW
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** PUT /api/users/:id allows updating user but doesn't handle password changes securely

**Proof:** Lines 913-971: Update endpoint doesn't accept new password field — must use separate change password endpoint.

**Impact:** No password rotation through user update (good actually), but error-prone if developers add it later.

**Recommended Fix:** Document that password changes must use `/api/profile/password`.

---

### L-3: Default CORS Allows `https:` Image Source in CSP

**Severity:** LOW
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** CSP allows `imgSrc: ["'self'", "data:", "https:"]` — any HTTPS image source

**Proof:** Line 101

**Impact:** Could be used for tracking pixels from any HTTPS domain.

**Recommended Fix:** Restrict to known image hosts.

---

### L-4: User Enumeration via Registration

**Severity:** LOW
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** Registration endpoint returns different errors for existing email vs business ID

**Proof:** Lines 512-525: Separate `USER_EXISTS` vs `BUSINESS_EXISTS` errors

**Impact:** Allows enumeration of which emails are registered.

**Recommended Fix:** Use generic "Registration failed" error.

---

### L-5: No Account Lockout After Failed Logins

**Severity:** LOW
**Component:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js`
**Issue:** After 5 failed attempts (rate limit), no account lockout

**Impact:** Attacker can wait 15 minutes then try again — unlimited attempts over time.

**Recommended Fix:** Implement exponential backoff or temporary account lockout after N failures.

---

## 📊 TOP 10 PRIORITY FIXES

| # | Severity | Finding | Action |
|---|----------|---------|--------|
| 1 | CRITICAL | C-1: Secrets Manager has NO auth | Add `requireAuth` + RBAC to all routes immediately |
| 2 | CRITICAL | C-2/C-3: SADA OS & Salar OS Bearer bypass | Implement real JWT signature verification (remove TODO) |
| 3 | CRITICAL | C-5: Shared hardcoded internal token | Generate per-service tokens, remove hardcoded fallback |
| 4 | CRITICAL | C-6: Hardcoded admin hash | Remove hardcoded admin, generate via secure bootstrap |
| 5 | CRITICAL | C-7: SHA-256 password hashing | Migrate to bcrypt/argon2id |
| 6 | CRITICAL | C-4: CorpID trust score privilege escalation | Add role checks to all mutation endpoints |
| 7 | CRITICAL | C-9: Plaintext JSON password storage | Encrypt at rest or migrate to real database |
| 8 | HIGH | H-1: 15+ hardcoded JWT fallback secrets | Throw on startup if JWT_SECRET unset |
| 9 | HIGH | H-2: Wildcard CORS on 119+ services | Implement explicit allow-list per service |
| 10 | HIGH | H-8: shared/auth uses base64 (not real JWT) | Replace with real JWT implementation |

---

## 📋 SERVICE-BY-SERVICE SECURITY MATRIX

Legend: ✅ = Implemented | ⚠️ = Partial | ❌ = Not implemented

| Service | Auth | Rate Limit | CORS | Input Validation | Audit Log |
|---------|------|-----------|------|------------------|-----------|
| CorpID (corpid-service) | ✅ | ✅ | ❌ wildcard | ✅ | ✅ |
| CorpID persistent | ✅ | ✅ | ❌ wildcard | ✅ | ✅ |
| CorpID Cloud (auth.js) | ⚠️ requireAPIKey broken | ✅ | ⚠️ | ✅ | ✅ |
| SADA OS | ❌ bypass | ⚠️ global | ❌ wildcard | ⚠️ partial | ❌ |
| Salar OS | ❌ bypass | ✅ | ❌ wildcard | ⚠️ partial | ❌ |
| TwinOS Hub (4705) | ✅ | ✅ | ❌ wildcard | ✅ | ⚠️ |
| Customer Twin (4895) | ✅ | ✅ | ❌ wildcard | ✅ | ⚠️ |
| TwinOS Shared library | ✅ | ✅ | ⚠️ env | ✅ | ✅ |
| Secrets Manager | ❌ | ❌ | ❌ wildcard | ⚠️ | ⚠️ |
| Tenant Manager | ❌ | ❌ | ❌ wildcard | ⚠️ | ⚠️ |
| Reasoning Runtime | ❌ | ❌ | ❌ wildcard | ❌ | ❌ |
| Micro Intelligence | ❌ | ❌ | ❌ wildcard | ❌ | ❌ |
| Event Bus | ❌ | ❌ | ❌ wildcard | ⚠️ | ❌ |
| Intent Bus | ❌ | ❌ | ❌ wildcard | ❌ | ❌ |
| Genie Gateway | ❌ | ⚠️ | ❌ wildcard | ❌ | ❌ |
| SUTAR Gateway | ❌ | ❌ | ❌ wildcard | ❌ | ❌ |
| Salar (8200) | ✅ | ❌ | ❌ wildcard | ⚠️ | ❌ |
| Agent Economy | ⚠️ | ❌ | ❌ wildcard | ⚠️ | ❌ |
| shared/auth (legacy) | ❌ base64 | ❌ | ❌ | ❌ | ❌ |

---

## 🎯 SECURITY POSTURE BY CATEGORY

| Category | Score | Notes |
|----------|-------|-------|
| Authentication | 4/10 | Has real JWT in core (CorpID, twinos-shared), but many services bypass or use weak schemes |
| Authorization | 3/10 | Role checks exist but are inconsistent; critical endpoints lack RBAC |
| Secrets Management | 2/10 | Secrets manager itself is unauthenticated; secrets hardcoded throughout |
| Cryptography | 5/10 | Good use of bcrypt in CorpID; SHA-256 and base64 elsewhere |
| Input Validation | 6/10 | express-validator used in CorpID; minimal elsewhere |
| Rate Limiting | 4/10 | Present in CorpID, TwinOS, some products; missing in most Genie/SUTAR services |
| CORS | 2/10 | Wildcard CORS everywhere |
| Audit Logging | 3/10 | Only CorpID has structured logs |
| Error Handling | 6/10 | Consistent JSON errors in newer services |
| Encryption at Rest | 1/10 | Plaintext JSON storage; no encryption |

**OVERALL: 4.5 / 10 — NOT PRODUCTION READY**

---

## 📁 KEY FILES TO REVIEW

- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/corpid-service/src/index.js` (CRITICAL)
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/trust/sada-os/src/index.ts` (CRITICAL)
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/salar-os/src/index.ts` (CRITICAL)
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/infra/secrets-manager/src/index.js` (CRITICAL)
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/identity/tenant-manager/src/index.js` (HIGH)
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/shared/auth/index.js` (HIGH — uses base64)
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/shared/lib/persistent-store.js` (CRITICAL — plaintext storage)
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/twinos-shared/src/index.js` (Reference good implementation)

---

## 🔧 RECOMMENDED REMEDIATION TIMELINE

### Phase 1 — Stop the Bleeding (Week 1)
1. Add authentication to Secrets Manager immediately
2. Fix SADA OS and Salar OS Bearer bypass
3. Remove hardcoded admin from CorpID source
4. Throw error on startup if JWT_SECRET missing in production

### Phase 2 — Core Hardening (Weeks 2-3)
5. Migrate SHA-256 → bcrypt/argon2id in shared/auth and agent-economy
6. Add role checks to all CorpID mutation endpoints
7. Implement per-service tokens, remove hardcoded fallbacks
8. Replace shared/auth base64 with real JWT

### Phase 3 — Defense in Depth (Weeks 4-6)
9. CORS allow-listing across all 119+ services
10. Add rate limiting to all Genie and SUTAR services
11. Implement authentication on all currently-unauth services
12. Migrate from in-memory Maps to persistent encrypted storage

### Phase 4 — Production Readiness (Weeks 7-8)
13. Add audit logging everywhere
14. Implement field-level access control on PII
15. Add HTTPS/HSTS at reverse proxy
16. Security audit of all third-party dependencies

---

*End of report*
