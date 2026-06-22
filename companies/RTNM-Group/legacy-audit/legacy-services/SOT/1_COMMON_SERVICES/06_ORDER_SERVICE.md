# REZ Order Service

## Basic Info

| Field | Value |
|-------|-------|
| **Git Path** | `rez-order-service` |
| **Port** | 4003 (HTTP), 3006 (Legacy) |
| **Status** | Active |
| **Live URL** | https://rez-order-service.onrender.com |
| **Health Check** | `GET /health` |
| **Architecture** | CQRS (BullMQ workers + HTTP server) |

---

## Purpose

The Order Service manages the order lifecycle from creation to fulfillment. It handles order creation, status tracking, order history, cancellation, and coordinates with Payment Service for payment collection and Wallet Service for wallet deductions. The service follows the Strangler Fig pattern for extraction from the monolith.

---

## Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MongoDB
- **Cache/Queue**: Redis, BullMQ
- **Observability**: Sentry, Prometheus

---

## API Endpoints

### Order CRUD

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/orders` | Create new order | Bearer |
| GET | `/api/orders` | List user's orders | Bearer |
| GET | `/api/orders/:orderId` | Get order details | Bearer |
| PUT | `/api/orders/:orderId` | Update order | Bearer |
| DELETE | `/api/orders/:orderId` | Cancel order | Bearer |

### Order Status

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/orders/:orderId/status` | Get order status | Bearer |
| POST | `/api/orders/:orderId/status` | Update status | Bearer |
| GET | `/api/orders/:orderId/timeline` | Get status timeline | Bearer |

### Order Items

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/orders/:orderId/items` | Add items to order | Bearer |
| PUT | `/api/orders/:orderId/items/:itemId` | Update item | Bearer |
| DELETE | `/api/orders/:orderId/items/:itemId` | Remove item | Bearer |

### Order Tracking

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/orders/:orderId/tracking` | Get tracking info | Bearer |
| GET | `/api/orders/:orderId/eta` | Get estimated delivery | Bearer |

### Internal Operations

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/internal/orders` | Create order (internal) | X-Internal-Token |
| PUT | `/internal/orders/:orderId/status` | Update status (internal) | X-Internal-Token |
| GET | `/internal/orders/:orderId` | Get order (internal) | X-Internal-Token |

### Admin Operations

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/admin/orders` | List all orders | X-Internal-Token |
| PUT | `/admin/orders/:orderId` | Admin update | X-Internal-Token |
| POST | `/admin/orders/:orderId/refund` | Initiate refund | X-Internal-Token |

---

## Database Collections

| Collection | Purpose |
|------------|---------|
| `orders` | Order documents |
| `order_items` | Individual order items |
| `order_status_history` | Status change history |
| `order_timeline` | Order events timeline |
| `order_tracking` | Delivery tracking data |
| `order_cancellations` | Cancellation records |

---

## Order Status Flow

```
PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
    ↓           ↓          ↓         ↓            ↓
 CANCELLED   CANCELLED  CANCELLED CANCELLED    CANCELLED
    ↓           ↓          ↓         ↓            ↓
 REFUNDED   REFUNDED   REFUNDED  REFUNDED      REFUNDED
```

### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Order created, awaiting payment |
| `confirmed` | Payment confirmed |
| `preparing` | Being prepared |
| `ready` | Ready for pickup/delivery |
| `out_for_delivery` | In transit |
| `delivered` | Completed |
| `cancelled` | Cancelled |
| `refunded` | Payment refunded |

---

## Dependencies

| Service | Purpose | URL Config |
|---------|---------|------------|
| MongoDB | Order data storage | `MONGODB_URI` |
| Redis | BullMQ connection | `REDIS_URL` |
| BullMQ | Async order processing | Built-in |
| Payment Service | Payment initiation | Via HTTP |
| Wallet Service | Wallet deduction | Via HTTP |
| Auth Service | JWT verification | Via HTTP |
| Catalog Service | Product data | Via HTTP |
| Notification Service | Order notifications | Via HTTP |

---

## Dependents (Services that call this service)

| Service | Usage |
|---------|-------|
| Consumer App | Order creation, tracking |
| Merchant App | Order management, status updates |
| Payment Service | Payment status webhooks |
| Delivery Service | Tracking updates |
| Notification Service | Order notifications |

---

## Environment Variables

```env
# Core
NODE_ENV=production
PORT=4003
SERVICE_NAME=rez-order-service

# Database
MONGODB_URI=mongodb://localhost:27017/rez-order

# Cache
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=<secret>

# Internal Auth (REQUIRED)
INTERNAL_SERVICE_TOKENS_JSON={"order-service": "<token>"}

# CORS
CORS_ORIGIN=https://rez.money,https://admin.rez.money,https://merchant.rez.money

# AI/ML Services
REZ_AI_URL=https://rez-ai-platform.onrender.com
REZ_EVENTS_URL=https://rez-core-platform.onrender.com
REZ_INTELLIGENCE_URL=https://rez-core-intelligence.onrender.com

# Intent Capture (RTMN Commerce Memory)
INTENT_CAPTURE_URL=https://rez-intent-graph.onrender.com

# Support Integration
SUPPORT_COPILOT_WEBHOOK_URL=https://REZ-support-copilot.onrender.com

# Event Bus
EVENT_BUS_ENABLED=true
EVENT_STREAM_NAME=rez:events

# Observability
SENTRY_DSN=<dsn>
```

---

## Order Data Model

```typescript
interface Order {
  _id: ObjectId;
  orderNumber: string;           // Human-readable order number
  userId: string;
  merchantId: string;
  storeId?: string;

  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;

  deliveryAddress?: Address;
  billingAddress?: Address;

  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;

  notes?: string;
  metadata: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

interface OrderItem {
  _id: ObjectId;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  modifiers?: ItemModifier[];
  notes?: string;
}

interface ItemModifier {
  name: string;
  price: number;
}
```

---

## Business Logic

### Order Creation Flow

1. Client submits order with items
2. Validate items against catalog
3. Calculate totals (subtotal, tax, fees, discounts)
4. Create order document with `pending` status
5. Call Payment Service to initiate payment
6. On payment success, update to `confirmed`
7. Queue order for preparation
8. Send notifications

### Payment Integration

```typescript
// Order creates payment
const payment = await paymentService.initiate({
  orderId: order._id,
  amount: order.total,
  paymentMethod: 'razorpay',
});

// On webhook confirmation
await orderService.updateStatus(orderId, 'confirmed');
```

### Wallet Payment

```typescript
// Deduct from wallet
await walletService.debit({
  userId: order.userId,
  amount: order.total,
  purpose: 'order_payment',
  orderId: order._id,
});
```

### Cancellation Flow

1. User/admin requests cancellation
2. Check if order is cancellable (status-dependent)
3. If payment made, initiate refund
4. Update order status to `cancelled`
5. Notify merchant and customer

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Order creation | 10 requests / 5 minutes per user |
| Order read | 100 requests / minute per user |
| Order update | 20 requests / 5 minutes per user |

---

## Health Check Response

```json
{
  "status": "ok",
  "service": "rez-order-service",
  "uptime": 12345,
  "timestamp": "2026-05-10T12:00:00.000Z"
}
```

---

## Security Features

- [x] JWT authentication
- [x] Internal service token auth
- [x] Rate limiting
- [x] CORS whitelist
- [x] MongoDB injection prevention
- [x] Input validation with Zod
- [x] Authorization checks per resource

---

## CQRS Pattern

The service implements CQRS:

- **Commands**: Order creation, updates, status changes go to MongoDB
- **Queries**: Read operations use optimized queries
- **Workers**: Async processing via BullMQ

---

## Strangler Fig Pattern

The service was extracted from the monolith using the Strangler Fig pattern:

- Legacy monolith routes proxied to new service
- Gradual migration of functionality
- Feature flags control traffic split
- Rollback possible via configuration

---

## Deployment

| Environment | Platform | Auto-restart |
|-------------|----------|--------------|
| Production | Render | Yes |
| Staging | Render | Yes |
| Development | Local | Manual |

### Scaling

- HTTP server scales horizontally
- BullMQ workers scale independently
- Redis for distributed locking

---

## Related Documentation

- [API Reference](../API_REFERENCE.md)
