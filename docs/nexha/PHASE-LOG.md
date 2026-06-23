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

---

## Phase 6 — Mission Planner (nexha-mission-planner @ port 4362)

**Date:** 2026-06-22
**Status:** ✅ **Phase 6 complete — 89 vitest tests, 14 do-app tests, 17 REZ-Workspace tests, all pass.**

Cross-tenant mission composition: a tenant instantiates a template (or supplies a custom DAG), the planner resolves each subtask to an agent in `nexha-business-directory`, and subtasks progress through a strict state machine. A single mission can span multiple tenants — that's the point of "federation".

### What it ships

| File | What it does |
|---|---|
| `companies/Nexha/services/nexha-mission-planner/` | **NEW** — `@nexha/mission-planner` v1.0.0 |
| `src/index.js` | Express app on port 4362, auto-start on direct run, internal sanity endpoint |
| `src/models/Mission.js` | Mongoose model — 7 mission states, 7 subtask states, 5 subtask types |
| `src/models/MissionTemplate.js` | Mongoose model — system (tenantId=null) + tenant-owned templates, partial unique indexes |
| `src/middleware/auth.js` | HS256 JWT + `x-internal-token`, env-var-at-request-time |
| `src/services/missionService.js` | createMission, updateMission, getMission, listMissions, transitionMission, planMission (with custom resolver), startSubtask, completeSubtask, failSubtask, skipSubtask, cancelMission, getStats. State machine. |
| `src/routes/index.js` | All HTTP routes with Zod validation; participant-aware reads |
| `__tests__/helpers/db.js` | mongodb-memory-server + syncIndexes() |
| `__tests__/unit/missionService.test.js` | **42 service-layer tests** — lifecycle, template instantiation, dependencies, auto-promotion |
| `__tests__/unit/routes.test.js` | **47 HTTP tests** via supertest — auth, validation, lifecycle, templates |
| `CLAUDE.md` + `README.md` | NEW — architecture, design rationale, file map |

### Test counts

- `nexha-mission-planner` service: **89 vitest** (42 service + 47 HTTP)
- do-app `nexha.missionPlanner` client: **14 jest**
- REZ-Workspace `NexhaConnection` mission-planner methods: **17 node:test**
- **Phase 6 total new tests: 120** (all pass)
- **RTMN total test count: 841 (was 721)** — +120 in Phase 6

### Wiring (across 5 repos)

| Repo | Change |
|---|---|
| `Nexha/services/nexha-mission-planner/` | NEW service |
| `RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts` | add `nexha-mission-planner` to NEXHA_SERVICES (port 4362); add 3 capabilities (mission-planner, mission-execution, capability-resolution); bump version 1.4.0 → 1.5.0 |
| `do-app/backend/src/services/hojaiClient.ts` | add `nexhaMissionPlanner` namespace with 18 methods; expose as `nexha.missionPlanner` |
| `do-app/backend/__tests__/unit/hojaiClient.nexha.test.ts` | append 14 mission-planner tests |
| `REZ-Workspace/core/unified-fabric/src/connections/nexha.js` | add 17 mission-planner methods to `NexhaConnection` |
| `REZ-Workspace/core/unified-fabric/test-mission-planner.js` | NEW — 17 node:test smoke tests |
| `docs/nexha/PHASE-LOG.md` | add this Phase 6 section |
| `docs/nexha/mission-planner.md` | NEW — service-level doc |
| `CLAUDE.md` | update Phase D row + vitest test count |

### State machines

**Mission:**
```
DRAFT     → PLANNED, CANCELLED
PLANNED   → EXECUTING, DRAFT, CANCELLED
EXECUTING → PAUSED, COMPLETED, FAILED, CANCELLED
PAUSED    → EXECUTING, CANCELLED
FAILED    → EXECUTING, CANCELLED     (can retry)
COMPLETED → (terminal)
CANCELLED → (terminal)
```

**Subtask:**
```
PENDING     → ASSIGNED, SKIPPED, FAILED
ASSIGNED    → IN_PROGRESS, BLOCKED, FAILED, SKIPPED
IN_PROGRESS → COMPLETED, FAILED, BLOCKED
BLOCKED     → IN_PROGRESS, FAILED
FAILED      → PENDING, SKIPPED       (can retry)
COMPLETED   → (terminal)
SKIPPED     → (terminal)
```

### Endpoints exposed via Hub

```
GET    /api/nexha/nexha-mission-planner/health
GET    /api/nexha/nexha-mission-planner/ready
GET    /api/nexha/nexha-mission-planner/
POST   /api/nexha/nexha-mission-planner/api/validate
POST   /api/nexha/nexha-mission-planner/api/missions
GET    /api/nexha/nexha-mission-planner/api/missions
GET    /api/nexha/nexha-mission-planner/api/missions/:id
PATCH  /api/nexha/nexha-mission-planner/api/missions/:id
POST   /api/nexha/nexha-mission-planner/api/missions/:id/plan
POST   /api/nexha/nexha-mission-planner/api/missions/:id/start
POST   /api/nexha/nexha-mission-planner/api/missions/:id/pause
POST   /api/nexha/nexha-mission-planner/api/missions/:id/cancel
POST   /api/nexha/nexha-mission-planner/api/missions/:id/retry
POST   /api/nexha/nexha-mission-planner/api/missions/:id/subtasks/:subtaskId/start
POST   /api/nexha/nexha-mission-planner/api/missions/:id/subtasks/:subtaskId/complete
POST   /api/nexha/nexha-mission-planner/api/missions/:id/subtasks/:subtaskId/fail
POST   /api/nexha/nexha-mission-planner/api/missions/:id/subtasks/:subtaskId/skip
GET    /api/nexha/nexha-mission-planner/api/templates
GET    /api/nexha/nexha-mission-planner/api/templates/:id
POST   /api/nexha/nexha-mission-planner/api/templates
GET    /api/nexha/nexha-mission-planner/api/stats
```

### Design highlights

- **Cross-tenant participants**: mission is owned by one tenant, but subtasks can be assigned to agents of OTHER tenants. `participants[]` tracks who's involved.
- **Dependency-aware subtasks**: `dependsOn: [subtaskId1, ...]` blocks `startSubtask` until deps are COMPLETED or SKIPPED.
- **Template instantiation with `{{placeholder}}` substitution**: same template → many missions, each with their own context.
- **Auto-promotion**: starting a subtask auto-promotes DRAFT/PLANNED mission → EXECUTING. Last terminal subtask auto-completes the mission.
- **Per-tenant compound unique indexes**: same `missionId`/`templateId` can be reused across tenants.
- **StateTransitionError (422) on illegal moves**: prevents silent state corruption.

---

## Phase 7 — Partner Graph (2026-06-22) ✅

### Goal

Per-tenant partnership tracking + recommendation engine. Replaces ad-hoc relationship tracking with a structured graph: every interaction (transaction, negotiation, mission, contract, review, inquiry) updates a computed **strength score** per partner. The graph powers tenant-specific recommendations (40% existing strength + 30% trust + 30% recency).

### Deliverables

| Component | Path | Tests |
|---|---|---|
| Service | `companies/Nexha/services/nexha-partner-graph/` (port 4363) | 67 vitest |
| Hub wiring | `RABTUL-Technologies/REZ-ecosystem-connector@1.6.0` | — |
| do-app client | `companies/do-app/backend/src/services/hojaiClient.ts` → `nexha.partnerGraph` | 8 tests (90 total in nexha file) |
| REZ-Workspace client | `core/unified-fabric/src/connections/nexha.js` → 7 methods | 15 node:test |

### Data model

```
Partnership { tenantId, partnerRef, partnerType, partnerName, relationshipType,
              transactionCount, totalGmv, averageRating, trustScore,
              lastInteractionAt, tags, strength, metadata }
  compound unique index on (tenantId, partnerRef)
  secondary indexes: (tenantId, relationshipType, strength: -1),
                     (tenantId, lastInteractionAt: -1)

Interaction { tenantId, partnerRef, type, direction ('outgoing'|'incoming'),
              value, currency, rating, source, sourceRef,
              relationshipType, tags, metadata, occurredAt }
  type ∈ {transaction, negotiation, mission, contract, review, inquiry}
```

### Strength formula

```
strength = 0.30 · score(count) + 0.30 · score(gmv) + 0.20 · score(rating) + 0.20 · score(recency)
where:
  score(count)  = min(log10(count+1) / 2, 1)   — caps at ~100 txns
  score(gmv)    = min(log10(gmv+1) / 5, 1)     — caps at ~$100k
  score(rating) = rating / 5  (or 0.5 if no rating)
  score(recency)= 1 - daysSinceLast / 365 (or 0 if never)
```

### Recommendation formula

```
score = 0.40 · strength + 0.30 · trustScore + 0.30 · recencyScore
```

When `relationshipType` is given, only partnerships of that type are considered. Results sorted desc.

### Endpoints exposed via Hub

```
GET    /api/nexha/nexha-partner-graph/health
GET    /api/nexha/nexha-partner-graph/ready
GET    /api/nexha/nexha-partner-graph/
POST   /api/nexha/nexha-partner-graph/api/interactions
GET    /api/nexha/nexha-partner-graph/api/interactions
GET    /api/nexha/nexha-partner-graph/api/partners
GET    /api/nexha/nexha-partner-graph/api/partners/:ref
GET    /api/nexha/nexha-partner-graph/api/partners/by-type/:type
POST   /api/nexha/nexha-partner-graph/api/recommend
GET    /api/nexha/nexha-partner-graph/api/stats
```

### Design highlights

- **Dual-side updates**: recording an interaction updates both the calling tenant's partnership (with the given direction) and the partner's partnership (with inverted direction). Same `partnerRef` can exist in different tenants without conflict.
- **Type inference**: if no explicit `relationshipType`, inferred from interaction type (`transaction` → `customer`/`supplier`, `contract`/`mission` → `partner`).
- **Trust score is decoupled**: set via metadata (e.g. from `sada-trust-engine`); not computed from interactions. Defaults to 0.5.
- **Recommendation explainability-light**: returns raw scores; future work to expose feature contributions.
- **JWT + internal token**: same dual pattern as mission-planner. Tests verify both paths.

### Test counts after Phase 7

| Suite | Tests |
|---|---:|
| nexha-partner-graph (vitest) | 67 |
| nexha-mission-planner (vitest, carried) | 89 |
| nexha-business-directory (vitest, carried) | 68 |
| nexha-pricing-network (vitest, carried) | 31 |
| nexha-warehouse-network (vitest, carried) | 49 |
| nexha-trade-finance-network (vitest, carried) | 38 |
| nexha-distribution-network (vitest, carried) | 22 |
| nexha-supplier-network (vitest, carried) | 20 |
| do-app nexha clients (vitest) | 90 |
| REZ-Workspace node:test (mission + partner) | 32 |
| SUTAR foundation (carried) | 425 |
| **Ecosystem total** | **931** |

---

## Phase 8 — Commerce Runtime (2026-06-22) ✅

### Goal

The execution plane of the Nexha Commerce Network. Owns orders + payments + returns, each with an explicit state machine. Cross-entity auto-promotions (capture-payment → order-paid, refund-return → payment-refunded + order-promoted) live inside the service so callers don't have to orchestrate them.

### Deliverables

| Component | Path | Tests |
|---|---|---|
| Service | `companies/Nexha/services/nexha-commerce-runtime/` (port 4364) | 86 vitest |
| Hub wiring | `RABTUL-Technologies/REZ-ecosystem-connector@1.7.0` | — |
| do-app client | `companies/do-app/backend/src/services/hojaiClient.ts` → `nexha.commerceRuntime` | 10 tests (68 total in file) |
| REZ-Workspace client | `core/unified-fabric/src/connections/nexha.js` → 30 methods | 22 node:test |

### Data model

```
Order { tenantId, orderId, buyerRef, sellerRef, status,
        items[], currency, subtotal, tax, shipping, total,
        paymentId, fulfillment, shippingAddress, notes, tags, metadata,
        placedAt, paidAt, completedAt, cancelledAt }
  status ∈ {DRAFT, PLACED, PAID, FULFILLING, SHIPPED, DELIVERED,
            COMPLETED, CANCELLED, REFUNDED, RETURNED}
  compound unique index on (tenantId, orderId)

Payment { tenantId, paymentId, orderId, buyerRef, sellerRef, status,
          method, amount, currency, refundedAmount, providerRef,
          authorizedAt, capturedAt, refundedAt, failureReason, metadata }
  status ∈ {PENDING, AUTHORIZED, CAPTURED, COMPLETED, REFUNDED, FAILED, CANCELLED}
  method ∈ {CARD, BANK_TRANSFER, WALLET, ESCROW, BNPL, OTHER}
  compound unique index on (tenantId, paymentId)

Return { tenantId, returnId, orderId, buyerRef, sellerRef, status,
         reason, lines[], refundAmount, currency,
         approvedAt, receivedAt, completedAt, rejectedAt, refundedAt,
         rejectionReason, metadata }
  status ∈ {REQUESTED, APPROVED, IN_TRANSIT, RECEIVED, COMPLETED, REJECTED, REFUNDED}
  reason ∈ {DEFECTIVE, WRONG_ITEM, NOT_AS_DESCRIBED, BUYER_REMORSE, OTHER}
  compound unique index on (tenantId, returnId)
```

### State machines

```
Order:    DRAFT → PLACED → PAID → FULFILLING → SHIPPED → DELIVERED → COMPLETED
                       ↓         ↓            ↓
                    CANCELLED  REFUNDED    RETURNED → COMPLETED|REFUNDED

Payment:  PENDING → AUTHORIZED → CAPTURED → COMPLETED → REFUNDED
                      ↘ FAILED/CANCELLED

Return:   REQUESTED → APPROVED → IN_TRANSIT → RECEIVED → COMPLETED → REFUNDED
                      ↘ REJECTED
```

### Auto-promotions (cross-entity)

| Trigger | Cascade |
|---|---|
| `capturePayment` | payment CAPTURED → order PAID |
| `cancelOrder` (PLACED) | order CANCELLED → payment CANCELLED (if PENDING/AUTHORIZED) |
| `refundOrder` | order REFUNDED → payment REFUNDED (full) |
| `refundReturn` (full) | return REFUNDED → payment refunded → order RETURNED → REFUNDED |
| `refundReturn` (partial) | return REFUNDED → payment partially refunded → order RETURNED → COMPLETED |

### Endpoints exposed via Hub

```
GET    /api/nexha/nexha-commerce-runtime/health
GET    /api/nexha/nexha-commerce-runtime/ready
GET    /api/nexha/nexha-commerce-runtime/
POST   /api/nexha/nexha-commerce-runtime/api/orders
GET    /api/nexha/nexha-commerce-runtime/api/orders
GET    /api/nexha/nexha-commerce-runtime/api/orders/:id
PATCH  /api/nexha/nexha-commerce-runtime/api/orders/:id
POST   /api/nexha/nexha-commerce-runtime/api/orders/:id/{place,cancel,fulfill,ship,deliver,complete,refund}
POST   /api/nexha/nexha-commerce-runtime/api/payments
GET    /api/nexha/nexha-commerce-runtime/api/payments
GET    /api/nexha/nexha-commerce-runtime/api/payments/:id
POST   /api/nexha/nexha-commerce-runtime/api/payments/:id/{authorize,capture,complete,fail,cancel,refund}
POST   /api/nexha/nexha-commerce-runtime/api/returns
GET    /api/nexha/nexha-commerce-runtime/api/returns
GET    /api/nexha/nexha-commerce-runtime/api/returns/:id
POST   /api/nexha/nexha-commerce-runtime/api/returns/:id/{approve,reject,in-transit,received,complete,refund}
GET    /api/nexha/nexha-commerce-runtime/api/stats
```

### Design highlights

- **Compound unique indexes** on `(tenantId, orderId/paymentId/returnId)` so the same id can be reused across tenants.
- **Dual auth**: JWT (Bearer) + `x-internal-token` (with `X-Tenant-Id`). Both tested.
- **Empty-patch rejection** at both route and service layer (no silent no-ops).
- **Idempotent terminal-state calls throw** — calling `refundReturn` on an already-REFUNDED return returns 422 instead of silently no-op'ing (via the new "terminal-status guard" in `assertTransition`).
- **Refund cascades**: `refundReturn` walks the order → payment → order promotion chain in a single call, with re-fetch to avoid stale-document bugs.
- **Empty items guard**: `placeOrder` rejects orders with no items (422 → 400).

### Test counts after Phase 8

| Suite | Tests |
|---|---:|
| nexha-commerce-runtime (vitest) | 86 |
| nexha-partner-graph (vitest, carried) | 67 |
| nexha-mission-planner (vitest, carried) | 89 |
| nexha-business-directory (vitest, carried) | 68 |
| nexha-pricing-network (vitest, carried) | 31 |
| nexha-warehouse-network (vitest, carried) | 49 |
| nexha-trade-finance-network (vitest, carried) | 38 |
| nexha-distribution-network (vitest, carried) | 22 |
| nexha-supplier-network (vitest, carried) | 20 |
| do-app nexha clients (jest) | 68 |
| REZ-Workspace node:test (mission + partner + commerce) | 54 |
| SUTAR foundation (carried) | 425 |
| **Ecosystem total** | **1,017** |

---

## Phase 9 — Per-Tenant SUTAR Instances (2026-06-22) ✅

**Service:** `sutar-tenant-instances`
**Location:** `companies/HOJAI-AI/sutar-os/core/sutar-tenant-instances/`
**Port:** `4141` (configurable via `SUTAR_TENANT_INSTANCES_PORT`)
**Owner:** HOJAI-AI (the SUTAR runtime lives there, so tenant-instance lifecycle belongs alongside)

### What it does

Most tenants share a single SUTAR cluster. When a tenant is **large** (e.g. 500+ restaurants), **regulated** (healthcare/finance/government), or has strict **SLA requirements**, they need their own **isolated SUTAR shard**:

| Isolation Level | What it means | When to use |
|---|---|---|
| **SHARED** | Same database, logical isolation by `tenantId`. Auto-activated. | 95% of tenants (default) |
| **DEDICATED** | Separate MongoDB database. Logical isolation by `tenantId`. | Medium tenants that want data separation |
| **ISOLATED** | Separate DB + custom limits + custom routes + dedicated health checks. | Regulated industries, large chains, government |

`sutar-tenant-instances` is the **registry and lifecycle manager** for those shards. It tracks who has one, in what state, with what limits, and exposes the operational controls (suspend, resume, destroy, rotate key, usage, limits check).

### State machine

```
                ┌──────────────┐
                │ PROVISIONING │ ← initial state
                └──────┬───────┘
                       │ auto-activate (SHARED) or manual
                       ▼
                ┌──────────────┐         ┌─���───────────┐
         ┌─────►│    ACTIVE    │────────►│  SUSPENDED  │──┐
         │      └──┬─────┬─────┘         └──────┬──────┘  │
         │         │     │                      │         │ resume
         │         │     │ destroy              │ destroy │
         │         │     ▼                      ▼         │
         │         │  ┌────────────┐     ┌────────────┐   │
         │         │  │ DESTROYING │────►│ DESTROYED  │   │
         │         │  └─────┬──────┘     └────────────┘   │
         │         │        │ failed                    │
         │         │        ▼                           │
         │         │   ┌──────────┐                     │
         │         └──►│  FAILED  │◄────────────────────┘
         │             └────┬─────┘
         │                  │ destroy
         │                  ▼
         └─────────────► DESTROYING → DESTROYED
```

Same-state transitions **always throw** (no silent no-ops on already-DESTROYED, REFUNDED, etc.) — terminal-state guard.

### Endpoints (15 total)

```
POST   /api/instances                                  provision new instance
GET    /api/instances                                  list (filter by status/tenantId/isolation/region)
GET    /api/instances/:id                              fetch one
GET    /api/instances/by-tenant/:tenantId              find active for tenant
PATCH  /api/instances/:id                              update region / limits / routes / tags
POST   /api/instances/:id/suspend                      pause an instance
POST   /api/instances/:id/resume                       unpause
POST   /api/instances/:id/destroy                      tear down
POST   /api/instances/:id/fail                         mark as failed
POST   /api/instances/:id/rotate-key                   rotate API key (returns plaintext once)
POST   /api/instances/:id/health                       record health check
POST   /api/instances/:id/usage                        record usage event
GET    /api/instances/:id/usage                        read usage (today + past 6 days)
GET    /api/instances/:id/limits                       check limit violations
GET    /api/stats                                      aggregate stats
```

### Data model

**TenantInstance** — `instanceId` (unique), `tenantId`, `status`, `isolationLevel`, `region`, `namespace`, `databaseUri`, `apiKeyHash` (SHA-256, plaintext returned only on create/rotate), `limits` (maxAgents, maxMissionsPerDay, maxApiCallsPerMinute, storageMbLimit), `routes` (path overrides), `tags`, `metadata`, lifecycle timestamps, last health check.

**UsageMetric** — daily counter per instance: `apiCalls`, `missionsCreated/Completed/Failed`, `errorCount` (increments), `agentsActive`, `storageMbUsed` (high-water mark).

Compound unique index on `(instanceId, date)`.

### Security

- All routes require auth (JWT with `sutar:admin` role OR internal token).
- API keys stored as SHA-256 hashes only; plaintext returned once on creation/rotation.
- Internal token is environment-driven (`SUTAR_TENANT_INSTANCES_INTERNAL_TOKEN`) for Hub cross-service calls.

### Design highlights

- **Compound unique** on `instanceId` (one record per shard).
- **State machine** with terminal-state guards — same-state transitions throw 422.
- **Active-tenant conflict detection**: provisioning fails if the tenant already has a live (PROVISIONING/ACTIVE/SUSPENDED) instance.
- **Auto-activation** for SHARED instances (no infrastructure to provision); DEDICATED/ISOLATED require explicit `autoActivate: true` (or real provisioning callback).
- **SHA-256 key hashing** at rest, plaintext exposed only on create/rotate.
- **Usage tracking** is additive (counters) + idempotent (high-water marks).
- **Limit enforcement** checks API calls per day, missions per day, storage MB, plus SUSPENDED status.

### Hub wiring

REZ-ecosystem-connector (`@rez/rez-ecosystem-connector@1.8.0`):

- `SUTAR_SERVICES['sutar-tenant-instances'] = http://localhost:4141`
- `/api/sutar/sutar-tenant-instances/api/*` (any HTTP method)
- Capabilities: `sutar-tenant-instances`, `tenant-shard`, `tenant-isolation`, `sutar-provisioning`, `sutar-lifecycle`

### Clients

| Client | Methods | Tests |
|---|---:|---:|
| `do-app/backend/src/services/hojaiClient.ts` (`sutar.tenantInstances.*`) | 15 | 17 (jest) |
| `REZ-Workspace/core/unified-fabric/src/connections/nexha.js` (`provisionInstance`, `listInstances`, etc.) | 17 | 18 (node:test) |

### Test counts after Phase 9

| Suite | Tests |
|---|---:|
| sutar-tenant-instances (vitest, NEW) | 75 |
| nexha-commerce-runtime (vitest, carried) | 86 |
| nexha-partner-graph (vitest, carried) | 67 |
| nexha-mission-planner (vitest, carried) | 89 |
| nexha-business-directory (vitest, carried) | 68 |
| nexha-pricing-network (vitest, carried) | 31 |
| nexha-warehouse-network (vitest, carried) | 49 |
| nexha-trade-finance-network (vitest, carried) | 38 |
| nexha-distribution-network (vitest, carried) | 22 |
| nexha-supplier-network (vitest, carried) | 20 |
| do-app nexha + sutar clients (jest) | 102 |
| REZ-Workspace node:test (mission + partner + commerce + tenant) | 72 |
| SUTAR foundation (carried) | 425 |
| **Ecosystem total** | **1,144** |

---

## Phase 10 — Per-Tenant Industry OS Instances ✅ DONE (2026-06-23)

**Goal:** Give large/regulated tenants their own **Industry OS shards** (healthcare, finance, hotel, etc.) instead of forcing them onto the shared single-tenant Industry OS. Phase 10 is the vertical-layer parallel of Phase 9 (which covered the SUTAR horizontal layer).

**Repos touched:** RTMN (industry-os), RABTUL-Technologies (Hub), do-app, REZ-Workspace, RTMN-root docs

**Owner:** RTMN `industry-os/` (the vertical layer lives here, unlike Phase 9 which lived in HOJAI-AI's SUTAR)

### What it does

Most tenants share a single Industry OS instance (one Healthcare OS, one Restaurant OS, etc.). Large or regulated tenants — hospital chains, banks, hotel franchises — need:

1. **Dedicated compute / database** so other tenants can't impact them.
2. **Compliance metadata** (HIPAA, PCI-DSS, GDPR, SOC2) recorded on the instance.
3. **Per-tenant API keys** (rotated independently) for tenant-side auth.
4. **Independent lifecycle**: suspend one tenant's healthcare instance without freezing the rest.
5. **Independent usage metrics & limits** for billing and capacity.

`industry-tenant-instances` is the lifecycle manager for those Industry OS shards.

### Tenant × Industry key

Unlike Phase 9 (which keyed on `tenantId`), Phase 10 keys on **the pair `(tenantId, industry)`**: a tenant may hold instances for multiple industries simultaneously (a hospital group has healthcare + finance + hotel), but cannot hold two healthcare instances.

### Isolation levels

| Level | Database | Use case |
|---|---|---|
| **SHARED** | shared RTMN DB, tenant-id partition | small tenants, fast onboarding (default; auto-activates) |
| **DEDICATED** | dedicated MongoDB collection / schema on shared cluster | medium tenants, compliance opt-in |
| **ISOLATED** | dedicated MongoDB instance (separate `databaseUri`) | large / regulated tenants (HIPAA, PCI-DSS) |

### State machine

```
PROVISIONING → ACTIVE → SUSPENDED → ACTIVE → DESTROYING → DESTROYED
                  │          │                      ↑
                  └──────────┴──────────────────────┘
                  FAILED → DESTROYING
```

Same-state transitions **always throw** (terminal-state guard).
`DESTROYED` is terminal. `FAILED` can only proceed to `DESTROYING`.

### 24 supported industries

`restaurant, hotel, healthcare, retail, legal, education, agriculture, automotive, beauty, fashion, fitness, gaming, government, homeServices, manufacturing, nonProfit, professional, sports, travel, entertainment, construction, finance, realEstate, transport`

### Endpoints (16 total)

```
POST   /api/instances                                  provision (tenant+industry)
GET    /api/instances                                  list (filter by status/tenant/industry/isolation/region/complianceFramework)
GET    /api/instances/:id                              fetch one
GET    /api/instances/by-tenant/:tenantId              find active for tenant (optional ?industry=)
PATCH  /api/instances/:id                              update region / limits / compliance / routes / tags
POST   /api/instances/:id/suspend                      pause
POST   /api/instances/:id/resume                       unpause
POST   /api/instances/:id/destroy                      tear down
POST   /api/instances/:id/fail                         mark as failed
POST   /api/instances/:id/rotate-key                   rotate API key (returns plaintext once)
POST   /api/instances/:id/health                       record health check
POST   /api/instances/:id/usage                        record usage event
GET    /api/instances/:id/usage                        read usage (today + past 6 days)
GET    /api/instances/:id/limits                       check limit violations
GET    /api/stats                                      aggregate stats (optional ?industry=)
```

### Data model

**IndustryInstance** — `instanceId` (unique, `iti_<16hex>`), `tenantId`, `industry` (enum), `status`, `isolationLevel`, `region`, `namespace`, `databaseUri`, `apiKeyHash` (SHA-256), `limits` (maxApiCallsPerMinute, maxRecordsPerTenant, storageMbLimit, maxConcurrentWorkflows), `compliance` (framework, auditLogEnabled, dataResidencyRegion, encryptionAtRest, encryptionInTransit, notes), `routes`, `tags`, `metadata`, lifecycle timestamps, last health check.

**UsageMetric** — daily counter per instance: `apiCalls`, `recordsCreated/Updated`, `workflowsExecuted`, `errorCount` (increments), `recordsActive`, `storageMbUsed` (high-water mark).

### Security

- All routes require auth (JWT with `industry:admin` role OR internal token).
- API keys stored as SHA-256 hashes only; plaintext returned once on creation/rotation.
- Industry enum enforced at both Zod validation (HTTP layer) and Mongoose schema (DB layer).

### Design highlights

- **Compound unique** on `instanceId` + (tenantId, industry) pair — one active instance per `(tenant, industry)`.
- **State machine** with terminal-state guards — same-state transitions throw 422.
- **Tenant+industry conflict detection**: provisioning fails if the pair already has a live instance.
- **Auto-activation** for SHARED instances (no infrastructure to provision); DEDICATED/ISOLATED require explicit `autoActivate: true`.
- **Compliance metadata** stored per-instance, queryable by framework (HIPAA, PCI-DSS, etc.).
- **SHA-256 key hashing** at rest, plaintext exposed only on create/rotate.
- **Usage tracking** is additive (counters) + idempotent (high-water marks).
- **Limit enforcement** checks API calls per day, records active, storage MB, plus SUSPENDED status.

### Hub wiring

REZ-ecosystem-connector (`@rez/rez-ecosystem-connector@1.9.0`):

- `NEXHA_SERVICES['industry-tenant-instances'] = http://localhost:4365`
- `/api/nexha/industry-tenant-instances/api/*` (any HTTP method)
- Capabilities: `industry-tenant-instances`, `industry-shard`, `industry-isolation`, `industry-provisioning`, `industry-lifecycle`

### Clients

| Client | Methods | Tests |
|---|---:|---:|
| `industry-tenant-instances` (vitest, NEW) | service + routes | 96 |
| `do-app/backend/src/services/hojaiClient.ts` (`sutar.industryTenantInstances.*`) | 16 | 20 (jest) |
| `REZ-Workspace/core/unified-fabric/src/connections/nexha.js` (`provisionIndustryInstance`, `listIndustryInstances`, etc.) | 17 | 20 (node:test) |

### Test counts after Phase 10

| Suite | Tests |
|---|---:|
| industry-tenant-instances (vitest, NEW) | 96 |
| sutar-tenant-instances (vitest, carried) | 75 |
| nexha-commerce-runtime (vitest, carried) | 86 |
| nexha-partner-graph (vitest, carried) | 67 |
| nexha-mission-planner (vitest, carried) | 89 |
| nexha-business-directory (vitest, carried) | 68 |
| nexha-pricing-network (vitest, carried) | 31 |
| nexha-warehouse-network (vitest, carried) | 49 |
| nexha-trade-finance-network (vitest, carried) | 38 |
| nexha-distribution-network (vitest, carried) | 22 |
| nexha-supplier-network (vitest, carried) | 20 |
| do-app nexha + sutar clients (jest) | 122 |
| REZ-Workspace node:test (mission + partner + commerce + tenant + industry) | 92 |
| SUTAR foundation (carried) | 425 |
| **Ecosystem total** | **1,280** |

**+136 tests added in Phase 10** (96 service + 20 do-app + 20 REZ-Workspace).
