# PLAN: Nexha Full Integration via SUTAR OS

> **Date:** 2026-06-22
> **Goal:** Wire the **real Contract Engine** (sutar-contracts) end-to-end through SUTAR OS, and connect all existing RTMN OS services through the SUTAR nexus-sutar-bridge.
> **Scope:** Only RTMN-owned code. External clients untouched.
> **Decisions:** Sign-off on D1-D5 received.

---

## Strategic read

The vision says: *"A network where businesses operate through AI agents."*

What exists in code today:
1. **`sutar-contracts`** (4185, 199 LOC) — has the 4 core templates (negotiation/sla/delivery/data_share) and full lifecycle (draft → negotiating → signed → fulfilled → settled → cancelled → breached). PersistentMap-backed.
2. **`nexus-sutar-bridge.service.ts`** in procurement-os (618 LOC) — has 13 SUTAR service URLs configured, has event-emit methods for the buyer-flow, but not all are wired end-to-end.
3. **`policy-os`** (4254, 2,342 LOC) — real policy engine with auth, persistence, evaluation, simulation. Not wired into procurement flow.
4. **`inventory-twin-service`** + **`table-twin-service`** — already wired to SUTAR + MemoryOS (Phases 7-8).
5. **`logistics-os`** (5272) — real warehouses/carriers/shipments. Not connected to anything.
6. **`distribution-os`** (L2) — real route optimization. Not connected to procurement.
7. **`restaurant-os`** (5010) — orchestrator now proxies inventory + tables. Order/kitchen/staff routes still mock.

**The pattern is clear:** every RTMN OS service has been built as a standalone capability. The "Autonomous Business Network" is achieved by **wiring them through SUTAR**, not by building more standalone services.

---

## Phase 1 — Contract Engine: real templates + wire to procurement (CORE)

### 1a. Add the 3 missing templates to sutar-contracts

Vision requires: Purchase Contracts, Supply Agreements, Service Contracts, NDAs, SLAs.

sutar-contracts has: negotiation, sla, delivery, data_share.

**Add:**
- `purchase_order` — formal PO with line items, payment terms, delivery date
- `supply_agreement` — long-term supply with volume tiers, exclusivity clauses
- `nda` — confidentiality terms, party identifiers, duration

This makes 7 templates total, covering all vision use cases.

**File:** `companies/HOJAI-AI/sutar-os/contracts/sutar-contracts/src/templates.js` (extract)
**LOC:** ~150 lines

### 1b. Auto-generate contracts when procurement-os awards a deal

In `procurement-os`, when a deal transitions to `awarded`, automatically POST to `sutar-contracts /api/contracts` with kind=`purchase_order` and the agreed terms.

**File:** `companies/REZ-Workspace/companies/Nexha/procurement-os/src/services/contract-orchestrator.service.ts` (new, ~200 LOC)
**Hooks:** `deal.service.ts` `award()` method → call `sutarClient.createContract()`

### 1c. Add `contracts-os` route to SUTAR gateway

The sutar-gateway at 4140 should expose `/api/contracts/*` proxying to sutar-contracts (4185).

**File:** `companies/HOJAI-AI/sutar-os/core/sutar-gateway/src/contracts-proxy.js` (~60 LOC)

### 1d. Add `/api/contracts` proxy to restaurant-os orchestrator

Mirror the inventory..js pattern. Restaurant dashboard shows "Active Contracts" widget.

**File:** `companies/REZ-Workspace/industries/restaurant-os/src/routes/contracts.proxy.js` (~80 LOC)

---

## Phase 2 — PolicyOS wiring: enforce limits on procurement

### 2a. Define a "restaurant procurement" policy in policy-os

When a PO exceeds ₹X, requires approval. When supplier is new, requires verification. Auto-approve for known suppliers under threshold.

**File:** `companies/HOJAI-AI/platform/flow/policy-os/seed/restaurant-procurement.policy.json` (new, ~30 lines JSON)

### 2b. Add policy-check call to procurement-os award flow

Before awarding, call `policy-os /api/policies/evaluate` with the deal context. If requires_approval, set deal status to `pending_approval` and notify.

**File:** `companies/REZ-Workspace/companies/Nexha/procurement-os/src/services/policy-client.ts` (new, ~120 LOC)

### 2c. Add policy-status widget to restaurant-os dashboard

Show pending-approval count, recently-approved, recently-blocked.

---

## Phase 3 — Connect Logistics + Distribution via SUTAR

### 3a. Wire procurement-os awarded-deal event to logistics-os

When a PO is signed (via sutar-contracts `sign` endpoint), the procurement-os publishes an event to logistics-os creating a shipment record.

**File:** `companies/REZ-Workspace/companies/Nexha/procurement-os/src/services/shipment-orchestrator.service.ts` (~150 LOC)

### 3b. Wire distribution-os route plans to restaurant-os

Restaurant-os shows "Expected Delivery" for incoming shipments, polled from logistics-os.

**File:** `companies/REZ-Workspace/industries/restaurant-os/src/routes/shipments.proxy.js` (~80 LOC)

---

## Phase 4 — Document Vault (the next critical gap)

### 4a. Build `document-vault` service

Stores POs, invoices, contracts, certs, tax docs. MongoDB-backed, S3-compatible storage interface, signed URLs.

**New service:** `companies/HOJAI-AI/platform/documents/document-vault/`
**Port:** 4285
**LOC:** ~600 (Express + MongoDB driver + minimal gridfs or local fs)

### 4b. Auto-store contracts in vault

When sutar-contracts creates a contract, also POST a copy to document-vault with metadata.

**File:** `companies/HOJAI-AI/sutar-os/contracts/sutar-contracts/src/vault-client.js` (~80 LOC)

### 4c. Auto-store POs in vault

When procurement-os creates a PO, store in vault.

---

## Phase 5 — Wire remaining restaurant twins (Phase 9-12 completion)

5a. `/api/kitchen` → kitchen-twin-service
5b. `/api/orders` → order-twin-service
5c. `/api/staff` → staff-twin-service
5d. `/api/customers` → customer-twin-service

Each is ~50-100 LOC, same pattern as table.proxy.js done in Phase 8.

---

## Phase 6 — Business Portal real Dashboard

### 6a. Replace the L1 Next.js portal's `/dashboard` stub

Use the live data from restaurant-os `/api/dashboard`, `/api/inventory/*`, `/api/tables/*`, `/api/contracts/*`.

**File:** `companies/Nexha/portal/app/dashboard/page.tsx` (rewrite, ~400 LOC)

### 6b. Add Contracts page to portal

Lists active/pending/fulfilled contracts from sutar-contracts.

**File:** `companies/Nexha/portal/app/contracts/page.tsx` (new, ~200 LOC)

---

## Phase 7 — Wire GoalOS into the loop (autonomous mode)

### 7a. Hook inventory-low events to GoalOS

When inventory-twin detects reorder, emit goal to GoalOS: "Maintain 30-day stock of {item}". GoalOS decomposes into sub-goals (find supplier, negotiate, PO, receive).

**File:** `companies/REZ-Workspace/industries/restaurant-os/skills/inventory-twin-service/src/utils/goal-client.ts` (~120 LOC)

### 7b. Goal status → dashboard widget

Show active goals, completed goals, blocked goals.

---

## Phase 8 — Cross-vertical flow: Restaurant ↔ Manufacturing

### 8a. When restaurant volume exceeds threshold, emit manufacturing-demand

Detect high-volume reorder pattern in MemoryOS → emit "scale up production" intent to manufacturing-os.

### 8b. Wire manufacturing-os to receive these intents

Manufacturing-os subscribes to SUTAR intent bus.

---

## Order of operations (sequenced for one session)

This is realistic in a single session if we focus on **wiring + integration, not new services**:

**Round 1 (now):**
- Phase 1a-c: Contract Engine templates + auto-generate + SUTAR gateway proxy + restaurant proxy → ~500 LOC

**Round 2:**
- Phase 2a-c: PolicyOS policy + client + dashboard widget → ~300 LOC

**Round 3:**
- Phase 3a-b: Logistics + Distribution wiring → ~250 LOC

**Round 4:**
- Phase 5a-d: Wire remaining 4 restaurant twins → ~400 LOC

**Round 5:**
- Phase 6a-b: Portal Dashboard + Contracts page → ~600 LOC

**Round 6:**
- Phase 4a-c: Document Vault (most ambitious, deferred if running long) → ~800 LOC

**Round 7:**
- Phase 7-8: GoalOS + cross-vertical (only if Round 6 done)

---

## Honest scope estimate

**Realistic in this session:**
- Phases 1, 2, 3, 5 (wiring-heavy, modest new code): ~1,500 LOC across ~12 files
- Closes gaps 1 (Contract), 2 (Policy), 5 (Logistics), 7 (remaining verticals wired)
- Gets Flow 1 (Restaurant) from ~70% → ~95% wired
- Gets Flow 2 (Manufacturing) from ~15% → ~40% wired (via distribution + logistics wiring)

**Defer if running long:**
- Phase 4 (Document Vault) — needs its own service + MongoDB
- Phase 6 (Portal UI) — depends on how much new portal code I can safely write
- Phase 7-8 (GoalOS, cross-vertical) — high risk of stubbing

---

## Success criteria

When done, the system should be able to demonstrate:

1. Restaurant inventory drops → inventory-twin detects reorder → SUTAR agent registers → MemoryOS records pattern → procurement-os creates RFQ → supplier responds → SUTAR negotiates → procurement-os awards → sutar-contracts auto-creates PO contract → policy-os evaluates → if under threshold, auto-sign → logistics-os creates shipment → distribution-os plans route → MemoryOS records outcome.

**All of this currently exists in pieces. The wiring is the work.**

---

## Decisions signed off (D1-D5)

- D1: pnpm + Turborepo (use existing npm + monorepo for now, structure ready to migrate)
- D2: Postgres + JSONB (use existing MongoDB for now, document the migration path)
- D3: Extend SUTAR OS (✓ this plan does exactly that)
- D4: Web-first (no mobile work this session)
- D5: Open-core licensing (no change to licensing)

---

## Refs

- [NEXHA-VISION-AUDIT.md](../NEXHA-VISION-AUDIT.md) — what exists vs missing
- [companies/REZ-Workspace/industries/restaurant-os/ARCHITECTURE.md](../companies/REZ-Workspace/industries/restaurant-os/ARCHITECTURE.md) — Flow 1 architecture
- [sutar-contracts source](../companies/HOJAI-AI/sutar-os/contracts/sutar-contracts/src/index.js) — Contract Engine
- [nexus-sutar-bridge](../companies/REZ-Workspace/companies/Nexha/procurement-os/src/services/nexus-sutar-bridge.service.ts) — existing SUTAR bridge
- [policy-os](../companies/HOJAI-AI/platform/flow/policy-os/src/index.js) — Policy Engine