# Phase-Wise Upgrade Plan — All Profiles

**Companion to:** [ADR-0009 — Canonical Architecture](0009-hojai-nexha-canonical-architecture.md)
**Date:** 2026-06-22
**Scope:** How each phase affects each of the 5 profiles (repos)

---

## The 5 Profiles

| Profile | Repo | What it owns | Current size |
|---|---|---|---|
| **1. HOJAI-AI** | `github.com/imrejaul007/hojai-ai` | Intelligence (Foundation + SUTAR + Genie) | 13 real SUTAR services, 8 Foundation services, 23 Genie services |
| **2. Nexha** | `github.com/imrejaul007/NeXha` | Commerce network | 9 services, nexha-gateway, nexha-portal, commerce-identity, mobile |
| **3. RTMN root** | `github.com/imrejaul007/RTMN-Services` | Hub + docs + cross-repo glue | Hub (RABTUL-Technologies), CLAUDE.md, ADR/, demos/ |
| **4. do-app** | `github.com/imrejaul007/do-app` | Consumer mobile + backend | Expo app, backend on :3001 |
| **5. REZ-Workspace** | `github.com/imrejaul007/REZ-Workspace` | Unified-fabric + shared | SUTAR Node client, shared utilities |

---

## Phase 0: Move 5 network services (3 weeks)

**Owner:** HOJAI team + Nexha team
**Goal:** Fix ownership violation — 5 services move from HOJAI to Nexha

### Profile 1: HOJAI-AI

| Change | Detail |
|---|---|
| **Remove** | `sutar-supplier-registry` (port 4280) — moved to Nexha |
| **Remove** | `sutar-warehouse-network` (port 4288) — moved to Nexha |
| **Remove** | `sutar-logistics` (port 4285) — moved to Nexha |
| **Remove** | `sutar-trade-finance` (port 4287) — moved to Nexha |
| **Remove** | `sutar-pricing-intelligence` (port 4286) — moved to Nexha |
| **Update** | `sutar-os/CLAUDE.md` — drop 5 services from inventory |
| **Update** | Bump submodule pointer in RTMN root |

**Effort in HOJAI-AI:** 1 week (extract + bump submodule)

### Profile 2: Nexha

| Change | Detail |
|---|---|
| **Add** | `nexha-supplier-network` (port 4280) — from HOJAI |
| **Add** | `nexha-warehouse-network` (port 4288) — from HOJAI |
| **Add** | `nexha-distribution-network` (port 4285) — from HOJAI |
| **Add** | `nexha-trade-finance-network` (port 4287) — from HOJAI |
| **Add** | `nexha-pricing-network` (port 4286) — from HOJAI |
| **Delete** | `procurement-os` (L1 stub — replaced by nexha-supplier-network) |
| **Delete** | `distribution-os` (L1 stub — replaced by nexha-distribution-network) |
| **Delete** | `trade-finance` (L1 stub — replaced by nexha-trade-finance-network) |
| **Move** | `sutar-mock` → HOJAI-AI as `sutar-dev-mock` (or delete) |
| **Add** | `nexha-business-directory/` (empty placeholder for Phase 3) |

**Effort in Nexha:** 1.5 weeks (import + delete stubs)

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Update** | `RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts` — Hub `NEXHA_SERVICES` map: add new names, keep old as deprecation aliases |
| **Update** | `RABTUL-Technologies/REZ-ecosystem-connector/dist/index.js` — same (rebuild or manual) |
| **Update** | `CLAUDE.md` — all 5 services now listed under Nexha |
| **Update** | `README.onepager.md` — same |
| **Update** | `ROADMAP-TO-VISION.md` — same |
| **Update** | `STATUS-AND-REMAINING-WORK.md` — same |
| **Update** | `docs/sutar-os/README.md` — drop 5 services |
| **Update** | `docs/sutar-os/ARCHITECTURE.md` — drop 5 services |
| **Update** | `docs/sutar-os/API.md` — drop 5 services |
| **Update** | `docs/sutar-os/INTEGRATION.md` — drop 5 services |
| **Update** | `docs/sutar-os/HUB-CAPABILITY-MAP.md` — rename to nexha-* |
| **Update** | `docs/SITE-INDEX.md` — add nexha-* links |
| **Update** | `scripts/dev-stack.sh` — change port map |
| **Update** | `docker-compose.dev.yml` — same |
| **Update** | `demos/full-stack-demo.sh` — same |
| **Bump** | HOJAI-AI submodule pointer (drops 5 services) |

**Effort in RTMN root:** 1 week (docs + Hub + scripts)

### Profile 4: do-app

| Change | Detail |
|---|---|
| **Update** | `backend/src/services/hojaiClient.ts` — change `nexha.listSuppliers` to call `nexha-supplier-network` (new name) |
| **Update** | Same for `quoteShipping`, `findWarehouses`, `getCreditOffer`, `comparePrices`, `recommendPrice` |
| **Test** | End-to-end test of "buy groceries" flow |
| **Update** | Mobile autopilot tab to display new service names |

**Effort in do-app:** 2 days (just call renaming)

### Profile 5: REZ-Workspace

| Change | Detail |
|---|---|
| **Update** | `core/unified-fabric/src/connections/sutarOS.js` — if it references any of the 5 moved services, update paths |
| **Test** | Run vitest to verify no breakage |

**Effort in REZ-Workspace:** 1 day (if any references)

### Phase 0 Total: 3 weeks, 2-3 engineers

| Profile | Effort | Engineer |
|---|---|---|
| HOJAI-AI | 1 week | 1 HOJAI engineer |
| Nexha | 1.5 weeks | 1 Nexha engineer |
| RTMN root | 1 week | 1 RTMN engineer |
| do-app | 2 days | 0.5 do-app engineer |
| REZ-Workspace | 1 day | 0.5 REZ engineer |
| **Total parallel** | **3 weeks** | **2-3 engineers** |

---

## Phase 1: Multi-tenant SUTAR (4 weeks)

**Owner:** HOJAI team
**Goal:** Add `companyId` to all SUTAR data models with row-level security

### Profile 1: HOJAI-AI (BIG work here)

| Service | Change |
|---|---|
| `sutar-decision-engine` | Add `companyId` to ranking context, filter by tenant |
| `sutar-economy-os` | Per-company Karma wallets, transactions, leaderboards |
| `sutar-trust-engine` | Per-company trust scores (replace global) |
| `sutar-contract-os` | Per-company contracts, escrow |
| `sutar-negotiation-engine` | Per-company negotiation rooms |
| `sutar-monitoring` | Per-company metrics |
| `sutar-gateway` | Pass tenant context from JWT |
| `sutar-twin-os` | Per-company agent twins |
| `sutar-memory-bridge` | Per-company memory partitions |
| `sutar-agent-id` | Per-company agent namespaces |
| `sutar-agent-network` | Filter agent registry by company |
| 14 agent services | Per-company isolation |
| **New** | `sutar-tenant-context` middleware (shared) |
| **New** | Tenant fork script (`scripts/fork-tenant.ts`) |
| **New** | Multi-tenancy tests (10+ per service) |

**Effort in HOJAI-AI:** 4 weeks (big work)

### Profile 2: Nexha

No changes in Phase 1.

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Update** | `docs/sutar-os/ARCHITECTURE.md` — add multi-tenancy architecture section |
| **Update** | `docs/sutar-os/API.md` — document tenant context header |
| **Update** | `CLAUDE.md` — note multi-tenant capability |

**Effort in RTMN root:** 2 days (docs only)

### Profile 4: do-app

| Change | Detail |
|---|---|
| **Update** | Backend to send `X-Company-Id` header (or include in JWT) |
| **Test** | 2 test users in 2 test companies don't see each other's data |

**Effort in do-app:** 1 day

### Profile 5: REZ-Workspace

| Change | Detail |
|---|---|
| **Update** | `sutarOS.js` to pass tenant context |

**Effort in REZ-Workspace:** 0.5 day

### Phase 1 Total: 4 weeks, 2 engineers

---

## Phase 2: Event Bus (2 weeks)

**Owner:** RTMN team (infrastructure)
**Goal:** Redis Streams for cross-service events

### Profile 1: HOJAI-AI

| Change | Detail |
|---|---|
| **Add** | `shared/event-bus/` — Redis Streams client wrapper |
| **Update** | All 13 SUTAR services — emit events on state changes |
| **Update** | All 14 agent services — emit events on state changes |
| **Add** | Event subscription helper |
| **Add** | Event replay tool |

**Effort in HOJAI-AI:** 1 week

### Profile 2: Nexha

| Change | Detail |
|---|---|
| **Add** | Redis Streams subscriber |
| **Update** | 5 moved services (nexha-supplier-network, etc.) — emit events |
| **Update** | nexha-gateway — subscribe to relevant events |
| **Update** | nexha-portal — display real-time updates |

**Effort in Nexha:** 1 week

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Add** | `scripts/event-replay.sh` |
| **Update** | `docker-compose.dev.yml` — add Redis |
| **Add** | `docs/EVENT-BUS.md` — full event schema documentation |
| **Update** | `scripts/dev-stack.sh` — include Redis |

**Effort in RTMN root:** 3 days

### Profile 4: do-app

| Change | Detail |
|---|---|
| **Add** | Mobile push notification on key events (RFQ awarded, shipment delivered) |
| **Update** | Backend to subscribe to events and push to mobile |

**Effort in do-app:** 2 days

### Profile 5: REZ-Workspace

No changes.

### Phase 2 Total: 2 weeks, 2 engineers

---

## Phase 3: Business Directory (3 weeks)

**Owner:** Nexha team
**Goal:** One service with 4 endpoints (companies, capabilities, agents, trust)

### Profile 1: HOJAI-AI

| Change | Detail |
|---|---|
| **Update** | SADA to expose trust scores via public API for Nexha to consume |
| **Add** | SUTAR can publish "I'm a company with these agents" to nexha-business-directory |
| **Update** | Tests to verify cross-company data isolation still works |

**Effort in HOJAI-AI:** 3 days (just API exposure)

### Profile 2: Nexha (BIG work here)

| Change | Detail |
|---|---|
| **Add** | `nexha-business-directory/` (port 4360) — full service |
| **Add** | PostgreSQL or MongoDB schema |
| **Add** | 4 endpoints: `/companies`, `/capabilities`, `/agents`, `/trust` |
| **Add** | Company onboarding flow (self-service registration) |
| **Add** | Capability search |
| **Add** | 30+ unit tests |

**Effort in Nexha:** 2.5 weeks (big work)

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Update** | Hub `NEXHA_SERVICES` map to include `nexha-business-directory` |
| **Update** | `docs/sutar-os/HUB-CAPABILITY-MAP.md` — add new service |
| **Add** | `docs/nexha/` (new docs folder) — full Business Directory docs |
| **Update** | `CLAUDE.md` — add to Nexha inventory |

**Effort in RTMN root:** 3 days (docs + Hub)

### Profile 4: do-app

| Change | Detail |
|---|---|
| **Add** | Mobile UI for "Find a supplier" using nexha-business-directory |
| **Add** | Backend client for nexha-business-directory |

**Effort in do-app:** 1 week (new feature)

### Profile 5: REZ-Workspace

| Change | Detail |
|---|---|
| **Add** | `nexha-business-directory.js` client in `core/unified-fabric/src/connections/` |

**Effort in REZ-Workspace:** 1 day

### Phase 3 Total: 3 weeks, 2-3 engineers

---

## Phase 4: Real ACP-Messaging (3 weeks)

**Owner:** HOJAI team
**Goal:** Replace 14 stub agent services with real ACP implementation

### Profile 1: HOJAI-AI (BIG work here)

| Change | Detail |
|---|---|
| **Replace** | `acp-protocol` (port 4800) — from stub to real protocol |
| **Replace** | `acn-hub` (port 4852) — from stub to real hub |
| **Replace** | `acn-network` (port 4801) — from stub to real registry |
| **Replace** | `acn-integration` (port 4849) — from stub to real bridge |
| **Replace** | `agent-teaming` (port 4853) — from scaffold to real teaming |
| **Replace** | `agent-orchestration` (port 4851) — from scaffold to real orchestration |
| **Replace** | `agent-contracts` (port 4830) — from scaffold to real contracts |
| **Replace** | `agent-marketplace` (port 4845) — from scaffold to real marketplace |
| **Replace** | `agent-learning` (port 4846) — from scaffold to real learning |
| **Replace** | `agent-analytics` (port 4848) — from scaffold to real analytics |
| **Replace** | `merchant-agents` (port 4737) — from scaffold to real merchant |
| **Replace** | `agent-twin` (port 4720) — from scaffold to real twin |
| **Add** | JWT auth (CorpID-signed) on all ACP messages |
| **Add** | Cross-org routing via Hub |
| **Add** | Capability exchange |
| **Add** | 50+ tests |

**Effort in HOJAI-AI:** 3 weeks (replace 14 services)

### Profile 2: Nexha

| Change | Detail |
|---|---|
| **Update** | nexha-gateway — proxy to new ACP service names |
| **Update** | 5 moved services — handle ACP messages from other orgs |

**Effort in Nexha:** 3 days

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Update** | Hub `SUTAR_SERVICES` map — add new ACP service URLs |
| **Update** | `docs/sutar-os/ARCHITECTURE.md` — document ACP protocol |
| **Add** | `docs/sutar-os/ACP-PROTOCOL.md` — full spec |
| **Update** | `docs/sutar-os/HUB-CAPABILITY-MAP.md` — new capabilities |

**Effort in RTMN root:** 1 week (docs + Hub)

### Profile 4: do-app

| Change | Detail |
|---|---|
| **Update** | Mobile agents to use new ACP service endpoints |
| **Test** | Cross-company messaging end-to-end |

**Effort in do-app:** 1 week

### Profile 5: REZ-Workspace

| Change | Detail |
|---|---|
| **Add** | `acpClient.js` — wrapper for ACP protocol |
| **Update** | `sutarOS.js` — use ACP client |

**Effort in REZ-Workspace:** 1 week (new client)

### Phase 4 Total: 3 weeks, 3 engineers

---

## Phase 5: Agent Marketplace (4 weeks)

**Owner:** Nexha team (with HOJAI support)
**Goal:** Companies can discover and rent AI agents

### Profile 1: HOJAI-AI

| Change | Detail |
|---|---|
| **Add** | SUTAR API: `publishAgent(listing)` — make an agent rentable |
| **Add** | SUTAR API: `rentAgent(agentId, duration)` — rent an agent |
| **Add** | SUTAR API: `reviewAgent(agentId, rating, review)` |
| **Add** | Tests |

**Effort in HOJAI-AI:** 1 week (SUTAR API additions)

### Profile 2: Nexha (BIG work here)

| Change | Detail |
|---|---|
| **Add** | `nexha-agent-marketplace/` (port 4361) — full service |
| **Add** | Listing flow |
| **Add** | Rental flow |
| **Add** | Review system |
| **Add** | Payment integration (via Trade Finance Network) |
| **Add** | 50+ tests |

**Effort in Nexha:** 3 weeks (big work)

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Update** | Hub `NEXHA_SERVICES` map — add nexha-agent-marketplace |
| **Add** | `docs/nexha/AGENT-MARKETPLACE.md` — full docs |
| **Update** | `CLAUDE.md` — add to Nexha inventory |

**Effort in RTMN root:** 3 days

### Profile 4: do-app

| Change | Detail |
|---|---|
| **Add** | Mobile UI: "Browse agents to rent" |
| **Add** | Mobile UI: "My rented agents" |
| **Add** | Backend client for nexha-agent-marketplace |

**Effort in do-app:** 1.5 weeks (new feature)

### Profile 5: REZ-Workspace

| Change | Detail |
|---|---|
| **Add** | `agentMarketplace.js` client |

**Effort in REZ-Workspace:** 1 day

### Phase 5 Total: 4 weeks, 3 engineers

---

## Phase 6: Mission Planner (4 weeks)

**Owner:** Nexha team
**Goal:** Multi-company mission coordination

### Profile 1: HOJAI-AI

| Change | Detail |
|---|---|
| **Add** | SUTAR API: `acceptMissionSubtask(subtaskId)` — accept work |
| **Add** | SUTAR API: `reportSubtaskProgress(subtaskId, progress)` |
| **Add** | Tests |

**Effort in HOJAI-AI:** 1 week (SUTAR API additions)

### Profile 2: Nexha (BIG work here)

| Change | Detail |
|---|---|
| **Add** | `nexha-mission-planner/` (port 4362) — full service |
| **Add** | Mission templates ("Open Restaurant", "Build Apartment") |
| **Add** | Subtask assignment algorithm |
| **Add** | Progress tracking |
| **Add** | 50+ tests |

**Effort in Nexha:** 3 weeks

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Update** | Hub `NEXHA_SERVICES` map |
| **Add** | `docs/nexha/MISSION-PLANNER.md` |
| **Update** | `CLAUDE.md` |

**Effort in RTMN root:** 3 days

### Profile 4: do-app

| Change | Detail |
|---|---|
| **Add** | Mobile UI: "My missions" |
| **Add** | Mobile UI: "Mission progress" |

**Effort in do-app:** 1.5 weeks

### Profile 5: REZ-Workspace

| Change | Detail |
|---|---|
| **Add** | `missionPlanner.js` client |

**Effort in REZ-Workspace:** 1 day

### Phase 6 Total: 4 weeks, 3 engineers

---

## Phase 7: Partner Graph (4 weeks)

**Owner:** Nexha team
**Goal:** B2B relationship graph

### Profile 1: HOJAI-AI

No changes (graph is purely a Nexha concern).

### Profile 2: Nexha (BIG work here)

| Change | Detail |
|---|---|
| **Add** | `nexha-partner-graph/` (port 4363) — full service |
| **Add** | Graph database (Neo4j or Memgraph) |
| **Add** | Node types: Company, Agent, Product, Service |
| **Add** | Edge types: buys-from, supplies-to, manufactures-for, ships-for, finances |
| **Add** | Graph ingestion (auto-populate from Event Bus) |
| **Add** | Query API |
| **Add** | 50+ tests |

**Effort in Nexha:** 3.5 weeks

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Update** | Hub `NEXHA_SERVICES` map |
| **Add** | `docs/nexha/PARTNER-GRAPH.md` |
| **Add** | Graph database to `docker-compose.dev.yml` |

**Effort in RTMN root:** 1 week (incl. docker-compose for Neo4j)

### Profile 4: do-app

| Change | Detail |
|---|---|
| **Add** | Mobile UI: "Partnership recommendations" |
| **Add** | Backend client |

**Effort in do-app:** 1 week

### Profile 5: REZ-Workspace

| Change | Detail |
|---|---|
| **Add** | `partnerGraph.js` client |

**Effort in REZ-Workspace:** 1 day

### Phase 7 Total: 4 weeks, 2 engineers

---

## Phase 8: Commerce Runtime (4 weeks)

**Owner:** Nexha team
**Goal:** Orchestrate full commerce cycle

### Profile 1: HOJAI-AI

| Change | Detail |
|---|---|
| **Update** | SUTAR services to support commerce-runtime state callbacks |
| **Add** | Tests |

**Effort in HOJAI-AI:** 1 week

### Profile 2: Nexha (BIG work here)

| Change | Detail |
|---|---|
| **Add** | `nexha-commerce-runtime/` (port 4365) — full service |
| **Add** | State machine: Negotiation → Contract → Shipment → Payment → Settlement |
| **Add** | Auto-rollback on failure (compensating transactions) |
| **Add** | 50+ tests |

**Effort in Nexha:** 3 weeks

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Update** | Hub `NEXHA_SERVICES` map |
| **Add** | `docs/nexha/COMMERCE-RUNTIME.md` |

**Effort in RTMN root:** 3 days

### Profile 4: do-app

| Change | Detail |
|---|---|
| **Add** | Mobile UI: "Transaction lifecycle" |
| **Add** | Real-time status updates |

**Effort in do-app:** 1.5 weeks

### Profile 5: REZ-Workspace

| Change | Detail |
|---|---|
| **Add** | `commerceRuntime.js` client |

**Effort in REZ-Workspace:** 1 day

### Phase 8 Total: 4 weeks, 3 engineers

---

## Phase 9: Per-Tenant SUTAR Instances (4 weeks) — PREMIUM TIER

**Owner:** HOJAI team
**Goal:** Allow enterprise customers to deploy private SUTAR

### Profile 1: HOJAI-AI (BIG work here)

| Change | Detail |
|---|---|
| **Add** | `scripts/fork-tenant.ts` — extract one tenant to a new repo |
| **Add** | `deploy/helm/sutar-private/` — Kubernetes Helm chart for private deployment |
| **Add** | `deploy/docker-compose/sutar-private.yml` — Docker Compose alternative |
| **Add** | Tenant onboarding flow (provision new instance, migrate data) |
| **Add** | `docs/PRIVATE-DEPLOYMENT.md` — full guide |
| **Add** | Compliance docs (SOC 2, GDPR, HIPAA) |
| **Add** | 20+ tests |

**Effort in HOJAI-AI:** 4 weeks

### Profile 2: Nexha

| Change | Detail |
|---|---|
| **Update** | Nexha-gateway to handle multi-SUTAR routing (when private SUTARs exist) |
| **Add** | Tests for cross-private-SUTAR messaging |

**Effort in Nexha:** 1 week

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Add** | `docs/PRIVATE-SUTAR-DEPLOYMENT.md` — enterprise customer guide |
| **Add** | Pricing tier docs (multi-tenant vs private) |
| **Add** | Sales enablement materials |

**Effort in RTMN root:** 1 week

### Profile 4: do-app

No changes.

### Profile 5: REZ-Workspace

| Change | Detail |
|---|---|
| **Update** | Client to support per-tenant URLs |

**Effort in REZ-Workspace:** 1 day

### Phase 9 Total: 4 weeks, 2 engineers

---

## Phase 10: Industry OS Split (8 weeks) — OPTIONAL

**Owner:** RTMN team
**Goal:** Split 24 Industry OS between HOJAI (AI) and Nexha (commerce)

### Profile 1: HOJAI-AI

| Change | Detail |
|---|---|
| **Add** | Industry OS AI parts (menu optimizer for Restaurant, demand forecasting for Hotel, etc.) |
| **Move** | AI logic from each Industry OS into HOJAI |

**Effort in HOJAI-AI:** 4 weeks (for first 3 Industry OS)

### Profile 2: Nexha

| Change | Detail |
|---|---|
| **Add** | Industry OS commerce parts (supplier ordering for Restaurant, booking flow for Hotel, etc.) |
| **Move** | Commerce logic from each Industry OS into Nexha |

**Effort in Nexha:** 4 weeks (for first 3 Industry OS)

### Profile 3: RTMN root

| Change | Detail |
|---|---|
| **Update** | `industry-os/` structure — split between HOJAI and Nexha |
| **Add** | `docs/INDUSTRY-OS-SPLIT.md` — pattern for splitting |

**Effort in RTMN root:** 1 week (pattern doc)

### Profile 4: do-app

| Change | Detail |
|---|---|
| **Update** | Mobile apps to call new AI services from HOJAI, commerce services from Nexha |

**Effort in do-app:** 2 weeks

### Profile 5: REZ-Workspace

| Change | Detail |
|---|---|
| **Update** | Clients to support split architecture |

**Effort in REZ-Workspace:** 1 week

### Phase 10 Total: 8 weeks, 3 engineers (only for first 3 Industry OS; 6+ months for the rest)

---

## Grand Total Across All Profiles

| Phase | HOJAI | Nexha | RTMN | do-app | REZ-WS | Total weeks | Engineers |
|---|---|---|---|---|---|---|---|
| 0 | 1w | 1.5w | 1w | 2d | 1d | **3w** | 2-3 |
| 1 | 4w | 0 | 2d | 1d | 0.5d | **4w** | 2 |
| 2 | 1w | 1w | 3d | 2d | 0 | **2w** | 2 |
| 3 | 3d | 2.5w | 3d | 1w | 1d | **3w** | 2-3 |
| 4 | 3w | 3d | 1w | 1w | 1w | **3w** | 3 |
| 5 | 1w | 3w | 3d | 1.5w | 1d | **4w** | 3 |
| 6 | 1w | 3w | 3d | 1.5w | 1d | **4w** | 3 |
| 7 | 0 | 3.5w | 1w | 1w | 1d | **4w** | 2 |
| 8 | 1w | 3w | 3d | 1.5w | 1d | **4w** | 3 |
| 9 | 4w | 1w | 1w | 0 | 1d | **4w** | 2 |
| 10 | 4w | 4w | 1w | 2w | 1w | **8w** | 3 |
| **TOTAL** | **~17w** | **~22w** | **~6w** | **~10w** | **~4w** | **43w** | **2-3 avg** |

### Critical path: 43 weeks (6-9 months) at 2-3 engineers

| Profile | Total effort | Who |
|---|---|---|
| **HOJAI-AI** | 17 weeks | HOJAI team (1-2 engineers) |
| **Nexha** | 22 weeks | Nexha team (1-2 engineers) |
| **RTMN root** | 6 weeks | RTMN team (1 engineer) |
| **do-app** | 10 weeks | do-app team (1 engineer) |
| **REZ-Workspace** | 4 weeks | REZ team (0.5 engineer) |

---

## Per-Profile Summary

### 🧠 HOJAI-AI (17 weeks of work)

- **Phase 0:** Drop 5 services (move to Nexha)
- **Phase 1:** Multi-tenancy (BIG work — 4 weeks)
- **Phase 2:** Add Event Bus client + emit events
- **Phase 3:** Expose SADA trust scores via API
- **Phase 4:** Replace 14 ACP stub services with real implementations (BIG work — 3 weeks)
- **Phase 5:** Add SUTAR API for Agent Marketplace
- **Phase 6:** Add SUTAR API for Mission Planner
- **Phase 7:** (no work)
- **Phase 8:** Support commerce-runtime state callbacks
- **Phase 9:** Tenant fork + private deployment (BIG work — 4 weeks)
- **Phase 10:** Move AI parts of 3 Industry OS

### 🌐 Nexha (22 weeks of work)

- **Phase 0:** Receive 5 services + delete 3 L1 stubs (BIG work — 1.5 weeks)
- **Phase 1:** (no work)
- **Phase 2:** Add Event Bus subscriber + emit events
- **Phase 3:** Build Business Directory (BIG work — 2.5 weeks)
- **Phase 4:** Update gateway for new ACP
- **Phase 5:** Build Agent Marketplace (BIG work — 3 weeks)
- **Phase 6:** Build Mission Planner (BIG work — 3 weeks)
- **Phase 7:** Build Partner Graph (BIG work — 3.5 weeks)
- **Phase 8:** Build Commerce Runtime (BIG work — 3 weeks)
- **Phase 9:** Multi-SUTAR routing
- **Phase 10:** Move commerce parts of 3 Industry OS

### 🌐 RTMN root (6 weeks of work)

- **Phase 0:** Update Hub + all docs (BIG work — 1 week)
- **Phase 1:** Update docs for multi-tenancy
- **Phase 2:** Add Redis + event replay tool
- **Phase 3:** Add nexha-business-directory to Hub
- **Phase 4:** Add new ACP services to Hub
- **Phase 5:** Add nexha-agent-marketplace to Hub
- **Phase 6:** Add nexha-mission-planner to Hub
- **Phase 7:** Add Neo4j to docker-compose + nexha-partner-graph
- **Phase 8:** Add nexha-commerce-runtime
- **Phase 9:** Add private deployment docs
- **Phase 10:** Industry OS split pattern

### 📱 do-app (10 weeks of work)

- **Phase 0:** Update nexha client to new service names
- **Phase 1:** Add X-Company-Id header
- **Phase 2:** Mobile push notifications on events
- **Phase 3:** Mobile UI for Business Directory search
- **Phase 4:** Update mobile agents to new ACP
- **Phase 5:** Mobile UI for Agent Marketplace
- **Phase 6:** Mobile UI for Mission progress
- **Phase 7:** Mobile UI for Partnership recommendations
- **Phase 8:** Mobile UI for transaction lifecycle
- **Phase 9:** (no work)
- **Phase 10:** Update mobile to call split architecture

### 🔧 REZ-Workspace (4 weeks of work)

- **Phase 0:** Update sutarOS.js references
- **Phase 1:** Pass tenant context
- **Phase 2:** (no work)
- **Phase 3:** Add nexha-business-directory client
- **Phase 4:** Add acpClient.js
- **Phase 5:** Add agentMarketplace.js client
- **Phase 6:** Add missionPlanner.js client
- **Phase 7:** Add partnerGraph.js client
- **Phase 8:** Add commerceRuntime.js client
- **Phase 9:** Support per-tenant URLs
- **Phase 10:** Support split architecture

---

## Parallelization Strategy

| When | Profile A | Profile B | Profile C | Profile D | Profile E |
|---|---|---|---|---|---|
| **Weeks 1-3 (Phase 0)** | HOJAI: extract 5 services | Nexha: import 5 services, delete 3 stubs | RTMN: update Hub + docs | do-app: update client | REZ: update refs |
| **Weeks 4-7 (Phase 1)** | HOJAI: multi-tenancy | (idle) | RTMN: docs | do-app: header | REZ: tenant ctx |
| **Weeks 8-9 (Phase 2)** | HOJAI: event emitter | Nexha: event subscriber | RTMN: Redis | do-app: push notif | (idle) |
| **Weeks 10-12 (Phase 3)** | HOJAI: SADA API | Nexha: business dir | RTMN: Hub | do-app: search UI | REZ: client |
| **Weeks 13-15 (Phase 4)** | HOJAI: real ACP (14 services) | Nexha: gateway update | RTMN: docs + Hub | do-app: agents | REZ: acpClient |
| **Weeks 16-19 (Phase 5)** | HOJAI: SUTAR API | Nexha: marketplace | RTMN: Hub | do-app: UI | REZ: client |
| **Weeks 20-23 (Phase 6)** | HOJAI: SUTAR API | Nexha: mission planner | RTMN: Hub | do-app: UI | REZ: client |
| **Weeks 24-27 (Phase 7)** | (idle) | Nexha: partner graph | RTMN: docker | do-app: UI | REZ: client |
| **Weeks 28-31 (Phase 8)** | HOJAI: state callbacks | Nexha: commerce runtime | RTMN: Hub | do-app: UI | REZ: client |
| **Weeks 32-35 (Phase 9)** | HOJAI: tenant fork (BIG) | Nexha: multi-SUTAR routing | RTMN: docs | (idle) | REZ: per-tenant |
| **Weeks 36-43 (Phase 10)** | HOJAI: Industry AI | Nexha: Industry commerce | RTMN: pattern doc | do-app: split | REZ: split |

**Critical observation:** HOJAI and Nexha work in **parallel** most of the time, but on **different concerns**. This is good — they're separate companies with separate teams.

---

## Verification at End of Each Phase

| Phase | Verification |
|---|---|
| **0** | `bash demos/full-stack-demo.sh` passes with new service names |
| **1** | 2 test tenants don't see each other's data |
| **2** | `bash scripts/event-replay.sh` reconstructs past state |
| **3** | `curl /api/nexha/nexha-business-directory/companies` returns expected list |
| **4** | 2 test orgs exchange QUERY/QUOTE messages via ACP |
| **5** | SUTAR A rents agent from SUTAR B; payment flows through Trade Finance |
| **6** | "Open Restaurant" mission tracks 7+ companies' progress |
| **7** | `curl /api/nexha/nexha-partner-graph/query` returns 3-hop results in <1s |
| **8** | Full commerce cycle (negotiate → contract → ship → pay → settle) succeeds |
| **9** | Tenant forks to private SUTAR in <1 hour |
| **10** | Restaurant OS data flows: AI → HOJAI, commerce → Nexha |

---

*Last updated: 2026-06-22*
*Companion to: ADR-0009*
*Next review: After Phase 0 ships (target: 2026-07-13)*
