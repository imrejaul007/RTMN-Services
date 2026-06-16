# REZ-event-bus - Pub/Sub Event Messaging

**Version:** 1.0.0  
**Port:** 4510  
**Location:** `companies/RABTUL-Technologies/REZ-event-bus/`  
**Status:** ✅ **RUNNING** | **June 17, 2026**

---

## Overview

REZ-event-bus is the central pub/sub event messaging system for the RTMN ecosystem. It provides reliable event delivery, schema validation, pattern-based subscriptions, and event persistence.

## Quick Start

```bash
# Start the service
npm install
npm start

# Health check
curl http://localhost:4510/health

# Publish an event
curl -X POST http://localhost:4510/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "order.created",
    "source": "restaurant-os",
    "data": {
      "orderId": "ORD-123",
      "customerId": "CUST-456",
      "total": 299.99
    }
  }'

# Subscribe to events
curl -X POST http://localhost:4510/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "order.*",
    "callback": "http://localhost:5000/webhook"
  }'

# Get event types
curl http://localhost:4510/api/events/types

# Get subscriptions
curl http://localhost:4510/api/subscriptions
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |
| POST | `/api/events` | Publish event |
| GET | `/api/events` | List events |
| GET | `/api/events/:type` | Get events by type |
| POST | `/api/subscriptions` | Create subscription |
| GET | `/api/subscriptions` | List subscriptions |
| DELETE | `/api/subscriptions/:id` | Remove subscription |
| GET | `/api/events/types` | List event types |
| GET | `/api/stats` | Get statistics |

## Event Schema

```json
{
  "type": "string (required) - Event type, e.g., 'order.created'",
  "source": "string (required) - Source service name",
  "data": "object (required) - Event payload",
  "id": "string (auto-generated) - Unique event ID",
  "timestamp": "string (auto-generated) - ISO timestamp",
  "correlationId": "string (optional) - For tracing",
  "metadata": "object (optional) - Additional metadata"
}
```

## Event Types (29 Schemas)

### Order Events
- `order.created` - New order placed
- `order.updated` - Order modified
- `order.cancelled` - Order cancelled
- `order.completed` - Order fulfilled
- `order.paid` - Payment received

### Customer Events
- `customer.created` - New customer
- `customer.updated` - Customer updated
- `customer.loyalty` - Loyalty update

### Inventory Events
- `inventory.low` - Stock below threshold
- `inventory.updated` - Stock changed
- `inventory.reordered` - Auto-reorder triggered

### Booking Events
- `booking.created` - New booking
- `booking.cancelled` - Booking cancelled
- `booking.reminder` - Reminder sent

### Industry-Specific Events
- `restaurant.order.*` - Restaurant orders
- `hotel.booking.*` - Hotel bookings
- `healthcare.appointment.*` - Appointments
- `retail.cart.*` - Cart operations
- `legal.case.*` - Case updates
- `education.enrollment.*` - Enrollments
- `fitness.attendance.*` - Class attendance
- `manufacturing.production.*` - Production events
- `realestate.inquiry.*` - Property inquiries
- `beauty.appointment.*` - Salon appointments
- `automotive.service.*` - Vehicle service
- `energy.consumption.*` - Meter readings
- `media.content.*` - Content events

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4510 | Service port |
| `MAX_EVENTS` | 10000 | Max events to store |
| `RETENTION_MS` | 86400000 | Event retention (24h) |

## Dependencies

- express: HTTP server
- cors: Cross-origin support
- helmet: Security headers
- axios: HTTP client for webhooks

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      REZ-event-bus                       │
│                        (Port 4510)                       │
├─────────────────────────────────────────────────────────┤
│  Event Store                                             │
│  ├── In-memory event storage                            │
│  ├── Schema validation                                  │
│  └── Event indexing by type                             │
│                                                          │
│  Pub/Sub Engine                                         │
│  ├── Pattern matching (order.*, *.created)              │
│  ├── Webhook delivery                                   │
│  └── Retry with exponential backoff                     │
│                                                          │
│  API Endpoints                                          │
│  ├── /api/events - Publish/list events                 │
│  ├── /api/subscriptions - Manage subscriptions         │
│  └── /api/stats - Statistics                           │
└─────────────────────────────────────────────────────────┘
```

## Subscription Patterns

| Pattern | Matches |
|---------|--------|
| `order.created` | Exact match |
| `order.*` | All order events |
| `*.created` | All creation events |
| `#` | All events |

---

*Last Updated: June 17, 2026*
