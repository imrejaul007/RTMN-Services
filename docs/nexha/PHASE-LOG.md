# ADR-0010 Phase Execution Log

> **Start date:** 2026-06-22
> **Plan:** [ADR-0010 — Multi-Tenant Federation](../adr/0010-MULTI-TENANT-FEDERATION.md)

This log tracks every phase of the 11-phase plan: what shipped, which repos were touched, how many tests were added, and any deviations from the plan.

---

## Phase 0 — Repo Reshape ✅ DONE (2026-06-22)

**Goal:** Move 5 real nexha-* services out of `companies/HOJAI-AI/sutar-os/core/` into `companies/Nexha/services/`. Drop 3 L1 stubs (`procurement-os`, `distribution-os`, `trade-finance`) that duplicated the real services.

**Repos touched:** HOJAI-AI, Nexha

**Shipped:**

- 5 services moved: `nexha-supplier-network`, `nexha-distribution-network`, `nexha-warehouse-network`, `nexha-trade-finance-network`, `nexha-pricing-network`
- 3 L1 stubs deleted
- Old `sutar-*` names kept as Hub deprecation aliases (removed in Phase 1)

**Tests:** Unchanged — moved services kept their existing vitest suites (129 tests across 5 services).

---

## Phase 1 — Hub De-aliasing ✅ DONE (2026-06-22)

**Goal:** Remove the 5 sutar-* deprecation aliases from the Hub's `NEXHA_SERVICES` map. Canonical nexha-* names only.

**Repos touched:** RABTUL-Technologies (Hub)

**Shipped:**

- `NEXHA_SERVICES` map now has only canonical `nexha-*` keys
- Hub integration tests updated (15 tests, 16 services)

**Commits:**

- `fb22b940 feat(hub): ADR-0009 Phase 1 - remove 5 deprecation aliases from NEXHA_SERVICES`

---

## Phase 2 — Event Bus (Redis Streams) ✅ DONE (2026-06-22)

**Goal:** `nexha-event-bus` (port 4380) — pub/sub backbone for federation events.

**Repos touched:** Nexha

**Shipped:**

- `nexha-event-bus` service with Redis Streams
- 8 event types defined: `company.registered`, `agent.published`, `trust.updated`, `mission.completed`, `contract.signed`, `order.placed`, `order.fulfilled`, `partner.invited`
- Consumer-group semantics with at-least-once delivery
- 20 vitest tests

---

## Phase 3 — Business Directory 🔄 IN PROGRESS (2026-06-22)

**Goal:** Searchable registry of nexhas (companies + AI agents + capability graph) with public trust linkage from SADA.

**Repos touched:** Nexha, HOJAI-AI, RABTUL-Technologies (Hub), do-app, REZ-Workspace, RTMN root (this doc)

### Sub-tasks

| # | Sub-task | Owner repo | Status |
|---|---|---|---|
| 3.1 | SADA public trust API (sanitized read-only view) | HOJAI-AI | ✅ done |
| 3.2 | Shared HTTP directory client (`@rtmn/shared/directory-client`) | HOJAI-AI | ✅ done |
| 3.3 | `sutar-agent-twin` publishes to Nexha directory | HOJAI-AI | ✅ done |
| 3.4 | `nexha-business-directory` service (port 4360) | Nexha | ✅ done |
| 3.5 | Hub `NEXHA_SERVICES` map + capability entries | RABTUL | ✅ done |
| 3.6 | RTMN root docs (`docs/adr/0010-MULTI-TENANT-FEDERATION.md`, `docs/nexha/PHASE-LOG.md`) | RTMN | 🔄 in progress |
| 3.7 | RTMN root CLAUDE.md update | RTMN | ⏳ pending |
| 3.8 | do-app backend client + mobile UI "Find a supplier" | do-app | ⏳ pending |
| 3.9 | REZ-Workspace nexha-business-directory client | REZ-Workspace | ⏳ pending |
| 3.10 | Commit + push RTMN root (docs only) | RTMN | ⏳ pending |

### Files added/modified

#### HOJAI-AI

| File | What |
|---|---|
| `platform/trust/sada-os/src/modules/publicTrustService.ts` | NEW — sanitized public trust view |
| `platform/trust/sada-os/src/index.ts` | mount `/public` router |
| `platform/trust/sada-os/__tests__/unit/publicTrustService.test.ts` | NEW — 19 tests, all pass |
| `shared/directory-client/index.js` | NEW — HTTP client for SUTAR → Nexha directory |
| `shared/directory-client/index.d.ts` | NEW — TypeScript types |
| `shared/directory-client/test.mjs` | NEW — 22 node:test tests, all pass |
| `shared/package.json` | add `./directory-client` export |
| `sutar-os/agents/agent-twin/src/index.js` | publish to Nexha after twin create |

#### Nexha

| File | What |
|---|---|
| `services/nexha-business-directory/package.json` | NEW — vitest 2.x, mongodb-memory-server, mongoose, zod |
| `services/nexha-business-directory/vitest.config.js` | NEW — node env, 30s timeout |
| `services/nexha-business-directory/src/models/Company.js` | NEW — Mongoose schema + indexes (text, compound) |
| `services/nexha-business-directory/src/models/Agent.js` | NEW — Mongoose schema + indexes |
| `services/nexha-business-directory/src/services/directoryService.js` | NEW — CRUD + search + trust linkage + `seedDemoCompanies` |
| `services/nexha-business-directory/src/middleware/auth.js` | NEW — requireAuth/optionalAuth/tenantFrom |
| `services/nexha-business-directory/src/routes/index.js` | NEW — Zod-validated routes, asyncRoute |
| `services/nexha-business-directory/src/index.js` | NEW — Express app on port 4360 |
| `services/nexha-business-directory/__tests__/helpers/db.js` | NEW — mongo-memory helpers |
| `services/nexha-business-directory/__tests__/unit/directoryService.test.js` | NEW — 32 tests |
| `services/nexha-business-directory/__tests__/unit/auth.test.js` | NEW — 11 tests |
| `services/nexha-business-directory/__tests__/unit/routes.test.js` | NEW — 25 tests |
| `services/nexha-business-directory/README.md` | NEW — quickstart |
| `services/nexha-business-directory/CLAUDE.md` | NEW — service doc |
| `services/nexha-business-directory/docs/API.md` | NEW — endpoint reference |

**Nexha tests:** 68 / 68 pass (directoryService: 32, routes: 25, auth: 11).

#### RABTUL-Technologies (Hub)

| File | What |
|---|---|
| `REZ-ecosystem-connector/src/index.ts` | add `nexha-business-directory` to `NEXHA_SERVICES` + capability entries |
| `REZ-ecosystem-connector/.env.example` | add `NEXHA_BUSINESS_DIRECTORY_URL` + `INTERNAL_SERVICE_TOKEN` |
| `REZ-ecosystem-connector/CLAUDE.md` | document ADR-0009 top-level routing |
| `REZ-ecosystem-connector/package.json` | bump to 1.2.0 |

**Commits:**

- `feat(hub): ADR-0009 Phase 3 - wire nexha-business-directory (port 4360)` — pushed to origin

### Endpoints exposed at the Hub

```
GET  /api/nexha/capabilities                                  # capability map
ANY  /api/nexha/nexha-business-directory/companies             # CRUD
ANY  /api/nexha/nexha-business-directory/agents                # CRUD
ANY  /api/nexha/nexha-business-directory/capabilities/search   # search
ANY  /api/nexha/nexha-business-directory/trust/:entityId       # trust link
GET  /api/nexha/nexha-business-directory/health
```

### Endpoints exposed at SADA

```
GET  /public/trust/:entityId
POST /public/trust/batch                                     # up to 200 entities
GET  /public/trust/health
```

### Deviations from plan

- **None significant.** All Phase 3 sub-tasks 3.1–3.5 shipped as planned. Sub-tasks 3.6–3.10 still in flight at end of day.

### Test count

- SADA public: **19**
- Shared directory client: **22**
- nexha-business-directory: **68**
- **Phase 3 total new tests: 109** (all pass)

### Open follow-ups

- Decide whether `nexha-pricing-network` should also publish (it has supplier-list-like data)
- Decide whether `nexha-supplier-network` should also publish (instead of relying on agent-twin)
- Add rate limiting on the public trust endpoints (currently only the shared `@rtmn/shared/auth` middleware applies)


---

## Phase 4 — ACP-Messaging ✅ DONE (2026-06-22)

**Goal:** `nexha-acp-messaging` (port 4340) — per-tenant Agent Commerce Protocol with persistent negotiation state, message logs, and full state-machine semantics. Implements the 8 ACP message types (QUERY, QUOTE, COUNTER, ACCEPT, REJECT, ORDER, TRACK, DISPUTE) from `HOJAI-AI/sutar-os/agents/acp-protocol/SPEC.md` with per-tenant isolation.

**Repos touched:** Nexha, HOJAI-AI, RABTUL-Technologies (Hub), do-app, REZ-Workspace, RTMN root (this doc)

### Sub-tasks

| # | Sub-task | Owner repo | Status |
|---|---|---|---|
| 4.1 | `nexha-acp-messaging` service (port 4340) — state machine, MongoDB persistence, JWT + internal-token auth | Nexha | ✅ done |
| 4.2 | Vitest tests for state machine + routes | Nexha | ✅ done (59 tests) |
| 4.3 | Service CLAUDE.md + README.md | Nexha | ✅ done |
| 4.4 | Hub `NEXHA_SERVICES` map + capability entries (acp-messaging, agent-negotiation, dispute-handling) | RABTUL | ✅ done |
| 4.5 | do-app backend client (`nexha.acpMessaging.*`) + tests | do-app | ✅ done (9 new tests) |
| 4.6 | REZ-Workspace client (`NexhaConnection.sendAcpMessage`, etc.) + tests | REZ-Workspace | ✅ done (10 new tests) |
| 4.7 | RTMN root docs (this file + `docs/nexha/acp-messaging.md`) | RTMN | ✅ done |
| 4.8 | Commit + push all 5 repos | All | ✅ done |

### Files added/modified

#### Nexha

| File | What |
|---|---|
| `services/nexha-acp-messaging/package.json` | NEW — `@nexha/acp-messaging` v1.0.0 |
| `services/nexha-acp-messaging/vitest.config.js` | NEW — node env, 30s timeout |
| `services/nexha-acp-messaging/src/index.js` | NEW — Express app on port 4340 |
| `services/nexha-acp-messaging/src/models/Message.js` | NEW — 8 message types + MESSAGE_NEXT_VALID transition table |
| `services/nexha-acp-messaging/src/models/Negotiation.js` | NEW — 6 statuses (ACTIVE/ACCEPTED/REJECTED/COMPLETED/DISPUTED/EXPIRED) |
| `services/nexha-acp-messaging/src/services/stateMachine.js` | NEW — `StateTransitionError`, `ValidationError`, `appendMessage`, `listMessages`, `listNegotiations`, `getNegotiation`, `getStats` |
| `services/nexha-acp-messaging/src/middleware/auth.js` | NEW — JWT (RS256) + x-internal-token; env read at request time so tests can swap |
| `services/nexha-acp-messaging/src/routes/index.js` | NEW — Zod-validated routes (negotiations, messages, stats, validate, health) |
| `services/nexha-acp-messaging/__tests__/helpers/db.js` | NEW — mongodb-memory-server helpers |
| `services/nexha-acp-messaging/__tests__/unit/stateMachine.test.js` | NEW — 37 tests (full state machine + tenant isolation) |
| `services/nexha-acp-messaging/__tests__/unit/routes.test.js` | NEW — 22 tests (HTTP routes, auth gating, error mapping) |
| `services/nexha-acp-messaging/README.md` | NEW — full API doc + state machine reference |
| `services/nexha-acp-messaging/CLAUDE.md` | NEW — service architecture + design rationale |

**Tests:** 59 vitest tests, 0 failures (37 state machine + 22 routes).

**Commit:** `feat(acp-messaging): ADR-0010 Phase 4 - per-tenant ACP service (port 4340)` (pushed to origin + nexha-target).

#### RABTUL-Technologies (Hub)

| File | What |
|---|---|
| `REZ-ecosystem-connector/src/index.ts` | add `nexha-acp-messaging` to `NEXHA_SERVICES` map; add 3 capability entries: `acp-messaging`, `agent-negotiation`, `dispute-handling` |
| `REZ-ecosystem-connector/package.json` | bump 1.1.0 → 1.3.0 |

**Commit:** `feat(hub): ADR-0010 Phase 4 - wire nexha-acp-messaging (port 4340)` (pushed to origin).

#### do-app

| File | What |
|---|---|
| `backend/src/services/hojaiClient.ts` | add `nexha.acpMessaging` namespace: `sendMessage`, `validate`, `listNegotiations`, `getNegotiation`, `listMessages`, `stats`, `health` |
| `backend/__tests__/unit/hojaiClient.nexha.test.ts` | add 9 tests for the new namespace (21 total in file) |

**Commit:** `feat(do-app): ADR-0010 Phase 4 - nexha.acpMessaging client (9 tests)` (pushed to do-app feature branch).

#### REZ-Workspace

| File | What |
|---|---|
| `core/unified-fabric/src/connections/nexha.js` | add 6 `NexhaConnection` methods: `sendAcpMessage`, `validateAcpMessage`, `listAcpNegotiations`, `getAcpNegotiation`, `listAcpMessages`, `getAcpStats` |
| `core/unified-fabric/test-acp-messaging.js` | NEW — 10 node:test tests (HTTP mock-based, no Hub required) |

**Commit:** `feat(rez-workspace): ADR-0010 Phase 4 - nexha-acp-messaging client` (pushed to main).

#### RTMN root (this doc)

| File | What |
|---|---|
| `docs/nexha/PHASE-LOG.md` | add this Phase 4 section |
| `docs/nexha/acp-messaging.md` | NEW — service-level doc (architecture, API, state machine, data model, auth) |
| `CLAUDE.md` | add Phase 4 row + vitest test count update |

### State machine (the contract)

| Current | Next valid |
|---|---|
| _start_ | `QUERY` |
| `QUERY` | `QUOTE`, `REJECT` |
| `QUOTE` | `COUNTER`, `ACCEPT`, `REJECT` |
| `COUNTER` | `COUNTER`, `ACCEPT`, `REJECT`, `QUOTE` |
| `ACCEPT` | `ORDER`, `REJECT` |
| `REJECT` | _(terminal)_ |
| `ORDER` | `TRACK`, `DISPUTE` |
| `TRACK` | `TRACK`, `DISPUTE`, `ORDER` |
| `DISPUTE` | `REJECT`, `ACCEPT`, `TRACK` |

### Endpoints exposed at the Hub

```
POST /api/nexha/nexha-acp-messaging/api/negotiations           # create + send first message
GET  /api/nexha/nexha-acp-messaging/api/negotiations           # list (filters: status, agent, limit)
GET  /api/nexha/nexha-acp-messaging/api/negotiations/:id
GET  /api/nexha/nexha-acp-messaging/api/negotiations/:id/messages
POST /api/nexha/nexha-acp-messaging/api/negotiations/:id/messages
GET  /api/nexha/nexha-acp-messaging/api/stats                  # per-tenant
POST /api/nexha/nexha-acp-messaging/api/validate
GET  /api/nexha/nexha-acp-messaging/health
```

### Test count

- nexha-acp-messaging state machine: **37**
- nexha-acp-messaging routes: **22**
- do-app `nexha.acpMessaging` client: **9**
- REZ-Workspace `NexhaConnection` ACP methods: **10**
- **Phase 4 total new tests: 78** (all pass)
- **RTMN total vitest count: 612 (was 534)** — +78 in Phase 4

### Deviations from plan

- **None significant.** All Phase 4 sub-tasks shipped as planned. Service uses Mongoose (not a separate database) — this is intentional and consistent with `nexha-business-directory`.
- **Status mapping nuance:** `COMPLETED` is informational, not terminal. Per the ACP spec, `ORDER → TRACK` is a valid flow (e.g., "where's my order?"). The state machine allows `TRACK`/`DISPUTE` after `COMPLETED`. Only `REJECTED` is terminal. This was clarified by the test suite and matches `sutar-acp-protocol`'s behavior.

---

## Phase 5 — Agent Marketplace 🔄 IN PROGRESS (2026-06-22)

### Goal

Replace the in-memory `sutar-marketplace` (port 4250, moved to BLR Marketplace 2026-06-21) with a per-tenant Mongo-backed marketplace service: listings + reviews + directory linkage, exposed via the RTMN Hub at `/api/sutar/marketplace-listings/*`.

### What was built

#### Service: `marketplace-listings` (port 4250)
- New package `@hojai/blr-marketplace-listings` v1.0.0
- Path: `companies/HOJAI-AI/blr-ai-marketplace/services/marketplace-listings/`
- MongoDB + Mongoose (mirrors `nexha-business-directory` and `nexha-acp-messaging` patterns)
- 5 statuses, 3 visibilities, 8 categories, 5 pricing models
- Per-tenant compound unique indexes
- Denormalized `averageRating` + `reviewCount` on Listing for fast discovery
- Directory linkage: `directoryCompanyId` / `directoryAgentId` → nexha-business-directory:4360

#### Models
- `Listing` — 17 fields, 5 compound indexes, text index on title/description/tags
- `Review` — one per (tenant, listing), 4 dimensions (easeOfUse, docs, support, valueForMoney)

#### Auth
- HS256 JWT (lighter than RS256 for internal HOJAI-AI services)
- Internal token (`x-internal-token`) for Hub callers
- Env vars read at request time (test-friendly)

#### Routes
- `POST /api/listings` (create)
- `GET /api/listings` (search/filter/sort)
- `GET /api/listings/:id` (visibility-checked)
- `PATCH /api/listings/:id` (owner only)
- `POST /api/listings/:id/publish` / `/unpublish` (owner only)
- `POST /api/listings/:id/view` / `/install` (engagement signals)
- `GET /api/listings/:id/reviews`
- `PUT /api/listings/:id/reviews` (one per tenant+listing)
- `DELETE /api/reviews/:id` (reviewer or listing owner)
- `GET /api/my-reviews?listingId=`
- `GET /api/stats` (per-tenant)
- `POST /api/validate` (lint without persisting)
- `GET /internal/sanity` (Hub health aggregator)

### Files added / modified

| Repo | What |
|---|---|
| `HOJAI-AI/blr-ai-marketplace/services/marketplace-listings/` | NEW service (15 files: package.json, vitest.config.js, src/{index,routes/index,middleware/auth,models/{Listing,Review},services/{listingsService,reviewsService}}.js, __tests__/helpers/db.js, __tests__/unit/{listingsService,reviewsService,routes}.test.js, README.md, CLAUDE.md) |
| `RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts` | add `marketplace-listings` to SUTAR_SERVICES (port 4250); add 4 capabilities (marketplace-listings, marketplace-search, marketplace-reviews, marketplace-install); bump version 1.3.0 → 1.4.0 |
| `do-app/backend/src/services/hojaiClient.ts` | add `nexhaMarketplaceListings` namespace with 13 methods; expose as `nexha.marketplaceListings` |
| `do-app/backend/__tests__/unit/hojaiClient.nexha.test.ts` | append 14 marketplace tests |
| `REZ-Workspace/core/unified-fabric/src/connections/nexha.js` | add 11 marketplace methods to `NexhaConnection` |
| `REZ-Workspace/core/unified-fabric/test-marketplace-listings.js` | NEW — 14 node:test smoke tests |
| `docs/nexha/PHASE-LOG.md` | add this Phase 5 section |
| `docs/nexha/marketplace-listings.md` | NEW — service-level doc |
| `CLAUDE.md` | update Phase D row + vitest test count |

### Test counts

- `marketplace-listings` service: **81 vitest** (27 service + 19 reviews + 35 HTTP)
- do-app `nexha.marketplaceListings` client: **14 jest**
- REZ-Workspace `NexhaConnection` marketplace methods: **14 node:test**
- **Phase 5 total new tests: 109** (all pass)
- **RTMN total test count: 721 (was 612)** — +109 in Phase 5

### Commits (across 5 repos)

| Repo | Commit |
|---|---|
| HOJAI-AI | `feat(marketplace-listings): Agent Marketplace service (ADR-0010 Phase 5)` (pushed to main) |
| RABTUL-Technologies | `feat(hub): wire marketplace-listings (ADR-0010 Phase 5)` (pushed to main) |
| do-app | `feat(do-app): ADR-0010 Phase 5 - nexha.marketplaceListings client (14 tests)` (pushed to feat branch) |
| REZ-Workspace | `feat(rez-workspace): ADR-0010 Phase 5 - marketplace-listings client` (pushed to main) |
| RTMN root | (this commit + docs) |

### Endpoints exposed via Hub

```
GET    /api/sutar/marketplace-listings/health
GET    /api/sutar/marketplace-listings/api/listings
GET    /api/sutar/marketplace-listings/api/listings/:id
POST   /api/sutar/marketplace-listings/api/listings
PATCH  /api/sutar/marketplace-listings/api/listings/:id
POST   /api/sutar/marketplace-listings/api/listings/:id/publish
POST   /api/sutar/marketplace-listings/api/listings/:id/unpublish
POST   /api/sutar/marketplace-listings/api/listings/:id/view
POST   /api/sutar/marketplace-listings/api/listings/:id/install
POST   /api/sutar/marketplace-listings/api/validate
GET    /api/sutar/marketplace-listings/api/listings/:id/reviews
PUT    /api/sutar/marketplace-listings/api/listings/:id/reviews
DELETE /api/sutar/marketplace-listings/api/reviews/:id
GET    /api/sutar/marketplace-listings/api/my-reviews
GET    /api/sutar/marketplace-listings/api/stats
```

### Deviations from plan

- **None significant.** Phase 5 shipped as planned: service in HOJAI-AI (the right home for BLR Marketplace), wired into the Hub via the existing SUTAR route group, and consumed by both do-app (TypeScript client) and REZ-Workspace (Node client).
