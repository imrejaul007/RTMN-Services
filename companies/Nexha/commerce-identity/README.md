# @nexha/commerce-identity

> Universal identity for suppliers, buyers, and guests in the B2B commerce network.

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Port:** 8000  
**Stack:** Node.js 18+ · TypeScript · Express · MongoDB · Mongoose

---

## What is this?

`commerce-identity` is the foundation of the **NeXha** B2B commerce network. It manages
the digital identity of every supplier and buyer on the platform, plus a special
**guest supplier** flow that lets small vendors join *without* GST documentation.

The service handles three big problems:

1. **KYC and verification** — GSTIN/PAN/IFSC format checks, document upload metadata,
   status transitions (pending → active → verified → suspended).
2. **Guest onboarding** — a frictionless WhatsApp-OTP path for suppliers who don't have
   GST yet. They get a temporary `GST-XXXXXXXX` ID, can quote on RFQs immediately,
   and convert to a full supplier record later.
3. **Reputation** — a rating + auto-scoring pipeline that aggregates delivery, quality,
   payment, and response signals into a single 0-100 trust score. The score is mirrored
   to SUTAR OS (port 4251) so other RTMN services can use it.

The service bridges to **SUTAR OS** (the trust layer of the RTMN ecosystem) so identity
operations are first-class citizens of the wider platform: CorpID issuance, trust-score
linking, policy authorization, and event bus publishing all flow through the
[SUTAR bridge](src/services/sutar-bridge.service.ts).

---

## Features

| Category | Capabilities |
|----------|-------------|
| **Supplier KYC** | Registration, GSTIN/PAN/IFSC validation, document management, status transitions, tier upgrades |
| **Buyer Onboarding** | Business / individual / government / NGO / institution types, GSTIN & PAN, credit lines, order history |
| **Guest Suppliers** | No-GST signup, WhatsApp OTP, 30-day validity, automatic conversion to full supplier on GST submission |
| **Search** | Category, city, state, tier, score, and status filters with pagination |
| **Reputation Pipeline** | Manual ratings (1-5 stars), auto-scoring from delivery/quality/payment metrics, weighted aggregation, trend detection |
| **SUTAR Integration** | CorpID issuance, trust-score linking, policy authorization, event publishing |

See [FEATURES.md](FEATURES.md) for the full list.

---

## Quick Start

```bash
# 1. Install (already done — node_modules is committed at the project level)
# cd to this folder if not already
cd companies/Nexha/commerce-identity

# 2. Copy environment template
cp .env.example .env
# Edit MONGODB_URI and INTERNAL_API_KEY

# 3. Run in dev mode (uses ts-node)
npm run dev

# 4. Or build and run compiled JS
npm run build
npm start
```

Health check:

```bash
curl http://localhost:8000/health
# {
#   "success": true,
#   "service": "commerce-identity",
#   "version": "1.0.0",
#   "status": "healthy",
#   "uptime": 12.34,
#   "timestamp": "2026-06-15T..."
# }
```

---

## Architecture

```
                   ┌─────────────────────┐
                   │   SUTAR OS          │
                   │  CorpID (4702)      │
                   │  Reputation (4251)  │
                   │  Decision (4240)    │
                   └──────────▲──────────┘
                              │ (HTTP, best-effort)
                              │
   ┌──────────────────────────┴──────────────────────────┐
   │                commerce-identity                    │
   │                                                      │
   │   routes/  ───►  services/  ───►  models/           │
   │   ├ suppliers  ├ supplier       ├ Supplier          │
   │   ├ buyers     ├ buyer          ├ Buyer             │
   │   ├ guest      ├ guest          ├ GuestSupplier     │
   │   ├ ratings    ├ reputation     └ Rating            │
   │   └ corpid     └ sutar-bridge                       │
   │                                                      │
   │   middleware/  utils/                                │
   │   ├ auth       ├ validators (GSTIN/PAN/IFSC)        │
   │   └ error      └ id-generator (guest IDs, OTPs)      │
   └──────────────────────────────────────────────────────┘
                              │
                              ▼
                         MongoDB
```

The `services/` layer is framework-agnostic — it's plain TypeScript classes with
static methods. The `routes/` layer is the Express adapter. This split makes
service code easy to unit-test and reuse from other transports (CLI, queue worker,
cron job, etc.).

---

## API Overview

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/health` | Liveness probe |
| POST   | `/api/corpid/issue` | Request a CorpID from SUTAR (or local fallback) |
| POST   | `/api/suppliers` | Register a supplier |
| GET    | `/api/suppliers/:corpId` | Get a supplier (PII hidden unless self) |
| GET    | `/api/suppliers` | Search suppliers (category, city, tier, score) |
| PATCH  | `/api/suppliers/:corpId/status` | Change status (policy-gated) |
| PATCH  | `/api/suppliers/:corpId/tier` | Upgrade/downgrade tier |
| POST   | `/api/suppliers/:corpId/categories` | Add categories |
| GET    | `/api/suppliers/:corpId/reputation` | Get reputation summary |
| POST   | `/api/suppliers/:corpId/auto-score` | Run auto-pipeline scoring (system-only) |
| POST   | `/api/buyers` | Register a buyer |
| GET    | `/api/buyers/:corpId` | Get a buyer |
| GET    | `/api/buyers` | Search buyers |
| PATCH  | `/api/buyers/:corpId/status` | Change status |
| POST   | `/api/buyers/:corpId/orders` | Record completed order |
| POST   | `/api/buyers/:corpId/credit` | Adjust credit usage |
| PATCH  | `/api/buyers/:corpId/credit-limit` | Set credit limit (policy-gated) |
| GET    | `/api/buyers/:corpId/reputation` | Get reputation summary |
| POST   | `/api/guest-suppliers/onboard` | Public WhatsApp-OTP registration |
| POST   | `/api/guest-suppliers/:guestId/verify-otp` | Verify OTP & activate |
| POST   | `/api/guest-suppliers/:guestId/resend-otp` | Resend OTP |
| POST   | `/api/guest-suppliers/:guestId/convert` | Convert guest to full supplier |
| GET    | `/api/guest-suppliers/:guestId` | Get guest (no OTP history exposed) |
| GET    | `/api/guest-suppliers` | List active guests (internal) |
| POST   | `/api/guest-suppliers/:guestId/events` | Record RFQ/quote/deal events |
| POST   | `/api/ratings` | Submit a rating |
| GET    | `/api/ratings/:corpId` | List ratings for a subject |

Full request/response examples in [API.md](API.md).

---

## Authentication

The middleware (`src/middleware/auth.middleware.ts`) supports four auth
modes, checked in priority order:

| Mode | How it works | Used by |
|------|--------------|---------|
| **`jwt-cookie`** | `nexha_token` httpOnly cookie, JWT verified with issuer/audience | Browser callers (the portal) |
| **`jwt-bearer`** | `Authorization: Bearer <token>` header, JWT verified | Server-to-server callers |
| **`internal-key`** | `x-internal-key` header (timing-safe compare) | Service-to-service calls |
| **`public`** | no auth required | health checks, guest onboarding, login, register, corpId issue |

In all JWT modes the role is **derived from the persisted entity** (Supplier
→ `supplier`, Buyer → `buyer`) — the request body never influences the role.
Admin role is reserved for tokens explicitly issued by an internal process.

**Cookies vs Bearer:** the browser portal uses `credentials: 'include'` and
relies on the httpOnly `nexha_token` cookie set by `/api/auth/login`,
`/api/auth/register`, and `/api/auth/guest-token`. Server-to-server callers
can keep using `Authorization: Bearer <token>` and the same JWT verification
applies.

**Production JWT_SECRET requirement:** in production (`NODE_ENV=production`),
the service refuses to start if `JWT_SECRET` is unset or set to the dev
placeholder. Generate one with `openssl rand -hex 32`.

**Logout:** `POST /api/auth/logout` clears the cookie. The token itself
remains valid until its `exp` claim, so the server side doesn't need a
revocation list for L1.

Routes opt in to a specific mode by chaining `requireAuth('strict' | 'guest' | 'public')`.
`strict` accepts JWT or internal-key; `guest` accepts JWT, internal-key,
or guest-token; `public` skips auth entirely.

---

## SUTAR OS Integration

The service calls out to SUTAR through `SutarBridgeService` (`src/services/sutar-bridge.service.ts`)
in five places — all best-effort, all logged, no caller blocked on SUTAR availability:

| Operation | SUTAR endpoint | Used by |
|-----------|---------------|---------|
| Issue a new CorpID | `POST {SUTAR_IDENTITY_URL}/corpid/issue` | `POST /api/corpid/issue` (strict auth) |
| Link a trust score | `POST {SUTAR_REPUTATION_URL}/trust/link` | Supplier/buyer registration |
| Sync reputation | `POST {SUTAR_REPUTATION_URL}/trust/sync` | After every rating submission (via `ReputationService.maybePushToSutar` → `SutarBridgeService.pushReputation`) |
| Authorize action | `POST {SUTAR_DECISION_URL}/policy/evaluate` | Status changes, credit-limit changes |
| Publish event | `POST {SUTAR_EVENT_BUS_URL}/events/publish` | Registration, status changes, guest activation, conversion |

The four `SUTAR_*_URL` env vars all default to `SUTAR_BASE_URL` when unset
(Phase 4.5 of NEXHA-DEEP-AUDIT.md). In dev, `SUTAR_BASE_URL=http://localhost:4799`
points at the local sutar-mock, which exposes all five endpoints on one host.
In prod, set the per-service URLs to the real SUTAR layout.

If SUTAR is unreachable, local fallbacks keep commerce onboarding working:
CorpID is generated locally, trust-score link is deferred, reputation sync
retries on the next rating. Commerce never blocks on SUTAR availability.

---

## Project Structure

```
commerce-identity/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── API.md
├── FEATURES.md
└── src/
    ├── index.ts                  # entry point
    ├── app.ts                    # express app factory + shutdown
    ├── config/
    │   ├── logger.ts             # winston
    │   └── database.ts           # mongoose connect/disconnect
    ├── middleware/
    │   ├── auth.middleware.ts    # requireAuth (4 modes: jwt-cookie, jwt-bearer, internal-key, public)
    │   ├── error.middleware.ts   # asyncHandler, HttpError
    │   └── rate-limit.middleware.ts # defaultLimiter (100/min), strictLimiter (20/min)
    ├── models/
    │   ├── supplier.model.ts     # Mongoose schema
    │   ├── buyer.model.ts
    │   ├── guest-supplier.model.ts
    │   └── rating.model.ts
    ├── services/
    │   ├── supplier.service.ts
    │   ├── buyer.service.ts
    │   ├── guest-supplier.service.ts
    │   ├── reputation.service.ts
    │   └── sutar-bridge.service.ts
    ├── routes/
    │   ├── supplier.routes.ts
    │   ├── buyer.routes.ts
    │   ├── guest.routes.ts
    │   ├── rating.routes.ts
    │   └── corpid.routes.ts
    └── utils/
        ├── validators.ts         # GSTIN/PAN/IFSC/pincode/phone
        └── id-generator.ts       # guest IDs, OTPs, promo codes
```

---

## Scripts

```bash
npm run dev         # ts-node dev mode (auto-reload not enabled)
npm run build       # tsc → dist/
npm start           # node dist/index.js
npm run type-check  # tsc --noEmit
```

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8000` | HTTP port |
| `NODE_ENV` | `development` | Runtime mode |
| `LOG_LEVEL` | `info` | Winston log level |
| `MONGODB_URI` | `mongodb://localhost:27017/nexha_commerce_identity` | MongoDB connection |
| `SUTAR_BASE_URL` | `http://localhost:4799` | SUTAR base URL (dev: sutar-mock) |
| `SUTAR_IDENTITY_URL` | _derived from SUTAR_BASE_URL_ | CorpID service |
| `SUTAR_REPUTATION_URL` | _derived from SUTAR_BASE_URL_ | Trust-score service |
| `SUTAR_DECISION_URL` | _derived from SUTAR_BASE_URL_ | Policy service |
| `SUTAR_EVENT_BUS_URL` | _derived from SUTAR_BASE_URL_ | Event bus |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | CORS allowlist (exact match) |
| `INTERNAL_API_KEY` | _empty (dev) / openssl rand -hex 32 (prod)_ | Shared secret for service-to-service auth |
| `JWT_SECRET` | _dev placeholder, must be replaced in prod_ | JWT signing key |
| `JWT_EXPIRES_IN` | `7d` | JWT lifetime |
| `JWT_ISSUER` | `nexha-commerce-identity` | JWT `iss` claim |
| `JWT_AUDIENCE` | `nexha-portal` | JWT `aud` claim |
| `GUEST_ID_PREFIX` | `GST-` | Prefix for guest supplier IDs |
| `GUEST_DEFAULT_VALIDITY_DAYS` | `30` | Validity window for guests |
| `WHATSAPP_PROVIDER` | _empty (dev = console log)_ | `meta` or `twilio` for prod |
| `WHATSAPP_ACCESS_TOKEN` | _empty_ | Meta WhatsApp token |
| `WHATSAPP_PHONE_NUMBER_ID` | _empty_ | Meta WhatsApp phone |
| `TWILIO_ACCOUNT_SID` | _empty_ | Twilio SID |
| `TWILIO_AUTH_TOKEN` | _empty_ | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | _empty_ | Twilio WhatsApp from-number |

> The four SUTAR per-service URLs (`SUTAR_IDENTITY_URL`, etc.) all default
> to `SUTAR_BASE_URL`. Set them explicitly only if your SUTAR deploys
> identity/reputation/decision/event-bus on different hosts (the production
> SUTAR layout does; the local sutar-mock puts them all on one host).

See [DEPLOY.md § Environment Variables](../DEPLOY.md#environment-variables-summary)
for the full deploy-time reference.

---

## License

MIT — RTMN Team
