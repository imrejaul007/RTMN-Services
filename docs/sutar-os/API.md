# SUTAR OS API Reference

**Version:** 3.0.0  
**Last Updated:** June 17, 2026

---

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Local | `http://localhost:4140` |
| Staging | `https://sutar-staging.hojai.ai` |
| Production | `https://sutar.hojai.ai` |

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

## 3. SUTAR Decision Engine API (Port 4240)

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

## 4. SUTAR Negotiation Engine API (Port 4191)

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

## 5. SUTAR Trust Engine API (Port 4180)

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

## 8. SUTAR Contract OS API (Port 4185)

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

## 9. SUTAR Economy OS API (Port 4251)

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
