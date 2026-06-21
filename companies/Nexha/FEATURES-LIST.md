# NeXha — L1 Features List

> **Version:** 1.0.0
> **Date:** 2026-06-21
> **Scope:** L1 only — commerce-identity, sutar-mock, and the portal.
> For the full NeXha product (DistributionOS, ProcurementOS, etc.) see the
> `RTNM-Group/nexha` monorepo.

---

## Overview

This directory contains three deployable services that together form the
**identity, onboarding, and reputation core** of the NeXha commerce
network. Other NeXha services (procurement, distribution, manufacturing,
trade finance, etc.) live in the full monorepo and consume this stack
over HTTP.

| Service | Port | Purpose |
|---------|------|---------|
| **commerce-identity** | 8000 | Universal identity for suppliers, buyers, and guests |
| **sutar-mock** | 4799 | In-process SUTAR OS mock for local dev |
| **portal** | 3000 | Next.js B2B portal |

---

## 1. commerce-identity (Port 8000)

### Supplier KYC & Management
- Multi-step supplier onboarding with corpId
- Business name + legal name separation
- Email, phone, and optional WhatsApp capture
- Multi-category tagging
- Full India-focused address capture (line1/line2/city/state/pincode)
- GSTIN, PAN, Aadhaar, MSME, FSSAI, trade license, ISO document slots
- Document format validation (regex + GSTIN mod-36 checksum)
- Per-supplier metadata bag for custom attributes
- Banking info capture (account holder, number, IFSC, bank name)
- IFSC validation; auto-flag `bankDetails.verified`
- PII hidden from public responses (gated to self/admin)
- Five-state status: `pending | active | verified | suspended | blacklisted`
- Whitelisted status transitions enforced in the service layer
- Four-tier system: `bronze | silver | gold | platinum`
- Tier upgrade/downgrade (admin only)
- Blacklist is terminal

### Buyer Onboarding & Credit
- Five buyer types: `business | individual | government | ngo | institution`
- GSTIN + PAN optional capture
- Multi-category `preferredCategories`
- Address capture identical to suppliers
- `creditLimit` and `creditUsed` fields (in paise)
- `recordOrder` auto-bumps totalSpent, totalOrders, avgOrderValue
- `updateCreditUsage(delta)` with limit-exceeded check
- `setCreditLimit` (policy-gated through SUTAR)

### Guest Suppliers (No GST Required)
- No GSTIN / PAN required at registration
- `GST-XXXXXXXX` temporary ID generation (8 random uppercase chars)
- WhatsApp phone capture (defaults to phone if not provided)
- Optional email and referral corpId
- Auto-generated promo code per guest
- Default 30-day validity (configurable via `GUEST_DEFAULT_VALIDITY_DAYS`)
- Idempotent: re-registering the same phone returns the existing guest
- 6-digit OTP generation, 10-minute TTL, max 5 attempts
- `resend-otp` invalidates the previous OTP
- Per-OTP `sentAt`, `expiresAt`, `attempts`, `verifiedAt` audit trail
- OTP codes **stored as bcrypt hashes** in MongoDB (privacy)
- Status machine: `otp_pending → active → converted | expired | revoked`
- Event counters: `rfqsReceived`, `quotesSubmitted`, `dealsCompleted`
- `convertToSupplier` creates a full Supplier record

### Search
- Suppliers: filter by category, city, state, tier, minScore, status
- Buyers: filter by buyerType, city, state, status, category, minTotalSpent
- Full-text search on `businessName` and `legalName`
- Pagination (limit capped at 100, skip for offset)
- Sort by score / totalSpent descending

### Reputation Pipeline
- Five rating types: `overall | delivery | quality | payment | communication`
- Star scale 1-5
- Optional `feedback` (max 1000 chars)
- Per-rating `weight` (default 1.0) for soft signals
- Per-deal uniqueness: one rating per (rater, subject, deal)
- Self-rating rejected
- Source tracking: `buyer | supplier | system | auto_pipeline`
- 90-day rolling window aggregation
- Weighted average per rating type
- Overall score = weighted blend of normalized type averages
- Persisted onto `Supplier.reputation.*` and `Buyer.stats.*`
- Trend detection: `improving | stable | declining` (delta of 0.25 stars)
- Auto re-aggregation on every manual rating
- Auto-scoring pipeline: weighted blend of operational metrics
- 0.7 weight for auto-pipeline ratings (manual dominates)
- Per-type count, average, weighted (0-100) on public summary
- SUTAR trust/sync push after every rating (best-effort)

### SUTAR OS Bridge
- `requestCorpId` (POST `/corpid/issue`) — with local fallback
- `linkTrustScore` (POST `/trust/link`) — best-effort
- `pushReputation` (POST `/trust/sync`) — called after every rating
- `authorize` (POST `/policy/evaluate`) — used for status & credit-limit
- `emitEvent` (POST `/events/publish`) — on registration, status changes, guest events
- All calls non-blocking; failures logged and swallowed
- URL defaults derive from `SUTAR_BASE_URL` when individual vars are unset

### Auth & Middleware
- Real JWT issued by `commerce-identity` itself (HMAC-SHA256)
- Roles derived from persisted entity type (Supplier vs Buyer)
- 4 auth modes: `jwt-cookie` (browser), `jwt-bearer` (server), `internal-key` (service), `public`
- 5 roles: `supplier | buyer | admin | system | guest`
- `requireAuth(mode)` middleware factory
- `requireAdmin`, `requireSystem` role gates
- `setPassword`, `verifyPassword` with bcrypt cost 12
- `issueLoginToken`, `issueGuestToken`, `issueSystemToken`
- `verifyToken` returns `{ valid, payload } | { valid, reason }`
- Password storage in `metadata.passwordHash` (Mixed Mongoose field)
- httpOnly cookie (`nexha_token`) for browser sessions
- `secure: true` in production (`NODE_ENV === 'production'`)
- `sameSite: 'lax'`
- JWT issuer/audience validation on every verify
- `crypto.timingSafeEqual` for internal-key comparison
- `crypto.randomBytes` / `crypto.randomInt` / `crypto.randomUUID` for all IDs

### Rate Limiting & CORS
- Default: 100 requests/minute/IP on all `/api/*`
- Strict: 20 requests/minute/IP on `/api/auth/login`, `/api/auth/register`,
  `/api/corpid/issue`, `/api/guest-suppliers/onboard`,
  `/api/guest-suppliers/:guestId/verify-otp`
- CORS with **exact origin match** (no wildcards)
- Helmet security headers

### Validation Utilities (India-focused)
- GSTIN format + mod-36 checksum (`isValidGSTIN`, `isValidGSTINChecksum`)
- PAN format (`isValidPAN`)
- IFSC format (`isValidIFSC`)
- Pincode format (`isValidPincode`)
- Phone format with `+91` and whitespace tolerance (`isValidPhone`, `normalizePhone`)

### Logging & Observability
- Winston logger with JSON output
- Configurable log level via `LOG_LEVEL`
- Colorized console transport for dev
- Per-request access log with duration
- Stack traces on unhandled errors
- Service-wide default metadata: `service: commerce-identity`

### Lifecycle
- Graceful shutdown on `SIGTERM` / `SIGINT`
- MongoDB disconnect on shutdown
- `unhandledRejection` and `uncaughtException` handlers
- Fail-fast on startup if `JWT_SECRET` is unset in production

---

## 2. sutar-mock (Port 4799)

Lightweight stand-in for the production SUTAR services during local
development. In-memory only — no Mongo. Single process.

- `POST /corpid/issue` — mint a universal identity
- `POST /trust/link` — link a trust score to a corpId
- `POST /trust/sync` — persist reputation data
- `POST /policy/evaluate` — authorize a privileged action
- `POST /events/publish` — pub/sub event bus
- `GET /events` — query the event history
- `GET /stats` — counters
- `GET /health` — liveness
- `GET /policy` — list policy rules

---

## 3. portal (Port 3000)

Next.js 16 B2B portal. App Router. 11 routes:

| Route | Auth | Purpose |
|-------|------|---------|
| `/` | public | Landing page |
| `/login` | public | Email + password sign in |
| `/onboard-guest` | public | WhatsApp-OTP registration (no GST) |
| `/onboard-supplier` | public | Full business registration (3 steps) |
| `/verify-otp` (via guest flow) | public | OTP entry |
| `/dashboard` | required | Identity overview + reputation + health |
| `/profile` | required | Show corpId, role, guest status |
| `/products` | required | (placeholder for product catalog) |
| `/rfqs` | required | (placeholder for RFQ list) |
| `/ratings` | required | Per-dimension reputation breakdown |
| `/upgrade` | guest only | Convert guest → full supplier |

### Auth model
- Browser sessions use httpOnly cookies set by the backend
- `credentials: 'include'` in the API client
- Server-to-server callers can use `Authorization: Bearer <token>`
- Sign-out calls `/api/auth/logout` to clear the cookie

### Wiring
- All API calls flow through `lib/api.ts`
- Pages use `getMe()` to verify session; 401 redirects to `/login`
- Hardcoded `localhost:8000` is replaced with `process.env.NEXT_PUBLIC_API_URL`

### Known stubs (need real APIs from the full NeXha product)
- `/products` — UI shell, no API yet
- `/rfqs` — UI shell, no API yet

---

## Out of scope (L1)

The following live in the full NeXha monorepo (`RTNM-Group/nexha`):

- DistributionOS, FranchiseOS, ProcurementOS, ManufacturingOS, TradeFinance,
  Intelligence, Ecosystem Connector, Gateway
- NextaBizz (B2B Procurement Platform)
- React Native mobile app
- Real KYC integration (GSTN/UIDAI/MCA APIs)
- Real WhatsApp Business API integration (Meta/Twilio)
- Document storage (S3 / GCS)
- Treasury / payouts
- RFQ marketplace, supplier agent network
- Deal state machine, negotiation sessions
- Commerce memory, commerce feed
- BNPL, FX, dispute resolution
- Webhook signature verification (HMAC-SHA256)
- Prometheus metrics
- Distributed tracing (x-trace-id)
- Zod input validation
- WebSocket
- Real JWT issuance by `rez-auth-service` (this stack issues its own JWTs)

---

*Last updated: 2026-06-21 (Phase 6 of NEXHA-DEEP-AUDIT.md)*
