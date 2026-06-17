# Subscription Twin Service

**Version:** 1.0.0
**Port:** 4902
**Status:** Production Ready

## Overview

The Subscription Twin service manages recurring subscriptions, billing cycles, plans, and usage tracking for the RTMN ecosystem. It provides multi-tenant support with comprehensive subscription lifecycle management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Subscription Twin                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Subscriptions│  │    Plans    │  │   Billing   │         │
│  │   Routes     │  │   Routes    │  │   Routes    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                 │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │ Subscription│  │    Plan     │  │ BillingCycle│         │
│  │   Model     │  │   Model     │  │   Model     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │              Usage Model + Records               │        │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │              Analytics Service                   │        │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### Subscription
- `subscriptionId` - Unique identifier (e.g., SUB-XXXXX)
- `tenantId` - Multi-tenant organization ID
- `customerId` - Customer identifier
- `plan` - Plan details (name, price, interval, features)
- `status` - active | paused | cancelled | expired | trial
- `billing` - Billing info (nextBilling, lastBilling, paymentMethod, autoRenew)
- `usage` - Usage tracking (current, limit, unit)
- `startDate`, `endDate`, `trialEnd`

### Plan
- `planId` - Unique identifier
- `name` - Plan name (Free, Basic, Standard, Premium, Enterprise)
- `type` - Plan type enum
- `price` - Price per interval
- `interval` - day | week | month | year
- `features` - Array of feature strings
- `limits` - Usage limits (users, storage, apiCalls)
- `trialDays` - Trial period in days

### BillingCycle
- `billingId` - Unique identifier
- `subscriptionId` - Related subscription
- `amount` - Billing amount
- `status` - pending | completed | failed | refunded | cancelled
- `billingPeriod` - Start and end dates
- `invoiceNumber` - Generated invoice ID

### Usage
- `usageId` - Unique identifier
- `type` - api_calls | storage | users | transactions | custom
- `value` - Current usage value
- `billingPeriodStart/End` - Period boundaries

## API Endpoints

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscriptions` | Create subscription |
| GET | `/api/subscriptions` | List subscriptions |
| GET | `/api/subscriptions/:id` | Get subscription |
| PUT | `/api/subscriptions/:id` | Update subscription |
| DELETE | `/api/subscriptions/:id` | Delete subscription |
| POST | `/api/subscriptions/:id/pause` | Pause subscription |
| POST | `/api/subscriptions/:id/resume` | Resume subscription |
| POST | `/api/subscriptions/:id/cancel` | Cancel subscription |
| POST | `/api/subscriptions/:id/renew` | Renew subscription |

### Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/plans` | Create plan |
| GET | `/api/plans` | List plans |
| GET | `/api/plans/:id` | Get plan |
| PUT | `/api/plans/:id` | Update plan |
| DELETE | `/api/plans/:id` | Deactivate plan |
| POST | `/api/plans/seed/:tenantId` | Seed default plans |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing` | Create billing cycle |
| GET | `/api/billing` | List billing cycles |
| GET | `/api/billing/:id` | Get billing cycle |
| PUT | `/api/billing/:id` | Update billing |
| POST | `/api/billing/:id/pay` | Mark as paid |
| POST | `/api/billing/:id/fail` | Mark as failed |
| POST | `/api/billing/:id/refund` | Refund billing |
| GET | `/api/billing/subscription/:id` | Subscription billing history |
| GET | `/api/billing/customer/:id` | Customer billing history |

### Usage
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/usage/track` | Track usage |
| GET | `/api/usage/subscription/:id` | Get subscription usage |
| GET | `/api/usage/records/:id` | Get usage records |
| PUT | `/api/usage/:id` | Update usage |
| POST | `/api/usage/subscription/:id/reset` | Reset usage |
| GET | `/api/usage/analytics/:tenantId` | Usage analytics |

## Usage Examples

### Create a Subscription
```bash
curl -X POST http://localhost:4902/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-001",
    "customerId": "cust-123",
    "plan": {
      "name": "Premium",
      "price": 99.99,
      "interval": "month",
      "features": ["unlimited_access", "priority_support"]
    },
    "billing": {
      "paymentMethod": "card",
      "autoRenew": true
    }
  }'
```

### Track Usage
```bash
curl -X POST http://localhost:4902/api/usage/track \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-001",
    "subscriptionId": "SUB-XXXXX",
    "customerId": "cust-123",
    "type": "api_calls",
    "amount": 100,
    "description": "API usage for reporting"
  }'
```

### Get Analytics
```bash
curl http://localhost:4902/api/subscriptions?tenantId=tenant-001&status=active
```

## Environment Variables

```env
PORT=4902
MONGODB_URI=mongodb://localhost:27017/subscription_twin
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:4000
LOG_LEVEL=info
```

## Metrics & Analytics

The service provides:
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Churn Rate
- Payment Success Rate
- Collection Rate
- Usage by Type
- Plan Distribution
- Customer Lifetime Value (LTV)

## Default Plans

| Plan | Price | Interval | Features |
|------|-------|----------|----------|
| Free | $0 | month | Basic access, 5 users, 1GB storage |
| Basic | $9.99 | month | Standard access, 25 users, 10GB storage |
| Standard | $29.99 | month | Premium access, 100 users, 100GB storage |
| Premium | $99.99 | month | All features, unlimited users, 1TB storage |
| Enterprise | $299.99 | month | Enterprise features, unlimited everything |

## Health Check

```bash
curl http://localhost:4902/health
```

Response:
```json
{
  "status": "healthy",
  "service": "subscription-twin",
  "timestamp": "2026-06-16T10:00:00.000Z",
  "uptime": 3600,
  "mongoStatus": "connected"
}
```

## Related Services

- **CorpID** (4702) - Universal Identity
- **Memory OS** (4703) - Personal AI Memory
- **Goal OS** (4242) - Autonomous Goals
- **REZ-ecosystem-connector** (4399) - Service Registry
- **REZ-event-bus** (4510) - Pub/Sub Events

## License

MIT
