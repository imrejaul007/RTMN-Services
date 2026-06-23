# nexha-commerce-runtime (ADR-0010 Phase 8)

> **The execution plane of the Nexha Commerce Network.** Orders + payments + returns, each with an explicit state machine. Auto-promotes state across the three entities (capturing a payment moves the order to PAID; refunding a return refunds the linked payment and promotes the order to RETURNED → COMPLETED|REFUNDED).

| | |
|---|---|
| **Port** | `4364` |
| **Package** | `@nexha/commerce-runtime` v1.0.0 |
| **Repo** | `companies/Nexha/` (submodule) |
| **Started** | `node src/index.js` (or `npm start`) |
| **Health** | `GET /health` |
| **Internal** | `GET /internal/sanity` (requires `x-internal-token`) |
| **Hub route** | `/api/nexha/nexha-commerce-runtime/*` |

---

## What it does

The Commerce Runtime owns the **transactional core** of the federation. Every order, payment, and return is a durable document with a state machine. Cross-entity effects (payment-captured → order-Paid; return-refunded → payment-refunded → order-Returned) happen inside the service so callers don't have to orchestrate them.

### Order state machine

```
DRAFT ─┬─► PLACED ─┬─► PAID ─┬─► FULFILLING ─┬─► SHIPPED ─┬─► DELIVERED ─┬─► COMPLETED
       │           │         │               │            │             │
       │           │         │               │            └─► RETURNED ─┴─► COMPLETED|REFUNDED
       │           │         │               │
       ▼           ▼         ▼               ▼
   CANCELLED  CANCELLED  REFUNDED         REFUNDED
```

### Payment state machine

```
PENDING ─┬─► AUTHORIZED ─┬─► CAPTURED ─┬─► COMPLETED ─► REFUNDED
         │               │              │
         ├─► FAILED      ├─► CANCELLED  └─► REFUNDED
         └─► CANCELLED
```

### Return state machine

```
REQUESTED ─┬─► APPROVED ─┬─► IN_TRANSIT ─► RECEIVED ─┬─► COMPLETED ─► REFUNDED
           │             │                            │
           ├─► REJECTED  └─► REJECTED                  └─► REFUNDED
```

---

## Endpoints

All routes are tenant-scoped via JWT (`Authorization: Bearer <token>`) OR internal token (`x-internal-token: <token>` + `X-Tenant-Id: <tenant>`).

### Orders (12)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/orders` | Create order (DRAFT) |
| `GET` | `/api/orders` | List orders (filter by status, buyerRef, sellerRef, paymentId) |
| `GET` | `/api/orders/:id` | Get one order |
| `PATCH` | `/api/orders/:id` | Update DRAFT order (notes, items, shippingAddress, tags) |
| `POST` | `/api/orders/:id/place` | DRAFT → PLACED (auto-creates pending payment unless skipped) |
| `POST` | `/api/orders/:id/cancel` | DRAFT\|PLACED → CANCELLED (cancels pending payment too) |
| `POST` | `/api/orders/:id/fulfill` | PAID → FULFILLING (attach warehouse/carrier) |
| `POST` | `/api/orders/:id/ship` | FULFILLING → SHIPPED (requires trackingNumber) |
| `POST` | `/api/orders/:id/deliver` | SHIPPED → DELIVERED |
| `POST` | `/api/orders/:id/complete` | DELIVERED → COMPLETED |
| `POST` | `/api/orders/:id/refund` | PAID\|FULFILLING\|RETURNED → REFUNDED (auto-refunds payment) |
| (internal) | `markOrderReturned` | SHIPPED\|DELIVERED → RETURNED (called by `refundReturn`) |

### Payments (9)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/payments` | Create payment for an order (PENDING) |
| `GET` | `/api/payments` | List payments |
| `GET` | `/api/payments/:id` | Get one payment |
| `POST` | `/api/payments/:id/authorize` | PENDING → AUTHORIZED |
| `POST` | `/api/payments/:id/capture` | AUTHORIZED → CAPTURED (auto-promotes order to PAID) |
| `POST` | `/api/payments/:id/complete` | CAPTURED → COMPLETED |
| `POST` | `/api/payments/:id/fail` | PENDING → FAILED (with reason) |
| `POST` | `/api/payments/:id/cancel` | PENDING\|AUTHORIZED → CANCELLED |
| `POST` | `/api/payments/:id/refund` | CAPTURED\|COMPLETED → REFUNDED (full or partial) |

### Returns (8)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/returns` | Create return request |
| `GET` | `/api/returns` | List returns |
| `GET` | `/api/returns/:id` | Get one return |
| `POST` | `/api/returns/:id/approve` | REQUESTED → APPROVED |
| `POST` | `/api/returns/:id/reject` | REQUESTED\|APPROVED → REJECTED |
| `POST` | `/api/returns/:id/in-transit` | APPROVED → IN_TRANSIT |
| `POST` | `/api/returns/:id/received` | IN_TRANSIT → RECEIVED |
| `POST` | `/api/returns/:id/complete` | RECEIVED → COMPLETED |
| `POST` | `/api/returns/:id/refund` | RECEIVED → REFUNDED (auto-refunds payment + promotes order) |

### Operational

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET` | `/ready` | Readiness |
| `GET` | `/` | Service info + full endpoint catalog |
| `GET` | `/api/validate` | Lightweight 200 OK |
| `GET` | `/internal/sanity` | Hub health probe (x-internal-token) |
| `GET` | `/api/stats` | Tenant-wide aggregation by status |

---

## Data model

### Order
```js
{
  tenantId, orderId,          // compound unique
  buyerRef, sellerRef,
  status,                     // DRAFT|PLACED|PAID|FULFILLING|SHIPPED|DELIVERED|COMPLETED|CANCELLED|REFUNDED|RETURNED
  items: [{sku, name, quantity, unitPrice, currency, metadata}],
  currency, subtotal, tax, shipping, total,
  paymentId,                  // linked Payment
  fulfillment: { warehouseRef, carrierRef, trackingNumber, shippedAt, deliveredAt, metadata },
  shippingAddress, notes, tags, metadata,
  placedAt, paidAt, completedAt, cancelledAt,
}
```

Indexes: `(tenantId, orderId)` unique; `(tenantId, status, createdAt)`; `(tenantId, buyerRef, createdAt)`; `(tenantId, sellerRef, createdAt)`.

### Payment
```js
{
  tenantId, paymentId,        // compound unique
  orderId, buyerRef, sellerRef,
  status,                     // PENDING|AUTHORIZED|CAPTURED|COMPLETED|REFUNDED|FAILED|CANCELLED
  method,                     // CARD|BANK_TRANSFER|WALLET|ESCROW|BNPL|OTHER
  amount, currency, refundedAmount,
  providerRef,                // gateway-side id (Stripe, BNPL provider, etc.)
  authorizedAt, capturedAt, refundedAt, failureReason, metadata,
}
```

Indexes: `(tenantId, paymentId)` unique; `(tenantId, orderId)`; `(tenantId, status, createdAt)`.

### Return
```js
{
  tenantId, returnId,         // compound unique
  orderId, buyerRef, sellerRef,
  status,                     // REQUESTED|APPROVED|IN_TRANSIT|RECEIVED|COMPLETED|REJECTED|REFUNDED
  reason,                     // DEFECTIVE|WRONG_ITEM|NOT_AS_DESCRIBED|BUYER_REMORSE|OTHER
  lines: [{sku, quantity, reason, notes}],
  refundAmount, currency,
  approvedAt, receivedAt, completedAt, rejectedAt, refundedAt,
  rejectionReason, metadata,
}
```

Indexes: `(tenantId, returnId)` unique; `(tenantId, orderId)`; `(tenantId, status, createdAt)`.

---

## Cross-entity auto-promotions

These are the "magic" behaviors that callers don't have to orchestrate:

| Trigger | Cascade |
|---|---|
| `capturePayment` | payment CAPTURED → order PAID |
| `cancelOrder` (PLACED) | order CANCELLED → payment CANCELLED (if PENDING/AUTHORIZED) |
| `refundOrder` | order REFUNDED → payment REFUNDED (full) |
| `refundReturn` (full) | return REFUNDED → payment refunded → order RETURNED → REFUNDED |
| `refundReturn` (partial) | return REFUNDED → payment partially refunded → order RETURNED → COMPLETED |

After `refundReturn`, the linked payment's `refundedAmount` reflects the cumulative total. Future partial refunds cannot exceed the remaining balance.

---

## Auth

Dual-mode (same pattern as mission-planner / partner-graph):

- **JWT** (HS256): `Authorization: Bearer <token>`. Verified against `JWT_SECRET` env. Sets `req.user.tenantId`.
- **Internal token**: `x-internal-token: <COMMERCE_RUNTIME_INTERNAL_TOKEN>` + `X-Tenant-Id: <tenant>`. Bypasses JWT for Hub and trusted internal callers.

Both modes are tested via `__tests__/unit/routes.test.js`.

---

## Configuration

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `4364` | HTTP port |
| `COMMERCE_RUNTIME_PORT` | `4364` | Alt alias |
| `MONGODB_URI` | `mongodb://localhost:27017/nexha_commerce_runtime` | Mongo connection |
| `MONGO_URI` | (alias) | Alt alias |
| `JWT_SECRET` | `dev-secret-change-me` | JWT secret |
| `COMMERCE_RUNTIME_INTERNAL_TOKEN` | `cr-internal-dev-token` | Internal service token |

---

## Tests

86 vitest tests across two files:

```bash
npm test                  # runs all
npm run test:watch        # watch mode
```

- `__tests__/unit/commerceService.test.js` (44 tests) — model + service layer
- `__tests__/unit/routes.test.js` (42 tests) — HTTP layer (auth, validation, errors)

Uses `mongodb-memory-server` so no real Mongo is required.

---

## Hub integration

Wired in `RABTUL-Technologies/REZ-ecosystem-connector@1.7.0`:

```ts
'nexha-commerce-runtime': process.env.NEXHA_COMMERCE_RUNTIME_URL || 'http://localhost:4364',
```

Capabilities added:
- `commerce-runtime` → `nexha-commerce-runtime`
- `order-management` → `nexha-commerce-runtime`
- `payment-processing` → `nexha-commerce-runtime`
- `escrow` → `nexha-commerce-runtime`
- `fulfillment` → `nexha-commerce-runtime`
- `returns` → `nexha-commerce-runtime`

External callers reach the service at `/api/nexha/nexha-commerce-runtime/*`.

---

## Client libraries

- **REZ-Workspace** (`@rez/unified-fabric`): `NexhaConnection` has 30 commerce-runtime methods (orders, payments, returns, stats).
- **do-app** (TypeScript): `nexha.commerceRuntime` exposes the same 30 methods + health.

---

## Future work

- Webhook emitter on state transitions (e.g. `order.paid`, `return.refunded`) — would feed `nexha-event-bus` (Phase 2).
- Multi-currency support (currently single currency per order).
- Tax engine integration (currently `tax` is a flat number).
- Idempotency keys on POSTs to prevent duplicate creation on retry.