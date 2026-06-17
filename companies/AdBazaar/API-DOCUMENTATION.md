# AdBazaar API Documentation

> **Version:** 2.0.0 | **Last Updated:** June 16, 2026

---

## Table of Contents

1. [HOJAI AI Gateway](#hojai-ai-gateway)
2. [Intent Signal Aggregator](#intent-signal-aggregator)
3. [Intent Prediction Engine](#intent-prediction-engine)
4. [Intent Marketplace](#intent-marketplace)
5. [Common Patterns](#common-patterns)

---

## HOJAI AI Gateway

**Port:** 4560  
**Purpose:** Central AI intelligence hub for AdBazaar

### Authentication

```bash
# Admin Token
curl -H "X-Admin-Token: your-admin-token" ...

# API Key
curl -H "X-API-Key: your-api-key" ...

# Bearer Token
curl -H "Authorization: Bearer your-token" ...
```

### Endpoints

#### Health & Status

```bash
# Basic health check
GET /health

# Readiness check (includes cache & circuit status)
GET /ready

# Liveness probe
GET /health/live

# Detailed health
GET /health/detailed

# Prometheus metrics
GET /metrics
```

#### Intent Prediction

```bash
POST /api/intent/predict
Content-Type: application/json

{
  "userId": "user-123",
  "context": {
    "category": "DINING",
    "recentSearches": ["pizza", "italian restaurant"]
  }
}

# Response
{
  "success": true,
  "data": {
    "intent": "purchase",
    "confidence": 0.87,
    "recommendations": ["checkout_prompt", "limited_offer", "trust_signals"],
    "nextBestAction": "show_checkout"
  },
  "cached": false
}
```

#### Behavior Prediction

```bash
POST /api/behavior/predict
Content-Type: application/json

{
  "userId": "user-123"
}

# Response
{
  "success": true,
  "data": {
    "churnRisk": "low",
    "ltvScore": 0.85,
    "purchaseProbability": 0.72,
    "nextPurchaseCategory": "shopping"
  }
}
```

#### Audience Segments

```bash
POST /api/audience/segments
Content-Type: application/json

{
  "criteria": {
    "category": "RETAIL",
    "minQualityScore": 80,
    "maxPrice": 2.00
  }
}

# Response
{
  "success": true,
  "data": {
    "segments": [
      {
        "id": "seg_1",
        "name": "High Intent Buyers",
        "size": 50000,
        "matchScore": 0.92
      },
      {
        "id": "seg_2",
        "name": "Price Sensitive",
        "size": 75000,
        "matchScore": 0.85
      }
    ],
    "totalReach": 125000
  }
}
```

#### Targeting Optimization

```bash
POST /api/targeting/optimize
Content-Type: application/json

{
  "campaignObjective": "conversion",
  "budget": 50000,
  "audience": { "ageRange": "25-45" }
}

# Response
{
  "success": true,
  "data": {
    "targetingParams": {
      "ageRange": { "min": 25, "max": 45 },
      "interests": ["shopping", "food", "travel"],
      "location": { "cities": ["Mumbai", "Delhi", "Bangalore"] },
      "deviceTypes": ["mobile"]
    },
    "estimatedReach": 1000,
    "expectedCTR": 0.04,
    "suggestedBid": 50
  }
}
```

#### Campaign Prediction

```bash
POST /api/campaign/predict
Content-Type: application/json

{
  "budget": 50000,
  "targeting": { "ageRange": "25-45" },
  "creative": { "type": "image" }
}

# Response
{
  "success": true,
  "data": {
    "expectedImpressions": 1000000,
    "expectedClicks": 40000,
    "expectedConversions": 2000,
    "expectedCPM": 50,
    "expectedCPC": 1.25,
    "expectedROAS": 3.2,
    "confidence": 0.85
  }
}
```

#### Creative Generation

```bash
POST /api/creative/generate
Content-Type: application/json

{
  "product": "Premium Pizza",
  "objective": "conversion",
  "audience": { "ageRange": "25-35" }
}

# Response
{
  "success": true,
  "data": {
    "headlines": [
      "Discover Premium Pizza Today!",
      "Premium Pizza - Special Offer Just For You",
      "Get Premium Pizza at Best Prices",
      "Limited Time: Premium Pizza Deals"
    ],
    "descriptions": [
      "Experience the best Premium Pizza with exclusive deals. Shop now!",
      "Premium quality Premium Pizza awaits you. Limited time offer!",
      "Don't miss out on Premium Pizza - Your satisfaction guaranteed."
    ],
    "ctas": ["Shop Now", "Buy Now", "Get Started", "Order Today"]
  }
}
```

#### Lead Scoring

```bash
POST /api/leads/score
Content-Type: application/json

{
  "leads": [
    { "id": "lead-1", "email": "john@example.com", "source": "website" },
    { "id": "lead-2", "email": "jane@example.com", "source": "referral" }
  ]
}

# Response
{
  "success": true,
  "data": [
    { "id": "lead-1", "score": 85, "quality": "hot", "reasons": ["Active user", "Recent engagement"] },
    { "id": "lead-2", "score": 62, "quality": "warm", "reasons": ["Active user", "Recent engagement"] }
  ]
}
```

#### Fraud Detection

```bash
POST /api/fraud/detect
Content-Type: application/json

{
  "userId": "user-123",
  "events": [
    { "type": "click", "timestamp": "2026-06-16T10:00:00Z" },
    { "type": "click", "timestamp": "2026-06-16T10:00:01Z" }
  ]
}

# Response
{
  "success": true,
  "data": {
    "isFraudulent": false,
    "fraudScore": 0.05,
    "riskFactors": []
  }
}
```

#### Content Personalization

```bash
POST /api/content/personalize
Content-Type: application/json

{
  "userId": "user-123",
  "items": [
    { "id": "item-1", "score": 0.8 },
    { "id": "item-2", "score": 0.6 },
    { "id": "item-3", "score": 0.4 }
  ]
}

# Response
{
  "success": true,
  "data": [
    { "id": "item-1", "personalizedScore": 0.8, "reason": "Based on your preferences" },
    { "id": "item-2", "personalizedScore": 0.6, "reason": "Based on your preferences" },
    { "id": "item-3", "personalizedScore": 0.4, "reason": "Based on your preferences" }
  ]
}
```

#### Next Best Action

```bash
POST /api/action/next-best
Content-Type: application/json

{
  "userId": "user-123",
  "context": { "lastAction": "viewed_product" }
}

# Response
{
  "success": true,
  "data": {
    "action": "offer_discount",
    "confidence": 0.82,
    "expectedOutcome": "20% conversion lift"
  }
}
```

#### Recommendations

```bash
POST /api/recommendations
Content-Type: application/json

{
  "userId": "user-123",
  "context": { "category": "DINING" }
}

# Response
{
  "success": true,
  "data": [
    "show_recommendations",
    "send_notification",
    "offer_discount",
    "loyalty_benefits",
    "personalized_deals"
  ]
}
```

#### Admin Endpoints

```bash
# Get circuit breaker status
GET /api/circuit-breakers

# Get cache statistics
GET /api/cache/stats

# Clear cache
POST /api/cache/clear

# Get service configuration
GET /api/config
```

---

## Intent Signal Aggregator

**Port:** 4800  
**Purpose:** Collects and processes intent signals from the REZ ecosystem

### Authentication

```bash
curl -H "X-Internal-Service: intent-signal-aggregator" \
     -H "X-Internal-Token: your-token" ...
```

### Signal Sources

| Source | Description |
|--------|-------------|
| `buzzlocal` | Local business discovery |
| `airzy` | Travel services |
| `rez-menu-qr` | QR menu/ordering |
| `rez-now` | Quick commerce |
| `risacare` | Healthcare |
| `corpperks` | Corporate benefits |

### Signal Event Types

| Event Type | Confidence |
|------------|------------|
| `fulfilled` | 0.95 |
| `checkout_start` | 0.85 |
| `cart_add` | 0.75 |
| `wishlist` | 0.60 |
| `view` | 0.40 |
| `search` | 0.30 |

### Signal Categories

| Category | Description |
|----------|-------------|
| `DINING` | Restaurant & food |
| `TRAVEL` | Travel & hospitality |
| `RETAIL` | Shopping & products |
| `HEALTHCARE` | Medical & health |
| `GENERAL` | Other categories |

### Endpoints

#### Ingest Single Signal

```bash
POST /api/signals/ingest
Content-Type: application/json
X-Internal-Service: hojai-ai-gateway
X-Internal-Token: your-token

{
  "source": "buzzlocal",
  "sourceService": "rez-search",
  "userId": "user-123",
  "eventType": "search",
  "category": "DINING",
  "intentKey": "italian-restaurant",
  "intentQuery": "italian restaurant near me",
  "metadata": {
    "location": { "lat": 19.07, "lng": 72.87 },
    "device": "mobile"
  }
}

# Response (success)
{
  "success": true,
  "signalId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Signal ingested successfully"
}

# Response (duplicate)
{
  "success": true,
  "signalId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Duplicate signal ignored",
  "duplicate": true
}
```

#### Batch Ingest Signals

```bash
POST /api/signals/batch
Content-Type: application/json
X-Internal-Service: hojai-ai-gateway
X-Internal-Token: your-token

{
  "signals": [
    {
      "source": "buzzlocal",
      "sourceService": "rez-search",
      "userId": "user-123",
      "eventType": "search",
      "category": "DINING",
      "intentKey": "pizza"
    },
    {
      "source": "buzzlocal",
      "sourceService": "rez-search",
      "userId": "user-123",
      "eventType": "view",
      "category": "DINING",
      "intentKey": "pizza-hut"
    }
  ]
}

# Response
{
  "success": true,
  "processed": 2,
  "duplicates": 0,
  "failed": 0,
  "signalIds": ["id-1", "id-2"],
  "errors": []
}
```

#### Get Signal Statistics

```bash
GET /api/signals/stats

# Response
{
  "success": true,
  "data": {
    "total": 125000,
    "bySource": [
      { "_id": "buzzlocal", "count": 45000 },
      { "_id": "airzy", "count": 30000 }
    ],
    "byEventType": [
      { "_id": "view", "count": 50000 },
      { "_id": "search", "count": 35000 }
    ],
    "byCategory": [
      { "_id": "DINING", "count": 60000 },
      { "_id": "RETAIL", "count": 40000 }
    ]
  }
}
```

#### Get User Signals

```bash
GET /api/signals/user/user-123?limit=100&offset=0

# Response
{
  "success": true,
  "data": {
    "signals": [
      {
        "signalId": "...",
        "source": "buzzlocal",
        "eventType": "search",
        "category": "DINING",
        "intentKey": "italian-restaurant",
        "confidence": 0.35,
        "enriched": true,
        "timestamp": "2026-06-16T10:00:00Z"
      }
    ],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "count": 1
    }
  }
}
```

#### Get Signal by ID

```bash
GET /api/signals/signal-id-here

# Response
{
  "success": true,
  "data": { ... }
}
```

#### Get Signals by Source

```bash
GET /api/signals/source/buzzlocal?limit=50&offset=0

# Response
{
  "success": true,
  "data": {
    "signals": [...],
    "pagination": { ... }
  }
}
```

---

## Intent Prediction Engine

**Port:** 4801  
**Purpose:** ML-powered intent analysis and audience segmentation

### Endpoints

#### Score Intent

```bash
POST /api/predict/intent-score
Content-Type: application/json

{
  "userId": "user-123",
  "category": "DINING",
  "signals": [
    { "type": "search", "query": "pizza", "timestamp": "..." },
    { "type": "view", "product": "pizza-hut", "timestamp": "..." }
  ]
}

# Response
{
  "success": true,
  "data": {
    "intentScore": 0.85,
    "intentCategory": "purchase",
    "confidence": 0.92,
    "signals": ["recent_search", "product_view", "price_check"]
  }
}
```

#### Generate Audience

```bash
POST /api/predict/audience
Content-Type: application/json

{
  "criteria": {
    "category": "DINING",
    "minAge": 25,
    "maxAge": 45,
    "location": "Mumbai"
  }
}

# Response
{
  "success": true,
  "data": {
    "segments": [
      {
        "segmentId": "seg-1",
        "name": "Dining Enthusiasts",
        "userCount": 25000,
        "matchScore": 0.88,
        "avgOrderValue": 450
      }
    ],
    "totalReach": 25000
  }
}
```

#### Get Revival Candidates

```bash
GET /api/predict/revival-candidates?category=DINING&limit=100

# Response
{
  "success": true,
  "data": {
    "candidates": [
      {
        "userId": "user-123",
        "lastActivity": "2026-06-01T10:00:00Z",
        "daysSinceActivity": 15,
        "dormancyScore": 0.72,
        "recommendedAction": "win_back_offer"
      }
    ],
    "total": 100
  }
}
```

#### Generate Lookalike

```bash
POST /api/predict/lookalike
Content-Type: application/json

{
  "sourceSegmentId": "seg-1",
  "targetSize": 10000
}

# Response
{
  "success": true,
  "data": {
    "lookalikeSegmentId": "seg-lookalike-1",
    "userCount": 10000,
    "similarityScore": 0.85,
    "topAttributes": ["similar_browsing", "same_age_group", "same_location"]
  }
}
```

---

## Intent Marketplace

**Port:** 4802  
**Purpose:** Buy and sell audience segments

### Pre-built Segments

| Segment | Price | Quality | Conversion |
|---------|-------|---------|------------|
| Active Buyers | $2.50/1K | 95 | 8.5% |
| Dormant Interest | $0.75/1K | 72 | 3.2% |
| Deep Researchers | $1.25/1K | 88 | 5.8% |
| Near Purchase | $4.00/1K | 98 | 15.2% |

### Endpoints

#### List Segments

```bash
GET /api/marketplace/segments?category=E-Commerce&minQualityScore=80

# Response
{
  "success": true,
  "data": {
    "segments": [
      {
        "segmentId": "seg-active-buyers",
        "name": "Active Buyers",
        "category": "E-Commerce",
        "userCount": 2500000,
        "price": 2.50,
        "pricingModel": "rtb",
        "qualityScore": 95,
        "avgConversionRate": 8.5
      }
    ],
    "total": 5,
    "page": 1,
    "totalPages": 1
  }
}
```

#### Purchase Segment

```bash
POST /api/marketplace/purchase
Content-Type: application/json

{
  "segmentId": "seg-active-buyers",
  "quantity": 10000,
  "campaignId": "camp-123",
  "pricingModel": "rtb"
}

# Response
{
  "success": true,
  "data": {
    "purchaseId": "pur-123",
    "segmentId": "seg-active-buyers",
    "quantity": 10000,
    "totalCost": 25.00,
    "status": "confirmed"
  }
}
```

---

## Common Patterns

### Error Response Format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

### Pagination

All list endpoints support pagination:

```
?page=1&limit=50
```

Response includes:
```json
{
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20
  }
}
```

### Rate Limiting

Headers included in every response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1623840000
```

### Circuit Breaker Behavior

When a backend service fails, the gateway returns cached/fallback data:

```json
{
  "success": true,
  "data": { ... },
  "circuitOpen": true,
  "fallback": true
}
```

---

## SDK Examples

### JavaScript/Node.js

```javascript
import axios from 'axios';

class AdBazaarClient {
  constructor(baseUrl, token) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-Admin-Token': token,
        'Content-Type': 'application/json'
      }
    });
  }

  async predictIntent(userId, context) {
    const { data } = await this.client.post('/api/intent/predict', {
      userId,
      context
    });
    return data;
  }

  async ingestSignal(signal) {
    const { data } = await this.client.post('/api/signals/ingest', signal);
    return data;
  }
}

// Usage
const client = new AdBazaarClient('http://localhost:4560', 'your-token');
const intent = await client.predictIntent('user-123', { category: 'DINING' });
```

### Python

```python
import requests

class AdBazaarClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'X-Admin-Token': token,
            'Content-Type': 'application/json'
        }

    def predict_intent(self, user_id, context=None):
        response = requests.post(
            f'{self.base_url}/api/intent/predict',
            json={'userId': user_id, 'context': context or {}},
            headers=self.headers
        )
        return response.json()

# Usage
client = AdBazaarClient('http://localhost:4560', 'your-token')
intent = client.predict_intent('user-123', {'category': 'DINING'})
```

---

## Support

- **Service Registry:** http://localhost:4399/api/services
- **Slack:** #adbazaar-support
- **Email:** adbazaar@rtmn.io
