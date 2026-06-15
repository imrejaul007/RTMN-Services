# commerce-identity — Feature Inventory

> Generated: 2026-06-15 · v1.0.0

This document is the canonical list of every feature implemented in
`commerce-identity`, organized by capability area. Use it as a checklist
when planning work on the service.

---

## 1. Supplier Identity

### Registration & Profile
- [x] Multi-step supplier onboarding with corpId
- [x] Business name + legal name separation
- [x] Email, phone, and optional WhatsApp capture
- [x] Multi-category tagging (`categories: string[]`)
- [x] Full address capture (line1/line2/city/state/pincode/country)
- [x] Per-supplier metadata bag (`metadata: Record<string, unknown>`) for custom attributes
- [x] `lastActiveAt` auto-touched on every status change

### KYC & Documents
- [x] GSTIN format + checksum validation (15-char with Luhn-style mod 36)
- [x] PAN format validation (10-char)
- [x] IFSC code validation (11-char)
- [x] Aadhaar / MSME / FSSAI / trade license / ISO document slots
- [x] Document URL storage (signed URL in production)
- [x] Per-document `verified` flag and `verifiedAt` timestamp
- [x] Automatic format verification at registration time

### Banking
- [x] Account holder / number / IFSC / bank name capture
- [x] IFSC validation; auto-flag `bankDetails.verified`
- [x] PII hidden from public responses

### Status & Tier
- [x] Five-state status: `pending | active | verified | suspended | blacklisted`
- [x] Whitelisted status transitions enforced in service layer
- [x] Four-tier system: `bronze | silver | gold | platinum`
- [x] Tier upgrade / downgrade endpoint
- [x] Blacklist is terminal (no transitions out)

### Search
- [x] Filter by category, city, state, tier, minScore, status
- [x] Full-text search on `businessName` and `legalName`
- [x] Pagination (`limit` capped at 100, `skip` for offset)
- [x] Sort by `overallScore` descending

---

## 2. Buyer Identity

### Registration & Profile
- [x] Five buyer types: `business | individual | government | ngo | institution`
- [x] GSTIN + PAN optional capture
- [x] Multi-category `preferredCategories`
- [x] Email, phone, optional WhatsApp
- [x] Address capture identical to suppliers

### Credit Management
- [x] `creditLimit` and `creditUsed` fields
- [x] `recordOrder` auto-bumps totalSpent, totalOrders, avgOrderValue
- [x] `updateCreditUsage(delta)` with limit-exceeded check
- [x] `setCreditLimit` (policy-gated through SUTAR)

### Search
- [x] Filter by buyerType, city, state, status, category, minTotalSpent
- [x] Sort by totalSpent descending
- [x] Pagination identical to supplier search

### Stats Tracking
- [x] `totalOrders`, `totalSpent`, `avgOrderValue`
- [x] `paymentScore`, `responseScore`, `disputeScore` (default 75/75/100)
- [x] `lastOrderAt` timestamp

---

## 3. Guest Suppliers (WhatsApp-OTP Flow)

### Onboarding
- [x] No GSTIN / PAN required at registration
- [x] `GST-XXXXXXXX` temporary ID generation (8 random uppercase chars)
- [x] WhatsApp phone capture (defaults to phone if not provided)
- [x] Optional email
- [x] City / state / pincode capture
- [x] Optional referral corpId (`referredBy`)
- [x] Auto-generated promo code per guest
- [x] Default 30-day validity (configurable via `GUEST_DEFAULT_VALIDITY_DAYS`)
- [x] Idempotent: re-registering the same phone returns the existing guest and resends the OTP

### OTP Verification
- [x] 6-digit OTP generation (configurable length)
- [x] 10-minute OTP TTL
- [x] Max 5 attempts per OTP
- [x] `resend-otp` endpoint invalidates the previous OTP
- [x] Per-OTP `sentAt`, `expiresAt`, `attempts`, `verifiedAt` audit trail
- [x] OTP history stored on the guest record (only returned via internal routes)

### Lifecycle
- [x] Status machine: `otp_pending → active → converted | expired | revoked`
- [x] Event counters: `rfqsReceived`, `quotesSubmitted`, `dealsCompleted`
- [x] `convertToSupplier` creates a full Supplier record, copies counters
- [x] Conversion persists `convertedToCorpId` and `promoCode` for downstream rewards

### Listing
- [x] `listActive` filters by city, state, category
- [x] Auto-excludes expired guests
- [x] Capped at `limit` (default 50)

---

## 4. Reputation Pipeline

### Manual Ratings
- [x] Five rating types: `overall | delivery | quality | payment | communication`
- [x] Star scale 1-5
- [x] Optional `feedback` (max 1000 chars)
- [x] Per-rating `weight` (default 1.0) for soft signals
- [x] Per-deal uniqueness: one rating per (rater, subject, deal)
- [x] Self-rating rejected at the service layer
- [x] Source tracking: `buyer | supplier | system | auto_pipeline`

### Auto-Scoring
- [x] Inputs: on-time delivery, quality acceptance, on-time payment, response rates
- [x] Weighted blend: 30% delivery + 35% quality + 20% payment + 15% response
- [x] Maps 0-1 rates to 1-5 stars, then submits as `auto_pipeline` overall rating
- [x] Weight 0.7 so manual ratings still dominate
- [x] System/admin role enforced
- [x] Sample-size guard (`sampleSize > 0`)

### Aggregation
- [x] 90-day rolling window
- [x] Weighted average per rating type
- [x] Overall score = weighted blend of normalized type averages
- [x] Persists onto `Supplier.reputation.*` and `Buyer.stats.*`
- [x] Trend detection: `improving | stable | declining` (delta of 0.25 stars)
- [x] Auto re-aggregation on every manual rating

### Public Summary
- [x] Per-type count, average, weighted (0-100)
- [x] Overall score persisted
- [x] Recent trend flag
- [x] `lastUpdated` timestamp

### Listing
- [x] Filter by type
- [x] Pagination (limit max 100)

---

## 5. SUTAR OS Bridge

| Operation | Status |
|-----------|--------|
| `requestCorpId` (POST 4702 `/corpid/issue`) | ✅ with local fallback |
| `linkTrustScore` (POST 4251 `/trust/link`) | ✅ best-effort |
| `pushReputation` (POST 4251 `/trust/sync`) | ✅ called after every rating |
| `authorize` (POST 4240 `/policy/evaluate`) | ✅ used for status & credit-limit |
| `emitEvent` (POST event-bus) | ✅ called on registration, status change, guest activation, conversion |

All calls are non-blocking: if SUTAR is unreachable, commerce continues with
a local fallback and a warning is logged. Re-sync happens on the next operation.

---

## 6. Auth & Middleware

### Authentication Modes
- [x] `internal-key` (timing-safe comparison)
- [x] `corpid-jwt` (header-based stand-in for real JWT)
- [x] `guest-otp` (guest-id + otp headers)
- [x] `public` (no auth — used for health and guest onboarding)

### Error Handling
- [x] `asyncHandler` wrapper for routes
- [x] `HttpError` class with status + code
- [x] 404 fallthrough handler
- [x] Centralized error handler with stack logging

### Operational Middleware
- [x] Helmet for security headers
- [x] CORS enabled
- [x] JSON body parser (2 MB limit)
- [x] URL-encoded body parser
- [x] Lightweight request log (method, url, status, ms)

---

## 7. Logging & Observability

- [x] Winston logger with JSON output
- [x] Configurable log level via `LOG_LEVEL`
- [x] Colorized console transport for dev
- [x] Per-request access log with duration
- [x] Stack traces on unhandled errors
- [x] Service-wide default metadata: `service: commerce-identity`

---

## 8. Lifecycle & Shutdown

- [x] Graceful shutdown on `SIGTERM` / `SIGINT`
- [x] MongoDB disconnect on shutdown
- [x] `unhandledRejection` and `uncaughtException` handlers

---

## 9. Validation Utilities

- [x] GSTIN format + checksum (`isValidGSTIN`, `isValidGSTINChecksum`)
- [x] PAN format
- [x] IFSC format
- [x] Pincode format
- [x] Phone format (Indian mobile, with `+91` and whitespace tolerance)
- [x] `normalizePhone` to canonical 10-digit form

---

## 10. ID Generation

- [x] Guest IDs: `GST-XXXXXXXX` (8 random uppercase alphanumeric, ambiguous chars excluded)
- [x] Rating IDs: `RAT-{timestamp}-{hex}`
- [x] OTPs: configurable length, crypto-secure
- [x] Promo codes: `NEXHA` + 4 hex chars

---

## 11. Out-of-Scope (handled by other services)

| Capability | Owner service |
|------------|---------------|
| Real KYC (GSTN / UIDAI / MCA API calls) | Future: hook into GSTN/UIDAI partners; the format checks here are a stopgap |
| WhatsApp Business API integration | `procurement-os` (planned) |
| SMS gateway integration | `procurement-os` (planned) |
| Real JWT issuance | `rez-auth-service` (port 4002) |
| Document storage | S3 / GCS (URLs captured in `documents[].documentUrl`) |
| Treasury / payouts | `trade-finance` (planned) |

---

*End of FEATURES.md*
