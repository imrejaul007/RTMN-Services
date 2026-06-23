# nexha-commerce-runtime

The execution plane of the Nexha Commerce Network. Owns the **transactional core**: orders + payments + returns, each with an explicit state machine and auto-promotions across entities (e.g., capturing a payment auto-promotes the order to PAID).

## Quick start

```bash
npm install
npm start          # listens on :4364
npm test           # runs the 86-test suite
```

## Endpoints (all tenant-scoped)

| Concern | Endpoints |
|---|---|
| Orders | `POST/GET /api/orders`, `GET/PATCH /api/orders/:id`, `POST /api/orders/:id/{place,cancel,fulfill,ship,deliver,complete,refund}` |
| Payments | `POST/GET /api/payments`, `GET /api/payments/:id`, `POST /api/payments/:id/{authorize,capture,complete,fail,cancel,refund}` |
| Returns | `POST/GET /api/returns`, `GET /api/returns/:id`, `POST /api/returns/:id/{approve,reject,in-transit,received,complete,refund}` |
| Stats | `GET /api/stats` (per-tenant aggregation by status) |

## Example

```bash
# 1. Create a DRAFT order
ORDER=$(curl -X POST http://localhost:4364/api/orders \
  -H 'Authorization: Bearer <jwt>' \
  -H 'Content-Type: application/json' \
  -d '{
    "buyerRef":"buyer-1","sellerRef":"seller-1",
    "items":[{"sku":"X","name":"Widget","quantity":2,"unitPrice":25}],
    "tax":2,"shipping":5
  }')
ORDER_ID=$(echo "$ORDER" | jq -r .orderId)

# 2. Place it (auto-creates a PENDING payment)
curl -X POST http://localhost:4364/api/orders/$ORDER_ID/place \
  -H 'Authorization: Bearer <jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"method":"CARD"}'

# 3. Authorize + capture the payment (capture auto-promotes order to PAID)
PAYMENT_ID=$(...)
curl -X POST http://localhost:4364/api/payments/$PAYMENT_ID/authorize -H 'Authorization: Bearer <jwt>'
curl -X POST http://localhost:4364/api/payments/$PAYMENT_ID/capture  -H 'Authorization: Bearer <jwt>'

# 4. Walk through fulfillment
curl -X POST http://localhost:4364/api/orders/$ORDER_ID/fulfill -H 'Authorization: Bearer <jwt>'
curl -X POST http://localhost:4364/api/orders/$ORDER_ID/ship    -H 'Authorization: Bearer <jwt>' -d '{"trackingNumber":"TRK-1"}'
curl -X POST http://localhost:4364/api/orders/$ORDER_ID/deliver -H 'Authorization: Bearer <jwt>'
curl -X POST http://localhost:4364/api/orders/$ORDER_ID/complete -H 'Authorization: Bearer <jwt>'
```

## State machines

```
Order:    DRAFT → PLACED → PAID → FULFILLING → SHIPPED → DELIVERED → COMPLETED
                       ↓         ↓            ↓
                    CANCELLED  REFUNDED    RETURNED → COMPLETED|REFUNDED

Payment:  PENDING → AUTHORIZED → CAPTURED → COMPLETED → REFUNDED
                      ↘ FAILED/CANCELLED

Return:   REQUESTED → APPROVED → IN_TRANSIT → RECEIVED → COMPLETED → REFUNDED
                      ↘ REJECTED
```

See [CLAUDE.md](./CLAUDE.md) for the full reference (cross-entity auto-promotions, data model, env vars, hub wiring).

## Status

✅ Phase 8 of ADR-0010 — complete (2026-06-22). 86 vitest tests passing.