# Global Nexha — Full Development Plan

> **Vision:** Global Nexha is the global operating environment for autonomous business ecosystems.
>
> **Date:** 2026-06-22
>
> **Status:** Planning document (not implementation) — informs the next 18 months of build sequence

---

## 0. Executive Summary

We are not building a marketplace. We are building **the trust, discovery, and opportunity layer for the autonomous economy** — and the multi-product AI company that powers every autonomous business in it.

### The corrected view of HOJAI AI

HOJAI AI is **not just an infrastructure company**. It is a **multi-product AI company** with several distinct product lines, each serving different customers:

| HOJAI product line | What it is | Like | Customers |
|---|---|---|---|
| **HOJAI Intelligence** | Foundation models, training, fine-tuning, inference | OpenAI / Anthropic | AI developers, enterprises |
| **HOJAI Foundation** | CorpID, MemoryOS, TwinOS, SkillOS, PolicyOS, etc. | AWS primitives | Any developer, Nexha |
| **HOJAI SUTAR OS** | The Autonomous Business OS (workforce + apps + engines) | Linux / Android | Nexha, enterprises |
| **HOJAI Foundry** | Platform for building AI-native startups | Shopify / Vercel | Founders, startups |
| **HOJAI Cloud** | Hosting, deployment, scaling | AWS / Vercel | Everyone |
| **HOJAI Skills** | Skill marketplace | App Store | Developers, enterprises |
| **HOJAI Copilot** | Employee AI assistant | Microsoft Copilot | Enterprises |
| **HOJAI Genie** | Consumer AI | Siri / Alexa / ChatGPT | Consumers |

**Nexha is one of HOJAI's most important customers** — but not the only one. HOJAI has its own multi-product strategy independent of Nexha.

### The one-paragraph version

Every business, marketplace, government, and industry deploys **Nexha OS** — a self-hostable runtime that embeds **SUTAR OS** (the Autonomous Business Operating System built by HOJAI AI) and adds a network layer (CapabilityOS, DiscoveryOS, ReputationOS, OpportunityOS, MarketOS, FederationOS, Global Directory). Each Nexha gets its own private AI workforce (16 AI executives + 25+ specialist agents) and its own business applications (CRM, ERP, POS, etc.) for free. Nexhas federate through **Global Nexha** using the **ACP protocol** (open spec, HOJAI-controlled reference implementation). Reputation becomes the new marketing: companies compete on measurable performance, not on ad budgets. Meanwhile, **HOJAI Foundry** lets any founder launch an AI-native startup (marketplace, D2C, B2B, etc.) in days — generating the backend, frontend, mobile, AI workforce, commerce, and federation automatically. The result is the **autonomous economy** — a self-reinforcing network where better-performing businesses naturally receive more opportunities, and where the next generation of AI-native companies is born.

### The org structure (RTMN Digital)

```
RTMN Digital (parent holding)
│
├── HOJAI AI (the multi-product AI company)
│   ├── HOJAI Intelligence (models, training, inference)
│   ├── HOJAI Foundation (CorpID, MemoryOS, TwinOS, etc.)
│   ├── HOJAI SUTAR OS (autonomous business OS)
│   ├── HOJAI Foundry (startup generator platform)
│   ├── HOJAI Cloud (hosting + deployment)
│   ├── HOJAI Skills (skill marketplace)
│   ├── HOJAI Copilot (employee AI)
│   └── HOJAI Genie (consumer AI)
│
└── Nexha (the autonomous business network)
    ├── Nexha OS (self-hostable runtime)
    ├── Nexha networks (supplier, distribution, etc.)
    ├── Global Nexha (federation layer)
    └── Nexha Portal (marketplace UI)
```

### The Linux-in-Android model (relationship summary)

```
HOJAI AI (the Google — many products)     Nexha (the Samsung — one product)
─────────────────────────────────         ─────────────────────────────────
Builds & open-sources:                    Embeds & distributes:
• HOJAI Intelligence (models)             • Nexha OS runtime
• Foundation services                    • Wiring SUTAR ↔ network
  (CorpID, MemoryOS, TwinOS)              • Network layer services
• SUTAR OS                                  (CapabilityOS, DiscoveryOS...)
  (workforce + apps + engines)            • Federation governance
• ACP protocol                            • Industry bundles
• HOJAI Foundry (startup platform)        • Federation registration
• HOJAI Cloud                             • Network participants
• HOJAI Skills marketplace
Customers see only Nexha OS.
SUTAR is transparent to them.
But HOJAI has many OTHER customers too:
developers, enterprises, governments,
other AI companies.
```

### The architecture is settled. The open questions are:

1. **What ships first** — the cold-start wedge that gets the first Nexha deployed externally
2. **What gets built in-house vs federated vs partnered** — don't try to build all 15 foundation services
3. **What HOJAI owns vs Nexha owns** — the company split (multi-product AI company vs network)
4. **What SUTAR contains** — the Autonomous Business Operating System (workforce + apps + engines + collaboration)
5. **What HOJAI Foundry looks like** — the AI-native startup generator platform
6. **What the 18-month roadmap looks like** — with milestones, not just features

This plan answers all six.

### The key decisions baked in

| Decision | Choice | Why |
|---|---|---|
| **Marketplace vs federation** | Federation (not a centralized marketplace) | Internet won over AOL; same logic |
| **HOJAI vs Nexha split** | HOJAI = multi-product AI company; Nexha = network company | HOJAI has many products beyond Nexha |
| **SUTAR's role** | Embedded Autonomous Business OS in every Nexha | Linux-in-Android model; maximum leverage |
| **HOJAI Foundry** | Platform for generating AI-native startups | Founder flywheel; 10x more value than just selling infra |
| **Outcomes-led messaging** | "Run your business with AI" not "SUTAR OS" | Customers buy outcomes, not technology |
| **ACP openness** | Open spec, closed impl initially; SDKs at Year 3; Foundation at Year 5 | Kubernetes / OAuth / Linux Foundation pattern |
| **Cold-start anchors** | SME restaurant → Logistics → Government | Proven sequence (SWIFT, Visa) |
| **Build vs partner** | Build the AI-differentiated stuff; partner for commodities | Don't build what already exists well |
| **Pricing** | Free Nexha OS; paid foundation services; federation subs; transaction fees; Foundry subscriptions | Distribution strategy + value capture |

### What ships in 18 months

**Network layer (Nexha builds):**
- CapabilityOS (the schema)
- ReputationOS (the ACI scoring engine)
- DiscoveryOS (the search)
- OpportunityOS (the matching)
- MarketOS (the intelligence)
- FederationOS (the control plane)
- Global Directory (the DNS for Nexhas)
- Nexha OS runtime (the Docker image)

**Business OS layer (HOJAI builds in parallel):**
- SUTAR Workforce v1 → v2 (16 AI executives + premium specialists)
- SUTAR Department OS v1 → v2 (CRM, ERP, POS, PMS + industry modules)
- SUTAR Engines (workflow, negotiation, contract, decision, trust, economy, learning)
- SUTAR Collaboration (agent-to-agent, department coordination)
- ACP v2.1 → v3.0 (federation extensions + multi-party negotiation)
- HOJAI Foundry v1 (5 starter kits: B2B marketplace, D2C marketplace, hotel, restaurant, ERP)
- HOJAI SDKs (foundation SDK, SUTAR SDK, commerce SDK, Nexha SDK, ACP SDK)
- HOJAI Cloud GA (hosting for Nexha OS + Foundry projects)
- HOJAI Skills marketplace expansion

**AI layer (HOJAI builds in parallel — independent of Nexha):**
- HOJAI Intelligence v2 (next-gen foundation model)
- Fine-tuning APIs (enterprise customers)
- Inference optimization (10x cheaper tokens)

### What we measure success by

- **Year 1:** 100 Nexhas deployed, 50 founders using Foundry, $2M ARR
- **Year 2:** 1,000 Nexhas, 5,000 Foundry projects, $1B autonomous GMV, $50M ARR
- **Year 3:** 100,000 Nexhas, 100,000 Foundry projects, $100B autonomous GMV, $500M ARR

---

## 1. Current State (verified June 22, 2026)

### What already exists in RTMN (inventory)

| Layer | Service | Path | Port | Status |
|---|---|---|---|---|
| **Identity** | corpid-service | `companies/HOJAI-AI/platform/identity/corpid-service/` | 4702 | ✅ Running |
| **Identity** | tenant-manager | `companies/HOJAI-AI/platform/identity/tenant-manager/` | 4747 | ✅ v1.0 |
| **Memory** | memory-os | `companies/HOJAI-AI/platform/memory/memory-os/` | 4703 | ✅ Running |
| **Memory** | memory-confidence | `companies/HOJAI-AI/platform/memory/memory-confidence/` | 4152 | ✅ Running |
| **Memory** | memory-context-engine | `companies/HOJAI-AI/platform/memory/memory-context-engine/` | 4790 | ✅ Running |
| **Memory** | twin-memory-bridge | `companies/HOJAI-AI/platform/twins/twin-memory-bridge/` | 4704 | ✅ Running |
| **Twins** | twinos-hub | `services/twinos-hub/` | 4705 | ✅ Running |
| **Trust** | sada-os | `companies/HOJAI-AI/platform/trust/sada-os/` | 4190 | ✅ Running |
| **Trust** | agent-reputation | `companies/HOJAI-AI/platform/trust/agent-reputation/` | 4738 | ✅ Running |
| **Trust** | trust-network | `companies/HOJAI-AI/platform/trust/trust-network/` | — | ✅ Scaffolded |
| **Economy** | economy-os | `companies/HOJAI-AI/platform/economy/economy-os/` | — | ✅ Running |
| **Flow** | policy-os | `companies/HOJAI-AI/platform/flow/policy-os/` | — | ✅ Real |
| **Flow** | goal-os | `companies/HOJAI-AI/platform/flow/goal-os/` | — | ✅ Real |
| **Flow** | decision-engine | `companies/HOJAI-AI/platform/flow/decision-engine/` | — | ✅ Real |
| **Skills** | skill-os | `companies/HOJAI-AI/platform/skills/skill-os/` | — | ✅ Real |
| **Skills** | skill-marketplace | `companies/HOJAI-AI/platform/skills/skill-marketplace/` | — | ✅ Real |
| **Knowledge** | knowledge-network | `companies/HOJAI-AI/platform/knowledge-network/` | — | ✅ Real |
| **Training** | prompt-manager | `companies/HOJAI-AI/platform/training/prompt-manager/` | — | ✅ Real |
| **SUTAR Core** | sutar-gateway | `companies/HOJAI-AI/sutar-os/core/sutar-gateway/` | 4140 | ✅ Running |
| **SUTAR Core** | sutar-trust-engine | `companies/HOJAI-AI/sutar-os/core/sutar-trust-engine/` | 4291 | ✅ Running |
| **SUTAR Core** | sutar-decision-engine | `companies/HOJAI-AI/sutar-os/core/sutar-decision-engine/` | 4290 | ✅ Running |
| **SUTAR Core** | sutar-economy-os | `companies/HOJAI-AI/sutar-os/core/sutar-economy-os/` | 4294 | ✅ Running (105 tests) |
| **SUTAR Core** | sutar-twin-os | `companies/HOJAI-AI/sutar-os/core/sutar-twin-os/` | — | ✅ Real |
| **SUTAR Core** | sutar-agent-id | `companies/HOJAI-AI/sutar-os/core/sutar-agent-id/` | — | ✅ Real |
| **SUTAR Core** | sutar-agent-network | `companies/HOJAI-AI/sutar-os/core/sutar-agent-network/` | — | ✅ Real |
| **SUTAR Core** | sutar-identity | `companies/HOJAI-AI/sutar-os/core/sutar-identity/` | — | ✅ Real |
| **SUTAR Core** | sutar-memory-bridge | `companies/HOJAI-AI/sutar-os/core/sutar-memory-bridge/` | — | ✅ Real |
| **SUTAR Core** | sutar-monitoring | `companies/HOJAI-AI/sutar-os/core/sutar-monitoring/` | 3100 | ✅ Real |
| **SUTAR Agents** | merchant-agents | `companies/HOJAI-AI/sutar-os/agents/merchant-agents/` | 4810 | ✅ Real |
| **SUTAR Agents** | acn-hub | `companies/HOJAI-AI/sutar-os/agents/acn-hub/` | 4800 | ✅ Real |
| **SUTAR Agents** | agent-orchestration | `companies/HOJAI-AI/sutar-os/agents/agent-orchestration/` | 4851 | ✅ Real |
| **SUTAR Agents** | agent-contracts | `companies/HOJAI-AI/sutar-os/agents/agent-contracts/` | 4830 | ✅ Real |
| **SUTAR Agents** | agent-learning | `companies/HOJAI-AI/sutar-os/agents/agent-learning/` | 4846 | ✅ Real |
| **SUTAR Agents** | agent-analytics | `companies/HOJAI-AI/sutar-os/agents/agent-analytics/` | 4848 | ✅ Real |
| **SUTAR Agents** | agent-teaming | `companies/HOJAI-AI/sutar-os/agents/agent-teaming/` | 4853 | ✅ Real |
| **SUTAR Agents** | agent-twin | `companies/HOJAI-AI/sutar-os/agents/agent-twin/` | — | ✅ Real |
| **ACP Protocol** | acp-protocol | `companies/HOJAI-AI/sutar-os/agents/acp-protocol/` | 4800 | ✅ v2.0 spec |
| **Nexha (C.1)** | nexha-supplier-network | `companies/Nexha/services/nexha-supplier-network/` | 4280 | ✅ 20 tests |
| **Nexha (C.2)** | nexha-distribution-network | `companies/Nexha/services/nexha-distribution-network/` | 4285 | ✅ 22 tests |
| **Nexha (C.4)** | nexha-trade-finance-network | `companies/Nexha/services/nexha-trade-finance-network/` | 4287 | ✅ 38 tests |
| **Nexha (C.5)** | nexha-warehouse-network | `companies/Nexha/services/nexha-warehouse-network/` | 4288 | ✅ 49 tests |
| **Nexha (C.6)** | nexha-pricing-network | `companies/Nexha/services/nexha-pricing-network/` | 4286 | ✅ 31 tests |
| **Nexha Gateway** | nexha-gateway | `companies/Nexha/services/nexha-gateway/` | 5002 | ✅ Running |
| **Nexha Portal** | portal | `companies/Nexha/portal/` | 4388 | ✅ Next.js |
| **Hub** | unified-os-hub | `services/unified-os-hub/` | 4399 | ✅ Running |

### What's missing (the gap between today and Global Nexha vision)

| Required | Status today | Priority |
|---|---|---|
| CapabilityOS | ❌ Not built | P0 (foundational) |
| ReputationOS (Autonomous Commerce Index) | ⚠️ Partial — SADA + agent-reputation exist, but no ACI composite score | P0 |
| DiscoveryOS | ⚠️ Partial — nexha-supplier-network has search, but no global capability index | P0 |
| OpportunityOS | ❌ Not built | P1 |
| MarketOS | ❌ Not built | P1 |
| FederationOS (control plane) | ⚠️ Partial — Hub at 4399 routes, but no federation governance | P1 |
| ACP open specification (license + governance) | ⚠️ Spec exists, no license/governance | P1 |
| Nexha OS (self-hostable runtime) | ❌ Not built | P1 |
| CapabilityOS schema spec (machine-readable JSON) | ❌ Not built | P0 |
| Trust Bootstrap journey (6 stages) | ❌ Not built | P1 |
| RTNM Digital holding structure (HOJAI ↔ Nexha separation) | ❌ Not documented | P0 (org-level) |

### What works (don't rebuild)

- **Identity** is solid. CorpID handles 99% of what's needed.
- **Memory layer** is the most advanced foundation service. Trust Confidence + Context Engine already work.
- **TwinOS** has 86+ twins operational.
- **SUTAR trust/economy/decision engines** are real and tested.
- **Nexha networks (C.1, C.2, C.4, C.5, C.6)** are real, tested, and serve real queries.
- **ACP protocol** has a normative spec and reference implementation.
- **Hub at 4399** routes everything.

We are NOT starting from scratch. We are filling specific gaps and connecting what exists.

---

## 2. The Two-Company Split (organizational foundation)

Before any code is written, this org decision must be documented and committed. It shapes every subsequent product decision.

### RTNM Digital (parent holding)

**Purpose:** Owns the strategic IP, the brand, and the overall architecture. Holds equity in the two operating companies.

```
RTNM Digital (parent)
├── HOJAI AI (operating company: multi-product AI company)
└── Nexha (operating company: autonomous business network)
```

### HOJAI AI — "The multi-product AI company"

**What it builds:** HOJAI is **not just an infrastructure company**. HOJAI is a **multi-product AI company** with several distinct product lines, each with its own customers, business model, and roadmap.

**Product lines:**

| Product line | What | Like | Customers |
|---|---|---|---|
| **HOJAI Intelligence** | Foundation models, training, fine-tuning, inference APIs | OpenAI / Anthropic | AI developers, enterprises |
| **HOJAI Foundation** | CorpID, MemoryOS, TwinOS, SkillOS, PolicyOS, GoalOS, KnowledgeOS, FlowOS, EconomyOS, SADA | AWS primitives | Developers, Nexha |
| **HOJAI SUTAR OS** | Autonomous Business OS — workforce + apps + engines + collaboration | Linux / Android | Nexha, enterprises, Foundry users |
| **HOJAI Foundry** | Platform for generating AI-native startups (B2B marketplace, D2C, etc.) | Shopify / Vercel | Founders, startups, agencies |
| **HOJAI Cloud** | Hosting, deployment, scaling, observability, billing | AWS / Vercel | Everyone (Nexha, Foundry, enterprises) |
| **HOJAI Skills** | Skill marketplace (specialist agents, capabilities) | App Store | Developers, enterprises |
| **HOJAI Copilot** | Employee AI assistant | Microsoft Copilot | Enterprises |
| **HOJAI Genie** | Consumer AI | Siri / Alexa / ChatGPT | Consumers |

**Note:** This list is exhaustive. **Nexha is one of HOJAI's most important customers** — but it is NOT HOJAI's reason for existing. HOJAI has its own independent multi-product strategy.

**Business model (per product line):**
- HOJAI Intelligence: per-token pricing, enterprise licensing
- HOJAI Foundation: per-API-call pricing, monthly subscriptions
- HOJAI SUTAR OS: per-agent subscription, enterprise licenses
- HOJAI Foundry: subscription tiers ($0 free / $200/mo starter / $2K/mo growth / enterprise)
- HOJAI Cloud: usage-based, reserved instances
- HOJAI Skills: revenue share on skill marketplace transactions
- HOJAI Copilot: per-seat pricing
- HOJAI Genie: freemium, ad-supported, premium

**Valuation profile:** 15-30x revenue (multi-product AI company; comparable to OpenAI, Anthropic)

### Nexha — "The Internet of Autonomous Business"

**What it builds:** Everything that's specific to a NETWORK of autonomous organizations. The Nexha OS runtime, the federation layer, the discovery / reputation / opportunity / market intelligence services.

**Products:**
- **Nexha OS:** The self-hostable runtime that a company deploys to run its own autonomous business network
- **CapabilityOS:** The schema + registry for machine-readable business capabilities
- **DiscoveryOS:** The search engine for capabilities (the "Google" of autonomous business)
- **ReputationOS:** The Autonomous Commerce Index (the "Moody's" of autonomous business)
- **OpportunityOS:** The proactive matching engine (the "Salesforce" of autonomous business)
- **MarketOS:** The market intelligence layer (the "Bloomberg" of autonomous business)
- **Nexha networks:** The 5 existing nexha-* services (supplier, distribution, trade-finance, warehouse, pricing) plus future ones
- **Global directory:** The DNS-like registry of all federated Nexhas
- **Federation governance:** Membership, trust handshakes, version compatibility
- **Nexha Portal:** The Next.js B2B portal (4388)

**Customers:** Companies that want to participate in autonomous commerce — SMEs, enterprises, marketplaces, industries, governments.

**Business model:**
- Free Nexha OS (self-hosted)
- Paid Foundation services (consumed from HOJAI)
- Federation subscription (pay to federate with Global Nexha)
- Transaction fees (small % of AI-to-AI commerce)
- ReputationOS API (premium data product)
- DiscoveryOS premium (paid visibility, certification)
- Trade intelligence / MarketOS subscriptions
- Industry consortium fees (per-member annual)
- Government contracts

**Valuation profile:** 15-30x revenue (network business, network effects)

### The boundary contract (what HOJAI provides to Nexha)

| HOJAI provides | Via | Used by Nexha for |
|---|---|---|
| CorpID | API | Every Nexha entity has a CorpID |
| MemoryOS | API | Storing transaction history, capability data |
| TwinOS | API | Each Nexha member has a business twin |
| SADA | API | Verifying reputation events |
| Agent Reputation | API | Scoring agents (used by ReputationOS) |
| SUTAR OS | Embedded | Every Nexha member gets the full autonomous business OS |
| ACP protocol | Spec | All cross-Nexha communication |
| EconomyOS | API | Settlement, escrow, payments |
| SkillOS | API | Skills sold on Skill Marketplace |
| PolicyOS | API | Governance, compliance |

Nexha consumes all of these. **Customers of Nexha don't see HOJAI in their stack** — same as AWS customers don't see "Amazon" in their infra.

---

## 3. The Canonical Architecture (one diagram to rule them all)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PEOPLE LAYER                                │
│   Genie (consumer) │ CoPilot (employee) │ DO (operator)              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│              HOJAI AI — Infrastructure Layer                         │
│                                                                      │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│   │ CorpID     │ │ MemoryOS   │ │ TwinOS     │ │ KnowledgeOS│       │
│   │ 4702       │ │ 4703/4152  │ │ 4705       │ │            │       │
│   │            │ │ 4704/4790  │ │            │ │            │       │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘       │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│   │ GoalOS     │ │ SkillOS    │ │ PolicyOS   │ │ FlowOS     │       │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘       │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐                      │
│   │ TrustOS    │ │ EconomyOS  │ │ SUTAR OS   │                      │
│   │ (SADA)     │ │            │ │ (agents)   │                      │
│   └────────────┘ └────────────┘ └────────────┘                      │
│                       ┌────────────┐                                │
│                       │ ACP v2.0   │  ← open spec, closed impl      │
│                       │ protocol   │                                │
│                       └────────────┘                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│               NEXHA — Network Layer                                  │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │                   Nexha OS                               │       │
│   │   (self-hostable runtime; the "operating system")        │       │
│   └─────────────────────────────────────────────────────────┘       │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│   │CapabilityOS│ │DiscoveryOS │ │ReputationOS│ │OpportunityOS│      │
│   │ (schema+   │ │ (search    │ │ (ACI:      │ │ (proactive  │      │
│   │  registry) │ │  index)    │ │  scoring)  │ │  matching)  │      │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘       │
│   ┌────────────┐ ┌─────────────────────────────────────────┐       │
│   │ MarketOS   │ │ FederationOS                             │       │
│   │(intelligence│ │ (control plane: routing, membership,    │       │
│   │ + forecast)│ │  trust handshakes, version compat)       │       │
│   └────────────┘ └─────────────────────────────────────────┘       │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ Existing Nexha Networks                                  │       │
│   │  Supplier (4280) │ Distribution (4285) │ Trade-Fin (4287)│       │
│   │  Warehouse (4288) │ Pricing (4286) │ (more to come)    │       │
│   └─────────────────────────────────────────────────────────┘       │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ Global Directory (DNS for Nexhas)                        │       │
│   └─────────────────────────────────────────────────────────┘       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│              GLOBAL NEXHA — Federation Layer                         │
│                                                                      │
│   Federated Nexhas (each company / marketplace / industry /          │
│   government runs its own private Nexha OS)                          │
│                                                                      │
│   Amazon Nexha ◄──────► Global Directory ◄──────► Alibaba Nexha     │
│   Dubai Gov Nexha ◄────► FederationOS ◄──────► Tesla Supplier       │
│   Restaurant OS ◄──────► Trust Handshakes ◄────► Hotel OS            │
│                                                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  AUTONOMOUS ECONOMY  │
                  │  (the outcome)       │
                  └──────────────────────┘
```

---

## 4. Build vs Federate vs Partner

**Rule of thumb:** Build the things where AI is the differentiator. Partner/integrate the things that are commodities.

| Component | Strategy | Why |
|---|---|---|
| **CapabilityOS** | Build | Schema standard; first-mover advantage |
| **ReputationOS / ACI** | Build | The moat; data is proprietary |
| **DiscoveryOS** | Build | The new Google; must be HOJAI-controlled |
| **OpportunityOS** | Build | The new Salesforce; AI-native differentiator |
| **MarketOS** | Build | Proprietary intelligence layer |
| **FederationOS** | Build | The control plane is core IP |
| **Nexha OS runtime** | Build (open-source, free) | Distribution strategy |
| **ACP protocol** | Open spec, HOJAI-controlled impl | Standard play |
| **SUTAR agents** | Build | Already built |
| **CorpID, MemoryOS, TwinOS** | Already built | Don't touch |
| **POS systems** | Partner (Toast, Square) | Commodity |
| **ERP** | Partner via adapters (SAP, Oracle, Salesforce, Zoho, NetSuite) | Don't compete with SAP |
| **LMS / DocumentOS** | Partner / integrate | Commodity |
| **CMS / Marketing tools** | Partner (HubSpot, Mailchimp) | Commodity |
| **Payment rails** | Partner (Stripe, Razorpay) + EconomyOS orchestrating | Don't build commodity |
| **Logistics carriers** | Partner (DHL, FedEx, Maersk) via adapters | Already exist |
| **Banking / Trade finance** | Partner + Orchestration | Regulated, hard |
| **KYC / KYB verification** | Partner (Onfido, Trulioo, Persona) | Regulated |

**Estimated build effort:** 5 new services (CapabilityOS, ReputationOS, DiscoveryOS, OpportunityOS, MarketOS) + 1 control plane (FederationOS) + 1 runtime (Nexha OS) + spec/SDK work = **~8 new services in 18 months**. This is achievable.

---

## 5. The 18-Month Roadmap

---

The roadmap is split into **6 phases**, each ~3 months, with a clear demo + customer milestone at the end of each.

---

### PHASE D (Months 1-3): The Capability Foundation

**Theme:** "Every Nexha can declare what it does, machine-readably."

**Goal:** Ship the missing primitive that makes everything else possible — CapabilityOS. Plus the basic reputation scoring that proves the concept.

#### D.1 CapabilityOS schema (NEW)

- **What:** The machine-readable standard for declaring what a business can do. JSON-LD-based. Companion to ACP.
- **Location:** `companies/Nexha/services/capability-os/` (new service, port 4270)
- **Path on disk:** `companies/Nexha/services/capability-os/`
- **Outputs:**
  - `GET /api/v1/capabilities/:corpid` — retrieve a company's declared capabilities
  - `PUT /api/v1/capabilities/:corpid` — update capabilities (requires CorpID auth)
  - `POST /api/v1/capabilities/search` — search by capability filters
  - `GET /api/v1/schemas/:category` — retrieve schema templates (steel manufacturer, restaurant, logistics provider, etc.)
- **Schema design:** JSON-LD context, versioned, multiple categories
  - `manufacturing.capability`
  - `logistics.capability`
  - `procurement.capability`
  - `restaurant.capability`
  - `service.legal`, `service.accounting`, etc.
- **Tests:** 30+ tests covering schema validation, search, partial matches, geographic filters
- **Integration:** Wires into nexha-supplier-network (4280) — the existing supplier data becomes CapabilityOS records
- **Effort:** 3 weeks

#### D.2 Autonomous Commerce Index (ACI) v0.1 (NEW)

- **What:** The composite trust score that combines SADA trust events + agent reputation + execution history
- **Location:** `companies/Nexha/services/reputation-os/` (new service, port 4271)
- **Path on disk:** `companies/Nexha/services/reputation-os/`
- **Outputs:**
  - `GET /api/v1/aci/:corpid` — full ACI profile
  - `GET /api/v1/aci/:corpid/trust` — trust sub-score
  - `GET /api/v1/aci/:corpid/quality` — quality sub-score
  - `GET /api/v1/aci/:corpid/delivery` — delivery sub-score
  - `POST /api/v1/aci/events` — ingest execution events (from nexha-* networks)
  - `GET /api/v1/aci/leaderboard?category=:cat&country=:cc` — ranked suppliers
- **Scoring formulas (v0.1):**
  - Trust = (SADA trust score × 0.4) + (payment history × 0.3) + (dispute-free streak × 0.3)
  - Quality = (defect rate inverse × 0.5) + (customer satisfaction × 0.5)
  - Delivery = (on-time rate × 0.6) + (fill rate × 0.4)
  - Overall = weighted average, weighted by transaction volume
- **Tests:** 25+ tests covering scoring math, event ingestion, leaderboard ranking
- **Wired to:** nexha-supplier-network (ingest supplier registration events), nexha-trade-finance-network (ingest payment events)
- **Effort:** 4 weeks

#### D.3 DiscoveryOS v0.1 (NEW)

- **What:** Search engine for capabilities. The new Google.
- **Location:** `companies/Nexha/services/discovery-os/` (new service, port 4272)
- **Path on disk:** `companies/Nexha/services/discovery-os/`
- **Outputs:**
  - `POST /api/v1/discover` — capability search (structured query)
  - `GET /api/v1/discover/nearby` — geographic search
  - `GET /api/v1/discover/recommended` — AI-ranked
- **Backend:** In-memory index over CapabilityOS records, with reputation-aware ranking (uses ReputationOS)
- **Tests:** 20+ tests covering search precision, geographic filters, ranking quality
- **Demo:** "Find me a steel supplier in India with ISO certification, 5-day lead time, ACI > 80" — returns ranked list
- **Effort:** 3 weeks

#### D.4 Trust Bootstrap journey v0.1 (NEW)

- **What:** The 6-stage onboarding flow that takes a new company from "no reputation" to "established"
- **Location:** Built into ReputationOS + CorpID + a new onboarding service
- **Outputs:**
  - `GET /api/v1/bootstrap/status/:corpid` — current stage
  - `POST /api/v1/bootstrap/advance` — request stage transition (with verification)
  - `GET /api/v1/bootstrap/requirements/:stage` — what's needed for next stage
- **Stages:**
  - **0:** Founder reputation (LinkedIn / past companies)
  - **1:** Identity Verified (CorpID + KYB)
  - **2:** Capabilities Verified (CapabilityOS declaration)
  - **3:** Pilot Deals (3+ completed transactions via escrow)
  - **4:** Established (100+ orders, 95%+ on-time)
  - **5:** Network Effects (1000+ transactions, named in cross-network deals)
- **Tests:** 15+ tests covering stage transitions, requirement validation
- **Effort:** 2 weeks

#### D.5 Phase D demo: "The Cold Start"

- **Story:** A Dubai restaurant wants to source rice from an Indian supplier they've never met.
  1. Restaurant deploys its own Nexha (private)
  2. Registers on CapabilityOS (declares procurement need)
  3. DiscoveryOS finds 5 Indian rice suppliers matching ACI > 70
  4. Restaurant SUTAR agents send RFQ via ACP to top 3
  5. Suppliers quote; negotiation completes via ACP
  6. Trade finance escrow set up via nexha-trade-finance-network
  7. Shipment via nexha-distribution-network
  8. Delivery confirmed; reputation events flow back to ReputationOS
  9. Both Nexhas update ACI
- **Milestone:** Demo runs end-to-end. Internal Nexha federation between Dubai + Indian Nexha. 100% autonomous.
- **Customer milestone:** 3 design partners (1 restaurant, 1 supplier, 1 logistics provider) commit to pilot.

#### D.6 Documentation + governance

- **CapabilityOS spec v1.0** published as a public spec (markdown + JSON schema + examples)
- **ACI scoring formula** documented in detail (with worked examples)
- **Bootstrap journey** documented as a customer-facing guide
- Update root `CLAUDE.md` and `companies/Nexha/CLAUDE.md` to reflect new services

**Phase D exit criteria:**
- ✅ 5 services shipped (CapabilityOS, ReputationOS, DiscoveryOS, OpportunityOS placeholder, Bootstrap)
- ✅ 90+ new tests passing
- ✅ CapabilityOS spec published
- ✅ Demo runs end-to-end
- ✅ 3 design partners signed

---

## 5.1 SUTAR's Role (the Autonomous Business Operating System inside every Nexha)

> **Architectural clarification (v2 — expanded vision):** SUTAR is not just an agent runtime — **SUTAR is "The Autonomous Business Operating System"** that ships embedded inside every Nexha OS deployment. Think Linux-in-Android, not Node-in-Next.
>
> - **HOJAI** builds and evolves SUTAR.
> - **Nexha** embeds a full SUTAR instance into every Nexha deployment.
> - **Customers** install Nexha OS and transparently get SUTAR.

### The 3-layer relationship (Linux-in-Android model)

```
┌─────────────────────────────────────────────────────────────────┐
│  HOJAI AI — builds, evolves, and open-sources                     │
│                                                                  │
│   Foundation (CorpID, MemoryOS, TwinOS, SkillOS, PolicyOS, etc.) │
│   SUTAR OS (the autonomous business operating system)            │
│     ├── Virtual Workforce (16 AI executives)                     │
│     ├── Department OS (CRM, ERP, POS, PMS, etc.)                 │
│     ├── Engines (Workflow, Negotiation, Contract, Decision,      │
│     │            Trust, Economy, Learning)                       │
│     ├── Collaboration (Agent-to-Agent, Department Coordination)  │
│     └── ACP protocol                                             │
│                                                                  │
│   Open-source. Used by anyone — including Nexha.                 │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ embedded into
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Nexha — builds, packages, distributes                            │
│                                                                  │
│   Nexha OS (self-hostable runtime) embeds:                       │
│     ├── Full SUTAR OS instance (private to each Nexha)           │
│     ├── Nexha networks (supplier, distribution, trade-finance,  │
│     │   warehouse, pricing, contract, compliance, payment,      │
│     │   partner)                                                 │
│     ├── Global Nexha services (CapabilityOS, ReputationOS,       │
│     │   DiscoveryOS, FederationOS, OpportunityOS, MarketOS,     │
│     │   Global Directory)                                        │
│     └── Federation governance                                    │
│                                                                  │
│   Customers install Nexha OS. They get SUTAR transparently.      │
└─────────────────────────────────────────────────────────────────┘
```

### The Android analogy (made explicit)

```
Google              →  HOJAI AI
Android OS          →  SUTAR OS
Linux kernel        →  HOJAI Foundation (CorpID, MemoryOS, TwinOS, etc.)
Samsung/Xiaomi/...  →  Each Nexha deployment
Google Play Store   →  Nexha OS distribution
Google Search       →  DiscoveryOS (network layer)
Google Maps         →  FederationOS (network layer)
```

**Samsung doesn't rebuild Linux. Nexha doesn't rebuild SUTAR.** Both consume what Google/HOJAI builds.

### What SUTAR actually contains (the bigger vision)

```
SUTAR OS — The Autonomous Business Operating System
│
├── 1. Virtual Workforce (16 AI executives)
│   ├── AI CEO (orchestrator, strategic decisions)
│   ├── AI COO (operations)
│   ├── AI CFO (finance, treasury, payments)
│   ├── AI CMO (marketing, content, campaigns)
│   ├── AI CTO (technology, integrations, security)
│   ├── AI CHRO (HR, payroll, recruiting)
│   ├── AI Sales Lead (quotations, pipeline, deals)
│   ├── AI Procurement Lead (sourcing, RFQs, suppliers)
│   ├── AI Legal Counsel (contracts, compliance)
│   ├── AI Warehouse Manager (inventory, fulfillment)
│   ├── AI Quality Manager (QA, certifications)
│   ├── AI Customer Success Manager (retention, expansion)
│   ├── AI Marketing Manager (demand gen, ABM)
│   ├── AI Operations Manager (processes, incidents)
│   ├── AI Analytics Manager (BI, forecasting, KPIs)
│   └── AI Compliance Officer (ESG, sanctions, audit)
│
├── 2. Department OS (the business applications)
│   ├── CRM (Customer Relationship Management)
│   ├── ERP (Enterprise Resource Planning)
│   ├── POS (Point of Sale)
│   ├── PMS (Project OR Property Management — depending on industry)
│   ├── Sales Automation
│   ├── Marketing Automation
│   ├── Procurement
│   ├── Finance & Accounting
│   ├── HR & Payroll
│   ├── Legal & Compliance
│   ├── Operations
│   ├── Customer Service & Support
│   └── Knowledge Management
│
├── 3. Engines (the runtime)
│   ├── Agent Runtime (lifecycle, scheduling)
│   ├── Workflow Engine (FlowOS-powered)
│   ├── Negotiation Engine (ACP-powered)
│   ├── Contract Engine (smart contracts, e-signature)
│   ├── Decision Engine (multi-option ranking)
│   ├── Trust Engine (SADA-backed scoring)
│   ├── Economy Engine (payments, escrow, settlements)
│   └── Learning Engine (continuous improvement)
│
└── 4. Collaboration Layer
    ├── Agent-to-Agent Communication (ACP protocol)
    ├── Department Coordination (FlowOS workflow engine)
    ├── Memory Sharing (MemoryOS + TwinOS)
    └── Twin Synchronization (Twin Memory Bridge)
```

### SUTAR components included in Nexha OS

| SUTAR component | Port | Role in Nexha |
|---|---|---|
| sutar-gateway | 4140 | Single entry point for all agent traffic |
| sutar-decision-engine | 4290 | Every agent decision goes through this |
| sutar-trust-engine | 4291 | Every trust check goes through this |
| sutar-economy-os | 4294 | Every transaction goes through this |
| sutar-twin-os | (internal) | Each Nexha entity has a twin |
| sutar-agent-id | (internal) | Every agent has an ID |
| sutar-agent-network | (internal) | Agents in a Nexha coordinate |
| sutar-identity | (internal) | Agent identities verified |
| sutar-memory-bridge | (internal) | Connects agents to MemoryOS |
| sutar-monitoring | 3100 | Observability |
| acp-protocol | 4800 | Cross-Nexha communication |
| agent-orchestration | 4851 | Multi-agent workflows |
| agent-contracts | 4830 | Smart contract execution |
| agent-learning | 4846 | Agents improve over time |
| agent-analytics | 4848 | Agent performance metrics |
| merchant-agents | 4810 | Pre-built industry agent templates |
| acn-hub | 4800 | Agent commerce hub |

### What HOJAI builds vs what Nexha builds (re: SUTAR)

| HOJAI builds (under SUTAR OS) | Nexha builds |
|---|---|
| **Workforce:** 16 AI executives + specialist agents | **Packaging:** Nexha OS Docker image |
| **Department OS:** CRM, ERP, POS, PMS modules | **Wiring:** SUTAR agents ↔ CapabilityOS |
| **Engines:** Workflow, Negotiation, Contract, Learning | **Wiring:** SUTAR agents ↔ ReputationOS |
| **ACP protocol versions** | **Wiring:** SUTAR agents ↔ DiscoveryOS |
| **SUTAR security patches, performance** | **Industry bundles:** pre-configured SUTAR agent sets per industry |
| **Premium agents:** Master Negotiator, Customs Agent, Trade Finance Specialist, etc. | **Federation:** uses SUTAR identity for cross-Nexha trust |
| **Open-source SUTAR under permissive license** | **Distribution:** makes Nexha OS installable in 30 min |

### What the customer sees

When a restaurant deploys Nexha OS:

```bash
# One command
docker run -d nexhaos/runtime

# What they get (auto-provisioned):
#   ✅ Their private Nexha runtime
#   ✅ Their full AI workforce (auto-spawned):
#       - CEO Agent (orchestrator)
#       - COO Agent (operations)
#       - CFO Agent (finance)
#       - CMO Agent (marketing)
#       - CTO Agent (technology)
#       - CHRO Agent (HR)
#       - Sales Agent, Procurement Agent, Finance Agent,
#         Legal Agent, Marketing Agent, Support Agent,
#         Warehouse Agent, Quality Agent, Analytics Agent,
#         Compliance Agent, Customer Success Agent
#   ✅ Their business applications (auto-configured):
#       - CRM, ERP, POS, Sales Automation, Procurement,
#         Finance, HR, Legal, Operations, Customer Service
#   ✅ CapabilityOS registration (their capabilities auto-published)
#   ✅ ReputationOS baseline (ACI = 40, Stage 1 of bootstrap)
#   ✅ DiscoveryOS listing
#   ✅ FederationOS handshake (opt-in)
#   ✅ ACP connectivity (can talk to other Nexhas)
```

**The customer never thinks about SUTAR. They think "my AI workforce is operational."**

### Example end-to-end workflow (showing the SUTAR ↔ Nexha split)

```
Scenario: Restaurant in Dubai needs to source rice from India

Step 1: Restaurant's CFO Agent detects low rice inventory
        (SUTAR Department OS: ERP module)

Step 2: CEO Agent creates a "Source Rice" mission
        (SUTAR Engines: Workflow Engine)

Step 3: Procurement Agent queries DiscoveryOS for rice suppliers
        (SUTAR Virtual Workforce ↔ Nexha network layer)

Step 4: DiscoveryOS searches Global Directory + CapabilityOS
        (Nexha network layer)

Step 5: Returns 5 Indian rice suppliers with ACI > 75
        (Nexha network layer)

Step 6: Procurement Agent sends RFQ via ACP to top 3 suppliers
        (SUTAR Engines: Negotiation Engine via ACP)

Step 7: Each supplier's Sales Agent receives, evaluates, responds with quote
        (SUTAR in another Nexha)

Step 8: Negotiation continues automatically until deal terms are agreed
        (SUTAR Engines: Negotiation Engine)

Step 9: Contract auto-generated and signed via nexha-contract-network
        (Nexha network layer)

Step 10: Trade finance escrow set up via nexha-trade-finance-network
         (Nexha network layer)

Step 11: Shipment arranged via nexha-distribution-network
         (Nexha network layer)

Step 12: Warehouse Agent monitors inbound shipment
         (SUTAR Department OS: Warehouse module)

Step 13: On delivery, both Nexhas update each other's ACI in ReputationOS
         (Nexha network layer)

Step 14: Restaurant CFO Agent records payment, updates books
         (SUTAR Department OS: Finance module)

Step 15: Procurement Agent and Sales Agent both learn from this deal
         (SUTAR Engines: Learning Engine)

Throughout: SADA verifies trust events at every step
            (HOJAI Foundation: TrustOS / SADA)
```

**Notice:** SUTAR owns "how to run a company" (workforce + apps + engines). Nexha owns "how to connect companies" (network + discovery + federation + reputation). They're complementary, not overlapping.

### Why this makes the architecture stronger

| Without SUTAR-embedded | With SUTAR-embedded |
|---|---|
| Customer installs Nexha OS, gets a network runtime | Customer installs Nexha OS, gets a network runtime **and a full AI workforce** |
| They still need to buy/ build CRM, ERP, POS, etc. | They get all the business apps built in |
| They wire their existing apps to Nexha manually | The apps are already wired (SUTAR's apps talk to Nexha natively) |
| AI agents are an afterthought | AI agents are the primary users of the apps |
| Onboarding takes weeks of integration | Onboarding takes 30 minutes |

### SUTAR integration tests in each phase

For every new Nexha service we ship, we add **SUTAR integration tests** that prove:

1. **A SUTAR agent can use the service** (end-to-end agent workflow)
2. **The service respects SUTAR agent identities** (CorpID-based)
3. **The service emits events that SUTAR can react to** (event sourcing)
4. **The service updates SUTAR's twin state** (twin bridge)

This means each new Nexha service ships with both:
- **Unit tests** (the service's own logic) — ~20-30 tests
- **SUTAR integration tests** (how agents use the service) — ~10-15 tests

### SUTAR's expanded roadmap (HOJAI-side, parallel to Nexha roadmap)

While Nexha builds the network layer (CapabilityOS, DiscoveryOS, etc.), HOJAI evolves SUTAR:

| Phase | HOJAI workstream on SUTAR |
|---|---|
| **D** | SUTAR Workforce v1 (16 AI executives packaged), SUTAR Engines v1 (Workflow, Negotiation, Contract, Learning) |
| **E** | SUTAR Department OS v1 (CRM, ERP, POS, Sales Automation, Procurement, Finance, HR, Legal, Customer Service) |
| **F** | SUTAR Collaboration v1 (Agent-to-Agent at scale, Department coordination) |
| **G** | SUTAR v1.0 open-source release (full autonomous business OS, Apache 2.0) |
| **H** | SUTAR Workforce v2 (premium specialists: Master Negotiator, Customs Agent, Trade Finance Specialist, Compliance Officer, Logistics Orchestrator) |
| **I** | SUTAR Department OS v2 (industry-specific modules: Healthcare CRM, Restaurant POS, Hotel PMS, Manufacturing ERP) |

**This is a parallel roadmap that runs alongside the Nexha roadmap.** Both contribute to the final product the customer experiences.

---

### PHASE E (Months 4-6): The Reputation Flywheel

**Theme:** "Reputation becomes the new marketing."

**Goal:** Make ReputationOS the most accurate, real-time, trusted business scoring system in the world.

#### E.1 ReputationOS v1.0 — Production grade

- **What:** Upgrade v0.1 to production: persistent storage (Postgres), event sourcing, time-decay, dispute resolution, multi-dimensional scoring
- **Location:** `companies/Nexha/services/reputation-os/` (existing service)
- **Outputs added:**
  - `GET /api/v1/aci/:corpid/history?from=&to=` — historical ACI
  - `POST /api/v1/aci/dispute` — file dispute against an ACI score
  - `GET /api/v1/aci/compare?corpids=a,b,c` — side-by-side comparison
- **Storage:** Postgres (new dependency — uses `@rtmn/shared/db`)
- **Scoring refinements:**
  - Bayesian smoothing for new companies (no data → prior)
  - Time decay (older events worth less)
  - Cross-validation (SADA events + agent reputation + direct measurements)
- **Tests:** 50+ tests covering decay math, dispute resolution, comparison
- **Effort:** 6 weeks

#### E.2 CapabilityOS v1.0 — Industry packs

- **What:** Pre-built capability schemas for the 12 most common business types
- **Packs:** Manufacturing, Restaurant, Hotel, Logistics, Legal, Accounting, Healthcare, Retail, Construction, Agriculture, Software, Marketing
- **Each pack includes:** JSON schema, sample data, validation rules, common search patterns
- **Tests:** 30+ tests covering pack validation
- **Effort:** 4 weeks

#### E.3 FederationOS v0.1 (NEW)

- **What:** The control plane that manages federation membership and trust handshakes
- **Location:** `companies/Nexha/services/federation-os/` (new service, port 4273)
- **Path on disk:** `companies/Nexha/services/federation-os/`
- **Outputs:**
  - `POST /api/v1/federation/register` — apply to join the federation
  - `POST /api/v1/federation/handshake` — trust handshake with another Nexha
  - `GET /api/v1/federation/members` — list of federated Nexhas (public)
  - `GET /api/v1/federation/peers/:corpid` — a Nexha's federation peers
  - `POST /api/v1/federation/policy` — update federation policies
  - `GET /api/v1/federation/health` — federation-wide health check
- **Tests:** 25+ tests covering handshake protocol, membership states, policy enforcement
- **Effort:** 4 weeks

#### E.4 Nexha OS runtime v0.1 (NEW)

- **What:** A self-hostable Docker bundle that lets any company deploy its own Nexha in <30 minutes. Includes SUTAR runtime + Nexha networks + Global Nexha services as one image.
- **Location:** `companies/Nexha/nexha-os/` (new repo, open-source)
- **What's bundled in the image:**
  - **SUTAR runtime** (consumed from HOJAI): gateway (4140), decision engine (4290), trust engine (4291), economy (4294), twin-os, agent-id, agent-network, identity, memory-bridge, monitoring (3100), acp-protocol (4800), agent-orchestration (4851), agent-contracts (4830), agent-learning (4846), agent-analytics (4848)
  - **Nexha networks** (built by Nexha): supplier (4280), distribution (4285), trade-finance (4287), warehouse (4288), pricing (4286), contract (4289), compliance (4290), payment (4291), partner (4292)
  - **Global Nexha services** (built by Nexha): CapabilityOS (4270), ReputationOS (4271), DiscoveryOS (4272), FederationOS (4273), Bootstrap
  - **Foundation services** (consumed from HOJAI via API): CorpID (4702), MemoryOS (4703), TwinOS (4705), SkillOS, PolicyOS, SADA (4190)
- **Components shipped:**
  - `Dockerfile` — single image, multi-process via supervisor
  - `docker-compose.yml` — single-node deployment with optional Postgres
  - `nexha-cli` — command-line tool for setup, registration, federation
  - `nexha-cli init` — interactively configure a new Nexha
  - `nexha-cli register` — register on Global Directory
  - `nexha-cli federate` — handshake with another Nexha
  - `.env.example` — required env vars (CorpID token, Postgres URL, etc.)
  - `README.md` — 30-minute setup guide
- **Auto-provisioning on first boot:**
  - 1 CorpID issued to the company
  - 8 default SUTAR agents spawned (CEO, Sales, Procurement, Finance, Legal, Marketing, Support, Warehouse)
  - CapabilityOS initialized (empty, ready to declare)
  - ReputationOS baseline set (ACI = 40, Stage 1 of bootstrap)
  - DiscoveryOS indexed
  - FederationOS ready for opt-in handshake
- **Tests:** E2E test that spins up a fresh Nexha, registers capabilities, federates with another Nexha, executes an autonomous deal
- **Effort:** 4 weeks

#### E.5 ACP v2.1 — Federation extensions

- **What:** Extend ACP protocol to support cross-Nexha federation messages
- **New message types:**
  - `FEDERATION_HANDSHAKE`
  - `FEDERATION_HEARTBEAT`
  - `FEDERATION_REVOKE`
  - `CAPABILITY_QUERY` (cross-Nexha)
- **Spec update:** ACP v2.1 published
- **Reference implementation:** Updated
- **Tests:** 30+ tests covering federation message flows
- **Effort:** 3 weeks

#### E.6 Phase E demo: "Three Nexhas, One Federation"

- **Story:** Three companies in three countries deploy their own Nexhas, federate, and execute a cross-border deal.
  1. Dubai logistics company deploys Nexha (private, free)
  2. Indian manufacturer deploys Nexha
  3. Saudi buyer deploys Nexha
  4. All three register on Global Directory
  5. All three complete trust handshakes via FederationOS
  6. Saudi buyer discovers Indian manufacturer via cross-Nexha DiscoveryOS
  7. Deal executes across all three Nexhas via ACP
  8. ACI updates flow back through ReputationOS
- **Milestone:** Three independent Nexhas federated; cross-border autonomous deal executed.
- **Customer milestone:** 1 industry consortium commits to multi-Nexha deployment.

#### E.7 RTNM Digital org structure documented

- **What:** Parent → HOJAI AI + Nexha structure documented in CLAUDE.md
- **Outputs:**
  - Updated `/CLAUDE.md` with the two-company split
  - `companies/HOJAI-AI/CLAUDE.md` updated to reflect "infrastructure only" scope
  - `companies/Nexha/CLAUDE.md` updated to reflect "network only" scope
  - Boundary contract between HOJAI and Nexha documented

**Phase E exit criteria:**
- ✅ ReputationOS in production
- ✅ CapabilityOS v1.0 with 12 industry packs
- ✅ FederationOS shipping
- ✅ Nexha OS runtime installable in 30 minutes
- ✅ ACP v2.1 with federation extensions
- ✅ 3-Nexha federation demo works
- ✅ 1 industry consortium pilot signed

---

### PHASE F (Months 7-9): The Opportunity Engine

**Theme:** "Work finds companies."

**Goal:** Make OpportunityOS the proactive engine that creates business, not just transacts it.

#### F.1 OpportunityOS v1.0 (NEW)

- **What:** Proactive matching engine that identifies opportunities for companies
- **Location:** `companies/Nexha/services/opportunity-os/` (new service, port 4274)
- **Path on disk:** `companies/Nexha/services/opportunity-os/`
- **Outputs:**
  - `POST /api/v1/opportunities/match` — match a demand against supply network
  - `GET /api/v1/opportunities/:corpid` — opportunities relevant to a company
  - `POST /api/v1/opportunities/alert` — subscribe to opportunity alerts
  - `GET /api/v1/opportunities/forecast` — predict upcoming opportunities
- **Algorithms:**
  - Capability match score (capability × reputation × proximity)
  - Demand-supply gap detection (MarketOS data)
  - Proactive notifications (push to SUTAR agents)
- **Tests:** 35+ tests covering matching precision, forecasting, alerts
- **Effort:** 5 weeks

#### F.2 MarketOS v0.1 (NEW)

- **What:** Market intelligence layer — the Bloomberg of autonomous business
- **Location:** `companies/Nexha/services/market-os/` (new service, port 4275)
- **Path on disk:** `companies/Nexha/services/market-os/`
- **Outputs:**
  - `GET /api/v1/markets/:category/price-index` — price index over time
  - `GET /api/v1/markets/:category/forecast` — demand forecast
  - `GET /api/v1/markets/risks` — supply chain risks
  - `GET /api/v1/markets/:country/trade-flows` — country trade intelligence
  - `POST /api/v1/markets/alert` — subscribe to market alerts
- **Data sources:**
  - nexha-pricing-network (4286) — own transaction prices
  - nexha-supplier-network (4280) — supply capacity
  - nexha-trade-finance-network (4287) — trade volumes
  - External (optional): World Bank, IMF, commodity exchanges (partner APIs)
- **Tests:** 30+ tests covering forecast math, risk scoring
- **Effort:** 6 weeks

#### F.3 Nexha networks expansion (C.7-C.10)

- **What:** Four new vertical-specific networks
- **C.7 nexha-contract-network** (port 4289): Smart contracts, e-signature, contract templates, automated renewal
- **C.8 nexha-compliance-network** (port 4290): Country-specific compliance rules, sanctions, ESG
- **C.9 nexha-payment-network** (port 4291): Multi-currency, FX, escrow, payouts
- **C.10 nexha-partner-network** (port 4292): Franchise, distribution, OEM, white-label partner management
- **Each:** Scaffolds with 1-2 core endpoints + 20+ tests
- **Effort:** 8 weeks (parallel)

#### F.4 CapabilityOS v1.1 — Verifiable credentials

- **What:** Add verifiable credential support so capabilities can be cryptographically attested
- **Backed by:** SADA's verification + CorpID signatures
- **Outputs:**
  - `POST /api/v1/capabilities/attest` — issue verifiable credential
  - `GET /api/v1/capabilities/verify/:credential_id` — verify a credential
- **Tests:** 20+ tests covering credential lifecycle
- **Effort:** 3 weeks

#### F.5 Phase F demo: "The Autonomous Economy"

- **Story:** A factory in Bangalore has 30% idle capacity. Without any human action, OpportunityOS finds 15 buyers worldwide, negotiates deals, and the factory fills capacity.
  1. Factory's CapabilityOS declares: 30% capacity available in Q3
  2. MarketOS predicts demand surge in 5 categories
  3. OpportunityOS matches 15 buyers to factory
  4. SUTAR agents negotiate 15 deals simultaneously
  5. Contracts auto-generated via nexha-contract-network
  6. Trade finance arranged via nexha-trade-finance-network
  7. ReputationOS updates continuously
  8. Factory fills capacity; ACI improves
- **Milestone:** End-to-end proactive opportunity matching demonstrated.
- **Customer milestone:** 1 marketplace commits to Nexha integration (Amazon-style: their sellers become discoverable globally).

**Phase F exit criteria:**
- ✅ OpportunityOS in production
- ✅ MarketOS v0.1 with forecasting
- ✅ 4 new nexha networks (C.7-C.10)
- ✅ CapabilityOS supports verifiable credentials
- ✅ Proactive opportunity demo works
- ✅ 1 marketplace pilot signed

---

### PHASE G (Months 10-12): The Federation at Scale

**Theme:** "The internet of autonomous business goes live."

**Goal:** Take Global Nexha from "3 federated Nexhas" to "publicly joinable federation."

#### G.1 ACP open specification launch

- **What:** Publish ACP as an open specification under a permissive license (Apache 2.0)
- **Outputs:**
  - Public spec site (acp.globalnexha.com or similar)
  - Apache 2.0 license
  - Conformance test suite
  - Reference implementations in TypeScript, Python, Go
- **Important:** Reference implementation stays HOJAI-controlled per the strategy (don't open-source the impl yet — Phase 2 of the strategy)
- **Effort:** 4 weeks

#### G.2 Global Directory v1.0 (NEW)

- **What:** The DNS-like registry of all federated Nexhas
- **Location:** `companies/Nexha/services/global-directory/` (new service, port 4276)
- **Path on disk:** `companies/Nexha/services/global-directory/`
- **Outputs:**
  - `GET /api/v1/directory/lookup/:corpid` — resolve CorpID to Nexha endpoint
  - `GET /api/v1/directory/search?industry=&country=` — find Nexhas
  - `POST /api/v1/directory/register` — register a new Nexha
  - `GET /api/v1/directory/health` — federation-wide health
- **Storage:** Globally distributed (initially single Postgres; future: CRDT-based for true global consistency)
- **Tests:** 25+ tests covering lookup, health monitoring, registration
- **Effort:** 5 weeks

#### G.3 Nexha Portal v2.0 — ACI dashboard

- **What:** Upgrade the existing Next.js portal (4388) to show ACI dashboards
- **Features:**
  - Company ACI profile (the new "credit rating")
  - Industry leaderboards
  - Trust Bootstrap progress
  - Discovery search
  - Opportunity feed
- **Audience:** Both consumers (browsing) and businesses (managing their presence)
- **Effort:** 4 weeks

#### G.4 Federation governance v1.0

- **What:** Document and ship the governance model for the federation
- **Outputs:**
  - Federation charter (who decides what)
  - ACP change process
  - Membership tiers (Basic / Verified / Premium)
  - Dispute resolution process
- **Mirrors:** ICANN, W3C, Linux Foundation patterns
- **Effort:** 3 weeks

#### G.5 First 100 federated Nexhas

- **What:** Sign up 100 companies to deploy Nexhas and federate
- **Strategy:**
  - 30 SMEs in India (sourcing from suppliers)
  - 20 SMEs in UAE (sourcing from global)
  - 20 logistics providers (DHL-tier and below)
  - 10 marketplaces (regional)
  - 10 manufacturers
  - 5 industry consortiums
  - 5 government agencies
- **Milestone:** Public federation with 100 members
- **Effort:** 12 weeks (ongoing)

#### G.6 Phase G demo: "Public Federation Launch"

- **Story:** Global Nexha goes public. Press launch. First 100 federated Nexhas announced. Live demo of cross-border AI-to-AI commerce.
- **Milestone:** Public federation live; media coverage; design partner testimonials.
- **Customer milestone:** 100 federated Nexhas signed up.

**Phase G exit criteria:**
- ✅ ACP published as open spec
- ✅ Global Directory in production
- ✅ Portal v2.0 with ACI dashboards
- ✅ Federation governance documented
- ✅ 100 federated Nexhas signed
- ✅ Public launch event held

---

### PHASE H (Months 13-15): The AIO Industry

**Theme:** "AI Optimization becomes the new SEO."

**Goal:** Create the AIO (AI Optimization) services industry — consultants, agencies, tools that help businesses optimize for AI discovery.

#### H.1 AIO Toolkit (NEW)

- **What:** A suite of tools that help companies optimize their CapabilityOS profile for AI discovery
- **Location:** `companies/Nexha/aio-toolkit/` (new repo, open-source)
- **Components:**
  - **Capability linter:** "Your capability declaration is missing 12 fields AI agents need"
  - **ACI improvement advisor:** "These 5 actions will raise your ACI from 72 to 85"
  - **A/B testing for capabilities:** "Try this capability description vs that one"
  - **Certification engine:** "Get AIO-certified in 14 days"
- **Pricing:** Free basic + paid certifications + enterprise consulting
- **Effort:** 8 weeks

#### H.2 Trust Intelligence API (NEW)

- **What:** Premium data product for banks, insurers, governments — consume ReputationOS data via paid API
- **Outputs:**
  - `GET /api/v1/trust-intelligence/:corpid/report` — credit-grade report
  - `POST /api/v1/trust-intelligence/batch` — bulk underwriting
  - `GET /api/v1/trust-intelligence/portfolio-risk` — portfolio-level risk analytics
- **Pricing:** Per-call API pricing; volume discounts
- **Effort:** 6 weeks

#### H.3 Industry packs v2.0 — 24 industry verticals

- **What:** Expand CapabilityOS industry packs to cover all 24 RTMN industries
- **Packs added:** Real Estate, Sports, Gaming, Entertainment, Travel, Education, Non-Profit, Government, Construction, Manufacturing, Energy, Transport
- **Each pack:** Schema + sample data + 20+ industry-specific search patterns
- **Effort:** 8 weeks (parallel)

#### H.4 SUTAR agents marketplace — premium agents

- **What:** Premium SUTAR agents available for purchase on Skill Marketplace
- **First agents:**
  - **Master Negotiator** — handles complex multi-party negotiations
  - **Trade Finance Specialist** — arranges escrow, letters of credit, BNPL
  - **Customs Agent** — knows regulations for 100+ countries
  - **Logistics Orchestrator** — multi-carrier, multi-modal shipping
  - **Compliance Officer** — ESG, sanctions, certifications
- **Pricing:** $200-$2000/month per agent
- **Effort:** 8 weeks (parallel)

**Phase H exit criteria:**
- ✅ AIO Toolkit shipped (open-source)
- ✅ Trust Intelligence API live
- ✅ 24 industry packs
- ✅ 5 premium SUTAR agents in marketplace
- ✅ 10 AIO consultants certified by HOJAI

---

### PHASE I (Months 16-18): The Autonomous Economy Goes Live

**Theme:** "From federation to economy."

**Goal:** Demonstrate that the autonomous economy actually works — measurable autonomous commerce happening at scale.

#### I.1 Network intelligence flywheel — measure it

- **What:** Publish the first quarterly Global Nexha Index — measuring autonomous commerce at scale
- **Metrics to publish:**
  - Total federated Nexhas
  - Total autonomous transactions per quarter
  - Total autonomous commerce GMV
  - Average ACI improvement for active Nexhas
  - Cost savings vs traditional procurement
  - Time savings vs traditional procurement
- **Outputs:**
  - Public dashboard
  - Quarterly report
  - Press release
- **Effort:** 4 weeks

#### I.2 Nexha OS v1.0 — Production grade

- **What:** Upgrade Nexha OS runtime to production-grade with high-availability, monitoring, backups
- **Components:**
  - Kubernetes manifests (in addition to Docker Compose)
  - HA deployment (3-node minimum)
  - Automated backups
  - Monitoring + alerting
  - Update mechanism
- **Effort:** 6 weeks

#### I.3 ACP v3.0 — The negotiation protocol

- **What:** Upgrade ACP to handle complex multi-party negotiations, conditional contracts, dispute resolution
- **New message types:**
  - `MULTI_PARTY_QUERY`
  - `CONDITIONAL_OFFER`
  - `ESCROW_RELEASE`
  - `DISPUTE_OPEN`
  - `ARBITRATION_REQUEST`
- **Spec update:** ACP v3.0
- **Reference implementation updated**
- **Effort:** 6 weeks

#### I.4 RTNM Digital capital structure

- **What:** Formalize the HOJAI AI ↔ Nexha split for fundraising
- **Outputs:**
  - Legal entities formed
  - IP assigned correctly
  - Separate cap tables
  - Separate boards
  - First raise: HOJAI AI Series A (infrastructure narrative)
  - Optional: Nexha strategic round (network narrative)
- **Effort:** 8 weeks (legal-heavy)

#### I.5 Phase I milestone: $1B in autonomous GMV

- **Story:** The cumulative autonomous commerce transacted through Global Nexha exceeds $1B in lifetime volume.
- **Milestone:** Public announcement of the autonomous economy milestone.

**Phase I exit criteria:**
- ✅ Quarterly Global Nexha Index published
- ✅ Nexha OS v1.0 production-ready
- ✅ ACP v3.0 published
- ✅ HOJAI AI and Nexha legally separate entities
- ✅ $1B autonomous GMV milestone reached

---

## 6. The Cold-Start Strategy (the most important part)

The whole plan lives or dies on whether we can get **the first 3 external Nexhas deployed** in Phase D. So let's be specific.

### The 3 anchors we go after first

**Anchor 1: A restaurant chain in Dubai or India (the SME wedge)**
- **Why:** Restaurants have high-volume, low-margin procurement. They need suppliers. They have no bargaining power alone. They are easy to onboard.
- **What they get:** Free Nexha OS, free CapabilityOS, free DiscoveryOS for their procurement agents. ACI-based supplier scoring.
- **Win condition:** They save 10%+ on procurement in first 90 days.
- **Effort:** 4 weeks to first pilot

**Anchor 2: A logistics provider (DHL-tier or regional)**
- **Why:** Logistics is the connective tissue of all B2B. If DHL/TNT/etc. federate, every shipment becomes a discoverable, reputation-bearing event.
- **What they get:** Their logistics services become discoverable to every Nexha. New inbound revenue from autonomous AI customers.
- **Win condition:** 100+ shipments booked by AI agents in first 6 months.
- **Effort:** 8 weeks (enterprise sales cycle)

**Anchor 3: A government procurement agency (UAE, Singapore, or Indian state)**
- **Why:** Government procurement is $13T+ globally. Even a single state/province deployment is transformational. Government procurement is also the most paperwork-heavy, where AI agents add the most value.
- **What they get:** Tender discovery, AI bidding, compliance validation, contract execution — all autonomous.
- **Win condition:** Procurement cycle time drops from 6 months to 6 weeks for first tender.
- **Effort:** 12 weeks (long sales cycle, regulatory)

### The sequence

| Month | Anchor | What happens |
|---|---|---|
| 1 | Restaurant chain | Pilot agreement signed; first Nexha deployed |
| 2 | Restaurant chain | Live in production with 3 suppliers |
| 3 | Restaurant chain | First autonomous cross-Nexha deal |
| 4 | Logistics provider | Pilot agreement signed |
| 5-6 | Logistics provider | Integration; first shipments |
| 6 | Government | Initial conversations |
| 9-12 | Government | Pilot deployment |

By month 12, we have **3 anchor Nexhas**, each representing a different participant type (SME, logistics, government). This is enough social proof to sign 100 more Nexhas in Phase G.

### Why this sequence works

- **Restaurant (SME)** is easy to onboard but limited in scale. Proves the product works.
- **Logistics** is the connective tissue. Once they're in, every other Nexha benefits.
- **Government** is the credibility anchor. Once they're in, every other government + every enterprise takes us seriously.

This is exactly how SWIFT got adopted: banks → central banks → SWIFT → all banks. Government adoption is the unlock.

---

## 7. Open Source Strategy (the ACP question)

Per the strategic decision in this conversation:

### Phase 1 (Year 1-3): Open spec, closed implementation
- ACP specification published under **Creative Commons** (free to read, free to implement)
- Reference implementation stays HOJAI-controlled
- Anyone can build ACP-compatible software
- HOJAI's implementation is the gold standard
- **Why this works:** Most companies want the reference impl anyway; the spec alone doesn't give them a competitive advantage
- **Precedent:** Kubernetes (CNCF spec + Docker impl), OAuth (open spec, no dominant impl)

### Phase 2 (Year 3-5): Open SDKs and client libraries
- TypeScript SDK
- Python SDK
- Go SDK
- Java SDK
- All Apache 2.0
- Client libraries that make it easy to build ACP-compatible agents
- **Why this works:** SDKs accelerate adoption without giving away the server-side moat

### Phase 3 (Year 5+): ACP Foundation
- Create `ACP Foundation` modeled on Linux Foundation
- Industry-led governance
- HOJAI remains primary maintainer
- Foundation owns the spec, the trademark, the conformance tests
- **Why this works:** Foundation governance removes "HOJAI controls it" objection; HOJAI still gets paid for implementations and services

---

## 8. Pricing & Business Model Detail

### HOJAI AI pricing

| Tier | Who | Price | Includes |
|---|---|---|---|
| **Free** | Individual developers | $0 | 10K ACP messages/mo, 5 agents, sandbox |
| **Starter** | Startups | $200/mo | 1M ACP messages/mo, 50 agents, production |
| **Growth** | Scale-ups | $2K/mo | 10M ACP messages/mo, 500 agents, multi-region |
| **Enterprise** | Large companies | Custom | Unlimited, on-prem, SLA, dedicated support |
| **AI Infrastructure** | Other AI companies | Revenue share | White-label our foundation |

### Nexha pricing

| Tier | Who | Price | Includes |
|---|---|---|---|
| **Free** | Anyone | $0 | Self-host Nexha OS, register on CapabilityOS |
| **Federation Basic** | Verified Nexhas | $500/mo | Join federation, basic ACI, basic discovery |
| **Federation Premium** | Active Nexhas | $2K/mo | Full ACI, premium discovery, opportunity matching, priority support |
| **Industry Consortium** | Industry groups | $50K-$500K/yr | Multi-Nexha deployment, shared ACI, consortium dashboard |
| **Government** | Gov agencies | Custom | Multi-year transformation contracts |
| **Transaction Fees** | Active transactors | 0.1-0.5% | Small fee on autonomous transactions |
| **AIO Consulting** | Companies optimizing | $10K-$100K | Custom AIO optimization projects |
| **Trust Intelligence API** | Banks, insurers, govts | Per-call | Premium reputation data |

### Combined target (5-year)

- **Year 1:** 100 Nexhas deployed, 10M autonomous GMV, $2M ARR
- **Year 3:** 10K Nexhas, 100K agents, $1B autonomous GMV, $50M ARR
- **Year 5:** 100K Nexhas, 1M agents, $100B autonomous GMV, $500M ARR

---

## 9. Team & Headcount

### Year 1 (Phase D-F)

| Role | Count | Notes |
|---|---|---|
| **CTO / Tech Lead** | 1 | Already in place |
| **Backend Engineers** | 5 | Service work |
| **Frontend Engineer** | 1 | Portal v2 |
| **AI/ML Engineer** | 2 | Reputation scoring, OpportunityOS |
| **DevOps / SRE** | 2 | Self-hostable Nexha OS |
| **Solutions Architect** | 1 | Enterprise pilots |
| **Product Manager** | 1 | Roadmap |
| **Total** | ~13 | |

### Year 2 (Phase G-I)

| Role | Count | Delta |
|---|---|---|
| **Above** | 13 | |
| **Additional Backend** | +8 | Scale |
| **Sales** | +3 | Enterprise + Government |
| **Marketing** | +2 | Brand, AIO |
| **Legal** | +1 | Foundation governance |
| **Customer Success** | +2 | Onboarding |
| **Total** | ~29 | |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Cold start fails** — can't get first 3 Nexhas | Medium | High | Sequence SME → Logistics → Government. Don't depend on any single anchor. |
| **Federation governance fails** — Nexhas don't trust each other | Medium | High | Start with HOJAI-controlled federation; only decentralize when there are 50+ members |
| **Marketplace doesn't federate** — Amazon, Alibaba refuse | High | Medium | Don't depend on them. The 100 SMEs, 20 logistics, 10 industry consortiums are enough |
| **Standards war** — A2A / MCP wins over ACP | Medium | High | Differentiate: A2A/MCP are agent-to-agent; ACP is agent-to-business. Different layer |
| **SME onboarding too hard** | Medium | Medium | Free Nexha OS in 30-min setup; AIO consultants handle complex cases |
| **Reputation gaming** — companies fake reputation | Medium | Medium | SADA verification + verified events only; bootstrap journey; dispute resolution |
| **Government procurement cycle** | High | Medium | Don't depend on government as primary revenue; treat as credibility anchor |
| **Legal/regulatory** — cross-border data | High | High | Start with English-speaking common-law jurisdictions; expand later |
| **Tech debt from rapid build** | Medium | Medium | Strict test coverage (>80%) on all new services; weekly refactoring sprint |

---

## 11. What This Plan Does NOT Cover

These are intentionally deferred — they would expand the plan by 2x and distract from the core:

- **B2C consumer commerce** (Genie does this; not Global Nexha's focus)
- **Crypto / blockchain integration** (not needed for the autonomous economy to work)
- **Physical robotics** (WarehouseOS is software; hardware is partner territory)
- **Detailed marketing plan** (separate document)
- **Detailed financial model** (separate document for investors)
- **Detailed legal structure** (separate document with lawyers)
- **Detailed hiring plan** (covered at high level only)
- **Detailed pricing strategy** (covered at high level only)

---

## 12. Success Metrics (KPIs)

### Year 1 (after Phase D-F)

- ✅ 8 new services shipped (CapabilityOS, ReputationOS, DiscoveryOS, OpportunityOS, MarketOS, FederationOS, Global Directory, Nexha OS)
- ✅ 200+ new tests passing
- ✅ 100 Nexhas deployed (3 anchors + 97 self-serve)
- ✅ 3 design partner case studies
- ✅ ACP v2.1 published
- ✅ $2M ARR

### Year 2 (after Phase G-I)

- ✅ 1000+ Nexhas deployed
- ✅ 10K+ agents operating
- ✅ $1B autonomous GMV (cumulative)
- ✅ AIO industry established (10+ certified consultants)
- ✅ First 3 industry consortiums deployed
- ✅ First government deployment
- ✅ HOJAI AI Series A closed
- ✅ $50M ARR

### Year 3 (vision validation)

- ✅ 100K+ Nexhas
- ✅ 1M+ agents
- ✅ $100B+ autonomous GMV
- ✅ Public annual Global Nexha Index
- ✅ ACP Foundation established
- ✅ $500M ARR

---

## 13. Next Steps (when this plan is approved)

1. **Document the RTNM Digital org structure** in CLAUDE.md (this is the foundation for everything)
2. **Assign Phase D service owners** (5 services × 1-2 engineers each)
3. **Sign first anchor pilot** (restaurant chain in India or UAE)
4. **Publish CapabilityOS spec v0.1** (internal review, public in Phase D)
5. **Update CANONICAL-PORT-REGISTRY.md** with new ports (4270-4276)
6. **Create the phase-level epics** in whatever task tracker is in use

---

## Appendix A: Where SUTAR Actually Lives (summary)

To remove any remaining ambiguity:

| Question | Answer |
|---|---|
| Is SUTAR a separate product on the roadmap? | No |
| Does SUTAR need its own build workstream? | No (it's a HOJAI product, embedded in Nexha) |
| What is SUTAR? | **The Autonomous Business Operating System** (workforce + apps + engines + collaboration) |
| Who owns SUTAR? | HOJAI AI |
| Where does SUTAR run? | Embedded INSIDE every Nexha OS deployment (private instance per Nexha) |
| What does the customer see? | "My AI workforce + business apps" — never the word SUTAR |
| What does Nexha build re: SUTAR? | Packaging + wiring SUTAR to network services + industry bundles |
| What does HOJAI build re: SUTAR? | SUTAR OS itself (workforce, Department OS, engines, ACP) |
| Is SUTAR open-source? | Yes (under HOJAI, permissive license) |
| Is ACP open-source? | Spec is open, reference impl is HOJAI-controlled (Phases 1-3) |
| What's the relationship model? | **Linux-in-Android**: HOJAI builds SUTAR like Google builds Android; Nexha embeds it like Samsung ships Android |

**Mental model:** SUTAR is to Nexha what Android OS (with Linux kernel) is to Samsung Galaxy. Samsung doesn't rebuild Linux. Galaxy users don't think about Linux. They just use their phone. Similarly:
- HOJAI builds SUTAR (with foundation services as the "Linux kernel")
- Nexha embeds SUTAR in Nexha OS (like Samsung ships Android)
- Customers install Nexha OS and use their autonomous business — never knowing SUTAR is there

---

*This plan is intentionally aggressive but achievable. Each phase has a clear demo, a clear customer milestone, and clear exit criteria. If we hit Phase D exit criteria, the whole vision is validated. If we don't, we learn fast and adjust.*

*Last updated: 2026-06-22 (Executive Summary + Section 2 updated to reflect HOJAI as a multi-product AI company, not just infrastructure; SUTAR vision + Appendix A reflect Autonomous Business Operating System embedded in every Nexha)*
