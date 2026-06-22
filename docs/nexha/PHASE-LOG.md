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
