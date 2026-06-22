# HOJAI AI

**Commercial AI Infrastructure Platform**

---

## What is Hojai AI?

Hojai AI is an **AI-native operational intelligence infrastructure company** that helps businesses:
- Understand customers
- Predict behavior
- Automate operations
- Run AI workflows
- Deploy AI agents
- Make decisions in real time
- Optimize growth automatically

---

## Architecture

```
                    HOJAI AI
         (Core AI Infrastructure Platform)

┌─────────────────────────────────────────────────────┐
│                  CORE PLATFORMS                       │
│  Governance │ Event │ Memory │ Intelligence │ Agents   │
└─────────────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────────┐
│                 PRODUCT LAYER                         │
│  WhatsApp AI │ Flow │ Analytics │ Communications      │
└─────────────────────────────────────────────────────┘

          ▲                        ▲
          │                        │
   REZ Intelligence       External Tenants
   (Privileged)            (Isolated)
```

---

## Platforms Built

| Platform | Port | Description |
|----------|------|-------------|
| **API Gateway** | 4500 | Unified entry point |
| **Governance** | 4501 | Multi-tenant auth, RBAC, isolation |
| **Event** | 4510 | Event ingestion, streaming, DLQ |
| **Memory** | 4520 | Customer memory, timeline, profiles |
| **Intelligence** | 4530 | ML predictions, recommendations |
| **Agents** | 4550 | Autonomous AI agents |
| **Flow** | 4560 | Workflow automation |
| **WhatsApp AI** | 4570 | AI employee for businesses |
| **Analytics** | 4580 | Attribution, A/B testing |
| **Communications** | 4590 | SMS, Email, Push, WhatsApp |

---

## Quick Start

### Docker Compose

```bash
# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# Check health
curl http://localhost:4500/health
```

### Manual

```bash
# Install dependencies
npm install

# Start services individually
cd packages/hojai-governance && npm run dev
cd packages/hojai-event && npm run dev
cd packages/hojai-memory && npm run dev
```

---

## Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/hojai

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
INTERNAL_SERVICE_TOKEN=your-internal-token

# WhatsApp
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_VERIFY_TOKEN=your-verify-token

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Email (SendGrid)
SENDGRID_API_KEY=your-key
```

---

## SDK Usage

```typescript
import { HojaiClient } from '@hojai/sdk';

const hojai = new HojaiClient({
  tenantId: 'your-tenant-id',
  apiKey: 'your-api-key'
});

// Publish event
await hojai.events.publish({
  type: 'commerce.order_placed',
  category: 'commerce',
  name: 'Order Placed',
  userId: 'user_123',
  properties: { orderId: 'order_456', total: 999 }
});

// Get predictions
const predictions = await hojai.predict.all('user_123');

// Send message
await hojai.messages.send({
  channel: 'whatsapp',
  to: '+919876543210',
  body: 'Hello! Your order is ready.'
});
```

---

## API Reference

### Events
- `POST /api/events` - Publish event
- `GET /api/events` - Query events
- `GET /api/events/stats` - Event statistics

### Memory
- `POST /api/memories` - Store memory
- `GET /api/memories` - Get user memories
- `GET /api/timeline` - Get user timeline

### Predictions
- `GET /api/predict/:userId/churn` - Churn prediction
- `GET /api/predict/:userId/ltv` - LTV prediction
- `GET /api/predict/:userId/revisit` - Revisit prediction

### Recommendations
- `GET /api/recommend/:userId` - Get recommendations
- `GET /api/recommend/:userId/trending` - Trending items

### Decisions
- `POST /api/decide/cashback` - Decide cashback
- `POST /api/decide/fraud` - Fraud detection

### Agents
- `POST /api/agents/:id/run` - Run agent
- `GET /api/insights` - Get agent insights

### Workflows
- `POST /api/workflows` - Create workflow
- `POST /api/workflows/:id/run` - Run workflow

### Messages
- `POST /api/messages` - Send message
- `POST /api/templates` - Create template

---

## Tenant Isolation

Every tenant gets isolated:
- Database namespace
- Redis prefix
- Event namespace
- Vector collection prefix

External tenants cannot access:
- REZ ecosystem data
- Cross-tenant data
- Privileged features

---

## Security

- JWT + API key authentication
- RBAC with 30+ permissions
- Audit logging with 2-year retention
- Rate limiting per tenant
- Tenant isolation at every layer

---

## License

Proprietary - RTNM Group
