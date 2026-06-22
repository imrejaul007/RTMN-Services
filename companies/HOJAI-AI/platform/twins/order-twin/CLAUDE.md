# order-twin

**Port:** 4885
**Service name:** `order-twin`
**Status:** ✅ Production-ready | **Phase 4 wired** (June 21, 2026)

---

## Overview

Order Twin is the canonical digital-twin service for **commerce orders**
in the RTMN ecosystem. It tracks the full order lifecycle from cart
through fulfillment, including order state transitions, line items,
shipping, returns, and post-purchase analytics.

The service uses `@rtmn/shared/lib/persistent-store` for file-backed JSON
storage. All write paths emit domain events via the shared
`platform-client` so other services (warehouse, payment, customer
success) can react in real time.

## Storage

| Store | Path | Purpose |
|-------|------|---------|
| `orders` | `data/orders.json` | Order headers |
| `line-items` | `data/line-items.json` | Items per order |
| `shipments` | `data/shipments.json` | Fulfillment records |
| `returns` | `data/returns.json` | Return/RMA records |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check |
| GET | `/api/orders` | List orders (paginated) |
| GET | `/api/orders/:id` | Get one order |
| POST | `/api/orders` | Create order (publishes `order.order.created`) |
| PATCH | `/api/orders/:id` | Update status (publishes `order.order.updated`) |
| DELETE | `/api/orders/:id` | Cancel order (publishes `order.order.cancelled`) |
| GET | `/api/orders/:id/items` | Line items |
| GET | `/api/orders/:id/shipments` | Shipments |
| GET | `/api/orders/:id/returns` | Returns |
| POST | `/api/orders/:id/returns` | File return |

## Platform Integration (Phase 4)

| Endpoint | Bridge binding | MemoryOS | Policy audit | Event published |
|----------|:--------------:|:--------:|:------------:|:----------------:|
| POST `/api/orders` | ✓ | ✓ | ✓ | `order.order.created` |
| PATCH `/api/orders/:id` | — | ✓ | ✓ | `order.order.updated` |
| DELETE `/api/orders/:id` | — | ✓ | ✓ | `order.order.cancelled` |

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
./start-twins.sh    # starts order-twin along with the other 14 twins

# Standalone
cd platform/twins/order-twin
PORT=4885 \
  JWT_SECRET="dev_jwt_secret_change_in_production_minimum_64_characters_required_for_security" \
  JWT_ISSUER="rtmn-corpid" \
  SERVICE_NAME="order-twin" \
  npm start
```

## Files

- `src/index.js` — Express app, routes, security middleware
- `src/services/store.js` — PersistentStore initializers

---

*Last Updated: June 21, 2026 (Phase 4 cross-service wiring)*