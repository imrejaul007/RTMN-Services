# Inventory Twin

**Version:** 1.0.0
**Port:** 4887
**Status:** ✅ RUNNING | June 22, 2026
**Package:** `@rtmn/inventory-twin`

---

## Overview

The Inventory Twin manages stock levels across multiple warehouses with full lifecycle support: items, warehouses, supplier catalogs, transfers between warehouses, adjustments (damaged/expired/theft/count-correction), and low-stock alerts that auto-trigger when `quantity ≤ reorderPoint`.

The service seeds with sample data (3 warehouses, 2 suppliers, 4 inventory items, 2 transfers, 2 adjustments) on every boot. **Important:** the previous silent-mutation bug (Object.assign without `inventory.set()`) has been fixed across all write paths — every mutation is now persisted.

Twin types: `inventory`, `warehouse`, `transfer`, `adjustment`, `forecast`.

---

## Endpoints

### Inventory CRUD
```
GET    /api/twins/inventory              # List with filters (sku, category, warehouseId, supplierId, status, search)
GET    /api/twins/inventory/:id          # Get with warehouse, supplier, metrics, alert
POST   /api/twins/inventory              # Create item (SKU uniqueness per business)
PUT    /api/twins/inventory/:id          # Update (allowed fields only, sanitized)
DELETE /api/twins/inventory/:id          # Delete + clear alerts
```

### Stock Adjustments & Transfers
```
POST   /api/twins/inventory/:id/adjust   # Add/reduce quantity (reason required)
POST   /api/twins/inventory/:id/transfer # Move stock to another warehouse
POST   /api/twins/transfers/:id/complete # Mark transfer as completed
```

### Warehouses & Suppliers
```
GET    /api/twins/warehouses             # List with stats (itemCount, totalUnits, totalValue, utilization)
GET    /api/twins/warehouses/:id         # Get with inventory + transfer counts
POST   /api/twins/warehouses             # Create (code uniqueness per business)
PUT    /api/twins/warehouses/:id         # Update
GET    /api/twins/suppliers              # List (filter: category, status, search)
GET    /api/twins/suppliers/:id          # Get with inventory from this supplier
POST   /api/twins/suppliers              # Create (code uniqueness per business)
```

### Listings & Alerts
```
GET    /api/twins/transfers              # List (filter: status, fromWarehouseId, toWarehouseId)
GET    /api/twins/adjustments            # List (filter: inventoryId, adjustmentType, reason)
GET    /api/twins/alerts                 # Low-stock alerts (severity: critical > warning)
GET    /api/twins/expiring               # Items expiring within N days (default 30)
```

### Analytics & Health
```
GET    /api/analytics/inventory          # Totals, byCategory, byWarehouse, stockLevels, topValue, expiring
GET    /health                            # Stats per store
GET    /ready
```

---

## Data Stores

| Store Name | Purpose |
|---|---|
| `inventory-items` | SKU items with quantity, min/max stock, reorderPoint, warehouseId, supplierId, expiryDate |
| `warehouses` | Storage locations (types: distribution, storage, fulfillment, cross_dock, bonded) |
| `transfers` | Stock movements between warehouses with status (pending, in_transit, completed, cancelled) |
| `adjustments` | Quantity corrections (reasons: damaged, expired, theft, count_correction, system_error, returned, seasonal, other) |
| `suppliers` | Supplier catalog with rating, leadTimeDays, paymentTerms |
| `low-stock-alerts` | Auto-managed: created when `quantity ≤ reorderPoint`, cleared when restocked |

---

## Architecture

```
inventory-twin/
├── src/
│   └── index.js              # ESM, single file (~2k LOC)
├── package.json
└── CLAUDE.md
```

---

## Dependencies

- **@rtmn/twinos-shared** — auth, validation, rate limit, Errors helpers, PAGINATION
- **@rtmn/shared** — env + PersistentStore
- **express**, **helmet**, **cors**, **compression**, **morgan**, **uuid**

---

## Recent Changes

- 2026-06-21: Fixed silent-mutation bug across all `Object.assign(item, updates)` paths — now calls `inventory.set()` to persist
- 2026-06-20: Per-business scoping via `req.user.businessId` matches owner on every mutation
- 2026-06-19: Idempotency cache via `Idempotency-Key` header (1h TTL) on create/adjust/transfer
- 2026-06-18: Low-stock alert auto-management via `checkAndUpdateLowStockAlert()` after every quantity change
- 2026-06-17: Warehouse type validation (`distribution`, `storage`, `fulfillment`, `cross_dock`, `bonded`)

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/twins/inventory-twin
npm install
npm start

# Create an inventory item
curl -X POST http://localhost:4887/api/twins/inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "sku": "WIDGET-001", "name": "Premium Widget", "quantity": 100, "minimumStock": 10, "reorderPoint": 25, "unitCost": 5.00, "unitPrice": 12.99, "warehouseId": "wh-1", "supplierId": "sup-1" }'

# Adjust quantity (-5 damaged)
curl -X POST http://localhost:4887/api/twins/inventory/inv-abc12345/adjust \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "adjustmentType": "reduction", "quantity": 5, "reason": "damaged", "notes": "Water damage" }'

# Get low-stock alerts
curl http://localhost:4887/api/twins/alerts -H "Authorization: Bearer $TOKEN"

curl http://localhost:4887/health
```
---

## Platform Integration (Phase 4 — June 21, 2026)

Inventory Twin is wired to the shared platform-client. Every write path
emits a domain event via fire-and-forget `publishAsync`:

| Endpoint | Event published |
|----------|-----------------|
| POST `/api/twins/inventory` | `inventory.item.created` |
| PUT `/api/twins/inventory/:id` | `inventory.item.updated` |
| DELETE `/api/twins/inventory/:id` | `inventory.item.deleted` |
| POST `/api/twins/inventory/:id/adjust` | `inventory.stock.adjusted` |
| POST `/api/twins/inventory/:id/transfer` | `inventory.transfer.initiated` |
| POST `/api/twins/transfers/:id/complete` | `inventory.transfer.completed` |
| POST `/api/twins/warehouses` | `inventory.warehouse.created` |
| PUT `/api/twins/warehouses/:id` | `inventory.warehouse.updated` |
| POST `/api/twins/suppliers` | `inventory.supplier.created` |

The `create` endpoint also binds the new inventory twin to an episodic
memory partition via `platform.bridge.autoBind` and records the creation
event in MemoryOS as a long-term memory. All non-blocking — twin write
paths are not slowed down by platform-service calls.

See [`docs/PHASE-4-COMPLETE.md`](../../../../docs/PHASE-4-COMPLETE.md) for
the shared architecture.
