# SUTAR OS API Reference

**Version:** 4.0.0  
**Last Updated:** June 22, 2026

> **Change log v4.0 (2026-06-22):**
> - Renumbered ports: Trust 4180→**4291**, Contract 4185→**4292**, Negotiation 4191→**4293**, Economy 4251→**4294**, Decision 4240→**4290**
> - Added **Hub access pattern** as the recommended way to call SUTAR (production-grade, body-forwarding fix in place)
> - Added **Phase C backbone endpoints** (supplier-registry, logistics, warehouse-network, trade-finance)

---

## Base URLs

### Recommended: via RTMN Hub (production)

| Environment | Base URL |
|-------------|----------|
| Local | `http://localhost:4399` |
| Staging | `https://hub-staging.rtmn.ai` |
| Production | `https://hub.rtmn.ai` |

Then call any SUTAR service via:

```
http://localhost:4399/api/sutar/<service>/<endpoint>
http://localhost:4399/api/nexha/<service>/<endpoint>   # for Phase C backbone
```

### Direct service URL (development only)

| Environment | Gateway | Notes |
|-------------|---------|-------|
| Local | `http://localhost:4140` | SUTAR Gateway (registry + capability map) |
| Staging | `https://sutar-staging.hojai.ai` | |
| Production | `https://sutar.hojai.ai` | |

Direct calls bypass the Hub and are not body-forwarding-safe; use the Hub for any non-trivial request.

## Authentication

All API requests require JWT authentication:

```http
Authorization: Bearer <jwt_token>
```

Get a token:
```http
POST /api/auth/login
Content-Type: application/json

{
  "agentId": "agent_123",
  "secret": "your_secret"
}
```

---

## 1. SUTAR Gateway API (Port 4140)

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "sutar-gateway",
  "version": "3.0.0",
  "uptime": 86400
}
```

### List All Services
```http
GET /api/services
```

Response:
```json
{
  "services": [
    {
      "name": "sutar-marketplace",
      "port": 4250,
      "status": "active",
      "version": "3.0.0"
    }
  ]
}
```

### Route Request
```http
POST /api/route
Content-Type: application/json

{
  "service": "sutar-marketplace",
  "endpoint": "/api/marketplace/services",
  "method": "GET",
  "params": {}
}
```

---

## 2. ~~SUTAR Marketplace API (Port 4250)~~ — MOVED to BLR AI Marketplace (2026-06-21)

> **Note (2026-06-21):** The marketplace service group formerly described here has been moved from `sutar-os/marketplace/` to [`companies/HOJAI-AI/blr-ai-marketplace/services/`](../../companies/HOJAI-AI/blr-ai-marketplace/services/). See BLR AI Marketplace CLAUDE.md for current API.

### List Services
```http
GET /api/marketplace/services?category=ai-agents&limit=20
```

Response:
```json
{
  "services": [
    {
      "id": "svc_123",
      "name": "Restaurant AI Agent",
      "category": "ai-agents",
      "provider": "hojai-ai",
      "price": 99.99,
      "currency": "USD",
      "trustScore": 95,
      "rating": 4.8
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### Create Listing
```http
POST /api/marketplace/listings
Content-Type: application/json

{
  "name": "My AI Service",
  "category": "ai-agents",
  "description": "AI service description",
  "price": 49.99,
  "currency": "USD",
  "capabilities": ["nlp", "vision", "speech"]
}
```

### Get Service Details
```http
GET /api/marketplace/services/:id
```

### Purchase Service
```http
POST /api/marketplace/purchase
Content-Type: application/json

{
  "serviceId": "svc_123",
  "paymentMethodId": "pm_xxx",
  "duration": "monthly"
}
```

### Search Services
```http
POST /api/marketplace/search
Content-Type: application/json

{
  "query": "restaurant AI",
  "filters": {
    "category": "ai-agents",
    "minTrustScore": 80,
    "maxPrice": 100
  }
}
```

### List Categories
```http
GET /api/marketplace/categories
```

Response:
```json
{
  "categories": [
    "ai-agents",
    "digital-twins",
    "industry-os",
    "knowledge-packs",
    "workflows",
    "skills"
  ]
}
```

---

## 3. SUTAR Decision Engine API (Port **4290**) ← renumbered 2026-06-22

### Evaluate Decision
```http
POST /api/decisions/evaluate
Content-Type: application/json

{
  "context": "loan-application",
  "data": {
    "amount": 50000,
    "creditScore": 750,
    "income": 80000
  },
  "options": ["approve", "reject", "review"]
}
```

Response:
```json
{
  "decision": "approve",
  "confidence": 0.92,
  "reasoning": "Strong credit profile and sufficient income",
  "factors": [
    { "factor": "creditScore", "weight": 0.4, "value": 0.85 },
    { "factor": "income", "weight": 0.3, "value": 0.90 }
  ]
}
```

### Check Policy
```http
POST /api/policies/check
Content-Type: application/json

{
  "policy": "data-retention",
  "action": "delete-old-data",
  "context": { "age": 365 }
}
```

### Decision History
```http
GET /api/decisions/history?limit=50&offset=0
```

---

## 4. SUTAR Negotiation Engine API (Port **4293**) ← renumbered 2026-06-22

### Start Negotiation
```http
POST /api/negotiations
Content-Type: application/json

{
  "parties": ["agent_buyer", "agent_seller"],
  "subject": "service-purchase",
  "initialOffer": {
    "price": 1000,
    "deliveryTime": "24h",
    "quality": "premium"
  }
}
```

Response:
```json
{
  "negotiationId": "neg_123",
  "status": "active",
  "currentRound": 1,
  "currentOffer": {
    "price": 1000,
    "deliveryTime": "24h",
    "quality": "premium"
  }
}
```

### Get Negotiation Status
```http
GET /api/negotiations/:id
```

### Submit Offer
```http
POST /api/negotiations/:id/offer
Content-Type: application/json

{
  "party": "agent_buyer",
  "offer": {
    "price": 900,
    "deliveryTime": "48h"
  }
}
```

### Accept Offer
```http
POST /api/negotiations/:id/accept
Content-Type: application/json

{
  "party": "agent_seller"
}
```

### Reject Offer
```http
POST /api/negotiations/:id/reject
Content-Type: application/json

{
  "party": "agent_buyer",
  "reason": "Price too high"
}
```

---

## 5. SUTAR Trust Engine API (Port **4291**) ← renumbered 2026-06-22

### Get Agent Trust Score
```http
GET /api/trust/agent/:id
```

Response:
```json
{
  "agentId": "agent_123",
  "trustScore": 92,
  "reputation": "excellent",
  "totalTransactions": 1500,
  "successRate": 0.98,
  "badges": ["verified", "top-rated", "fast-responder"]
}
```

### Submit Feedback
```http
POST /api/trust/feedback
Content-Type: application/json

{
  "agentId": "agent_123",
  "rating": 5,
  "comment": "Excellent service!",
  "transactionId": "tx_456"
}
```

### Get Reputation
```http
GET /api/trust/reputation/:id
```

---

## 6. SUTAR Discovery Engine API (Port 4256)

### List Opportunities
```http
GET /api/discovery/opportunities?category=business&minValue=10000
```

### Match Opportunities
```http
POST /api/discovery/match
Content-Type: application/json

{
  "agentId": "agent_123",
  "capabilities": ["nlp", "vision"],
  "budget": 5000
}
```

### Get Recommendations
```http
GET /api/discovery/recommendations?agentId=agent_123
```

---

## 7. SUTAR Goal OS API (Port 4242)

### Create Goal
```http
POST /api/goals
Content-Type: application/json

{
  "name": "Increase revenue",
  "description": "Increase monthly revenue by 20%",
  "target": { "metric": "revenue", "value": 120000, "unit": "USD" },
  "deadline": "2026-12-31",
  "priority": "high"
}
```

### Get Goal
```http
GET /api/goals/:id
```

### Decompose Goal
```http
POST /api/goals/:id/decompose
```

Response:
```json
{
  "parentGoalId": "goal_123",
  "subGoals": [
    {
      "id": "subgoal_1",
      "name": "Increase customer acquisition",
      "contribution": 0.5
    },
    {
      "id": "subgoal_2",
      "name": "Increase average order value",
      "contribution": 0.3
    },
    {
      "id": "subgoal_3",
      "name": "Reduce churn",
      "contribution": 0.2
    }
  ]
}
```

### Track Progress
```http
GET /api/goals/:id/progress
```

---

## 8. SUTAR Contract OS API (Port **4292**) ← renumbered 2026-06-22

### Create Contract
```http
POST /api/contracts
Content-Type: application/json

{
  "type": "service-agreement",
  "parties": ["agent_buyer", "agent_seller"],
  "terms": {
    "service": "AI agent",
    "price": 1000,
    "duration": "30 days",
    "deliverables": ["deployment", "training"]
  },
  "conditions": {
    "startDate": "2026-07-01",
    "endDate": "2026-07-31"
  }
}
```

### Get Contract
```http
GET /api/contracts/:id
```

### Execute Contract
```http
POST /api/contracts/:id/execute
```

### Terminate Contract
```http
POST /api/contracts/:id/terminate
Content-Type: application/json

{
  "reason": "Mutual agreement",
  "refund": true
}
```

---

## 9. SUTAR Economy OS API (Port **4294**) ← renumbered 2026-06-22

### Get Balance
```http
GET /api/economy/balance/:agentId
```

### Transfer Funds
```http
POST /api/economy/transfer
Content-Type: application/json

{
  "from": "agent_buyer",
  "to": "agent_seller",
  "amount": 1000,
  "currency": "USD"
}
```

### Transaction History
```http
GET /api/economy/transactions?agentId=agent_123&limit=50
```

---

## 10. SUTAR Simulation OS API (Port 4241)

### Run Simulation
```http
POST /api/simulation/run
Content-Type: application/json

{
  "scenario": "revenue-growth",
  "variables": {
    "marketingSpend": 10000,
    "priceIncrease": 0.1,
    "newMarkets": 2
  },
  "iterations": 10000
}
```

Response:
```json
{
  "simulationId": "sim_123",
  "results": {
    "expectedRevenue": 125000,
    "confidenceInterval": [115000, 135000],
    "successProbability": 0.78
  }
}
```

### Get Simulation Results
```http
GET /api/simulation/:id
```

---

## 11. SUTAR Usage Tracker API (Port 4252)

### Record Usage
```http
POST /api/usage/record
Content-Type: application/json

{
  "agentId": "agent_123",
  "serviceId": "svc_456",
  "quantity": 100,
  "unit": "api-calls"
}
```

### Get Usage Stats
```http
GET /api/usage/stats?agentId=agent_123&period=month
```

---

## 12. SUTAR Flow OS API (Port 4244)

### Create Workflow
```http
POST /api/flows
Content-Type: application/json

{
  "name": "Onboarding Flow",
  "steps": [
    { "service": "identity-os", "action": "verify" },
    { "service": "trust-engine", "action": "score" },
    { "service": "marketplace", "action": "list" }
  ]
}
```

### Execute Workflow
```http
POST /api/flows/:id/execute
```

### Get Workflow Status
```http
GET /api/flows/:id/status
```

---

## 13. SUTAR Phase C Backbone (Nexha Commerce Network)

> **Built:** 2026-06-22 — Real implementations of the Nexha procurement/distribution/trade-finance backbone. These services are registered in BOTH the Hub's `SUTAR_SERVICES` and `NEXHA_SERVICES` maps, so they can be reached via either pattern.

### 13.1 sutar-supplier-registry (Port 4280)

```bash
# Via Hub (recommended)
curl http://localhost:4399/api/nexha/sutar-supplier-registry/api/v1/suppliers?category=cement
```

```http
GET /api/v1/suppliers?category=<cat>&state=<2-letter>&minTrustScore=<0-100>
```

Response:
```json
{
  "suppliers": [
    {
      "id": "sup_001",
      "name": "Acme Cement",
      "category": "cement",
      "state": "MH",
      "trustScore": 87,
      "minOrderInr": 50000
    }
  ],
  "total": 1
}
```

```http
POST /api/v1/suppliers
Content-Type: application/json

{
  "name": "Acme Cement",
  "category": "cement",
  "state": "MH",
  "pincode": "421302",
  "contact": {"phone": "+91...", "email": "..."}
}
```

### 13.2 sutar-logistics (Port 4285)

```bash
# Via Hub
curl -X POST http://localhost:4399/api/nexha/sutar-logistics/api/v1/quote \
  -H "Content-Type: application/json" \
  -d '{"origin":"Mumbai","destination":"Bengaluru","package":{"weightKg":10},"serviceLevel":"standard"}'
```

```http
POST /api/v1/quote
Content-Type: application/json

{
  "origin": "Mumbai",
  "destination": "Bengaluru",
  "package": {"weightKg": 10, "volumeM3": 0.05, "fragile": false},
  "serviceLevel": "standard"
}
```

Response includes `quoteId`. **Important:** Quotes are cached by request signature — calling `getQuotes` again with the same parameters returns the same `quoteId`. This is required for `bookShipment(quote.id)` to find the quote.

```http
POST /api/v1/shipments
Content-Type: application/json

{ "quoteId": "qt-...", "senderId": "...", "recipientId": "..." }
```

### 13.3 sutar-warehouse-network (Port 4288)

```bash
# Via Hub
curl "http://localhost:4399/api/nexha/sutar-warehouse-network/api/v1/warehouses?state=MH"
curl http://localhost:4399/api/nexha/sutar-warehouse-network/api/v1/stats
```

```http
GET /api/v1/warehouses?state=<2-letter>&pincode=<6-digit>&needsColdChain=true&minRating=4
```

Response: list of warehouses matching criteria (state, pincode, cold-chain support, hazardous support, min rating, min capacity).

```http
GET /api/v1/warehouses/:id/slots?fromDate=<YYYY-MM-DD>&toDate=<YYYY-MM-DD>
```

Response: list of available slots (14 days × 2 slots/day = 168 slots pre-seeded per warehouse).

```http
POST /api/v1/bookings
Content-Type: application/json

{
  "slotId": "slot-...",
  "warehouseId": "wh-...",
  "entityId": "buyer-...",
  "packageRef": "ORD-12345",
  "capacityKg": 50
}
```

**WMS sub-endpoints** (bins, stock, transfers, pick lists):

```http
GET  /api/v1/wms/bins?warehouseId=<id>
POST /api/v1/wms/stock/receive    # receive stock into a bin
POST /api/v1/wms/stock/adjust     # adjust stock level
POST /api/v1/wms/transfers        # inter-warehouse transfer (pick→receive→cancel lifecycle)
POST /api/v1/wms/pick-lists       # generate pick list for an order
```

### 13.4 sutar-trade-finance (Port 4287)

```bash
# Via Hub
curl -X POST http://localhost:4399/api/nexha/sutar-trade-finance/api/v1/credit-offers \
  -H "Content-Type: application/json" \
  -d '{"entityId":"ent_001","amount":100000,"termMonths":3,"trustScore":78}'
```

```http
POST /api/v1/entities
Content-Type: application/json

{
  "entityId": "ent_001",
  "trustScore": 78,
  "annualRevenueInr": 5000000,
  "monthsInBusiness": 36,
  "sector": "retail"
}
```

```http
POST /api/v1/credit-offers
Content-Type: application/json

{
  "entityId": "ent_001",
  "amount": 100000,
  "currency": "INR",
  "purpose": "working-capital",
  "termMonths": 3
}
```

Response includes:
- `riskBand`: A (12% APR) / B (16%) / C (21%) / D (28%) / E (36% or decline)
- `apr`: annual percentage rate
- `monthlyPayment`: EMI amount
- `totalRepayable`: total over the term
- `disbursementTerms`: escrow conditions

**Note:** `trustScore` is the input the caller provides. The service does **not** call SADA itself — the caller is responsible for fetching it (e.g. `sada.getTrustScore(entityId)` then passing the result).

```http
POST /api/v1/loans/:id/disburse
POST /api/v1/loans/:id/repay
POST /api/v1/loans/:id/dispute     # held escrow
```

### 13.5 sutar-pricing-intelligence (Port 4286, Phase C.6)

Market price aggregation, comparison, alerts, and dynamic pricing recommendations. do-app autopilot uses it to pick the best supplier for "buy groceries" flows.

**Endpoints:**

```http
GET  /health
GET  /ready
GET  /api/v1/info
GET  /api/v1/stats
POST /api/v1/products                   # register a product
GET  /api/v1/products                   # list products
GET  /api/v1/products/:productId        # product details
POST /api/v1/prices                     # record a supplier price
GET  /api/v1/prices/:productId          # all prices for a product
POST /api/v1/compare                    # compare prices, fire alerts
POST /api/v1/dynamic-price              # recommend price (match/undercut/premium)
GET  /api/v1/alerts                     # price alerts history
```

**Compare prices** (cheapest + best-value detection):

```bash
curl -X POST http://localhost:4399/api/nexha/sutar-pricing-intelligence/api/v1/compare \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_001",
    "supplierIds": ["sup_a", "sup_b", "sup_c"]
  }'
# Returns: { cheapest: {...}, bestValue: {...}, avgPrice: 123.45, alert?: {...} }
```

**Dynamic price recommendation** (match/undercut/premium with floor/ceiling):

```bash
curl -X POST http://localhost:4399/api/nexha/sutar-pricing-intelligence/api/v1/dynamic-price \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_001",
    "strategy": "undercut",
    "floor": 100,
    "ceiling": 200,
    "supplierPrices": [{ "supplierId":"sup_a", "price":150 }]
  }'
# Returns: { recommendedPrice: 145, strategy: "undercut", reason: "..." }
```

---

## 14. Hub Access Pattern (How to Call SUTAR from Outside)

The Hub provides two important routes for SUTAR consumers:

```bash
# 1. Capability map — what does each service handle?
curl http://localhost:4399/api/sutar/capabilities
# Returns: { capabilities: { 'team-formation': ['sutar-agent-teaming'], ... }, services: {...} }

# 2. Direct  to any SUTAR service (GET/POST/PUT/PATCH/DELETE)
curl -X POST http://localhost:4399/api/sutar/sutar-agent-teaming/api/teaming/teams \
  -H "Content-Type: application/json" \
  -d '{"name":"price-compare","mission":"compare-prices","size":3}'
```

The Hub's `proxyToUpstream()` helper handles the `express.json()` body-parsing pitfall (re-serializes `req.body` so the upstream service receives the full payload).

For Phase C backbone services, use the `/api/nexha/` prefix:

```bash
curl "http://localhost:4399/api/nexha/sutar-warehouse-network/api/v1/warehouses?state=MH"
```

---

## Error Responses

All APIs return standard error responses:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: agentId",
    "details": {
      "field": "agentId",
      "expected": "string"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Rate Limits

| Service | Limit |
|---------|-------|
| Gateway | 1000 req/min |
| Marketplace | 500 req/min |
| Decision Engine | 200 req/min |
| Negotiation | 100 req/min |
| Trust Engine | 1000 req/min |
| Discovery | 300 req/min |
| Goals | 200 req/min |
| Contracts | 100 req/min |

---

## Webhooks

Subscribe to events:

```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": [
    "negotiation.completed",
    "contract.executed",
    "trust.score.changed"
  ]
}
```

### Event Types

- `negotiation.started`
- `negotiation.completed`
- `negotiation.failed`
- `contract.created`
- `contract.executed`
- `contract.terminated`
- `trust.score.changed`
- `marketplace.listing.created`
- `marketplace.purchase.completed`
- `goal.completed`
- `goal.failed`

---

*Last Updated: June 17, 2026*  
*SUTAR OS API Reference Documentation*
