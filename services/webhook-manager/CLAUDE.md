# Webhook Manager Service

**Port:** 4987  
**Status:** Ready for Development  
**Type:** Express.js Microservice

---

## Overview

The Webhook Manager service provides centralized webhook orchestration and management for the RTMN ecosystem. It handles webhook registration, event dispatching, delivery management, retry logic, and signature verification.

---

## Quick Start

```bash
# Install dependencies
cd services/webhook-manager
npm install

# Start in development mode
npm run dev

# Build and start production
npm run build
npm start
```

---

## Service Endpoints

### Health & Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check with retry stats |
| `/ready` | GET | Readiness check |
| `/api` | GET | API documentation |

### Webhook Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks` | GET | List all webhooks |
| `/api/webhooks` | POST | Create a new webhook |
| `/api/webhooks/:id` | GET | Get webhook by ID |
| `/api/webhooks/:id` | PUT | Update webhook |
| `/api/webhooks/:id` | PATCH | Toggle webhook enabled/disabled |
| `/api/webhooks/:id` | DELETE | Delete webhook |
| `/api/webhooks/:id/test` | POST | Send test webhook |
| `/api/webhooks/:id/regenerate-secret` | POST | Regenerate webhook secret |
| `/api/webhooks/:id/stats` | GET | Get webhook statistics |

### Event Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | List all events (supports `?type=`, `?status=`, `?limit=`, `?offset=`) |
| `/api/events` | POST | Create and dispatch an event |
| `/api/events/:id` | GET | Get event by ID |
| `/api/events/:id/retry` | POST | Retry failed event delivery |
| `/api/events/types` | GET | List registered event types |
| `/api/events/types` | POST | Register new event type |
| `/api/events/subscriptions/list` | GET | List all subscriptions |
| `/api/events/subscriptions` | POST | Create subscription |
| `/api/events/subscriptions/:id` | GET | Get subscription |
| `/api/events/subscriptions/:id` | DELETE | Delete subscription |
| `/api/events/stats/summary` | GET | Get event statistics |

### Delivery Logs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/deliveries` | GET | List deliveries (supports `?webhookId=`, `?eventId=`, `?status=`) |
| `/api/deliveries/:id` | GET | Get delivery by ID |
| `/api/deliveries/:id/retry` | POST | Retry failed delivery |
| `/api/deliveries/stats/overview` | GET | Get delivery statistics |
| `/api/deliveries/webhook/:webhookId` | GET | Get deliveries for webhook |
| `/api/deliveries/event/:eventId` | GET | Get deliveries for event |
| `/api/deliveries/cleanup` | DELETE | Cleanup old delivery logs |

---

## API Examples

### Create a Webhook

```bash
curl -X POST http://localhost:4987/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Notifications",
    "url": "https://example.com/webhooks/orders",
    "events": ["order.created", "order.updated"],
    "metadata": {
      "owner": "orders-team"
    }
  }'
```

### Dispatch an Event

```bash
curl -X POST http://localhost:4987/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "order.created",
    "payload": {
      "orderId": "ORD-12345",
      "customerId": "CUST-001",
      "total": 99.99
    },
    "source": "order-service"
  }'
```

### Test a Webhook

```bash
curl -X POST http://localhost:4987/api/webhooks/wh_xxx/test
```

### Verify Webhook Signature (Node.js)

```javascript
import { signatureService } from './services/signature';

const payload = { orderId: '123', amount: 99.99 };
const signature = req.headers['x-webhook-signature'];
const secret = 'your-webhook-secret';

const { valid } = signatureService.verifySignature(payload, signature, secret);
```

---

## Features

### Webhook Registration
- Register webhooks with unique URLs
- Specify event types to subscribe
- Add custom headers for requests
- Filter events by payload conditions
- Enable/disable webhooks

### Event Dispatching
- Automatic routing to matching webhooks
- Parallel delivery to multiple webhooks
- Payload filtering based on webhook conditions
- Event type registration

### Delivery Management
- Automatic retry with exponential backoff
- Delivery logging with full request/response
- Success/failure tracking
- Delivery time metrics

### Signature Verification
- HMAC-SHA256 signature generation
- Timestamp tolerance validation
- Secure timing-safe comparison
- Signed URL generation/verification

### Retry Logic
- Configurable max retry attempts
- Exponential backoff with jitter
- Automatic retry scheduling
- Manual retry trigger

---

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4987 | Service port |
| `NODE_ENV` | development | Environment |
| `WEBHOOK_SECRET` | - | Default signing secret |
| `MAX_RETRY_ATTEMPTS` | 5 | Max delivery retries |
| `RETRY_DELAY_MS` | 1000 | Initial retry delay |
| `RETRY_BACKOFF_MULTIPLIER` | 2 | Backoff multiplier |
| `DELIVERY_TIMEOUT_MS` | 30000 | HTTP timeout |
| `LOG_LEVEL` | info | Logging level |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Webhook Manager (4987)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Routes    │───►│  Services   │───►│     Models      │  │
│  │             │    │             │    │                 │  │
│  │ webhooks.ts │    │ orchestrator│    │   Webhook.ts    │  │
│  │ events.ts   │    │ delivery.ts │    │   Event.ts      │  │
│  │ deliveries  │    │ retry.ts    │    │                 │  │
│  └─────────────┘    │ signature.ts│    └─────────────────┘  │
│                     └──────┬──────┘                          │
│                            │                                 │
│              ┌─────────────┼─────────────┐                   │
│              │             │             │                   │
│              ▼             ▼             ▼                   │
│         ┌────────┐   ┌──────────┐   ┌──────────┐            │
│         │ Target │   │ Event    │   │ Delivery  │            │
│         │ Webhook│   │ Bus       │   │ Logs      │            │
│         │ (HTTP) │   │ (4510)    │   │ (Memory)  │            │
│         └────────┘   └──────────┘   └──────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Files Structure

```
services/webhook-manager/
├── package.json
├── tsconfig.json
├── .env.example
├── CLAUDE.md
└── src/
    ├── index.ts              # Express server entry
    ├── models/
    │   ├── Webhook.ts        # Webhook model & storage
    │   └── Event.ts          # Event & subscription models
    ├── routes/
    │   ├── webhooks.ts       # Webhook CRUD routes
    │   ├── events.ts         # Event management routes
    │   └── deliveries.ts     # Delivery log routes
    └── services/
        ├── orchestrator.ts   # Event dispatch orchestration
        ├── delivery.ts       # HTTP delivery engine
        ├── retry.ts          # Retry logic & scheduling
        ├── signature.ts      # Signature generation/verification
        └── logger.ts         # Winston logger
```

---

## Integration

### Event Bus Integration

The service integrates with the RTMN Event Bus (port 4510) for pub/sub messaging:

```javascript
// Subscribe to events from the bus
eventBus.subscribe('order.*', async (event) => {
  await orchestrator.handleIncomingEvent(event.type, event.payload, event.source);
});
```

### Service Registry

On startup, the service can register with the Service Registry (port 4399):

```javascript
// Register webhook-manager
POST http://localhost:4399/api/services
{
  "name": "webhook-manager",
  "port": 4987,
  "url": "http://localhost:4987",
  "capabilities": ["webhooks", "events", "delivery"]
}
```

---

## Security

- HMAC-SHA256 signatures for webhook payloads
- Timestamp validation to prevent replay attacks
- Timing-safe signature comparison
- Helmet.js for HTTP security headers
- CORS configuration support

---

## Monitoring

Check retry processor status:

```bash
curl http://localhost:4987/health | jq '.retryProcessor'
```

View delivery statistics:

```bash
curl http://localhost:4987/api/deliveries/stats/overview
```

---

## RTMN Ecosystem Integration

| Component | Connection |
|-----------|------------|
| **Service Registry** | 4399 - Service discovery |
| **Event Bus** | 4510 - Pub/sub messaging |
| **GraphQL Federation** | 4000 - Unified API |
| **REZ-Merchant** | 4800-4899 - Commerce services |
| **Industry OS** | 5000-5240 - Industry services |

---

**Last Updated:** June 16, 2026
