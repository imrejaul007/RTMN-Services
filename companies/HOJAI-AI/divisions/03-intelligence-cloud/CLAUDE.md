# Division 3 — AI Intelligence Cloud

> **Status:** 🟢 ~75% by breadth (53 intelligence services discovered, 5 with real source); 🟡 ~40% by depth (most are scaffolds or have dist/ only)
> **Owner:** HOJAI AI Applications team

---

## 1. Mission

**The brain.** Per-domain, per-industry, per-company intelligence modules. Each module is a specialized AI that knows one thing deeply (e.g. "Restaurant Intelligence" knows menu engineering, table turnover, kitchen economics). **Plus: Micro Intelligence as a per-app fallback strategy** so apps keep running even when the central HOJAI Intelligence is down.

## 2. Target State (per plan)

```
HOJAI Intelligence Cloud

General Intelligence
├── HOJAI Intelligence       (the meta-layer that orchestrates the rest)
├── Company Intelligence     (per-company — see sub-list below)
├── Industry Intelligence    (per-industry)
├── Department Intelligence  (per-department: sales, marketing, finance, etc.)
├── Executive Intelligence   (CXO-level strategic intelligence)
├── Personal Intelligence    (individual user intelligence — feeds into Genie)
├── Customer Intelligence    (CDP / LTV / churn / segment intelligence)
├── Commerce Intelligence    (orders, payments, returns, fraud)
├── Finance Intelligence     (P&L, cash flow, forecasting)
├── Marketing Intelligence   (campaigns, attribution, audience)
├── Sales Intelligence       (pipeline, forecasting, deal scoring)
├── HR Intelligence          (workforce analytics, attrition, hiring)
├── Operations Intelligence  (supply chain, logistics, incidents)
├── Manufacturing Intelligence (yield, quality, predictive maintenance)
├── Healthcare Intelligence  (clinical, claims, population health)
├── Retail Intelligence      (assortment, pricing, inventory)
├── Restaurant Intelligence  (menu, table, kitchen)
├── Hotel Intelligence       (occupancy, RevPAR, guest experience)
├── Travel Intelligence      (itinerary, pricing, demand)
├── Education Intelligence   (student performance, curriculum)
├── Legal Intelligence       (contracts, compliance, case law)
├── Micro Intelligence       (per-app local AI fallback — see section 8 below)
├── Predictive Intelligence  (forecasting models across domains)
├── Decision Intelligence    (decision support / recommendation)
├── Behavior Intelligence    (user behavior modeling)
├── Recommendation Intelligence (collaborative filtering, content recs)
├── Risk Intelligence        (fraud, churn, credit, compliance risk)
└── Network Intelligence     (relationship graphs, social network analysis)

Company Intelligence (sub-list)
├── REZ Intelligence
├── Bizora Intelligence
├── AdBazaar Intelligence
├── Nexha Intelligence
├── RABTUL Intelligence
├── AssetMind Intelligence
├── CorpPerks Intelligence
├── StayOwn Intelligence
├── BuzzLocal Intelligence
├── RisaCare Intelligence
├── Rendez Intelligence
├── Airzy Intelligence
└── Karma Intelligence
```

**That's 26+ general intelligence modules + 14 company variants = 40+ intelligence services.**

## 3. Current State — What's Actually Built

### A. General Intelligence (the 5 plan-style modules that exist)

| Module | Service | Port | State |
|---|---|---|---|
| HOJAI Intelligence (general, thin) | [services/ai-intelligence/](../../../services/ai-intelligence/) | 4881 | 🟡 Thin (single file) |
| HOJAI Intelligence (rich, recovered) | [companies/HOJAI-AI-restored/hojai-intelligence/](../../HOJAI-AI-restored/hojai-intelligence/) | 4881 | 🟡 Recovered, not running |
| Customer Intelligence (thin) | [services/customer-intelligence/](../../../services/customer-intelligence/) | 4885 | 🟡 Thin |
| Customer Intelligence (rich) | [companies/HOJAI-AI-restored/hojai-customer-intelligence/](../../HOJAI-AI-restored/hojai-customer-intelligence/) | 4885 | 🟡 Recovered (full Mongoose models) |
| Sales Intelligence | [services/sales-intelligence/](../../../services/sales-intelligence/) | 5181 | ✅ Real |
| Journey Intelligence | [services/journey-intelligence/](../../../services/journey-intelligence/) | 4954 | ✅ Real |
| Memory Intelligence | [services/memory-intelligence-service/](../../../services/memory-intelligence-service/) | — | ✅ Real |
| Trust Intelligence | [services/trust-intelligence/](../../../services/trust-intelligence/) | — | ✅ Real |

### B. Department Intelligence (existing as Department OS)

| Module | Service | Port | State |
|---|---|---|---|
| CXO Intelligence | [industry-os/services/cxo-os/](../../../industry-os/services/cxo-os/) | 5100 | ✅ Real |
| Customer Success Intelligence | [industry-os/services/customer-success-os/](../../../industry-os/services/customer-success-os/) | 4050 | ✅ Real |
| Sales Intelligence (OS) | [industry-os/services/sales-os/](../../../industry-os/services/sales-os/) | 5055 | ✅ Real (22 agents) |
| Marketing Intelligence (OS) | [industry-os/services/marketing-os/](../../../industry-os/services/marketing-os/) | 5500 | ✅ Real (15 agents) |
| Finance Intelligence | [industry-os/services/finance-os/](../../../industry-os/services/finance-os/) | 4801 | ✅ Real |
| Operations Intelligence | [industry-os/services/operations-os/](../../../industry-os/services/operations-os/) | 5250 | ✅ Real |
| Procurement Intelligence | [industry-os/services/procurement-os/](../../../industry-os/services/procurement-os/) | 5096 | ✅ Real |
| Workforce Intelligence | [industry-os/services/workforce-os/](../../../industry-os/services/workforce-os/) + [industry-os/services/workforce-intelligence/](../../../industry-os/services/workforce-intelligence/) | 5077 | ✅ Real |
| Revenue Intelligence | [industry-os/services/revenue-intelligence-os/](../../../industry-os/services/revenue-intelligence-os/) | 5400 | ✅ Real |

### C. Company Intelligence — **THE BIG FIND**

I originally wrote that "0 Company Intelligences are built" — that was wrong. After a deeper search, I found **53 intelligence-related directories** across the company folders. Many of these ARE Company Intelligence services under different names.

### Important Correction (2026-06-19, after user clarification)

The structure of "Company Intelligence" is **more nuanced than the plan implies**. There are TWO categories:

1. **HOJAI AI-built intelligence** that one company (like AdBazaar) consumes as a product. **REZ Atlas is AdBazaar's product, but the intelligence inside it comes from HOJAI AI.** So REZ Atlas is not a "Company Intelligence" — it's a Company Product that uses HOJAI Intelligence.

2. **Per-company intelligence implementations** built by each company themselves (REZ has its own merchant-intelligence-service, AssetMind has its own, RisnaEstate has its own, etc.).

The plan listed "Company Intelligence" as if each company had its own intelligence layer. The reality is more like: **HOJAI AI provides the intelligence; each company product wraps it for their domain.**

#### C.1 REZ Atlas — AdBazaar product that USES HOJAI Intelligence

**REZ Atlas is an AdBazaar product** (lives under `companies/RTNM-Digital/REZ-SalesMind/` and `companies/AdBazaar/REZ-*`). The 11 atlas-intelligence sub-services are **AdBazaar's implementation of how to apply HOJAI Intelligence** to ads/sales/campaigns.

| Service | Port | Owner | Role |
|---|---|---|---|
| [atlas-intelligence-core](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence-core/) | 5300 | AdBazaar | AI analytics hub (wraps HOJAI Intelligence) |
| [atlas-intelligence-customer](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence-customer/) | 5340 | AdBazaar | Customer 360 profiles (wraps HOJAI Customer Intelligence) |
| [atlas-intelligence-forecast](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence-forecast/) | 5310 | AdBazaar | Revenue forecasting (calls HOJAI Predictive) |
| [atlas-intelligence-competitor](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence-competitor/) | 5320 | AdBazaar | Market/competitor intelligence |
| [atlas-intelligence-market](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence-market/) | 5330 | AdBazaar | Trend analysis |
| [atlas-intelligence-pricing](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence-pricing/) | 5360 | AdBazaar | Dynamic pricing |
| [atlas-intelligence-signal](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence-signal/) | 5370 | AdBazaar | Opportunity signal detection |
| [atlas-intelligence-opportunity](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence-opportunity/) | 5380 | AdBazaar | AI lead scoring |
| [atlas-intelligence-assistant](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence-assistant/) | 5390 | AdBazaar | Conversational AI |
| [atlas-intelligence-predictive](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence-predictive/) | 5395 | AdBazaar | Churn + risk prediction |
| [atlas-intelligence](../../../companies/REZ-Merchant/REZ-atlas-v2/atlas-intelligence/) | 5160 | AdBazaar | Business intelligence hub |

**Pattern:** AdBazaar builds domain-specific wrappers around HOJAI Intelligence. This is the "company-as-product-builder" model.

#### C.2 Per-Company Intelligence implementations (each company builds its own)

| Company | Service | Source files | Description |
|---|---|---|---|
| **HOJAI** | [companies/HOJAI-AI-restored/hojai-customer-intelligence/](../../HOJAI-AI-restored/hojai-customer-intelligence/) | 16 .ts | Customer Data Platform (CDP) — the master CDP template |
| **HOJAI** | [companies/HOJAI-AI-restored/hojai-intelligence/](../../HOJAI-AI-restored/hojai-intelligence/) | 11 .ts | HOJAI Intelligence Layer (the central intelligence brain) |
| **REZ** | [companies/REZ-Merchant/rez-merchant-intelligence-service/](../../../companies/REZ-Merchant/rez-merchant-intelligence-service/) | 29 .ts | Business operations analytics + insights |
| **REZ** | [companies/REZ-Merchant/rez-merchant-intelligence-aggregator/](../../../companies/REZ-Merchant/rez-merchant-intelligence-aggregator/) | 20 .ts | Cross-merchant analytics + benchmarking |
| **REZ** | [companies/REZ-Merchant/REZ-competitive-intelligence/](../../../companies/REZ-Merchant/REZ-competitive-intelligence/) | 8 .ts | Market analysis + competitor tracking |
| **AssetMind** | [companies/AssetMind/codebase/assetmind-intelligence/](../../../companies/AssetMind/codebase/assetmind-intelligence/) | (yes — config/, docker/, scripts/, src/) | Asset intelligence |
| **RisnaEstate** | [companies/RisnaEstate/services/risna-intelligence-service/](../../../companies/RisnaEstate/services/risna-intelligence-service/) | (yes — src/) | Real estate intelligence |

**That's 4 companies (HOJAI, REZ, AssetMind, RisnaEstate) with real Intelligence source code = 7+ standalone intelligence services with actual implementations.**

Note: REZ is doing BOTH — it has 11 AdBazaar-style wrappers (atlas-intelligence-*) AND 2 standalone per-company intelligence services (rez-merchant-intelligence-*). The standalone ones are used by REZ-Merchant (the merchant side); the wrappers are used by AdBazaar (the ads side).

#### C.2 Company Intelligences that exist as scaffolds (have dist/ or only node_modules, no src/)

| Company | Service | Description |
|---|---|---|
| **AdBazaar** | [companies/AdBazaar/REZ-intelligence-bridge/](../../../companies/AdBazaar/REZ-intelligence-bridge/) | Bridge between AdBazaar and REZ intelligence |
| **AdBazaar** | [companies/AdBazaar/REZ-lead-intelligence/](../../../companies/AdBazaar/REZ-lead-intelligence/) | Lead intelligence for ads |
| **AdBazaar** | [companies/AdBazaar/adbazaar-intelligence-graph/](../../../companies/AdBazaar/adbazaar-intelligence-graph/) | Ad intelligence graph |
| **AdBazaar** | [companies/AdBazaar/adbazaar-revenue-intelligence/](../../../companies/AdBazaar/adbazaar-revenue-intelligence/) | Revenue intelligence for ads |
| **Axom** | [companies/Axom/REZ-emotional-intelligence/](../../../companies/Axom/REZ-emotional-intelligence/) | Emotional intelligence |
| **Axom** | [companies/Axom/buzzlocal-services/buzzlocal-intelligence-hub/](../../../companies/Axom/buzzlocal-services/buzzlocal-intelligence-hub/) | Buzzlocal AI hub |
| **Axom** | [companies/Axom/buzzlocal-services/buzzlocal-intelligence-service/](../../../companies/Axom/buzzlocal-services/buzzlocal-intelligence-service/) | Buzzlocal intelligence |
| **CorpPerks** | [companies/CorpPerks/corpperks-intelligence/](../../../companies/CorpPerks/corpperks-intelligence/) | HR perks intelligence |
| **RABTUL** | [companies/RABTUL-Technologies/REZ-buzzlocal-intelligence/](../../../companies/RABTUL-Technologies/REZ-buzzlocal-intelligence/) | RABTUL's Buzzlocal AI |
| **RABTUL** | [companies/RABTUL-Technologies/REZ-cod-intelligence/](../../../companies/RABTUL-Technologies/REZ-cod-intelligence/) | Cash-on-delivery intelligence |
| **RABTUL** | [companies/RABTUL-Technologies/REZ-contract-intelligence-ui/](../../../companies/RABTUL-Technologies/REZ-contract-intelligence-ui/) | Contract intelligence UI |
| **RABTUL** | [companies/RABTUL-Technologies/REZ-corpperks-intelligence/](../../../companies/RABTUL-Technologies/REZ-corpperks-intelligence/) | CorpPerks AI |
| **RABTUL** | [companies/RABTUL-Technologies/REZ-pos-intelligence/](../../../companies/RABTUL-Technologies/REZ-pos-intelligence/) | POS intelligence |
| **RABTUL** | [companies/RABTUL-Technologies/REZ-stayown-intelligence/](../../../companies/RABTUL-Technologies/REZ-stayown-intelligence/) | StayOwn hospitality AI |
| **RisnaEstate** | [companies/RisnaEstate/services/risna-property-intelligence/](../../../companies/RisnaEstate/services/risna-property-intelligence/) | Property intelligence |
| **REZ** | [companies/REZ-Merchant/REZ-atlas/REZ-atlas-web-intelligence/](../../../companies/REZ-Merchant/REZ-atlas/REZ-atlas-web-intelligence/) | Web intelligence |
| **REZ** | [companies/REZ-Merchant/industry-os/hotel-os/intelligence/](../../../companies/REZ-Merchant/industry-os/hotel-os/intelligence/) | Hotel intelligence (the hotel-OS-specific one) |
| **AdBazaar** | [companies/AdBazaar/shared/rez-intelligence-client/](../../../companies/AdBazaar/shared/rez-intelligence-client/) | Client SDK for REZ intelligence |
| **REZ** | [companies/REZ-Consumer/src/services/rez-intelligence.ts](../../../companies/REZ-Consumer/src/services/rez-intelligence.ts) | Client lib that calls external rezapp.com |

**That's ~20 more intelligence-shaped services as scaffolds.**

### D. Industry Intelligence

Industry intelligence currently lives **inside each Industry OS** (Division 9). The plan lists 16 industry-specific intelligences (Restaurant, Hotel, Healthcare, Retail, etc.) — these are not separate services but modules within the Industry OS.

**Verdict:** 5 real intelligence services today + ~20 scaffolds + lots of doc + lots of duplication across companies = **the picture is messy but not empty**.

## 4. What's NOT Built

### Of the 26 general intelligence modules in your plan:

- ✅ Have a real implementation: **7** (HOJAI Intell rich, Customer Intell rich, Sales, Journey, Memory, Trust, plus the 2 thin `/services/` versions)
- 🟡 Department OS-as-intelligence: **9** (CXO, CS, Sales OS, Marketing OS, Finance, Operations, Procurement, Workforce, Revenue)
- 🟡 Real Company Intelligence (REZ/AssetMind/RisnaEstate): **~17 services** in code
- 🟡 Scaffold-only Company Intelligence (AdBazaar/Axom/CorpPerks/RABTUL/RisnaEstate): **~20 services** with dist/ but no src/
- ❌ Don't exist: 10 (Commerce, Manufacturing, Healthcare, Retail, Restaurant, Hotel, Travel, Education, Legal, Predictive, Decision, Behavior, Recommendation, Risk, Network)

### Of the 14 plan-listed Company Intelligences:

After the user clarification, "Company Intelligence" really means one of two things:
1. A company-specific implementation of HOJAI Intelligence (e.g. AssetMind Intelligence)
2. A company product that wraps HOJAI Intelligence (e.g. REZ Atlas from AdBazaar)

| Company in plan | Status in repo |
|---|---|
| REZ Intelligence | ✅ Real — `companies/REZ-Merchant/rez-merchant-intelligence-service` + 2 standalone REZ services |
| Bizora Intelligence | ❌ Not built (Bizora itself is a HOJAI AI product in Division 8, not a Company Intelligence) |
| AdBazaar Intelligence | 🟡 Implemented as REZ Atlas (11 services) — AdBazaar product using HOJAI Intelligence |
| Nexha Intelligence | ❌ Not built |
| RABTUL Intelligence | 🟡 Scaffold — 5 REZ-*-intelligence dirs under RABTUL |
| AssetMind Intelligence | ✅ Real — `companies/AssetMind/codebase/assetmind-intelligence` |
| CorpPerks Intelligence | 🟡 Scaffold — `companies/CorpPerks/corpperks-intelligence` |
| StayOwn Intelligence | 🟡 Scaffold — `companies/RABTUL-Technologies/REZ-stayown-intelligence` |
| BuzzLocal Intelligence | 🟡 Scaffold — `companies/Axom/buzzlocal-services/buzzlocal-intelligence-*` |
| RisaCare Intelligence | ❌ Not built |
| Rendez Intelligence | ❌ Not built |
| Airzy Intelligence | ❌ Not built |
| Karma Intelligence | ❌ Not built |

**Verdict: 3 standalone implementations built (REZ, AssetMind, RisnaEstate), 5 scaffolds, 5 not built.** Note: Bizora Intelligence was a duplicate of Bizora product — removed from Company Intelligence list.

## 5. Gap Score

- **By breadth:** ~80% (53 intelligence directories found vs your plan's 26 modules + 14 companies = 40)
- **By depth:** ~40% (only ~4 companies have real source code, the rest are scaffolds)

**CORRECTION from previous audit:** I originally said "0 Company Intelligences are built" and "~30% coverage". Both were wrong. The reality is **~80% by breadth, ~40% by depth**. The intelligence services DO exist — they're just scattered across company folders, have inconsistent naming (mostly `REZ-*-intelligence`), and most don't have real source code yet.

**Pattern:** Companies mostly consume HOJAI Intelligence rather than build their own. AdBazaar wraps it as REZ Atlas. REZ-Merchant has some standalone ones. Other companies haven't started yet.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **Replace thin `ai-intelligence` (4881) with recovered HOJAI Intelligence** | 🔴 P0 | 1 week — wire it up, run it |
| 2 | **Replace thin `customer-intelligence` (4885) with recovered version** | 🔴 P0 | 1 week |
| 3 | **Consolidate the 11 AdBazaar REZ Atlas intelligence services** into a unified `services/rez-atlas-intelligence` (or accept them as-is and document the layering) | 🟡 P1 | 4 weeks |
| 4 | **Promote AdBazaar scaffolds to real implementations** (4 services) | 🟡 P1 | 8 weeks |
| 5 | **Promote Axom BuzzLocal scaffolds to real implementations** (3 services) | 🟡 P1 | 6 weeks |
| 6 | **Promote RABTUL scaffolds to real implementations** (5 REZ-*-intelligence services) | 🟡 P1 | 10 weeks |
| 7 | **Promote CorpPerks intelligence** | 🟢 P2 | 4 weeks |
| 8 | **Build missing 5 standalone Company Intelligences** (Nexha, RisaCare, Rendez, Airzy, Karma — note: Bizora removed, see Open Questions) | 🟢 P2 | 4 weeks each |
| 9 | **Build standalone Industry Intelligence modules** (Restaurant Intelligence, Hotel Intelligence, etc. as separate services from Industry OS) | 🟢 P2 | 6-8 weeks each — debatable, see Open Questions |
| 10 | **Predictive Intelligence** (forecasting service) | 🟢 P2 | 6 weeks |
| 11 | **Risk Intelligence** (fraud/churn/credit) | 🟢 P2 | 6 weeks |
| 12 | **Decision Intelligence** (recommendation engine) | 🟢 P2 | 8 weeks |
| 13 | **Behavior Intelligence** (user behavior modeling) | 🟢 P2 | 8 weeks |

## 7. Dependencies

- **Depends on:** Division 2 (MemoryOS for episodic memory, TwinOS for customer/employee twins, Knowledge Graph for domain ontologies, Vector Engine for retrieval)
- **Blocks:** Division 8 (Products call intelligences), Division 9 (Industry Solutions use intelligence templates)

## 8. Micro Intelligence (clarified)

Per the user's clarification: **Micro Intelligence is a strategy pattern, not a single service.**

**Definition:** Micro Intelligence = per-app embedded AI fallback. Each HOJAI AI product (Genie, Razo, Sales Copilot, Marketing Copilot, etc.) embeds a lightweight local AI logic that keeps the app working even when the central HOJAI Intelligence (port 4881) is unavailable.

**How it works:**
- Each app has its own embedded AI logic (rules + small ML + cached intelligence)
- A circuit-breaker pattern detects when the central HOJAI is down
- Falls back to local logic transparently
- When central comes back online, sync local state back up

**What's needed to implement:**
1. A circuit-breaker library (Hystrix-style, or `opossum` for Node.js)
2. Per-app local AI rules (cached snapshots from HOJAI Intelligence)
3. Health check + auto-failover logic
4. Sync queue for state reconciliation

**Where it lives in the docs:**
- This is a **cross-cutting pattern**, not a service
- Document it in each app's CLAUDE.md under "Failure Mode" section
- The reference implementation lives in `services/ai-intelligence` (the central HOJAI Intelligence) with a fallback path

**Status:** ~0% implemented today (no circuit breakers, no fallback logic). Pattern is defined; needs build-out.

## 9. Open Questions

1. **Department Intelligence vs Department OS:** Currently the Department OS (Sales OS, Marketing OS, etc.) *contains* intelligence. Should "Department Intelligence" be a separate service that Department OS calls, or just a label for the AI agents inside Department OS? My take: just a label — the AI agents inside the Department OS ARE the intelligence.
2. **Company Intelligence consolidation:** With 5 companies each having 1-11 intelligence services, should there be ONE canonical "Company Intelligence Template" that all companies instantiate? Or each company hand-rolls? Templating is faster but less differentiated.
3. **Industry Intelligence vs Industry Solutions:** Same question as above. Industry OS at Division 9 will have AI built in — does "Industry Intelligence" mean anything separate? My take: no — Industry Intelligence = the AI inside Industry OS.
4. **REZ Atlas v2 vs the merchant-intelligence-service:** REZ has two parallel intelligence stacks (`rez-merchant-intelligence-service` for the merchant side, `REZ-atlas-v2/atlas-intelligence-*` for the ads/sales side). Per user clarification, **atlas is AdBazaar's product that uses HOJAI Intelligence**. The merchant-intelligence-service is REZ-Merchant's own standalone intelligence. They serve different masters — Atlas is for AdBazaar ad ops, the merchant one is for REZ merchant ops.
5. **Bizora:** Per user clarification, **Bizora is a HOJAI AI standalone product** (like SUTAR OS) — it's the Enterprise AI Workspace. NOT a Company Intelligence. Removed from the Company Intelligence list.
6. **Micro Intelligence library choice:** `opossum` (Node.js circuit breaker) is the obvious pick. Confirm or pick alternative.

---

*See also: [services/ai-intelligence/CLAUDE.md](../../../services/ai-intelligence/CLAUDE.md), [services/customer-intelligence/CLAUDE.md](../../../services/customer-intelligence/CLAUDE.md), [companies/HOJAI-AI-restored/hojai-intelligence/CLAUDE.md](../../HOJAI-AI-restored/hojai-intelligence/CLAUDE.md), [docs/sutar-os/](../../../docs/sutar-os/) (separate SUTAR OS division)*