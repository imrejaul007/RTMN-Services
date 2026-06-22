# HOJAI AI Support Agent

**Tagline:** "AI-powered support that resolves issues instantly, 24 hours a day."

**Port:** 4760

**Version:** 1.0.0

---

## Overview

The HOJAI AI Support Agent is a comprehensive customer support service that provides 24x7 AI-powered support capabilities including ticket management, FAQ responses, escalation routing, warranty verification, and refund processing.

## Architecture

```
AI Support Agent (Port 4760)
├── Ticket Manager - Support ticket lifecycle management
├── FAQ Engine - Intelligent FAQ search and responses
├── Escalation Router - Rule-based escalation routing
├── Warranty Checker - Product warranty verification
├── Refund Processor - Refund validation and processing
└── Customer History - Customer profile and interaction history
```

## Features

### Ticket Management
- Create, update, and resolve support tickets
- SLA tracking with automatic deadline calculation
- Priority-based routing
- Message threading
- Customer tier-based service levels

### FAQ Engine
- Full-text FAQ search with relevance scoring
- 26 pre-loaded FAQs across 9 categories
- User feedback tracking (helpful/not helpful)
- Category-based browsing
- AI-suggested relevant FAQs

### Escalation Routing
- 7 configurable escalation rules
- Level-based team routing (Level 1-3, Management)
- Automatic escalation based on:
  - SLA breach
  - Negative sentiment
  - High-value refunds
  - VIP customers
  - Repeated issues

### Warranty Verification
- Warranty status checking by product ID, serial number, or order ID
- Coverage validation (active, expired, void)
- Claim submission and tracking
- Support for standard, extended, and limited warranties

### Refund Processing
- Eligibility validation
- Amount calculation with breakdown
- Auto-approval for small refunds
- Multi-step approval workflow
- Status tracking

### Customer History
- Complete customer profile
- Interaction timeline
- Ticket history
- Refund history
- Sentiment scoring
- At-risk customer detection

## API Endpoints

### Ticket Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/support/tickets` | Create a new ticket |
| GET | `/api/support/tickets` | List tickets with filters |
| GET | `/api/support/tickets/:id` | Get ticket by ID |
| PATCH | `/api/support/tickets/:id/status` | Update ticket status |
| POST | `/api/support/tickets/:id/resolve` | Resolve a ticket |
| POST | `/api/support/tickets/:id/messages` | Add message to ticket |
| GET | `/api/support/tickets/stats` | Get ticket statistics |

### Escalation Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/support/escalate` | Escalate a ticket |
| GET | `/api/support/escalate/rules` | Get escalation rules |
| GET | `/api/support/escalate/teams` | Get team statistics |

### Warranty Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/support/warranty/check` | Check warranty status |
| POST | `/api/support/warranty/claim` | Submit warranty claim |
| GET | `/api/support/warranty/:id` | Get warranty details |
| GET | `/api/support/warranty/stats` | Get warranty statistics |

### Refund Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/support/refund/preview` | Preview refund |
| POST | `/api/support/refund/process` | Process a refund |
| GET | `/api/support/refund/:id` | Get refund details |
| PATCH | `/api/support/refund/:id/approve` | Approve a refund |
| PATCH | `/api/support/refund/:id/reject` | Reject a refund |
| GET | `/api/support/refund/stats` | Get refund statistics |

### FAQ Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/support/faq` | List FAQs or categories |
| POST | `/api/support/faq/search` | Search FAQs |
| GET | `/api/support/faq/:id` | Get FAQ by ID |
| POST | `/api/support/faq` | Create new FAQ |
| POST | `/api/support/faq/:id/feedback` | Record FAQ feedback |

### Customer Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/support/customer/:id/history` | Get customer history |
| GET | `/api/support/customer/:id/profile` | Get customer profile |
| GET | `/api/support/customer/:id/sentiment` | Get customer sentiment |
| POST | `/api/support/customer/search` | Search customers |
| GET | `/api/support/customers/at-risk` | Get at-risk customers |

### AI Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/support/ai/suggest` | Get AI suggestions |

## Quick Start

### Installation

```bash
cd employees/ai-support-agent
npm install
```

### Development

```bash
npm run dev
# Service starts on http://localhost:4760
```

### Build

```bash
npm run build
npm start
```

### Test

```bash
npm test
```

## Usage Examples

### Create a Ticket

```bash
curl -X POST http://localhost:4760/api/support/tickets \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant-123" \
  -H "X-User-Id: user-456" \
  -d '{
    "customerId": "cust-001",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "subject": "Issue with my order",
    "description": "I received the wrong item in my order #12345",
    "category": "shipping",
    "priority": "high"
  }'
```

### Check Warranty

```bash
curl -X POST http://localhost:4760/api/support/warranty/check \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-001",
    "serialNumber": "SN123456789"
  }'
```

### Process Refund

```bash
curl -X POST http://localhost:4760/api/support/refund/process \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-001",
    "customerId": "cust-001",
    "customerEmail": "john@example.com",
    "type": "full",
    "reason": "Product not as described"
  }'
```

### Get Customer History

```bash
curl http://localhost:4760/api/support/customer/cust-001/history \
  -H "X-Tenant-Id: tenant-123"
```

### Search FAQs

```bash
curl -X POST http://localhost:4760/api/support/faq/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "how do I reset my password",
    "category": "account"
  }'
```

### Get AI Suggestions

```bash
curl -X POST http://localhost:4760/api/support/ai/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "context": "Customer wants refund for damaged product",
    "customerId": "cust-001"
  }'
```

## Configuration

See `.env.example` for all configuration options:

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4760 | Service port |
| NODE_ENV | development | Environment mode |
| CORS_ORIGINS | * | Allowed CORS origins |

## SLA Configuration

| Priority | First Response | Resolution |
|----------|---------------|------------|
| Urgent | 1 hour | 4 hours |
| High | 4 hours | 24 hours |
| Medium | 8 hours | 48 hours |
| Low | 24 hours | 72 hours |

## Escalation Rules

1. **SLA Breach** - Auto-escalate to Level 2
2. **Negative Sentiment (VIP)** - Escalate to Level 2
3. **High Value Refund** - Escalate to Level 3
4. **Urgent Priority** - Escalate to Level 2
5. **Enterprise Customer** - Escalate to Level 3
6. **Repeated Issue** - Escalate to Level 3
7. **VIP Customer** - Escalate to Level 3

## Warranty Coverage

| Type | Coverage |
|------|----------|
| Standard | Manufacturing defects |
| Extended | Standard + accidental damage |
| Limited | Specific components only |

## Refund Limits

| Tier | Auto-Approve | Requires Approval |
|------|--------------|------------------|
| Standard | Up to Rs. 1,000 | Up to Rs. 10,000 |
| Premium | Up to Rs. 5,000 | Up to Rs. 25,000 |
| Enterprise | Up to Rs. 10,000 | Up to Rs. 100,000 |

## Health Checks

```bash
# Basic health
curl http://localhost:4760/health

# Kubernetes liveness
curl http://localhost:4760/health/live

# Kubernetes readiness
curl http://localhost:4760/health/ready
```

## Service Info

```bash
curl http://localhost:4760/api/info
```

## Architecture Decisions

1. **In-Memory Storage** - For development/demo; production should use MongoDB
2. **Rule-Based Escalation** - Configurable rules engine
3. **Multi-Tenant** - Tenant isolation via headers
4. **Zod Validation** - All inputs validated with Zod schemas

## Future Enhancements

- [ ] MongoDB integration for persistence
- [ ] Redis caching
- [ ] Real AI integration (OpenAI/Anthropic)
- [ ] WebSocket for real-time updates
- [ ] Email/SMS notifications
- [ ] Integration with external CRM
- [ ] Analytics dashboard

## License

MIT
