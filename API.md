# NeXha - API Reference

**Version:** 4.0.0
**Date:** June 15, 2026

Complete API documentation for all NeXha services.

---

## ProcurementOS (Port 4320)

Base URL: `http://localhost:4320`

### Authentication

All endpoints (except Seller Agent) require:
```
Authorization: Bearer <jwt_token>
```

Seller Agent endpoints (`/api/sellers/*`) do not require authentication.

---

## Buyer Agent Endpoints

### Suppliers

#### List Suppliers
```
GET /api/suppliers
```

Query Parameters:
- `verified` (boolean): Filter verified suppliers
- `category` (string): Filter by category
- `minCapacity` (number): Minimum capacity score

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "sup_123",
      "businessName": "ABC Suppliers",
      "gstin": "27AABCU9603R1ZM",
      "verified": true,
      "tier": "gold",
      "rating": 4.5,
      "categories": ["oil", "spices"]
    }
  ]
}
```

#### Register Supplier
```
POST /api/suppliers
```

Body:
```json
{
  "businessName": "ABC Suppliers",
  "ownerName": "John Doe",
  "email": "john@abc.in",
  "phone": "9876543210",
  "gstin": "27AABCU9603R1ZM",
  "address": {
    "line1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```

#### Get Supplier
```
GET /api/suppliers/:id
```

#### Set Supplier Capabilities
```
POST /api/suppliers/:id/capabilities
```

Body:
```json
{
  "category": "oil",
  "capacity": 5000,
  "leadTimeDays": 3,
  "minOrderQty": 100,
  "certifications": ["FSSAI", "ISO22000"],
  "paymentTerms": "Net 30"
}
```

#### Match Suppliers
```
GET /api/suppliers/match?category=oil&minQuantity=500&maxPrice=100000
```

Matches suppliers based on 7-dimension scoring:
- Category match
- Capacity
- Lead time
- Min order quantity
- Certifications
- Payment terms
- Delivery score

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "sup_123",
      "name": "ABC Suppliers",
      "score": 85,
      "dimensions": {
        "categoryScore": 20,
        "capacityScore": 18,
        "leadTimeScore": 14,
        "deliveryScore": 13,
        "paymentTermsScore": 9,
        "certificationsScore": 8,
        "minOrderScore": 3
      }
    }
  ]
}
```

---

### RFQ Management

#### Create RFQ
```
POST /api/rfqs
```

Body:
```json
{
  "buyerId": "buyer_123",
  "buyerName": "XYZ Restaurant",
  "items": [
    {
      "name": "Refined Oil 5L",
      "quantity": 100,
      "unit": "piece",
      "targetPrice": 50000
    }
  ],
  "deadline": "2026-06-20T00:00:00Z",
  "notes": "Need delivery by June 25"
}
```

#### Get RFQ
```
GET /api/rfqs/:id
```

#### Close RFQ
```
POST /api/rfqs/:id/close
```

#### Accept Quote
```
POST /api/rfqs/:id/quotes/:quoteId/accept
```

---

### Deal State Machine

#### Create Deal
```
POST /api/deals
```

Body:
```json
{
  "rfqId": "rfq_123",
  "rfqNumber": "RFQ-2026-001",
  "buyerId": "buyer_123",
  "buyerName": "XYZ Restaurant",
  "totalValue": 50000,
  "suppliers": [
    {
      "supplierId": "sup_123",
      "supplierName": "ABC Suppliers",
      "email": "abc@suppliers.in"
    }
  ],
  "expiresAt": "2026-06-25T00:00:00Z"
}
```

#### Deal States (17 States)
```
rfq_created → invitations_sent → quotes_received → negotiating
→ awarded → order_created → processing → shipped → delivered
→ fulfilled → payment_settled → completed
```

#### Record Supplier Quote
```
POST /api/deals/:id/quotes
```

Body:
```json
{
  "supplierId": "sup_123",
  "supplierName": "ABC Suppliers",
  "quotedAmount": 48000,
  "deliveryDays": 5,
  "paymentTerms": "Net 30"
}
```

#### Award Deal
```
POST /api/deals/:id/award
```

Body:
```json
{
  "supplierId": "sup_123",
  "finalAmount": 48000
}
```

#### Update Fulfillment
```
PATCH /api/deals/:id/fulfillment
```

Body:
```json
{
  "status": "shipped",
  "trackingNumber": "TRK123456",
  "carrier": "BlueDart"
}
```

#### Settle Payment
```
POST /api/deals/:id/payment
```

Body:
```json
{
  "amount": 48000,
  "method": "bnpl"
}
```

#### Get Deal Statistics
```
GET /api/deals/stats/all
```

Response:
```json
{
  "success": true,
  "data": {
    "totalDeals": 150,
    "activeDeals": 23,
    "totalValue": 15000000,
    "avgDealValue": 100000,
    "byStatus": {
      "rfq_created": 5,
      "quotes_received": 8,
      "awarded": 10,
      "completed": 100
    }
  }
}
```

---

### Agent Communication

#### Send RFQ to Supplier
```
POST /api/agents/rfq
```

Body:
```json
{
  "supplierId": "sup_123",
  "supplierName": "ABC Suppliers",
  "email": "abc@suppliers.in",
  "phone": "9876543210",
  "rfqId": "rfq_123",
  "rfqNumber": "RFQ-2026-001",
  "dealId": "deal_456",
  "items": [...],
  "totalAmount": 48000,
  "deadline": "2026-06-20T00:00:00Z",
  "preferredChannel": "email"
}
```

#### Record Supplier Response
```
POST /api/agents/response
```

Body:
```json
{
  "dealId": "deal_456",
  "supplierId": "sup_123",
  "quotedAmount": 48000,
  "deliveryDays": 5,
  "paymentTerms": "Net 30",
  "validUntil": "2026-06-18T00:00:00Z"
}
```

#### Send Reminder
```
POST /api/agents/sessions/:dealId/remind
```

#### Send Counter-Offer
```
POST /api/agents/sessions/:dealId/counter
```

Body:
```json
{
  "counterAmount": 45000,
  "deliveryDays": 7,
  "paymentTerms": "Net 45"
}
```

---

## Seller Agent Endpoints

> ⚠️ **No authentication required** for seller endpoints.

#### Register as Supplier (Guest OK)
```
POST /api/sellers/register
```

Body:
```json
{
  "businessName": "ABC Suppliers",
  "ownerName": "John Doe",
  "email": "john@abc.in",
  "phone": "9876543210",
  "categories": ["oil", "spices"],
  "webhookUrl": "https://abc.in/webhook"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "supplier": {
      "id": "GST-A1B2C3D4",
      "businessName": "ABC Suppliers",
      "isGuest": true,
      "tier": "guest"
    },
    "guestToken": "uuid-token-here"
  }
}
```

#### Receive RFQ Webhook
```
POST /api/sellers/rfq-webhook
```

Body:
```json
{
  "supplierId": "GST-A1B2C3D4",
  "guestToken": "uuid-token-here",
  "rfqId": "rfq_123",
  "action": "receive",
  "buyerName": "XYZ Restaurant",
  "items": [
    {
      "name": "Refined Oil 5L",
      "quantity": 100,
      "unit": "piece",
      "targetPrice": 50000
    }
  ],
  "deadline": "2026-06-20T00:00:00Z"
}
```

Actions: `receive`, `quote`, `accept`, `reject`, `counter`

#### Auto-Generate Quote
```
POST /api/sellers/auto-quote
```

Body:
```json
{
  "supplierId": "GST-A1B2C3D4",
  "rfqId": "rfq_123",
  "items": [
    {
      "productName": "Refined Oil 5L",
      "quantity": 100,
      "unit": "piece",
      "targetPrice": 50000
    }
  ],
  "checkInventory": true,
  "negotiate": true,
  "minMargin": 10
}
```

#### Get Pending RFQs
```
GET /api/sellers/:supplierId/rfqs
```

#### Upgrade Guest to Verified
```
POST /api/sellers/upgrade
```

Body:
```json
{
  "guestToken": "uuid-token-here",
  "gstin": "27AABCU9603R1ZM",
  "documents": [
    { "type": "gstin_certificate", "url": "https://..." }
  ]
}
```

---

## Commerce Feed Endpoints

#### Post to Feed
```
POST /api/feed
```

Body:
```json
{
  "type": "new_product",
  "headline": "ABC Suppliers added Mustard Oil 1L",
  "body": "New product available",
  "payload": {
    "productId": "prod_123",
    "price": 150
  },
  "audience": "industry",
  "tags": ["oil", "new"]
}
```

Feed Types: `new_product`, `price_update`, `promotion`, `capacity_available`, `rfq_opportunity`, `deal_closed`, `supplier_joined`, `rating_received`

#### Get Feed
```
GET /api/feed?type=rfq_opportunity&tags=oil&limit=20
```

---

## Reputation Pipeline Endpoints

#### Record Delivery Event
```
POST /api/reputation/delivery
```

Body:
```json
{
  "supplierId": "GST-A1B2C3D4",
  "supplierName": "ABC Suppliers",
  "onTime": true,
  "deliveryDays": 5,
  "promisedDays": 7
}
```

#### Record Quality Event
```
POST /api/reputation/quality
```

Body:
```json
{
  "supplierId": "GST-A1B2C3D4",
  "supplierName": "ABC Suppliers",
  "passed": true,
  "defectRate": 0.5
}
```

#### Record Payment Event
```
POST /api/reputation/payment
```

Body:
```json
{
  "supplierId": "GST-A1B2C3D4",
  "supplierName": "ABC Suppliers",
  "onTime": true,
  "amount": 48000
}
```

#### Get Supplier Reputation
```
GET /api/reputation/:supplierId
```

Response:
```json
{
  "success": true,
  "data": {
    "deliveryScore": 95,
    "qualityScore": 92,
    "paymentScore": 100,
    "communicationScore": 88,
    "negotiationScore": 75,
    "overallScore": 91,
    "tier": "gold"
  }
}
```

#### Get Leaderboard
```
GET /api/reputation/leaderboard?limit=10
```

---

## Commerce Memory Endpoints

#### Record Transaction
```
POST /api/memory/transaction
```

Body:
```json
{
  "supplierId": "GST-A1B2C3D4",
  "buyerId": "buyer_123",
  "productName": "Refined Oil 5L",
  "quantity": 100,
  "unitPrice": 480,
  "totalAmount": 48000,
  "deliveryDays": 5,
  "quality": "pass",
  "onTime": true,
  "buyerReputation": 85
}
```

#### Get Supplier Memory
```
GET /api/memory/suppliers/:supplierId?productName=Oil
```

Response:
```json
{
  "success": true,
  "data": {
    "memory": [...],
    "insights": [
      {
        "type": "price_spike",
        "description": "Prices increase 12% during Diwali",
        "severity": "medium"
      }
    ],
    "deliveryTrend": {
      "onTimeRate": 0.92,
      "avgDays": 5
    },
    "priceTrends": [
      { "festival": "Diwali", "priceIncrease": 12 }
    ]
  }
}
```

#### Get Buyer Patterns
```
GET /api/memory/buyers/:buyerId/patterns
```

---

## Nexha-SUTAR Bridge Endpoints

#### Emit Inventory Low
```
POST /api/bridge/inventory-low
```

Body:
```json
{
  "buyerId": "buyer_123",
  "productId": "prod_oil_5L",
  "productName": "Refined Oil 5L",
  "currentStock": 10,
  "threshold": 50
}
```

#### Emit RFQ Created
```
POST /api/bridge/rfq-created
```

Body:
```json
{
  "rfqId": "rfq_123",
  "dealId": "deal_456",
  "buyerId": "buyer_123",
  "supplierId": "GST-A1B2C3D4",
  "items": [...],
  "targetPrice": 50000
}
```

#### Emit Order Delivered
```
POST /api/bridge/order-delivered
```

Body:
```json
{
  "dealId": "deal_456",
  "supplierId": "GST-A1B2C3D4",
  "buyerId": "buyer_123",
  "onTime": true,
  "qualityPass": true,
  "actualAmount": 48000,
  "deliveryDays": 5
}
```

#### Receive SUTAR Event
```
POST /api/bridge/sutar-event
```

Body:
```json
{
  "type": "negotiation.counter_offer",
  "data": {
    "dealId": "deal_456",
    "counterAmount": 45000
  }
}
```

#### Get Bridge History
```
GET /api/bridge/history?limit=20
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common Error Codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request body |
| CONFLICT | 409 | Resource already exists |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

- Default: 100 requests per 15 minutes
- Headers returned:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

**Last Updated:** June 15, 2026
