# inventory-twin-service

> Restaurant OS — Inventory Twin Service
> Part of the NeXha Autonomous Business Network
> Port: 4016 (configurable via `SERVICE_PORT`)

## What it does

The inventory twin is a digital representation of a restaurant's stock: every ingredient has a `currentStock`, `reorderPoint`, `consumptionRate`, and `daysUntilStockout`. The twin monitors itself and emits events when stock falls below reorder points or expiry is approaching.

When stock hits its reorder point, the twin **automatically creates a Purchase Order** and, since NEXHA-AUDIT-V2 Phase 7, **dispatches it as an RFQ to procurement-os** (port 4320). Procurement-os then negotiates with suppliers, awards a quote, and the resulting PO updates inventory on delivery.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/` | Create an Inventory Twin for a restaurant |
| GET | `/:inventoryId` | Get the twin's current state |
| POST | `/:inventoryId/items` | Add an inventory item (chicken, rice, oil, …) |
| PUT | `/:inventoryId/stock` | Adjust stock level for an item |
| POST | `/:inventoryId/waste` | Log waste for shrinkage tracking |
| **POST** | **`/:inventoryId/purchase-orders`** | **Create a PO and dispatch to procurement-os as an RFQ** |
| GET | `/:inventoryId/analytics` | Get inventory KPIs |
| DELETE | `/:inventoryId` | Delete the twin |
| GET | `/health` | Liveness probe |

## Twin schema (Mongoose)

```typescript
{
  twinId: string,             // e.g. "twin.restaurant.inventory.<uuid>"
  inventoryId: string,
  restaurantId: string,      // matches L1 commerce-identity corpId
  items: [{
    itemId: string, name: string, category: string,
    currentStock: number, unit: string,
    reorderPoint: number, reorderQuantity: number,
    costPerUnit: number, expiryDate?: string,
    suppliers: [{ supplierId, name, leadTimeDays, costPerUnit, minOrderQuantity }],
    consumptionRate: number, daysUntilStockout: number
  }],
  reorderAlerts: [{ itemId, urgency: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL', createdAt }],
  expiringAlerts: [{ itemId, expiresAt, daysUntilExpiry }],
  wasteLog: [{ date, itemId, quantity, reason, estimatedCost }],
  totalValue: number
}
```

## How the "Restaurant AI needs 500kg rice" flow works

This is the canonical flow described in the v3 audit and the architecture document. It involves **three services in series** plus the SUTAR OS agent runtime:

1. Restaurant's `inventory-twin-service` (port 4016) is monitoring `currentStock: 15kg` of basmati rice.
2. As orders come in, `consumptionRate: 8kg/day` updates `daysUntilStockout`.
3. When `currentStock < reorderPoint` (say 40kg), the twin emits a `restaurant.inventory.reorder_alert` event.
4. The orchestrator (or a cron, or the frontend) calls `POST /:inventoryId/purchase-orders` with the items to reorder.
5. **The service registers a SUTAR agent** at `sutar-agent-id` (port 4145) — this is the AI's identity:
   ```
   POST http://sutar-agent-id:4145/api/agents
   Headers: x-internal-token: <shared secret>
   Body: {
     agentId: "agent-restaurant-<restaurantId>-reorder",
     name: "<restaurantId> Reorder Agent",
     capabilities: ["transact", "negotiate", "recommend"],
     intents: ["order_product", "request_quote", "negotiate_price", "escalate"]
   }
   ```
6. **The service calls `procurement-os`** (port 4320) via the procurement-client, tagged with the SUTAR agent id:
   ```
   POST http://procurement-os:4320/api/rfqs
   Headers: x-internal-token: <shared secret>
   Body: {
     buyerId: <corpId>,
     source: "sutart-agent:agent-restaurant-<restaurantId>-reorder",
     items: [...],
     urgency: 'high' | 'critical' | ...
   }
   ```
7. Procurement-os creates the RFQ, finds matching suppliers (capability matching), sends RFQ invitations, collects quotes, negotiates, awards.
8. The supplier ships. The procurement-os PO update fires `restaurant.delivery.received`.
9. The orchestrator (or another service) calls `PUT /:inventoryId/stock` to update the inventory level.
10. Twin emits `restaurant.inventory.stock_updated` for downstream dashboards.
11. **A memory record is written to MemoryOS** (port 4703). Every reorder writes an episodic memory tagged `reorder` with metadata (item count, total cost, urgency, dispatch status, supplier). Future SUTAR agents can search past reorders via MemoryOS `/api/memories/search` to inform their negotiations (e.g. "this supplier always delivers 2 days late, factor that into ETA").

### Why this matters

The vision doc says "Businesses don't manage supply chains. Their AI does." The AI is the SUTAR agent — not the inventory twin. The inventory twin is the **trigger** that detects low stock. The SUTAR agent is the **actor** that creates the RFQ, negotiates with suppliers, and learns from outcomes. Without the agent, this is just a script. With the agent, it becomes an autonomous supply chain.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `SERVICE_PORT` | 4016 | HTTP port |
| `MONGODB_URI` | (required) | Mongo connection string |
| `RABBITMQ_URI` | `amqp://localhost:5672` | Event bus |
| `PROCUREMENT_OS_URL` | `http://localhost:4320` | Where to send RFQs |
| `PROCUREMENT_OS_INTERNAL_TOKEN` | (falls back to `INTERNAL_SERVICE_TOKEN`) | Shared secret for procurement service-to-service auth |
| `SUTAR_AGENT_ID_URL` | `http://localhost:4145` | Where to register the reorder agent |
| `SUTAR_AGENT_ID_INTERNAL_TOKEN` | (falls back to `INTERNAL_SERVICE_TOKEN`) | Shared secret for SUTAR service-to-service auth |
| `MEMORY_OS_URL` | `http://localhost:4703` | Where to write reorder memory records |
| `MEMORY_OS_SYSTEM_TOKEN` | (empty) | CorpID JWT for service-to-service auth to MemoryOS. Leave empty if MemoryOS has `REQUIRE_AUTH=false` (dev only) |
| `INTERNAL_SERVICE_TOKEN` | (empty) | Fallback token if specific service tokens aren't set |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Requests per window per IP |

## Running locally

```bash
# 1. Make sure Mongo is running
mongod --dbpath /tmp/mongo-data

# 2. (Optional) Make sure RabbitMQ is running for events
docker run -d -p 5672:5672 rabbitmq

# 3. Start the service
npm install
npm run dev

# 4. Health check
curl http://localhost:4016/health

# 5. Create a twin
curl -X POST http://localhost:4016/ \
  -H 'content-type: application/json' \
  -d '{"restaurantId": "rest-001", "items": [{"name": "Basmati Rice", "category": "grain", "currentStock": 15, "unit": "kg", "reorderPoint": 40, "reorderQuantity": 50, "costPerUnit": 120}]}'

# 6. Trigger a PO (with procurement-os running on 4320)
curl -X POST http://localhost:4016/<inventoryId>/purchase-orders \
  -H 'content-type: application/json' \
  -d '{"items": [{"itemId": "<itemId>", "quantity": 50}]}'
# Returns: { purchaseOrderId, rfqId, procurementStatus: 'dispatched'|'queued_locally', ... }
```

## Events emitted

| Event | When |
|---|---|
| `restaurant.inventory.created` | Twin created |
| `restaurant.inventory.item.added` | Item added |
| `restaurant.inventory.stock.adjusted` | Stock changed |
| `restaurant.inventory.waste.logged` | Waste recorded |
| `restaurant.inventory.purchaseorder.created` | PO created (legacy — kept for back-compat) |
| `restaurant.inventory.purchaseorder.dispatched_to_procurement` | **New (Phase 7)** — RFQ successfully sent to procurement-os |
| `restaurant.inventory.purchaseorder.queued_locally` | **New (Phase 7)** — procurement-os was unreachable, PO is queued for retry |

## What's next

- **TwinOS integration** (Phase 0 of v2 roadmap): when procurement-os creates a Company Twin, the inventory twin should link to it
- **MemoryOS writes**: every reorder event should write a memory record so the restaurant's memory captures "we reorder rice every 14 days on average"
- **Real supplier data**: current `suppliers[]` is a hardcoded array on each item; the procurement-os `procurement.service.ts` already has supplier matching
- **SUTAR OS agent**: the inventory agent (vision doc) should run inside the SUTAR OS runtime, not as a service-to-service HTTP call

See [NEXHA-VS-CODE-AUDIT-V2.md](../../../NEXHA-VS-CODE-AUDIT-V2.md) for the broader context.
