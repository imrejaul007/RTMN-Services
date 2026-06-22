# REZ Payment Service

## Basic Info

| Field | Value |
|-------|-------|
| **Git Path** | `rez-payment-service` |
| **Port** | 4001 (HTTP), 4101 (Health) |
| **Status** | Active |
| **Live URL** | https://rez-payment-service.onrender.com |
| **Health Check** | `GET /health` |
| **Metrics** | `GET /metrics` |
| **API Docs** | `/api-docs` |

---

## Purpose

The Payment Service is the payment processing hub for the ReZ platform. It handles payment initiation, Razorpay integration, payment capture, refunds, reconciliation, and coordinates with the Wallet Service for wallet-based payments. It ensures transaction integrity through idempotency keys and replay prevention.

---

## Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MongoDB
- **Cache/Queue**: Redis, BullMQ
- **Payment Gateway**: Razorpay
- **Observability**: Sentry, Prometheus

---

## API Endpoints

### Payment Initiation

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/pay/initiate` | Initiate a payment | Bearer |
| POST | `/pay/capture` | Capture Razorpay payment | Bearer |
| GET | `/pay/:paymentId` | Get payment status | Bearer |
| GET | `/pay/history` | Get user's payment history | Bearer |

### Webhooks

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/pay/webhook/razorpay` | Razorpay webhook handler | Signature |
| POST | `/api/payment/webhook/razorpay` | Alternative webhook path | Signature |

### Refunds

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/pay/refund` | Process refund | Bearer/Internal |
| GET | `/pay/:paymentId/refunds` | Get refunds for payment | Bearer |

### Internal Operations

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/internal/deduct` | Deduct payment (service-to-service) | X-Internal-Token |
| POST | `/internal/payment/credit` | Credit wallet after payment | X-Internal-Token |
| POST | `/internal/wallet-credit` | Queue wallet credit job | X-Internal-Token |
| GET | `/internal/payment/:id` | Get payment by ID (internal) | X-Internal-Token |

### Admin/DLQ Operations

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/admin/dlq/stats` | Dead letter queue stats | X-Internal-Token |
| GET | `/admin/dlq/entries` | List DLQ entries | X-Internal-Token |
| POST | `/admin/dlq/retry/:id` | Retry failed job | X-Internal-Token |

### Reconciliation

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/internal/reconciliation/trigger` | Trigger reconciliation job | X-Internal-Token |
| GET | `/admin/reconciliation/status` | Get reconciliation status | X-Internal-Token |

---

## Database Collections

| Collection | Purpose |
|------------|---------|
| `payments` | Payment transactions |
| `refunds` | Refund records |
| `razorpay_orders` | Razorpay order mappings |
| `razorpay_payments` | Razorpay payment records |
| `webhook_events` | Webhook event log |
| `reconciliation_jobs` | Reconciliation job records |

---

## Dependencies

| Service | Purpose | URL Config |
|---------|---------|------------|
| MongoDB | Payment data storage | `MONGODB_URI` |
| Redis | Idempotency keys, BullMQ | `REDIS_URL` |
| BullMQ | Async payment processing | Built-in |
| Razorpay | Payment gateway | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Wallet Service | Wallet credits | `WALLET_SERVICE_URL` |
| Sentry | Error tracking | `SENTRY_DSN` |

---

## Dependents (Services that call this service)

| Service | Usage |
|---------|-------|
| Order Service | Payment initiation during checkout |
| Wallet Service | BNPL, wallet payment processing |
| Consumer App | User payment UI |
| Merchant App | Refund processing |
| Admin Dashboard | Payment management |

---

## Environment Variables

```env
# Core
NODE_ENV=production
PORT=4001
HEALTH_PORT=4101
SERVICE_NAME=rez-payment-service

# Database
MONGODB_URI=mongodb://localhost:27017/rez-payment

# Cache
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=<secret>

# Internal Auth (REQUIRED)
INTERNAL_SERVICE_TOKENS_JSON={"payment-service": "<token>"}

# Razorpay (OPTIONAL - warning if not set)
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
RAZORPAY_KEY_SECRET=<secret>
RAZORPAY_WEBHOOK_SECRET=<secret>
RAZORPAY_CURRENCY=INR

# Service Integration
WALLET_SERVICE_URL=http://localhost:3010/api
MONOLITH_URL=http://localhost:3000
INTERNAL_WEBHOOK_SECRET=<secret>

# AI/ML Services
REZ_AI_URL=https://rez-ai-platform.onrender.com
REZ_EVENTS_URL=https://rez-core-platform.onrender.com
REZ_INTELLIGENCE_URL=https://rez-core-intelligence.onrender.com

# CORS
CORS_ORIGIN=https://rez.money,https://admin.rez.money

# Observability
SENTRY_DSN=<dsn>
```

---

## Payment Flow

```
1. Client requests payment
   POST /pay/initiate
   {
     "orderId": "...",
     "amount": 1000,
     "paymentMethod": "razorpay"
   }

2. Service creates payment record + Razorpay order
   Returns: { paymentId, razorpayOrderId }

3. Client completes payment via Razorpay Checkout

4. Razorpay sends webhook to /pay/webhook/razorpay

5. Service verifies signature, updates payment status

6. If success:
   - Queue wallet credit job (BullMQ)
   - Worker credits wallet
   - Send notification

7. Client polls /pay/:paymentId or receives webhook callback
```

---

## Idempotency & Replay Prevention

### Idempotency Keys
- `orchestratorIdempotencyKey`: UUID from client/orchestrator
- `idempotencyKey`: Fallback key
- Auto-generated if not provided

### Replay Prevention
- Razorpay payment IDs stored in Redis with 25-hour TTL
- Prevents duplicate webhook processing
- Fails closed if Redis unavailable

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/pay/initiate` | 30 requests / 15 minutes per user |
| `/pay/capture` | 10 requests / 5 minutes per user |
| General | 300 requests / 15 minutes per IP |

---

## Dead Letter Queue

Failed payment jobs are moved to DLQ for:
- Manual review
- Retry attempts
- Analytics on failure patterns

Admin endpoints available for DLQ management.

---

## Health Check Response

```json
{
  "status": "ok",
  "mongo": true,
  "redis": true
}
```

---

## Security Features

- [x] Webhook signature verification (HMAC-SHA256)
- [x] Idempotency key enforcement
- [x] Replay prevention (25-hour nonce window)
- [x] JWT authentication
- [x] Internal service token auth
- [x] Rate limiting per endpoint
- [x] X-Forwarded-For spoofing detection
- [x] CORS whitelist
- [x] MongoDB injection prevention
- [x] Zod schema validation

---

## Business Logic

### Payment Purposes
- `order_payment`: Regular order purchase
- `wallet_topup`: Adding money to wallet
- `event_booking`: Event ticket purchase
- `financial_service`: BNPL, loans
- `other`: Miscellaneous

### Payment Methods
- `upi`: UPI payments
- `card`: Credit/debit cards
- `wallet`: ReZ wallet
- `netbanking`: Internet banking
- `cod`: Cash on delivery (limited)

### Reconciliation
- Scheduled jobs for payment reconciliation
- Detects discrepancies between ReZ and Razorpay
- Auto-creates discrepancy reports

---

## Deployment

| Environment | Platform | Auto-restart |
|-------------|----------|--------------|
| Production | Render | Yes |
| Staging | Render | Yes |
| Development | Local | Manual |

---

## Related Documentation

- [API Reference](../API_REFERENCE.md)
- [Razorpay Integration](./RAZORPAY_INTEGRATION.md)
