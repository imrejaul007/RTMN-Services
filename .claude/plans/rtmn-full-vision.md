# RTMN Full Vision — "Make Everything Complete Ready"

> **Date:** 2026-06-22
> **Scope:** Connect the consumer side (do-app), make SUTAR OS real, build Nexha's missing network, add voice input, write honest docs.
> **Outcome target:** End-to-end "Human → Genie → HOJAI Foundation → DO → SUTAR → Nexha → Physical World" works for a real use case (e.g. "buy groceries" with autonomous supplier routing).

---

## Executive Summary

Three audits revealed:

1. **Consumer side (do-app)** is real and tested (126 backend + 39 mobile tests pass) but is text-only and doesn't connect to the agent economy.
2. **SUTAR OS** is **23 scaffolded services** (~12,000 LOC total, 200–900 LOC each) that declare ports but don't all run. The gateway is real.
3. **Nexha** has a real portal (Next.js 16) and `commerce-identity` (2.9k LOC) but **no supplier registry, no warehouse network, no logistics, no banking layer** — the architecture's "autonomous business network" doesn't exist.
4. **Voice** = zero real STT/TTS, but a working `useVoiceInput` hook exists in `companies/REZ-Consumer/hooks/useVoiceInput.ts` (515 lines, never extracted).
5. **Hub at 4399** = `REZ-ecosystem-connector` v1.1.0 (22 endpoints, SUTAR proxy), **code exists but isn't running**.
6. **SADA/TrustOS** = real service (2.5k LOC, port 4190) with proper auth, **not wired into do-app's `hojaiClient.ts`**.

**This plan delivers the full vision in 5 phases over ~10 weeks**, with each phase ending in a deployable, testable, demoable milestone.

---

## Goals (Success Criteria)

| # | Goal | Measurable |
|---|---|---|
| G1 | Consumer voice works | "Hey Genie" → DO App receives voice → orders groceries end-to-end |
| G2 | SUTAR OS is real | `sutar-decision-engine`, `sutar-negotiation-engine`, `sutar-economy-os`, `sutar-trust-engine`, `sutar-contracts` each have working business logic, not stubs |
| G3 | Nexha network exists | 4 new services: `nexha-supplier-registry`, `nexha-warehouse-network`, `nexha-logistics`, `nexha-banking` — each with MongoDB + REST API |
| G4 | Hub runs and proxies | `REZ-ecosystem-connector@4399` started, healthy, all `/api/sutar/*` routes work |
| G5 | SADA wired into do-app | `hojaiClient.sada.*` methods + do-app uses them for trust scoring on merchant selection |
| G6 | Honest docs | `STATUS-AND-REMAINING-WORK.md`, `ARCHITECTURE-AS-BUILT.md`, `ROADMAP-TO-VISION.md`, updated `CLAUDE.md` |
| G7 | End-to-end demo | "Buy groceries" with voice → Genie → DO → SUTAR negotiates → Nexha finds supplier+warehouse+logistics → order placed |

---

## Phased Plan

### Phase A — Foundation (Week 1)
**Goal:** Connect what exists. Add voice. Fix docs.

**A1. Start the Hub** (4 hours)
- `cd /Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/REZ-ecosystem-connector && npm start`
- Verify `/health` returns 200, `/api/services` returns service registry
- Verify `/api/sutar/capabilities` and `/api/sutar/:service/<path>` work
- Add Hub start to `start-ecosystem.sh` (currently uses port 4399 → connector path already set)

**A2. Wire SADA into do-app** (1 day)
- Read `companies/HOJAI-AI/platform/trust/sada-os/src/modules/trustService.ts` to learn the surface
- Add to `do-app/backend/src/services/hojaiClient.ts`:
  ```ts
  export const sada = {
    getTrustScore: (entityId: string) => call<{ score: number; ... }>(CONFIG.HOJAI_SADA_URL, 'GET', `/api/trust/entities/${entityId}`),
    recordInteraction: (data) => call<...>(CONFIG.HOJAI_SADA_URL, 'POST', '/api/trust/interactions', data),
    verify: (entityId, type) => call<...>(CONFIG.HOJAI_SADA_URL, 'POST', '/api/verification', { entityId, type }),
  };
  ```
- Add `HOJAI_SADA_URL` to `config.ts`
- Use in `merchants.ts` route: enrich search results with trust score
- Add unit tests
- `CONFIG` / `.env.example` updates

**A3. Add Memory Confidence + Context Engine to hojaiClient** (1 day)
- Both services exist at `companies/HOJAI-AI/platform/memory/`
- Add `memory.confidence(factId)` and `memory.context(query, { recent, top })` 
- Wire into `do-app/backend/src/routes/memory.ts`

**A4. Voice input to do-app** (1-2 days)
- Add deps: `npx expo install expo-av expo-speech expo-speech-recognition`
- Update `mobile/app.json`: add `NSMicrophoneUsageDescription`, `RECORD_AUDIO`, `expo-speech-recognition` plugin
- Copy `companies/REZ-Consumer/hooks/useVoiceInput.ts` → `mobile/src/hooks/useVoiceInput.ts`
- Strip `@/utils/logger` import (use console)
- Add mic button to `mobile/app/(tabs)/index.tsx` (lines 293-310)
- On result: `setInputText(text)` and trigger existing `handleSend`
- Add unit test for the hook

**A5. Honest docs** (1 day)
- `STATUS-AND-REMAINING-WORK.md` — what's running, what's scaffold, what's missing
- `ARCHITECTURE-AS-BUILT.md` — the actual data flow that works
- `ROADMAP-TO-VISION.md` — phase plan to fill gaps
- Update `CLAUDE.md` status banner with honest "what runs today" + "what's planned"
- Update `do-app/CLAUDE.md`, `do-app/CHANGELOG.md` to v1.5
- Add v1.5.0 entry to do-app CHANGELOG

**A6. Tests & commit** (1 day)
- All existing tests still pass (126 backend + 39 mobile minimum)
- New tests for: hojaiClient.sada, voice hook
- Commit + push
- Branch: `feat/v1.5-foundation`

**Phase A deliverables:**
- Hub at 4399 running
- SADA wired + tested
- Memory Confidence + Context Engine in hojaiClient
- Voice input working in do-app mobile
- Honest docs written
- All tests pass

---

### Phase B — SUTAR OS Real (Weeks 2-3)
**Goal:** Make 5 SUTAR services actually do something, not declare ports.

**B1. SUTAR Decision Engine (port 4240)** (3 days)
- Path: `companies/HOJAI-AI/sutar-os/core/sutar-decision-engine/` (currently doesn't exist — need to create)
- **Real logic:** rule engine + ML scoring for "should agent X do task Y given context Z"
- Endpoints:
  - `POST /api/decisions/evaluate` — input: agent profile, task, context; output: decision + reasoning
  - `GET /api/decisions/policies` — list active policies
  - `POST /api/decisions/feedback` — record outcome for learning
- MongoDB: `decisions` collection (input, output, outcome, timestamp)
- Wire into do-app's `autopilot.ts` route

**B2. SUTAR Negotiation Engine (port 4191)** (3 days)
- Path: `companies/HOJAI-AI/sutar-os/contracts/negotiation-ai/` (scaffold exists at 489 LOC)
- **Real logic:** implement actual negotiation rounds (open/counter/accept/reject) per ACP protocol
- Strategies: competitive, collaborative, accommodating, compromising, principled
- Endpoints:
  - `POST /api/negotiations/open` — start session
  - `POST /api/negotiations/:id/counter` — counter-offer
  - `POST /api/negotiations/:id/accept` — close deal
  - `GET /api/negotiations/:id` — session state
- MongoDB: `negotiations` collection

**B3. SUTAR Economy OS (port 4251)** (3 days)
- Path: `companies/HOJAI-AI/sutar-os/economy/` (currently empty)
- **Real logic:** settlement, escrow, BNPL, multi-currency
- Endpoints: `POST /api/economy/escrow`, `POST /api/economy/settle`, `GET /api/economy/balance/:agentId`
- MongoDB: `escrows`, `settlements`, `wallets`

**B4. SUTAR Trust Engine (port 4180)** (3 days)
- Path: `companies/HOJAI-AI/sutar-os/core/sutar-trust-engine/` (doesn't exist)
- **Real logic:** reputation scoring based on transaction history + SADA integration
- Endpoints: `GET /api/trust/:agentId`, `POST /api/trust/event`, `GET /api/trust/leaderboard`
- MongoDB: `reputation_events`

**B5. SUTAR Contracts OS (port 4185)** (3 days)
- Path: `companies/HOJAI-AI/sutar-os/contracts/sutar-contracts/` (scaffold exists)
- **Real logic:** smart contract templates for B2B (purchase orders, supply agreements)
- Endpoints: `POST /api/contracts/draft`, `POST /api/contracts/:id/sign`, `GET /api/contracts/:id`
- MongoDB: `contracts` collection

**B6. Wire SUTAR services into do-app's hojaiClient** (1 day)
- Add `hojaiClient.sutar.negotiate()`, `hojaiClient.sutar.evaluate()`, `hojaiClient.sutar.escrow()`, etc.
- Add routes in `do-app/backend/src/routes/agent.ts` or new `routes/sutar.ts`

**B7. Update sutar-gateway registry** (1 day)
- Add the new SUTAR services to `SERVICES` map in `sutar-gateway/src/index.js`
- Re-add the new ones to `start-all.sh`

**Phase B deliverables:**
- 5 SUTAR services with real business logic + MongoDB
- Wired into do-app + sutar-gateway
- ~3000-5000 LOC of new production code

---

### Phase C — Nexha Network (Weeks 4-7)
**Goal:** Build the missing "autonomous business network" — suppliers, warehouses, logistics, banking.

The Nexha portal already exists (`companies/Nexha/portal`, Next.js 16). The `commerce-identity` service exists. The roadmap doc shows L2 services in `REZ-Workspace/companies/Nexha/` (procurement-os 4,867 LOC, distribution-os 2,884 LOC, franchise-os, trade-finance, intelligence-layer). What we need to BUILD fresh:

**C1. Nexha Supplier Registry (port 4310)** (1 week)
- New service: `companies/Nexha/nexha-supplier-registry/`
- MongoDB collections: `suppliers`, `products`, `categories`, `regions`
- REST API:
  - `POST /api/suppliers` — register supplier
  - `GET /api/suppliers` — search/filter (industry, region, certification, price range)
  - `GET /api/suppliers/:id` — full profile
  - `PATCH /api/suppliers/:id/inventory` — update stock
  - `GET /api/suppliers/:id/products` — list products
  - `GET /api/products/search?q=...` — universal product search
- Real logic: capability matching, geographic search, certification validation
- Auth: reuse `commerce-identity` JWT pattern

**C2. Nexha Warehouse Network (port 4320)** (1 week)
- New service: `companies/Nexha/nexha-warehouse-network/`
- MongoDB: `warehouses`, `slots`, `inventory_locations`
- REST API:
  - `POST /api/warehouses` — register warehouse
  - `GET /api/warehouses/near?lat=&lng=&radiusKm=` — geo search
  - `GET /api/warehouses/:id/availability` — slot booking availability
  - `POST /api/warehouses/:id/book` — reserve slot
  - `GET /api/warehouses/:id/inventory` — what's stored
- Real logic: TSP route optimization, slot allocation, capacity planning

**C3. Nexha Logistics (port 4330)** (1 week)
- New service: `companies/Nexha/nexha-logistics/`
- MongoDB: `carriers`, `routes`, `shipments`, `tracking_events`
- REST API:
  - `POST /api/carriers` — register carrier
  - `POST /api/shipments/quote` — get quotes from carriers for a route
  - `POST /api/shipments` — book shipment
  - `GET /api/shipments/:id/track` — tracking events
  - `GET /api/shipments/:id/eta` — current ETA
- Real logic: rate shopping across carriers, multi-stop routing, tracking event ingestion

**C4. Nexha Banking Layer (port 4340)** (1 week)
- New service: `companies/Nexha/nexha-banking/`
- MongoDB: `accounts`, `transfers`, `bnpl_plans`, `fx_rates`
- REST API:
  - `POST /api/accounts` — open virtual account
  - `POST /api/transfers` — initiate transfer
  - `POST /api/bnpl/plan` — create BNPL plan
  - `GET /api/fx?from=&to=&amount=` — FX quote
  - `POST /api/escrow` — open escrow
  - `POST /api/escrow/:id/release` — release on condition
- Real logic: multi-currency, settlement rails, escrow state machine

**C5. Nexha Orchestrator (port 4350)** (1 week)
- New service: `companies/Nexha/nexha-orchestrator/`
- **This is the "ExecutionOS" — the decision→action layer**
- MongoDB: `workflows`, `workflow_runs`
- REST API:
  - `POST /api/workflows` — define multi-step workflow (e.g. "buy groceries" = search → negotiate → escrow → ship)
  - `POST /api/workflows/:id/execute` — start run
  - `GET /api/runs/:id` — current state
  - `POST /api/runs/:id/cancel`
  - `POST /api/runs/:id/retry`
- Real logic: state machine, retry with idempotency, saga pattern for rollback

**C6. Wire Nexha into RTMN Hub** (3 days)
- Add `/api/nexha/<service>/<path>` proxy to `REZ-ecosystem-connector/src/index.ts`
- Add Nexha capabilities to `/api/sutar/capabilities` (or new `/api/nexha/capabilities`)

**Phase C deliverables:**
- 5 new services in `companies/Nexha/`
- ~15,000-20,000 LOC of new production code
- Connected to RTMN Hub
- Foundation for "autonomous business network" is real

---

### Phase D — DO ↔ SUTAR ↔ Nexha End-to-End (Weeks 8-9)
**Goal:** Make the full vision work for a real use case.

**D1. Update do-app autopilot to use SUTAR + Nexha** (1 week)
- `do-app/backend/src/routes/autopilot.ts` currently uses `genieClient` directly
- New flow: "buy groceries" →
  1. Genie classifies intent (existing)
  2. **`hojaiClient.sutar.negotiate()`** — SUTAR negotiates with merchant agents
  3. **`nexha.supplier.search()`** — find best supplier
  4. **`nexha.warehouse.book()`** — reserve warehouse slot
  5. **`nexha.logistics.quote()`** — get carrier quotes
  6. **`nexha.banking.escrow()`** — open escrow
  7. **`orders.create()`** — finalize order
- All steps through **`nexha-orchestrator`** workflow for retry/rollback

**D2. Update do-app Genie chat to use voice transcript** (1 day)
- When `useVoiceInput` produces final transcript, route to `handleSend` (already done in A4)
- Add voice-specific feedback in mobile (mic animation, "listening...", "thinking...")

**D3. Merchant trust score in DO App UI** (1 day)
- Show trust score badges on merchant cards in `mobile/app/(tabs)/shop.tsx`
- Color-coded: 90+ green, 70+ yellow, <70 red
- Pull from `hojaiClient.sada.getTrustScore()`

**D4. End-to-end tests** (3 days)
- Integration test: voice transcript → Genie → SUTAR → Nexha → order
- Tests for each Nexha service
- Tests for SUTAR decision + negotiation

**D5. Mobile UI for "autonomous actions"** (2 days)
- Add a "Trust & Safety" section in Settings showing SADA trust scores for connected merchants
- Add an "Autopilot Activity" section showing recent SUTAR negotiations

**Phase D deliverables:**
- Real end-to-end flow
- Voice-driven grocery shopping works
- All steps traced + tested

---

### Phase E — Documentation, Polish, Deploy (Week 10)
**Goal:** Make it ready for production.

**E1. Complete documentation suite** (3 days)
- `STATUS-AND-REMAINING-WORK.md` — what runs, what doesn't
- `ARCHITECTURE-AS-BUILT.md` — actual data flow diagram
- `ROADMAP-TO-VISION.md` — phases to fill remaining gaps
- `OPERATIONS.md` — how to start everything
- `do-app/CLAUDE.md` — full update with v2.0
- `do-app/CHANGELOG.md` — v1.5, v1.6, v2.0 entries
- `do-app/docs/ARCHITECTURE.md` — update with SUTAR + Nexha wiring
- `do-app/docs/INTEGRATION-WITH-RTMN.md` — update with new services

**E2. Start scripts** (1 day)
- `companies/HOJAI-AI/start-all.sh` — already lists 100+ services; verify all 5 SUTAR + 5 Nexha are included
- `start-ecosystem.sh` — add Nexha services
- `do-app/scripts/start.sh` — start backend + mobile in dev mode

**E3. Docker compose** (1 day)
- `docker-compose.yml` at root — Hub + SUTAR + Nexha + do-app
- `do-app/docker-compose.yml` — local dev with all deps

**E4. Deployment** (2 days)
- Render config: do-app backend + new SUTAR services + Nexha
- Vercel: do-app mobile (Expo) + Nexha portal
- MongoDB Atlas: shared cluster with all databases

**E5. Demo script** (1 day)
- A `demo.sh` that walks through "Buy groceries with voice" → Genie → SUTAR → Nexha → Order
- Recording for stakeholders

**Phase E deliverables:**
- Production-ready
- Deployed
- Documented
- Demo-able

---

## Files to Touch (summary by phase)

### Phase A (Foundation)
- `companies/RABTUL-Technologies/REZ-ecosystem-connector/` (start)
- `companies/do-app/backend/src/services/hojaiClient.ts` (add sada, memory confidence, context engine)
- `companies/do-app/backend/src/config.ts` (add SADA_URL, etc.)
- `companies/do-app/backend/src/routes/merchants.ts` (use trust scores)
- `companies/do-app/backend/src/routes/memory.ts` (use confidence)
- `companies/do-app/mobile/package.json` (add voice deps)
- `companies/do-app/mobile/app.json` (mic permissions)
- `companies/do-app/mobile/src/hooks/useVoiceInput.ts` (NEW — copy from REZ-Consumer)
- `companies/do-app/mobile/app/(tabs)/index.tsx` (add mic button)
- `companies/do-app/mobile/__tests__/unit/useVoiceInput.test.ts` (NEW)
- `companies/do-app/backend/__tests__/unit/hojaiClient.sada.test.ts` (NEW)
- `STATUS-AND-REMAINING-WORK.md`, `ARCHITECTURE-AS-BUILT.md`, `ROADMAP-TO-VISION.md` (NEW)
- `CLAUDE.md` (update status banner)
- `do-app/CLAUDE.md`, `do-app/CHANGELOG.md`, `do-app/README.md` (update)

### Phase B (SUTAR Real)
- `companies/HOJAI-AI/sutar-os/core/sutar-decision-engine/` (NEW)
- `companies/HOJAI-AI/sutar-os/contracts/negotiation-ai/` (extend)
- `companies/HOJAI-AI/sutar-os/economy/sutar-economy-os/` (NEW)
- `companies/HOJAI-AI/sutar-os/core/sutar-trust-engine/` (NEW)
- `companies/HOJAI-AI/sutar-os/contracts/sutar-contracts/` (extend)
- `companies/HOJAI-AI/sutar-os/core/sutar-gateway/src/index.js` (add to SERVICES map)
- `companies/HOJAI-AI/start-all.sh` (add new services)
- `companies/do-app/backend/src/services/hojaiClient.ts` (add sutar methods)
- `companies/do-app/backend/src/routes/sutar.ts` (NEW)

### Phase C (Nexha Network)
- `companies/Nexha/nexha-supplier-registry/` (NEW)
- `companies/Nexha/nexha-warehouse-network/` (NEW)
- `companies/Nexha/nexha-logistics/` (NEW)
- `companies/Nexha/nexha-banking/` (NEW)
- `companies/Nexha/nexha-orchestrator/` (NEW — ExecutionOS)
- `companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts` (add /api/nexha proxy)

### Phase D (End-to-End)
- `companies/do-app/backend/src/routes/autopilot.ts` (use SUTAR + Nexha)
- `companies/do-app/mobile/app/(tabs)/index.tsx` (voice → send)
- `companies/do-app/mobile/app/(tabs)/shop.tsx` (trust score badges)
- `companies/do-app/mobile/app/(tabs)/settings.tsx` (trust + autopilot sections)
- New integration tests in `do-app/backend/__tests__/integration/`

### Phase E (Docs + Deploy)
- All docs listed in E1
- `start-ecosystem.sh`, `do-app/scripts/start.sh`
- `docker-compose.yml` (root), `do-app/docker-compose.yml`
- `do-app/render.yaml`, Nexha service `render.yaml` files
- `demo.sh` (NEW)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Scope creep** — 10 weeks is a lot, may balloon | Phase A is 1 week, shippable. Each phase ends with deployable milestone. Cut Phase E if needed. |
| **Nexha + SUTAR duplicate functionality** | SUTAR = agent-side (negotiation, trust, contracts). Nexha = network-side (suppliers, warehouses, logistics, banking). SUTAR calls Nexha via orchestrator. |
| **Voice deps require native build** (`expo-speech-recognition` not in Expo Go) | Document clearly: must use `eas build` or `expo prebuild`. Don't ship to Expo Go. |
| **MongoDB schemas diverge across new services** | Use `@rtmn/shared` (already exists in HOJAI-AI). Define a `nexha-shared` package. |
| **SADA trust scoring requires real data** | Seed with synthetic data for dev. Document that real SADA scores need production usage. |
| **Nexha is also a "scaffold" claim** | True — `nexha-commerce-network` is empty. We're building it from scratch. Will not be production-grade on day 1. |
| **Hub (REZ-ecosystem-connector) may have bugs when started** | Run smoke tests, fix issues as they appear, document. |
| **Rate limits / API costs** | On-device STT is free. No external LLM costs in core flow. |
| **External clients policy (Leverge, StayOwn, REZ-Merchant, Nexha itself is debated)** | Per CLAUDE.md, Nexha is internal. Check with user before touching `companies/Nexha/CLAUDE.md`. |
| **All 5 SUTAR services in 2 weeks is aggressive** | Cut to 3 if needed: Decision + Negotiation + Economy. Trust + Contracts can move to Phase B-extension. |

---

## Sequencing (visual)

```
Week 1    [======== A: Foundation ========]    → voice works, Hub runs, SADA wired
Week 2-3  [=========== B: SUTAR Real ==========]  → 5 SUTAR services with real logic
Week 4-7  [============= C: Nexha Network ============]  → 5 new services
Week 8-9  [===== D: End-to-End =====]              → voice→SUTAR→Nexha→order works
Week 10   [=== E: Docs + Deploy ===]              → production-ready
```

Each phase ends in a git commit + a demo.

---

## Test Plan

| Layer | Test Type | Count Target |
|---|---|---|
| do-app backend (existing) | Jest unit + integration | 126 (keep) + 30 new (SADA, memory, voice backend, sutar, nexha proxy) = 156 |
| do-app mobile (existing) | Jest + RTL | 39 (keep) + 10 new (voice hook) = 49 |
| SUTAR services | Jest unit | 5 services × 10 tests = 50 |
| Nexha services | Jest unit + integration | 5 services × 15 tests = 75 |
| End-to-end | integration | 5 scenarios (grocery, hotel, restaurant, subscription, refund) |
| Total | | ~340 tests passing |

---

## Acceptance Criteria for "Complete Ready"

1. ✅ All 4 audit-claimed services actually run (Hub, SADA, SUTAR-gateway, plus the 5 SUTAR + 5 Nexha)
2. ✅ Voice input works in do-app mobile
3. ✅ "Buy groceries" use case completes end-to-end via voice → SUTAR → Nexha
4. ✅ All tests pass (340+)
5. ✅ All docs are honest (no aspirational claims)
6. ✅ `docker-compose up` brings up the full stack
7. ✅ Demo script works on a fresh clone

---

## Out of Scope (Explicit)

- CoPilot for merchants (different product, not asked for in this plan)
- Real bank/card integrations (mocked in `nexha-banking`)
- Wake-word detection on device (Picovoice / openWakeWord) — separate project
- Cross-border trade (customs, FX hedging)
- Mobile widgets (iOS WidgetKit / Android Glance)
- AR/VR for physical world
- Image-based search
- Multi-language (Hindi UI) — separate project

---

## Open Questions for User

1. **Nexha is debated-as-external per CLAUDE.md** — am I authorized to add new services to `companies/Nexha/`? (Per the audit, Nexha is internal, but the policy says external clients get no modifications. Confirming.)
2. **Mobile deployment target** — Expo Go, EAS Build, or dev client only? `expo-speech-recognition` needs a dev client / EAS.
3. **MongoDB** — shared Atlas cluster, or per-service DBs? (Suggests shared with one DB per service.)
4. **Demo target** — is this for a stakeholder demo, a production launch, or a portfolio piece? Affects polish level.
5. **Phase B scope** — 5 SUTAR services in 2 weeks is tight. OK with 3 (Decision + Negotiation + Economy) for v1, then Trust + Contracts in v1.1?

---

## What Gets Committed

- New branch per phase: `feat/v1.5-foundation`, `feat/v2.0-sutar`, `feat/v2.1-nexha`, etc.
- Each phase: 1 PR per service + 1 docs PR
- Final: tag v2.0.0 on do-app + corresponding tags on HOJAI-AI submodule and Nexha subdir
