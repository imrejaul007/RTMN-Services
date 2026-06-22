# Merchant Twin

**Version:** 1.0.0
**Port:** 4888
**Status:** ✅ RUNNING | June 22, 2026
**Package:** `@rtmn/merchant-twin`

---

## Overview

The Merchant Twin is the canonical digital twin for sellers on RTMN. It manages the full merchant graph: merchant profile, physical/virtual stores, promotional offers (with redemption tracking), staff, financial settlements (pending → processed → paid), and customer reviews. Every merchant record maintains aggregate counters (storeCount, staffCount, totalRatings, totalRevenue) that are atomically updated when related twins change.

Twin types: `merchant`, `store`, `offer`, `staff`, `settlement`, `review`.

Allowed merchant categories: `restaurant, retail, hotel, healthcare, beauty, fitness, fashion, automotive, entertainment, travel, education, other`.

---

## Endpoints

### Merchants
```
GET    /api/twins/merchants              # List (filters: category, status, search)
POST   /api/twins/merchants              # Create merchant profile
GET    /api/twins/merchant/:id           # Get with stores, staff, activeOffers, recentSettlements
PUT    /api/twins/merchant/:id           # Update (allowed fields only)
DELETE /api/twins/merchant/:id           # Archive (status='archived')
```

### Stores
```
GET    /api/twins/stores                 # List (filters: merchantId, status, search)
POST   /api/twins/stores                 # Create store (increments merchant.storeCount)
GET    /api/twins/store/:id
PUT    /api/twins/store/:id
```

### Offers
```
GET    /api/twins/offers                 # List (filters: merchantId, storeId, type, status, search)
POST   /api/twins/offers                 # Create offer (types: discount, bogo, cashback, freebie, bundle)
PUT    /api/twins/offer/:id
POST   /api/twins/offer/:id/redeem       # Increment usedCount; auto-exhaust at usageLimit
```

### Staff
```
GET    /api/twins/staff                  # List (filters: merchantId, storeId, role, status, search)
POST   /api/twins/staff                  # Create staff (increments merchant.staffCount)
PUT    /api/twins/staff/:id
DELETE /api/twins/staff/:id              # Archive (decrements merchant.staffCount)
```

### Settlements
```
GET    /api/twins/settlements            # List (filters: merchantId, status, startDate, endDate)
POST   /api/twins/settlements            # Create pending settlement
PUT    /api/twins/settlement/:id/process # pending → processed
PUT    /api/twins/settlement/:id/pay     # processed → paid (moves netAmount to merchant.totalRevenue)
```

### Reviews
```
POST   /api/twins/reviews                # Create review (1-5 stars, updates merchant + store rating)
GET    /api/twins/merchant/:id/reviews   # List merchant reviews
```

### Analytics & Health
```
GET    /api/analytics/merchants          # Business-wide rollup
GET    /api/analytics/merchant/:id       # Per-merchant deep dive
GET    /health                            # Stats per store
GET    /ready
```

---

## Data Stores

| Store Name | Purpose |
|---|---|
| `merchants` | Business profiles with category, ratings, revenue, storeCount, staffCount |
| `stores` | Physical/virtual/hybrid locations with businessHours (per-day open/close), capacity, features |
| `offers` | Promotions with discount object (type: percentage/fixed/value), usageLimit, usedCount |
| `staff-members` | Employees with role, department, permissions, schedule, performance ratings |
| `settlements` | Financial settlements (grossAmount, commission, netAmount, status: pending/processed/paid) |
| `reviews` | Customer reviews with rating (1-5), tags, helpful count |

In-memory indexes: `byMerchantId`, `byStoreId`, `byOfferId`, `byStaffId`, `bySettlementId`, `byCategory`, `byStatus` Maps for fast lookups.

---

## Architecture

```
merchant-twin/
├── src/
│   └── index.js              # ESM, single file (~1.3k LOC)
├── package.json
└── CLAUDE.md
```

---

## Dependencies

- **@rtmn/twinos-shared** — auth, validation, rate limit, error handler, logger
- **@rtmn/shared** — env + PersistentStore
- **express**, **helmet**, **cors**, **compression**, **morgan**, **uuid**

---

## Recent Changes

- 2026-06-21: Added settlement lifecycle (pending → processed → paid) with merchant.totalRevenue/pendingSettlements sync
- 2026-06-20: Offer auto-exhaustion — when `usedCount >= usageLimit`, status auto-flips to `exhausted`
- 2026-06-19: Staff create/delete maintains merchant.staffCount atomically
- 2026-06-18: Review creation updates both merchant.rating and store.rating (when storeId provided) via running average
- 2026-06-17: Store create increments merchant.storeCount on every successful POST

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/twins/merchant-twin
npm install
npm start

# Create a merchant
curl -X POST http://localhost:4888/api/twins/merchants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "businessName": "Bobs Burgers", "ownerName": "Bob Smith", "category": "restaurant", "email": "bob@bobsburgers.com" }'

# Add a store
curl -X POST http://localhost:4888/api/twins/stores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "merchantId": "mer-abc12345", "name": "Downtown Location", "type": "physical", "capacity": 50 }'

# Create an offer
curl -X POST http://localhost:4888/api/twins/offers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "merchantId": "mer-abc12345", "title": "20% Off Lunch", "offerType": "discount", "discount": { "type": "percentage", "value": 20 }, "usageLimit": 100 }'

curl http://localhost:4888/health
```