# Commerce Runtime (ADR-0010 Phase 8)

> **Status:** ✅ Complete (2026-06-22)
> **Service:** `nexha-commerce-runtime` (port 4364)
> **Repo:** `companies/Nexha/services/nexha-commerce-runtime/`
> **Tests:** 86 vitest + 32 client tests = **118 total**

The Commerce Runtime is the **transactional core** of the Nexha Commerce Network. It owns three entity types — orders, payments, returns — each with an explicit state machine. Cross-entity effects happen inside the service so callers don't have to orchestrate them.

## Why this exists

Before Phase 8, every consumer of the federation re-implemented the same patterns:

- "I placed an order, now I need to create a payment, capture it, then update the order."
- "The customer returned an item, so I need to refund the payment and update the order."
- "What state can this order be in? Which transitions are valid?"

These patterns belong in one service. The Commerce Runtime centralizes them so:

1. **Mission Planner** (Phase 6) can spawn orders when a mission subtask requires fulfillment.
2. **Partner Graph** (Phase 7) records transactions as interactions automatically when payments are captured.
3. **Industry OS** can hook a single service to drive order lifecycle (Restaurant OS, Hotel OS, Retail OS).

## State machines

```
Order:
  DRAFT → PLACED → PAID → FULFILLING → SHIPPED → DELIVERED → COMPLETED
                  ↓        ↓            ↓
               CANCELLED REFUNDED    RETURNED → COMPLETED|REFUNDED

Payment:
  PENDING → AUTHORIZED → CAPTURED → COMPLETED → REFUNDED
                      ↘ FAILED/CANCELLED

Return:
  REQUESTED → APPROVED → IN_TRANSIT → RECEIVED → COMPLETED → REFUNDED
                      ↘ REJECTED
```

Terminal statuses (CANCELLED, REFUNDED, COMPLETED, FAILED, REJECTED) accept no further transitions. Calling a terminal-status transition throws `StateTransitionError` (HTTP 422).

## Cross-entity auto-promotions

These are the "magic" behaviors that callers don't have to orchestrate:

| Caller action | Cascade |
|---|---|
| `capturePayment(id)` | payment: PENDING → CAPTURED; order: PLACED → PAID |
| `cancelOrder(id)` (from PLACED) | order: PLACED → CANCELLED; payment: PENDING/AUTHORIZED → CANCELLED |
| `refundOrder(id)` | order: PAID\|FULFILLING\|RETURNED → REFUNDED; payment: CAPTURED → REFUNDED (full) |
| `refundReturn(id)` (full refund) | return: RECEIVED → REFUNDED; payment: CAPTURED → REFUNDED; order: DELIVERED → RETURNED → REFUNDED |
| `refundReturn(id)` (partial refund) | return: RECEIVED → REFUNDED; payment: CAPTURED (refundedAmount += amount); order: DELIVERED → RETURNED → COMPLETED |

The partial-refund case is what makes this useful for real-world "I want to keep the item but get $20 back" flows.

## Refund semantics

Refunds are **cumulative**. `refundPayment({ amount: 50 })` on a $115 captured payment adds $50 to `refundedAmount` and leaves the payment in CAPTURED. A second refund of $65 moves it to REFUNDED. Trying to refund $66 throws ValidationError.

For order refunds, the entire `amount` is refunded (no partial order refunds via this endpoint — partial refunds come through the returns flow).

## API surface

All routes tenant-scoped. Auth via JWT (`Authorization: Bearer`) or internal token (`x-internal-token` + `X-Tenant-Id`).

### Create an order

```http
POST /api/nexha/nexha-commerce-runtime/api/orders
{
  "buyerRef": "buyer-1",
  "sellerRef": "seller-1",
  "items": [
    {"sku": "WIDGET-1", "name": "Widget", "quantity": 2, "unitPrice": 25}
  ],
  "tax": 2,
  "shipping": 5
}
```

Returns the order in DRAFT status with `subtotal=50, total=57`. `placedAt` and `paidAt` are null.

### Place an order

```http
POST /api/nexha/nexha-commerce-runtime/api/orders/{id}/place
{ "method": "CARD" }
```

Returns `{ order, payment }`. The order is now PLACED; a PENDING payment is auto-created with `amount = order.total`.

### Walk a happy path

```bash
# After place + authorize + capture (order is now PAID):
POST /api/orders/{id}/fulfill   { "warehouseRef": "wh-1" }
POST /api/orders/{id}/ship      { "trackingNumber": "TRK-1" }
POST /api/orders/{id}/deliver
POST /api/orders/{id}/complete
```

### Process a return

```bash
# Order must be DELIVERED first.
POST /api/returns { "orderId": "...", "lines": [{"sku":"X","quantity":1,"reason":"DEFECTIVE"}] }
POST /api/returns/{id}/approve  { "refundAmount": 25 }
POST /api/returns/{id}/in-transit { "trackingNumber": "RTRN-1" }
POST /api/returns/{id}/received
POST /api/returns/{id}/refund   { "amount": 25 }
# Order is now RETURNED → COMPLETED (partial) or REFUNDED (full).
```

## Tenant isolation

Three layers of enforcement:

1. **JWT/header** — every request must supply a tenant identifier.
2. **Service** — `getOrder(tenantId, orderId)` queries by `orderId` alone but rejects if `tenantId !== order.tenantId` (returns `NotFoundError` → 404).
3. **Compound unique indexes** — `(tenantId, orderId)` is unique, so the same `orderId` string can exist in two tenants without conflict.

Cross-tenant reads are supported via an explicit `{ crossTenant: true }` option (used by internal Hub calls when needed).

## Stats endpoint

```http
GET /api/nexha/nexha-commerce-runtime/api/stats
```

```json
{
  "tenantId": "tenant-a",
  "orders": {
    "total": 23,
    "byStatus": {
      "DRAFT":      { "count": 2 },
      "PLACED":     { "count": 3 },
      "FULFILLING": { "count": 1, "totalGmv": 150 },
      "DELIVERED":  { "count": 10, "totalGmv": 5400 },
      "COMPLETED":  { "count": 7, "totalGmv": 3200 }
    },
    "lifetimeGmv": 8750
  },
  "payments": { "total": 18, "byStatus": { "CAPTURED": { "count": 18, "amount": 8750 } } },
  "returns":  { "total": 1, "byStatus": { "COMPLETED": { "count": 1 } } }
}
```

`lifetimeGmv` excludes CANCELLED and REFUNDED orders.

## Cross-service use

| Consumer | How it uses Commerce Runtime |
|---|---|
| Mission Planner (Phase 6) | "Place procurement order" subtask → spawn order via Commerce Runtime |
| Partner Graph (Phase 7) | `capturePayment` event → recordInteraction (transaction) |
| Industry OS (Phase 10) | Industry-specific hooks (e.g. Restaurant OS adds table assignment) |
| do-app / REZ-Workspace clients | Direct CRUD via the typed clients |

## Operational notes

- **MongoDB**: shared cluster with other Nexha services, separate DB (`nexha_commerce_runtime`).
- **Indexes**: per-tenant compound unique on the three primary IDs + secondary indexes for filtering.
- **Rate limits**: standard (100 req/min default via helmet + middleware).
- **Idempotency**: order creation accepts an explicit `orderId` for client-side dedup; other POSTs do not currently accept idempotency keys (planned).

## See also

- [Service CLAUDE.md](../../companies/Nexha/services/nexha-commerce-runtime/CLAUDE.md)
- [PHASE-LOG.md Phase 8 section](./PHASE-LOG.md#phase-8--commerce-runtime-2026-06-22-)
- [ADR-0010 Multi-Tenant Federation](./../ADR/0010-MULTI-TENANT-FEDERATION.md)