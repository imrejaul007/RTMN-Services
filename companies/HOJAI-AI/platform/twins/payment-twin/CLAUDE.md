# Payment Twin

**Version:** 1.0.0
**Port:** 4886
**Status:** ✅ RUNNING | June 22, 2026
**Package:** `@rtmn/payment-twin`

---

## Overview

The Payment Twin manages the full payment lifecycle for RTMN transactions: authorization, capture, refunds, chargebacks, and merchant payouts. It wraps a mocked PSP (Payment Service Provider) layer and layers fraud detection on top of every authorization.

The service is **business-scoped** — every record is filtered by `req.user.businessId`, with `admin` role able to cross boundaries. It also implements a 24-hour idempotency cache (in-memory `Map`, not a data store) so retried writes don't double-charge.

Twin types produced: `payment`, `refund`, `chargeback`, `payout`.

---

## Endpoints

### Payment Lifecycle
```
GET    /api/twins/payments                    # List payments (filters: status, customerId, search, startDate, endDate)
POST   /api/twins/payments                    # Authorize new payment (fraud check + PSP auth)
GET    /api/twins/payment/:id                 # Get payment with refunds array
PUT    /api/twins/payment/:id                 # Update description/metadata
DELETE /api/twins/payment/:id                 # Cancel pending/authorized payment
POST   /api/twins/payment/:id/capture         # Capture authorized payment (partial supported)
POST   /api/twins/payment/:id/cancel          # Cancel pending/authorized/captured
POST   /api/twins/payment/:id/refund          # Issue refund (creates refund twin + updates payment)
```

### Chargebacks
```
GET    /api/twins/chargebacks                 # List chargebacks
POST   /api/twins/chargeback                  # Create chargeback (typically via PSP webhook)
PUT    /api/twins/chargeback/:id/evidence     # Submit evidence documents
PUT    /api/twins/chargeback/:id/resolve      # Resolve (status: won/lost/resolved)
```

### Payouts
```
GET    /api/twins/payouts                     # List payouts
POST   /api/twins/payout                      # Create merchant payout
PUT    /api/twins/payout/:id/cancel           # Cancel pending/processing payout
```

### Analytics & Health
```
GET    /api/analytics/payments                # Volume, capture/refund totals, byMethod, byDay, fraud stats
GET    /health                                 # Health with counts per store
GET    /ready
```

### Status Vocabularies
- `payment.status`: `pending`, `authorized`, `captured`, `completed`, `failed`, `cancelled`, `expired`
- `refund.status`: `pending`, `processing`, `completed`, `failed`, `rejected`
- `chargeback.status`: `initiated`, `under_review`, `resolved`, `won`, `lost`
- `payout.status`: `pending`, `processing`, `completed`, `failed`, `cancelled`
- `paymentMethod`: `card`, `bank_transfer`, `wallet`, `cash`, `crypto`

---

## Data Stores

All 4 stores are `PersistentStore` instances (file-backed JSON, survives restarts).

| Store Name | Purpose |
|---|---|
| `payments` | Authorized/captured/completed/cancelled payments |
| `refunds` | Refund twins linked to paymentId |
| `chargebacks` | Disputes with evidence[] and resolution |
| `payouts` | Merchant payouts (initiated by merchant ops) |

In-memory (not data stores): `idempotencyKeys` Map with 24h TTL.

---

## Architecture

```
payment-twin/
├── src/
│   └── index.js              # Single-file service, ESM
├── package.json
└── CLAUDE.md
```

---

## Dependencies

- **@rtmn/twinos-shared** (file:../twinos-shared) — auth, rate limit, error handler, validation, logger
- **@rtmn/shared** — env + auth + PersistentStore primitives
- **express**, **helmet**, **cors**, **compression**, **morgan**, **uuid**

---

## Recent Changes

- 2026-06-21: Silent-mutation bug fixes — every `Object.assign`/mutation path now calls `payments.set()` to persist
- 2026-06-20: Per-business scoping enforced on all read paths (admin role can bypass)
- 2026-06-19: Fraud-detection mock (0–30% risk, blocks >25%) added to `POST /api/twins/payments`
- 2026-06-18: PSP authorize/capture/refund/payout mocks wired up with 50ms simulated latency

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/twins/payment-twin
npm install
npm start

# Authorize a $49 payment
curl -X POST http://localhost:4886/api/twins/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "customerId": "cust-123", "amount": 49.00, "currency": "USD", "paymentMethod": "card" }'

# Capture it
curl -X POST http://localhost:4886/api/twins/payment/pay-abc12345/capture \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{ "amount": 49.00 }'

# Refund it
curl -X POST http://localhost:4886/api/twins/payment/pay-abc12345/refund \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 49.00, "reason": "customer_request" }'

curl http://localhost:4886/health
```