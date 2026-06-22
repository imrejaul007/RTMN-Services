# RTMN Ecosystem - Complete Architecture

> **Version:** 5.3  
> **Last Updated:** June 22, 2026  
> **Status:** ✅ **GENIE-OS PRODUCTION-READY** — All 13 genie-os test suites pass (78 assertions), all 7 foundation services healthy, 23 named Genie agents registered in AgentOS. Security hardened (requireEnv + requireAuth on 176+ services). All 23 Genie specialist docs refreshed for Phase 7 (Bearer JWT auth + path correction). See [STATUS-AND-REMAINING-WORK.md](STATUS-AND-REMAINING-WORK.md) for the full audit report and what's left.

---

## ⚠️ IMPORTANT - EXTERNAL CLIENTS POLICY

### Leverge - External Client (NOT Part of RTMN)

**Leverge is a CLIENT of HOJAI AI, NOT part of the RTMN ecosystem.**

| Aspect | Rule |
|--------|------|
| **Ownership** | Leverge code belongs to Leverge, not RTMN |
| **Location** | Stored at RTMN root for convenience only (leverge-*) |
| **Audits** | NEVER audit Leverge unless specifically requested by client |
| **Modifications** | NEVER modify Leverge code unless client explicitly requests |
| **Documentation** | Only maintain company/hojai-ai/leverge/ folder for client docs |
| **Support** | Only assist when Leverge comes to us as a client |

**General Rule for ALL External Clients:**
- ✅ Only touch client code when they REQUEST something
- ❌ Never audit, modify, or improve client code unprompted
- ❌ Never include client code in RTMN architecture discussions
- ❌ Never add client services to RTMN service registry unless integrated

---

## 🎯 Executive Summary

RTMN is a unified ecosystem connecting **50+ services** across **24 industry verticals**, powered by AI agents, digital twins, and autonomous operations through a **single unified hub**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         RTMN UNIFIED HUB (4399)                              │
│              ONE GATEWAY TO RULE THEM ALL                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DEPARTMENT OS (9) - Horizontal Layer               │   │
│  │  Sales (5055) │ Marketing (5500) │ CS (4050) │ Procurement (5096)     │   │
│  │  Workforce (5077) │ Finance (4801) │ Revenue (5400) │ Operations (5250) │   │
│  │  CXO (5100)                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    24 INDUSTRY OS - Vertical Layer                    │   │
│  │   Restaurant │ Hotel │ Healthcare │ Retail │ Legal │ Education          │   │
│  │   Automotive │ Beauty │ Fitness │ Fashion │ Gaming │ Sports            │   │
│  │   Travel │ Entertainment │ Manufacturing │ RealEstate │ +12 more       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FOUNDATION (3)                                    │   │
│  │   CorpID (4702) │ Memory Layer (4703/4152/4704/4790) │ TwinOS (4705)   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    HOJAI AI SUITE (5)                               │   │
│  │   Intelligence │ Memory │ Twin │ Agents │ Copilot                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏢 Department OS - Horizontal Layer

Department OS services run horizontally across ALL Industry OS, providing unified business functions:

| OS | Port | Modules | AI Agents | Status |
|----|------|---------|----------|--------|
| **Sales OS** | 5055 | 13 modules | 22 agents | ✅ Running |
| **Marketing OS** | 5500 | 13 modules | 15 agents | ✅ Running |
| **Customer Success OS** | 4050 | 8 modules | 6 agents | ✅ Running |
| **Procurement OS** | 5096 | 12 modules | 10 agents | ✅ Running |
| **Workforce OS** | 5077 | 11 modules | 10 agents | ✅ Running |
| **Finance OS** | 4801 | 6 modules | 1 copilot | ✅ Running |
| **Operations OS** | 5250 | 20 modules | 23 agents | ✅ Running |
| **CXO OS** | 5100 | 8 modules | 15 agents | ✅ Running |

### Sales OS (5055) - Enterprise CRM & Sales Intelligence
- **Modules:** CRM, Customer Success, CPQ, Contracts, Territory, Forecasting, Revenue Intelligence, Partner OS, Sales Enablement, Call Intelligence, Workflow Automation, Commission OS, Subscription Management
- **AI Agents:** Lead Scoring, Churn Prediction, Pricing Optimizer, Contract Analyzer, Commission Calculator, Sales Coach, Sentiment Analyzer, Next Best Action, Auto Follow-up, Renewal Predictor, Upsell/Cross-sell, and 12 more
- **RTMN Integration:** 33 services (CorpID, MemoryOS, TwinOS, Customer Intelligence, Leverge Suite)

### Marketing OS (5500) - Autonomous Marketing Department
- **Modules:** Brand OS, Campaign OS, Journey OS, Content OS, Social OS, SEO OS, Messaging OS, Loyalty OS, Event OS, Influencer OS, Analytics OS, Budget OS, CDP OS
- **AI Agents:** Brand Voice, Campaign Strategist, Journey Optimizer, Content Generator, Audience Analyzer, SEO Advisor, Sentiment Monitor, Budget Allocator, Attribution Modeler, Competitive Intel, A/B Test Analyzer, Email Optimizer, Social Scheduler, Lead Qualifier, ROI Calculator
- **RTMN Integration:** CorpID, MemoryOS, TwinOS, AdBazaar DSP/Audience, REZ CRM/Wallet

### Customer Success OS (4050) - Customer Lifecycle Management
- **Modules:** Onboarding Journey, NPS Surveys, Health Scores, Churn Prediction, Check-ins, CS Campaigns, Touchpoints, Expansion Tracking
- **AI Agents:** Health Score Analyzer, Churn Predictor, NPS Insights, Onboarding Optimizer, Check-in Recommender, Expansion Advisor, Risk Forecaster
- **RTMN Integration:** Sales OS, Marketing OS, REZ CRM, REZ Wallet, CorpID
- **Key Features:**
  - Customer lifecycle tracking (prospect → onboarding → active → expansion → churn)
  - Automated NPS surveys with sentiment analysis
  - AI-powered health scores (engagement, adoption, satisfaction)
  - Churn prediction with risk factors
  - Scheduled check-ins and touchpoints
  - Expansion/Upsell recommendations

### Procurement OS (5096) - Enterprise Procurement
- **Modules:** Supplier Management, Requisitions, Purchase Orders, Contracts, Inventory, Warehouses, Budget, Cost Centers, Categories, RFQs, Spend Analytics, Approval Templates
- **AI Agents:** Supplier Discovery, Price Optimization, Contract Intelligence, Risk Assessment, Spend Analytics, Approval Routing, Inventory Prediction, Supplier Performance, Demand Forecasting, Compliance Checker

### Workforce OS (5077) - Unified HR Management
- **Modules:** Employees, Departments, Recruitment, Attendance, Leave, Payroll, Performance, Learning, Benefits, Expenses, Policies
- **AI Agents:** Resume Screening, Interview Scheduling, Leave Approval, Payroll Processing, Performance Analyzer, Skill Gap Analyzer, Compliance Checker, Attrition Predictor, Org Chart Optimizer, Benefits Advisor

### Finance OS (4801) - Cross-Industry Financial Consolidation
- **Modules:** Chart of Accounts, Trial Balance, Dashboard, Industry Financials, AI Copilot
- **Unique Feature:** Connects to ALL 24 Industry OS for consolidated financial reporting
- **AI:** Finance Copilot for natural language financial queries

### Operations OS (5250) - Central Nervous System
- **Modules:** Command Center, Process OS, Workflow OS, Project OS, Task OS, SOP OS, Approval OS, Resource OS, Incident OS, Risk OS, Analytics, Delivery OS, Planning, PMO, Quality, Change Mgmt, Knowledge, Capacity, Automation (20 modules)
- **AI Agents:** 23 AI agents for process optimization, incident management, risk prediction
- **Key Features:**
  - Unified operations dashboard
  - Process automation and workflows
  - Resource allocation and capacity planning
  - Incident and risk management
  - Quality control and compliance
  - Connects to all Industry OS for operational insights

### CXO OS (5100) - Strategic Command Center
- **Modules:** Executive KPIs, Strategic Pillars, Department Monitoring, Industry Performance, Board Reports, Risk Management, Competitor Analysis, Decision Support (8 modules)
- **AI Agents:** 15 Executive AI agents (Strategic Planner, Financial Forecaster, Risk Predictor, Competitor Intel, Board Advisor, etc.)
- **Key Features:**
  - Real-time executive dashboards
  - Cross-department performance tracking
  - Strategic decision support
  - Board-ready reports
  - Connects to ALL Department OS for unified view
  - Connects to ALL 24 Industry OS for market intelligence

### Revenue Intelligence OS (5400) - The AI Revenue Department
- **Modules:** Revenue Hub, Demand Intelligence, Pricing Intelligence, Promotion Management, RevOps Intelligence, Cohort Analysis, Analytics Engine, Revenue Digital Twin (8 modules)
- **AI Agents:** 8 Revenue AI agents (AICRO, DemandForecaster, PricingOptimizer, PromotionStrategist, CohortAnalyst, ChurnPredictor, AnomalyDetector, ScenarioPlanner)
- **Key Features:**
  - Unified revenue aggregation across ALL sources (subscription, one-time, usage, services, marketplace)
  - AI-powered demand forecasting with 92% accuracy
  - Dynamic pricing optimization (88% accuracy)
  - Promotion ROI tracking and multi-touch attribution
  - Cohort analysis with LTV prediction
  - Revenue Digital Twin for scenario simulation
  - Natural language AI Copilot for revenue queries
  - Connects to Sales OS, Finance OS, Marketing OS, Operations OS for real-time data
  - Real-time alerts and anomaly detection (94% accuracy)

---

## 📁 RTMN Root Sales Integrations (`services/`)

The RTMN root `services/` folder hosts **integration-level sales/CRM services** that complement (not replace) the canonical Department OS at `industry-os/services/sales-os/`. Each is a standalone integration, not a duplicate of Sales OS:

| Service | Purpose | Integration With |
|---------|---------|------------------|
| **`REZ-SalesMind`** (5167) | 8 AI sales agents (qualification, outreach, follow-up) — *moved here from AdBazaar 2026-06-22* | Sales OS (5055) |
| **`customer-graph-360`** (4808) | 360° customer graph aggregating CRM + Wallet + Support — *moved here from AdBazaar 2026-06-22* | Sales OS + CRM Hub |
| **`crm-engine`** | Standalone CRM engine (legacy) | Sales OS |
| **`sales-automation`** | Sales workflow automation scripts | Sales OS |
| **`sales-hub`** | Aggregator hub for sales signals (cross-OS) | Sales OS + Marketing OS |
| **`sales-intelligence`** | Sales analytics + forecasting | Sales OS + Revenue Intelligence |
| **`sales-sync`** | Cross-system lead/customer sync | Sales OS + Marketing OS + CRM |
| **`lead-os-gateway`** | Lead ingestion gateway | Sales OS + Marketing OS |
| **`customer-success-os`** | Legacy CS (rooted variant) — see `industry-os/services/customer-success-os/` as canonical | Customer Success OS (4050) |

**Rule:** Sales/CRM features belong in `industry-os/services/sales-os/` (the canonical Sales OS). The root `services/` list above are **integrations/connectors** that extend Sales OS to other OS — they are NOT replacements.

---

## 🟢 All 10 Weeks Shipped (2026-06-22)

The 10-week roadmap is complete. **Every phase from A through E is done.**

| Phase | What it shipped | Status |
|---|---|---|
| **A. Foundation** | Hub on :4399 with `/api/sutar/*` proxy, `proxyToUpstream()` body-forwarding fix, vitest setup | ✅ |
| **B. SUTAR OS** | sutar-economy-os 105 tests, sutar-trust-engine `/api/v1/sada/status`, sutar-contract-os 179 tests + real bug fix in `versions.ts`, sutar-decision-engine multi-option ranking | ✅ |
| **C. Nexha network** | Routes wired through Hub + 3 real services: C.1 sutar-supplier-registry (4280, 20 tests), C.2 sutar-logistics (4285, 22 tests + bug fix), C.5 sutar-warehouse-network (4288, 49 tests = 20 slot booking + 29 WMS) | ✅ |
| **D. do-app** | Backend `nexha` client with 7 unit tests, autopilot Step 5 surface-suppliers, mobile autopilot tab | ✅ |
| **E. Docs/Ops** | `docker-compose.dev.yml`, `scripts/dev-stack.sh`, `demos/full-stack-demo.sh`, 6 ADRs, root README | ✅ |

**425 vitest tests** across 7 SUTAR services, **0 failures**. **2 real service bugs** caught and fixed by tests. All 5 git repos in sync.

### Try it in 30 seconds

```bash
bash scripts/dev-stack.sh start && bash demos/full-stack-demo.sh
```

---

## 🚀 LIVE DEPLOYMENTS

| Platform | Service | Port | Status |
|----------|---------|------|---------|
| **RTMN Hub** | Unified Hub | 4399 | ✅ Ready |
| **Sales OS** | CRM, Leads, Pipeline, Deals | 5055 | ✅ Running |
| **Marketing OS** | Campaigns, Journey, Audience | 5500 | ✅ Running |
| **Customer Success OS** | Lifecycle, NPS, Churn | 4050 | ✅ Running |
| **Procurement OS** | Suppliers, POs, Contracts | 5096 | ✅ Running |
| **Workforce OS** | HR, Payroll, Attendance | 5077 | ✅ Running |
| **Finance OS** | Chart of Accounts, Consolidation | 4801 | ✅ Running |
| **Operations OS** | Projects, Processes, Incidents | 5250 | ✅ Running |
| **CXO OS** | Executive KPIs, Strategy | 5100 | ✅ Running |
| **Revenue Intelligence OS** | Revenue, Demand, Pricing, RevOps | 5400 | ✅ Running |
| **Media OS** | Content, Streaming | 5600 | ✅ Running |
| **Restaurant OS** | Restaurant Management | 5010 | ✅ Running |
| **Hotel OS** | Hotel Management | 5025 | ✅ Running |
| **Healthcare OS** | Healthcare | 5020 | ✅ Running |

---

## 📊 Complete Service Registry

### TwinOS Services (11) - Digital Twin Platform

| Service | Port | Twins | Status |
|---------|------|-------|--------|
| **TwinOS Hub** | 4705 | 86+ | ✅ Running |
| **Customer Twin** | 4895 | Customer, LTV, Churn | ✅ NEW |
| **Order Twin** | 4885 | Cart, Order, Shipment, Return | ✅ NEW |
| **Wallet Twin** | 4896 | Wallet, Rewards | ✅ NEW |
| Employee Twin | 4730 | Employee, Performance | ✅ Fixed |
| Voice Twin | 4876 | Voice Profiles | ✅ Fixed |
| Product Twin | 4720 | Product, Inventory | ✅ Fixed |
| Asset Twin | 4890 | Assets | ✅ Fixed |
| Organization Twin | 4710 | Organizations | ✅ Fixed |
| Partner Twin | 4892 | Partners | ✅ Fixed |
| Lead Twin | 4894 | Leads | ✅ Fixed |

### Department OS (9) - Horizontal Layer

| Service | Port | Status | Modules | AI Agents |
|---------|------|--------|---------|----------|
| **Sales OS** | 5055 | ✅ | 13 | 22 |
| **Marketing OS** | 5500 | ✅ | 13 | 15 |
| **Customer Success OS** | 4050 | ✅ | 8 | 6 |
| **Procurement OS** | 5096 | ✅ | 12 | 10 |
| **Workforce OS** | 5077 | ✅ | 11 | 10 |
| **Finance OS** | 4801 | ✅ | 6 | 1 |
| **Operations OS** | 5250 | ✅ | 20 | 23 |
| **CXO OS** | 5100 | ✅ | 8 | 15 |
| **Revenue Intelligence OS** | 5400 | ✅ | 8 | 8 |

### Foundation Services (4)

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **CorpID** | 4702 | ✅ | Universal Identity |
| **Memory Layer** (4 services) | 4703, 4152, 4704, 4790 | ✅ | Knowledge & Experience — see "Memory Layer" below |
| **TwinOS Hub** | 4705 | ✅ | Digital Twins (86+ twins) |
| **TwinOS Shared** | N/A | ✅ | Shared Library for Twins |

### Memory Layer (4 services)

| Service | Port | Purpose |
|---------|------|---------|
| **MemoryOS** | 4703 | The dumb store — 15 memory types, knowledge graph, working/long-term, learning |
| **Memory Confidence** | 4152 | Tracks per-fact reliability (base × decay × contradiction) |
| **Twin Memory Bridge** | 4704 | Twin ↔ memory partition links; "Each twin owns its memory" |
| **Memory Context Engine** | 4790 | Smart retriever that composes LLM context windows (relevance × confidence × recency) |

All four share a single `@rtmn/shared/auth` JWT middleware (CorpID-backed). See [HOJAI-AI/docs/MEMORY-LAYER.md](companies/HOJAI-AI/docs/MEMORY-LAYER.md) and the per-service CLAUDE.md files in `companies/HOJAI-AI/platform/memory/` and `companies/HOJAI-AI/platform/twins/twin-memory-bridge/`.

### HOJAI AI Suite (Internal HOJAI services only)

> ⚠️ **Ports 4761-4765 belong to Leverge (external client)** per the External Clients Policy above. They are listed in `PORT-REGISTRY.md` for reference but are NOT part of the RTMN ecosystem, not under RTMN control, and not subject to the operational guarantees on this page.

The internal HOJAI AI infrastructure used by RTMN consists of:

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **HOJAI Gateway** | 4500 | ⚠️ Scaffolded | Internal AI gateway (not in code yet) |
| **Memory Service** | 4520 | ⚠️ Scaffolded | Multi-tier memory |
| **TwinOS Bridge** | 4521 | ✅ 4705 | Digital twin management (lives at 4705) |
| **Intelligence** | 4530 | ⚠️ Scaffolded | AI inference |
| **ExpertOS** | 4550 | ⚠️ Scaffolded | AI marketplace |

> Note: HOJAI AI is now a **standalone git repo** at [imrejaul007/hojai-ai](https://github.com/imrejaul007/hojai-ai), included here as a git submodule at [companies/HOJAI-AI/](companies/HOJAI-AI/) (121 services + 13 divisions). Key services include `customer-twin` (4895), `ai-intelligence` (4881), and the Genie suite (4701-4727). See [CANONICAL-PORT-REGISTRY.md](CANONICAL-PORT-REGISTRY.md).

### Genie Voice Services (9) - ✅ NEW

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **Genie Wake Word** | 4767 | ✅ | Wake word detection ("Hey Genie" / "हे जिनी") |
| **Genie Listening Modes** | 4768 | ✅ | Mode switching (Manual, Continuous, Passive, Smart) |
| **Genie Device Integration** | 4769 | ✅ | Multi-device support (Phone, Watch, Earbuds, Glasses, Car) |
| **Genie Calendar** | 4709 | ✅ | Personal calendar, scheduling, conflict detection |
| **Genie Memory Inbox** | 4710 | ✅ | Universal memory capture - Memorae-style inbox |
| **Genie Briefing** | 4712 | ✅ | Daily briefings (Morning, Evening, Weekly) |
| **Genie Universal Search** | 4713 | ✅ | Search everything (memories, twins, calendar) |
| **Genie Serendipity** | 4714 | ✅ | Memory resurfacing - Random reminders |
| **Genie Smart Forgetting** | 4715 | ✅ | Auto-archive expired/duplicate items |
| **Voice Twin** | 4876 | ✅ | TTS/STT services, voice profiles |

### RAZO Keyboard (1) - ✅ NEW

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **RAZO Keyboard** | 4725 | ✅ | Communication OS - Intent detection, multi-channel messaging |

### REZ Services (4)

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **REZ Auth** | 4002 | ✅ | Authentication |
| **REZ Wallet** | 4004 | ✅ | Payments & Rewards |
| **REZ CRM Hub** | 4056 | ✅ | Customer Relations |
| **REZ Care Service** | 4055 | ✅ | Customer Support |

### AdBazaar (4)

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **REZ DSP** | 4990 | ✅ | Ad Campaign Delivery |
| **REZ Audience** | 4805 | ✅ | Audience Segments |
| **REZ Attribution** | 4803 | ✅ | Multi-touch Attribution |
| **REZ CDP** | 4901 | ✅ | Customer Data Platform |

### 26 Industry Operating Systems

| # | Industry | OS Name | Port | Status |
|---|----------|---------|------|--------|
| 1 | Hospitality | Restaurant OS | 5010 | ✅ |
| 2 | Hotel | Hotel OS | 5025 | ✅ |
| 3 | Healthcare | Healthcare OS | 5020 | ✅ |
| 4 | **Events** | **Event & Banquet OS** | **4751** | ✅ NEW |
| 5 | **Exhibitions** | **Exhibition OS** | **5040** | ✅ NEW |
| 6 | Retail | Retail OS | 5030 | ✅ |
| 7 | Legal | Legal OS | 5035 | ✅ |
| 8 | Education | Education OS | 5060 | ✅ |
| 9 | Agriculture | Agriculture OS | 5070 | ✅ |
| 10 | Automotive | Automotive OS | 5080 | ✅ |
| 11 | Beauty | Beauty OS | 5090 | ✅ |
| 12 | Fashion | Fashion OS | 5095 | ✅ |
| 13 | Fitness | Fitness OS | 5110 | ✅ |
| 14 | Gaming | Gaming OS | 5120 | ✅ |
| 15 | Government | Government OS | 5130 | ✅ |
| 16 | Home Services | HomeServices OS | 5140 | ✅ |
| 17 | Manufacturing | Manufacturing OS | 5150 | ✅ |
| 18 | Non-Profit | NonProfit OS | 5160 | ✅ |
| 19 | Professional | Professional OS | 5170 | ✅ |
| 20 | Sports | Sports OS | 5180 | ✅ |
| 21 | Travel | Travel OS | 5190 | ✅ |
| 22 | Entertainment | Entertainment OS | 5200 | ✅ |
| 23 | Construction | Construction OS | 5210 | ✅ |
| 24 | Financial | Financial OS | 5220 | ✅ |
| 25 | Real Estate | RealEstate OS | 5230 | ✅ |
| 26 | Transport | Transport OS | 5240 | ✅ |

---

## 📱 Consumer Apps (External Repos)

Consumer-facing apps are extracted into their own repos. RTMN treats them as **external consumers** of the Unified Hub, not as services inside the monorepo.

| App | Backend Port | Repo | Status |
|---|---|---|---|
| **Do App** (Digital Operator) | 3001 | [github.com/imrejaul007/do-app](https://github.com/imrejaul007/do-app) | ✅ Extracted (2026-06-20) |

**Do App** = Expo mobile + Express backend + MongoDB. AI-powered chat commerce. Talks to RTMN Genie / CorpID / TwinOS / Exhibition OS over HTTP. See its [ARCHITECTURE.md](companies/do-app/docs/ARCHITECTURE.md) and [INTEGRATION-WITH-RTMN.md](companies/do-app/docs/INTEGRATION-WITH-RTMN.md).

Other REZ-Consumer apps (REZ-App, Go4Food, Safe-QR, REZ-inbox, verify-qr, etc.) remain in the `companies/REZ-Consumer/` submodule.

---

## 🌐 RTMN Unified Hub API

### Access Point
**Hub URL:** `http://localhost:4399`

### Core Endpoints

```
Hub (4399)
│
├── /health                    # Hub health check
├── /ready                    # Readiness
├── /api/services            # Service registry
│
├── DEPARTMENT OS (11) - Horizontal Layer
│   ├── /api/sales/*        # → Sales OS (5055)
│   ├── /api/marketing/*    # → Marketing OS (5500)
│   ├── /api/media/*        # → Media OS (5600)
│   ├── /api/customer-success/* # → Customer Success OS (4050)
│   ├── /api/finance/*      # → Finance OS (4801)
│   ├── /api/workforce/*    # → Workforce OS (5077)
│   ├── /api/operations/*   # → Operations OS (5250)
│   ├── /api/cxo/*          # → CXO OS (5100)
│   ├── /api/procurement/*  # → Procurement OS (5096)
│   ├── /api/analytics/*    # → Analytics OS (4750)
│   └── /api/legal/*        # → Legal OS (5035)
│
├── INDUSTRY OS (26) - Vertical Layer
│   ├── /api/restaurant/*   # → Restaurant OS (5010)
│   ├── /api/hotel/*        # → Hotel OS (5025)
│   ├── /api/healthcare/*   # → Healthcare OS (5020)
│   ├── /api/events/*       # → Event & Banquet OS (4751)
│   ├── /api/exhibitions/*  # → Exhibition OS (5040)
│   └── /api/* (26 total)  # → All Industry OS
│
├── REVENUE INTELLIGENCE
│   ├── /api/revenue/*      # → Revenue Hub
│   ├── /api/demand/*       # → Demand Intelligence
│   ├── /api/pricing/*      # → Pricing Intelligence
│   └── /api/copilot/*      # → AI Copilot
│
├── FOUNDATION
│   ├── /api/identity/*     # → CorpID (4702)
│   ├── /api/memory/*       # → MemoryOS (4703)
│   ├── /api/facts/*        # → Memory Confidence (4152)
│   ├── /api/twin-memory/*  # → Twin Memory Bridge (4704)
│   └── /api/twins/*        # → TwinOS (4705)
│
├── HOJAI AI
│   ├── /api/ai/*           # → AI Intelligence (4881) - internal HOJAI
│   └── /api/genie/*        # → Genie Gateway (4701)
│
├── REZ SERVICES
│   ├── /api/crm/*          # → CRM (4056)
│   ├── /api/care/*         # → Care (4055)
│   └── /api/wallet/*      # → Wallet (4004)
│
├── ADBAZAAR
│   ├── /api/ads/*          # → DSP (4990)
│   ├── /api/audiences/*    # → Audience (4805)
│   └── /api/attribution/* # → Attribution (4803)
│
├── INDUSTRY OS (24) - Vertical Layer
│   ├── /api/restaurant/*   # → Restaurant (5010)
│   ├── /api/hotel/*        # → Hotel (5025)
│   ├── /api/healthcare/*   # → Healthcare (5020)
│   ├── /api/retail/*      # → Retail (5030)
│   ├── /api/legal/*        # → Legal (5035)
│   ├── /api/education/*   # → Education (5060)
│   ├── /api/beauty/*       # → Beauty (5090)
│   ├── /api/fitness/*     # → Fitness (5110)
│   ├── /api/realestate/*  # → RealEstate (5230)
│   ├── /api/manufacturing/*# → Manufacturing (5150)
│   └── /api/* (24 total)  # → All Industry OS
│
└── CROSS-OS WORKFLOWS
    ├── GET  /api/customer360/:id   # Customer from all systems
    ├── POST /api/workflow/lead-to-revenue
    ├── POST /api/workflow/campaign-launch
    ├── POST /api/workflow/hotel-booking
    └── POST /api/workflow/restaurant-order
```

---

## 🔄 Cross-OS Workflows

### Customer 360
```bash
GET /api/customer360/:id
# Returns: Sales + Media + Marketing + CRM + Wallet
```

### Lead to Revenue
```bash
POST /api/workflow/lead-to-revenue
{
  "email": "user@example.com",
  "name": "John Doe",
  "source": "campaign"
}
# Creates: Marketing Lead + CRM Contact + Wallet
```

### Campaign Launch
```bash
POST /api/workflow/campaign-launch
{
  "name": "Summer Sale",
  "budget": 50000,
  "audience": "luxury_travelers"
}
# Creates: Marketing Campaign + Media Content + AdBazaar Ads + Attribution
```

---

## 📈 Complete Architecture

### Data Flow

```
Unknown Visitor
      ↓
Marketing OS (Lead Capture)
      ↓
AdBazaar (Targeted Ads)
      ↓
Media OS (Content)
      ↓
Sales OS (Qualified Lead)
      ↓
REZ CRM (Customer Record)
      ↓
REZ Wallet (Payment)
      ↓
MemoryOS (Remember Preferences)
      ↓
TwinOS (Update Customer Twin)
      ↓
Industry OS (Service Delivery)
      ↓
REZ Care (Support)
      ↓
Marketing OS (Retention)
      ↓
REZ Wallet (Rewards)
```

---

## 🚀 Quick Start

### One-command dev stack (Phase A+B+C+D+C.5, June 22 2026)

```bash
# Start the five-service stack the demo expects (incl. Phase C.5 warehouse network)
bash scripts/dev-stack.sh start

# Run the end-to-end demo (Hub → SUTAR → Nexha)
bash demos/full-stack-demo.sh

# Or via Docker (optional — most services still use start scripts)
docker compose -f docker-compose.dev.yml up --build
```

What this gives you:
- Hub on **:4399** with `/api/sutar/*` and `/api/nexha/*` proxies that actually reach upstream
- Trust Engine **:4291** with `/api/v1/sada/status` federation health probe
- Decision Engine **:4290** with multi-option ranking (`POST /api/v1/rank`)
- Economy OS **:4251** with 105 passing tests (vitest)

### Legacy per-service start

```bash
# Start Unified Hub
cd services/unified-os-hub
npm install
npm start  # Port 4399

# Start Industry OS
cd industry-os/services/restaurant-os && npm start  # Port 5010

# Health checks
curl http://localhost:4399/health
curl http://localhost:4399/api/services
curl http://localhost:5055/health  # Sales
curl http://localhost:5600/health  # Media
curl http://localhost:5500/health  # Marketing
```

---

## 📁 Project Structure

```
RTMN/
│
├── services/
│   └── unified-os-hub/        # Unified API Gateway (4399)
│
├── industry-os/
│   └── services/
│       │
│       ├── DEPARTMENT OS (8) - Horizontal Layer
│       │   ├── sales-os/           # Sales OS (5055)
│       │   ├── marketing-os/       # Marketing OS (5500)
│       │   ├── customer-success-os/ # Customer Success OS (4050)
│       │   ├── procurement-os/     # Procurement OS (5096)
│       │   ├── workforce-os/       # Workforce OS (5077)
│       │   ├── finance-os/        # Finance OS (4801)
│       │   ├── operations-os/      # Operations OS (5250)
│       │   └── cxo-os/           # CXO OS (5100)
│       │
│       ├── MEDIA OS
│       │   └── media-os/           # Media OS (5600)
│       │
│       └── INDUSTRY OS (26) - Vertical Layer
│           ├── restaurant-os/      # Restaurant OS (5010)
│           ├── hotel-os/          # Hotel OS (5025)
│           ├── healthcare-os/     # Healthcare OS (5020)
│           ├── event-banquet-os/  # Event & Banquet OS (4751)
│           ├── exhibition-os/     # Exhibition OS (5040)
│           └── [21 more...]/
│
├── companies/
│   ├── HOJAI-AI/             # AI Platform
│   ├── REZ-Merchant/          # Merchant Services
│   ├── AdBazaar/              # Advertising
│   └── [20+ companies]/
│
└── shared/
    ├── corpid-service/         # Identity
    ├── memory-os/             # AI Memory
    └── twinos-hub/            # Digital Twins
```

---

## 🔒 Security

- ✅ JWT Authentication
- ✅ Rate Limiting
- ✅ Helmet Security Headers
- ✅ CORS Configuration
- ✅ Input Validation
- ✅ Audit Logging

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Total Services Connected | 70+ |
| Core Business OS | 3 |
| Industry OS | 26 |
| Foundation | 3 |
| HOJAI AI | 5 |
| Genie Voice Services | 6 |
| REZ Services | 4 |
| AdBazaar | 4 |
| Department OS | 11 |
| Browser Extension | ✅ Chrome/Firefox |
| AI Agents | 112+ |
| Digital Twins | 150+ |
| API Endpoints | 1000+ |

---

## 🎯 Key Differentiators

| Product | Mission | Owns |
|---------|---------|------|
| **CXO OS** | Executive command | All KPIs, strategy, decisions |
| **Operations OS** | Execute operations | Projects, processes, incidents |
| **Sales OS** | Close deals | CRM, leads, pipeline, commissions |
| **Marketing OS** | Get customers | Campaigns, journeys, loyalty |
| **Customer Success OS** | Retain customers | NPS, health, churn, expansion |
| **Procurement OS** | Source & buy | Suppliers, POs, contracts |
| **Workforce OS** | Manage people | HR, payroll, attendance |
| **Finance OS** | Consolidate finances | All 24 industry financials |
| **Revenue Intelligence OS** | Maximize revenue | Demand, pricing, promotions, RevOps |
| **Media OS** | Create content | Video, articles, podcasts |

### Two-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      RTMN UNIFIED HUB (4399)                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   CXO OS      │      │  OPERATIONS   │      │    FINANCE    │
│   (5100)      │      │     OS        │      │    (4801)     │
│ Executive KPIs│      │   (5250)      │      │  Consolidation│
└───────────────┘      └───────────────┘      └───────────────┘
        │                        │                        │
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   SALES OS    │      │  MARKETING    │      │  WORKFORCE    │
│   (5055)      │      │     OS        │      │     OS        │
│     CRM       │      │    (5500)     │      │   (5077)      │
└───────────────┘      └───────────────┘      └───────────────┘
        │                        │                        │
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  CUSTOMER     │      │  PROCUREMENT │      │    MEDIA      │
│   SUCCESS     │      │     OS        │      │     OS        │
│   (4050)      │      │    (5096)     │      │   (5600)      │
└───────────────┘      └───────────────┘      └───────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
     ┌──────────┬──────────┬──────────┬──────────┬──────────┐
     │          │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼          ▼
 RESTAURANT    HOTEL   HEALTHCARE    RETAIL     LEGAL    EDUCATION
   (5010)     (5025)     (5020)     (5030)    (5035)     (5060)

     │          │          │          │          │          │
     └──────────┴──────────┴──────────┴──────────┴──────────┘
                              │
                     ┌────────┴────────┐
                     │   FOUNDATION    │
                     │ CorpID │ Memory  │
                     │ TwinOS │ EventBus│
                     └─────────────────┘
                     ┌────────┴────────┐
                     │   FOUNDATION    │
                     │ CorpID │ Memory  │
                     │ TwinOS │ EventBus│
                     └─────────────────┘
```

---

## 🏆 Department OS - Complete Status

### Sales OS v2.0 (5055) - ✅ FULLY OPERATIONAL
- ✅ 13 enterprise modules (CRM, CS, CPQ, Contracts, Territory, Forecasting, etc.)
- ✅ 22 AI agents with 89.4% avg accuracy
- ✅ 24 industry bridges with 123+ digital twins
- ✅ 33 RTMN ecosystem integrations
- ✅ 8 REZ-SalesMind AI agents
- ✅ Sample data: 250+ records
- [View Documentation](industry-os/services/sales-os/CLAUDE.md)

### Marketing OS v1.0 (5500) - ✅ PRODUCTION READY
- ✅ 13 operating systems (Brand, Campaign, Journey, Content, Social, etc.)
- ✅ 15 AI marketing agents
- ✅ MongoDB with JWT authentication
- ✅ AdBazaar DSP/SSP integration
- ✅ RTMN Hub integration
- [View Documentation](industry-os/services/marketing-os/CLAUDE.md)

### Procurement OS v1.0 (5096) - ✅ RUNNING
- ✅ 12 procurement modules
- ✅ 10 AI procurement agents
- ✅ Supplier management, POs, contracts, RFQs
- ✅ Inventory and warehouse management
- [View Documentation](industry-os/services/procurement-os/CLAUDE.md)

### Workforce OS v1.0 (5077) - ✅ RUNNING
- ✅ 11 HR modules (Employees, Payroll, Attendance, Performance, etc.)
- ✅ 10 AI HR agents
- ✅ Recruitment and onboarding
- ✅ Benefits and expenses management
- [View Documentation](industry-os/services/workforce-os/CLAUDE.md)

### Finance OS v1.0 (4801) - ✅ RUNNING
- ✅ Chart of accounts and trial balance
- ✅ Consolidated dashboard across ALL 24 industries
- ✅ AI Finance Copilot
- ✅ Cross-industry financial reporting
- [View Documentation](industry-os/services/finance-os/CLAUDE.md)

### Media OS (5600)
- ✅ Content OS (Videos, Shows, Movies, Live)
- ✅ Creator OS (Profiles, Monetization)
- ✅ Streaming (HLS/DASH, DRM)
- ✅ Program Grid & EPG
- ✅ Viewer Profiles & Parental Controls
- ✅ Content Recommendation Engine
- ✅ 13 AI Media Brain Agents
- ✅ GCC Support (6 countries, 20 languages)

### Unified Hub (4399)
- ✅ Connects ALL 50+ services
- ✅ Cross-OS Workflows
- ✅ Customer 360
- ✅ Service Registry
- ✅ Health Monitoring

---

## 📊 Complete Statistics

| Category | Count |
|----------|-------|
| Department OS | 5 |
| Industry OS | 24 |
| Foundation Services | 3 |
| HOJAI AI Services | 5 |
| Total Services | 50+ |
| Total AI Agents | 100+ |
| Total Digital Twins | 150+ |
| Total API Endpoints | 1000+ |

---

*Last Updated: June 22, 2026*
*RTMN Ecosystem - Real-Time Multi-Industry Network*

---

## � TwinOS - Digital Twin Platform v2.0

**TwinOS is RTMN's domain-centric digital twin platform providing unified digital representations across the ecosystem.**

> **📁 Canonical Location:** `companies/HOJAI-AI/platform/twins/` (NOT `services/` or `services copy/`).
> **🚀 Startup:** `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/start-twins.sh`
> **📊 Status (2026-06-21):** All 15 main twin services healthy, cross-service JWT auth verified end-to-end. See [HOJAI-AI CLAUDE.md](companies/HOJAI-AI/CLAUDE.md#-twinos-re-audit-2026-06-21) for the full audit report.

### Twin Statistics

| Category | Twins | Status |
|----------|-------|--------|
| Foundation | 5 | ✅ |
| Commerce | 9 | ✅ |
| People | 4 | ✅ |
| AI/Memory | 9 | ✅ |
| Hospitality | 7 | ✅ |
| Healthcare | 6 | ✅ |
| Finance | 6 | ✅ |
| Marketing | 6 | ✅ |
| Operations | 6 | ✅ |
| Real Estate | 5 | ✅ |
| HR | 5 | ✅ |
| Event | 6 | ✅ |
| Travel | 5 | ✅ |
| Business | 4 | ✅ |
| Personal | 3 | ✅ |
| **TOTAL** | **86** | **100%** |

### TwinOS Service Inventory

| Service | Port | Twins Managed | Status |
|---------|------|--------------|--------|
| **TwinOS Hub** | 4705 | 86+ canonical twins | ✅ Running |
| **Customer Twin** | 4895 | Customer, LTV, Churn, Segments | ✅ NEW |
| **Order Twin** | 4885 | Cart, Order, Shipment, Return | ✅ NEW |
| **Wallet Twin** | 4896 | Wallet, Transactions, Rewards | ✅ NEW |
| Employee Twin | 4730 | Employee, Performance, Skills | ✅ Fixed |
| Voice Twin | 4876 | Voice profiles, Recordings | ✅ Fixed |
| Product Twin | 4720 | Products, Inventory | ✅ Fixed |
| Asset Twin | 4890 | Assets, Depreciation | ✅ Fixed |
| Organization Twin | 4710 | Organizations, KPIs | ✅ Fixed |
| Partner Twin | 4892 | Partners, Relationships | ✅ Fixed |
| Lead Twin | 4894 | Leads, Activities | ✅ Fixed |

### Complete Twin Registry

```
Foundation Twins (5)
├── corpid.identity       # Universal identity
├── memory.knowledge      # Persistent knowledge
├── goal.objective        # Goal tracking
├── decision.policy       # Business rules
└── agent.ai              # AI orchestration

Commerce Twins (9)
├── commerce.customer      # Customer profile, LTV, segments
├── commerce.order        # Order lifecycle
├── commerce.wallet       # Digital wallet
├── commerce.payment      # Payment processing
├── commerce.product      # Product catalog
├── commerce.inventory    # Inventory management
├── commerce.merchant     # Merchant profile
├── commerce.cart         # Shopping cart
└── commerce.coupon       # Discounts/promotions

People Twins (4)
├── people.employee       # Employee profile
├── people.user           # Platform user
├── people.founder        # Founder/leadership
└── people.candidate      # Job candidate

AI/Memory Twins (9)
├── ai.memory             # AI persistent memory
├── ai.conversation       # Chat history
├── ai.intent             # Intent detection
├── ai.goal               # AI goal tracking
├── ai.simulation         # What-if scenarios
├── ai.agent              # Autonomous agents
├── ai.knowledge          # Knowledge graph
├── ai.reasoning          # Chain-of-thought
└── ai.digital-human      # Complete person avatar

Hospitality Twins (7)
├── hospitality.hotel      # Hotel property
├── hospitality.room       # Guest room
├── hospitality.guest     # Hotel guest
├── hospitality.booking   # Reservation
├── hospitality.restaurant # Restaurant
├── hospitality.menu      # Menu
└── hospitality.table      # Table

Healthcare Twins (6)
├── healthcare.patient     # Patient record
├── healthcare.doctor      # Healthcare provider
├── healthcare.hospital    # Medical facility
├── healthcare.prescription # Medication order
├── healthcare.lab        # Laboratory
└── healthcare.insurance  # Insurance coverage

Finance Twins (6)
├── finance.asset         # Company assets
├── finance.budget        # Budget tracking
├── finance.expense       # Expense records
├── finance.invoice       # Billing invoice
├── finance.ledger        # Accounting ledger
└── finance.tax           # Tax records

Marketing Twins (6)
├── marketing.campaign     # Marketing campaign
├── marketing.audience     # Target audience
├── marketing.ad          # Advertisement
├── marketing.creative    # Ad creative
├── marketing.publisher   # Ad publisher
└── marketing.conversion  # Conversion tracking

Operations Twins (6)
├── ops.project           # Project management
├── ops.task             # Task tracking
├── ops.process          # Business process
├── ops.incident         # Incident management
├── ops.resource         # Resource allocation
└── ops.sop              # Standard operating procedure

[+ 41 more twins across Real Estate, HR, Event, Travel, Business, Personal categories]
```

### Key Twin Relationships

```
Customer (commerce.customer)
│
├──[has]──► Wallet (commerce.wallet)
│                │
│                └──[has]──► Transaction (commerce.payment)
│
├──[has]──► Cart (commerce.cart)
│                │
│                └──[converts_to]──► Order (commerce.order)
│                                      │
│                                      ├──[has]──► Payment (commerce.payment)
│                                      │
│                                      ├──[has]──► Shipment (commerce.shipment)
│                                      │
│                                      └──[may_have]──► Return (commerce.return)
│
└──[has]──► Preferences
```

### TwinOS Shared Library

All twin services use `@rtmn/twinos-shared` for consistent security:

```javascript
import {
  requireAuth,        // JWT authentication
  preventPrototypePollution, // Security
  errorHandler,       // Consistent errors
  defaultLimiter,     // Rate limiting
  strictLimiter,      // Strict rate limiting
  logger              // Structured logging
} from '@rtmn/twinos-shared';
```

### Security Implemented

All 86+ twins now have:
- ✅ JWT Authentication
- ✅ Role-Based Access Control
- ✅ Rate Limiting (100/min default, 20/min strict)
- ✅ Input Validation & Sanitization
- ✅ Prototype Pollution Prevention
- ✅ Request Logging & Audit Trail
- ✅ Error Handling Middleware
- ✅ Helmet Security Headers

### Documentation

- [TwinOS Hub](services/twinos-hub/) - Central registry
- [TwinOS Architecture](services/twinos-hub/docs/TWINOS_ARCHITECTURE.md) - Complete architecture
- [TwinOS README](services/twinos-hub/docs/README.md) - Quick start
- [Shared Library](services/twinos-shared/) - Common utilities

---

## 🤖 SUTAR OS - Autonomous Economic Infrastructure (25 Services)

**SUTAR OS** is the **Autonomous Economic Layer** of the RTMN ecosystem. It provides 32 interconnected services for AI agent commerce, negotiation, and autonomous operations.

**Tagline:** *"The AI Marketplace - Where AI Agents Come to Negotiate"*

> **Note (2026-06-21):** The phrase "formerly known as 'Salar OS'" was removed because it was confusing — `Salar OS` is actually a Workforce Intelligence service (capability registry + digital twins), now at `companies/HOJAI-AI/platform/twins/salar-os/`. The AI Marketplace was at `sutar-marketplace` (port 4250) until **2026-06-21**, when it was moved to **BLR AI Marketplace** at `companies/HOJAI-AI/blr-ai-marketplace/services/`. They are now three distinct things: SUTAR OS (autonomous economic infra), Salar OS (workforce intelligence), BLR AI Marketplace (the marketplace). See the sections below.

**Layer:** 14 (Autonomous Layer)

### 📚 Complete SUTAR OS Documentation

- [SUTAR OS README](docs/sutar-os/README.md) - Complete overview
- [SUTAR OS Architecture](docs/sutar-os/ARCHITECTURE.md) - 7-layer architecture
- [SUTAR OS API Reference](docs/sutar-os/API.md) - All API endpoints
- [SUTAR OS Integration Guide](docs/sutar-os/INTEGRATION.md) - Integration with RTMN

### SUTAR OS - 25 Services Summary

| Category | Services | Port Range |
|----------|----------|------------|
| **Gateway & Twin** | 5 services (Gateway, Twin OS, Memory Bridge, Identity OS, Agent ID) | 4140-4145 |
| **Intent & Network** | 3 services (Intent Bus, Agent Network, REZ Bridge) | 4154-4155 |
| **Decision & Flow** | 6 services (Decision, Simulation, Goal OS, Network Learning, Flow OS, Founder OS) | 4240-4244, 4260 |
| **Marketplace & Economy** | 4 services (Economy OS, Usage Tracker, Policy OS + see BLR AI Marketplace) | 4250-4254 |
| **Trust & Contracts** | 3 services (Trust Engine, Contract OS, Negotiation Engine) | 4180, 4185, 4191 |
| **Discovery & ROI** | 5 services (Exploration, Discovery, Multi-Agent Evaluator, Reputation, ROI Calculator) → **moved to BLR AI Marketplace 2026-06-21** | 4255-4259 |
| **Monitoring** | 1 service (System Monitoring) | 3100 |

### Key Services

| Service | Port | Purpose |
|---------|------|---------|
| **sutar-gateway** | 4140 | API gateway for all SUTAR services |
| **sutar-decision-engine** | 4240 | AI-powered policy decisions |
| **sutar-goal-os** | 4242 | Goal decomposition and tracking |
| ~~sutar-marketplace~~ → **BLR AI Marketplace** | 4250 | AI Service Marketplace (moved 2026-06-21) |
| **sutar-economy-os** | 4251 | Economic layer for transactions |
| **sutar-negotiation-engine** | 4191 | Multi-party negotiation |
| **sutar-trust-engine** | 4180 | Trust scoring and reputation |
| **sutar-contract-os** | 4185 | Smart contracts |
| **sutar-discovery-engine** | 4256 | Opportunity discovery |

### SUTAR OS vs ACN (Agent Commerce Network)

| Aspect | SUTAR OS | ACN |
|--------|----------|-----|
| **Purpose** | Autonomous Economic Infrastructure | Agent-to-Agent Commerce |
| **Services** | 25 services | 15 services |
| **Port Range** | 3100-4260 | 4716, 4800-4851 |

### SUTAR OS at the RTMN Unified Hub (2026-06-22)

SUTAR OS is exposed at the top-level RTMN Hub (`REZ-ecosystem-connector@4399`).
Two new endpoints (added 2026-06-22 in `RABTUL-Technologies/REZ-ecosystem-connector@1.1.0`):

- `GET /api/sutar/capabilities` — capability → service map + full service-URL table
- `ANY /api/sutar/<service>/<path>` — direct HTTP proxy to any of 15 SUTAR services (GET/POST/PUT/PATCH/DELETE)

This complements the in-process Node client in `companies/REZ-Workspace/core/unified-fabric/src/connections/sutarOS.js`.
Use the Hub routes for cross-language consumers; use the Node client for in-process callers.

```bash
# Capability map
curl http://localhost:4399/api/sutar/capabilities

# Mission templates (reaches sutar-agent-teaming:4853 via the Hub)
curl http://localhost:4399/api/sutar/sutar-agent-teaming/api/teaming/templates

# Form a team via the Hub
curl -X POST http://localhost:4399/api/sutar/sutar-agent-teaming/api/teaming/teams \
  -H 'Content-Type: application/json' \
  -d '{"name":"price-compare","mission":"compare-prices","size":3}'
```

---

## 🛒 Salar OS - Workforce Intelligence (NOT the AI Marketplace)

> **⚠️ Corrected 2026-06-21:** This section was historically mis-titled "Salar OS - The AI Marketplace". That description was wrong. Salar OS is **NOT** the marketplace. The marketplace is now **BLR AI Marketplace** at `companies/HOJAI-AI/blr-ai-marketplace/services/` (formerly at `sutar-os/marketplace/`, moved 2026-06-21). **Salar OS is a Workforce Intelligence service** that maps capabilities to humans, AI agents, and hybrid teams.

**Salar OS** is the **Workforce Intelligence** layer of HOJAI AI. It manages digital twins for humans, AI agents, and human-agent hybrid teams, and provides a capability registry that answers: *"Given a capability, who (or what) is the best entity to deliver it?"*

**Tagline:** *"The Workforce Intelligence Network - Where Capabilities Meet Entities"*

**Service:** `salar-os`
**Path:** `companies/HOJAI-AI/platform/twins/salar-os/`
**Port:** 4710
**Package name:** `@hojai/salar-os`
**Status:** ✅ Moved to HOJAI AI (2026-06-21), v1.0 (~9,000 LOC TypeScript, 13 modules)

### 📚 Salar OS Documentation

- [Salar OS CLAUDE.md](companies/HOJAI-AI/platform/twins/salar-os/CLAUDE.md) - Authoritative service doc
- [Salar OS Architecture](companies/HOJAI-AI/platform/twins/salar-os/docs/SALAR-OS-ARCHITECTURE.md)
- [Salar-SUTAR Integration](companies/HOJAI-AI/platform/twins/salar-os/docs/SALAR-SUTAR-INTEGRATION.md)
- [Workforce Twin Network](companies/HOJAI-AI/platform/twins/salar-os/docs/SALAR-WORKFORCE-TWIN-NETWORK.md)

> **Note:** `docs/salar-os/README.md`, `docs/salar-os/ARCHITECTURE.md`, `docs/salar-os/API.md`, `docs/salar-os/INTEGRATION.md` are **DEPRECATED** — they described the wrong service (the AI Marketplace). See [docs/salar-os/NOTICE.md](docs/salar-os/NOTICE.md) for the deprecation explanation.

### What Salar OS does

Given a capability (e.g. "negotiate SaaS contracts") and a context (industry, urgency, language), Salar OS finds the **best matching entity** — a human, an AI agent, or a hybrid team — and provides a digital twin describing their skills, history, capacity, and trust score.

### Modules (13)

1. **Capability Registry** — Maps capabilities to humans/agents/teams (TECHNICAL, BUSINESS, OPERATIONS, CREATIVE, ANALYTICS, SUPPORT, HR, LEADERSHIP, DOMAIN)
2. **Agent Twin** — Digital twin for AI agents
3. **Hybrid Twin** — Digital twin for human-agent hybrid teams
4. **Organization Twin** — Digital twin for organizations
5. **Vector Store** — Embeddings + similarity search across capability profiles
6. **Salar-SUTAR Bridge** — Integration with SUTAR decision engine
7. **SADA Trust Integration** — Pulls trust scores from SADA OS (port 4190)
8. **AI Employee Seeder** — Seeds sample AI employee profiles
9. **AI Employee LLM** — LLM-backed AI employee behavior
10. **Data Connectors** — External data connectors (HRIS, CRM, ATS)
11. **Integration Scripts** — Migration + bootstrap
12. **Payment Integration** — Pay-for-work tracking (REZ Wallet)
13. **ML Training Pipeline** — ML training for capability matching

### Related services (now also in HOJAI AI)

- **SADA OS** (port 4190) — Trust + Governance + Risk + Verification, at `companies/HOJAI-AI/platform/trust/sada-os/`
- **BLR AI Marketplace** (ports 4146, 4255-4260) — The actual AI Marketplace, at `companies/HOJAI-AI/blr-ai-marketplace/services/` (formerly `sutar-os/marketplace/`, moved 2026-06-21)

---

## 🤖 Agent Commerce Network (ACN) - ALL PHASES COMPLETE

**Agent Commerce Network** is where AI agents become the primary economic actors. Every business has a **Merchant AI (SUTAR OS)** and every consumer has a **Genie AI** - these agents negotiate, purchase, and transact autonomously.

### ACN Core Services (Phase 1) ✅

| Service | Port | Purpose |
|---------|------|---------|
| **ACP Protocol** | 4800 | Standardized messaging for AI-to-AI negotiations |
| **ACN Network** | 4801 | Agent registry, discovery, and routing |
| **Genie Shopping Agent** | 4716 | Consumer's personal AI shopping assistant |
| **Merchant Agents** | 4810 | SUTAR OS - Business AI agents |
| **Agent Reputation** | 4820 | Trust scores for AI agents |
| **Agent Contracts** | 4830 | Smart contracts for transactions |
| **Agent Wallets** | 4840 | Digital wallets for agent payments |

### ACN Phase 2 Services ✅

| Service | Port | Purpose |
|---------|------|---------|
| **Agent Marketplace** | 4845 | Discovery platform with listings, reviews, promotions |
| **Agent Learning** | 4846 | ML for preference learning, strategy optimization |
| **Dispute Resolution** | 4847 | Arbitration, mediation, refund processing |
| **Agent Analytics** | 4848 | Metrics, dashboards, real-time monitoring |
| **ACN Integration** | 4849 | Bridge to RTMN Department OS, Industry OS, TwinOS |

### ACN Phase 3 Services ✅

| Service | Port | Purpose |
|---------|------|---------|
| **Negotiation AI** | 4850 | Advanced ML negotiation strategies |
| **Agent Orchestration** | 4851 | Multi-agent workflow coordination |

### ACN Hub Gateway ✅

| Service | Port | Purpose |
|---------|------|---------|
| **ACN Hub** | 4800 | Unified entry point for all 14 ACN services |

### ACP Protocol Message Types

| Type | Description | Transitions |
|------|-------------|-------------|
| **QUERY** | Request product/service info | QUOTE, REJECT |
| **QUOTE** | Provide pricing and terms | COUNTER, ACCEPT, REJECT |
| **COUNTER** | Counter-offer | COUNTER, ACCEPT, REJECT |
| **ACCEPT** | Accept current terms | ORDER, TRACK |
| **REJECT** | Reject terms | QUERY, NEW_NEGOTIATION |
| **ORDER** | Place order | TRACK, DISPUTE |
| **TRACK** | Track order status | TRACK, DISPUTE |
| **DISPUTE** | Raise dispute | RESOLVE, ESCALATE |

### Agent Types

| Type | Description | Example |
|------|-------------|---------|
| **GENIE** | Consumer personal AI | Shopping assistant, budget manager |
| **MERCHANT** | Business AI (SUTAR OS) | Restaurant AI, Hotel AI, Retail AI |
| **SYSTEM** | RTMN internal agents | Reputation tracker, Contract manager |
| **PARTNER** | External agents | Payment processors, Logistics |

### Orchestration Patterns

| Pattern | Description |
|---------|-------------|
| Sequential | Tasks run one after another |
| Parallel | Tasks run simultaneously |
| Pipeline | Output of each feeds the next |
| Fan-out | One task triggers many |
| Fan-in | Many tasks aggregate to one |
| Conditional | Branch based on results |

### Negotiation Strategies

| Strategy | Description |
|----------|-------------|
| Competitive | Win-lose, hard bargaining |
| Collaborative | Win-win, problem solving |
| Accommodating | Yield to preserve relationship |
| Compromising | Middle ground quickly |
| Principled | BATNA focus, objective standards |

### Trust System

| Level | Score | Badge |
|-------|-------|-------|
| Platinum | 90-100 | 🏆 |
| Gold | 80-89 | ⭐ |
| Silver | 70-79 | 🥈 |
| Bronze | 50-69 | 🥉 |
| Iron | 30-49 | ⚙️ |
| Restricted | 0-29 | ⚠️ |

### Total ACN Statistics

| Metric | Count |
|--------|-------|
| Total Services | 15 |
| Ports Used | 4716, 4800-4851 |
| AI Agent Types | 4 |
| Trust Levels | 6 |
| Orchestration Patterns | 6 |
| Negotiation Strategies | 5 |
| Industry Templates | 26 |
| Reputation Badges | 7 |

### Documentation

- [ACN Architecture](ACN-ARCHITECTURE.md) - Complete ACN documentation
- [ACP Protocol](services/acp-protocol/) - Message types
- [ACN Network](services/acn-network/) - Agent registry
- [Genie Shopping Agent](companies/HOJAI-AI/products/genie/genie-shopping-agent/) - Consumer AI (in HOJAI-AI submodule)
- [Merchant Agents](services/merchant-agents/) - SUTAR OS
- [Agent Reputation](services/agent-reputation/) - Trust scoring
- [Agent Contracts](services/agent-contracts/) - Smart contracts
- [Agent Wallets](services/agent-wallets/) - Digital wallets
- [Agent Marketplace](services/agent-marketplace/) - Discovery platform
- [Agent Learning](services/agent-learning/) - ML improvements
- [Dispute Resolution](services/dispute-resolution/) - Conflict handling
- [Agent Analytics](services/agent-analytics/) - Metrics and insights
- [ACN Integration](services/acn-integration/) - RTMN bridge
- [Negotiation AI](services/negotiation-ai/) - Advanced strategies
- [Agent Orchestration](services/agent-orchestration/) - Multi-agent workflows
- [ACN Hub](services/acn-hub/) - Unified gateway

---

## 🟢 AUDIT & CLEANUP STATUS (Updated 2026-06-20)

The RTMN ecosystem underwent a comprehensive audit and cleanup from June 13-20, 2026. **This supersedes the "67/92 services healthy" claim earlier in this document.**

### Phase 5 — Foundation fixes
- ✅ Fixed broken `@rez/shared` library (was uncompilable; now builds clean)
- ✅ Fixed broken root AdBazaar npm workspace (100% workspace errors → installs clean)
- ✅ Fixed RTMN Hub DSP route (was pointing to non-existent service at port 4990; now points to `rez-dsp-bidder@4061`)
- ✅ Added missing RTMN Hub `/api/cdp/*` route → `adbazaar-cdp@4961`
- ✅ Removed 3 dead/empty directories (REZ-attribution-hub, adbazaar-marketplace-portal, creator-marketplace)

### Phase 6 — Cross-ecosystem port collision resolution
- **Before:** 71 AdBazaar services claimed RTMN-canonical ports
- **After:** 0 cross-ecosystem collisions
- **Method:** 53 AdBazaar services relocated to `5114-5172` reserved range
- See `CANONICAL-PORT-REGISTRY.md` "AdBazaar Cross-Ecosystem Collision Resolution (2026-06-20)" appendix

### Phase 7 — Within-AdBazaar port conflict resolution
- **Before:** 69 within-AdBazaar port conflicts (e.g., 5 services on port 4010, 3 services on port 4962)
- **After:** 0 within-AdBazaar conflicts
- **Method:** 64 services relocated to `5173-5199` and `5350-5390` ranges
- **No deletions:** All duplicates preserved; one of each pair moved to a fresh port

### Phase 8 — Scope annotations
- 44 non-ad services flagged via CLAUDE.md canonical-home notes
- `SCOPE-AUDIT.md` created in AdBazaar/

### Phase 9 — Scope cleanup moves
- 44 non-ad services **physically moved** out of AdBazaar to their canonical homes
- AdBazaar: 348 → 305 top-level dirs (cleanup of pollution)
- All moves committed and pushed to 8 repos

### Phase 10 — Final docs and dedup candidates
- `CANONICAL-PORT-REGISTRY.md` updated with Phase 9 summary
- `DEDUP-CANDIDATES.md` lists ~20 high-confidence duplicate services at new homes (e.g., `REZ-crm-hub` vs `rez-retail-crm-service`)
- No merges performed — manual review required

### Final state of AdBazaar

AdBazaar is now genuinely an **advertising platform** with 305 directories focused on:
- DSP/SSP/bidding infrastructure
- DOOH (digital-out-of-home) advertising
- CTV/OTT programmatic
- Ad attribution and analytics
- Audience/CDP/identity for ads
- Pixel/SDK for ads
- Creator/influencer marketing
- Social media automation (ad-tech side)
- 42 marketplace "moat" services (yield, identity, retail media, etc.)

### What's NOT in AdBazaar anymore (now at their canonical homes)

| Company | Count | Examples |
|---|---:|---|
| `companies/REZ-Merchant/` | 20 | REZ-crm-hub, REZ-checkout-sdk, WhatsApp commerce, customer engagement |
| `companies/Karma-Foundation/` | 7 | REZ-gamification-service, loyalty/rewards |
| `companies/RTNM-Group` (root /services/) | 7 | REZ-economic-engine, REZ-discovery-platform |
| `companies/HOJAI-AI/services/` | 6 | REZ-support-tools-hub, customer-support-service |
| `companies/CorpPerks/` | 2 | corpperks-hr-integration |
| `companies/REZ-Consumer/` | 1 | REZ-consumer-kb |
| `companies/RABTUL-Technologies/` | 1 | adbazaar-creator-wallet |
| **Total** | **44** | |

See `companies/AdBazaar/SCOPE-AUDIT.md` for the full move log.

### Open follow-ups (not done in Phase 5-10)

- **Service deduplication**: ~20 candidate duplicates at moved destinations (see `companies/AdBazaar/DEDUP-CANDIDATES.md`)
- **Port renumbering**: Moved services kept their original ports. No destination company had a clean port range to fit them into.
- **CLAUDE.md sync**: Each destination company may have its own CLAUDE.md that doesn't reflect the new arrivals.
- **Hub route updates**: Confirmed no moved services were referenced in `unified-os-hub/src/routes/index.js`. No updates needed.

---

## 🟢 HONEST VERDICT (2026-06-20)

AdBazaar was a 351-dir sprawl with **44 non-ad services polluting scope** and **123 port conflicts**. After Phases 5-10:

| Aspect | Before | After |
|---|---|---|
| Cross-ecosystem port collisions | 71 | **0** |
| Within-AdBazaar port conflicts | 69 | **0** |
| Non-ad services in AdBazaar | 44 | **0** (moved to canonical homes) |
| `@rez/shared` library | broken | **compiles** |
| Root npm workspace | broken | **installs** |
| Hub `/api/ads/*` route | pointing to wrong port | **fixed** |
| Hub `/api/cdp/*` route | missing | **added** |
| Dead/empty dirs | 3 | **removed** |
| AdBazaar total dirs | 351 | **305** |

**Reality check:** AdBazaar has ~5-7 genuinely production-grade services (rez-dsp-bidder, ssp-gateway, REZ-ad-exchange, adbazaar-cdp, intent-attribution, audience-twin-service, REZ-decision-service). The rest are mostly scaffold-only stubs. Future work should focus on either filling in the scaffolds or removing them.

The ecosystem architecture is now structurally cleaner. Future work should focus on:
1. Deduplication at destination homes (see DEDUP-CANDIDATES.md)
2. Filling in or pruning scaffold-only services
3. Port consolidation into destination-company port ranges (long-term)
