# Customer Success OS - Lifecycle Management

**Version:** 1.0.0  
**Port:** 4050  
**Status:** ✅ RUNNING | **June 18, 2026**

---

## Overview

Customer Success OS manages the complete **customer lifecycle** - from onboarding to expansion, tracking NPS, health scores, and churn prediction.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       Customer Success OS (4050)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                       LIFECYCLE STAGES                                  │       │
│  │                                                                       │       │
│  │   Prospect ──→ Onboarding ──→ Active ──→ Expansion ──→ Churn         │       │
│  │                                                                       │       │
│  │   NPS Surveys │ Health Scores │ Churn Prediction │ Check-ins          │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
services/customer-success-os/
├── src/
│   └── index.js              # Customer Success API
├── package.json
└── CLAUDE.md
```

---

## Modules

| Module | Description |
|--------|-------------|
| Onboarding Journey | Automated onboarding workflows |
| NPS Surveys | Net Promoter Score collection |
| Health Scores | Customer health metrics |
| Churn Prediction | AI-powered churn risk detection |
| Check-ins | Scheduled customer touchpoints |
| CS Campaigns | Customer success campaigns |
| Touchpoints | Interaction tracking |
| Expansion Tracking | Upsell/cross-sell opportunities |

---

## Key Features

| Feature | Description |
|---------|-------------|
| NPS Collection | Automated NPS surveys with sentiment analysis |
| Health Scoring | Engagement, adoption, satisfaction metrics |
| Churn Prediction | Risk factors identification |
| Check-in Scheduling | Automated check-in reminders |
| Expansion Insights | Upsell/cross-sell recommendations |

---

## API Endpoints

### Health & Status
```
GET /health                     # Service health check
GET /ready                     # Readiness
```

### Customer Management
```
GET  /api/customers            # List all customers
GET  /api/customers/:id        # Get customer details
PUT  /api/customers/:id        # Update customer
```

### Health & NPS
```
GET  /api/customers/:id/health    # Get health score
POST /api/customers/:id/nps       # Submit NPS
GET  /api/customers/:id/nps       # Get NPS history
```

### Check-ins
```
POST /api/checkins                # Schedule check-in
GET  /api/checkins/:customerId    # Get check-ins
```

### Churn
```
GET  /api/churn/:customerId       # Get churn risk
GET  /api/churn/at-risk           # List at-risk customers
```

### Campaigns
```
GET  /api/campaigns               # List campaigns
POST /api/campaigns               # Create campaign
```

---

## Example Usage

### Get Customer Health
```bash
curl http://localhost:4050/api/customers/cust_123/health
```

### Submit NPS
```bash
curl -X POST http://localhost:4050/api/customers/cust_123/nps \
  -H "Content-Type: application/json" \
  -d '{"score": 9, "feedback": "Great service!"}'
```

### Get Churn Risk
```bash
curl http://localhost:4050/api/churn/cust_123
```

### List At-Risk Customers
```bash
curl http://localhost:4050/api/churn/at-risk
```

---

## Connected Services

| Service | Port | Integration |
|---------|------|-------------|
| Sales OS | 5055 | Customer data |
| Marketing OS | 5500 | Campaigns |
| REZ CRM | 4056 | Customer records |
| REZ Wallet | 4004 | Transactions |
| TwinOS | 4705 | Customer twin |

---

## Environment Variables

```env
PORT=4050
```

---

## Quick Start

```bash
cd services/customer-success-os
npm install
npm start

# Health check
curl http://localhost:4050/health
```

---

*Last Updated: June 18, 2026*
