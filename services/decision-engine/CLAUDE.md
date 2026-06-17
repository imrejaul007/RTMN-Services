# Decision Intelligence Engine

**Port:** 4951  
**Status:** Production Ready  
**Version:** 1.0.0

## Overview

The Decision Intelligence Engine is an AI-powered service that makes explainable, traceable decisions for business operations including refunds, cancellations, discounts, and escalations.

## Features

- **Multi-type Decisions**: Handles refund, cancel, discount, escalate, and policy_exception requests
- **Risk Assessment**: Calculates risk scores based on customer history, transaction patterns, and business rules
- **Customer Value Assessment**: Evaluates customer lifetime value, engagement, and potential
- **Policy Evaluation**: Applies configurable business policies with conditions and constraints
- **Approval Routing**: Automatically routes decisions to appropriate approval levels
- **Alternative Options**: Suggests alternative solutions when full approval isn't possible
- **Full Audit Trail**: Complete logging and history of all decisions
- **Multi-tenant Support**: Isolated tenant data with shared infrastructure

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/services/decision-engine

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev

# Or build and run production
npm run build
npm start
```

## API Endpoints

### Make a Decision

```bash
POST /api/decide
Content-Type: application/json

{
  "tenantId": "tenant-123",
  "type": "refund",
  "customer": {
    "id": "cust-456",
    "tier": "gold",
    "lifetimeValue": 15000,
    "accountAge": 180,
    "previousInteractions": 25,
    "previousRefunds": 1,
    "previousDisputes": 0
  },
  "transaction": {
    "id": "txn-789",
    "amount": 7500,
    "currency": "USD",
    "type": "purchase",
    "date": "2026-06-10T00:00:00Z"
  },
  "reason": "Product did not meet expectations",
  "requestedAmount": 7500,
  "priority": "normal"
}
```

### Batch Decisions

```bash
POST /api/decide/batch
Content-Type: application/json

{
  "tenantId": "tenant-123",
  "requests": [...],
  "strategy": "parallel",
  "failFast": false
}
```

### Simulate Decision (No Persistence)

```bash
POST /api/decide/simulate
# Same body as /decide
```

## Decision Types

| Type | Description |
|------|-------------|
| `refund` | Refund requests |
| `cancel` | Cancellation requests |
| `discount` | Discount requests |
| `escalate` | Escalation requests |
| `policy_exception` | Policy exception requests |

## Decision Outcomes

| Outcome | Description |
|---------|-------------|
| `approved` | Fully approved |
| `denied` | Denied |
| `partial` | Partially approved |
| `escalated` | Escalated for human review |
| `requires_review` | Requires human review |

## Approval Routes

| Route | Level | Description |
|-------|-------|-------------|
| `auto` | 1 | Automatic approval |
| `supervisor` | 2 | Supervisor approval |
| `manager` | 3 | Manager approval |
| `director` | 4 | Director approval |
| `vp` | 5 | VP approval |
| `executive` | 6 | Executive approval |

## Risk Levels

| Level | Score Range | Description |
|-------|-------------|-------------|
| `low` | 0-29 | Low risk |
| `medium` | 30-59 | Medium risk |
| `high` | 60-79 | High risk |
| `critical` | 80-100 | Critical risk |

## Policy Management

### Create Policy

```bash
POST /api/policies
Content-Type: application/json

{
  "tenantId": "tenant-123",
  "name": "VIP Refund Policy",
  "description": "Expedited refunds for VIP customers",
  "type": ["refund"],
  "priority": 80,
  "conditions": [
    { "field": "customer.tier", "operator": "in", "value": ["vip", "platinum"] }
  ],
  "constraints": [
    { "name": "Amount Limit", "type": "amount", "operator": "lte", "value": 100000 }
  ],
  "outcomes": [
    { "condition": "{}", "outcome": "approved", "reasoning": "VIP customer - auto approved" }
  ]
}
```

### Seed Default Policies

```bash
POST /api/policies/seed
Content-Type: application/json

{ "tenantId": "tenant-123" }
```

## Decision History

### Get History

```bash
GET /api/history?tenantId=tenant-123&type=refund&outcome=approved&page=1&limit=20
```

### Get Statistics

```bash
GET /api/history/stats/summary?tenantId=tenant-123&days=30
```

### Get Pending Approvals

```bash
GET /api/history/approvals/pending?tenantId=tenant-123
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DECISION ENGINE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────────┐                      │
│  │  API Layer   │────▶│  Decision Maker  │                      │
│  │  /decide     │     └────────┬─────────┘                      │
│  │  /policies   │              │                                 │
│  │  /history    │     ┌────────┴─────────┐                      │
│  └──────────────┘     │                  │                      │
│                       ▼                  ▼                       │
│           ┌───────────────────┐  ┌──────────────────┐           │
│           │  Risk Calculator  │  │ Value Assessor   │           │
│           │  - Risk factors   │  │ - LTV scoring     │           │
│           │  - Risk flags     │  │ - Engagement      │           │
│           │  - Risk levels    │  │ - Potential       │           │
│           └───────────────────┘  └──────────────────┘           │
│                       │                  │                       │
│                       └────────┬─────────┘                       │
│                                ▼                                  │
│           ┌───────────────────┐  ┌──────────────────┐           │
│           │ Policy Evaluator  │  │ Approval Router  │           │
│           │ - Match policies  │  │ - Auto/super/     │           │
│           │ - Check contraints│  │   manager/etc    │           │
│           └───────────────────┘  └──────────────────┘           │
│                                │                                  │
│                                ▼                                  │
│                     ┌──────────────────┐                          │
│                     │ Decision Result  │                          │
│                     │ - Outcome        │                          │
│                     │ - Explanation    │                          │
│                     │ - Alternatives   │                          │
│                     └──────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │      MongoDB         │
                    │  - Decisions         │
                    │  - Policies          │
                    │  - Factors           │
                    └──────────────────────┘
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4951 | Server port |
| `NODE_ENV` | development | Environment |
| `MONGODB_URI` | mongodb://localhost:27017/decision_engine | MongoDB URI |
| `LOG_LEVEL` | info | Logging level |
| `ALLOWED_ORIGINS` | * | CORS origins |

## Integration with RTMN

The Decision Engine integrates with:

- **Service Registry** (4399): Service discovery
- **Event Bus** (4510): Event publishing for decisions
- **Memory OS** (4703): Customer context
- **Goal OS** (4242): Decision goals
- **CorpID** (4702): Identity verification

## Error Handling

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-06-16T00:00:00.000Z",
    "requestId": "req-123"
  }
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [...]
  },
  "meta": { "timestamp": "..." }
}
```

## Rate Limits

- Single decisions: 100/minute per tenant
- Batch decisions: 10/minute per tenant
- Policy operations: 50/minute per tenant

## Support

For issues or questions, contact the RTMN team or open an issue in the repository.
