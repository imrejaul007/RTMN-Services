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

The middleware supports three modes:

| Mode | How it works | Used by |
|------|--------------|---------|
| `internal-key` | `x-internal-key` header (timing-safe) | Service-to-service calls |
| `corpid-jwt` | `x-corp-id` + `x-role` headers (assumes upstream auth) | Buyer/supplier API calls |
| `guest-otp` | `x-guest-id` + `x-otp` headers | Guest-supplier endpoints |

In production the `corpid-jwt` mode is replaced with a real JWT issued by
`rez-auth-service` (port 4002). For development, the header pair is a stand-in.

Routes can opt in to a specific mode by chaining `requireAuth('strict' | 'guest' | 'public')`.

---

## SUTAR OS Integration

The service calls out to SUTAR in four places — all best-effort, all logged:

| Operation | SUTAR endpoint | Used by |
|-----------|---------------|---------|
| Issue a new CorpID | `POST /corpid/issue` (4702) | `POST /api/suppliers`, `POST /api/buyers`, `POST /api/corpid/issue` |
| Link a trust score | `POST /trust/link` (4251) | Supplier/buyer registration |
| Sync reputation | `POST /trust/sync` (4251) | After every rating submission |
| Authorize action | `POST /policy/evaluate` (4240) | Status changes, credit-limit changes |
| Publish event | `POST /events/publish` (event bus) | Registration, status changes, guest activation, conversion |

If SUTAR is unreachable, local fallbacks keep commerce onboarding working:
CorpID is generated locally, trust-score link is deferred, reputation sync retries
on the next rating. Commerce never blocks on SUTAR availability.

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
    │   ├── auth.middleware.ts    # requireAuth (3 modes)
    │   └── error.middleware.ts   # asyncHandler, HttpError
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
| `SUTAR_IDENTITY_URL` | `http://localhost:4702` | CorpID service |
| `SUTAR_REPUTATION_URL` | `http://localhost:4251` | Trust-score service |
| `SUTAR_DECISION_URL` | `http://localhost:4240` | Policy service |
| `SUTAR_EVENT_BUS_URL` | _unset_ | Optional event bus |
| `INTERNAL_API_KEY` | _empty_ | Shared secret for service-to-service auth |
| `GUEST_ID_PREFIX` | `GST-` | Prefix for guest supplier IDs |
| `GUEST_DEFAULT_VALIDITY_DAYS` | `30` | Validity window for guests |
| `WHATSAPP_VERIFICATION_REQUIRED` | `true` | Whether OTP is mandatory (always enforced here) |

---

## License

MIT — RTMN Team
