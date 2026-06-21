# RTMN → Vision: The 10-Week Roadmap

> **Date:** 2026-06-22
> **Audience:** Engineering, product, leadership
> **Purpose:** Map the gap between [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md) (what runs today) and the full vision (autonomous commerce), into 5 concrete phases with deliverables, files, tests, and risks.

---

## TL;DR

| Phase | Duration | Goal | Output |
|---|---|---|---|
| **A — Foundation** | 1 week (✅ done) | Production-grade consumer stack | do-app + Hub + 4 foundation services + voice input + SADA wire-up |
| **B — SUTAR Real** | 2 weeks | Agent economy actually negotiates | 5 real SUTAR services (Decision, Negotiation, Economy, Trust, Contracts) |
| **C — Nexha Network** | 4 weeks | The "autonomous business network" exists | 5 missing Nexha services (Supplier Registry, Warehouses, Logistics, Banking, Orchestrator) |
| **D — End-to-End** | 2 weeks | do-app autopilot buys groceries | do-app uses SUTAR + Nexha autonomously for a real task |
| **E — Production Polish** | 1 week | Shippable to a real user | Docs, deployment, demo |

**Total: 10 weeks** from today to a demo where "Genie buys groceries for you" works end-to-end without manual steps.

---

## Phase A — Foundation ✅ (DONE, 2026-06-15 → 2026-06-22)

**Goal:** The consumer-facing stack (do-app + Hub + 4 foundation services) is production-grade and well-documented. SADA trust is wired in. Voice input works on-device.

### Deliverables (all shipped)

- ✅ do-app v1.5.0 — Twins, Health, Finance tabs wired to real HOJAI Genie twins
- ✅ HOJAI Hub at port 4399 (REZ-ecosystem-connector v1.1.0) — 22 endpoints, 231 services
- ✅ SADA wired into hojaiClient (`sada.getTrustScore`, `createTrustRecord`, `recordActivity`, `getHistory`, `leaderboard`)
- ✅ Memory Confidence + Memory Context Engine wired
- ✅ Voice input on-device (expo-speech-recognition, stub fallback for tests)
- ✅ Tests: 137 backend tests + 45 mobile tests, all pass
- ✅ [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md) — honest inventory
- ✅ [ARCHITECTURE-AS-BUILT.md](ARCHITECTURE-AS-BUILT.md) — visual architecture
- ✅ This document (ROADMAP-TO-VISION.md)

### Files touched

```
companies/do-app/backend/src/services/hojaiClient.ts        (SADA + memconf + memctx)
companies/do-app/backend/src/config.ts                      (new env vars)
companies/do-app/backend/src/routes/merchants.ts            (trust-score enrichment)
companies/do-app/backend/__tests__/unit/hojaiClient.sada.test.ts  (NEW, 11 tests)
companies/do-app/backend/__tests__/helpers/testApp.ts        (new env defaults)
companies/do-app/mobile/src/hooks/useVoiceInput.ts          (NEW, pluggable provider)
companies/do-app/mobile/app/(tabs)/index.tsx                (mic button)
companies/do-app/mobile/app.json                            (mic permissions)
companies/do-app/mobile/package.json                        (expo-speech-recognition)
companies/do-app/mobile/__tests__/unit/useVoiceInput.test.ts (NEW, 6 tests)
STATUS-AND-REMAINING-WORK.md                                (rewritten)
ARCHITECTURE-AS-BUILT.md                                    (NEW)
ROADMAP-TO-VISION.md                                        (NEW, this file)
```

### Branch

`feat/v1.5-foundation` (to be pushed at end of A6)

---

## Phase B — SUTAR Real (2 weeks: 2026-06-23 → 2026-07-06)

**Goal:** The 5 SUTAR OS services that matter actually do something useful. Not full production — but real enough that an engineer can call them and get meaningful answers (not canned JSON).

### Target services

| Service | Port | Current | Target |
|---|---:|---|---|
| **sutar-decision-engine** | 4240 | 554 LOC, text-matcher | Real ML scoring of decision options |
| **sutar-negotiation-engine** | 4191 | 404 LOC, fake counter-offers | Real ZOPA (zone of possible agreement) search |
| **sutar-economy-os** | 4251 | 248 LOC, ledger stubs | Real micropayment ledger with double-entry accounting |
| **sutar-trust-engine** | 4180 | 338 LOC, fake scores | Hooks to SADA — already done in Phase A, just wire |
| **sutar-contract-os** | 4185 | 245 LOC, template strings | Real template engine + signature flows |

### Deliverables

1. **sutar-decision-engine v2** — score 3 options across 4 dimensions (cost, time, risk, trust); return ranked list with confidence scores
2. **sutar-negotiation-engine v2** — given a session with opening offer and constraints, return realistic counter-offers (ZOPA math)
3. **sutar-economy-os v2** — persistent ledger (SQLite or LevelDB), double-entry posting, balance queries, transfer atomicity
4. **sutar-trust-engine v2** — proxy to SADA, expose `/trust/v2/:entityId` and `/trust/v2/leaderboard/all`
5. **sutar-contract-os v2** — Markdown template → JSON schema; render to PDF; signature flow with HMAC
6. **Gateway** updated: `/api/sutar/*` proxy routes for all 5 services (already partially done in Phase A)
7. **Tests:** 30+ new unit tests for each service (ZOPA math, ledger atomicity, schema validation)
8. **Docs:** [SUTAR-OS-REAL.md](docs/sutar-os/SUTAR-OS-REAL.md) — "what these services actually do now"

### Files to touch

```
companies/HOJAI-AI/platform/sutar/decision-engine/src/
companies/HOJAI-AI/platform/sutar/negotiation-engine/src/
companies/HOJAI-AI/platform/sutar/economy-os/src/
companies/HOJAI-AI/platform/sutar/trust-engine/src/        (SADA integration)
companies/HOJAI-AI/platform/sutar/contract-os/src/
companies/RABTUL-Technologies/REZ-ecosystem-connector/src/routes/sutar.js  (gateway)
companies/HOJAI-AI/platform/sutar/decision-engine/__tests__/                (NEW)
... 5x test files for 5 services
docs/sutar-os/SUTAR-OS-REAL.md
```

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| Negotiation engine math is hard | Start with simple ZOPA (midpoint of reservation prices); no NLP this round |
| Economy OS ledger could corrupt data | Use SQLite (WAL mode) for atomicity; integration tests for double-entry |
| Contract engine scope creep | Limit to Markdown → JSON + render; no legal NLP |
| 2 weeks is tight for 5 services | Each is small; can ship one service per day and verify |

### Test plan

- Unit tests for each service's core algorithm (decision scoring, ZOPA math, ledger posting, schema validation)
- Integration tests via Hub proxy: `curl localhost:4399/api/sutar/decision-engine/api/decide`
- A "demo" script: `node demos/sutar-negotiate.js` — runs a complete negotiation between two agents

---

## Phase C — Nexha Network (4 weeks: 2026-07-07 → 2026-08-03)

**Goal:** The 5 missing Nexha services that make "autonomous business network" real exist, run, and have at least one demo flow each.

### Target services (all currently 0 LOC)

| Service | Port | What it does |
|---|---:|---|
| **nexha-supplier-registry** | 8100 | Network of suppliers with capability matching (e.g. "find me a supplier in Mumbai with GSTIN who delivers within 24h") |
| **nexha-warehouse-network** | 8101 | Geo-search for warehouse slots, book storage, track inventory |
| **nexha-logistics** | 8102 | Multi-carrier rate shopping (Delhivery, BlueDart, DHL), tracking, RTO handling |
| **nexha-banking** | 8103 | UPI, BNPL, escrow, FX, reconciliation |
| **nexha-orchestrator** (ExecutionOS) | 8104 | Workflow + retry + rollback + saga pattern |

### Week-by-week

**Week 1 (Jul 7-13): Supplier Registry + Warehouse Network**

- nexha-supplier-registry: Express + SQLite, schema `{supplierId, name, gstin, categories[], region, deliveryPromise, rating}`. Routes: `/search`, `/suppliers/:id`, `/register`. Seed 50 demo suppliers.
- nexha-warehouse-network: Express + SQLite, schema `{warehouseId, city, lat, lng, capacity, slotsAvailable}`. Routes: `/nearest`, `/book`, `/:id`. Seed 20 demo warehouses across 5 cities.

**Week 2 (Jul 14-20): Logistics + Banking**

- nexha-logistics: Express + SQLite, schema `{carrier, rate, eta, payload}`. Routes: `/quote`, `/book`, `/track`, `/cancel`. Mock carrier responses with realistic latency curves.
- nexha-banking: Express + SQLite, schema `{accountId, balance, currency}`. Routes: `/escrow/open`, `/escrow/release`, `/transfer`, `/balance`. Real double-entry ledger.

**Week 3 (Jul 21-27): Orchestrator**

- nexha-orchestrator: Workflow engine. Saga pattern: define steps as `{service, action, retryPolicy, rollback}`. Persistent workflow state in SQLite. Routes: `/workflows`, `/workflows/:id/start`, `/workflows/:id/status`, `/workflows/:id/cancel`.

**Week 4 (Jul 28-Aug 3): Integration + Tests**

- Wire all 5 services into Hub proxy (`/api/nexha/*`)
- Cross-service integration test: "find supplier → book warehouse → get logistics quote → open escrow → execute via orchestrator"
- Each service gets 10+ tests
- [NEXHA-NETWORK.md](docs/nexha/NEXHA-NETWORK.md) — architecture, demo flows

### Files to touch

```
companies/Nexha/services/supplier-registry/                 (NEW)
companies/Nexha/services/warehouse-network/                 (NEW)
companies/Nexha/services/logistics/                         (NEW)
companies/Nexha/services/banking/                           (NEW)
companies/Nexha/services/orchestrator/                      (NEW)
companies/RABTUL-Technologies/REZ-ecosystem-connector/src/routes/nexha.js  (NEW)
docs/nexha/NEXHA-NETWORK.md                                  (NEW)
companies/Nexha/services/*/package.json
companies/Nexha/services/*/src/
companies/Nexha/services/*/__tests__/
companies/Nexha/start-all.sh                                 (NEW — start all 5)
```

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| 5 brand-new services is a lot | Each is small (300-600 LOC); build one per day |
| Real logistics/banking integration is out of scope | Use mocks with realistic shapes; doc clearly that they're mocks |
| Orchestrator saga pattern is non-trivial | Use a battle-tested library (e.g. simple state machine) instead of rolling your own |
| 4 weeks might not be enough | Cut Banking to just escrow + balance (no UPI/BNPL/FX) — those are v3 |

### Test plan

- Each service: 10+ unit tests for CRUD + business logic
- Integration test: end-to-end procurement flow via Hub
- Demo script: `node demos/nexha-procurement.js` — autonomous grocery purchase (simulated)

---

## Phase D — End-to-End (2 weeks: 2026-08-04 → 2026-08-17)

**Goal:** do-app's "Genie" actually buys groceries autonomously. The user says "Buy groceries", Genie classifies intent, calls SUTAR decision engine, calls Nexha procurement network, places order, returns confirmation.

### Deliverables

1. **do-app backend** gets a new route `POST /api/autopilot/execute` that:
   - Takes `{intent, params, constraints}` from mobile
   - Calls SUTAR decision engine to pick an approach
   - Calls Nexha supplier registry → warehouse → logistics → banking → orchestrator
   - Returns final `{orderId, status, eta}` or failure with reason
2. **do-app mobile** gets a new "Autopilot" toggle in Genie tab:
   - When ON: every "buy X" message triggers `/api/autopilot/execute`
   - When OFF: works as today (suggest merchant, manual order)
3. **do-app mobile** renders the autopilot result: "Genie ordered 5kg rice from Bharat Grocers, arriving Tuesday. ✅ Tap to view receipt."
4. **Tests:** Integration tests for the full flow with HOJAI services up
5. **Docs:** [DO-APP-AUTOPILOT.md](docs/do-app/AUTOPILOT.md) — how it works, how to test

### Files to touch

```
companies/do-app/backend/src/routes/autopilot.ts            (NEW)
companies/do-app/backend/src/services/autopilotClient.ts    (NEW — wraps SUTAR + Nexha)
companies/do-app/backend/__tests__/integration/autopilot.test.ts  (NEW)
companies/do-app/mobile/app/(tabs)/index.tsx                (autopilot toggle)
companies/do-app/mobile/app/(tabs)/autopilot.tsx            (NEW — autopilot results view)
companies/do-app/mobile/src/hooks/useAutopilot.ts           (NEW)
companies/do-app/mobile/__tests__/unit/useAutopilot.test.ts (NEW)
docs/do-app/AUTOPILOT.md
```

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| The flow might fail at any step | Autopilot must have proper error handling at each step with rollback (orchestrator handles saga) |
| User trust in autopilot | Default to OFF; explicit opt-in; show every step's result; reversible |
| Latency of multi-service call chain | Async pattern: kick off, return task ID, mobile polls; or push notification when done |
| Real money involved (Nexha Banking) | Sandbox mode by default; production mode is opt-in and requires CorpID auth |

### Test plan

- E2E test: mobile → backend → SUTAR → Nexha → response → mobile renders
- Failure test: warehouse full → orchestrator rolls back → user sees clear error
- Latency test: p99 < 5s for full autopilot flow

---

## Phase E — Production Polish (1 week: 2026-08-18 → 2026-08-24)

**Goal:** Everything a real user (or investor, or first customer) needs to run the system is in place.

### Deliverables

1. **Docker Compose** — `docker-compose.yml` at repo root starts Hub + 4 foundation + SADA + 5 SUTAR + 5 Nexha + do-app backend with one command
2. **Demo script** — `demos/full-demo.sh` runs end-to-end: start stack, log in via mobile, send "buy groceries" via voice, watch autopilot place order
3. **Updated CLAUDE.md** — reflect post-Phase E state (services running, end-to-end flows)
4. **Updated STATUS-AND-REMAINING-WORK.md** — replace with success metrics
5. **API Reference** — generate from OpenAPI specs in each service, aggregate into one doc
6. **Architecture decision records (ADRs)** — for the 5 biggest decisions made across phases
7. **Deployment guide** — Render, Railway, or Vercel for each service
8. **README at root** — one-page "What is RTMN / How to run it / Where to start"

### Files to touch

```
docker-compose.yml                                          (NEW)
.env.example                                                (NEW — all env vars)
demos/full-demo.sh                                          (NEW)
CLAUDE.md                                                   (rewrite status banner)
STATUS-AND-REMAINING-WORK.md                                (rewrite to post-Phase E state)
docs/API-REFERENCE.md                                       (NEW)
docs/ADR/0001-sutar-vs-acn.md                               (NEW, and 4 more)
docs/DEPLOYMENT.md                                          (NEW or rewrite)
README.md                                                   (rewrite for one-page)
```

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| Docker Compose gets complex | Use a single file, keep env vars in `.env` |
| Demo script is fragile | Make it idempotent — safe to run twice |
| Docs drift | Use `npm run docs:check` (or just a doc review checklist) |

---

## Cross-phase concerns

### Testing strategy

- Every service has unit tests at the boundary of its public API
- Every integration has at least one end-to-end test via Hub
- Test isolation: HOJAI services start with in-memory SQLite where possible
- CI: GitHub Actions runs all tests on PR
- Coverage target: 70%+ on backend, 60%+ on mobile

### Security

- All services use JWT (CorpID-issued) for auth
- Rate limiting: 100/min default, 20/min strict
- Input validation at every route boundary
- Audit log for all write operations
- Secrets in `.env` only, never committed
- CORS allowlist per environment

### Observability

- Structured JSON logs everywhere (`pino` or `bunyan`)
- `/health` on every service
- Hub aggregates service health every 30s
- Error tracking: Sentry (when deployed)
- Metrics: Prometheus exporter on each service (basic: req rate, p50/p99 latency, error rate)

### Performance budgets

- Mobile → backend p99 < 200ms (excluding LLM)
- Backend → HOJAI p99 < 500ms
- Full autopilot flow p99 < 10s (with async polling)
- Cold-start < 30s for full stack

---

## What this roadmap does NOT include

To stay focused, these are explicitly out of scope for the 10 weeks:

- Real bank/payment provider integration (Razorpay, Stripe)
- Real logistics carrier API integration (Delhivery, BlueDart)
- Customs, FX, cross-border trade
- Multi-language UI (Hindi, Arabic, etc.)
- Production-grade voice (TTS streaming, multi-speaker)
- On-prem / self-hosted deployment
- SSO, SAML, advanced RBAC
- HIPAA/PCI compliance certifications

These are v3+ concerns. We will surface them in [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md) but not block on them.

---

## Success metrics

By end of Phase E (2026-08-24):

| Metric | Target |
|---|---|
| Services running locally with `docker-compose up` | 20+ (was 12) |
| SUTAR services with real (not mock) logic | 5 of 5 |
| Nexha services running | 5 of 5 |
| do-app mobile tabs using real HOJAI data | 12 of 12 |
| End-to-end tests passing | 1 ("buy groceries" autopilot) |
| Backend tests | 200+ (was 137) |
| Mobile tests | 80+ (was 45) |
| Voice input: device → text in mobile | ✅ |
| Voice input: STT server-side (Whisper) | ❌ (v3) |

---

## Risks to the whole roadmap

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Schedule slips | High | Medium | Phase A is done; B-E are sequential, can be descoped per phase |
| SUTAR/Nexha feel like "just mocks" | Medium | High | Don't ship Phase B or C unless at least 3 services each pass a real-flow integration test |
| Hub can't handle 20+ services | Low | Medium | Hub is lightweight proxy; if it struggles, split per-ecosystem |
| Mobile voice UX is clunky | Medium | Medium | Get user feedback after Phase A voice ships; iterate in D |
| Adoption / first customer | Unknown | Critical | Out of scope for this roadmap — separate workstream |

---

## Decision points

These need explicit decisions (engineering or product) before kicking off each phase:

- **Phase B kickoff:** Is SQLite + simple state machines acceptable for SUTAR economy OS, or do we need Postgres?
- **Phase B kickoff:** Is ZOPA math without LLM acceptable, or do we need LLM-driven negotiation in v1?
- **Phase C kickoff:** Is mock logistics (realistic latency, fake carriers) acceptable, or do we need at least one real carrier integration?
- **Phase C kickoff:** Is mock banking (escrow only, no UPI/BNPL) acceptable for demo, or do we need real Razorpay sandbox?
- **Phase D kickoff:** Default autopilot OFF (opt-in) — confirm? Or default ON for early customers?
- **Phase E kickoff:** Docker Compose vs Kubernetes for local dev — Docker Compose confirmed; revisit?

---

## How to use this document

- **Engineers:** Pick a phase, read the deliverables, start coding. The "Files to touch" lists are exhaustive.
- **Product managers:** The "Deliverables" lists are the user-facing value. The "What this roadmap does NOT include" is the v3+ backlog.
- **Leadership:** The "Success metrics" are what we're aiming for. The "Risks to the whole roadmap" are what we should be watching.
- **Anyone:** The "TL;DR" table is the one-page summary.

---

*Last updated: 2026-06-22*
*Owner: RTMN architecture team*
*Supersedes: ad-hoc planning in `.claude/plans/`*
