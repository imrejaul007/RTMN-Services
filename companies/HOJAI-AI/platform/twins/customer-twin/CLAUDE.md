# Customer Twin

**Version:** 1.0.0
**Port:** 4895
**Status:** ✅ RUNNING | June 22, 2026
**Package:** `@rtmn/customer-twin`

---

## Overview

The Customer Twin is the most feature-rich twin in the RTMN commerce layer. Each customer has **6 sub-twins** that are managed together: the core customer profile, a behavior twin (orders/spent/favorites), a segment twin (value/behavior/demographic/engagement), LTV analysis, churn risk, family/household relationships, and AI-learned memories.

It is the only twin besides wallet-twin that publishes events via `publishAsync` (`customer.customer.created`, `.updated`, `.archived`) for downstream consumers.

The service auto-creates initial behavior and segment twins on `POST /api/twins/customer`, so callers always have a complete twin graph immediately after creation.

---

## Endpoints

### Customer CRUD
```
GET    /api/twins/customers                # List (filters: segment, status, search, businessId)
POST   /api/twins/customer                 # Create + auto-seed behavior & segment twins + publish event
GET    /api/twins/customer/:id             # Get with related: behavior, segment, family[], aiMemory[], preferences
PUT    /api/twins/customer/:id             # Update allowed fields
DELETE /api/twins/customer/:id             # Archive (status='archived') + publish event
```

### Behavior & Events
```
PUT    /api/twins/customer/:id/behavior    # Update behavior twin (auto-syncs customer.lifetimeValue/orderCount/avgOrderValue)
POST   /api/twins/customer/:id/event       # Record event (auto-creates AI memory + bumps engagement +5)
```

### Segments
```
PUT    /api/twins/customer/:id/segment     # Update segments{} and tags[]
GET    /api/segments                       # Aggregate counts per segment per business
```

### LTV & Churn Analysis
```
GET    /api/twins/customer/:id/ltv         # currentLTV, predictedLTV (2yr projection), ltvTier (platinum/gold/silver/bronze), potential, recommendations
GET    /api/twins/customer/:id/churn       # riskScore, riskLevel (low/medium/high/critical), factors, lastOrderDays, recommendedActions
```

### Family & Analytics
```
POST   /api/twins/customer/:id/family      # Add family member (relationship, name, memberId)
GET    /api/analytics/customers            # totalCustomers, totalLTV, averageLTV, bySegment, newThisMonth, atRiskCount
```

### Health
```
GET    /health                              # Counts per store
GET    /ready
```

### Segment Vocabularies
- **VALUE**: `vip, high_value, regular, at_risk, churned`
- **BEHAVIOR**: `frequent, occasional, new, dormant, inactive`
- **DEMOGRAPHIC**: `young_professional, family, senior, student, business`
- **ENGAGEMENT**: `highly_engaged, engaged, passive, unengaged`

---

## Data Stores

| Store Name | Purpose |
|---|---|
| `customers` | Core profile: name, email, phone, address, birthday, gender, segment, lifetimeValue, orderCount, churnScore, engagementScore |
| `behaviors` | totalOrders, totalSpent, favoriteCategories[], favoriteProducts[], preferredPaymentMethod, abandonedCarts, wishlistItems[] |
| `segments` | segments{value, behavior, demographic, engagement} + tags[] |
| `family-relations` | Household relationships (customerId, memberId, memberName, relationship) |
| `ai-memories` | AI-learned memories (type: event), each with confidence and 365-day expiry |
| `preferences` | Per-customer preferences |

In-memory indexes (rebuilt from primary stores): `byEmail`, `byPhone`, `bySegment`, `byBusiness`.

---

## Architecture

```
customer-twin/
├── src/
│   └── index.js              # ESM, ~750 LOC
├── package.json
└── CLAUDE.md
```

---

## Dependencies

- **@rtmn/twinos-shared** — auth, validation, error handler, logger
- **@rtmn/twinos-shared/src/event-publisher.js** — `publishAsync` for `customer.customer.*` events
- **@rtmn/shared** — env + PersistentStore
- **express**, **helmet**, **cors**, **compression**, **morgan**, **uuid**

---

## Recent Changes

- 2026-06-21: `publishAsync` events on customer lifecycle (created/updated/archived) — wallet/order twins subscribe
- 2026-06-20: LTV prediction projects 2yr forward using avgOrderValue × projected orders from `averageOrderFrequency`
- 2026-06-19: Engagement score auto-bumps +5 on each event, capped at 100
- 2026-06-18: Auto-creation of initial behavior + segment twins on customer creation (no orphan customers)
- 2026-06-17: Churn risk factors (inactive_period >90d, low_engagement <30, cart_abandonment >3, segment_risk) with severity weights

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/twins/customer-twin
npm install
npm start

# Create a customer (auto-seeds behavior + segment twins)
curl -X POST http://localhost:4895/api/twins/customer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Jane Doe", "email": "jane@example.com", "phone": "+1-555-0100" }'

# Record an event (creates AI memory + bumps engagement)
curl -X POST http://localhost:4895/api/twins/customer/cust-abc12345/event \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "eventType": "purchase", "eventData": { "amount": 89.99, "category": "electronics" }, "source": "web" }'

# Get LTV + Churn analysis
curl http://localhost:4895/api/twins/customer/cust-abc12345/ltv -H "Authorization: Bearer $TOKEN"
curl http://localhost:4895/api/twins/customer/cust-abc12345/churn -H "Authorization: Bearer $TOKEN"

curl http://localhost:4895/health
```