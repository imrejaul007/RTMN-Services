# ADR-0007 — sutar-warehouse-network as Phase C.5 (Nexha warehouse backbone)

> **Date:** 2026-06-22
> **Status:** Accepted
> **Deciders:** RTMN architecture

## Context

The Nexha "autonomous business network" promised in the CLAUDE.md vision requires suppliers, logistics, *and* warehouses to be real services — not just routes through the Hub. Phases C.1 (supplier-registry) and C.2 (logistics) shipped earlier but there was no warehouse service to land goods in. Without it the procurement flow had no anchor for inventory state.

The Hub capability map (`/api/nexha/capabilities`) already had an entry:

```json
"warehouse-network": ["sutar-warehouse-network"]
```

…and the full-stack demo already called `sutar-warehouse-network` at port 4288 with `?state=MH` and `/api/v1/stats` — but the directory was empty and the service was returning 502.

## Decision

Build **`sutar-warehouse-network`** at `companies/HOJAI-AI/sutar-os/core/sutar-warehouse-network` (port 4288) with two layers:

1. **Slot booking** — warehouse discovery (`GET /api/v1/warehouses`), slot search (`GET /api/v1/warehouses/:id/slots`), and slot reservation (`POST /api/v1/bookings`).
2. **WMS** — bin locations, stock receive/adjust, inter-warehouse transfers with pick/receive/cancel lifecycle, pick lists for orders, and a movement audit log.

Keep it ESM TypeScript + Express + zod + vitest to match the sutar-supplier-registry and sutar-logistics siblings. The implementation lives in SUTAR (not Nexha) because the Hub capability map already routes `warehouse-network → sutar-warehouse-network`.

## Consequences

**Positive:**
- Full-stack demo step 3e/3f (warehouse discovery + stats) returns 200 instead of 502.
- The procurement flow now has a real anchor for inventory: a goal can book a slot, a transfer can move stock between warehouses, and a pick list can fulfil an order.
- 49 unit tests (20 slot-booking + 29 WMS) provide regression safety.
- 6 demo warehouses seeded with realistic Indian locations (Mumbai, Bangalore, Delhi NCR, etc.) so the dev experience is non-trivial.

**Negative:**
- Single-tenant in-memory store. No multi-tenancy, no auth scoping per warehouse yet.
- No persistence layer — restarts wipe state. Acceptable for dev; production would need Postgres.
- `state=MH` filter is implemented but the demo doesn't exercise the slot-booking or WMS POST endpoints yet; that's Phase F.

## Alternatives considered

- **Build in Nexha repo (`companies/Nexha/services/nexha-gateway`)** — rejected because the Hub registry already binds `warehouse-network → sutar-warehouse-network` at port 4288, and the demo already calls that URL. Moving it would have required a coordinated change to both the Hub and the demo.
- **Extend sutar-logistics to also handle inventory** — rejected because the responsibilities are orthogonal: logistics moves boxes, warehouses hold stock. Merging them would conflate two bounded contexts.

## References

- Hub capability map: `GET http://localhost:4399/api/nexha/capabilities`
- Demo: `demos/full-stack-demo.sh` steps 3e, 3f
- Source: `companies/HOJAI-AI/sutar-os/core/sutar-warehouse-network/`
- Tests: `companies/HOJAI-AI/sutar-os/core/sutar-warehouse-network/__tests__/unit/`