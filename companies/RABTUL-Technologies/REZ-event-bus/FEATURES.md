# REZ-event-bus - Features

**Version:** 1.0.0  
**Last Updated:** June 17, 2026

---

## Core Features

### 1. Event Publishing

| Feature | Description | Status |
|---------|-------------|--------|
| **Publish Event** | Publish events to the bus | ✅ |
| **Schema Validation** | Validate event structure | ✅ |
| **Auto-timestamping** | Add timestamp to events | ✅ |
| **UUID Generation** | Auto-generate event IDs | ✅ |
| **Correlation IDs** | Track related events | ✅ |
| **Metadata Support** | Attach additional metadata | ✅ |

### 2. Event Storage

| Feature | Description | Status |
|---------|-------------|--------|
| **In-Memory Store** | Store events in memory | ✅ |
| **Type Indexing** | Index by event type | ✅ |
| **Timestamp Index** | Index by timestamp | ✅ |
| **Event Limit** | Max 10,000 events | ✅ |
| **Auto-cleanup** | Remove old events | ✅ |
| **Retention Period** | 24-hour retention | ✅ |

### 3. Pub/Sub System

| Feature | Description | Status |
|---------|-------------|--------|
| **Pattern Matching** | Wildcard patterns (order.*) | ✅ |
| **Subscription Management** | Create/remove subscriptions | ✅ |
| **Webhook Delivery** | HTTP callback delivery | ✅ |
| **Retry Logic** | Exponential backoff retries | ✅ |
| **Dead Letter Queue** | Failed event handling | ✅ |

### 4. Event Types (29 Schemas)

#### Order Events
| Event | Description | Schema Fields |
|-------|-------------|---------------|
| `order.created` | New order placed | orderId, customerId, items, total |
| `order.updated` | Order modified | orderId, changes |
| `order.cancelled` | Order cancelled | orderId, reason |
| `order.completed` | Order fulfilled | orderId, completionTime |
| `order.paid` | Payment received | orderId, paymentId, amount |

#### Customer Events
| Event | Description | Schema Fields |
|-------|-------------|---------------|
| `customer.created` | New customer | customerId, name, email |
| `customer.updated` | Customer updated | customerId, changes |
| `customer.loyalty` | Loyalty update | customerId, points, tier |

#### Inventory Events
| Event | Description | Schema Fields |
|-------|-------------|---------------|
| `inventory.low` | Stock below threshold | itemId, currentStock, threshold |
| `inventory.updated` | Stock changed | itemId, oldQty, newQty |
| `inventory.reordered` | Auto-reorder | itemId, orderId |

#### Booking Events
| Event | Description | Schema Fields |
|-------|-------------|---------------|
| `booking.created` | New booking | bookingId, date, service |
| `booking.cancelled` | Booking cancelled | bookingId, reason |
| `booking.reminder` | Reminder sent | bookingId, reminderTime |

#### Industry-Specific Events
| Industry | Events |
|----------|--------|
| Restaurant | `restaurant.order.created`, `restaurant.order.completed` |
| Hotel | `hotel.booking.created`, `hotel.checkin`, `hotel.checkout` |
| Healthcare | `healthcare.appointment.*`, `healthcare.prescription.*` |
| Retail | `retail.cart.*`, `retail.checkout.*` |
| Legal | `legal.case.*`, `legal.document.*` |
| Education | `education.enrollment.*`, `education.grade.*` |
| Fitness | `fitness.attendance.*`, `fitness.membership.*` |
| Manufacturing | `manufacturing.production.*`, `manufacturing.quality.*` |
| Real Estate | `realestate.inquiry.*`, `realestate.viewing.*` |
| Beauty | `beauty.appointment.*`, `beauty.service.*` |
| Automotive | `automotive.service.*`, `automotive.recall.*` |
| Energy | `energy.consumption.*`, `energy.billing.*` |
| Media | `media.content.*`, `media.view.*` |

---

## API Features

### Event Publishing

- **POST /api/events**
- Validates event schema
- Generates UUID and timestamp
- Stores in event store
- Triggers matching subscriptions
- Returns event with ID

### Event Retrieval

- **GET /api/events**
- Query parameters: `type`, `source`, `since`, `limit`
- Paginated results
- Sorted by timestamp (newest first)

### Subscription Management

- **POST /api/subscriptions**
- Pattern-based matching
- Webhook callback URL
- Headers for authentication
- Retry configuration

### Statistics

- **GET /api/stats**
- Total events
- Events by type
- Active subscriptions
- Delivery success rate

---

## Integration Points

### Publishers

| Service | Events Published |
|---------|-----------------|
| REZ-ecosystem-connector | `service.*` |
| Restaurant OS | `restaurant.order.*` |
| Hotel OS | `hotel.booking.*` |
| Healthcare OS | `healthcare.appointment.*` |
| All Industry OS | `*.created`, `*.updated`, `*.deleted` |

### Subscribers

| Service | Patterns Subscribed |
|---------|---------------------|
| REZ-ecosystem-connector | `service.*` |
| Monitoring | `*.error`, `*.warning` |
| Analytics | `order.*`, `booking.*` |
| Notification | `*.reminder`, `*.alert` |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Event Throughput | 1000 events/sec |
| Latency (publish) | < 10ms |
| Latency (deliver) | < 100ms |
| Max Subscribers | 500 |
| Max Events Stored | 10,000 |

---

## Error Handling

| Error | Handling |
|-------|----------|
| Invalid schema | 400 Bad Request |
| Webhook timeout | Retry 3x with backoff |
| Webhook failure | Dead letter queue |
| Store full | Remove oldest events |

---

## Security

| Feature | Implementation |
|---------|----------------|
| CORS | Configured origins only |
| Helmet | Security headers |
| Rate Limiting | 100 req/min |
| Webhook Auth | Custom headers support |

---

*Last Updated: June 17, 2026*
