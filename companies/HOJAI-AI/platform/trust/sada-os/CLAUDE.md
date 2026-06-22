# CLAUDE.md — SADA OS (Trust, Governance & Risk)

> **Status:** ✅ Moved to HOJAI AI on 2026-06-21
> **Old path:** `companies/CorpPerks/Sada-os/`
> **New path:** `companies/HOJAI-AI/platform/trust/sada-os/`
> **Package name:** `@hojai/sada-os`
> **Port:** 4190 (default)

---

## What SADA OS is

**SADA = Trust + Governance + Risk + Verification** — the unified trust infrastructure for the HOJAI AI ecosystem.

SADA tracks and scores trust for every entity in the system (humans, AI agents, businesses, products) and enforces policies across all services. It is the **single source of truth for "should we trust this entity?"** across HOJAI AI, RTMN, and connected services.

### One-line definition

> Given an entity ID and an action, SADA answers: *Can we trust them? Are they allowed? What's the risk? Have they been verified?*

---

## The 4 Modules

### 1. Trust Service (`trustService.ts`, 555 LOC)
Calculates and serves trust scores from behavioral history.

**Scoring formula** (lines 25-52 of `trustService.ts`):
```
overall = reliability * 0.35
        + quality * 0.25
        + compliance * 0.20
        + 50 * 0.20   // base score contribution
```

Where:
- `reliability` = success rate of past transactions (0-100)
- `quality` = inverse dispute rate (0-100)
- `compliance` = inverse failure rate (0-100)

**Trust Router endpoints** (mounted at `/trust/v2`):
- `POST /trust/v2/` — create trust record
- `GET /trust/v2/:entityId` — fetch trust score
- `POST /trust/v2/:entityId/activity` — log a new activity
- `GET /trust/v2/:entityId/history` — fetch history
- `GET /trust/v2/:entityId/trends` — trends over time
- `POST /trust/v2/bulk` — bulk fetch
- `GET /trust/v2/leaderboard/all` — top-trusted entities
- `POST /trust/v2/:entityId/suspend` — suspend
- `POST /trust/v2/:entityId/reactivate` — reactivate

### 2. Governance (`policy.ts` models + inline routes)
Policy management and compliance checking.

**Endpoints:**
- `GET /governance/policies` — list all policies
- `POST /governance/policies` — create policy
- `POST /governance/validate` — validate action against policies

### 3. Risk (`risk.ts` models + inline routes)
Risk assessment, fraud detection, anomaly modeling.

**Endpoints:**
- `POST /risk/assess` — assess risk for entity + action
- `GET /risk/:entityId` — get current risk profile
- `GET /risk/:entityId/history` — risk history

### 4. Verification (`verification.ts` models + inline routes)
KYC, KYB, and AI-agent verification.

**Endpoints:**
- `POST /verification` — initiate verification
- `GET /verification/:entityId` — get verification status
- `POST /verification/:verificationId/approve` — approve
- `GET /verification` — list all verifications

### Plus
- `GET /audit` — audit log across all modules

---

## Architecture & Dependencies

```
┌──────────────────────────────────────────┐
│  HOJAI AI Platform / Trust / SADA OS     │
│  Port 4190                               │
└──────────────────────────────────────────┘
              │
              ├── reads → CorpID (4702) — universal identity
              ├── reads → Salar OS (4710) — capability profiles
              ├── reads → TwinOS Hub (4705) — twin metadata
              └── reads → blr-ai-marketplace — provider verification
```

**Stack:** Node.js 20+ · Express 4 · TypeScript · MongoDB · Mongoose · Helmet · Compression · Pino logger (via `@rtmn/shared/lib/logger`)

---

## Trust Score Bands (proposed)

| Band | Score | Use case |
|------|------:|----------|
| Platinum | 90-100 | Auto-approve all actions |
| Gold | 80-89 | Auto-approve most actions |
| Silver | 70-79 | Manual review for high-risk actions |
| Bronze | 50-69 | Manual review always |
| Restricted | 0-29 | Block |

(Note: bands are illustrative — the API returns numeric scores; banding is up to consumers.)

---

## Configuration (env vars)

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | 4190 | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/sada` | Mongo connection |
| `INTERNAL_SERVICE_TOKEN` | (required) | Service-to-service auth |
| `CORPID_SERVICE_URL` | `http://localhost:4702` | CorpID for identity |
| `SALAR_SERVICE_URL` | `http://localhost:4710` | Salar OS for capability profiles |
| `ALLOWED_ORIGINS` | `*` | CORS allow-list |

---

## What changed in the move (2026-06-21)

| Before (CorpPerks/Sada-os) | After (HOJAI-AI/platform/trust/sada-os) |
|---|---|
| `@corpperks/shared` (file: `../shared`) | `@rtmn/shared` (file: `../../../shared`) |
| `secureCors()` from corpperks/shared | `cors({ origin, credentials: true })` |
| `logger` from `'../../shared/logger'` (broken relative path) | `createLogger('sada-os')` via `@rtmn/shared/lib/logger` |
| `requiredEnv` from corpperks/shared | Native `process.env.X \|\| default` |
| `authMiddleware` bypassed all requests | Now requires `x-internal-token` OR `Authorization: Bearer ...` |
| `modules/trustService.ts` was **orphaned** (router exported but never imported) | Now mounted at `/trust/v2` |
| Package name `sada-os` | Package name `@hojai/sada-os` |

---

## What's still TODO (not in this move)

- **Trust Router duplication**: inline routes at `/trust/*` (lines 133-289) duplicate some functionality of `trustRouter` at `/trust/v2/*`. Consider deprecating inline routes after audit.
- Add real test suite (currently zero tests)
- Wire JWT verification against CorpID public key (currently trusts `Bearer` header presence)
- Migrate `risk.ts` inline logic into a dedicated `riskService.ts` module (mirrors the trust module pattern)
- Migrate `verification.ts` inline logic into `verificationService.ts`

---

## How to run

```bash
cd companies/HOJAI-AI/platform/trust/sada-os
npm install
npm run dev       # tsx watch src/index.ts
# or
npm start         # tsx src/index.ts (production-style)

# Health check
curl http://localhost:4190/health
curl http://localhost:4190/health/ready
```

---

## Related services

- **`platform/identity/corpid-service`** (4702) — Universal identity (SADA reads entity metadata)
- **`platform/twins/salar-os`** (4710) — Pulls trust scores from SADA for hybrid team matching
- **`platform/flow/trust-intelligence`** — Higher-level trust reasoning (uses SADA as data source)
- **`platform/flow/risk-intelligence`** — Risk reasoning (currently separate from SADA's risk module; consider merging)
- **`sutar-os/economy/trust-network`** — Network-level trust graph (different from entity trust)

---

*Last updated: 2026-06-21 — moved from `companies/CorpPerks/Sada-os/` to its canonical HOJAI AI home.*