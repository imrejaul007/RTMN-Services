# CorpID — Universal Identity Service

> **Canonical:** `companies/HOJAI-AI/platform/identity/corpid-service/`
> **Version:** 3.0.0 (Persistent)
> **Port:** 4702
> **Status:** ✅ Canonical — running via `dev-stack.sh`
> **Hub Route:** `http://localhost:4399/api/identity/*` → `http://localhost:4702`
> **Tests:** 44 vitest unit tests passing
> **Updated:** 2026-06-27

---

## Quick Start

```bash
# Via dev-stack (recommended — starts 85+ services)
bash scripts/dev-stack.sh start

# Standalone
cd companies/HOJAI-AI/platform/identity/corpid-service
npm start   # starts index.persistent.js on port 4702

# Run tests
npm test    # 44 tests passing

# Health check
curl http://localhost:4702/health
curl http://localhost:4399/api/identity/health   # via Hub
```

---

## What it Does

CorpID is RTMN's **Universal Identity Service** — every entity gets a CorpID:
- **Humans**: employees, customers, merchants, drivers, founders
- **Businesses**: companies, franchises, partners
- **AI Agents**: autonomous agents, bots
- **Machines**: IoT, equipment
- **Products**: SKUs, services, bundles

## Key Features

- JWT auth (access + refresh tokens)
- RBAC (superadmin, admin, manager, user)
- Trust scores (0-100, 6 levels)
- API keys
- Namespaces
- Bootstrap admin via `BOOTSTRAP_ADMIN_EMAIL` env var

## Security (L-1 through L-5)

- L-1: Error IDs only in dev
- L-2: Password field silently dropped on user update
- L-3: CSP imgSrc restricted to allowlist
- L-4: No user enumeration (generic REGISTRATION_FAILED)
- L-5: Account lockout with exponential backoff

## Connected Services

| Service | How it connects |
|---------|---------------|
| **RTMN Hub (4399)** | `/api/identity/*` → CorpID (4702) |
| **TwinOS Hub (4705)** | Twin registry → links twins to CorpID entities |
| **Salar OS** | `CORPID_SERVICE_URL=http://localhost:4702` |
| **REZ-SalesMind** | `TRUST_SERVICE_URL=http://localhost:4702` |
| **dev-stack.sh** | Starts CorpID on port 4702 |

## Full Documentation

See [CORPID-ARCHITECTURE.md](CORPID-ARCHITECTURE.md) for complete details including:
- Connectivity map
- API reference (all endpoints)
- Data model
- Trust levels
- Security architecture
- CorpID-Lite (deprecated REZ-Workspace copy)
- CorpID Cloud Phase 2 (not wired)

## Deprecated

- `companies/REZ-Workspace/services/corpid-service/` — CorpID-Lite (Redis-based, no JWT, port collision) → see `DEPRECATED.md`
- `src/index.js` — v2.0 in-memory (deprecated, use `index.persistent.js`)
- `corpID-cloud/` — Phase 2 enterprise suite (22 microservices, not wired)

---

*CorpID v3.0 — Universal Identity for the Autonomous Economy*
