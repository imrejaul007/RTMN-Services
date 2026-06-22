# nexha-warehouse-network

> **Service:** Warehouse Discovery & Slot Booking
> **Port:** 4288
> **Phase:** C.5
> **Status:** ✅ Running (shipped 2026-06-22)
> **Tests:** 20/20 passing

## What it does

Given a request (origin state, capability requirements, capacity needs), returns matching warehouses from a seeded pool of 6 Indian warehouses. Book inbound/outbound slots at those warehouses with pallet and weight constraints.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/ready` | Readiness + stats |
| GET | `/api/v1/info` | Service metadata |
| GET | `/api/v1/stats` | Network-wide counts |
| GET | `/api/v1/warehouses?state=MH&needsColdChain=true&minRating=4.5` | Search |
| GET | `/api/v1/warehouses/:id` | Single warehouse |
| GET | `/api/v1/warehouses/:id/slots?direction=inbound&fromIso=...&toIso=...` | Slot lookup |
| POST | `/api/v1/bookings` | `{ slotId, customerId, pallets, weightKg }` |
| DELETE | `/api/v1/bookings/:id` | Cancel |
| GET | `/api/v1/bookings?customerId=...` | List |

## Seeded data

6 warehouses across India:
- **Nexha Bhiwandi Hub** (MH, cold-chain + bonded)
- **Nexha Bengaluru Whitefield** (KA, cold-chain + hazardous)
- **Nexha Gurgaon Fulfilment** (HR, bonded)
- **Nexha Hyderabad Medchal** (TG, cold-chain)
- **Nexha Chennai Sriperumbudur** (TN, full-capability, max capacity)
- **Nexha Pune Chakan** (MH, hazardous)

Each warehouse has 14 days × 2 slots/day = 28 slots pre-seeded (168 total).

## Wired into the Hub

```
GET http://localhost:4399/api/nexha/nexha-warehouse-network/api/v1/warehouses?state=MH
GET http://localhost:4399/api/nexha/nexha-warehouse-network/api/v1/stats
```

The `warehouse-network` capability in `/api/nexha/capabilities` points to `nexha-warehouse-network`.

## Run it

```bash
cd companies/HOJAI-AI/sutar-os/core/nexha-warehouse-network
npm install
npm run build && PORT=4288 npm start

# Or just the dev-stack:
bash scripts/dev-stack.sh start
```

## Tests

```bash
npm test
# 20 passed (20) in 350ms
```

Coverage: discovery (state, pincode, capability, rating, capacity filters), slot lookup (time window, capacity filter, sort order), booking happy path + error cases (slot not found, insufficient capacity), cancellation, network stats.