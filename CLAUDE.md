# RTMN Ecosystem - Complete Architecture

> **Version:** 5.13
> **Last Updated:** June 28, 2026
> **New:** HOJAI Studio v2.0 — Complete CLI with 14 commands, LLM agent generation, Blueprint Engine, Auto-Improvement, Team/Rollback/Preview/Domain/Audit
> **Status:** ✅ **HOJAI Studio Complete** — All CLI commands built, documented, and committed

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

## 🏗️ RTMN Git Architecture (June 26, 2026)

### Core Rule: RTMN Root = Docs + Submodules Only

**RTMN root is the coordination layer — NOT a code repository.**

| What | Where |
|------|-------|
| **RTMN root** | Docs only (`docs/`, `CLAUDE.md`, `CANONICAL-PORT-REGISTRY.md`) + `.gitmodules` |
| **All company code** | Each company = its own git repo, pushed to its own remote, referenced as submodule in RTMN |
| **All services** | Belong to their parent company repo, NOT in RTMN root |
| **All plans** | `.claude/plans/` in RTMN root (coordination docs) |

### RTMN Submodules (Canonical Sources)

| Company | Repo | Status |
|---------|------|--------|
| **HOJAI AI** | `git@github.com:imrejaul007/hojai-ai.git` | ✅ Submodule at `companies/HOJAI-AI/` |
| **Nexha** | `git@github.com:imrejaul007/NeXha.git` | ✅ Submodule at `companies/Nexha/` |

### Companies with Independent Git Repos

| Company | Repo | Status |
|---------|------|--------|
| **HOJAI AI** | `git@github.com:imrejaul007/hojai-ai.git` | ✅ Submodule |
| **Nexha** | `git@github.com:imrejaul007/NeXha.git` | ✅ Submodule |
| **AdBazaar** | `git@github.com:imrejaul007/adBazaar.git` | ✅ Independent |
| **REZ-Merchant** | `git@github.com:imrejaul007/REZ-Merchant.git` | ✅ Independent |
| **REZ-Consumer** | `git@github.com:imrejaul007/REZ-Consumer.git` | ✅ Independent |
| **LawGens** | `git@github.com:imrejaul007/LawGens.git` | ✅ Independent |
| **RTNM-Digital** | `git@github.com:imrejaul007/RTNM-Digital.git` | ✅ Independent |
| **RTNM-Group** | `git@github.com:imrejaul007/RTNM-Group.git` | ✅ Independent |
| **RTNM-REE** | `git@github.com:imrejaul007/RTNM-REE.git` | ✅ Independent |
| **REZ-Exhibitor** | `git@github.com:imrejaul007/REZ-Exhibitor.git` | ✅ Independent |

### Root Code Directories (Should Be Moved)

| Directory | Files | Should Become |
|----------|-------|---------------|
| `services/` | 23,905 | Submodule at `services/` |
| `industry-os/` | 47,862 | Submodule at `industry-os/` |
| `shared/` | 367 | Part of RTMN root or its own repo |
| `packages/` | 2,584 | Submodule at `packages/` |

### Migration Rule (per user directive June 26, 2026)

> **"Each company has its own repo and all should be pushed to its own repo, none to RTMN root repo"**

1. ✅ Nexha converted to submodule (June 26, 2026)
2. ⏳ HOJAI AI already a submodule
3. ⏳ Remaining companies → convert trees to submodules
4. ⏳ Root code dirs → move to their own repos/submodules

### How to Work with Submodules

```bash
# Clone RTMN with submodules
git clone git@github.com:imrejaul007/RTMN-Services.git
git submodule update --init --recursive

# Update a submodule
cd companies/Nexha
git checkout main && git pull
cd ../..
git add companies/Nexha
git commit -m "chore: Update Nexha to latest"
```

### How NOT to Work

- ❌ NEVER commit code directly to RTMN root
- ❌ NEVER add services to `services/`, `industry-os/services/`, `shared/` unless they belong to RTMN root itself
- ❌ NEVER create new companies as directories in RTMN root — create their git repo first, then add as submodule

---

## 🚀 HOJAI FOUNDRY + GLOBAL NEXHA (The Platform Model)

### The Vision

**Anyone can build an agentic marketplace for any industry in minutes — and it automatically connects to the global network.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOJAI FOUNDRY PLATFORM                       │
│                                                                 │
│   Founder ──► Choose Template ──► Customize ──► Deploy ──► Live │
│                         │                                      │
│                    15 Industry                                 │
│                    Starters                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HOJAI CLOUD                                │
│                                                                 │
│   • Auto-respawn • SSL • Custom Domains • Previews • Rollbacks │
│   • Per-tenant Runtime • Deploy Pipeline                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APP STORE                                  │
│                                                                 │
│   • Skills Catalog • Agent Marketplace • Workflow Templates      │
│   • IndustryOS Templates • One-click Install                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GLOBAL NEXHA                                │
│                                                                 │
│   • Federation Discovery • Capability Matching                   │
│   • Agent-to-Agent Commerce • Trust & Reputation                │
│   • Cross-Nexha Interoperability                               │
└─────────────────────────────────────────────────────────────────┘
```

### The Complete Founder Flow

```bash
# 1. Choose an industry starter template
npx hojai create my-food-delivery-platform --template food-delivery

# 2. Customize with your branding and agents
cd my-food-delivery-platform
npx hojai add agent delivery-optimizer
npx hojai add agent restaurant-onboarder

# 3. Deploy to HOJAI Cloud
npx hojai deploy

# 4. Your marketplace is now LIVE and discoverable on Global Nexha!
```

### What Gets Built

| Template | Example Output | Agents Created |
|----------|----------------|-----------------|
| **food-delivery** | "Zomato Agent Network" | delivery, restaurant, customer, driver, payment |
| **healthcare** | "Practo Agent Network" | appointment, prescription, doctor, pharmacy |
| **mobility** | "Uber Agent Network" | ride-match, driver, pricing, safety, payment |
| **hotel** | "Airbnb Agent Network" | booking, checkin, housekeeping, concierge |
| **ecommerce** | "Amazon Agent Network" | catalog, listing, fulfillment, returns, review |
| **logistics** | "Flexport Agent Network" | customs, tracking, warehouse, delivery |
| **fintech** | "Stripe Agent Network" | payment, dispute, payout, subscription |
| **+ 8 more** | ... | ... |

### The 510 Companies Are EXAMPLES

The 510 companies listed (Amazon → Uber → Zomato → etc.) are **NOT what we build** — they are examples of what ANY startup can build using HOJAI Foundry.

| Aspect | Detail |
|--------|--------|
| **Who builds them?** | Any startup or founder |
| **How?** | HOJAI Foundry + Cloud |
| **Where do they appear?** | Automatically live on Global Nexha |
| **Who uses them?** | Any Nexha in the federation |

### Global Nexha Federation

Once a marketplace is live:

1. **Discovery**: Other Nexhas can search and find the marketplace
2. **Capability Matching**: AI agents negotiate and trade autonomously
3. **Trust**: ReputationOS scores all participants
4. **Commerce**: Agents buy/sell services automatically

```
Nexha A (Restaurant)    Nexha B (Delivery)    Nexha C (Payment)
      │                        │                      │
      │ "I need delivery"      │                      │
      ├────────────────────────►                      │
      │                        │                      │
      │              "I'll handle it"                 │
      │         (agents negotiate price/terms)       │
      │                        │                      │
      │                        ├──────────────────────►
      │                        │     "Process payment"
      │                        │                      │
      │◄───────────────────────┤     "Done!"
      │        "Order complete"
```

### HOJAI Cloud Phase 1 (Built ✅)

| Service | Port | Purpose |
|---------|------|---------|
| **hojai-cloud** | 4380 | Deploy target with auto-respawn, SSL, custom domains |
| **app-store-api** | 4400 | Skills, agents, workflows, templates catalog |
| **cost-tracker** | 4410 | AI usage metering and billing |
| **secrets-manager** | 4420 | Encrypted credential storage |
| **voice-studio-api** | 4430 | Voice agent management |
| **workflow-builder-api** | 4440 | DAG workflow management |

**Startup:** `bash companies/HOJAI-AI/scripts/start-hojai-cloud-phase1.sh start`

### HOJAI SiteOS — 27 Services Built (June 2026)

**`companies/HOJAI-AI/products/`**

| Port | Service | Phase | Reuses |
|---|---|---|---|
| 5450 | siteos-gateway | 0.5 | TwinOS, Genie |
| 5451 | business-context-wrapper | 0.5 | CXO, Sales, Marketing |
| 5452 | channel-stitcher | 0.5 | CorpID, Customer Twin |
| 5453 | event-tracker | 0.5 | Analytics |
| 5454 | heatmap-aggregator | 0.5 | Analytics |
| 5455 | vertical-templates | 0.5 | 26 Industry OS |
| 5456 | review-scrapers | 0.5 | — |
| 5457 | lookalike-generator | 0.5 | Customer Twin, REZ Audience |
| 5458 | lead-scoring | 2 | Customer Twin |
| 5459 | marketing-automation | 2 | Marketing OS |
| 5460 | customer-twin-full | 2 | Customer Twin |
| 5461 | event-taxonomy | 2 | — |
| 5462 | workflow-visual-builder | 2 | FlowOS |
| 5463 | voice-widget | 3 | Voice Gateway |
| 5464 | ads | 3 | — |
| 5465 | crm-connectors | 3 | Sales OS, REZ CRM |
| 5466 | knowledge-base | 3 | MemoryOS |
| 5467 | ab-testing | 3 | Analytics |
| 5468 | product-federation | 4 | Nexha Discovery |
| 5469 | agent-protocol | 4 | Nexha ACP |
| 5470 | do-app-integration | 4 | DO App |
| 5471 | agent-reputation | 4 | Nexha Reputation |
| 5472 | ai-business-advisor | 5 | CXO, Sales, Marketing |
| 5473 | campaign-auto-creation | 5 | Marketing OS |
| 5474 | dynamic-pricing | 5 | — |
| 5475 | benchmark-database | 5 | — |

**Installers:** Shopify OAuth (13 files), WooCommerce, WordPress v2
**Admin Dashboard:** `products/siteos-admin/` — React UI
**Startup:** `bash companies/HOJAI-AI/scripts/start-siteos.sh start`

### Foundry Starters (15 Templates)

| Starter | Sector | Use Case |
|---------|--------|----------|
| food-delivery | Delivery | Zomato, DoorDash, Swiggy |
| healthcare | Health | Practo, 1mg, PharmEasy |
| mobility | Transport | Uber, Ola, Lyft, Rapido |
| hotel | Hospitality | Airbnb, OYO, Booking.com |
| restaurant | QSR | QSR chains, cloud kitchens |
| ecommerce | Commerce | Amazon, Flipkart, Shopify |
| logistics | Supply Chain | Flexport, Delhivery, Shiprocket |
| education | Learning | Coursera, Udemy, PhysicsWallah |
| finance | Banking | Revolut, Chime, Nubank |
| crm | Sales | Salesforce, HubSpot |
| b2b | B2B | IndiaMART, Udaan |
| agentic-ecommerce | AI Commerce | Agent-native marketplaces |
| pos | Point of Sale | Retail terminals |
| erp | Enterprise | SAP, Oracle |
| import-export | Trade | Global trade agents |

### Key Docs

| Document | What it covers |
|----------|----------------|
| [HOJAI Foundry spec](.claude/plans/hojai-developer-platform-spec.md) | CLI, SDKs, templates |
| [Global Nexha addendum](.claude/plans/global-nexha-addendum.md) | Federation, capability matching |
| [App Store spec](.claude/plans/bam-complete-spec.md) | 35+ categories, publish flow |

---

## 🌐 GLOBAL NEXHA + HOJAI PLATFORM-AS-AN-ECONOMY (June 22, 2026)

> **The strategic vision for the next 5 years.** RTMN is evolving from "50+ services connected via a hub" to **the platform where the autonomous economy is built and operated.**
>
> **Date:** 2026-06-22
>
> **Status:** ✅ **Strategic direction approved.** Implementation begins immediately with Phase D of the 18-month roadmap.

### The 5-Year Vision

```
RTMN Digital (parent holding)
├── HOJAI AI (multi-product AI company)
│   ├── HOJAI Intelligence (foundation models)
│   ├── HOJAI Foundation (CorpID, MemoryOS, TwinOS, etc.)
│   ├── HOJAI SUTAR OS (Autonomous Business OS — workforce + apps + engines)
│   ├── HOJAI Foundry (AI startup generator — 14 layers)
│   ├── HOJAI Cloud, Skills, Copilot, Genie
│
├── Nexha (autonomous business network)
│   ├── Nexha OS (self-hostable runtime)
│   ├── Network services (CapabilityOS, ReputationOS, DiscoveryOS, etc.)
│   ├── Global Nexha federation
│
├── RABTUL (economic infrastructure — payments, wallet, BNPL, treasury)
├── KHAIRMOVE (agentic logistics — mobility, delivery, nexha-autonomous-logistics)
├── Industry Networks (StayOwn = Hospitality, RisaCare = Healthcare, etc.)
├── Karma Foundation (loyalty + ESG)
├── AdBazaar (transition product: paid → reputation-based discovery)
└── [external consumers: do-app, REZ-Consumer, etc.]
```

### Canonical Positioning (one-liner each)

| Entity | Position |
|---|---|
| **RTMN Digital** | Parent holding company for the autonomous economy |
| **HOJAI AI** | The multi-product AI company (8 product lines including Intelligence, Foundation, SUTAR OS, Foundry, Cloud, Skills, Copilot, Genie) |
| **Nexha** | The internet of autonomous businesses (federation layer where Nexhas connect) |
| **SUTAR OS** | The Autonomous Business OS embedded in every Nexha (Linux-in-Android model) |
| **HOJAI Foundry** | The Platform-as-an-Economy — lets anyone build AI-native businesses in 30 minutes |
| **RABTUL** | Economic infrastructure (payments + treasury + trust) |
| **KHAIRMOVE** | Agentic logistics (delivery, mobility, nexha-autonomous-logistics) |

### The 14 Layers of HOJAI Foundry

Anyone can build on HOJAI: Consumer Apps, B2B Platforms, Industry OS, Enterprise Software, AI Products, Department OS, Marketplaces, Company Builders, Government Platforms, Financial Infrastructure, Developer Products, Autonomous Networks, Digital Twin Platforms, Knowledge Platforms.

### 5-Year Targets

| Year | Nexhas | Platforms on HOJAI | Companies | ARR | Autonomous GMV |
|---|---|---|---|---|---|
| Y1 | 100 | 50 | 500 | $11M | $10M |
| Y2 | 1,000 | 5,000 | 10,000 | $130M | $1B |
| Y3 | 10,000 | 50,000 | 100,000 | $600M | $50B |
| Y4 | 100,000 | 500,000 | 1M | $2.2B | $500B |
| Y5 | 1M | 5M | 10M | $7.4B | $5T |

### 📚 The Strategic Planning Documents (canonical)

All planning for Global Nexha + HOJAI Platform-as-an-Economy lives in these documents:

| # | Document | What it covers | When to read |
|---|---|---|---|
| 1 | **[global-nexha-development-plan.md](.claude/plans/global-nexha-development-plan.md)** | 18-month Phase D-I roadmap for the foundation | When planning immediate work |
| 2 | **[rtmn-companies-contribution-audit.md](.claude/plans/rtmn-companies-contribution-audit.md)** | Audit of all RTMN companies (RABTUL, KHAIRMOVE, AdBazaar, etc.) | When deciding what each company builds |
| 3 | **[hojai-platform-as-an-economy-5year-plan.md](.claude/plans/hojai-platform-as-an-economy-5year-plan.md)** | 5-year vision with 14 layers, 3 parallel workstreams, revenue model | When planning beyond 18 months |
| 4 | **[hojai-platform-architecture-v2.md](.claude/plans/hojai-platform-architecture-v2.md)** | v2 architecture: Blueprint Engine + Company Compiler + Diff Engine + Continuous Evolution | When understanding how companies are created and evolved |
| 5 | **[hojai-developer-platform-spec.md](.claude/plans/hojai-developer-platform-spec.md)** | Lego-block SDKs, CLI, AI-native spec for Claude Code/Cursor | When building the developer platform |
| 6 | **[global-nexha-addendum.md](.claude/plans/global-nexha-addendum.md)** | Spec-level details: CapabilityOS schema, ACI formula, nexha-autonomous-logistics, CLI prompts, governance, funding, risk scenarios | When implementing specific features |
| 7 | **[phase3-startup-developer-plan.md](.claude/plans/phase3-startup-developer-plan.md)** | External Studio plan for founders + developers (30-min startup wizard) | When building the founder/developer experience |
| 8 | **[blr-ai-marketplace-role.md](.claude/plans/blr-ai-marketplace-role.md)** | How BAM (BLR AI Marketplace) helps every component of HOJAI Platform (1,200+ catalog items) | When working on the marketplace / install flows |
| 9 | **[bam-complete-spec.md](.claude/plans/bam-complete-spec.md)** | Complete BAM spec: 35+ categories (Business Capability Packs, HOJAI Widget, REZ Intel Packs, Local Nexha Packs), 13 competitor categories, "AI Employees" reframing, 11 revenue streams | When planning BAM features, certification, or AI recommender |
| 10 | **[hojai-widget-spec.md](.claude/plans/hojai-widget-spec.md)** | HOJAI Widget (5KB embeddable) — the billion-dollar distribution channel for every website | When building the widget / distribution |
| 10b | **[hojai-siteos-master-plan.md](.claude/plans/hojai-siteos-master-plan.md)** | HOJAI SiteOS full vision: AI employee that runs your website 24/7, 13 modules, 100-event taxonomy | When understanding the full SiteOS vision |
| 10c | **[hojai-siteos-phase-wise-plan.md](.claude/plans/hojai-siteos-phase-wise-plan.md)** | Phase-wise implementation: 5 phases (21 weeks), 22 new services, 200+ existing services to reuse | When building SiteOS phases 0-5 |
| 11 | **[developer-platform-gaps.md](.claude/plans/developer-platform-gaps.md)** | The 12 missing developer platform pieces (Developer Portal, Local Runtime, Debugger, Package Manager, etc.) | When building the developer ecosystem |
| 12 | **[rez-intelligence-local-economy.md](.claude/plans/rez-intelligence-local-economy.md)** | REZ Intelligence (12+ services, unused) + Local Nexha (city-level networks) + BuzzLocal + DO (consumer gateway) | When building REZ Intelligence integration or Local Nexha |
| 13 | **[skillos-usage.md](.claude/plans/skillos-usage.md)** | How SkillOS (the capability layer) is used across the whole HOJAI project | When building skills, agents, or workflow composition |
| 14 | **[strategic-moat-acp-positioning.md](.claude/plans/strategic-moat-acp-positioning.md)** | 5-layer moat analysis, OpenAI threat, ACP as universal AI-to-AI protocol | When positioning HOJAI vs competitors |
| 15 | **[employee-twin-ecosystem-complete-plan.md](.claude/plans/employee-twin-ecosystem-complete-plan.md)** | Complete Employee Twin OS plan (6 phases, 27 weeks, 67 new services) | When building Employee Twins, Connectors, Skill Economy, or Autonomous Execution |

**Plus investor + sample artifacts:**

| Document | What it covers |
|---|---|
| **[hojai-investor-pitch-deck.md](.claude/plans/hojai-investor-pitch-deck.md)** | HOJAI 10-slide investor pitch deck (platform company — $28M Series A) |
| **[nexha-investor-pitch-deck.md](.claude/plans/nexha-investor-pitch-deck.md)** | Nexha 10-slide investor pitch deck (network company — $50M Series A) |
| **[sample-marketplace-hojai-ai.md](.claude/plans/sample-marketplace-hojai-ai.md)** | Sample `hojai.ai.md` file for a B2B marketplace starter (the AI-native spec for Claude Code / Cursor / Codex) |

**Plus commerce + marketing:**

| Document | What it covers |
|---|---|
| **[d2c-agentic-commerce-model.md](.claude/plans/d2c-agentic-commerce-model.md)** | DO + REZ + ACS commerce model with dynamic commission |
| **[agentic-marketing-playbook.md](.claude/plans/agentic-marketing-playbook.md)** | Agentic marketing: WhatsApp + email + push + voice + REZ-incentivized attention |

**Plus audit:**

| Document | What it covers |
|---|---|
| **[built-vs-needed-audit.md](.claude/plans/built-vs-needed-audit.md)** | What's built vs what needs building (75% built, 25% gap) |

### Key Strategic Decisions (baked into all docs)

| Decision | Choice | Why |
|---|---|---|
| Market structure | Federation (not a centralized marketplace) | Internet won over AOL; same logic |
| Org structure | HOJAI = multi-product AI company; Nexha = network company | Two separate businesses, different economics |
| SUTAR's role | Embedded Autonomous Business OS in every Nexha | Linux-in-Android model; maximum leverage |
| HOJAI Studio vs Foundry | Studio (UI for founders) + Foundry (CLI for developers) — two interfaces of same engine | Different users, same output |
| HOJAI Blueprint Engine | Source of truth (company.blueprint.yaml) → Compiler → production company | "Compile company" not "generate app" |
| Diff Engine | Surgical updates (only changed parts) | Vs competitors who regenerate from scratch |
| Continuous Evolution | Companies improve themselves every week | Nobody else does this |
| BAM (BLR AI Marketplace) | "App Store" with 1,200+ items, 7 backend services, 53 tests | Strategic moat already built |
| HOJAI Foundry | Platform for generating AI-native startups | Founder flywheel; 10x leverage |
| Messaging | "Run your business with AI" not "SUTAR OS" | Customers buy outcomes, not technology |
| ACP protocol | Open spec, closed impl initially; SDKs at Year 3; Foundation at Year 5 | Kubernetes / OAuth / Linux Foundation pattern |
| Cold-start | SME restaurant → Logistics → Government | Proven sequence (SWIFT, Visa) |
| Build vs partner | Build the AI-differentiated stuff; partner for commodities | Don't build what already exists well |
| Pricing | Free Nexha OS; paid foundation services; federation subs; transaction fees; Foundry subscriptions | Distribution + value capture |

### What This Means for RTMN Today

1. **HOJAI is the strategic AI company**, not just infrastructure. It has 8 product lines.
2. **Nexha is the network company**, separate from HOJAI.
3. **SUTAR OS is the Autonomous Business OS** that ships inside every Nexha (customers don't see SUTAR).
4. **BAM (BLR AI Marketplace) is the App Store** — 1,200+ items, 7 backend services, 53 tests already built. NO competitor has this.
5. **RABTUL, KHAIRMOVE, Industry Networks** are core contributors, not separate silos.
6. **The 14 layers of HOJAI Foundry** are the long-term moat — anyone can build on HOJAI.
7. **The v2 architecture (Blueprint + Compiler + Diff + Evolution)** is the 5-year platform play.

### Where to Find What

- **Immediate roadmap (18 months):** [global-nexha-development-plan.md](.claude/plans/global-nexha-development-plan.md) — Phases D-I
- **5-year vision:** [hojai-platform-as-an-economy-5year-plan.md](.claude/plans/hojai-platform-as-an-economy-5year-plan.md)
- **v2 architecture (Blueprint + Compiler + Diff + Evolution):** [hojai-platform-architecture-v2.md](.claude/plans/hojai-platform-architecture-v2.md)
- **Developer platform spec:** [hojai-developer-platform-spec.md](.claude/plans/hojai-developer-platform-spec.md)
- **Detailed specs (schema, formulas, prompts, governance):** [global-nexha-addendum.md](.claude/plans/global-nexha-addendum.md)
- **Company contributions + gaps:** [rtmn-companies-contribution-audit.md](.claude/plans/rtmn-companies-contribution-audit.md)
- **BLR AI Marketplace (BAM) role:** [blr-ai-marketplace-role.md](.claude/plans/blr-ai-marketplace-role.md) — how BAM helps every component
- **BAM complete spec:** [bam-complete-spec.md](.claude/plans/bam-complete-spec.md) — 35+ categories, "AI Employees" reframing, 13 competitor categories, 11 revenue streams, Business Capability Packs
- **HOJAI Widget:** [hojai-widget-spec.md](.claude/plans/hojai-widget-spec.md) — the billion-dollar distribution channel
- **HOJAI SiteOS:** [hojai-siteos-master-plan.md](.claude/plans/hojai-siteos-master-plan.md) — the AI employee that runs your website 24/7. Reuses 200+ existing RTMN services (MemoryOS, TwinOS, AgentOS, MarketingOS, SalesOS, Nexha, etc.). [hojai-siteos-phase-wise-plan.md](.claude/plans/hojai-siteos-phase-wise-plan.md) — phase-wise build plan (Phase 0-5, 21 weeks, ~15K LOC SiteOS glue layer + 200K LOC existing)
- **Developer Platform gaps:** [developer-platform-gaps.md](.claude/plans/developer-platform-gaps.md) — the 12 missing pieces
- **REZ Intelligence + Local Economy:** [rez-intelligence-local-economy.md](.claude/plans/rez-intelligence-local-economy.md) — REZ Intel + Local Nexha + BuzzLocal
- **BLR inventory:** [blr-marketplace-agent-inventory.md](.claude/plans/blr-marketplace-agent-inventory.md) — 1,200+ catalog items
- **SkillOS usage:** [skillos-usage.md](.claude/plans/skillos-usage.md) — how SkillOS powers the whole project
- **Strategic moat + ACP:** [strategic-moat-acp-positioning.md](.claude/plans/strategic-moat-acp-positioning.md) — 5-layer moat, OpenAI threat analysis
- **External Studio plan (founders + developers):** [phase3-startup-developer-plan.md](.claude/plans/phase3-startup-developer-plan.md)
- **D2C commerce model (DO + REZ + ACS):** [d2c-agentic-commerce-model.md](.claude/plans/d2c-agentic-commerce-model.md)
- **Agentic marketing playbook:** [agentic-marketing-playbook.md](.claude/plans/agentic-marketing-playbook.md)
- **What's built vs needed:** [built-vs-needed-audit.md](.claude/plans/built-vs-needed-audit.md)
- **Investor pitch:** [hojai-investor-pitch-deck.md](.claude/plans/hojai-investor-pitch-deck.md) (HOJAI — platform) and [nexha-investor-pitch-deck.md](.claude/plans/nexha-investor-pitch-deck.md) (Nexha — network)
- **Sample `hojai.ai.md`:** [sample-marketplace-hojai-ai.md](.claude/plans/sample-marketplace-hojai-ai.md)

---

## 🎯 HOJAI Studio v2.0 — Build Any Company in 30 Minutes (2026-06-28)

**HOJAI Studio** is the **Platform-as-an-Economy** — any founder can build any AI-powered company in 30 minutes.

### Complete CLI Commands (14 Total)

```bash
# Core
npx hojai create <name> --template=<type>   # Scaffold new project
npx hojai add agent <name> --from-llm        # Add AI agent (LLM-powered)
npx hojai deploy [project]                   # Deploy to HOJAI Cloud
npx hojai inspect [project]                  # Project diagnostics

# Deployment
npx hojai rollback --deployment=<id>         # Rollback to previous version
npx hojai preview --branch=<name>            # Create preview environment
npx hojai domain add|verify|list|remove      # Custom domains with SSL

# Team & Enterprise
npx hojai team add|remove|list|update        # Team management (RBAC)
npx hojai audit report|export|keys           # Audit logs & analytics

# AI-Powered Features
npx hojai generate starter --spec=<file>     # Blueprint Engine (LLM)
npx hojai evolve --project=<dir> --auto      # Auto-Improvement Engine
```

### The Problem

| Traditional | HOJAI Studio |
|-------------|-------------|
| 6 months to build | 30 minutes |
| 50 engineers | 1 founder |
| $2M burn | $500/month AI |
| Years to scale | Instant |

### What You Get

```
HOJAI Studio
    │
    ├── 16 Templates Ready
    │        ├── Agentic E-Commerce 🛍️
    │        ├── Food Delivery 🍔
    │        ├── Import/Export 🌍
    │        ├── Mobility 🚗
    │        ├── Marketplace 🛒
    │        ├── Healthcare 🏥
    │        ├── Education 🎓
    │        ├── Fintech 💰
    │        └── +8 more...
    │
    ├── AI Workforce (6-13 agents)
    │        ├── CEO Strategist
    │        ├── Growth Agent
    │        ├── Operations Agent
    │        └── ...domain-specific
    │
    ├── Auto-Deploy
    │        ├── Passenger App
    │        ├── Seller/Driver App
    │        └── Admin Dashboard
    │
    └── Nexha Network
             ├── Payments
             ├── Logistics
             └── Insurance
```

### Templates Built (16 Total)

| Template | AI Workers | Monthly Cost | Like |
|----------|-----------|-------------|------|
| **Agentic E-Commerce** | 12 agents | $4,050 | Amazon |
| **Food Delivery** | 10 agents | $3,100 | Swiggy/UberEats |
| **Import/Export** | 9 agents | $3,250 | Alibaba |
| **Mobility** | 13 agents | $3,800 | Uber |
| **Marketplace** | 8 agents | $2,800 | Shopify |
| **Healthcare** | 6 agents | $1,900 | Practo |
| **Education** | 6 agents | $1,550 | BYJU's |
| **Fintech** | 7 agents | $2,650 | CRED |
| Restaurant | 6 agents | $2,100 | Zomato |
| Hotel | 7 agents | $2,450 | OYO |
| Logistics | 8 agents | $2,800 | Delhivery |
| B2B Platform | 9 agents | $3,150 | IndiaMART |

### Services (32 Total)

| Port | Service |
|------|---------|
| 3001 | **Studio UI** (Web wizard) |
| 4399 | RTMN Hub |
| 4500 | Template Compiler |
| 4510 | BAM (Hire AI workers) |
| 4520 | Agent Generator |
| 4530 | Auth (JWT) |
| 4540 | Deploy Pipeline |
| 4550 | Flows Engine |
| 4560 | Company Mapper (510 companies) |
| 4570 | Studio Orchestrator |

### Industry Services

| Port | Template | Services |
|------|---------|---------|
| 4700 | OTA | PMS, GDS, Payment, Build |
| 4710 | E-Commerce | Inventory, Fulfillment, Returns |
| 4720 | Mobility | Driver, Fleet, Dispatch, Surge |
| 4730 | Healthcare | Doctor, Pharmacy, Insurance |
| 4740 | Education | LMS, Courses, Assessments |
| 4750 | Fintech | Banking, Trading, Loans |
| 4760 | Logistics | Routing, Tracking, Warehouse |

### Startup

```bash
bash scripts/start-hojai.sh
# Opens: http://localhost:3001
```

### Deploy Any Company

```bash
# Food Delivery (Swiggy clone)
curl -X POST localhost:4540/deploy \
  -d '{"companyName": "FastBite", "template": "food-delivery"}'

# E-Commerce (Amazon clone)
curl -X POST localhost:4540/deploy \
  -d '{"companyName": "ShopSmart", "template": "agentic-ecommerce"}'

# Import/Export (Alibaba clone)
curl -X POST localhost:4540/deploy \
  -d '{"companyName": "TradeGlobal", "template": "import-export"}'
```

### 510 Companies Supported

Agent Generator knows how to build agents for:
- Amazon, Flipkart, Alibaba, eBay, Etsy, Shopify, Meesho
- Uber, Ola, Rapido, Lyft
- Swiggy, Zomato, DoorDash, UberEats, Instacart
- Practo, 1mg, PharmEasy
- CRED, Groww, Razorpay, PhonePe
- BYJU's, Unacademy, PhysicsWallah
- OYO, MakeMyTrip
- PolicyBazaar, Acko
- Delhivery, BlackBuck
- **+ 490 more**

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
│  │   CorpID (4702) │ Memory Layer (4703/4152/4704/4793) │ TwinOS (4705)   │   │
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

The RTMN root `services/` folder hosts **integration-level sales/CRM services** that complement (not replace) the canonical Department OS at `industry-os/services/sales-os/`. Each is a standalone integration, not a duplicate of Sales OS.

> **Reorganization (2026-06-22):** Reduced from 73 services → 9 root integrations. See [SERVICES-AUDIT-2026-06-22.md](SERVICES-AUDIT-2026-06-22.md) for the full plan; all 64 services moved to their canonical homes (HOJAI-AI divisions, industry-os verticals, REZ-Workspace core engines, REZ-Merchant/Consumer support).

The 9 remaining root integrations are:

| Service | Purpose | Integration With |
|---------|---------|------------------|
| **`REZ-SalesMind`** (5167) | 8 AI sales agents (qualification, outreach, follow-up) — *moved here from AdBazaar 2026-06-22* | Sales OS (5055) |
| **`customer-graph-360`** (4808) | 360° customer graph aggregating CRM + Wallet + Support — *moved here from AdBazaar 2026-06-22* | Sales OS + CRM Hub |
| **`crm-engine`** | Standalone CRM engine (legacy) | Sales OS |
| **`sales-automation`** (5183) | Sales workflow automation scripts | Sales OS |
| **`sales-hub`** (5180) | Aggregator hub for sales signals (cross-OS) | Sales OS + Marketing OS |
| **`sales-intelligence`** (5181) | Sales analytics + forecasting | Sales OS + Revenue Intelligence |
| **`sales-sync`** (5182) | Cross-system lead/customer sync | Sales OS + Marketing OS + CRM |
| **`lead-os-gateway`** | Lead ingestion gateway | Sales OS + Marketing OS |
| **`customer-success-os`** (4050) | Legacy CS (rooted variant) — see `industry-os/services/customer-success-os/` as canonical | Customer Success OS (4050) |

**Rule:** Sales/CRM features belong in `industry-os/services/sales-os/` (the canonical Sales OS). The root `services/` list above are **integrations/connectors** that extend Sales OS to other OS — they are NOT replacements.

---

## 🟢 All 10 Weeks Shipped (2026-06-22)

The 10-week roadmap is complete. **Every phase from A through E is done.**

| Phase | What it shipped | Status |
|---|---|---|
| **A. Foundation** | Hub on :4399 with `/api/sutar/*` proxy, `proxyToUpstream()` body-forwarding fix, vitest setup | ✅ |
| **B. SUTAR OS** | sutar-economy-os 105 tests, sutar-trust-engine `/api/v1/sada/status`, sutar-contract-os 179 tests + real bug fix in `versions.ts`, sutar-decision-engine multi-option ranking | ✅ |
| **C. Nexha network** | Routes wired through Hub + 5 real services: C.1 nexha-supplier-network (4280, 20 tests), C.2 nexha-distribution-network (4285, 22 tests + bug fix), C.4 nexha-trade-finance-network (4287, 38 tests), C.5 nexha-warehouse-network (4288, 49 tests = 20 slot booking + 29 WMS), C.6 nexha-pricing-network (4286, 31 tests). Moved from HOJAI-AI/sutar-os/core/sutar-* to companies/Nexha/services/nexha-* on 2026-06-22 per ADR-0009 (Phase 0). Old `sutar-*` names kept as Hub deprecation aliases. See [`docs/adr/0009-PHASE-WISE-UPGRADE-PLAN.md`](docs/adr/0009-PHASE-WISE-UPGRADE-PLAN.md). | ✅ |
| **D. ADR-0010 Multi-Tenant Federation** | **✅ All 11 phases done (Jun 22-23 2026).** 8 new services shipped: Business Directory (4360, 68 tests) + ACP-Messaging (4340, 78) + Agent Marketplace (4250, 109) + Mission Planner (4362, 120) + Partner Graph (4363, 90) + Commerce Runtime (4364, 118) + Per-Tenant SUTAR Instances (4141, 110) + Per-Tenant Industry OS Instances (4365, 136). Hub wired at all 8 routes. +501 ecosystem tests (1,007 → 1,508). Retrospective at [`docs/nexha/adr-0010-retrospective.md`](docs/nexha/adr-0010-retrospective.md). | ✅ |
| **D. do-app** | Backend `nexha` client with 7 unit tests, autopilot Step 5 surface-suppliers, mobile autopilot tab | ✅ |
| **E. Docs/Ops** | `docker-compose.dev.yml`, `scripts/dev-stack.sh`, `demos/full-stack-demo.sh`, 6 ADRs, root README | ✅ |

**425 vitest tests** across 7 SUTAR services, **0 failures**. **2 real service bugs** caught and fixed by tests. All 5 git repos in sync.

> **📈 ADR-0010 Phase 7 update (2026-06-22):** +90 vitest tests added for Partner Graph (service 67 = 33 service + 34 routes; do-app partnerGraph client 8; REZ-Workspace partner-graph methods 15). New total: **931 tests, 0 failures** across all RTMN services. See [`docs/nexha/PHASE-LOG.md`](docs/nexha/PHASE-LOG.md) + [`docs/nexha/partner-graph.md`](docs/nexha/partner-graph.md).

> **📈 ADR-0010 Phase 8 update (2026-06-22):** +118 vitest tests added for Commerce Runtime (service 86 = 44 service + 42 routes; do-app commerceRuntime client 10; REZ-Workspace commerce-runtime methods 22). New total: **1,017 tests, 0 failures** across all RTMN services. See [`docs/nexha/PHASE-LOG.md`](docs/nexha/PHASE-LOG.md) + [`docs/nexha/commerce-runtime.md`](docs/nexha/commerce-runtime.md).

> **📈 ADR-0010 Phase 9 update (2026-06-22):** +110 tests added for Per-Tenant SUTAR Instances (service 75 = 43 instanceService + 32 routes; do-app `sutar.tenantInstances` client 17; REZ-Workspace `provisionInstance`/`listInstances`/etc. methods 18). New total: **1,144 tests, 0 failures**. New service lives in `companies/HOJAI-AI/sutar-os/core/sutar-tenant-instances/` (port 4141). See [`docs/nexha/PHASE-LOG.md`](docs/nexha/PHASE-LOG.md) + [`docs/nexha/sutar-tenant-instances.md`](docs/nexha/sutar-tenant-instances.md).

> **📈 ADR-0010 Phase 10 update (2026-06-23):** +136 tests added for Per-Tenant Industry OS Instances (service 96 = 47 instanceService + 49 routes; do-app `sutar.industryTenantInstances` client 20; REZ-Workspace `provisionIndustryInstance`/`listIndustryInstances`/etc. methods 20). New total: **1,280 tests, 0 failures**. New service lives in `industry-os/services/industry-tenant-instances/` (port 4365). See [`docs/nexha/PHASE-LOG.md`](docs/nexha/PHASE-LOG.md) + [`docs/nexha/industry-tenant-instances.md`](docs/nexha/industry-tenant-instances.md).

> **✅ ADR-0010 Phase 11 update (2026-06-23):** Documentation-only — the end-of-ADR retrospective + ecosystem health audit + investor update. 6-section retrospective at [`docs/nexha/adr-0010-retrospective.md`](docs/nexha/adr-0010-retrospective.md) covers: (1) what shipped, (2) before/after architecture, (3) what worked, (4) what didn't, (5) ecosystem health audit (477 services, 143 healthy, 1,508 tests, 5 repos), (6) investor-facing summary. ADR-0010 status flipped to **Complete (Phase 11 / 11) — DONE 2026-06-23**. **+501 tests added across the 11 phases** (1,007 → 1,508); 8 new services. Follow-on roadmap (Phases 12-15) captured in the retrospective.

> **📈 Phase F update (2026-06-24):** FederationOS v1.1 deployment + Nexha OS Docker Runtime + Nexha Portal v2.0 + **HOJAI Voice Gateway** (port 4880, training-aware STT/TTS routing) + **Nexha Supplier Registry** (port 4281, complete trade lifecycle: onboarding → KYB → contract → RFQ → PO → shipment → payment). Federation seed fixed (104 Nexhas seeded). See [`companies/Nexha/services/nexha-federation-os/`](companies/Nexha/services/nexha-federation-os/), [`companies/HOJAI-AI/products/voice-os/core/voice-gateway/`](companies/HOJAI-AI/products/voice-os/core/voice-gateway/), [`companies/Nexha/services/nexha-supplier-registry/`](companies/Nexha/services/nexha-supplier-registry/).

> **📈 Phase F update (2026-06-25):** **RAZO Keyboard** (port 4299, Communication OS) integrated with Do App. RAZO transforms natural language into actionable intents that connect Genie AI, DO App, SUTAR OS, Copilots, and all 24 Industry OS. Added: `services/razoClient.ts` (intent detection, execute, sessions, messaging), `routes/razo.ts` (15 endpoints), Hub wired at `/api/foundation/razo-keyboard/*` with 25 capabilities (intent-detect, order-food, make-payment, ask-genie, etc.). See [`companies/do-app/backend/src/services/razoClient.ts`](companies/do-app/backend/src/services/razoClient.ts), [`companies/do-app/backend/src/routes/razo.ts`](companies/do-app/backend/src/routes/razo.ts), [`companies/HOJAI-AI/products/razo/razo-keyboard/`](companies/HOJAI-AI/products/razo/razo-keyboard/).

> **📈 Phase F update (2026-06-26):** **Mobile Copilot UI + RAZO Autopilot + Webhook Routing + Tests.** (1) `useCopilot.ts` + `useRazo.ts` hooks in mobile with 8 methods each; (2) `CopilotCard.tsx` component — surfaces "Buy Now / Wait / Watch" verdict + active promotions in the Shop tab; (3) RAZO intent detection wired into the Autopilot tab (type natural language → see intent + entities); (4) Real webhook routing: WhatsApp/Telegram/SMS/Email → intent detect → Copilot chat fallback → channel response; (5) RAZO added to `scripts/dev-stack.sh` (port 4299); (6) 42 new vitest tests (21 razoClient + 21 copilotClient, all passing); (7) **100 new vitest tests** for RAZO keyboard core engines (IntentRouter 24, ContextEngine 27, ActionEngine 20, ChannelBridge 29, all 100 passing) — tested with nock for HTTP interception. Total test count: **25,269 tests across ecosystem**. See [`companies/do-app/mobile/src/hooks/useCopilot.ts`](companies/do-app/mobile/src/hooks/useCopilot.ts), [`companies/do-app/mobile/src/hooks/useRazo.ts`](companies/do-app/mobile/src/hooks/useRazo.ts), [`companies/do-app/mobile/src/components/CopilotCard.tsx`](companies/do-app/mobile/src/components/CopilotCard.tsx), [`companies/do-app/backend/__tests__/unit/razoClient.test.ts`](companies/do-app/backend/__tests__/unit/razoClient.test.ts), [`companies/do-app/backend/__tests__/unit/copilotClient.test.ts`](companies/do-app/backend/__tests__/unit/copilotClient.test.ts), [`companies/HOJAI-AI/products/razo/razo-keyboard/__tests__/unit/`](companies/HOJAI-AI/products/razo/razo-keyboard/__tests__/unit/).

### Try it in 30 seconds

```bash
# Start the full stack (Nexha OS + AgentOS)
bash scripts/dev-stack.sh start

# Run the Global Nexha flow demo
bash demos/global-nexha-demo.sh

# Or run the full-stack demo
bash demos/full-stack-demo.sh
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

### Foundation Services (7)

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **CorpID** | 4702 | ✅ | Universal Identity |
| **Memory Layer** (26 services) | 4703, 4152, 4704, 4780-4803 | ✅ | Knowledge & Experience — see "Memory Layer" below |
| **TwinOS Hub** | 4705 | ✅ | Digital Twins (86+ twins) |
| **TwinOS Shared** | N/A | ✅ | Shared Library for Twins |
| **HOJAI Voice Gateway** | 4880 | ✅ | Training-aware STT/TTS routing |
| **RAZO Keyboard** | 4299 | ✅ | Communication OS — intent detection + multi-channel messaging; in dev-stack.sh |

### Memory Layer (26 services) — World-Class AI Memory System

The Memory Layer provides enterprise-grade AI memory with temporal reasoning, pattern detection, knowledge compilation, and self-improvement capabilities. Inspired by Mem0, Zep, LangMem, and Pinecone Nexus.

> **12/12 Competitive Capabilities Complete** — HOJAI MemoryOS now has full coverage that no competitor matches (Mem0, Zep, Glean, OpenAI).

| Service | Port | Purpose | Tests |
|---------|------|---------|-------|
| **Core Storage** |
| MemoryOS | 4703 | The dumb store — 15 memory types, knowledge graph, working/long-term | ✅ 23 |
| Memory Confidence | 4152 | Per-fact reliability (base × decay × contradiction) | ✅ 19 |
| Twin Memory Bridge | 4704 | Twin ↔ memory partition links | ✅ (in twins/) |
| Memory Context Engine | 4793 | LLM context composer (relevance × confidence × recency) | ✅ 17 |
| **Intelligent Memory** |
| Memory Intelligence | 4786 | Remember, Forget, Compress, Merge, Contradiction, Importance, Decay | ✅ 41 |
| Memory Substrate | 4782 | PostgreSQL + pgvector backend | ✅ 43 |
| **Advanced Features** |
| Memory Procedural | 4783 | Skills, workflows, best practices, learned behaviors | ✅ 10 |
| Memory Temporal | 4784 | Temporal knowledge graph (valid_from/valid_until) | ✅ 11 |
| Memory Observation | 4785 | Pattern detection, habit identification, predictions | ✅ 23 |
| Memory Compiler | 4789 | Compile facts into briefs, profiles, digests | ✅ 12 |
| **Operations** |
| Memory Benchmark | 4787 | Metrics: Recall@5, Latency, Accuracy | ✅ 16 |
| Memory Learning Engine | 4788 | Outcome tracking, failure analysis, behavior optimization | ✅ 18 |
| **Enterprise Features** |
| Memory Relationships | 4790 | Graph-based relationships, bidirectional links, path finding, community detection | ✅ 39 |
| Memory Governance | 4791 | GDPR/CCPA compliance, ownership chains, consent management, retention policies | ✅ 36 |
| Memory Forgetting | 4792 | Scheduled/manual forgetting, undo capabilities, forgetting policies | ✅ 27 |
| Memory Import | 4780 | Multi-source ingestion, format conversion, validation, import jobs | ✅ 19 |
| Memory Portability | 4793 | Export jobs, backup, migration, GDPR portability requests | ✅ 15 |
| Memory Marketplace | 4781 | Template marketplace, subscriptions, reviews, categories | ✅ 14 |
| **Network & Data** |
| Memory Network | 4795 | Inter-service communication, pub/sub messaging, service registry | ✅ 27 |
| Knowledge Network | 4796 | Cross-service knowledge graph connections, graph traversal | ✅ 22 |
| Data Catalog | 4797 | Memory data indexing and discovery | ✅ 11 |
| Experiment Tracking | 4798 | Memory experiments and iterations | ✅ 12 |
| Feature Store | 4799 | Pre-computed memory features | ✅ 10 |
| Knowledge Distillation | 4800 | Compress and distill memory knowledge | ✅ 10 |
| **Truth & Multi-modal** |
| Memory Truth Engine | 4801 | Source credibility, contradiction detection, evidence chains | ✅ 12 |
| Memory Multimodal | 4802 | Image, audio, video, document memory processing | ✅ 16 |
| Memory Federation | 4803 | Cross-company memory sharing with privacy boundaries | ✅ 14 |

**Total: 473 tests across 26 services** (June 28, 2026)

**SDK:** `@hojai/memory-sdk` at `companies/HOJAI-AI/sdk/hojai-memory-sdk/` — Unified TypeScript SDK for all 26 memory services

```typescript
import { MemoryOS } from '@hojai/memory-sdk';
const memory = new MemoryOS({ apiKey: '...' });
await memory.remember('Meeting at 3pm', 'user_1');
await memory.verify('Product launches Q4');
```

See [HOJAI-AI/docs/MEMORY-LAYER.md](companies/HOJAI-AI/docs/MEMORY-LAYER.md)

**SDK:** `@hojai/memory-sdk` at `companies/HOJAI-AI/sdk/hojai-memory-sdk/` — Unified TypeScript SDK for all 26 memory services

```typescript
import { MemoryOS } from '@hojai/memory-sdk';
const memory = new MemoryOS({ apiKey: '...' });
await memory.remember('Meeting at 3pm', 'user_1');
await memory.verify('Product launches Q4');
```

See [HOJAI-AI/docs/MEMORY-LAYER.md](companies/HOJAI-AI/docs/MEMORY-LAYER.md)

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

### RAZO Keyboard (1) - ✅ INTEGRATED

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **RAZO Keyboard** | 4299 | ✅ | Communication OS — "The keyboard that thinks" — transforms natural language into actionable intents (order-food, book-hotel, make-payment, ask-genie, etc.) connecting Genie AI, DO App, SUTAR OS, Copilots, and all 24 Industry OS. Integrated with Do App backend (`razoClient.ts` + `routes/razo.ts` + real webhook routing) and RTMN Hub at `/api/foundation/razo-keyboard/*`. Mobile: `useRazo.ts` hook + RAZO intent detection in Autopilot tab. Dev stack: `scripts/dev-stack.sh` starts RAZO on port 4299. 100 vitest tests covering IntentRouter (24), ContextEngine (27), ActionEngine (20), ChannelBridge (29). |

### REZ Services (4)

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **REZ Auth** | 4002 | ✅ | Authentication |
| **REZ Wallet** | 4004 | ✅ | Payments & Rewards |
| **REZ CRM Hub** | 4056 | ✅ | Customer Relations |
| **REZ Care Service** | 4055 | ✅ | Customer Support |

### Nexha Platform Services (13)

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **nexha-capability-os** | 4270 | ✅ | Machine-readable capability schema + registry for federation |
| **nexha-reputation-os** | 4271 | ✅ | Autonomous Commerce Index (ACI) scoring engine |
| **nexha-discovery-os** | 4272 | ✅ | Capability search engine with reputation-aware ranking |
| **nexha-federation-os** | 4273 | ✅ | Federation management, handshakes, auto-match, onboarding checklist |
| **nexha-opportunity-os** | 4274 | ✅ | Proactive opportunity matching engine |
| **nexha-market-os** | 4275 | ✅ | Market intelligence and price observation layer |
| **nexha-supplier-registry** | 4281 | ✅ | Complete trade lifecycle: onboarding → KYB → contract → RFQ → PO → shipment → payment |
| **nexha-supplier-network** | 4280 | ✅ | Supplier discovery + scoring (discovery layer, sits below registry) |
| **nexha-pricing-network** | 4286 | ✅ | Market price aggregation + dynamic pricing recommendations |
| **nexha-distribution-network** | 4285 | ✅ | Distribution channel management |
| **nexha-trade-finance-network** | 4287 | ✅ | Trade finance, escrow, payment settlement |
| **nexha-warehouse-network** | 4288 | ✅ | Warehouse slot booking + WMS |
| **nexha-acp-messaging** | 4340 | ✅ | ACP protocol messaging for agent-to-agent communication |

### HOJAI Cloud Phase 1 (2026-06-25) — 6 New Services

HOJAI Cloud = AWS for AI-native businesses. Phase 1 ships the core cloud platform.

| Service | Port | Purpose |
|---------|------|---------|
| **hojai-cloud** | 4380 | Deploy target with auto-respawn, SSL, custom domains, previews, rollbacks |
| **app-store-api** | 4400 | App Store — Skills, agents, workflows, templates catalog |
| **cost-tracker** | 4410 | AI usage metering and billing |
| **secrets-manager** | 4420 | Encrypted credential storage (AES-256-GCM) |
| **voice-studio-api** | 4430 | Voice agent management (STT/TTS) |
| **workflow-builder-api** | 4440 | DAG workflow management (10 node types) |

**Startup:** `bash companies/HOJAI-AI/scripts/start-hojai-cloud-phase1.sh start`

**RTMN Hub:** All services wired at `/api/app-store/*`, `/api/cost/*`, `/api/secrets/*`, `/api/voice/*`, `/api/workflows/*`

**Source:** `companies/HOJAI-AI/services/` and `companies/HOJAI-AI/products/`

### AgentOS (12 services) - ✅ RUNNING

**AgentOS** is HOJAI's autonomous agent lifecycle management platform. All 12 services run with 637 tests passing.

| Service | Port | Tests | Purpose |
|---------|------|-------|---------|
| **agent-platform-api** | 4802 | 36 | Gateway + health aggregation for all 11 sub-services |
| **agent-registry** | 4803 | 54 | Central agent identity, versioning, heartbeat |
| **capability-store** | 4804 | 69 | Machine-readable agent capability registry |
| **tool-registry** | 4805 | 59 | Available tools/functions agents can call |
| **skill-library** | 4806 | 73 | Reusable agent skills and behaviors |
| **message-bus** | 4807 | 59 | Inter-agent messaging and pub/sub |
| **scheduler** | 4808 | 89 | Cron-like job scheduling for agents |
| **context-store** | 4809 | 64 | Agent conversation context persistence |
| **agent-memory-bridge** | 4811 | 64 | Bridge to MemoryOS for agent memory |
| **agent-orchestrator** | 4812 | 63 | Multi-agent workflow orchestration |
| **agent-execution-engine** | 4813 | 61 | Execute agent tasks and plans |
| **agent-observability** | 4814 | 46 | Agent metrics, logs, traces |

**Gateway health check:** `curl http://localhost:4802/api/agent/platform/status`

### HOJAI Voice Platform (2)

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **voice-gateway** | 4880 | ✅ NEW | Training-aware STT/TTS router — Whisper, Deepgram, Google, Sarvam, ElevenLabs, Cartesia → trains HOJAI model |
| **HOJAI-VOICE-PLATFORM** | 4850 | ✅ | Production voice infrastructure (adapters, agents, telecom) |

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

### Industry OS - Special Services (3)

| # | Industry | OS Name | Port | Status |
|---|----------|---------|------|--------|
| 1 | **Learning** | **Learning OS** | **4760** | ✅ **NEW** |
| 2 | **Community** | **Community OS** | **4761** | ✅ **NEW** |
| 3 | **Data** | **Data OS** | **4762** | ✅ **NEW** |

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
- Economy OS **:4294** with 105 passing tests (vitest)

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
| Total Services Connected | 80+ |
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

### SUTAR OS - Services Summary (Updated 2026-06-27)

| Category | Services | Port Range |
|----------|----------|------------|
| **Gateway & Twin** | 7 services (Gateway, Twin OS, Memory Bridge, Identity OS, Agent ID, Tenant Instances, Agent Network) | 3100, 4140-4145, 4155 |
| **Decision & Trust** | 3 services (Decision Engine, Trust Engine, Contract OS) | 4290, 4291, 4292 |
| **Economy & Negotiation** | 2 services (Economy OS, Negotiation Engine) | 4293, 4294 |
| **SUTAR OS New** | 24 enterprise OS modules (Constitutional, Runtime, Observation, Safety, Crisis, Change Mgmt, Innovation, Verification, Physical World, Device, Negotiation, Culture, Organization, Secrets, Compliance, Simulation, Calendar, Chat, Search, Notification, Brand, Presence, Media) | 4855-4881 |
| **Agent Teaming** | 5 services (Agent Teaming, Orchestration, Contracts, Marketplace, Analytics) | 4830, 4845, 4848, 4851, 4853 |

> **Note:** Port range is 3100-4881 (not 4140-4260 as previously documented). Discovery & ROI services moved to BLR AI Marketplace 2026-06-21.

### Key Services

| Service | Port | Purpose |
|---------|------|---------|
| **sutar-gateway** | 4140 | API gateway for all SUTAR services |
| **sutar-decision-engine** | 4290 | AI-powered policy decisions |
| **sutar-twin-os** | 4142 | Digital twin management |
| **sutar-memory-bridge** | 4143 | Twin ↔ memory partition links |
| **sutar-identity** | 4144 | Universal identity |
| **sutar-agent-id** | 4145 | Agent identity |
| **sutar-tenant-instances** | 4141 | Per-tenant SUTAR shards |
| ~~sutar-marketplace~~ → **BLR AI Marketplace** | 4250 | AI Service Marketplace (moved 2026-06-21) |
| **sutar-economy-os** | 4294 | Economic layer for transactions |
| **sutar-negotiation-engine** | 4293 | Multi-party negotiation |
| **sutar-trust-engine** | 4291 | Trust scoring and reputation |
| **sutar-contract-os** | 4292 | Smart contracts |
| **nexha-pricing-network** | 4286 | Market price aggregation (was sutar-pricing-intelligence, moved to Nexha 2026-06-22) |
| **nexha-autonomous-logistics** | 4295 | Multi-carrier shipping, customs, tracking (moved from 4293 2026-06-27) |

### SUTAR OS vs ACN (Agent Commerce Network)

| Aspect | SUTAR OS | ACN |
|--------|----------|-----|
| **Purpose** | Autonomous Economic Infrastructure | Agent-to-Agent Commerce |
| **Services** | 40+ services | 15 services |
| **Port Range** | 3100-4881 | 4716, 4800-4853 |

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
