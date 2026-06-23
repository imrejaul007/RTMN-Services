# Nexha OS — Top-Level Architecture

> **Status:** ✅ Production-Ready (ADR-0012, 2026-06-23)
> **Scope:** 14 services + 1 Hub route layer + 1 consumer gateway
> **See also:** [audit-2026-06-23.md](./audit-2026-06-23.md) · [adr-0012-retrospective.md](./adr-0012-retrospective.md) · [e2e-flows.md](./e2e-flows.md)

## What is Nexha OS?

Nexha OS is the **network-of-services layer** of RTMN — the part that lets independent Nexhas (AI businesses, suppliers, banks, logistics providers, marketplaces) find each other, negotiate, and transact. It is the **market structure** beneath the SUTAR OS economy and the Department OS horizontal layer.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              RTMN UNIFIED HUB (4399)                           │
│                                                                                │
│   /api/nexha/<service>/<path>  ─────►  NEXHA_SERVICES map (19 entries)          │
└────────────────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
  ┌───────────┐           ┌─────────────┐          ┌──────────────┐
  │ Phase C   │           │ Phase D     │          │ Phase 12-13  │
  │ Network   │           │ Federation  │          │ Provisioning │
  │ (5 svcs)  │           │ (5 svcs)    │          │ (3 svcs)     │
  └───────────┘           └─────────────┘          └──────────────┘
        │                         │                         │
        └─────────────────────────┼─────���───────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │  nexha-gateway   │  (single consumer entry)
                        │     :5002        │
                        └──────────────────┘
```

## The 14 Services

### Phase C — Network (5 services)

These provide **searchable registries** + **transactional APIs** for the network participants:

| Service | Port | What it does |
|---|--:|---|
| **nexha-supplier-network** | 4280 | Supplier discovery + onboarding + profile pages |
| **nexha-distribution-network** | 4285 | Multi-carrier shipping quotes + bookings + shipment lifecycle |
| **nexha-pricing-network** | 4286 | Market price aggregation + comparison + alerts |
| **nexha-trade-finance-network** | 4287 | KYC + credit offers + loan lifecycle (origination → disbursement → repayment) |
| **nexha-warehouse-network** | 4288 | Warehouse discovery + slot booking + WMS (bins + stock + transfers) |

### Phase D — Federation (5 services)

These provide the **multi-tenant isolation** + **business logic** for cross-Nexha interactions:

| Service | Port | What it does |
|---|--:|---|
| **nexha-business-directory** | 4360 | Searchable registry of Nexhas (companies + AI agents + capabilities) |
| **nexha-acp-messaging** | 4340 | Per-tenant Agent Commerce Protocol — negotiation state machine + message logs |
| **nexha-mission-planner** | 4362 | Cross-tenant mission composition (capability graph → DAG → execution) |
| **nexha-partner-graph** | 4363 | "Companies I've transacted with" social graph + recommendation engine |
| **nexha-commerce-runtime** | 4364 | Order + payment + return execution plane (state machines for each) |

### Phase 12-13 — Provisioning + Aggregation (3 services)

| Service | Port | What it does |
|---|--:|---|
| **nexha-provisioning-engine** | 4385 | Declarative provisioning plans for per-tenant instances (YAML/JSON for K8s/AWS) |
| **nexha-hooks-sdk** | 4386 | Webhook subscriptions with HMAC-SHA256 signing + exponential retry (1m/5m/30m/2h/12h/24h) |
| **nexha-tenant-summary** | 4387 | Fan-out aggregator — 1 call returns a tenant's full footprint across 9 services |

### Consumer Gateway (1 service)

| Service | Port | What it does |
|---|--:|---|
| **nexha-gateway** | 5002 | Single TypeScript HTTP entry that wraps `nexha-warehouse-network` with cleaner APIs (slots/search, slots/book, cost) |

## Cross-cutting concerns

### Authentication

Every Nexha service supports **two auth paths**:
1. **JWT (HS256)** with `JWT_SECRET` — for external callers (do-app, REZ-Workspace, mobile)
2. **Internal token** via `INTERNAL_TOKEN` env var — for service-to-service calls from the Hub

The `tenantId` comes from:
1. JWT claim (`tenantId` / `organizationId` / `tid`)
2. `x-tenant-id` header (for internal callers)
3. Request body `tenantId` (POST/PATCH only)

### The Hub Route

Every Nexha service is exposed at:
```
GET/POST/PUT/PATCH/DELETE  http://localhost:4399/api/nexha/<service>/<path>
```

The Hub maintains a `NEXHA_SERVICES` map in `RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts`. Currently 19 entries (14 Nexha + 5 stubs/foundation).

### Capabilities Map

```
GET http://localhost:4399/api/nexha/capabilities
```

Returns `{ capabilities: { 'supplier-registry': ['nexha-supplier-network'], ... }, services: { 'nexha-supplier-network': 'http://localhost:4280', ... } }`.

Capabilities map a **business need** ("I need to find suppliers") to a **service** (which implements it). Used by the mission planner to auto-route.

### Events

Nexha services emit events to an internal bus (consumed by SUTAR OS, hooks SDK, etc.):
- `quote.requested` (pricing, distribution)
- `shipment.booked` / `shipment.advanced` / `shipment.cancelled` (distribution)
- `loan.disbursed` / `loan.repaid` (trade-finance)
- `order.placed` / `order.paid` / `order.shipped` (commerce-runtime)
- `webhook.delivered` / `webhook.failed` (hooks-sdk)

28+ event types total. See [hooks-sdk.md](./hooks-sdk.md).

## End-to-End Flows

The 3 E2E test files in `companies/Nexha/__tests__/e2e/` prove these flows work:

1. **Procurement** (7 steps) — mission → supplier → pricing → finance → warehouse → shipping
2. **Agent negotiation** (7 steps) — ACP state machine (validate, list, stats, full happy path, invalid transitions)
3. **Discovery** (6 steps) — directory search → tenant-summary aggregation → Hub fan-out

See [e2e-flows.md](./e2e-flows.md) for the catalog.

## How to run it

```bash
# 1. Start all 14 Nexha services + Hub
bash scripts/dev-stack.sh start

# 2. Verify health
curl http://localhost:4399/health
curl http://localhost:4280/health  # supplier
curl http://localhost:5002/health  # gateway

# 3. Run the E2E suite (20 tests)
cd companies/Nexha/__tests__/e2e
npx vitest run

# 4. Run a single service's unit tests
cd companies/Nexha/services/nexha-supplier-network
npx vitest run
```

## Test coverage

| Layer | Count |
|---|---:|
| Per-service unit tests (Nexha) | 728 |
| E2E flows (Nexha) | 20 |
| RABTUL Hub | 42 |
| do-app (vitest unit) | 209 |
| **Total in ADR-0012 scope** | **999** |

## What's NOT in Nexha OS

| Thing | Why not |
|---|---|
| The actual storage layer (Mongo, Postgres) | Most services are in-memory for now — Phase C/D chose speed of iteration over persistence |
| Real carrier APIs (BlueDart, DHL) | Distribution-network simulates carriers via deterministic formulas |
| Real bank APIs | Trade-finance simulates loan disbursement |
| The customer-facing apps | That's do-app (mobile + backend) — a separate repo + consumer of the Hub |
| The SUTAR economy layer | That's `sutar-os/core/` — different ADRs (0005-0008) |

## Related Docs

- [PHASE-LOG.md](./PHASE-LOG.md) — chronological build log for the Nexha OS
- [audit-2026-06-23.md](./audit-2026-06-23.md) — 8-dimension audit before ADR-0012
- [adr-0010-retrospective.md](./adr-0010-retrospective.md) — Phases C+D ship retrospective
- [adr-0011-retrospective.md](./adr-0011-retrospective.md) — Phases 12-13 ship retrospective
- [adr-0012-retrospective.md](./adr-0012-retrospective.md) — Phases 16-20 ship retrospective (this ADR)
- [e2e-flows.md](./e2e-flows.md) — E2E flow catalog
- [nexha-os.md](./nexha-os.md) — this file

---

*Last updated: 2026-06-23*