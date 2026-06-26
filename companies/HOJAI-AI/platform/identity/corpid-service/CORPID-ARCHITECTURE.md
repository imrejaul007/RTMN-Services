# CorpID — Universal Identity Service

> **Version:** 3.0.0 (Persistent)
> **Port:** 4702
> **Status:** ✅ Canonical — `companies/HOJAI-AI/platform/identity/corpid-service/`
> **Hub Route:** `http://localhost:4399/api/identity/*` → `http://localhost:4702`
> **Updated:** 2026-06-27

---

## 🗂️ What is CorpID?

**CorpID** is RTMN's **Universal Identity Service** — a single source of truth for identity, authentication, authorization, and trust across the entire ecosystem.

Every entity in RTMN gets a **CorpID**:
- **Humans** (employees, customers, merchants, drivers, founders)
- **Businesses** (companies, franchises, partners)
- **AI Agents** (autonomous agents, bots)
- **Machines** (IoT devices, equipment)
- **Products** (SKUs, services, bundles)

```
CorpID format:  CI-<TYPE>-<RANDOM>
  Examples:
    CI-IND-5K9X2    → Individual (human)
    CI-BIZ-ABC123   → Business
    CI-AGT-XYZ789   → AI Agent
    CI-MER-DEF456   → Merchant
```

---

## 📁 Canonical Location

```
companies/HOJAI-AI/platform/identity/
├── corpid-service/          ← ⭐ CANONICAL SERVICE (port 4702)
│   ├── src/
│   │   ├── index.js         ← v2.0 (in-memory, deprecated)
│   │   └── index.persistent.js ← v3.0 (persistent, CURRENT)
│   ├── corpID-cloud/        ← Phase 2 (22 enterprise microservices)
│   ├── data/                ← Persistent JSON files
│   ├── __tests__/unit/     ← Unit tests
│   ├── tests/smoke.sh       ← Smoke test
│   └── package.json
│
├── customer-support-service/
└── tenant-manager/
```

---

## 🔌 Connectivity Map (How CorpID Connects to Everything)

### RTMN Hub (4399) — Foundation SDK
```
Client → Hub (4399) → CorpID (4702)
         │
         └─ /api/identity/*  (Hub strips prefix, forwards to /auth/*, /api/users/*, etc.)
```
- **Hub route added:** 2026-06-27 (fixed prefix stripping)
- **Env var:** `CORP_ID_URL=http://localhost:4702` (in `REZ-ecosystem-connector`)
- **Canonical path fixed:** `services/corpid-service/` → `companies/HOJAI-AI/platform/identity/corpid-service/`

### TwinOS Hub (4705)
```
TwinOS Hub → reads 'corpid.identity': { port: 4702 } from twin registry
             Links all twins to CorpID entities via corpId field
```
- Twin registry entry: `'corpid.identity': { service: 'corpid-os', port: 4702, type: 'identity', category: 'foundation' }`

### Salar OS (Workforce Intelligence)
```
Salar OS → CORPID_SERVICE_URL=http://localhost:4702
           Links employee twins to CorpID individuals
           Stores corpId on all workforce entities
```

### REZ-SalesMind
```
REZ-SalesMind → TRUST_SERVICE_URL=http://localhost:4702
                Uses CorpID for trust scores in sales intelligence
```

### SUTAR OS (Autonomous Economic Layer)
```
SUTAR Trust Engine → fetches trust scores from CorpID
SUTAR Decision Engine → verifies agent identities via CorpID
```

### dev-stack.sh
```
CORP_ID_CMD="cd .../hojai-ai && PORT=4702 npm start"
start_service "corp-id" "$CORP_ID_CMD" 4702
```
**Startup command:** `npm start` from `corpid-service/` directory

---

## 🏗️ Architecture

### Storage Layer

```
┌─────────────────────────────────────────────────┐
│              @rtmn/shared/lib/persistent-store.js  │
│         MongoDB-like API on JSON file storage     │
│                                                    │
│  createModel('User', { key: 'email' })            │
│  createModel('Business', { key: 'id' })           │
│  createModel('RefreshToken', { key: 'token' })   │
│  createModel('TrustScore', { key: 'corpId' })    │
│  createModel('ApiKey', { key: 'id' })             │
│  createModel('Namespace', { key: 'name' })        │
└─────────────────────────────────────────────────┘
                           │
              writes to: companies/HOJAI-AI/platform/identity/corpid-service/data/
                           │
              ┌────────────┼────────────┐
              ▼            ▼             ▼
         users.json  businesses.json  refreshtokens.json
         trustscores.json  api-keys.json  namespaces.json
```

> ⚠️ **Known Issue (from June 21 audit):** Data stored in plaintext JSON files. For production, encrypt at rest or migrate to MongoDB.

### Request Flow

```
HTTP Request
    │
    ▼
RTMN Hub (4399)
    │  strips /api/identity prefix
    ▼
CorpID (4702) — index.persistent.js
    │
    ├── Rate Limiters
    │     ├── authLimiter: 5 attempts / 15min
    │     ├── defaultLimiter: 100 requests / min
    │     └── strictLimiter: 20 requests / min
    │
    ├── Security Middleware
    │     ├── Helmet (CSP headers)
    │     ├── CORS (configurable origins)
    │     ├── Prototype Pollution Sanitization
    │     └── Request ID tracking
    │
    ├── Auth Middleware
    │     ├── requireAuth (JWT Bearer)
    │     ├── requireRole (...roles)
    │     └── requireBusiness
    │
    └── Routes
          ├── /auth/* (register, login, refresh, logout, me, verify)
          ├── /api/users/* (CRUD)
          ├── /api/businesses/* (CRUD)
          ├── /api/profile/* (own profile + password change)
          ├── /api/trust/score/:corpId (GET + PUT)
          ├── /api/namespaces/* (CRUD)
          ├── /api/api-keys/* (CRUD)
          ├── /health
          └── /ready
                │
                ▼
          PersistentStore (JSON file)
```

---

## 🔐 Security Architecture (L-1 through L-5)

| Fix | ID | What it does |
|-----|----|-------------|
| **L-1** | Error IDs only in dev | `errorId` only leaked in `NODE_ENV=development` |
| **L-2** | Password field silently dropped | `PUT /api/users/:id` ignores `password` field — must use `/api/profile/password` |
| **L-3** | CSP imgSrc allowlist | `imgSrc` restricted to `self`, `data:`, `*.rtmn.com`, `*.rez.money` — not `*` |
| **L-4** | No user enumeration | `REGISTRATION_FAILED` for both duplicate email AND duplicate businessId |
| **L-5** | Account lockout | 5 failed logins → 15min lockout → exponential doubling → 24h max |

### Additional Security Features
- ✅ bcrypt hashing (12 rounds)
- ✅ JWT with issuer validation (`rtmn-corpid`)
- ✅ Separate access + refresh tokens
- ✅ Token rotation on refresh
- ✅ Refresh token server-side revocation
- ✅ Rate limiting on all auth endpoints
- ✅ Input validation (express-validator)
- ✅ Helmet security headers
- ✅ No hardcoded default password (BOOTSTRAP_ADMIN_EMAIL env var)

---

## 📡 API Reference

### Auth Endpoints (prefix: `/auth/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register user + business |
| POST | `/auth/login` | No | Login, get tokens |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | Yes | Logout, revoke refresh token |
| POST | `/auth/verify` | Optional | Verify JWT token (for Hub/downstream services) |
| GET | `/auth/me` | Yes | Get current user info |

### User Management (prefix: `/api/users/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | admin | List users |
| GET | `/api/users/:id` | Yes | Get user by ID |
| POST | `/api/users` | admin/manager | Create user |
| PUT | `/api/users/:id` | Yes | Update user |
| DELETE | `/api/users/:id` | admin | Delete user |

### Trust Scores (prefix: `/api/trust/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/trust/score/:corpId` | No | Get trust score |
| PUT | `/api/trust/score/:corpId` | admin | Set trust score |
| GET | `/api/trust/levels` | No | Get all trust levels |

### Other Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/businesses` | admin | List businesses |
| GET | `/api/businesses/:id` | Yes | Get business |
| GET | `/api/profile` | Yes | Get own profile |
| PUT | `/api/profile` | Yes | Update own profile |
| PUT | `/api/profile/password` | Yes | Change password |
| POST | `/api/api-keys` | Yes | Create API key |
| GET | `/api/api-keys` | Yes | List own API keys |
| DELETE | `/api/api-keys/:id` | Yes | Revoke API key |
| POST | `/api/namespaces` | Yes | Create namespace |
| GET | `/api/namespaces` | Yes | List namespaces |
| DELETE | `/api/namespaces/:name` | Yes | Delete namespace |
| GET | `/health` | No | Liveness check |
| GET | `/ready` | No | Readiness check |

---

## 🧪 Testing

```bash
# Run all unit tests (43 tests)
cd companies/HOJAI-AI/platform/identity/corpid-service
npm test                    # vitest run (auth flow + user management + trust)

# Watch mode
npm run test:watch

# Smoke test
npm run test:smoke

# Manual health check
curl http://localhost:4702/health
```

**Test coverage:** Auth flow (18 tests) + User management + Trust scores + API keys + Namespaces (25 tests) = **43 tests passing** ✅

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 4702 | Service port |
| `JWT_SECRET` | **Yes** | — | JWT signing key (min 32 bytes) |
| `JWT_EXPIRES_IN` | No | `1h` | Access token TTL |
| `REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `CORS_ORIGINS` | No | `*` | Comma-separated allowed origins |
| `BOOTSTRAP_ADMIN_EMAIL` | No | — | If set, seeds initial admin user |
| `NODE_ENV` | No | `development` | `development`, `production`, `test` |

---

## 🔄 CorpID in the Ecosystem (Full Picture)

```
                              RTMN Hub (4399)
                              ┌──────────────────────────────────────┐
                              │ /api/identity/* ──────────────────────► CorpID (4702)
                              │ /api/memory/* ──────────────────────► MemoryOS (4703)
                              │ /api/twins/* ───────────────────────► TwinOS (4705)
                              │ /api/sutar/* ────────────────────────► SUTAR OS
                              │ /api/nexha/* ───────────────────────► Nexha
                              └──────────────────────────────────────┘
                                                 │
         ┌──────────────────────────────────────┼──────────────────────────────┐
         │                                      │                              │
         ▼                                      ▼                              ▼
   TwinOS Hub (4705)                    Salar OS (4710)               REZ-SalesMind (5170)
   Links twins to CorpID                 Links workforce                Uses trust scores
   entities via corpId field             twins to CorpID                from CorpID
                                                 │
                                                 ▼
                                         All 86+ Digital Twins
                                         (stored with corpId link)
                                                 │
         ┌──────────────────────────────────────┼──────────────────────────────┐
         │                                      │                              │
         ▼                                      ▼                              ▼
   SUTAR Trust Engine                   SUTAR Decision                  All 26 Industry OS
   Queries CorpID for                   Engine verifies                  Create entities
   trust scores of                       agent CorpIDs                     → Each gets CorpID
   merchants/agents                                                     ──► Stored in CorpID
```

---

## 📊 Data Model

### User
```javascript
{
  id: String,           // "user-a1b2c3d4"
  email: String,        // "alice@example.com" (unique, lowercase)
  passwordHash: String,  // bcrypt hash
  name: String,
  role: String,         // 'superadmin' | 'admin' | 'manager' | 'user'
  businessId: String,   // links to Business
  status: String,      // 'active' | 'inactive' | 'suspended'
  preferences: Object,
  createdAt: String,    // ISO timestamp
  updatedAt: String    // ISO timestamp
}
```

### Business
```javascript
{
  id: String,           // "acme-corp" (unique)
  name: String,
  industry: String,
  plan: String,         // 'starter' | 'professional' | 'enterprise'
  status: String,      // 'active' | 'inactive' | 'suspended'
  createdAt: String,
  updatedAt: String
}
```

### TrustScore
```javascript
{
  corpId: String,      // e.g., "CI-BIZ-ABC123"
  score: Number,        // 0-100
  level: String,         // 'platinum' | 'gold' | 'silver' | 'bronze' | 'iron' | 'restricted'
  lastUpdated: String,
  history: Array         // [{ score, source, by, at }] — last 50 entries
}
```

### Trust Levels
| Level | Score Range | Badge |
|-------|-------------|-------|
| Platinum | 90–100 | 🏆 |
| Gold | 80–89 | ⭐ |
| Silver | 70–79 | 🥈 |
| Bronze | 50–69 | 🥉 |
| Iron | 30–49 | ⚙️ |
| Restricted | 0–29 | ⚠️ |

---

## 🔧 CorpID-Lite (REZ-Workspace — Deprecated)

A **separate** CorpID implementation exists at `companies/REZ-Workspace/services/corpid-service/`:

| Aspect | HOJAI AI (Canonical) | REZ-Workspace (Lite) |
|--------|---|---|
| **Storage** | Persistent JSON via `@rtmn/shared` | Redis |
| **Entities** | User + Business only | 10 entity types (INDIVIDUAL, BUSINESS, AGENT, etc.) |
| **Auth** | JWT + bcrypt | None (API key only) |
| **Security** | L-1 through L-5 | Basic |
| **Route prefix** | `/auth/`, `/api/users/` | `/api/identity/`, `/api/trust/`, `/api/relationships/` |
| **Status** | ✅ **Canonical** | ⚠️ Deprecated — merged into CorpID v3.0 |

---

## 🏢 CorpID Cloud (Phase 2 — Not Wired)

A **separate enterprise suite** exists at `companies/HOJAI-AI/platform/identity/corpid-service/corpID-cloud/` with **22 microservices**:

| Phase | Services | Port Range |
|-------|----------|------------|
| Phase 1 (Foundation) | Core Auth, Organization, RBAC, API Identity, Device, Audit | 4702 (gateway) |
| Phase 2 (Enterprise) | Consumer, Merchant, AI Agent, Trust Engine, Employee | Gateway |
| Phase 3 (Advanced) | Identity Graph, Universal Profile, Memory, Timeline | Gateway |
| Phase 4 (Compliance) | KYC, Consent, Federation, Identity Twin, Developer, Verification | Gateway |

⚠️ **Not currently wired** — `gateway.js` exists but is not mounted by `index.persistent.js`. This is a Phase 2 integration task.

---

## 🚀 Startup

```bash
# From corpid-service directory
cd companies/HOJAI-AI/platform/identity/corpid-service
npm install                  # already done (node_modules + @rtmn/shared symlink present)
npm start                   # starts index.persistent.js on port 4702

# Or via dev-stack
bash scripts/dev-stack.sh start  # starts CorpID along with 85+ services

# Health check
curl http://localhost:4702/health
curl http://localhost:4702/ready

# Via Hub
curl http://localhost:4399/api/identity/health
```

---

## 📚 Related Documentation

- [HOJAI AI Audit (2026-06-21)](HOJAI-AI-AUDIT-REPORT-2026-06-21.md) — Full security audit
- [HOJAI AI Audit (2026-06-22)](../HOJAI-AI-AUDIT-REPORT-2026-06-21.md) — Production readiness audit
- [RTMN Canonical Port Registry](../../CANONICAL-PORT-REGISTRY.md) — All service ports
- [RTMN Hub (REZ-ecosystem-connector)](../../../RABTUL-Technologies/REZ-ecosystem-connector/README.md) — Hub routes
- [TwinOS Hub](../../twins/twinos-hub/) — Twin ↔ CorpID integration
- [CorpID Consolidation Plan](../../../../.claude/plans/corpid-consolidation-plan.md) — This fix plan

---

*CorpID v3.0 — Universal Identity for the Autonomous Economy*
