# commerce-identity API Reference

All endpoints accept and return JSON. Authentication is via headers
(see [README.md § Authentication](README.md#authentication)).

> Common response envelope: `{ "success": boolean, "data": ..., "error"?: string }`

---

## Health

### `GET /health`

```bash
curl http://localhost:8000/health
```

```json
{
  "success": true,
  "service": "commerce-identity",
  "version": "1.0.0",
  "status": "healthy",
  "uptime": 12.34,
  "timestamp": "2026-06-15T10:00:00.000Z"
}
```

---

## CorpID

### `POST /api/corpid/issue`

Public route. Asks SUTAR CorpID to mint a new universal ID, falling back to
a locally-generated id if SUTAR is unreachable.

**Headers:** none required.

**Body:**
```json
{
  "type": "supplier",
  "businessName": "ACME Traders",
  "email": "ops@acme.example",
  "phone": "9876543210",
  "isGuest": false
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "corpId": "SUP-LXKQ2J7M"
  }
}
```

---

## Suppliers

### `POST /api/suppliers`

Register a new supplier. Performs format validation on every supplied document
(GSTIN, PAN, IFSC). If a GSTIN is provided, also runs the checksum.

**Headers:** `x-internal-key` *or* `x-corp-id`.

**Body:**
```json
{
  "corpId": "SUP-LXKQ2J7M",
  "businessName": "ACME Traders",
  "legalName": "ACME Traders Pvt Ltd",
  "email": "ops@acme.example",
  "phone": "9876543210",
  "whatsapp": "9876543210",
  "categories": ["electronics", "office-supplies"],
  "address": {
    "line1": "Plot 21, Industrial Area",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001"
  },
  "documents": [
    { "type": "gstin", "number": "29ABCDE1234F1Z5" },
    { "type": "pan",   "number": "ABCDE1234F" }
  ],
  "bankDetails": {
    "accountHolder": "ACME Traders Pvt Ltd",
    "accountNumber": "50100123456789",
    "ifsc": "HDFC0001234",
    "bankName": "HDFC Bank"
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "corpId": "SUP-LXKQ2J7M",
    "status": "pending",
    "tier": "bronze",
    "reputation": {
      "overallScore": 0,
      "deliveryScore": 0,
      "qualityScore": 0,
      "paymentScore": 0,
      "responseScore": 0,
      "totalRatings": 0,
      "totalDeals": 0,
      "totalDisputes": 0
    },
    "sutarTrustScoreId": "trust_abc123",
    "isGuest": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### `GET /api/suppliers/:corpId`

Returns the supplier profile. PII (bank details, document URLs) is hidden
unless the caller passes `x-corp-id` matching the supplier's own corpId.

```bash
curl http://localhost:8000/api/suppliers/SUP-LXKQ2J7M
```

### `GET /api/suppliers`

Search with filters. All filters are optional.

| Query | Type | Notes |
|-------|------|-------|
| `category` | string | exact match on `categories[]` |
| `city` | string | case-insensitive exact |
| `state` | string | case-insensitive exact |
| `tier` | string | `bronze \| silver \| gold \| platinum` |
| `minScore` | number | minimum overallScore (0-100) |
| `status` | string | `pending \| active \| verified \| suspended \| blacklisted` |
| `limit` | number | default 20, max 100 |
| `skip` | number | default 0 |

```bash
curl 'http://localhost:8000/api/suppliers?category=electronics&minScore=60&limit=10'
```

### `PATCH /api/suppliers/:corpId/status`

Change supplier status. Calls the SUTAR policy engine first; rejected if
the transition is not allowed by policy.

**Body:**
```json
{ "status": "verified", "reason": "GSTIN confirmed via GSTN" }
```

**Status transitions allowed:**
- `pending → active | suspended | blacklisted`
- `active → verified | suspended | blacklisted`
- `verified → suspended | blacklisted`
- `suspended → active | blacklisted`
- `blacklisted → (terminal)`

### `PATCH /api/suppliers/:corpId/tier`

```json
{ "tier": "gold" }
```

### `POST /api/suppliers/:corpId/categories`

```json
{ "categories": ["grocery", "dairy"] }
```

### `GET /api/suppliers/:corpId/reputation`

```json
{
  "success": true,
  "data": {
    "corpId": "SUP-LXKQ2J7M",
    "subject": "supplier",
    "overallScore": 78,
    "breakdown": {
      "overall":      { "average": 4.1, "count": 12, "weighted": 78 },
      "delivery":     { "average": 4.4, "count":  8, "weighted": 85 },
      "quality":      { "average": 4.0, "count":  7, "weighted": 75 },
      "payment":      { "average": 3.8, "count":  5, "weighted": 70 },
      "communication":{ "average": 4.2, "count":  6, "weighted": 80 }
    },
    "recentTrend": "improving",
    "lastUpdated": "2026-06-15T10:00:00.000Z"
  }
}
```

### `POST /api/suppliers/:corpId/auto-score`

System-only (`x-role: system` or `admin`). Derives scores from operational metrics.

**Body:**
```json
{
  "onTimeDeliveryRate": 0.92,
  "qualityAcceptanceRate": 0.88,
  "onTimePaymentRate": 0.95,
  "responseRate": 0.80,
  "sampleSize": 50
}
```

The pipeline writes a synthetic `overall` rating with `source: "auto_pipeline"`
and weight `0.7`, then re-aggregates the subject's overallScore.

---

## Buyers

### `POST /api/buyers`

```json
{
  "corpId": "BUY-AB12CD3",
  "businessName": "FreshMart Retail",
  "buyerType": "business",
  "email": "buying@freshmart.example",
  "phone": "9123456789",
  "gstin": "29ABCDE1234F1Z5",
  "address": {
    "line1": "12, Market Road",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "preferredCategories": ["grocery", "dairy"],
  "creditLimit": 500000
}
```

### `GET /api/buyers/:corpId`

### `GET /api/buyers`

Same query semantics as supplier search, with `buyerType`, `category` (matches
`preferredCategories`), and `minTotalSpent` filters.

### `PATCH /api/buyers/:corpId/status`

```json
{ "status": "verified" }
```

### `POST /api/buyers/:corpId/orders`

Record a completed order — recomputes `totalOrders`, `totalSpent`, `avgOrderValue`,
and stamps `lastOrderAt`.

```json
{ "orderValue": 12500 }
```

### `POST /api/buyers/:corpId/credit`

```json
{ "delta": 2500 }
```

Positive `delta` increases usage (rejected if it would exceed `creditLimit`).
Negative `delta` decreases usage.

### `PATCH /api/buyers/:corpId/credit-limit`

Policy-gated. Asks SUTAR to authorize before persisting.

```json
{ "limit": 750000 }
```

### `GET /api/buyers/:corpId/reputation`

---

## Guest Suppliers (No GST Required)

### `POST /api/guest-suppliers/onboard`

Public route. No GSTIN needed. Sends an OTP to the supplier's WhatsApp number.

**Body:**
```json
{
  "businessName": "Ravi's Wholesale",
  "ownerName": "Ravi Kumar",
  "phone": "9876543210",
  "whatsapp": "9876543210",
  "email": "ravi@example.com",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411001",
  "categories": ["vegetables", "grains"],
  "referredBy": "SUP-LXKQ2J7M"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "guestId": "GST-AB23CD45",
    "status": "otp_pending",
    "expiresAt": "2026-07-15T...",
    "whatsapp": "9876543210",
    "promoCode": "NEXHAA1B2",
    "message": "OTP dispatched to your WhatsApp number"
  }
}
```

In development the OTP is logged to the application console:
```
[DEV] Guest OTP for 9876543210: 482913 (guestId=GST-AB23CD45)
```

### `POST /api/guest-suppliers/:guestId/resend-otp`

Issues a fresh OTP. The previous OTP is invalidated.

### `POST /api/guest-suppliers/:guestId/verify-otp`

```json
{ "code": "482913" }
```

On success the guest transitions to `active` and can immediately start
receiving inbound RFQs.

### `POST /api/guest-suppliers/:guestId/convert`

Converts a verified guest to a full Supplier record.

**Body:**
```json
{
  "corpId": "SUP-NEW1234",
  "documents": {
    "gstin": "27ABCDE1234F1Z5",
    "pan":   "ABCDE1234F"
  }
}
```

### `GET /api/guest-suppliers/:guestId`

Returns the guest record *without* OTP history.

### `GET /api/guest-suppliers`

Internal route, lists active guests with optional filters.

| Query | Type |
|-------|------|
| `city` | string |
| `state` | string |
| `category` | string |
| `limit` | number |

### `POST /api/guest-suppliers/:guestId/events`

Bumps a counter when the guest participates in commerce.

```json
{ "event": "rfq_received" | "quote_submitted" | "deal_completed" }
```

---

## Ratings

### `POST /api/ratings`

```json
{
  "type": "delivery",
  "subjectCorpId": "SUP-LXKQ2J7M",
  "score": 5,
  "dealId": "DEAL-001",
  "feedback": "Delivered a day early, packaging was perfect"
}
```

`raterCorpId` is taken from `x-corp-id` if present, otherwise from the body.
Self-ratings are rejected. One rating per (rater, subject, deal) is allowed —
re-submitting updates the existing rating.

### `GET /api/ratings/:corpId`

| Query | Type |
|-------|------|
| `type` | `delivery \| quality \| payment \| communication \| overall` |
| `limit` | number (default 20, max 100) |
| `skip` | number (default 0) |

---

## Error Responses

| Status | When |
|--------|------|
| 400 | Validation failure (bad GSTIN/PAN, missing field, etc.) |
| 401 | Missing or invalid auth headers |
| 403 | SUTAR policy denied the action (status change, credit limit) |
| 404 | Resource not found |
| 500 | Unhandled internal error (logged with stack) |

All error bodies follow:
```json
{ "success": false, "error": "Human-readable message", "code": "OPTIONAL_CODE" }
```
