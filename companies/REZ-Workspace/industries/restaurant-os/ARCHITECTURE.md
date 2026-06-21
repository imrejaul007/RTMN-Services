# Restaurant OS Architecture

> **Date:** 2026-06-21
> **Status:** Living document. Updated as services come online.
> **Owner:** NeXha Industries team.

---

## What this is

Restaurant OS is the **first industry vertical** in the NeXha Autonomous Business Network. It's the proof that the vision (NEXHA-VS-CODE-AUDIT-V3) actually works end-to-end. Specifically, it implements the canonical example: "Restaurant AI needs 500kg rice."

It is **not** an ERP, POS, or back-office suite. It is the **autonomous supply chain** for a restaurant — the AI agent that says "I need rice, find a supplier, negotiate, order, track delivery, learn."

---

## The canonical flow

"Restaurant AI needs 500kg rice" is implemented as **four service calls in sequence**, plus two event-bus messages:

```
RESTAURANT (browser/phone)
   │
   │ 1. POST /api/inventory/:id/purchase-orders
   │    { items: [{ itemId: 'rice-001', quantity: 50 }] }
   ▼
inventory-twin-service (port 4016)
   │
   │ 2. Register SUTAR agent
   │    POST sutar-agent-id:4145/api/agents
   ▼
sutar-agent-id (port 4145)
   │
   │ 3. Dispatch RFQ
   │    POST procurement-os:4320/api/rfqs
   │    source: sutart-agent:<id>
   ▼
procurement-os (port 4320)
   │
   │ 4. Match suppliers, send RFQ invitations, collect quotes
   ▼
SUPPLIER AGENTS
   │
   │ Award best quote
   ▼
DEAL → PO → DELIVERY → INVENTORY UPDATED
   │
   │ 5. PUT /api/inventory/:id/stock
   ▼
inventory-twin-service
   │
   │ 6. Write memory
   │    POST memory-os:4703/api/memories
   ▼
memory-os (port 4703)

EVENTS FIRED:
  restaurant.inventory.reorder_alert
  restaurant.inventory.purchaseorder.dispatched_to_procurement
  procurement.rfq.created
  procurement.rfq.awarded
  restaurant.delivery.received
  restaurant.inventory.stock_adjusted
```

This is the **minimum viable autonomous flow**. It is now real code. See the per-service READMEs for the implementation.

---

## Service inventory

| Service | Port | Code | Role |
|---|---|---|---|
| **restaurant-os** (this dir) | 5010 | 30 src + 9 route files | Orchestrator. Public-facing API + dashboard + copilot. Proxies to twin services. |
| inventory-twin-service | 4016 | ~3k LOC TS | Inventory twin. Detects low stock, fires reorder events. |
| restaurant-twin-service | 4xxx | ~2k LOC TS | Restaurant master twin (location, hours, contact). |
| customer-twin-service | 4xxx | ~1k LOC TS | Customer twin (loyalty, preferences, history). |
| order-twin-service | 4xxx | ~1.6k LOC TS | Order twin (live orders, fulfillment, state machine). |
| kitchen-twin-service | 4xxx | ~1.4k LOC TS | Kitchen twin (queue, prep times, station config). |
| table-twin-service | 4xxx | ~1.7k LOC TS | Table twin (reservations, turnover, capacity). |
| staff-twin-service | 4xxx | ~0.8k LOC TS | Staff twin (schedules, on-duty, performance). |
| loyalty-twin-service | 4xxx | ~1k LOC TS | Loyalty twin (tiers, points, rewards). |
| sutar-agent-id | 4145 | 143 LOC JS | SUTAR OS — registers agents with capability manifests. |
| procurement-os | 4320 | 4.8k LOC TS | B2B marketplace — RFQs, quotes, deals, agents. |
| memory-os | 4703 | 1.6k LOC JS | Memory — episodic/semantic/procedural records per twin. |
| corpid-service (L1 commerce-identity) | 8000 | 3k LOC TS | Issues CorpIDs (TwinOS uses these). |
| rabbitmq | 5672 | (infra) | Event bus for inter-service messaging. |
| mongodb | 27017 | (infra) | Persistence for all twin services. |

**Total: 13 services + 2 infrastructure deps.** Each twin service is independent; communication is via HTTP + RabbitMQ.

---

## Data flow

```
                     ┌──────────────────────────┐
                     │     restaurant-os        │  ← public entry
                     │     :5010                │
                     └────────────┬─────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
            ▼                     ▼                     ▼
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │  inventory   │      │  restaurant  │      │   order      │
    │  -twin       │      │  -twin       │      │   -twin      │
    │  :4016       │      │  :4201       │      │   :4202      │
    └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
           │                     │                     │
           │ publishes events    │                     │
           ▼                     ▼                     ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    RabbitMQ Event Bus                        │
    │   restaurant.inventory.* / restaurant.order.* / etc.       │
    └─────────────────────────────────────────────────────────────┘
           │                     │                     │
           │ on reorder          │ on twin change      │
           ▼                     ▼                     ▼
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │  sutar-agent │      │  memory-os   │      │ corpid-      │
    │  -id         │      │              │      │ service      │
    │  :4145       │      │  :4703       │      │ :8000        │
    └──────────────┘      └──────────────┘      └──────────────┘
           │
           │ RFQ dispatch
           ▼
    ┌──────────────────────────────────────┐
    │          procurement-os              │
    │          :4320                       │
    └───────────────────────────��──────────┘
           │
           │ supplier matching, negotiation
           ▼
    ┌──────────────────────────────────────┐
    │     Supplier Agents (per supplier)   │
    └──────────────────────────────────────┘
```

---

## Event taxonomy

Events are published to RabbitMQ topic exchange `restaurant.events`. Any service can bind a queue.

| Event | Producer | Consumers |
|---|---|---|
| `restaurant.inventory.created` | inventory-twin | orchestrator, analytics |
| `restaurant.inventory.item.added` | inventory-twin | orchestrator, dashboard |
| `restaurant.inventory.stock.adjusted` | inventory-twin | procurement (for tracking), dashboard |
| `restaurant.inventory.waste.logged` | inventory-twin | analytics, BI |
| `restaurant.inventory.reorder_alert` | inventory-twin (cron) | orchestrator (triggers reorder), dashboard |
| `restaurant.inventory.purchaseorder.created` | inventory-twin | (legacy, replaced) |
| `restaurant.inventory.purchaseorder.dispatched_to_procurement` | inventory-twin | procurement, analytics, dashboard |
| `restaurant.inventory.purchaseorder.queued_locally` | inventory-twin | reconciler (retry job) |
| `restaurant.order.placed` | order-twin | kitchen-twin (queue), inventory-twin (deduct) |
| `restaurant.order.prepared` | kitchen-twin | customer-twin (notify), order-twin (advance state) |
| `restaurant.delivery.received` | procurement-os | inventory-twin (PUT stock) |
| `restaurant.reservation.created` | table-twin | orchestrator, dashboard |

---

## Authentication

Two distinct auth models in play:

### 1. End-user auth (L1 commerce-identity, port 8000)
- Cookie-based JWT in httpOnly cookie (`nexha_token`)
- Bearer token acceptable for server-to-server
- Roles: `supplier | buyer | admin | system | guest`

### 2. Service-to-service auth (between twin/procurement/sutar/memory)
- Header: `x-internal-token: <shared secret>` (most services)
- OR: CorpID JWT bearer token (MemoryOS specifically)
- Per-service env var (e.g. `PROCUREMENT_OS_INTERNAL_TOKEN`, `MEMORY_OS_SYSTEM_TOKEN`)
- Falls back to global `INTERNAL_SERVICE_TOKEN`

**Why two models?** The L1 cookie model was designed for browser clients and is well-tested. The internal-token model was designed for service-to-service from the start. CorpID is the canonical identity, but MemoryOS happens to use it for auth (because MemoryOS remembers per-twin not per-service).

**Migration plan:** Move everything to CorpID JWT (the canonical identity layer). This is D2 in NEXHA-DECISIONS.md.

---

## Twin architecture

Every "thing" in the NeXha network has a **twin**: a digital representation with state, history, and memory. The restaurant-os vertical has these twins:

| Twin | Owner | Updates from | Reads by |
|---|---|---|---|
| Restaurant | restaurant-twin | Portal (registration), onboarding flows | All twins (queries for location, hours) |
| Inventory | inventory-twin | POS (sales), kitchen (consumption) | Procurement (for reorder) |
| Order | order-twin | POS (order placed), kitchen (state changes) | Customer, kitchen, inventory (deduct) |
| Kitchen | kitchen-twin | POS (orders in queue), kitchen (prep done) | Order (advance state) |
| Table | table-twin | Reservation system, POS | Reservation, customer |
| Staff | staff-twin | Scheduling system, POS | Manager, scheduling |
| Customer | customer-twin | POS (visits), loyalty | Marketing, POS |
| Loyalty | loyalty-twin | POS (spend), customer events | Marketing, customer |
| Agent (per supplier) | sutar-agent-id | Negotiation events | Procurement (find agents) |

Each twin is a separate service with its own port, MongoDB collection, and API.

---

## How a developer should use this

If you're building a new vertical (hotel-os, healthcare-os, etc.):

1. **Copy the directory structure** from `industries/restaurant-os/`
2. **Define your twin services** under `skills/<twin-name>-service/` (copy from `inventory-twin-service`)
3. **Wire to procurement-os** with the same pattern: `procurement-client.ts` in each twin that needs to reorder
4. **Wire to sutar-agent-id** with `sutar-client.ts` for any autonomous action
5. **Wire to memory-os** with `memory-client.ts` for any learning/recording
6. **Use the event taxonomy** — emit events that other services can subscribe to
7. **Set up the orchestrator** as the public entry point (port 50xx)

If you're integrating with restaurant-os from outside:

```bash
# Get a sense of the network
curl http://restaurant-os:5010/health

# Query a restaurant's inventory
curl http://restaurant-os:5010/api/inventory/<inventoryId>

# Trigger a reorder (this is the demo!)
curl -X POST http://restaurant-os:5010/api/inventory/<inventoryId>/purchase-orders \
  -H 'content-type: application/json' \
  -d '{"items": [{"itemId": "rice-001", "quantity": 50}]}'
```

If you're debugging:

```bash
# Subscribe to all restaurant events
rabbitmqadmin -V rtmn bind q.restaurant.events q "" restaurant.events "#"

# Watch the inventory twin directly
tail -f inventory-twin-service.log | jq '.level, .message'

# Inspect MemoryOS for the restaurant's reorder history
curl http://memory-os:4703/api/memories/search?twinId=restaurant.<restaurantId>&tags=reorder
```

---

## What's next

After NEXHA-VS-CODE-AUDIT-V3 Tier 1 items (inventory→procurement, inventory→SUTAR, inventory→memory) are done:

- **Tier 1.4:** Wire restaurant-twin to memory-os so the restaurant itself has a memory (not just inventory events).
- **Tier 1.5:** Add a real supplier-discovery flow: query sutar-agent-id for agents that handle `request_quote` intent, present them to the restaurant UI.
- **Tier 2:** Real integrations (Razorpay, Delhivery, GSTN).
- **Tier 3:** Other verticals (hotel-os, healthcare-os, etc.) following the same pattern.

---

*Last updated: 2026-06-21 (NEXHA-VS-CODE-AUDIT-V3 Tier 1 complete)*