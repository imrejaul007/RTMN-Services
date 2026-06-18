# Division 3 — AI Intelligence Cloud

> **Status:** 🟡 ~30% built (5 general intelligences; 0 industry-specific; 0 company-specific)
> **Owner:** HOJAI AI Applications team

---

## 1. Mission

**The brain.** Per-domain, per-industry, per-company intelligence modules. Each module is a specialized AI that knows one thing deeply (e.g. "Restaurant Intelligence" knows menu engineering, table turnover, kitchen economics).

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
├── Micro Intelligence       (per-micro-service / per-API observability AI)   ⚠️ see Open Questions
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

**That's 26+ intelligence modules + 14 company variants = 40+ intelligence services.**

## 3. Current State — What's Built

| Module | Service | Port | State |
|---|---|---|---|
| HOJAI Intelligence (general) | [services/ai-intelligence/](../../../services/ai-intelligence/) | 4881 | 🟡 Thin (single file) |
| HOJAI Intelligence (rich version) | [companies/HOJAI-AI-restored/hojai-intelligence/](../../HOJAI-AI-restored/hojai-intelligence/) | 4881 | 🟡 Recovered, not running |
| Customer Intelligence (thin) | [services/customer-intelligence/](../../../services/customer-intelligence/) | 4885 | 🟡 Thin |
| Customer Intelligence (rich) | [companies/HOJAI-AI-restored/hojai-customer-intelligence/](../../HOJAI-AI-restored/hojai-customer-intelligence/) | 4885 | 🟡 Recovered (full Mongoose models) |
| Sales Intelligence | [services/sales-intelligence/](../../../services/sales-intelligence/) | 5181 | 🟡 Real |
| Journey Intelligence | [services/journey-intelligence/](../../../services/journey-intelligence/) | 4954 | 🟡 Real |
| Memory Intelligence | [services/memory-intelligence-service/](../../../services/memory-intelligence-service/) | — | 🟡 Real |
| Trust Intelligence | [services/trust-intelligence/](../../../services/trust-intelligence/) | — | 🟡 Real |
| CXO OS (Executive Intelligence) | [industry-os/services/cxo-os/](../../../industry-os/services/cxo-os/) | 5100 | ✅ Real |
| Customer Success OS (CS Intelligence) | [industry-os/services/customer-success-os/](../../../industry-os/services/customer-success-os/) | 4050 | ✅ Real |
| Sales OS (Sales Intelligence) | [industry-os/services/sales-os/](../../../industry-os/services/sales-os/) | 5055 | ✅ Real (22 agents) |
| Marketing OS (Marketing Intelligence) | [industry-os/services/marketing-os/](../../../industry-os/services/marketing-os/) | 5500 | ✅ Real (15 agents) |
| Finance OS (Finance Intelligence) | [industry-os/services/finance-os/](../../../industry-os/services/finance-os/) | 4801 | ✅ Real |
| Operations OS (Ops Intelligence) | [industry-os/services/operations-os/](../../../industry-os/services/operations-os/) | 5250 | ✅ Real |
| Procurement OS (Procurement Intelligence) | [industry-os/services/procurement-os/](../../../industry-os/services/procurement-os/) | 5096 | ✅ Real |
| Workforce OS (HR Intelligence) | [industry-os/services/workforce-os/](../../../industry-os/services/workforce-os/) | 5077 | ✅ Real |
| Revenue Intelligence OS | [industry-os/services/revenue-intelligence-os/](../../../industry-os/services/revenue-intelligence-os/) | 5400 | ✅ Real |

## 4. What's NOT Built

Of the 26 general intelligence modules in your plan:
- ✅ Have some form: 12 (Sales, Marketing, Finance, Operations, Procurement, Workforce, CXO, Customer, Sales-Intell, Journey, Memory, Trust)
- 🟡 Thin/scaffolded: 4 (HOJAI Intelligence, Customer Intelligence, the recovered versions not running)
- ❌ Don't exist: 10 (Commerce, Manufacturing, Healthcare, Retail, Restaurant, Hotel, Travel, Education, Legal, **Micro**, Predictive, Decision, Behavior, Recommendation, Risk, Network)

Of the 14 company intelligences: **0 built.** Even REZ Intelligence (the most obvious) is just a client library in [companies/REZ-Consumer/src/services/rez-intelligence.ts](../../../companies/REZ-Consumer/src/services/rez-intelligence.ts) that calls external rezapp.com endpoints.

## 5. Gap Score

**~30% of target state is built** if you count the department-OS-as-intelligence interpretation. But strictly per your plan's 26 modules: ~15%.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **Replace thin `ai-intelligence` (4881) with recovered HOJAI Intelligence** | 🔴 P0 | 1 week — wire it up, run it |
| 2 | **Replace thin `customer-intelligence` (4885) with recovered version** | 🔴 P0 | 1 week |
| 3 | **Commerce Intelligence** (orders/payments/fraud) | 🟡 P1 | 4 weeks |
| 4 | **Predictive Intelligence** (forecasting service) | 🟡 P1 | 6 weeks |
| 5 | **Risk Intelligence** (fraud/churn/credit risk) | 🟡 P1 | 6 weeks |
| 6 | **Decision Intelligence** (recommendation engine) | 🟡 P1 | 8 weeks |
| 7 | **Behavior Intelligence** (user behavior modeling) | 🟢 P2 | 8 weeks |
| 8 | **REZ Intelligence** (company intelligence template) | 🟢 P2 | 4 weeks (build the template, then clone for others) |
| 9 | **14 other company intelligences** | 🟢 P2 | 2 weeks each (templated) |
| 10 | **16 remaining industry-specific intelligences** | 🟢 P2 | 2-4 weeks each |

## 7. Dependencies

- **Depends on:** Division 2 (MemoryOS for episodic memory, TwinOS for customer/employee twins, Knowledge Graph for domain ontologies, Vector Engine for retrieval)
- **Blocks:** Division 8 (Products call intelligences), Division 9 (Industry Solutions use intelligence templates)

## 8. Open Questions

- **Micro Intelligence:** This is listed in your plan but I searched the entire repo and **it doesn't exist anywhere** — no code, no docs, no commit history. Three possibilities:
  1. You mean **Memory Intelligence** ([services/memory-intelligence-service/](../../../services/memory-intelligence-service/))?
  2. You mean a per-micro-service AI for observability (Datadog-style but AI-powered)?
  3. It's aspirational.
  **Please clarify** or rename in your plan.
- **Department Intelligence vs Department OS:** Currently the Department OS (Sales OS, Marketing OS, etc.) *contains* intelligence. Should "Department Intelligence" be a separate service that Department OS calls, or just a label for the AI agents inside Department OS?
- **Company Intelligence templating:** Should all 14 company intelligences share a single template (REZ Intelligence template, AdBazaar fills it in, etc.) or each be hand-crafted? Templating is faster but less differentiated.
- **Industry Intelligence vs Industry Solutions:** Same question. Industry OS at Division 9 will have AI built in — does "Industry Intelligence" mean anything separate?

---

*See also: [services/ai-intelligence/CLAUDE.md](../../../services/ai-intelligence/CLAUDE.md), [services/customer-intelligence/CLAUDE.md](../../../services/customer-intelligence/CLAUDE.md), [companies/HOJAI-AI-restored/hojai-intelligence/CLAUDE.md](../../HOJAI-AI-restored/hojai-intelligence/CLAUDE.md)*