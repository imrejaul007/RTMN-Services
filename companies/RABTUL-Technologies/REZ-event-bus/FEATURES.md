# REZ-event-bus - Features

**Version:** 1.0.0  
**Last Updated:** June 15, 2026  
**Port:** 4510  
**Status:** ✅ RUNNING

---

## Core Features

### 1. Event Publishing

| Feature | Description | Status |
|---------|-------------|--------|
| Publish Events | Publish events with full metadata | ✅ |
| Event Validation | Validate against schema | ✅ |
| Correlation ID | Track related events | ✅ |
| Source Tracking | Track event source | ✅ |
| Timestamps | Event timestamps | ✅ |
| Event Types | Multiple event types | ✅ |

### 2. Event Subscriptions

| Feature | Description | Status |
|---------|-------------|--------|
| Subscribe by Type | Subscribe to specific event types | ✅ |
| Pattern Matching | Wildcard patterns (e.g., `order.*`) | ✅ |
| Multiple Subscribers | Multiple subscribers per event | ✅ |
| Callback URL | HTTP callback delivery | ✅ |
| Unsubscribe | Remove subscriptions | ✅ |
| Subscription List | List active subscriptions | ✅ |

### 3. Schema Registry

| Feature | Description | Status |
|---------|-------------|--------|
| Schema Storage | Store event schemas | ✅ |
| Schema Validation | Validate events against schemas | ✅ |
| Schema Listing | List all registered schemas | ✅ |
| Schema Types | 29+ schema types | ✅ |

### 4. Event Types

| Category | Event Types |
|----------|-------------|
| Restaurant | order.created, order.updated, order.cancelled |
| Hotel | booking.created, booking.cancelled, guest.arrived |
| Healthcare | appointment.scheduled, patient.admitted |
| Retail | inventory.low, order.placed |
| Legal | case.opened, document.signed |
| Education | student.enrolled, course.completed |
| Foundation | memory.created, goal.achieved, agent.karma |

### 5. Event Bus Features

| Feature | Description | Status |
|---------|-------------|--------|
| In-Memory Store | Fast event storage | ✅ |
| MongoDB Persistence | Persistent storage | ✅ |
| Event Retrieval | Query events by type, source | ✅ |
| Event Statistics | Event counts and metrics | ✅ |
| Health Checks | 3-tier health (basic, ready, live) | ✅ |

---

## API Endpoints

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Publish event |
| GET | `/events` | List events |
| GET | `/events/:id` | Get event by ID |
| GET | `/events/type/:type` | Get by type |
| GET | `/events/source/:source` | Get by source |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/subscriptions` | Create subscription |
| GET | `/subscriptions` | List subscriptions |
| GET | `/subscriptions/:id` | Get subscription |
| DELETE | `/subscriptions/:id` | Delete subscription |

### Schemas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/schemas` | List schemas |
| GET | `/schemas/:name` | Get schema |
| POST | `/schemas` | Register schema |

### Event Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/event-types` | List event types |
| GET | `/event-types/:type` | Get type details |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health |
| GET | `/health/ready` | Readiness |
| GET | `/health/live` | Liveness |

---

## Event Schema Example

```json
{
  "type": "restaurant.order.created",
  "payload": {
    "orderId": "ORD-123",
    "customerId": "CUST-456",
    "items": [...],
    "total": 99.99
  },
  "metadata": {
    "source": "restaurant-os",
    "correlationId": "corr-789",
    "timestamp": "2026-06-15T18:00:00Z"
  }
}
```

---

## Integration

### Connected Services

| Service | Port | Events Published |
|---------|------|-----------------|
| restaurant-os | 5010 | order.* |
| hotel-os | 5025 | booking.* |
| healthcare-os | 5020 | appointment.* |
| retail-os | 5030 | inventory.*, order.* |
| legal-os | 5035 | case.*, document.* |
| goal-os | 4242 | goal.* |
| memory-os | 4703 | memory.* |

### Event Flow

```
  Publisher                    Event Bus                    Subscriber
     │                           │                            │
     │──POST /events───────────▶│                            │
     │                           │                            │
     │                           │──Validate schema───────────▶│
     │                           │                            │
     │                           │──Match subscription────────▶│
     │                           │                            │
     │◀──200 OK──────────────────│                            │
     │                           │                            │
```

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Schemas | 29 |
| Active Subscriptions | 2 |
| Event Types | Multiple |

---

*Last Updated: June 15, 2026*
*REZ-event-bus - Pub/Sub Event Messaging*