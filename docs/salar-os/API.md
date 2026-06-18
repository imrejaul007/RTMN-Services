# Salar OS - API Reference

**Version:** 3.0.0  
**Last Updated:** June 17, 2026  
**Base URL:** `http://localhost:4250/api/marketplace` (Local)  
**Production:** `https://sutar.hojai.ai/api/marketplace`

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Listings API](#listings-api)
3. [Discovery API](#discovery-api)
4. [Commerce API](#commerce-api)
5. [Reviews API](#reviews-api)
6. [Provider API](#provider-api)
7. [Categories API](#categories-api)
8. [ACP Protocol Integration](#acp-protocol-integration)
9. [Webhooks](#webhooks)
10. [Error Codes](#error-codes)

---

## Authentication

All API endpoints (except public read endpoints) require authentication.

### Methods

#### JWT Bearer Token
```http
Authorization: Bearer <jwt_token>
```

#### API Key
```http
X-API-Key: <api_key>
```

### Get JWT Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rt_xxx",
  "expiresIn": 3600,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "buyer"
  }
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "rt_xxx"
}
```

---

## Listings API

### List Listings

```http
GET /listings?category=ai-agents&limit=20&offset=0&sort=popular
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `subcategory` | string | Filter by subcategory |
| `provider` | string | Filter by provider ID |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `minRating` | number | Minimum rating (0-5) |
| `minTrustScore` | integer | Minimum trust score (0-100) |
| `tags` | string[] | Filter by tags |
| `featured` | boolean | Featured listings only |
| `sort` | string | `popular`, `recent`, `rating`, `price_asc`, `price_desc` |
| `limit` | integer | Results per page (max 100) |
| `offset` | integer | Pagination offset |

### Get Listing Details

```http
GET /listings/:id
```

### Create Listing

```http
POST /listings
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Restaurant AI Agent",
  "category": "ai-agents",
  "subcategory": "sales-agents",
  "description": "Short description (max 200 chars)",
  "longDescription": "Full description in markdown",
  "pricing": {
    "plans": [
      {
        "name": "Starter",
        "price": 29.99,
        "currency": "USD",
        "interval": "monthly",
        "features": ["1000 API calls/month", "Email support"]
      }
    ]
  },
  "capabilities": ["nlp", "vision"],
  "tags": ["restaurant", "ai"],
  "documentationUrl": "https://docs.example.com",
  "supportUrl": "https://support.example.com",
  "thumbnail": "https://example.com/thumb.jpg"
}
```

**Response:** `201 Created`
```json
{
  "id": "lst_abc123",
  "slug": "restaurant-ai-agent",
  "status": "draft",
  "createdAt": "2026-06-17T10:00:00Z"
}
```

### Update Listing

```http
PATCH /listings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "pricing": { ... }
}
```

### Delete Listing

```http
DELETE /listings/:id
Authorization: Bearer <token>
```

### Publish Listing

```http
POST /listings/:id/publish
Authorization: Bearer <token>
```

### Feature Listing (Admin)

```http
POST /listings/:id/feature
Authorization: Bearer <admin_token>

{
  "duration": 30,
  "position": 1
}
```

### Bulk Operations

```http
POST /listings/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "operation": "update",
  "listingIds": ["lst_123", "lst_456"],
  "data": {
    "tags": ["new-tag"]
  }
}
```

---

## Discovery API

### Search Listings

```http
POST /search
Content-Type: application/json

{
  "query": "restaurant AI agent",
  "filters": {
    "category": ["ai-agents"],
    "subcategory": ["sales-agents"],
    "priceRange": { "min": 0, "max": 100 },
    "minRating": 4.0,
    "minTrustScore": 80,
    "capabilities": ["nlp"],
    "tags": ["restaurant", "ai"]
  },
  "sort": {
    "field": "rating",
    "order": "desc"
  },
  "limit": 20,
  "offset": 0
}
```

### Get Featured

```http
GET /featured?category=ai-agents&limit=10
```

### Get Trending

```http
GET /trending?period=day&limit=20
```

**Period values:** `hour`, `day`, `week`, `month`

### Get Recommendations

```http
GET /recommendations?userId=user_123&limit=10
```

### Get Related Listings

```http
GET /listings/:id/related?limit=5
```

### Get New Listings

```http
GET /new?category=ai-agents&limit=20
```

---

## Commerce API

### Purchase Listing

```http
POST /purchases
Authorization: Bearer <token>
Content-Type: application/json

{
  "listingId": "lst_abc123",
  "planId": "plan_pro",
  "quantity": 1,
  "paymentMethodId": "pm_xxx"
}
```

**Response:** `200 OK`
```json
{
  "purchaseId": "pur_def456",
  "subscriptionId": "sub_ghi789",
  "status": "active",
  "amount": 99.99,
  "currency": "USD",
  "apiKey": "sk_live_xxx",
  "accessUrl": "https://api.hojai.ai/v1/agents/restaurant",
  "startDate": "2026-06-17T00:00:00Z",
  "nextBillingDate": "2026-07-17T00:00:00Z"
}
```

### Get Purchase

```http
GET /purchases/:id
Authorization: Bearer <token>
```

### List User Purchases

```http
GET /purchases?status=active&limit=20
Authorization: Bearer <token>
```

### Cancel Subscription

```http
POST /subscriptions/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "no_longer_needed",
  "cancelImmediately": false
}
```

### Request Refund

```http
POST /purchases/:id/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "service_not_as_described",
  "description": "Details about the issue"
}
```

### Update Payment Method

```http
PATCH /subscriptions/:id/payment-method
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentMethodId": "pm_yyy"
}
```

### Apply Coupon

```http
POST /purchases/apply-coupon
Authorization: Bearer <token>
Content-Type: application/json

{
  "listingId": "lst_abc123",
  "couponCode": "SUMMER20"
}
```

---

## Reviews API

### Submit Review

```http
POST /listings/:id/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "title": "Excellent service!",
  "comment": "This AI agent transformed our operations...",
  "verified": true
}
```

**Constraints:**
- User must have purchased the listing
- One review per user per listing
- Rating must be 1-5

### Get Listing Reviews

```http
GET /listings/:id/reviews?limit=20&offset=0&sort=recent
```

**Sort options:** `recent`, `helpful`, `rating_high`, `rating_low`

### Get Review

```http
GET /reviews/:id
```

### Mark Review as Helpful

```http
POST /reviews/:id/helpful
Authorization: Bearer <token>
```

### Provider Response to Review

```http
POST /reviews/:id/respond
Authorization: Bearer <provider_token>
Content-Type: application/json

{
  "response": "Thank you for your feedback! We're glad..."
}
```

### Report Review

```http
POST /reviews/:id/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "spam",
  "details": "This is a fake review"
}
```

---

## Provider API

### Register as Provider

```http
POST /providers/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My AI Company",
  "email": "me@myai.com",
  "website": "https://myai.com",
  "description": "We build amazing AI agents",
  "country": "US",
  "taxId": "12-3456789"
}
```

### Get Provider Profile

```http
GET /providers/:id
```

### Update Provider Profile

```http
PATCH /providers/:id
Authorization: Bearer <provider_token>
Content-Type: application/json

{
  "description": "Updated description",
  "website": "https://newsite.com"
}
```

### Provider Dashboard

```http
GET /providers/:id/dashboard
Authorization: Bearer <provider_token>
```

**Response:**
```json
{
  "provider": { ... },
  "stats": {
    "totalListings": 45,
    "activeListings": 42,
    "totalSales": 15420,
    "activeSubscribers": 8900,
    "monthlyRevenue": 45000,
    "totalRevenue": 540000,
    "averageRating": 4.7,
    "responseTime": "2 hours"
  },
  "topListings": [...],
  "recentSales": [...],
  "pendingReviews": [...],
  "payouts": {
    "pending": 4500,
    "nextPayoutDate": "2026-07-01"
  }
}
```

### Provider Analytics

```http
GET /providers/:id/analytics?period=month
Authorization: Bearer <provider_token>
```

**Metrics returned:**
- Views, conversions, sales
- Revenue trends
- Customer demographics
- Top-selling listings
- Geographic distribution

### Provider Payouts

```http
GET /providers/:id/payouts?limit=20
Authorization: Bearer <provider_token>
```

### Request Payout

```http
POST /providers/:id/payouts/request
Authorization: Bearer <provider_token>
Content-Type: application/json

{
  "amount": 1000,
  "method": "bank_transfer"
}
```

---

## Categories API

### List Categories

```http
GET /categories
```

**Response:**
```json
{
  "categories": [
    {
      "id": "cat_ai_agents",
      "name": "AI Agents",
      "slug": "ai-agents",
      "icon": "🤖",
      "description": "Autonomous AI agents",
      "serviceCount": 150,
      "subcategories": [
        {
          "id": "sub_sales_agents",
          "name": "Sales Agents",
          "slug": "sales-agents",
          "serviceCount": 22
        }
      ]
    }
  ]
}
```

### Get Category

```http
GET /categories/:slug
```

### Get Subcategories

```http
GET /categories/:slug/subcategories
```

---

## ACP Protocol Integration

Salar OS supports AI agent transactions via the **Agent Commerce Protocol (ACP)** on port 4800.

### Agent Discovery

```http
POST /acp/discover
Content-Type: application/json

{
  "agentId": "agent_xyz",
  "requirements": {
    "category": "ai-agents",
    "capabilities": ["translation"],
    "maxPrice": 50
  }
}
```

### Agent Purchase (Autonomous)

```http
POST /acp/purchase
Content-Type: application/json
Authorization: Bearer <agent_token>

{
  "agentId": "agent_xyz",
  "listingId": "lst_abc123",
  "planId": "plan_usage",
  "autoNegotiate": true,
  "maxPrice": 0.001,
  "paymentMethod": "agent_wallet"
}
```

### Negotiation

```http
POST /acp/negotiate
Content-Type: application/json

{
  "sessionId": "neg_xxx",
  "action": "counter",
  "offer": {
    "price": 0.0008,
    "quantity": 10000
  }
}
```

---

## Webhooks

Salar OS sends webhooks for important events.

### Configure Webhook

```http
POST /webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://yourapp.com/webhooks/salar",
  "events": ["purchase.completed", "review.submitted"],
  "secret": "whsec_xxx"
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `listing.created` | New listing created |
| `listing.updated` | Listing updated |
| `listing.published` | Listing published |
| `listing.deleted` | Listing deleted |
| `purchase.completed` | Purchase successful |
| `purchase.refunded` | Refund processed |
| `subscription.created` | New subscription |
| `subscription.renewed` | Subscription renewed |
| `subscription.cancelled` | Subscription cancelled |
| `review.submitted` | New review |
| `payout.processed` | Payout completed |

### Webhook Payload Format

```json
{
  "event": "purchase.completed",
  "timestamp": "2026-06-17T10:00:00Z",
  "data": {
    "purchaseId": "pur_xxx",
    "listingId": "lst_xxx",
    "buyerId": "user_xxx",
    "amount": 99.99,
    "currency": "USD"
  }
}
```

### Webhook Signature Verification

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `409` | Conflict |
| `422` | Unprocessable Entity |
| `429` | Too Many Requests |
| `500` | Internal Server Error |
| `503` | Service Unavailable |

### Error Response Format

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Your wallet balance is insufficient",
    "details": {
      "required": 99.99,
      "available": 50.00
    },
    "requestId": "req_abc123"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Invalid request parameters |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `ALREADY_EXISTS` | Duplicate resource |
| `INSUFFICIENT_FUNDS` | Wallet balance too low |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `PROVIDER_NOT_VERIFIED` | Provider KYC not complete |
| `LISTING_NOT_AVAILABLE` | Listing unpublished |
| `PAYMENT_FAILED` | Payment processing failed |
| `SUBSCRIPTION_ACTIVE` | Already subscribed |
| `INVALID_COUPON` | Coupon expired or invalid |
| `REVIEW_ALREADY_EXISTS` | Already reviewed this listing |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Read endpoints | 1000/hour |
| Search endpoints | 500/hour |
| Write endpoints | 100/hour |
| Purchase endpoints | 20/hour |
| Webhook endpoints | 10000/hour |

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1623936000
```

---

## Pagination

All list endpoints support pagination:

**Request:**
```http
GET /listings?limit=20&offset=40
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "hasMore": true,
    "nextOffset": 60
  }
}
```

---

*Last Updated: June 17, 2026*  
*Salar OS - API Reference*  
*Part of SUTAR OS - Autonomous Economic Infrastructure*