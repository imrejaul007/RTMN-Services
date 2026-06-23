# RTMN Ecosystem Map

> **The single canonical picture of the RTMN ecosystem as of 2026-06-23.** One diagram, one page, every service named once. If a service isn't on this map, it doesn't ship.

This map replaces the scattered "Service Registry" tables in the various sub-CLAUDE.md files. Per-service deep dives live in the per-service docs (linked from each row below).

---

## TL;DR

```
                  ┌────────────────────────────────────────┐
                  │      RTMN Unified Hub (4399)            │
                  │   /api/nexha/*  /api/sutar/*  /api/*    │
                  └────────────┬───────────────────────────┘
                               │
        ┌──────────────┬───────┼───────┬──────────────┬──────────────┐
        │              │       │       │              │              │
        ▼              ▼       ▼       ▼              ▼              ▼
   ┌─────────┐  ┌─────────┐ ┌───┐ ┌─────────┐  ┌─────────┐  ┌─────────────┐
   │Department│ │Industry │ │...│ │ Nexha   │  │ HOJAI AI│  │   REZ /     │
   │   OS    │ │   OS    │ │   │ │ Network │  │  Suite  │  │  AdBazaar   │
   │  (9)    │ │ (26)    │ │   │ │  (16+)  │  │  (5)    │  │   (8)       │
   └─────────┘  └─────────┘ └───┘ └─────────┘  └─────────┘  └─────────────┘
```

**Total at 2026-06-23:** 480 services registered at the Hub, 17 capability groups, 4 git repos, **2,194 automated tests** across vitest + jest + node:test.

---

## 1. Unified Hub (4399)

The single entry point. Routes by capability.

| Service | Port | Capability count |
|---------|------|------------------|
| **REZ-ecosystem-connector** | 4399 | 17 capability groups |

**Top-level routes:**
- `/api/nexha/*` — Nexha network (16 services)
- `/api/sutar/*` — SUTAR OS (5 services)
- `/api/{industry}/*` — Industry OS (26 industries)
- `/api/{department}/*` — Department OS (9 departments)
- `/api/{foundation}/*` — Foundation (CorpID, Memory, TwinOS)
- `/api/{hojai}/*` — HOJAI AI suite
- `/api/{rez}/*`, `/api/{ad}/*` — REZ + AdBazaar

**Phase 14 status:** Hub version **1.11.0**, handles 17 capability groups including the new `tenant-summary`, `tenant-fanout`, `upstream-health` (Phase 13).

---

## 2. Nexha Network (16 services)

The federation layer. **Where multi-tenant business logic lives.**

| Service | Port | Phase | Tests |
|---------|------|-------|------:|
| nexha-gateway | 5002 | C | – |
| nexha-supplier-network | 4280 | C.1 | 20 |
| nexha-distribution-network | 4285 | C.2 | 22 |
| nexha-pricing-network | 4286 | C.6 | 31 |
| nexha-trade-finance-network | 4287 | C.4 | 38 |
| nexha-warehouse-network | 4288 | C.5 | 49 |
| nexha-business-directory | 4360 | D.1 (Phase 3) | 68 |
| nexha-acp-messaging | 4340 | D.1 (Phase 4) | 78 |
| nexha-agent-marketplace | 4250 | D.1 (Phase 5) | 109 |
| nexha-mission-planner | 4362 | D.1 (Phase 6) | 120 |
| nexha-partner-graph | 4363 | D.1 (Phase 7) | 90 |
| nexha-commerce-runtime | 4364 | D.1 (Phase 8) | 118 |
| sutar-tenant-instances | 4141 | D.1 (Phase 9) | 110 |
| industry-tenant-instances | 4365 | D.1 (Phase 10) | 136 |
| **nexha-provisioning-engine** | 4385 | **D.1 (Phase 12)** | **67** |
| **nexha-hooks-sdk** | 4386 | **D.1 (Phase 12)** | **73** |
| **nexha-tenant-summary** | 4387 | **D.1 (Phase 13)** | **38** |

**Totals:** 17 services, **1,167 vitest tests** in Nexha alone.

**Phase 12-13 (ADR-0011) added:**
- **Provisioning Engine** — declarative plans (YAML/JSON) consumed by external orchestrators. State machine PENDING → APPLYING → READY → DESTROYING → DESTROYED. 8 statuses, 12 resource kinds, 3 isolation levels.
- **Hooks SDK** — webhook subscriptions with HMAC-SHA256 signing, exponential retry, 28 event types.
- **Tenant Summary** — read-only fan-out aggregator that returns a unified tenant view from all 9 ADR-0010 services in a single Hub call.

---

## 3. Department OS (9 services)

Horizontal layer — runs across ALL industry OS.

| Service | Port | Modules | AI Agents |
|---------|------|--------:|----------:|
| Sales OS | 5055 | 13 | 22 |
| Marketing OS | 5500 | 13 | 15 |
| Customer Success OS | 4050 | 8 | 6 |
| Procurement OS | 5096 | 12 | 10 |
| Workforce OS | 5077 | 11 | 10 |
| Finance OS | 4801 | 6 | 1 |
| Operations OS | 5250 | 20 | 23 |
| CXO OS | 5100 | 8 | 15 |
| Revenue Intelligence OS | 5400 | 8 | 8 |
| Media OS | 5600 | – | 13 |

---

## 4. Industry OS (26 services)

Vertical layer — one per industry.

| # | Industry | Port | # | Industry | Port |
|---|----------|------|---|----------|------|
| 1 | Restaurant | 5010 | 14 | Gaming | 5120 |
| 2 | Hotel | 5025 | 15 | Government | 5130 |
| 3 | Healthcare | 5020 | 16 | Home Services | 5140 |
| 4 | Events & Banquet | 4751 | 17 | Manufacturing | 5150 |
| 5 | Exhibitions | 5040 | 18 | Non-Profit | 5160 |
| 6 | Retail | 5030 | 19 | Professional | 5170 |
| 7 | Legal | 5035 | 20 | Sports | 5180 |
| 8 | Education | 5060 | 21 | Travel | 5190 |
| 9 | Agriculture | 5070 | 22 | Entertainment | 5200 |
| 10 | Automotive | 5080 | 23 | Construction | 5210 |
| 11 | Beauty | 5090 | 24 | Financial | 5220 |
| 12 | Fashion | 5095 | 25 | Real Estate | 5230 |
| 13 | Fitness | 5110 | 26 | Transport | 5240 |

---

## 5. Foundation (4 services)

| Service | Port | Purpose |
|---------|------|---------|
| CorpID | 4702 | Universal identity |
| MemoryOS | 4703 | 15 memory types, knowledge graph |
| Memory Confidence | 4152 | Per-fact reliability tracking |
| Twin Memory Bridge | 4704 | Twin ↔ memory partition links |
| Memory Context Engine | 4790 | Smart LLM-context retriever |
| TwinOS Hub | 4705 | Digital twins (86+ twins) |

---

## 6. HOJAI AI Suite (5 services)

| Service | Port | Purpose |
|---------|------|---------|
| HOJAI Gateway | 4500 | Internal AI gateway |
| Memory Service | 4520 | Multi-tier memory |
| TwinOS Bridge | 4521 | Twin management (lives at 4705) |
| Intelligence | 4530 | AI inference |
| ExpertOS | 4550 | AI marketplace |

---

## 7. REZ + AdBazaar (8 services)

| Service | Port | Purpose |
|---------|------|---------|
| REZ Auth | 4002 | Authentication |
| REZ Wallet | 4004 | Payments & Rewards |
| REZ CRM Hub | 4056 | Customer relations |
| REZ Care Service | 4055 | Customer support |
| REZ DSP | 4990 | Ad campaign delivery |
| REZ Audience | 4805 | Audience segments |
| REZ Attribution | 4803 | Multi-touch attribution |
| REZ CDP | 4901 | Customer data platform |

---

## 8. SUTAR OS (5 services — exposed via Hub)

| Service | Port | Purpose |
|---------|------|---------|
| sutar-gateway | 4140 | API gateway |
| sutar-decision-engine | 4290 | AI-powered policy decisions |
| sutar-economy-os | 4294 | Economic layer |
| sutar-trust-engine | 4291 | Trust + reputation |
| sutar-contract-os | 4292 | Smart contracts |

---

## 9. TwinOS — Digital Twin Platform

| Service | Port | Twins |
|---------|------|------:|
| TwinOS Hub | 4705 | 86+ |
| Customer Twin | 4895 | Customer, LTV, Churn |
| Order Twin | 4885 | Cart, Order, Shipment |
| Wallet Twin | 4896 | Wallet, Rewards |
| Employee Twin | 4730 | Employee, Performance |
| Voice Twin | 4876 | Voice profiles |
| Product Twin | 4720 | Product, Inventory |
| Asset Twin | 4890 | Assets, Depreciation |
| Organization Twin | 4710 | Organizations, KPIs |
| Partner Twin | 4892 | Partners |
| Lead Twin | 4894 | Leads |

**Totals: 86+ digital twins** across 14 categories.

---

## 10. Test framework consolidation (Phase 14)

Per ADR-0011 Phase 14, RTMN is consolidating to **vitest + node:test only** across all repos. Status:

| Repo | Runner | Status |
|------|--------|--------|
| Nexha (16 services) | vitest 2.x | ✅ 100% migrated |
| RABTUL connector | (no tests yet) | n/a |
| do-app backend | **vitest 2.x** (new) + jest 29 (legacy) | 🔄 Partial — Phase 12-13 tests migrated; 9 legacy `*.test.ts` files still on jest |
| REZ-Workspace | node:test (built-in) | ✅ 100% |
| HOJAI-AI | vitest 2.x | ✅ 100% migrated |

**Why vitest + node:test:**
- vitest: native ESM + TS support, mongodb-memory-server integration, supertest out of the box. Drop-in for our Nexha suite.
- node:test: zero dependencies, runs anywhere Node runs. Perfect for the in-process REZ-Workspace clients.

**Why drop jest:**
- requires `NODE_OPTIONS='--experimental-vm-modules'` flags everywhere
- ESM + TS support is bolted on (ts-jest)
- vitest does all this natively

**Migration plan (not in scope for Phase 14):**
1. ✅ Add `vitest.config.ts` to do-app backend.
2. ✅ Migrate Phase 12 (`hojaiClient.nexha.provisioningHooks.test.ts`) from `jest.fn()` to `vi.fn()`.
3. ✅ Migrate Phase 13 (`hojaiClient.nexha.tenantSummary.test.ts`) to vitest-compatible form.
4. ⏳ Migrate 9 legacy `*.test.ts` files (`hub`, `businessDirectory`, `distributionOS`, `procurementOS`, `nexha`, `tradeFinance`, `sada`, `tenantInstances`, `industryTenantInstances`) — out of scope for Phase 14, deferred to a follow-up.
5. ⏳ Update `package.json` `test` script to use `vitest run` once all files migrated.

---

## 11. Repos at a glance

| Repo | Purpose | Tests | Phase 14 status |
|------|---------|------:|-----------------|
| **RTMN-Services** (root) | Docs + Nexha services | 1,719 | All on vitest |
| **RABTUL-Technologies** | REZ-ecosystem-connector | – | v1.11.0, no tests |
| **REZ-Workspace** | Unified Fabric client (Node) | 132 | All on node:test |
| **do-app** | Backend + mobile commerce | 343 | 31 vitest + 312 jest (partial) |
| **HOJAI-AI** | AI platform + Genie | – | All on vitest |

**Total automated tests across 4 repos: 2,194.** All passing.

---

## 12. Per-service deep dives

For any service on this map, see the linked architecture doc:

- **Nexha**: [docs/nexha/](nexha/) — one `.md` per service
- **Department OS + Industry OS + TwinOS**: per-service `CLAUDE.md`
- **Foundation + HOJAI AI + SUTAR OS**: per-service `CLAUDE.md`

---

## 13. The road here

- **2026-06-22**: ADR-0010 closed. 8 services, 1,508 tests.
- **2026-06-23**: ADR-0011 Phase 12 + 13 shipped. 3 services (provisioning-engine, hooks-sdk, tenant-summary), 178 service tests + 53 client tests.
- **2026-06-23**: ADR-0011 Phase 14 (this document) shipped. Test framework consolidation started.
- **2026-06-23**: ADR-0011 Phase 15 shipped. Open-source protocol specs (ACP, Capability Graph, ICS) under Apache-2.0, plus 3 reference JS SDKs (acp-js 24 tests, ics-js 45 tests, capgraph-js 22 tests = 91 SDK tests).
- **2026-06-23**: ADR-0011 retrospective shipped ([docs/nexha/adr-0011-retrospective.md](nexha/adr-0011-retrospective.md)). **ADR-0011 status: ✅ Complete (Phase 15 / 15) — DONE 2026-06-23.**

What's next:
- **ADR-0012 (proposed)** — finish do-app test migration → wire provisioning engine to industry-tenant-instances → ship reference orchestrator → v1.0 of ACP. See [docs/nexha/adr-0011-retrospective.md § 7](nexha/adr-0011-retrospective.md).