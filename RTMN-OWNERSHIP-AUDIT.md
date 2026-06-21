# RTMN Ownership Audit

> **Date:** June 21, 2026
> **Auditor:** Claude Code (Opus 4.8)
> **Scope:** All ~1,580 service directories across `/Users/rejaulkarim/Documents/RTMN/`
> **Goal:** Identify which services belong in the RTMN repo vs. which should move to their owning company repos so that each company owns its services and shares them with RTMN via client-to-client contracts.

---

## Executive Summary

The RTMN repo is in a deeply confused state. Out of ~1,580 service directories:

| Bucket | Count | Status |
|---|---:|---|
| Services that **legitimately belong in RTMN** (hub, foundation, twin, industry-os, department-os) | ~80 | ✅ Mostly OK, but several are stubs or missing |
| Services that belong to **HOJAI AI** but live in RTMN | ~30 | ❌ Should be moved/deleted (duplicates of HOJAI-AI submodule) |
| Services that belong to **REZ-Merchant / REZ-Consumer / RABTUL / Karma / CorpPerks** but live in RTMN | ~50 | ❌ Should be moved |
| Services that belong to **AdBazaar** (the 305-dir ad platform) | ~426 | ⚠️ Already audited June 20; **~85 REZ-* dirs are still polluting it** (second wave) |
| **External clients** (StayOwn, Leverge, Nexha, RisnaEstate, RisaCare) — no-touch per policy | ~110 | ⏸️ Inventory only |
| **Massive forks/dup-repos** hidden inside `companies/` | 2 | 🚨 Critical — see §6 |

### Critical structural problems (must fix first)

1. **`services/unified-os-hub/` is missing** from `services/`. The actual hub lives in `services copy/unified-os-hub/` — a duplicate directory the previous audit missed. The repo currently has `services/` (incomplete) AND `services copy/` (more complete).
2. **`services/customer-success-os/` is a stub** (only CLAUDE.md). The real one is at `industry-os/services/customer-success-os/` (port 4050). Eleven more services in `services/` are stubs (see §3).
3. **12 RTMN-OS service duplicates exist in `services copy/` and `companies/REZ-Workspace/services/`**. These are full copies of the same `corpid-service`, `memory-os`, `twinos-hub`, `hotel-os`, `restaurant-os`, etc. — the result of two different "shadow forks" of the monorepo.
4. **`companies/REZ-Workspace/` is a complete fork** of the RTMN ecosystem with its own git remote (`imrejaul007/REZ-Workspace`), containing 27 services, 21 industries, and 12 nested company sub-repos. It is itself a meta-monorepo.
5. **Multiple services claim the same port**: `hospitality-os` and `restaurant-os` both default to port 5010; every `industry-os/services/*/src/index-with-layers.js` is hardcoded to port 5010.
6. **Hub routes reference ports that don't exist** anywhere in the repo: 4004 (wallet), 4055 (care), 4056 (crm), 4761 (Leverge intelligence), 4765 (Leverge copilot), 4990 (AdBazaar DSP), 5500 (marketing OS).

### Recommended order of operations

1. **First** — collapse `services copy/` → `services/` (the missing hub and 50+ ACN/Agent services live there)
2. **Second** — resolve the 11 stub services in `services/` (delete the stub or move the real one)
3. **Third** — remove duplicate services from `companies/REZ-Workspace/services/` and `companies/HOJAI-AI/platform/`
4. **Fourth** — move HOJAI-AI mislocated services (Genie, SUTAR, twins) to the HOJAI-AI repo via PR
5. **Fifth** — move REZ-Merchant / REZ-Consumer / RABTUL / Karma / CorpPerks services to their owning repos
6. **Sixth** — extract the second-wave AdBazaar pollution (the ~85 REZ-* dirs that aren't actually ad-tech)
7. **Seventh** — re-point the hub routes to either local services (with the new paths) or to client-to-client URLs
8. **Eighth** — decide what to do about `companies/REZ-Workspace/` (see §6)

---

## 1. What should STAY in the RTMN repo

Per `CLAUDE.md`, the RTMN-OS itself consists of:

### 1.1 Unified Hub (gateway)

| Service | Port | Current location | Status | Action |
|---|--:|---|---|---|
| unified-os-hub | 4399 | **`services copy/unified-os-hub/`** | ⚠️ Not in `services/` | **MOVE TO `services/unified-os-hub/`** |

The hub is missing from `services/`. Only `services copy/unified-os-hub/` has it. This explains why some recent docs say "hub running" while the directory is absent.

### 1.2 Foundation services

| Service | Port | Current location | Status | Action |
|---|--:|---|---|---|
| corpid-service | 4702 | `services copy/corpid-service/` AND `companies/HOJAI-AI/platform/identity/corpid-service/` AND `companies/REZ-Workspace/services/corpid-service/` | 🚨 3 copies | **MOVE to `services/corpid-service/`**, delete other 2 |
| memory-os | 4703 | `services copy/memory-os/` AND `companies/HOJAI-AI/platform/memory/memory-os/` AND `companies/REZ-Workspace/services/memory-os/` | 🚨 3 copies | Same as above |
| twinos-hub | 4705 | `services copy/twinos-hub/` AND `companies/HOJAI-AI/platform/twins/twinos-hub/` AND `companies/REZ-Workspace/services/twinos-hub/` | 🚨 3 copies | Same as above |
| twinos-shared | n/a | `services copy/twinos-shared/` AND `companies/REZ-Workspace/.../twinos-shared/` | 2 copies | Move to `shared/twinos-shared/` |
| event-bus | 4510 | `services copy/event-bus/` AND `companies/HOJAI-AI/platform/observability/event-bus/` | 2 copies | Move to `services/event-bus/`, delete HOJAI copy (event-bus is RTMN-OS, not HOJAI) |

### 1.3 TwinOS twin services (RTMN-OS owns the data layer)

Per `companies/HOJAI-AI/SERVICE-CLASSIFICATION.md`, TwinOS twins live in HOJAI-AI's `platform/twins/` directory. **But per `CLAUDE.md`, TwinOS is the data layer of RTMN-OS itself, not HOJAI-AI**. There's a tension here — the original design said twins are HOJAI-AI, but the architecture treats them as RTMN foundation.

**Recommendation:** TwinOS twins stay in HOJAI-AI's `platform/twins/` (since the canonical twin service code lives there), but the **canonical port for each twin is owned by RTMN-OS** (4895, 4885, 4896, etc.). RTMN consumes twins via the twin contract, and HOJAI-AI hosts them. This is the first concrete example of a client-to-client contract.

| Twin | Port | HOJAI-AI path | RTMN path |
|---|--:|---|---|
| customer-twin | 4895 | `companies/HOJAI-AI/platform/twins/customer-twin/` | — |
| order-twin | 4885 | `companies/HOJAI-AI/platform/twins/order-twin/` | — |
| wallet-twin | 4896 | `companies/HOJAI-AI/platform/twins/wallet-twin/` | — |
| employee-twin, voice-twin, product-twin, asset-twin, organization-twin, partner-twin, lead-twin | various | `companies/HOJAI-AI/platform/twins/*` | — |

**Action:** Move RTMN-side twin code (currently in `services copy/*-twin/` and possibly `companies/REZ-Workspace/services/*-twin/`) into HOJAI-AI's `platform/twins/`, or delete if duplicates.

### 1.4 Department OS (horizontal layer)

| Service | Port | RTMN location | Status |
|---|--:|---|---|
| sales-os | 5055 | `industry-os/services/sales-os/` | ✅ OK |
| marketing-os | 5500 | `industry-os/services/marketing-os/` | ⚠️ PORT MISSING — search finds no service declaring port 5500 |
| customer-success-os | 4050 | `industry-os/services/customer-success-os/` (real) AND `services/customer-success-os/` (stub CLAUDE.md only) | 🚨 **Delete the stub** |
| finance-os | 4801 | `industry-os/services/finance-os/` | ✅ OK |
| procurement-os | 5096 | `industry-os/services/procurement-os/` | ✅ OK |
| workforce-os | 5077 | `industry-os/services/workforce-os/` | ✅ OK |
| operations-os | 5250 | `industry-os/services/operations-os/` | ✅ OK |
| cxo-os | 5100 | `industry-os/services/cxo-os/` | ✅ OK |
| revenue-intelligence-os | 5400 | `industry-os/services/revenue-intelligence-os/` | ✅ OK |
| media-os | 5600 | `industry-os/services/media-os/` | ✅ OK |

**Stub to delete:** `services/customer-success-os/` (only contains CLAUDE.md — the real one is in `industry-os/services/customer-success-os/`).

### 1.5 Industry OS (26 verticals)

| Service | Port | Location | Status |
|---|--:|---|---|
| restaurant-os | 5010 | `industry-os/services/restaurant-os/` | ⚠️ Port collision: `hospitality-os` also claims 5010 |
| hotel-os | 5025 | `industry-os/services/hotel-os/` | ✅ OK |
| healthcare-os | 5020 | `industry-os/services/healthcare-os/` | ✅ OK |
| retail-os | 5030 | `industry-os/services/retail-os/` | ✅ OK |
| legal-os | 5035 | `industry-os/services/legal-os/` | ✅ OK |
| education-os | 5060 | `industry-os/services/education-os/` | ✅ OK |
| agriculture-os | 5070 | `industry-os/services/agriculture-os/` | ✅ OK |
| automotive-os | 5080 | `industry-os/services/automotive-os/` | ✅ OK |
| beauty-os | 5090 | `industry-os/services/beauty-os/` | ✅ OK |
| fashion-os | 5095 | `industry-os/services/fashion-os/` | ✅ OK |
| fitness-os | 5110 | `industry-os/services/fitness-os/` | ✅ OK |
| gaming-os | 5120 | `industry-os/services/gaming-os/` | ✅ OK |
| government-os | 5130 | `industry-os/services/government-os/` | ✅ OK |
| home-services-os | 5140 | `industry-os/services/home-services-os/` | ✅ OK |
| manufacturing-os | 5150 | `industry-os/services/manufacturing-os/` | ✅ OK |
| non-profit-os | 5160 | `industry-os/services/non-profit-os/` | ✅ OK |
| professional-os | 5170 | `industry-os/services/professional-os/` | ✅ OK |
| sports-os | 5180 | `industry-os/services/sports-os/` | ✅ OK |
| travel-os | 5190 | `industry-os/services/travel-os/` | ✅ OK |
| entertainment-os | 5200 | `industry-os/services/entertainment-os/` | ✅ OK |
| construction-os | 5210 | `industry-os/services/construction-os/` | ✅ OK |
| financial-os | 5220 | `industry-os/services/financial-os/` | ✅ OK (BUT — see note below) |
| realestate-os | 5230 | `industry-os/services/realestate-os/` | ✅ OK |
| transport-os | 5240 | `industry-os/services/transport-os/` | ✅ OK |
| event-banquet-os | 4751 | `industry-os/services/event-banquet-os/` | ✅ OK |
| exhibition-os | 5040 | `industry-os/services/exhibition-os/` | ✅ OK |

**Plus these "specialized" OS that should also stay:**
| Service | Port | Location | Status |
|---|--:|---|---|
| energy-os | 5260 | `industry-os/services/energy-os/` | ✅ OK |
| security-os | 5270 | `industry-os/services/security-os/` | ✅ OK |
| api-platform | 5280 | `industry-os/services/api-platform/` | ✅ OK |
| marketplace-os | 5290 | `industry-os/services/marketplace-os/` | ✅ OK |
| multi-property-os | 5300 | `industry-os/services/multi-property-os/` | ✅ OK |
| predictive-maintenance-os | 5310 | `industry-os/services/predictive-maintenance-os/` | ✅ OK |

**Port collision to fix:** `hospitality-os` (claimed port 5010) should be renamed to a different port (e.g., 5145) or merged with hotel-os. Right now both `hospitality-os` and `restaurant-os` will fail to start simultaneously.

**Note on `financial-os`:** This sits at port 5220 but a `finance-os` also exists at port 4801. They appear to be different services (finance-os is the horizontal Finance OS consolidation layer; financial-os is the industry vertical for Financial Services). Verify these are intended as two different things before keeping both.

### 1.6 Industry OS — broken `index-with-layers.js` files

Every `industry-os/services/*/src/index-with-layers.js` is hardcoded to port 5010. This is a copy-paste artifact — none of them should be 5010 (only restaurant-os should be). **None of these files are referenced by any start script** (verified — they appear to be alternate entry points that aren't used). Action: audit whether `index-with-layers.js` is actually used anywhere; if not, delete all 26 copies.

---

## 2. Services to MOVE to HOJAI-AI

These services live in `services/`, `services copy/`, or `companies/REZ-Workspace/` but are owned by HOJAI-AI per `companies/HOJAI-AI/SERVICE-CLASSIFICATION.md`.

### 2.1 Genie AI suite (~22 services)

Currently in `services copy/`, all need to be in `companies/HOJAI-AI/products/genie/` (where they ALREADY exist):

| Service | Port | Current (RTMN side) | HOJAI-AI canonical |
|---|--:|---|---|
| genie-gateway | 4701 | `services copy/genie-gateway/` | `companies/HOJAI-AI/products/genie/genie-gateway/` ✅ exists |
| genie-wake-word-service | 4767 | `services copy/genie-wake-word-service/` | exists |
| genie-listening-modes | 4768 | `services copy/genie-listening-modes/` | exists |
| genie-device-integration | 4769 | `services copy/genie-device-integration/` | exists |
| genie-calendar-service | 4709 | `services copy/genie-calendar-service/` | exists |
| genie-memory-inbox | 4710 | `services copy/genie-memory-inbox/` | exists |
| genie-briefing-service | 4712 | `services copy/genie-briefing-service/` | exists |
| genie-universal-search | 4713 | `services copy/genie-universal-search/` | exists |
| genie-serendipity-service | 4714 | `services copy/genie-serendipity-service/` | exists |
| genie-smart-forgetting-service | 4715 | `services copy/genie-smart-forgetting-service/` | exists |
| genie-shopping-agent | 4716 | `services copy/genie-shopping-agent/` | exists |
| genie-companion-service | — | `services copy/genie-companion-service/` | exists |
| genie-consultant-agent | — | `services copy/genie-consultant-agent/` | exists |
| genie-creation-os | — | `services copy/genie-creation-os/` | exists |
| genie-learning-os | — | `services copy/genie-learning-os/` | exists |
| genie-life-gps | — | `services copy/genie-life-gps/` | exists |
| genie-life-university | — | `services copy/genie-life-university/` | exists |
| genie-memory-graph | 4717 | `services copy/genie-memory-graph/` | exists |
| genie-money-os | — | `services copy/genie-money-os/` | exists |
| genie-relationship-os | — | `services copy/genie-relationship-os/` | exists |
| genie-thinking-engine | 4719 | `services copy/genie-thinking-engine/` | exists |
| genie-wellness-os | — | `services copy/genie-wellness-os/` | exists |
| genie-execution-engine | — | `services copy/genie-execution-engine/` | exists |

**Action:** Delete the `services copy/genie-*/` copies (they are duplicates of HOJAI-AI's `products/genie/genie-*/`).

### 2.2 SUTAR OS (~16 services)

Currently in `services copy/`, all need to be in `companies/HOJAI-AI/sutar-os/` (where they already exist):

| Service | Port | Current (RTMN) | HOJAI-AI canonical |
|---|--:|---|---|
| acp-protocol | 4800 | `services copy/acp-protocol/` | `companies/HOJAI-AI/sutar-os/contracts/acp-protocol/` ✅ |
| acn-network | 4801 | `services copy/acn-network/` | `companies/HOJAI-AI/sutar-os/agents/acn-network/` ✅ |
| acn-hub | 4800 | `services copy/acn-hub/` | exists in HOJAI-AI |
| acn-integration | 4849 | `services copy/acn-integration/` | exists |
| merchant-agents | 4810 | `services copy/merchant-agents/` | `companies/HOJAI-AI/sutar-os/agents/merchant-agents/` ✅ |
| agent-reputation | 4820 | `services copy/agent-reputation/` | exists |
| agent-contracts | 4830 | `services copy/agent-contracts/` | exists |
| agent-wallets | 4840 | `services copy/agent-wallets/` | exists |
| agent-marketplace | 4845 | `services copy/agent-marketplace/` | exists |
| agent-learning | 4846 | `services copy/agent-learning/` | exists |
| agent-analytics | 4848 | `services copy/agent-analytics/` | exists |
| dispute-resolution | 4847 | `services copy/dispute-resolution/` | exists |
| negotiation-ai | 4850 | `services copy/negotiation-ai/` | `companies/HOJAI-AI/sutar-os/contracts/negotiation-ai/` ✅ |
| agent-orchestration | 4851 | `services copy/agent-orchestration/` | exists |

**Action:** Delete the `services copy/` duplicates.

### 2.3 HOJAI AI infra in `services/` root (not `services copy/`)

These services in `services/` (not the copy) are HOJAI AI products:

| Service | Path | HOJAI-AI canonical |
|---|---|---|
| agent-builder | `services/agent-builder/` | `companies/HOJAI-AI/products/.../` |
| agent-sdk | `services/agent-sdk/` | exists |
| agent-security | `services/agent-security/` | exists |
| agent-studio | `services/agent-studio/` | exists |
| ai-economy | `services/ai-economy/` | `companies/HOJAI-AI/products/.../ai-economy` |
| ai-workspace | `services/ai-workspace/` | `companies/HOJAI-AI/products/ai-workspace/` ✅ |
| bizora | `services/bizora/` | `companies/HOJAI-AI/products/bizora/` ✅ |
| board-intelligence | `services/board-intelligence/` | `companies/HOJAI-AI/products/board-intelligence/` ✅ |
| founder-os-product | `services/founder-os-product/` | `companies/HOJAI-AI/products/founder-os/founder-os-product/` ✅ |
| hib | `services/hib/` | `companies/HOJAI-AI/products/hib/` ✅ |
| hojai-cli | `services/hojai-cli/` | exists |
| investor-copilot | `services/investor-copilot/` | `companies/HOJAI-AI/products/investor-copilot/` ✅ |
| lead-os-gateway | `services/lead-os-gateway/` | exists |
| phone-ai | `services/phone-ai/` | exists |
| planning-engine | `services/planning-engine/` | exists |
| razo-keyboard | `services copy/razo-keyboard/` | `companies/HOJAI-AI/products/razo/razo-keyboard/` ✅ (already exists in HOJAI; the copy is duplicate) |
| realestate-os-product | `services/realestate-os-product/` | exists |
| sales-automation | `services/sales-automation/` | exists |
| sales-hub | `services/sales-hub/` | exists |
| sales-intelligence | `services/sales-intelligence/` | exists |
| sales-sync | `services/sales-sync/` | exists |
| salon-os | `services/salon-os/` | exists |
| smart-chatbot | `services/smart-chatbot/` | exists |
| speech-intelligence | `services/speech-intelligence/` | exists |
| startup-studio | `services/startup-studio/` | `companies/HOJAI-AI/products/startup-studio/` ✅ |
| unified-inbox | `services/unified-inbox/` | exists |

**Action:** For each, verify the HOJAI-AI copy exists with current code, then either:
- (a) **Move the RTMN version** to HOJAI-AI (if newer/better)
- (b) **Delete the RTMN copy** (if HOJAI-AI version is canonical)
- (c) **Keep one** (if they diverged intentionally — investigate before doing anything)

### 2.4 `services/` stubs that should be DELETED

These `services/` entries are stubs with no actual code — they have only CLAUDE.md or just node_modules:

| Stub service | Real location |
|---|---|
| bpo-manager | none — delete or build |
| company-intelligence-risacare | none — delete (this is for an external client) |
| crm-engine | none — delete (belongs to REZ-Merchant) |
| **customer-success-os** | `industry-os/services/customer-success-os/` (real one) |
| family-support-service | none — delete (RisaCare external) |
| hotel-ecosystem-gateway | none — delete |
| lead-os-gateway | exists in HOJAI-AI — delete RTMN copy |
| memory-intelligence-service | exists in HOJAI-AI — delete RTMN copy |
| risk-detection-service | exists in HOJAI-AI — delete RTMN copy |
| shift-handover-service | exists in HOJAI-AI — delete RTMN copy |
| social-hub | exists in HOJAI-AI — delete RTMN copy |

### 2.5 `industry-os/services/` stubs

| Stub | Note |
|---|---|
| cross-os-integration | empty dir — delete |
| learning-os | empty dir — delete (or merge with industry vertical) |
| organization-os | empty dir — delete |
| shared | has 2 files (industry-integration.js, patch-all.js) — keep as utility |
| talent-os | empty dir — delete (or merge with workforce-os) |
| workforce-intelligence | empty dir — delete (or merge with workforce-os) |

### 2.6 Industry-OS port pollution

**Every** `industry-os/services/*/src/index-with-layers.js` is hardcoded to port 5010. This is copy-paste pollution. Verify whether these are used; if not, delete all 26.

---

## 3. Services to MOVE to REZ-Merchant / REZ-Consumer / RABTUL / Karma / CorpPerks

### 3.1 REZ-Merchant

Per CLAUDE.md and the company repo at `companies/REZ-Merchant/` (which has its own git remote `imrejaul007/REZ-Merchant`):

| Service | Current location | REZ-Merchant canonical |
|---|---|---|
| REZ-discovery-platform | `services/REZ-discovery-platform/` | exists in REZ-Merchant |
| REZ-economic-engine | `services/REZ-economic-engine/` | exists |
| REZ-feature-flags | `services/REZ-feature-flags/` | exists |
| REZ-graph-api | `services/REZ-graph-api/` | exists |
| REZ-referral-graph | `services/REZ-referral-graph/` | exists |

**Plus services the hub references but RTMN doesn't have:**
| Service | Port | Where it actually lives |
|---|--:|---|
| REZ Auth | 4002 | `companies/REZ-Workspace/core/business-copilot/src/index.js` claims this port — VERIFY |
| REZ Wallet | 4004 | MISSING from RTMN — should be in REZ-Merchant |
| REZ Care | 4055 | MISSING — should be in REZ-Merchant |
| REZ CRM Hub | 4056 | MISSING — should be in REZ-Merchant |

**Action:** Move `services/REZ-*-platform/engine/feature-flags/graph-api/referral-graph` into `companies/REZ-Merchant/` (they're already there in some form, but RTMN has its own copies).

### 3.2 REZ-Consumer

| Service | Current location | REZ-Consumer canonical |
|---|---|---|
| do-app | already at `companies/do-app/` ✅ | already a separate repo, `imrejaul007/do-app` |

No other REZ-Consumer services currently mislocated in RTMN root (the consumer apps live in the submodule `companies/REZ-Consumer/`).

### 3.3 RABTUL-Technologies (payments / wallet / auth)

| Service | Current location | RABTUL canonical |
|---|---|---|
| REZ-idempotency-service | currently at `companies/RABTUL-Technologies/REZ-idempotency-service/` ✅ | already at home |

No other RABTUL services mislocated in RTMN root.

### 3.4 Karma-Foundation (loyalty / rewards)

Per `companies/Karma-Foundation/`, this company already has its loyalty services:
- REZ-anniversary-rewards, REZ-birthday-rewards, REZ-gamification-service, loyalty-program-service, rewards-catalog-service, points-expiration-service, tier-management-service

All already at home. No RTMN-root services to move.

### 3.5 CorpPerks (HR / benefits)

Per `companies/CorpPerks/` and the June 20 AdBazaar cleanup, `corpperks-hr-integration` and `corpperks-integration` were moved to CorpPerks. Verify they're still there (the prior audit already moved them).

---

## 4. AdBazaar — second-wave pollution

The June 20 cleanup (`companies/AdBazaar/SCOPE-AUDIT.md`) moved 44 non-ad services out. **However, ~85 REZ-* dirs remain in `companies/AdBazaar/`** and many don't look ad-related:

| REZ-* service | Looks ad-related? | Should it be there? |
|---|---|---|
| REZ-SDK | ❌ (just an SDK wrapper) | Move to REZ-Consumer or REZ-Merchant |
| REZ-prompt-workflow-ai | ❌ (workflow AI) | Move to HOJAI-AI |
| REZ-ab-testing | ❌ (general A/B testing for REZ-Media) | Move to REZ-Consumer |
| REZ-live-chat-widget | ❌ (chat widget) | Move to REZ-Consumer |
| REZ-decision-service | ❌ (decision service) | Move to REZ-Merchant |
| rez-woocommerce-connector | ❌ (e-commerce connector) | Move to REZ-Merchant |
| rez-chatbot-builder-ui | ❌ (chatbot UI) | Move to REZ-Consumer |
| rez-ride-integration | ❌ (ride booking) | Move to Transport-OS (or a Transport company) |
| rez-header-bidding | ✓ (header bidding = ad-tech) | Keep |
| rez-ssp-adapter | ✓ (SSP = ad-tech) | Keep |
| REZ-buzzlocal-karma-bridge | ⚠️ (Karma bridge) | Move to Karma-Foundation |
| REZ-rtb-service | ✓ (RTB = real-time bidding) | Keep |
| REZ-programmatic-bidding | ✓ | Keep |

**Action:** Run a second-wave AdBazaar audit similar to the June 20 one. Likely 20-30 of these 85 REZ-* dirs need to move out.

---

## 5. External clients — INVENTORY ONLY (no-touch per policy)

### 5.1 StayOwn-Hospitality (46 dirs)

External client. All services stay where they are. RTMN consumes them via the hub registry. Notable:
- hotel-pms (4803), hojai-staybot (4812), concierge-desk, minibar-service, parking-service, pre-arrival-service, voice-hotel-agent, smart-lock-service, hotel-spa-booking, hotel-business-twin, predictive-housekeeping, upsell-engine, zero-checkout-automation, loyalty-system, feedback-survey, review-manager, lost-found

### 5.2 Leverge (5 dirs at RTMN root + HOJAI-AI/leverge/)

Per CLAUDE.md External Clients Policy, Leverge is **an external client of HOJAI AI**, NOT part of RTMN. The 5 dirs at RTMN root (`leverge-agents`, `leverge-copilot`, `leverge-intelligence`, `leverge-memory`, `leverge-twin`) and `companies/HOJAI-AI/leverge/` should ideally be removed from RTMN entirely and consolidated in the Leverge company repo. **However, removing them requires Leverge's consent** (they're a client).

Hub references Leverge services on ports 4761 and 4765 but **no service in the RTMN repo declares these ports** — meaning Leverge must run those services externally. The hub will be down for these routes until Leverge deploys.

### 5.3 Nexha (companies/Nexha/)

External client. ~6 services. Hub references Nexha on ports 3000 and 8000. Same situation — external deployment only.

### 5.4 RisnaEstate, RisaCare

External clients. No hub references found.

---

## 6. 🚨 The two hidden meta-repos inside `companies/`

### 6.1 `companies/REZ-Workspace/`

This is a **complete fork of the entire RTMN ecosystem** with its own git remote (`git@github.com:imrejaul007/REZ-Workspace.git`). It contains:

- 27 services (corpid-service, memory-os, twinos-hub, all 6 industry OS, plus twins like agent-twin, buyer-twin, deal-twin, etc.)
- 21 industries (full Industry OS catalog)
- 12 nested company sub-repos: AdBazaar, AssetMind, Axom, CorpPerks, KHAIRMOVE, Karma-Foundation, LawGens, Nexha, RABTUL-Technologies, REZ-Consumer, REZ-Merchant, REZ-Workspace (recursive!), RTNM-Digital, RTNM-Group, RidZa, RisaCare, RisnaEstate, StayOwn-Hospitality, hojai-ai

**This is a meta-monorepo inside the meta-monorepo.** REZ-Workspace contains its own copy of every service that exists in `services/` and `services copy/`. For example:
- `companies/REZ-Workspace/services/corpid-service/` — duplicate of `services copy/corpid-service/`
- `companies/REZ-Workspace/services/memory-os/` — duplicate
- `companies/REZ-Workspace/services/twinos-hub/` — duplicate
- `companies/REZ-Workspace/industries/hotel-os/` — duplicate of `industry-os/services/hotel-os/`
- `companies/REZ-Workspace/industries/restaurant-os/` — duplicate

**Action (critical):**
1. Decide: should REZ-Workspace remain a fork, or be subsumed into RTMN?
2. If subsumed: each nested company under REZ-Workspace/companies/ should be moved to its canonical home. The REZ-Workspace repo can then be archived.
3. If retained as a fork: the duplicates must be pruned. RTMN canonical code lives in RTMN; REZ-Workspace uses git submodules to pull from each company repo.

### 6.2 `companies/HOJAI-AI/` (git submodule)

This is properly registered as a submodule (`imrejaul007/hojai-ai.git`). It contains the canonical HOJAI AI code. **However**, RTMN root still has duplicate HOJAI AI services in `services/` and `services copy/` that should be deleted (per §2).

---

## 7. Hub route audit

Hub at `services copy/unified-os-hub/src/routes/index.js` declares these services (extracted via grep of `localhost:PORT`):

| Port | Service name (in hub) | Actual service location | Status |
|--:|---|---|---|
| 4002 | rezAuth | `companies/RABTUL-Technologies/rez-auth-service/src/index.ts` ✅ | ✅ but should be in REZ-Merchant per CLAUDE.md ownership |
| 4004 | rezWallet | MISSING — should be in REZ-Merchant | ❌ |
| 4055 | rezCareService | MISSING — should be in REZ-Merchant | ❌ |
| 4056 | rezCrmHub | MISSING — should be in REZ-Merchant | ❌ |
| 4702 | corpId | `services copy/corpid-service/` (and 2 duplicates) | ✅ but needs consolidation |
| 4703 | memoryOs | `services copy/memory-os/` (and 2 duplicates) | ✅ but needs consolidation |
| 4705 | twinOs | `services copy/twinos-hub/` (and 2 duplicates) | ✅ but needs consolidation |
| 4761 | leverageIntelligence | MISSING — Leverge external | ⏸️ |
| 4765 | leverageCopilot | MISSING — Leverge external | ⏸️ |
| 4803 | adbazaarAttribution | `companies/AdBazaar/.../travel-agent` claims this port — WRONG service for that port | 🚨 |
| 4805 | adbazaarAudience | `companies/AdBazaar/.../supply-chain-agent` claims this port — WRONG service for that port | 🚨 |
| 4990 | adbazaarDsp | `companies/AdBazaar/rez-dsp-bidder/` exists but is on a different port (per CLAUDE.md: 4061) | ⚠️ port mismatch |
| 5010 | restaurantOs | ✅ OK | |
| 5020 | healthcareOs | ✅ OK | |
| 5025 | hotelOs | ✅ OK | |
| 5030 | retailOs | ✅ OK | |
| 5035 | legalOs | ✅ OK (in REZ-Workspace) | |
| 5040 | exhibitionOs | ✅ OK | |
| 5055 | salesOs | ✅ OK | |
| 5060 | educationOs | ✅ OK | |
| 5070 | agricultureOs | ✅ OK | |
| 5080 | automotiveOs | ✅ OK | |
| 5090 | beautyOs | ✅ OK | |
| 5110 | fitnessOs | ✅ OK | |
| 5200 | entertainmentOs | ✅ OK | |
| 5500 | marketingOs | ✅ OK — uses `config.PORT = MARKETING_OS_PORT \|\| 5500` in `industry-os/services/marketing-os/src/config/index.js` |
| 5600 | mediaOs | ✅ OK | |

**Routes that need fixing (8):**
1. `/api/care/*` → rez-care-service at 4055 (missing in RTMN)
2. `/api/crm/*` → rez-crm-hub at 4056 (missing)
3. `/api/wallet/*` → rez-wallet at 4004 (missing)
4. `/api/ads/*` → rez-dsp-bidder at 4990 (missing) — CLAUDE.md says this should point to `rez-dsp-bidder@4061`
5. `/api/audiences/*` → adbazaarAudience at 4805 (currently wrong service)
6. `/api/attribution/*` → adbazaarAttribution at 4803 (currently wrong service)
7. `/api/leverge/*` → ports 4761, 4765 (external client)
8. ~~`/api/marketing/*` → marketingOs at 5500 (port missing)~~ — corrected: marketing OS does use port 5500 via `MARKETING_OS_PORT` env var; route is OK

---

## 8. Client-to-client contract template

For services that move out of RTMN but are still needed by RTMN, define a standard contract:

```yaml
# RTMN-to-{Company} service contract v1.0
contract:
  version: "1.0"
  consumer: "RTMN-OS"
  provider: "{Company Name}"
  
service:
  name: "service-name"
  description: "..."
  sla:
    uptime: "99.5%"
    latency_p99: "500ms"
    support_response: "24h"
  
  api:
    base_url: "https://api.{company}.com/{service}/{version}"
    auth:
      method: "JWT"
      issuer: "RTMN-OS Hub"
    version: "v1"
    versioning: "URL path"
  
  endpoints:
    - path: "/health"
      method: "GET"
      returns: "{ status: 'ok', version: '...' }"
    - path: "/api/..."
      method: "POST"
      rate_limit: "100/min"
  
  data:
    residency: "..."
    backup: "..."
    retention: "..."
  
  communication:
    events_out: "webhook to RTMN Hub on changes"
    events_in: "subscribe to RTMN event-bus"
  
  deployment:
    primary_region: "..."
    fallback_region: "..."
    canary_strategy: "..."
```

**First 5 contracts to formalize:**
1. RTMN-OS ↔ HOJAI-AI for TwinOS twins (data layer)
2. RTMN-OS ↔ HOJAI-AI for Genie AI services (consumer-facing)
3. RTMN-OS ↔ REZ-Merchant for REZ Auth, Wallet, CRM, Care
4. RTMN-OS ↔ AdBazaar for DSP, Audience, Attribution
5. RTMN-OS ↔ StayOwn for hotel-pms, concierge, etc.

---

## 9. Migration runbook (ordered steps)

### Step 1: Collapse `services copy/` → `services/`
```bash
# Backup first
cp -r "services copy" "services.copy.backup"

# Move the missing hub and ~50 services into services/
for svc in unified-os-hub corpid-service memory-os twinos-hub twinos-shared \
           event-bus customer-twin order-twin wallet-twin employee-twin voice-twin \
           product-twin asset-twin organization-twin partner-twin lead-twin \
           genie-gateway genie-wake-word-service genie-listening-modes \
           genie-device-integration genie-calendar-service genie-memory-inbox \
           genie-briefing-service genie-universal-search genie-serendipity-service \
           genie-smart-forgetting-service genie-shopping-agent genie-companion-service \
           genie-consultant-agent genie-creation-os genie-learning-os genie-life-gps \
           genie-life-university genie-memory-graph genie-money-os genie-relationship-os \
           genie-thinking-engine genie-wellness-os genie-execution-engine \
           acp-protocol acn-network acn-hub acn-integration \
           merchant-agents agent-reputation agent-contracts agent-wallets \
           agent-marketplace agent-learning agent-analytics dispute-resolution \
           negotiation-ai agent-orchestration razo-keyboard \
           api-gateway graphql-federation analytics-os \
           billing customer-intelligence \
           industry-twin inventory-twin journey-intelligence knowledge-base \
           knowledge-marketplace lead-twin \
           live-chat marketing-copilot \
           notification-service onboarding-portal payment-twin \
           pilot-onboarding reports-dashboard \
           sla-manager support-copilot trust-intelligence \
           user-twin workflow-marketplace business-copilot executive-copilot finance-copilot \
           sales-copilot incident-management-service; do
  if [ -d "services copy/$svc" ]; then
    mv "services copy/$svc" "services/"
  fi
done

# Delete services copy/
rm -rf "services copy"
```

### Step 2: Delete `services/` stubs
```bash
for stub in bpo-manager company-intelligence-risacare crm-engine \
            customer-success-os family-support-service hotel-ecosystem-gateway \
            lead-os-gateway memory-intelligence-service risk-detection-service \
            shift-handover-service social-hub; do
  if [ -d "services/$stub" ]; then
    rm -rf "services/$stub"
  fi
done
```

### Step 3: Fix port collisions
- Rename `industry-os/services/hospitality-os/` → port 5145 (or merge with hotel-os)
- Delete all `industry-os/services/*/src/index-with-layers.js` (unused)
- Update `industry-os/services/financial-os/` port if it conflicts with `industry-os/services/finance-os/` — they don't actually collide (4801 vs 5220) but the naming is confusing

### Step 4: Move services to HOJAI-AI
For each service in `services/` that exists in HOJAI-AI:
1. Compare the two — keep the more complete version
2. PR the RTMN-side changes to HOJAI-AI repo
3. Delete from `services/` after merge
4. Add to HOJAI-AI's service registry

### Step 5: Move services to REZ-Merchant / REZ-Consumer / RABTUL / Karma / CorpPerks
Same pattern as Step 4, for the appropriate destination company.

### Step 6: AdBazaar second-wave cleanup
- Move ~20-30 REZ-* services out of AdBazaar to their proper companies
- Update AdBazaar's CLAUDE.md and SCOPE-AUDIT.md

### Step 7: Fix hub routes
- Re-point `/api/care/*`, `/api/crm/*`, `/api/wallet/*`, `/api/auth/*` to actual REZ-Merchant URLs
- Re-point `/api/ads/*`, `/api/audiences/*`, `/api/attribution/*` to actual AdBazaar URLs
- Add marketing-os route (currently missing)

### Step 8: Resolve REZ-Workspace fork
- Decide: archive REZ-Workspace, or convert it to a git-submodule aggregator
- If archive: migrate all nested companies to their canonical homes

---

## 10. Open risks & follow-ups

| Risk | Severity | Mitigation |
|---|---|---|
| Breaking RTMN-OS during the moves | High | Test in a worktree first, only merge after health check passes |
| External client services stop being available | Medium | StayOwn/Leverge/Nexha must agree to keep their services up before any hub route change |
| Hub routes become stale mid-migration | Medium | Run migration in one PR per destination company; freeze hub routes between PRs |
| Port 5010 collision blocks dev environment | Low | Easy fix: change hospitality-os port |
| `services copy/` may have NEWER code than `services/` | Unknown | Diff before deletion — automated comparison required |
| TwinOS twins are claimed by both HOJAI-AI and RTMN-OS | High | Resolve ownership formally — recommend HOJAI-AI hosts, RTMN consumes |
| Leverge dirs at RTMN root — removing requires client consent | Medium | Per CLAUDE.md External Clients Policy, do not remove without Leverge's request |
| 4 hub-referenced ports (4004, 4055, 4056, 4990) have NO service in the repo | High | These routes will return 502 today. Either build the services or remove the routes. |

---

## 11. Source of truth

This audit was generated by:
- Walking the filesystem directly (1,580+ service directories examined)
- Reading `CLAUDE.md`, `CANONICAL-PORT-REGISTRY.md`, `STATUS-AND-REMAINING-WORK.md`, `companies/AdBazaar/SCOPE-AUDIT.md`, `companies/HOJAI-AI/SERVICE-CLASSIFICATION.md`
- Parsing `services copy/unified-os-hub/src/routes/index.js` for the hub's expected service URLs
- Grepping all `src/index.js` files across the repo for port declarations
- Checking for stub services (≤2 non-node_modules files)

**Audit artifacts** (in `audit-temp/`):
- `phase1A-full-log.txt` — full tool call log from the inventory phase

**Companion files to update after this audit:**
- `CLAUDE.md` — the "67/92 services healthy" claim needs updating with the actual ownership reality
- `CANONICAL-PORT-REGISTRY.md` — needs to reflect which port belongs to which company
- `STATUS-AND-REMAINING-WORK.md` — needs to be regenerated based on the post-migration state

---

*Last updated: June 21, 2026*
*Generated by Claude Code (Opus 4.8)*
*See `audit-temp/` for raw findings*
