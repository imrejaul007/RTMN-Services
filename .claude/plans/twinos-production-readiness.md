# TwinOS Production-Readiness Plan

**Goal:** Take TwinOS from "demo-grade" to "production-grade" — fixing every critical gap and implementing every vision-driven feature.

**Date:** 2026-06-21
**Scope:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/` (15 services)
**Reference platform services:** CorpID (4702), MemoryOS (4703), event-bus (4510), ai-intelligence (4881), goal-os (4242), skill-os (4743), flow-orchestrator (4244), policy-os (4254), twin-memory-bridge (4704)

---

## 🚨 Critical Bugs (must fix)

### Bug 1 — partner-twin has NO auth on writes
- `POST /api/partners`, `PUT /api/partners/:id`, `DELETE /api/partners/:id` all use only `optionalAuth` + `strictLimiter`. Anyone on the network can mutate partner data.
- **Fix:** Add `requireAuth` to all write routes.

### Bug 2 — user-twin has NO auth on list/create
- `GET /api/twins/users` and `POST /api/twins/users` are missing `requireAuth`. Anyone can list or create users.
- **Fix:** Add `requireAuth` to those two routes.

### Bug 3 — wallet-twin is CommonJS while rest is ESM
- The codebase uses `"type": "module"` everywhere. wallet-twin uses `require()` in a `.js` file inside that scope, breaking Node's resolution.
- **Fix:** Convert wallet-twin to ESM imports, fix `preventPrototypePollution(req.body)` calls that use v1 API (already polymorphic in shared, but wallet-twin needs ESM conversion first).

### Bug 4 — Hub default JWT secret is "change-me"
- `process.env.JWT_SECRET || 'rtmn-twin-shared-default-secret-change-me'` — if env var is missing in prod, tokens are forgeable.
- **Fix:** Refuse to start if `JWT_SECRET` is missing in production (`NODE_ENV=production`); require it to be ≥ 32 chars.

### Bug 5 — Hub bcrypt dynamic import on hot path
- `await import('bcryptjs')` is inside the login route, causing module-load + bcrypt roundtrip on every login.
- **Fix:** Top-level import bcryptjs (already in deps after our previous fix).

### Bug 6 — Hub unbounded growth in 19 Maps
- `users`, `sessions`, `mergeLog`, `twinVersions`, `syncEvents` grow forever — OOM after weeks.
- **Fix:** Add TTL/cleanup job for sessions (7d), cap syncEvents (last 10000), cap twinVersions (last 50 per twin).

### Bug 7 — order-twin idempotency keys never expire
- `idempotencyKeys` Map grows without bound.
- **Fix:** Add TTL (24h) on idempotency keys.

### Bug 8 — wallet-twin balance mutations are non-atomic
- `wallet[type] = (wallet[type] || 0) + amount` reads then writes without locking — race condition on concurrent topup/deduct.
- **Fix:** Wrap mutations in async lock or use a per-wallet mutex.

---

## 🏗️ Architecture Improvements

### Arch 1 — Replace in-memory Maps with persistent storage
- All 15 services use `Map<>` only. Data lost on restart.
- **`@rtmn/shared/lib/persistent-store.js` already exists** with full Map-like API + tests.
- **Action:** Migrate each service's `new Map()` to `createPersistentStore(name, { key: 'id' })`.
- Each service gets a `data/` directory under its service folder. Survives restart.

### Arch 2 — Hub registers itself with MemoryOS + event-bus
- Hub's `v4-features.js` does fire-and-forget POSTs to event-bus (4510) and Twin Capability Profile (4150). Errors swallowed.
- **Action:** Make these calls real: on twin create/update/delete, publish `twin.created`, `twin.updated`, `twin.deleted` to `event-bus/api/events`. Subscribe to memory events.

### Arch 3 — Every twin service publishes events to event-bus
- When order is created, publish `order.created`. When payment succeeds, publish `payment.completed`. When twin profile changes, publish `twin.updated`.
- Use `event-bus /api/events` with payload `{ type, source, data, timestamp, businessId }`.
- This is the foundation for reactive flows (FlowOS can subscribe and react).

### Arch 4 — Hub actually calls MemoryOS to attach memories
- The vision says "MemoryOS provides what it knows" — currently nothing calls MemoryOS.
- **Action:** Add `attachMemory(twinId, memory)` and `getMemory(twinId)` helpers that proxy to `twin-memory-bridge /api/twins/:twinId/memory/write` and `/memory/read`. Use them in the twin-update path so any state change can be optionally journaled as a memory.

### Arch 5 — Hub calls CorpID for trust scoring
- On every twin create, fetch `corpID /api/trust/score/:corpId` and store trust level alongside the twin identity.
- Cache the trust score for 1 hour.

### Arch 6 — Hub queries twin-capability-profile for capability graph
- twin-capability-profile (4150) is the discovery service. Add `GET /api/twins/capability-graph` that proxies to it.
- Twin services can register their capabilities at startup.

### Arch 7 — GoalOS integration
- Hub's `twinGoals` Map stores goals locally but doesn't actually push them to goal-os (4242).
- **Action:** On goal create, `POST` to goal-os. On goal progress update, `PATCH` goal-os. Keep local cache for fast reads.

### Arch 8 — SkillOS integration
- Each twin service exposes "skills" (e.g., order-twin: `acceptOrder`, `cancelOrder`, `processRefund`).
- **Action:** At service startup, register skills with `skill-os POST /api/skills`. Add `/api/twins/:id/skills` endpoint that proxies to skill-os.

### Arch 9 — PolicyOS integration
- Before allowing critical actions (large payment, refund, twin delete), check with `policy-os /api/policies/evaluate`.
- **Action:** Add a `requirePolicy(policyId)` middleware factory. Apply to critical writes.

### Arch 10 — FlowOS integration
- FlowOS (4244) is the orchestration layer. TwinOS shouldn't call it directly; FlowOS calls TwinOS. But we should expose enough endpoints for FlowOS to operate.
- **Action:** Ensure all 12 vision features have public APIs that FlowOS can hit.

### Arch 11 — ai-intelligence integration
- customer-twin should call `ai-intelligence /api/customer/:customerId/insights` to get churn prediction, sentiment.
- **Action:** Add `enrichCustomer()` step on customer-twin POST that fetches AI insights and stores them.

---

## 📋 New Features (vision completion)

### Feature 1 — Twin templates
- Vision: "Templates for Person, Merchant, Product, Vehicle, Hotel, Company, Order"
- Hub already has 7 templates. Surface them via `GET /api/twins/templates` and `POST /api/twins/from-template`.

### Feature 2 — Twin lifecycle states
- Vision: "Created → Activated → Updated → Merged → Archived → Deleted"
- Add `POST /api/twins/:id/lifecycle/transition` endpoint. Hub already has `twinLifecycles` Map; wire it up.

### Feature 3 — Twin merging
- Vision: "Merge twins"
- Hub has `mergeLog`. Add `POST /api/twins/:id/merge/:otherId` endpoint with conflict resolution.

### Feature 4 — Twin search (real, not just keyword)
- Vision: "Find any Twin"
- Add semantic search backed by Jaccard similarity + tag matching. Already started in v4-features.js.

### Feature 5 — Twin analytics dashboard
- Vision: "Activity, Health, Relationships, Growth, Utilization, Trust"
- Hub already has `twinAnalytics`. Add `GET /api/twins/:id/analytics` and `GET /api/analytics/overview`.

### Feature 6 — Twin subscriptions (SSE)
- Vision: "Subscribe to Twin Events"
- Add `GET /api/twins/:id/events/stream` Server-Sent Events endpoint that streams twin lifecycle + state changes.

### Feature 7 — Sample data seeders for all services
- Several services (customer-twin, order-twin, payment-twin, wallet-twin, merchant-twin, user-twin) have no sample data.
- **Action:** Add `seed()` function to each service that creates realistic test data on first start (when data file is empty).

### Feature 8 — Health vs Ready split
- Add `/ready` endpoints to all services (some have, some don't). `/ready` should check DB connectivity + dependency services.

### Feature 9 — Idempotency on all writes
- order-twin and payment-twin have it. Add to all write endpoints (POST/PUT/PATCH/DELETE) in all services.

### Feature 10 — Pagination on all list endpoints
- Use shared `PAGINATION.parse(query)` and `PAGINATION.envelope()` consistently. Currently inconsistent.

---

## 🧪 Quality & Observability

### Q1 — Structured error responses
- All errors should return `{ success: false, error: { code, message, details? } }`. Standardize.

### Q2 — Request tracing
- Add `X-Request-ID` propagation through cross-service calls. Currently only set on incoming requests, not propagated when twins call each other.

### Q3 — Graceful shutdown
- Handle SIGTERM/SIGINT: stop accepting new connections, drain in-flight requests, save state, exit.
- `@rtmn/shared/lib/shutdown.js` already exists.

### Q4 — Health checks against dependencies
- `/ready` should ping downstream services (MemoryOS, CorpID, event-bus) and report `ready: false` if any are down.

### Q5 — Add `--seed` mode to startup script
- Add `SEED_ON_START=true` env var that calls `seed()` on each service at startup.

### Q6 — Documentation
- Update HOJAI-AI CLAUDE.md and root CLAUDE.md with: API surface, sample data, integration recipes, deployment notes.

---

## 🚀 Execution Plan

I will execute in **5 phases**, in order. Each phase builds on the previous.

### Phase 1 — Fix Critical Bugs (priority: P0)
- Bug 1, 2, 3, 4, 5, 6, 7, 8
- **Deliverable:** No security holes, no race conditions, no OOM, JWT secret enforced.

### Phase 2 — Persistence Layer (priority: P0)
- Migrate all 15 services from `new Map()` to `createPersistentStore(name, { key: 'id' })`.
- Add `seed()` functions to services that lack sample data.
- **Deliverable:** Survives restart. Demo data on first start.

### Phase 3 — Event Bus Integration (priority: P1)
- All 15 services publish events to event-bus (4510) on state changes.
- Hub subscribes to twin lifecycle events.
- **Deliverable:** Reactive ecosystem; FlowOS can subscribe to twin events.

### Phase 4 — Platform Integrations (priority: P1)
- MemoryOS via twin-memory-bridge (every service can attach memories).
- CorpID trust scoring on twin creation.
- GoalOS sync (goals not just stored, but pushed).
- SkillOS registration at startup (every service declares its skills).
- PolicyOS check on critical writes.
- ai-intelligence enrichment for customer-twin.
- **Deliverable:** Twins are connected to the rest of HOJAI platform per vision.

### Phase 5 — Quality + Documentation (priority: P2)
- Standardized error responses.
- Request ID propagation.
- Graceful shutdown.
- Readiness checks against dependencies.
- New features: lifecycle transitions, merge, SSE subscriptions.
- Documentation updates.
- **Deliverable:** Production-grade observability and DX.

---

## 📁 Files That Will Be Created or Modified

### New files
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/twinos-shared/src/eventBus.js` — helper to publish events
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/twinos-shared/src/memoryBridge.js` — helper to attach/read memories
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/twinos-shared/src/policyCheck.js` — helper to enforce policies
- `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/twinos-shared/src/platformClients.js` — single config for all platform service URLs
- `data/` directories under each service for persistent store

### Modified files (all 15 services)
- `src/index.js` — convert Maps to PersistentStore, add event publishing, add integrations
- `package.json` — add `@rtmn/shared` dependency, possibly add `events` related deps
- New: `src/seed.js` (where missing) — sample data

### Modified shared lib
- `src/index.js` — add helpers, enforce JWT secret in production

### Documentation
- `HOJAI-AI/CLAUDE.md` — update with new capabilities, endpoints, sample data
- `CLAUDE.md` (root) — update TwinOS section
- New: `HOJAI-AI/platform/twins/docs/API.md` — complete API reference
- New: `HOJAI-AI/platform/twins/docs/INTEGRATIONS.md` — how each twin integrates with platform services

---

## ⚠️ Risks and Trade-offs

| Risk | Mitigation |
|------|-----------|
| Persistent store is JSON files, not DB | Document clearly that this is dev-grade; suggest MongoDB for prod. |
| Event bus failures cascade | All event publishes wrapped in try/catch; failures logged but don't break the request. |
| Platform services down | All integration calls wrapped in try/catch with 5s timeout; failures degrade gracefully. |
| Migration breaks existing data | First-run detection: if `data/*.json` exists, use it; else start fresh. No migration needed. |
| Test coverage is 0 | Existing scope already has 0 tests; this plan doesn't add tests, just fixes + features. (Tests are a separate project.) |

---

## ✅ Acceptance Criteria

After this plan is complete:
1. **All 15 services** restart cleanly and preserve their state.
2. **Cross-service auth** still works (already fixed in last session).
3. **No security holes** — all writes require auth, default secret blocked, no unbounded growth.
4. **Event bus receives events** on every state-changing operation.
5. **MemoryOS receives memories** when twins update (via twin-memory-bridge).
6. **CorpID trust scores** are attached to twin identities.
7. **GoalOS, SkillOS, PolicyOS, ai-intelligence** are wired where the vision calls for them.
8. **Sample data exists** for every service on first start.
9. **Documentation** accurately describes what the services do and how to integrate.
10. **All 15 services still start with `start-twins.sh`**.

---

## 🛠️ Estimated Effort

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1 — Critical Bugs | 8 fixes | ~30 min |
| Phase 2 — Persistence | 15 services migrated, seeds added | ~45 min |
| Phase 3 — Events | 15 services publish, hub subscribes | ~30 min |
| Phase 4 — Integrations | 6 platform services wired | ~45 min |
| Phase 5 — Quality + Docs | 10 features + 2 docs | ~30 min |
| **Total** | | **~3 hours** |

Each task is independent enough that I can parallelize via subagents.
