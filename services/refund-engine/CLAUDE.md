# Refund Engine Service

**Version:** 1.0.0  
**Port:** 4980  
**Status:** Ready for Deployment

---

## Overview

The Refund Engine is a comprehensive service that handles all refund operations including auto-approvals, policy enforcement, and multi-channel refunds. It integrates with the RTMN ecosystem's digital twins, decision engine, and event bus.

## Architecture

```
                    ┌─────────────────────────────┐
                    │      Refund Engine           │
                    │         :4980                │
                    └─────────────┬───────────────┘
                                  │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Decision Engine│      │ Customer Twin   │      │  Payment Twin   │
│    :4240       │      │    :3017        │      │    :3018        │
└───────────────┘      └─────────────────┘      └─────────────────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      Event Bus :4510       │
                    └───────────────────────────┘
```

## Features

### Auto-Approve Rules
- **High Trust Score (750+):** Auto-approve refunds up to $500
- **Small Amounts:** Auto-approve refunds under $50 regardless of trust score
- **First-Time Refunds:** Auto-approve first refund for new customers
- **Channel-Specific:** Different thresholds per channel (order, payment, subscription)

### Policy Engine
- Configurable refund policies per channel
- Time window enforcement (default 30 days)
- Amount limits (min/max)
- Processing fee calculations
- Regulatory compliance tracking

### Multi-Channel Support
- **Order Refunds:** Full/partial order refunds
- **Payment Refunds:** Payment gateway refunds
- **Subscription Refunds:** Subscription cancellations
- **Wallet Refunds:** Wallet credit
- **Loyalty Refunds:** Points/miles refunds

### Integration Points
- **Customer Twin:** Trust scores, customer profiles
- **Payment Twin:** Transaction sync, refund status
- **Agent Twin:** Karma tracking, agent refunds
- **Decision Engine:** Risk evaluation, fraud detection
- **Event Bus:** Async event publishing

## API Endpoints

### Refund Requests
```
POST   /api/refunds                    # Create refund request
GET    /api/refunds/:id                # Get refund by ID
GET    /api/refunds                    # List refunds (with filters)
PATCH  /api/refunds/:id                # Update refund
POST   /api/refunds/:id/approve        # Approve refund
POST   /api/refunds/:id/reject         # Reject refund
POST   /api/refunds/:id/cancel         # Cancel refund
POST   /api/refunds/:id/retry          # Retry failed refund
```

### Policies
```
GET    /api/policies                   # List all policies
GET    /api/policies/:id               # Get policy by ID
POST   /api/policies                   # Create policy
PATCH  /api/policies/:id               # Update policy
DELETE /api/policies/:id               # Delete policy
POST   /api/policies/:id/rules         # Add rule to policy
PATCH  /api/policies/:id/rules/:ruleId # Update rule
DELETE /api/policies/:id/rules/:ruleId # Delete rule
POST   /api/policies/:id/toggle        # Toggle policy enabled
```

### Dashboard
```
GET    /api/dashboard/summary          # Dashboard summary
GET    /api/dashboard/stats/status     # Refunds by status
GET    /api/dashboard/stats/channels   # Refunds by channel
GET    /api/dashboard/stats/trends     # Refund trends
GET    /api/dashboard/stats/reasons    # Top refund reasons
GET    /api/dashboard/pending          # Pending refunds
GET    /api/dashboard/auto-approve/stats # Auto-approve stats
GET    /api/dashboard/export           # Export refunds
```

## Refund Status Flow

```
pending ──┬──► auto_approved ──► processing ──► completed
          │
          ├──► approved ──► processing ──► completed
          │
          ├──► rejected
          │
          └──► cancelled
                    │
                    ▼
                  failed (can retry)
```

## Environment Variables

```bash
PORT=4980
NODE_ENV=development

# Service URLs
DECISION_ENGINE_URL=http://localhost:4240
CUSTOMER_TWIN_URL=http://localhost:3017
PAYMENT_TWIN_URL=http://localhost:3018
AGENT_TWIN_URL=http://localhost:3011
MEMORY_OS_URL=http://localhost:4703
EVENT_BUS_URL=http://localhost:4510
ECOSYSTEM_CONNECTOR_URL=http://localhost:4399

# Refund Configuration
AUTO_APPROVE_THRESHOLD=100.00
MAX_AUTO_APPROVE_AMOUNT=500.00
TRUST_SCORE_THRESHOLD=750
PROCESSING_FEE_PERCENT=2.5

# JWT
JWT_SECRET=your-jwt-secret
```

## Quick Start

```bash
cd services/refund-engine
npm install
npm run dev

# Health check
curl http://localhost:4980/health
```

## Example Usage

### Create Refund Request
```bash
curl -X POST http://localhost:4980/api/refunds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "customerId": "cust_123",
    "channel": "order",
    "channelRefId": "order_456",
    "originalAmount": 150.00,
    "refundAmount": 150.00,
    "reason": "product_not_received"
  }'
```

### Approve Refund
```bash
curl -X POST http://localhost:4980/api/refunds/<id>/approve \
  -H "Authorization: Bearer <token>" \
  -d '{"notes": "Approved after review"}'
```

## Files Structure

```
refund-engine/
├── package.json
├── tsconfig.json
├── .env.example
├── CLAUDE.md
└── src/
    ├── index.ts                  # Express server entry
    ├── models/
    │   ├── Refund.ts             # Refund schema & store
    │   └── Policy.ts             # Policy schema & store
    ├── routes/
    │   ├── requests.ts           # Refund CRUD routes
    │   ├── policies.ts           # Policy management routes
    │   └── dashboard.ts          # Analytics & dashboard routes
    ├── services/
    │   ├── policyEngine.ts       # Policy evaluation
    │   ├── refundProcessor.ts     # Refund execution
    │   ├── decisionEngine.ts      # Decision engine client
    │   ├── customerOpsBridge.ts   # Customer twin integration
    │   ├── twinSync.ts            # Twin synchronization
    │   ├── eventBus.ts            # Event publishing
    │   └── serviceRegistry.ts    # Service discovery
    ├── controllers/
    │   └── healthController.ts   # Health checks
    ├── middleware/
    │   ├── auth.ts               # JWT authentication
    │   ├── errorHandler.ts       # Error handling
    │   └── requestLogger.ts      # Request logging
    └── utils/
        └── logger.ts             # Winston logger
```

## Dependencies

| Service | Port | Required |
|---------|------|----------|
| Ecosystem Connector | 4399 | Yes (registration) |
| Decision Engine | 4240 | No (fallback available) |
| Customer Twin | 3017 | No (defaults available) |
| Payment Twin | 3018 | No (sync optional) |
| Event Bus | 4510 | No (logging only) |

## Metrics

- `GET /metrics` - Service metrics
- `GET /health` - Health check with dependency status

---

*Last Updated: June 16, 2026*
