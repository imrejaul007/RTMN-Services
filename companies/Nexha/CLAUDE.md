# NeXha Commerce Network

> **Version:** 1.0.0
> **Status:** ✅ Production Ready
> **Audience:** Developers and operators of the NeXha commerce-identity stack.

---

## What is this directory?

This is the **NeXha commerce-identity stack** — a deployable slice of the
broader NeXha B2B commerce network. It contains:

| Service | Port | Purpose |
|---------|------|---------|
| **commerce-identity** | 8000 | Universal identity for suppliers, buyers, and guests (KYC, reputation, ratings) |
| **sutar-mock** | 4799 | In-process mock of the SUTAR OS trust layer for local dev |
| **portal** | 3000 | Next.js B2B portal (sign in, register, guest onboarding, upgrade) |

> The full NeXha product line (DistributionOS, FranchiseOS, ProcurementOS,
> ManufacturingOS, TradeFinance, Intelligence, Ecosystem Connector, Gateway,
> NextaBizz) lives in the `RTNM-Group/nexha` monorepo on GitHub. That code
> is not in this directory. This directory is the **deployment slice** that
> runs on Render (backend) + Vercel (portal).

The NeXha product is part of the RTMN group of companies (see
`docs/POSITIONING.md` in the parent RTMN repo for the full ecosystem map).

---

## Repository layout

```
companies/Nexha/
├── CLAUDE.md                 # this file
├── README.md                 # (overwritten by Phase 6)
├── SECURITY.md               # security model + known limitations
├── RUNBOOK.md                # operational runbook
├── AUDIT-NOTES.md            # build status + dependency audit
├── DEPLOY.md                 # Render + Vercel deploy guide
├── ONBOARDING.md             # (legacy — see portal docs)
├── FEATURES-LIST.md          # L1 feature inventory
├── docker-compose.yml        # local 4-service stack
├── render.yaml               # Render blueprint
├── Caddyfile                 # local HTTPS reverse proxy
├── .gitignore                # builds, env, vercel metadata
├── commerce-identity/        # Express + Mongoose API
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .env.example
│   ├── README.md             # service-specific docs
│   ├── API.md                # endpoint reference
│   ├── FEATURES.md           # per-feature inventory
│   └── src/
│       ├── index.ts          # entry point
│       ├── app.ts            # Express factory + shutdown
│       ├── config/           # database, logger
│       ├── middleware/       # auth, errors, rate limit
│       ├── models/           # Supplier, Buyer, Guest, Rating
│       ├── services/         # business logic (auth, SUTAR, rep, WhatsApp)
│       ├── routes/           # Express routers
│       └── utils/            # validators, id-gen
├── sutar-mock/               # mock SUTAR for local dev
└── portal/                   # Next.js 16 portal
    ├── package.json
    ├── next.config.ts
    ├── Dockerfile
    ├── .env.example
    ├── app/                   # 11 routes (App Router)
    ├── lib/api.ts             # typed API client
    └── ...
```

---

## Quick Start

### Local dev (docker-compose)

```bash
# 1. Create env file
cp commerce-identity/.env.example commerce-identity/.env
# Edit JWT_SECRET and INTERNAL_API_KEY (or accept the dev placeholders)

# 2. Start the stack
docker compose up --build
```

This brings up MongoDB (27017), sutar-mock (4799), commerce-identity (8000),
and the portal (3000). See `DEPLOY.md` for HTTPS via Caddy.

### Local dev (without docker)

Requires Node.js 20+ and a running MongoDB.

```bash
# Terminal 1: SUTAR mock
cd sutar-mock && npm install && npm run dev

# Terminal 2: commerce-identity
cd commerce-identity && npm install && npm run dev

# Terminal 3: portal
cd portal && npm install && npm run dev
```

Verify health:
```bash
curl http://localhost:8000/health
curl http://localhost:4799/health
# Open http://localhost:3000
```

### Production deploy

See [DEPLOY.md](DEPLOY.md) for the full Render + Vercel guide. Brief:

1. Push this directory to `github.com/RTNM-Group/nexha` (separate repo — see
   `RUNBOOK.md` § "Repo split plan").
2. `render blueprints create --file render.yaml` from the Render dashboard.
3. Set `JWT_SECRET`, `INTERNAL_API_KEY`, `MONGODB_URI`, `ALLOWED_ORIGINS`,
   and `SUTAR_*_URL` env vars in the Render dashboard.
4. Import the `portal/` folder to Vercel, set `NEXT_PUBLIC_API_URL` to the
   Render URL of `nexha-commerce-identity`.

---

## Architecture (L1 only)

```
                  ┌──────────────────┐
                  │  Next.js Portal  │
                  │  (Vercel :3000)  │
                  └────────┬─────────┘
                           │ HTTPS (cookies)
                           ▼
                  ┌──────────────────┐         ┌──────────────────┐
                  │ commerce-identity│ ──────► │   sutar-mock     │
                  │  (Render :8000)  │ (best-  │  (Render :4799)  │
                  │                  │ effort) │  or real SUTAR   │
                  └────────┬─────────┘         └──────────────────┘
                           │
                           ▼
                     MongoDB Atlas
                  (Render add-on or external)
```

### Auth model

Authentication is via **JWT issued by commerce-identity itself**. The JWT
is set as an httpOnly cookie on login/register/verify-otp. The portal
sends the cookie automatically with `credentials: 'include'`. Server-to-server
callers can still send `Authorization: Bearer <token>`.

Roles are derived from the persisted entity (Supplier vs Buyer) — not from
the corpId string prefix. See [SECURITY.md](SECURITY.md) for the full
threat model and known limitations.

### SUTAR integration

SUTAR (the RTMN trust layer) is called best-effort on identity events:

- `corpid/issue` (when minting a new identity)
- `trust/link` (when registering a supplier/buyer)
- `trust/sync` (after every rating, pushed via the SutarBridgeService)
- `policy/evaluate` (before status changes and credit-limit changes)
- `events/publish` (on registration, status changes, guest activation,
  guest conversion)

If SUTAR is unreachable, the corresponding operation falls back to a
local-only path. Commerce onboarding never blocks on SUTAR availability.

In dev, `SUTAR_*_URL` all point at the local `sutar-mock`. In production
they should point at real SUTAR endpoints (or stay pointing at the mock
if a real SUTAR isn't yet available — see `RUNBOOK.md` § "SUTAR mock in
production").

---

## API surface

The full endpoint reference is in [`commerce-identity/API.md`](commerce-identity/API.md).
High-level summary:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness probe |
| POST | `/api/auth/login` | Email + password login |
| POST | `/api/auth/register` | Set initial password (corpId must exist) |
| POST | `/api/auth/logout` | Clear the auth cookie |
| POST | `/api/auth/guest-token` | Exchange OTP for a guest JWT |
| GET | `/api/auth/me` | Return current identity |
| POST | `/api/corpid/issue` | Mint a new CorpID (strict auth) |
| POST | `/api/suppliers` | Register a supplier (self) |
| GET | `/api/suppliers/:corpId` | Public profile (PII gated to self/admin) |
| GET | `/api/suppliers` | Search suppliers |
| PATCH | `/api/suppliers/:corpId/status` | Change status (policy-gated) |
| POST | `/api/guest-suppliers/onboard` | Public WhatsApp-OTP registration |
| POST | `/api/guest-suppliers/:guestId/verify-otp` | Verify OTP, activate |
| POST | `/api/guest-suppliers/:guestId/convert` | Convert guest to full supplier |
| GET | `/api/buyers/:corpId` | Get buyer (self/admin only) |
| GET | `/api/buyers` | Search buyers (PII-stripped) |
| POST | `/api/ratings` | Submit a rating (rater from JWT) |
| GET | `/api/ratings/:corpId` | List ratings |

All `/api/*` routes are subject to:
- `defaultLimiter`: 100 req/min/IP
- `strictLimiter` on `auth/login`, `auth/register`, `corpid/issue`, and
  guest onboarding/verify: 20 req/min/IP

---

## Security highlights

See [SECURITY.md](SECURITY.md) for the full threat model.

Quick summary of what's hardened:

- ✅ JWT-based auth with role derived from DB (not corpId prefix)
- ✅ httpOnly cookies for browser sessions (XSS-safe)
- ✅ bcrypt password hashing (cost 12), bcrypt OTP hashing (cost 8)
- ✅ Timing-safe comparison for internal-key auth
- ✅ Rate limiting on every `/api/*` route
- ✅ CORS with exact origin match (no wildcards)
- ✅ Ownership checks on every per-corpId endpoint
- ✅ Public endpoints are explicitly labeled and rate-limited
- ✅ Fail-fast in production if `JWT_SECRET` is unset

Known limitations (documented in SECURITY.md):

- ⚠️ Bank account numbers stored unencrypted in Mongoose
- ⚠️ Dev OTP codes are logged to console + SUTAR event bus (intentional for
  dev; document in runbook before any non-dev deploy)
- ⚠️ No phone-OTP brute-force protection beyond rate limit (intentional —
  RisaCare-style integrations rely on this)

---

## Operational status

See [AUDIT-NOTES.md](AUDIT-NOTES.md) for the latest build + dependency
audit. As of 2026-06-21:

- ✅ All 3 services type-check and build cleanly
- ✅ `npm audit --omit=dev`: 0 vulnerabilities in commerce-identity and
  sutar-mock; 2 moderate in portal (Next.js + postcss, accepted risk)

---

## Related documentation

| Doc | Purpose |
|-----|---------|
| [DEPLOY.md](DEPLOY.md) | Render + Vercel deploy guide |
| [RUNBOOK.md](RUNBOOK.md) | Operational runbook (secrets, monitoring, common issues, repo split plan) |
| [SECURITY.md](SECURITY.md) | Threat model, security guarantees, known limitations |
| [AUDIT-NOTES.md](AUDIT-NOTES.md) | Build status, dependency audit, advisory log |
| [FEATURES-LIST.md](FEATURES-LIST.md) | L1 feature inventory |
| [commerce-identity/README.md](commerce-identity/README.md) | commerce-identity service docs |
| [commerce-identity/API.md](commerce-identity/API.md) | Endpoint reference |
| [commerce-identity/FEATURES.md](commerce-identity/FEATURES.md) | Per-feature inventory |
| [portal/README.md](portal/README.md) | Portal docs (Next.js app) |

---

*Last updated: 2026-06-21 (Phase 6 of NEXHA-DEEP-AUDIT.md)*
