# Nexha OS — E2E Flow Catalog

> **Status:** ✅ All 3 flows pass (20 tests total, ADR-0012 Phase 19, 2026-06-23)
> **Location:** `companies/Nexha/__tests__/e2e/`
> **Run:** `cd companies/Nexha/__tests__/e2e && npx vitest run`

This document catalogs every end-to-end flow we have proven works across the live Nexha OS. Each flow file is **self-contained** — it can be run independently against a running dev-stack.

## Flow Catalog

### 1. Procurement Flow (`procurement-flow.test.ts`)

> **Scenario:** "A buyer tenant wants to source 100kg of rice from a Mumbai supplier, finance it, store it, and ship it to Delhi."

| Step | Service | Endpoint | Verifies |
|--:|---|---|---|
| 1 | nexha-supplier-network | `GET /api/v1/suppliers?region=Mumbai&limit=5` | Supplier search returns results |
| 2 | nexha-pricing-network | `POST /api/v1/compare` | Price comparison across SKUs |
| 3 | nexha-trade-finance-network | `GET /api/v1/credit-offers` | Financing options are visible |
| 4 | nexha-warehouse-network | `GET /api/v1/warehouses?city=Mumbai` | Warehouse discovery works |
| 5 | nexha-distribution-network | `POST /api/v1/quote` | Multi-carrier shipping quote (Mumbai → Delhi) |
| 6 | nexha-partner-graph | `POST /api/interactions` | Record a partner interaction (for history) |
| 7 | Hub | `GET /api/nexha/nexha-supplier-network/api/v1/suppliers?limit=2` | Hub fan-out reaches the right upstream |

**Tests:** 7 — all pass
**Auth:** HS256 JWT (test signs with `JWT_SECRET=nexha-dev-jwt-secret`)

### 2. Agent Negotiation Flow (`agent-negotiation-flow.test.ts`)

> **Scenario:** "Two agents negotiate via the Agent Commerce Protocol — validate messages, list negotiations, check stats, prove invalid messages are rejected."

| Step | Endpoint | Verifies |
|--:|---|---|
| 1 | `POST /api/validate` (type=QUERY) | Valid QUERY message accepted |
| 2 | `POST /api/validate` (type=QUOTE) | Valid QUOTE message accepted |
| 3 | `POST /api/validate` (type=ACCEPT) | Valid ACCEPT message accepted |
| 4 | `POST /api/validate` (missing sender) | Malformed message rejected with HTTP 400 |
| 5 | `POST /api/validate` (type=UNKNOWN) | Invalid ACP type rejected with HTTP 400 |
| 6 | `GET /api/negotiations?limit=5` | List negotiations works |
| 7 | `GET /api/stats` | Stats endpoint returns counters |

**Tests:** 7 — all pass
**Auth:** Internal token via `x-internal-token` header (ACP uses internal-token-only auth for non-tenant-scoped routes)

### 3. Discovery Flow (`discovery-flow.test.ts`)

> **Scenario:** "Discover Nexhas via business-directory, aggregate their data via tenant-summary, prove the Hub can fan-out to either."

| Step | Service | Endpoint | Verifies |
|--:|---|---|---|
| 1 | business-directory | `GET /api/v1/companies?limit=10` | Company search returns items |
| 2 | business-directory | `GET /api/v1/capabilities?q=logistics&limit=5` | Capability search works |
| 3 | tenant-summary | `GET /api/tenants/t_e2e_discovery/summary?timeout=2000` | Fan-out aggregation works (degraded sections OK) |
| 4 | tenant-summary | `GET /api/health/upstreams` | Per-source upstream health |
| 5 | Hub | `GET /api/nexha/nexha-tenant-summary/health` | Hub fan-out reaches tenant-summary |
| 6 | Hub | `GET /api/nexha/nexha-business-directory/health` | Hub fan-out reaches business-directory |

**Tests:** 6 — all pass
**Auth:** HS256 JWT

## How the flows are designed

### 1. Self-contained
Each file has its own:
- JWT signing (test JWT secret matches the dev-stack default)
- BASE URLs (constants point at `localhost`)
- Headers + auth helpers

You can copy any single file into a new repo and it will run, provided the 14 services are up.

### 2. Independent
No shared state between tests. Each `it()` block creates fresh data (or doesn't care about state).

### 3. Explicit error messages
If a step fails, the error includes:
- The URL hit
- The HTTP status code
- The first 200 chars of the response body

This means you can `curl` the same URL by hand to debug.

### 4. Real HTTP, no mocks
Unlike unit tests, **E2E tests do not mock anything**. They hit the real services on real ports. This catches:
- Wrong URL paths
- Wrong request body schemas
- Wrong auth headers
- Cross-service contract drift

## Bugs caught by E2E flows

The 3 flows caught **9 real bugs** during Phase 19:

| Bug | Service | Fix |
|---|---|---|
| `?city=Mumbai` (no results) | supplier-network | Use `?location=Mumbai` (Zod schema field is `location`) |
| `/api/v1/credit-lines` 404 | trade-finance-network | Use `/api/v1/credit-offers` |
| `/api/v1/quotes` 404 | distribution-network | Use `/api/v1/quote` (singular) |
| `/api/v1/partners/:id/transactions` 404 | partner-graph | Use `/api/interactions` (top-level) |
| `fromCity`/`toCity` Zod fail | distribution-network | Use nested `origin`/`destination` objects with AddressSchema |
| `Authorization: Bearer <internal>` 401 | acp-messaging | Use `x-internal-token` header + `x-tenant-id` |
| `/api/validate` body wrong keys | acp-messaging | Use `type`/`sender`/`receiver` (not `from`/`to`) |
| `/health/upstreams` 404 | tenant-summary | Routes mount at `/api`, so full path is `/api/health/upstreams` |
| Hub `NEXHA_SERVICES` missing 3 services | REZ-ecosystem-connector | Rebuild `dist/index.js` after `src/index.ts` change |

## How to add a new flow

1. Create `companies/Nexha/__tests__/e2e/<flow-name>.test.ts`
2. Sign a JWT with `JWT_SECRET=nexha-dev-jwt-secret`
3. Add `BASE` map of service URLs
4. Write `it()` blocks — each one a single step
5. Run `npx vitest run` — the pattern is `__tests__/e2e/**/*.test.ts`
6. Update this catalog with the new flow

## What we DON'T test yet

| Gap | Why | Add to ADR |
|---|---|---|
| Tenant isolation — proves tenant A can't see tenant B's data | Needs auth + DB seed; risk of leaking test data | ADR-0013 Phase 24 |
| Hub cross-service transactions — a Hub `startTransaction` that spans 3 services | ConnectorService supports it but no flow tests it | ADR-0013 Phase 24 |
| Webhook delivery — hooks-sdk actually signs + delivers to a real URL | Needs a test webhook server | ADR-0013 Phase 24 |
| Provisioning plan — provisioning-engine emits a real plan | Needs a mock K8s/AWS consumer | ADR-0013 Phase 24 |
| Mission execution — mission-planner actually executes a mission | Needs downstream services to receive task assignments | ADR-0013 Phase 24 |
| Concurrent load — 100 E2E flows in parallel | Performance testing is out of scope for now | Future |

## Related

- [nexha-os.md](./nexha-os.md) — top-level architecture
- [audit-2026-06-23.md](./audit-2026-06-23.md) — E2E tests were a "gap" in the audit
- [adr-0012-retrospective.md](./adr-0012-retrospective.md) — Phase 19 was the "E2E test flows" phase

---

*Last updated: 2026-06-23*