# ADR-0008 — procurement-os / distribution-os / trade-finance as real Nexha services

> **Date:** 2026-06-22
> **Status:** Accepted
> **Deciders:** RTMN architecture

## Context

The Hub capability map advertises a Nexha layer with 8 services:
`procurement-os`, `distribution-os`, `trade-finance`, `franchise-os`,
`manufacturing-os`, `intelligence-layer`, `ecosystem-connector`,
`sutar-supplier-registry`/`sutar-logistics`/`sutar-warehouse-network`
aliases.

Three of those — `procurement-os`, `distribution-os`, `trade-finance`
— existed only as empty stub directories with a `.env.example` file.
Every call to `/api/nexha/{procurement-os,distribution-os,trade-finance}/...`
returned 502 from the Hub proxy because the upstream process was not
running.

The full-stack demo referenced all three, and the supplier/shipping/
credit flows depended on them. The decision was between:

- (A) Build the three as **real first-class services** with their own
  domain logic, tests, and lifecycle.
- (B) Build **thin Nexha-layer proxies** that translate the demo's
  payload and forward to the real SUTAR services
  (sutar-supplier-registry, sutar-logistics, sutar-trade-finance).
- (C) Update the demo to call the SUTAR services directly, removing
  the Nexha layer for these three flows.

The user picked (A).

## Decision

Build the three as **real Nexha Operating Systems**, each in
`companies/Nexha/services/<name>/` with:

- TypeScript + Express + zod + vitest (matches sutar-* siblings)
- Pure data layer (`src/services/<name>.service.ts`) decoupled from HTTP
  for easy unit testing
- Idempotent demo seed data (5 suppliers, 8 cities × 4 carriers × 4
  levels = 896 lanes, 5 trade entities) so the dev experience is
  non-trivial
- A Dockerfile so `docker compose -f docker-compose.dev.yml up` works
- zod-validated request bodies, asyncRoute helper for error handling

### Service responsibilities

| Service | Port | Responsibility |
|---|---:|---|
| **procurement-os** | 4320 | Supplier discovery with multi-dimensional ranking, RFQ lifecycle (create → shortlist → award), contract state |
| **distribution-os** | 4300 | Multi-lane shipping quote engine with carrier reliability, special handling, full booking/tracking lifecycle |
| **trade-finance** | 4340 | Credit offer engine with risk-adjusted APR, headroom calculation, sectoral adjustments, loan lifecycle with repayment-driven trust updates |

### Distinction from SUTAR siblings

The SUTAR services (`sutar-supplier-registry`, `sutar-logistics`,
`sutar-trade-finance`) answer the **capability / quoting** question:
"given a need, who can fulfil it and at what rate?".

The Nexha OS services answer the **workflow** question: "given an
RFQ, walk it through shortlist → award; given a route, book a shipment
and advance it to delivered; given a credit request, decide approval
and disburse the loan."

They are complementary, not duplicates. The Hub routes both layers so
callers can pick the granularity they need.

## Consequences

**Positive:**
- 502s in `demos/full-stack-demo.sh` steps 3b/3c/3d all return 200.
- 48 new unit tests (16 + 15 + 17) provide regression safety.
- Real domain logic: trust scoring, headroom, lane economics, sector
  adjustments — none of which existed before.
- Adds 3 new first-class services to the service registry; Hub env vars
  + docker-compose wired.

**Negative:**
- In-memory store, no persistence. Restarts wipe state. Acceptable
  for dev; production would need Postgres + Redis.
- No auth scoping (single-tenant).
- Procurement-os overlaps with sutar-supplier-registry conceptually;
  distribution-os overlaps with sutar-logistics; trade-finance
  overlaps with sutar-trade-finance. Long-term, the SUTAR services
  should be the "thin" discovery layer and the Nexha services the
  workflow layer — but for now both are first-class.

**Follow-ups:**
- Add persistence (Postgres or SQLite) before production use.
- Wire do-app's `nexha` client to prefer the Nexha OS for workflow
  calls (currently it goes through SUTAR siblings).
- Add a `POST /api/contracts` on procurement-os once the contract
  award flow matures.

## References

- Hub capability map: `GET http://localhost:4399/api/nexha/capabilities`
- Demo: `demos/full-stack-demo.sh` steps 3b, 3c, 3d
- Sources:
  - `companies/Nexha/services/procurement-os/`
  - `companies/Nexha/services/distribution-os/`
  - `companies/Nexha/services/trade-finance/`
- Tests:
  - `companies/Nexha/services/procurement-os/__tests__/unit/`
  - `companies/Nexha/services/distribution-os/__tests__/unit/`
  - `companies/Nexha/services/trade-finance/__tests__/unit/`
- ADR-0007 (Phase C.5 warehouse network) established the SUTAR-first
  pattern that this ADR extends for the Nexha OS layer.