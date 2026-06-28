# Negotiation OS

Multi-party negotiation engine with BATNA support, bargaining strategies, and contract optimization.

**Port:** 4869

## Purpose

Negotiation OS facilitates complex business negotiations between multiple parties with support for structured negotiation templates, BATNA (Best Alternative to Negotiated Agreement) scoring, multiple bargaining rounds, and fairness evaluation.

## Features

- Negotiation templates for common scenarios
- Multi-party support (buyer, seller, partner, mediator)
- Multi-round negotiation with configurable max rounds
- BATNA scoring and best alternative analysis
- Fairness scoring for negotiated terms
- Negotiation strategies (collaborative, competitive, compromising)
- Complete audit trail and history
- Deadline support for time-sensitive negotiations
- Strategy-based offer generation

## API Endpoints

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List negotiation templates |
| GET | `/api/templates/:id` | Get template details |
| POST | `/api/templates` | Create template |

### Negotiations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/negotiations` | List negotiations |
| GET | `/api/negotiations/:id` | Get negotiation details |
| POST | `/api/negotiations` | Create negotiation |
| POST | `/api/negotiations/:id/offer` | Submit offer |
| POST | `/api/negotiations/:id/accept` | Accept offer |
| POST | `/api/negotiations/:id/reject` | Reject offer |
| POST | `/api/negotiations/:id/cancel` | Cancel negotiation |
| GET | `/api/negotiations/:id/batna` | Get BATNA scores |
| POST | `/api/negotiations/:id/score` | Calculate fairness score |
| GET | `/api/negotiations/:id/history` | Get negotiation history |

### Strategies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/strategies` | List strategies |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit` | Get audit logs |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get statistics |

## Negotiation Types

| Type | Description | Typical Templates |
|------|-------------|-------------------|
| `price` | Pricing negotiations | SaaS, products |
| `contract` | Contract terms | Services, partnerships |
| `partnership` | Strategic partnerships | Joint ventures |
| `supply` | Supply chain deals | Procurement |

## Negotiation Statuses

| Status | Description |
|--------|-------------|
| `proposal` | Initial proposal stage |
| `negotiating` | Active negotiation |
| `counteroffer` | Counter-offers being exchanged |
| `agreed` | Terms agreed upon |
| `failed` | Negotiation failed |
| `cancelled` | Cancelled by party |

## Request/Response Examples

### Create Negotiation

```bash
curl -X POST http://localhost:4869/api/negotiations \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "templateId": "saas-pricing",
    "title": "Enterprise SaaS License Agreement",
    "parties": [
      {
        "name": "Acme Corp",
        "email": "procurement@acme.com",
        "role": "buyer",
        "maxAcceptable": 50000
      },
      {
        "name": "CloudVendor Inc",
        "email": "sales@cloudvendor.com",
        "role": "seller",
        "minAcceptable": 30000
      }
    ],
    "maxRounds": 5,
    "deadline": "2024-12-31T23:59:59Z"
  }'
```

### Submit Offer

```bash
curl -X POST http://localhost:4869/api/negotiations/{negotiationId}/offer \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "partyId": "party-uuid",
    "terms": {
      "price": 45000,
      "duration": 12,
      "users": 100,
      "support": "24/7"
    },
    "totalValue": 45000,
    "message": "This is our best offer for 100 users."
  }'
```

### Accept Offer

```bash
curl -X POST http://localhost:4869/api/negotiations/{negotiationId}/accept \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "partyId": "party-uuid",
    "offerId": "offer-uuid"
  }'
```

## Default Templates

### SaaS Pricing Negotiation
- 5 steps: Intro, Requirements, Pricing, Terms, Close
- Estimated duration: 60 minutes

### Partnership Agreement
- 5 steps: Proposal, Terms, Equity, Responsibilities, Close
- Estimated duration: 120 minutes

### Supply Chain Deal
- 4 steps: Volume, Pricing, Delivery, Payment
- Estimated duration: 45 minutes

## Default Strategies

| Strategy | Type | Description |
|----------|------|-------------|
| Collaborative | collaborative | Win-win approach, counter with fair offers |
| Competitive | competitive | Maximize own value, hold position |
| Compromising | compromising | Split the difference, meet in middle |

## BATNA Score

BATNA (Best Alternative to Negotiated Agreement) helps parties understand their negotiating power:
- Score: 0-100 (higher is better)
- Best alternative: What they can do if negotiation fails
- Probability: Likelihood of achieving alternative

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4869 | Service port |
| `JWT_SECRET` | - | JWT secret for authentication |

## Dependencies

- `@rtmn/shared` - Shared utilities
- `express` - HTTP framework
- `helmet` - Security headers
- `cors` - CORS support
- `zod` - Schema validation
- `uuid` - ID generation

## Commands

```bash
npm install        # Install dependencies
npm start          # Start the service
npm test           # Run tests
```
