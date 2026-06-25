# BIZORA — The Business Success Platform

> **Version:** 2.0
> **Last Updated:** 2026-06-24
> **Status:** ✅ Vision locked. Architecture + 16-week roadmap below.
> **Author:** Strategy session with founder (Rejaul Karim)
>
> **v2.0 update (June 24, 2026):** Corrected architecture — **Bizora is now a dispatcher/career, NOT an executor.** Bizora understands the user's problem, searches the fulfillment network (AI agents + agencies + AI workers + packages), routes the work to the right fulfillment, tracks status, handles payment. The actual work is done by others.

---

## 0. The Promise to Every Business

> **Any business, looking for any solution or service, can come to Bizora, talk to our AI agents, and search for what they need.**
>
> **They get a complete end-to-end solution.**
>
> **All they have to do is make the payment.**

That's it. No menus. No software to learn. No vendor selection. No coordination.

A restaurant owner says *"I need a logo, a website, and GST filing"* — Bizora's AI agent searches the fulfillment network, finds the right branding agency, web builder, and compliance agent, drafts the brief, hands off the work to them, tracks progress, and delivers the outcome. **One chat, one payment, one outcome.**

A SaaS founder says *"I need to hire 3 engineers and run a launch campaign"* — Bizora's AI finds the right hiring agent and the right marketing agent, routes the briefs, tracks both, returns when both are done. **One chat, one payment, one outcome.**

A boutique owner says *"My sales dropped 30%"* — Bizora's AI finds the right diagnostics agent, gets the analysis, recommends fixes, finds the right marketing agency to execute them, tracks the result. **One chat, one payment, one outcome.**

### What this means in plain terms

- **Bizora is the front door** — every business problem enters here
- **Bizora's AI agents understand the problem and search the network** — the user types in plain language; no browsing menus
- **Bizora routes the work to the right fulfillment** — an AI agent, an agency, an AI worker, or a pre-bundled package
- **Bizora tracks the outcome** — user gets one dashboard, one status, one notification
- **User just pays** — outcome-delivered pricing via RABTUL; no SaaS subscription, no per-seat licensing, no setup fees

### The 3-line version

> 1. User describes their business need in plain language
> 2. Bizora's AI agents search the fulfillment network, route the work to the right people, and track it to completion
> 3. User pays and gets the outcome

### The most important sentence in this doc

> **Bizora is the career of the information. Bizora does NOT do the task itself.**
>
> Bizora understands → searches → routes → tracks → pays.
> The actual work is done by AI agents from the HOJAI ecosystem, by vetted human agencies, by on-demand AI workers, or by pre-bundled packages.
>
> Bizora is the front door and the operations layer. **The work happens elsewhere.**

This is what the rest of the document describes how to build.

---

## 0a. The One-Liner

> **Bizora — The Business Success Platform**
> *"Tell us your business problem. We'll build the solution."*

Not an ERP. Not a CRM. Not a workflow tool. A **problem-first, outcome-first** business success platform powered by an AI concierge that orchestrates the entire RTMN ecosystem (HOJAI, SUTAR, CorpPerks, AdBazaar, REZ, Nexha, RABTUL, RTCS, Legal Partners) and a vetted partner network to deliver complete business outcomes.

---

## 1. Why This Is a 10x Reframe

### The old positioning (wrong)

```
Bizora = "Business Operating System" = ERP + CRM + HRMS + Finance + Marketing
         ↑ competes with SAP, Zoho, Odoo, HubSpot
         ↑ software-category thinking
         ↑ founders must pick tools, then figure out workflow
```

### The new positioning (right)

```
Bizora = "Business Success Platform" = outcomes-as-a-service
         ↑ competes with NO ONE — selling the outcome, not the software
         ↑ problem-category thinking
         ↑ founder says problem, Bizora assembles the solution
```

**The insight**: A founder doesn't want a CRM. They want *"more customers who pay and stay."* They don't want payroll software. They want *"20 employees hired, paid, and compliant by Friday."* They don't want a marketing tool. They want *"200 new D2C customers from Instagram this month."*

Every existing platform sells the tool and makes the founder do the assembly. **Bizora does the assembly.**

---

## 2. The Market Truth

Today, a founder in India setting up a restaurant talks to **10-20 vendors**:

| Vendor | For |
|---|---|
| CA | Company registration, GST, income tax |
| Lawyer | Contracts, FSSAI/MSME, trademark |
| Branding agency | Logo, identity, menu design |
| Web agency | Website, QR menu |
| Software vendor | POS, accounting |
| Marketing agency | Ads, social media |
| Recruiter | Hiring |
| Designer | Packaging, photos |
| Bank | Business account |
| Payment provider | Razorpay/Cashfree |

Each one is a separate relationship, separate contract, separate bill, separate point of failure. **Bizora replaces all 10-20 with 1.**

---

## 3. The Three Tiers of Customer

We build for all three, but tier them — T1 first (MVP), T2 at Phase 2, T3 at Phase 4.

### T1 — Solo founders / first-time entrepreneurs (MVP, Week 1-12)

**Stage**: 0 → 1 (idea to launch)
**Example**: Person wants to start a cloud kitchen in Mumbai
**Pain**: Doesn't know what they need, doesn't know which vendor is trustworthy, drowning in compliance
**Why first**: Clearest fit for "tell us your problem", biggest vendor chaos to eliminate, lowest CAC
**Geography**: India (with GCC expansion in Phase 8)

### T2 — Existing SMBs running 1-50 employee businesses (Phase 2, Week 13-20)

**Stage**: 1 → 10 (survive to grow)
**Example**: 5-year-old restaurant, retail chain of 3, 20-person services firm
**Pain**: Already has CA + lawyer + payroll software; doesn't know how to grow, retain, scale operations
**Why second**: Need to displace existing CA relationship — must deliver 5x value, not just convenience

### T3 — Franchise / multi-location operators (Phase 4, Week 30+)

**Stage**: 10 → 100 (scale)
**Example**: Restaurant chain of 8 locations, retail franchise with 25 outlets
**Pain**: Central ops, expansion playbooks, franchising, fundraising, M&A
**Why last**: Highest revenue per customer, narrowest market, requires T1+T2 features to be solid first

---

## 4. The 11 Problem Modules

The product is organized around **founder problems**, not software categories.

| # | Module | "Tell us..." examples |
|---|---|---|
| 1 | **Start My Business** | "I want to start a cloud kitchen in Mumbai" |
| 2 | **Get More Customers** | "My sales dropped 30%, help" |
| 3 | **Increase Revenue** | "How do I raise my average order value?" |
| 4 | **Reduce Costs** | "My food costs are killing margins" |
| 5 | **Hire Faster** | "I need 5 waiters by Saturday" |
| 6 | **Automate Operations** | "I'm drowning in inventory" |
| 7 | **Raise Funding** | "I'm ready for Series A" |
| 8 | **Expand Locations** | "Open my second branch in Pune" |
| 9 | **Improve Retention** | "Customers don't come back" |
| 10 | **Protect Business** | "I got a legal notice" |
| 11 | **Exit Business** | "I want to sell my business" |

Each module is a **vertical bundle of services** the AI concierge can compose on demand. Not a fixed menu — a fluid set of capabilities the LLM picks from.

---

## 5. The User Experience

### The homepage (no menus)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                                                              │
│        What do you need help with?                          │
│                                                              │
│        ┌──────────────────────────────────────────────┐      │
│        │ e.g. My sales dropped 30% this month         │      │
│        └──────────────────────────────────────────────┘      │
│                                                              │
│        ┌─────────┐                                           │
│        │   Ask   │                                           │
│        └─────────┘                                           │
│                                                              │
│                                                              │
│   Try one of these:                                          │
│                                                              │
│   • Register my company                                      │
│   • File my GST                                              │
│   • Build a website                                          │
│   • Hire 5 employees                                         │
│   • My sales are down                                        │
│   • Need more customers                                      │
│   • Open a new branch                                        │
│   • Reduce my costs                                          │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

One input box. No menus. No categories. The AI understands the founder's problem and orchestrates the rest.

### What happens after they type

User: *"I want to start a cloud kitchen in Mumbai"*

Bizora doesn't do the work itself. **Bizora figures out WHO should do the work**, then routes the user to them. Bizora responds in 3 phases:

#### Phase A — Discovery (10-20 seconds of clarifying questions)

```
Bizora:  Great! To set this up right, a few quick questions:

         1. What kind of entity? (Sole proprietorship / LLP / Pvt Ltd)
         2. What's your budget for setup? (Under ₹50k / ₹50k-2L / ₹2L+)
         3. What cuisine(s)?
         4. Solo or with a co-founder?
         5. Target launch date?
         6. Already have any of these? (FSSAI, GST, MCA, kitchen space)
```

User answers. Bizora figures out who can help.

#### Phase B — Routing (the "Solution Map")

Bizora doesn't make the plan itself. It searches the Bizora **fulfillment network** for the best matches and presents them to the user:

```
Bizora:  Here's who can help you with your Cloud Kitchen setup.
         I've grouped them by what they handle:

         📋 REGISTRATION & COMPLIANCE
         ─────────────────────────────────────────────────
         🏛️ CorpPerks Compliance Agent (AI Agent)
            Registers company, GST, FSSAI, MSME
            ₹8,500 total • 5-7 days • 4.8★ (2,341 users)
            [Hand off to agent →]

         🏛️ RTCS Registration Partner (Agency)
            Human CA + lawyer team
            ₹12,000 • 7-10 days • 4.7★ (891 clients)
            [Request quote →]


         🎨 BRANDING & DESIGN
         ─────────────────────────────────────────────────
         🎨 Canva Pro AI Worker (AI Worker)
            Logo + brand kit + QR menu
            ₹4,999 • 24 hours • 4.6★
            [Hand off to worker →]

         🎨 BrandForge Studio (Agency)
            Full identity + packaging
            ₹15,000 • 7 days • 4.9★
            [Request quote →]


         🌐 WEBSITE & QR MENU
         ─────────────────────────────────────────────────
         🌐 WebBuilder AI Worker (AI Worker)
            One-page site + QR menu
            ₹2,999 • 48 hours
            [Hand off to worker →]

         🌐 SiteCrafters Agency (Agency)
            Custom multi-page site
            ₹18,000 • 10 days
            [Request quote →]


         📣 LAUNCH MARKETING
         ─────────────────────────────────────────────────
         📣 AdBazaar Campaign Agent (AI Agent)
            Meta + Google launch campaign
            ₹25,000 ad spend + ₹3,000 mgmt fee
            [Hand off to agent →]


         👥 HIRING (5 kitchen staff)
         ─────────────────────────────────────────────────
         👥 CorpPerks Hiring Agent (AI Agent)
            Posts to Naukri, LinkedIn, Indeed; screens; coordinates interviews
            ₹15,000 • 10 days • 4.5★
            [Hand off to agent →]


         📦 OR GET A PACKAGE
         ─────────────────────────────────────────────────
         📦 "Cloud Kitchen in 21 Days" — Complete Package
            Everything above (registration + branding + site + marketing + hiring)
            ₹71,498 (save ₹8,500 vs. à la carte)
            Handled by: Bizora orchestration team
            [Get this package →]

         [Mix & match]  [Talk to a Bizora advisor]
```

#### Phase C — Hand-off (Bizora routes, others execute)

User picks. Bizora hands off the brief:

```
Bizora:  Handing off your "Cloud Kitchen Setup" brief to:
           • CorpPerks Compliance Agent (registration)
           • Canva Pro AI Worker (branding)
           • WebBuilder AI Worker (site)
           • CorpPerks Hiring Agent (hiring)

         Each will message you on WhatsApp to start.
         I'll track all 4 in your Bizora dashboard.
         Total estimated: ₹71,498
         [Pay now]  [Pay as each completes]
```

### What Bizora does vs what others do

| What | Who |
|---|---|
| **Understand the user's problem** | Bizora (the AI dispatcher) |
| **Find the right fulfillment options** | Bizora (searches AI agents, agencies, workers, packages) |
| **Present the choice to the user** | Bizora |
| **Handle payment** | Bizora (via RABTUL) |
| **Coordinate timing between providers** | Bizora |
| **Track status across providers** | Bizora |
| **Actually do the work** | **AI Agents / Agencies / AI Workers** (NOT Bizora) |

**Bizora is the front door and the operations layer. The work happens elsewhere.**

### Why this works

- **No software to learn** — the user types their problem in plain language
- **No vendor selection** — Bizora curates and ranks the best options
- **No coordination overhead** — Bizora handles the handoffs and tracks status
- **Best of both worlds** — AI for speed+cost, humans for quality+trust, packages for convenience
- **Always-on** — WhatsApp, web, voice, mobile all reach the same dispatcher

---

## 6. The Dispatcher Architecture (Bizora as Router, Not Executor)

### Core principle: Bizora is the front door + dispatcher + ops layer, NOT the executor

```
   User's problem
        |
        v
   +-----------------------------------------------------+
   |              BIZORA = THE FRONT DOOR                |
   |  ------------------------------------------------  |
   |  * Talks to the user (understands problem)          |
   |  * Searches the fulfillment network                 |
   |  * Presents ranked options                          |
   |  * Routes the brief to the chosen fulfillment       |
   |  * Handles payment                                  |
   |  * Tracks status across all providers               |
   |  * Returns to user with outcomes                    |
   |                                                     |
   |  Bizora does NOT do the work itself.               |
   +------------------------+----------------------------+
                            |
        +-------------------+-------------------+----------------+
        |                   |                   |                |
        v                   v                   v                v
   +---------+        +-----------+       +-----------+     +-----------+
   | AI      |        | AGENCY    |       | AI        |     | PACKAGE   |
   | AGENT   |        |           |       | WORKER    |     |           |
   |         |        |           |       |           |     |           |
   | (HOJAI  |        | (vetted   |       | (on-      |     | (pre-     |
   | special-|        | human     |       | demand    |     | bundled  |
   | ist     |        | partners) |       | AI        |     | multi-   |
   | agents) |        |           |       | workers)  |     | service  |
   |         |        |           |       |           |     | solution)|
   |         |        |           |       |           |     |           |
   | Examples:|        | Examples: |       | Examples: |     | Examples:|
   | *CorpPerks       | *Brand    |       | *Logo AI  |     | *Cloud    |
   |  HR Agent|       |  Forge    |       | *Content  |     |  Kitchen  |
   | *AdBazaar|       | *SiteCraft|       |  Writer   |     |  in 21    |
   |  Campaign       | *Legal    |       | *Data     |     |  Days     |
   |  Agent  |       |  Eagles   |       |  Analyst  |     | *SaaS     |
   | *Genie  |       | *Tally Pro|       | *SEO      |     |  Launch   |
   |  Thinker|       |           |       |  Auditor  |     |  in 30    |
   | *SUTAR  |       |           |       |           |     |  Days     |
   |  Decision      |           |       |           |     |           |
   |  Agent  |       |           |       |           |     |           |
   +---------+        +-----------+       +-----------+     +-----------+
```

### The 4 fulfillment types

| Type | What it is | When used | Examples |
|---|---|---|---|
| **AI Agent** | A specialist AI from the HOJAI ecosystem that knows a domain deeply | Structured tasks with clear APIs | CorpPerks HR Agent, AdBazaar Campaign Agent, Genie Tax Agent |
| **Agency** | A vetted human partner agency (branding, legal, etc.) | High-judgment creative or relationship work | BrandForge Studio, SiteCrafters, Legal Eagles |
| **AI Worker** | An on-demand AI worker you can hire by the task | Quick, repeatable, narrow-scope tasks | Logo AI, Content Writer, SEO Auditor, Data Analyst |
| **Package** | A pre-bundled multi-service solution from multiple fulfillment types | Common end-to-end journeys (cloud kitchen, SaaS launch) | "Cloud Kitchen in 21 Days", "SaaS Launch in 30 Days" |

### The 6 components of Bizora

```
+-------------------------------------------------------------+
|                       USER (any channel)                    |
|  Web Chat | WhatsApp | Voice | Mobile (do-app) | Email      |
+-----------------------------+-------------------------------+
                              |
                              v
        +---------------------------------------------+
        |  1. Channel Adapters (bizora-chat, 4002)    |
        |  * Receives input                           |
        |  * Manages session                          |
        |  * Routes to dispatcher                     |
        +---------------------+-----------------------+
                              |
                              v
        +---------------------------------------------+
        |  2. NEW Bizora Dispatcher (4620) -- BRAIN   |
        |  ----------------------------------------   |
        |  * Claude Sonnet 4.6 (via @hojai/llm)       |
        |  * UNDERSTAND: parses user intent           |
        |  * SEARCH: queries fulfillment registry     |
        |  * RANK: scores options by fit/price/rating |
        |  * PRESENT: shows user the top 3-5 options  |
        |  * ROUTE: hands off brief to chosen one     |
        |  * TRACK: monitors execution across all     |
        |  * Persistent conversation (Mongo)          |
        |  * Long-term user memory (embeddings)       |
        |  * Does NOT execute the work itself         |
        +---------------------+-----------------------+
                              |
                              v
        +---------------------------------------------+
        |  3. Fulfillment Registry (new, port 4621)   |
        |  ----------------------------------------   |
        |  * Catalog of all AI agents, agencies,      |
        |    AI workers, packages                     |
        |  * Searchable by capability, price, rating  |
        |  * Each entry has: name, description,       |
        |    capability tags, pricing model, SLA,     |
        |    rating, API/webhook to invoke            |
        |  * Backed by MongoDB                        |
        +---------------------+-----------------------+
                              |
                              |  (Bizora routes to chosen fulfillment)
                              v
        +---------------------------------------------+
        |  4. Fulfillment Network                     |
        |  ----------------------------------------   |
        |  * AI Agents: HOJAI specialists + SUTAR +   |
        |    CorpPerks + AdBazaar + Industry OS       |
        |  * Agencies: vetted human partners          |
        |  * AI Workers: on-demand narrow AI          |
        |  * Packages: pre-bundled orchestrations     |
        +---------------------+-----------------------+
                              |
                              |  (Fulfillment does the work)
                              v
        +---------------------------------------------+
        |  5. Status Tracker (Bizora returns)         |
        |  ----------------------------------------   |
        |  * Polls/webs each fulfillment for status   |
        |  * Aggregates into one user dashboard       |
        |  * Notifies user on WhatsApp/email/push     |
        |  * Handles escalations if fulfillment fails |
        +---------------------+-----------------------+
                              |
                              v
        +---------------------------------------------+
        |  6. Payment Layer (RABTUL)                  |
        |  ----------------------------------------   |
        |  * User pays Bizora (escrow)                |
        |  * Bizora pays fulfillment on completion    |
        |  * Refunds if SLA missed                    |
        +---------------------------------------------+
```

### The 4 lifecycle modes of the dispatcher

| Mode | What it does | When |
|---|---|---|
| **Discover** | Asks clarifying questions, understands the problem | First 30-60 sec of any new conversation |
| **Search** | Queries the fulfillment registry for matching agents/agencies/workers/packages | After discovery, before presenting |
| **Present** | Shows user the ranked top 3-5 options with price, rating, ETA | After search |
| **Route + Track** | Hands off brief to chosen fulfillment, tracks status, returns to user | After user picks |

Each mode has its own system prompt. Same brain, different behavior.

---

## 7. The Fulfillment Registry (Sample)

This is what Bizora searches when a user has a problem. Each entry is a routable fulfillment option — an AI agent, an agency, an AI worker, or a package.

```yaml
# fulfillment-registry.yaml

# ============================================================================
# AI AGENTS (specialist AIs from the HOJAI ecosystem)
# ============================================================================
- id: corperks-compliance-agent
  type: ai_agent
  name: "CorpPerks Compliance Agent"
  description: "Files company registration, GST, FSSAI, MSME, trademark via licensed CAs and government APIs"
  capabilities: [registration, gst, fssai, msme, trademark, licensing]
  invoke:
    method: ACP
    agent_id: "corperks.compliance.v1"
    endpoint: "http://localhost:4730/api/compliance-agent"
  pricing: { model: per_action, range: "₹500-₹8,500" }
  sla: "5-7 days"
  rating: 4.8
  reviews_count: 2341

- id: adbazaar-campaign-agent
  type: ai_agent
  name: "AdBazaar Campaign Agent"
  description: "Launches and manages Meta + Google + LinkedIn ad campaigns with budget, audience, and creative optimization"
  capabilities: [marketing, ads, lead_generation, brand_awareness]
  invoke:
    method: ACP
    agent_id: "adbazaar.campaign.v1"
    endpoint: "http://localhost:4990/api/campaign-agent"
  pricing: { model: percent_of_spend, fee: "12% of ad spend" }
  sla: "Live in 24 hours"
  rating: 4.6
  reviews_count: 1187

- id: corperks-hiring-agent
  type: ai_agent
  name: "CorpPerks Hiring Agent"
  description: "Posts to Naukri/LinkedIn/Indeed, screens candidates, coordinates interviews, sends offer letters"
  capabilities: [hiring, recruitment, hr, onboarding]
  invoke:
    method: ACP
    agent_id: "corperks.hiring.v1"
    endpoint: "http://localhost:4013/api/hiring-agent"
  pricing: { model: per_hire, range: "₹3,000-₹5,000 per successful hire" }
  sla: "10-15 days per role"
  rating: 4.5
  reviews_count: 762

- id: genie-thinking-engine
  type: ai_agent
  name: "Genie Thinking Engine"
  description: "Deep reasoning, SWOT, root cause analysis, scenario planning for complex business decisions"
  capabilities: [strategy, analysis, decision_support, planning]
  invoke:
    method: ACP
    agent_id: "genie.thinking.v1"
    endpoint: "http://localhost:4719/api/think"
  pricing: { model: per_query, range: "₹99-₹999" }
  sla: "Immediate"
  rating: 4.7
  reviews_count: 4103

- id: revenue-intelligence-diagnosis
  type: ai_agent
  name: "Revenue Intelligence Diagnosis"
  description: "Analyzes sales drops, marketing ROI, customer churn, pricing — gives actionable recommendations"
  capabilities: [diagnostics, sales_analysis, pricing, churn, retention]
  invoke:
    method: ACP
    agent_id: "revenue.diagnosis.v1"
    endpoint: "http://localhost:5400/api/diagnose"
  pricing: { model: per_query, range: "₹499-₹2,999" }
  sla: "Minutes"
  rating: 4.7
  reviews_count: 892


# ============================================================================
# AGENCIES (vetted human partner agencies)
# ============================================================================
- id: brandforge-studio
  type: agency
  name: "BrandForge Studio"
  description: "Full-service branding agency — logo, identity, packaging, brand guidelines"
  capabilities: [branding, logo, identity, packaging, design]
  invoke:
    method: web_form
    url: "https://brandforge.example.com/bizora-intake"
    auth: bizora_partner_token
  pricing: { model: fixed, range: "₹15,000-₹1,50,000" }
  sla: "5-15 days"
  rating: 4.9
  reviews_count: 234
  location: [Mumbai, Bangalore, Delhi, remote]

- id: sitecrafters-agency
  type: agency
  name: "SiteCrafters Agency"
  description: "Custom website development — from one-page sites to e-commerce, with QR menu integration"
  capabilities: [web_development, ecommerce, qr_menu, web_apps]
  invoke:
    method: web_form
    url: "https://sitecrafters.example.com/bizora-intake"
    auth: bizora_partner_token
  pricing: { model: fixed, range: "₹8,000-₹2,00,000" }
  sla: "7-21 days"
  rating: 4.8
  reviews_count: 567

- id: legal-eagles
  type: agency
  name: "Legal Eagles"
  description: "Licensed lawyers for contracts, NDAs, employment agreements, IP filings, dispute resolution"
  capabilities: [legal, contracts, ip, employment_law, dispute]
  invoke:
    method: web_form
    url: "https://legaleagles.example.com/bizora-intake"
    auth: bizora_partner_token
  pricing: { model: hourly, range: "₹2,000-₹5,000/hour" }
  sla: "Same-day response"
  rating: 4.8
  reviews_count: 412

- id: rtcs-consulting
  type: agency
  name: "RTCS Consulting"
  description: "CA + lawyer team for company registration, GST, FSSAI, trademark — human-delivered, RTCS-branded"
  capabilities: [registration, gst, fssai, msme, trademark, compliance]
  invoke:
    method: web_form
    url: "https://rtcs.example.com/bizora-intake"
    auth: bizora_partner_token
  pricing: { model: fixed, range: "₹8,000-₹25,000" }
  sla: "7-10 days"
  rating: 4.7
  reviews_count: 891


# ============================================================================
# AI WORKERS (on-demand narrow AI tasks)
# ============================================================================
- id: logo-ai-worker
  type: ai_worker
  name: "Logo AI Worker"
  description: "Generates 20 logo concepts in your style in under 60 seconds"
  capabilities: [logo, branding, quick_design]
  invoke:
    method: API
    endpoint: "https://logo-ai.example.com/api/generate"
    auth: api_key
  pricing: { model: fixed, price: "₹999 for 20 concepts" }
  sla: "60 seconds"
  rating: 4.5
  reviews_count: 5621

- id: content-writer-worker
  type: ai_worker
  name: "Content Writer AI Worker"
  description: "Writes blog posts, product descriptions, social captions, email sequences"
  capabilities: [content, copywriting, blog, social, email]
  invoke:
    method: API
    endpoint: "https://content-ai.example.com/api/write"
    auth: api_key
  pricing: { model: per_piece, range: "₹199-₹1,499" }
  sla: "Under 5 minutes"
  rating: 4.6
  reviews_count: 8932

- id: seo-auditor-worker
  type: ai_worker
  name: "SEO Auditor AI Worker"
  description: "Audits your website for SEO issues and gives a prioritized fix list"
  capabilities: [seo, audit, website_analysis]
  invoke:
    method: API
    endpoint: "https://seo-ai.example.com/api/audit"
    auth: api_key
  pricing: { model: fixed, price: "₹499 per audit" }
  sla: "Under 2 minutes"
  rating: 4.7
  reviews_count: 2104


# ============================================================================
# PACKAGES (pre-bundled end-to-end solutions)
# ============================================================================
- id: cloud-kitchen-21-days
  type: package
  name: "Cloud Kitchen in 21 Days"
  description: "Complete cloud kitchen setup: registration, GST, FSSAI, branding, website, marketing launch, 5 staff hired"
  includes:
    - corperks-compliance-agent  # registration, GST, FSSAI
    - logo-ai-worker             # logo + brand kit
    - sitecrafters-agency        # website + QR menu
    - adbazaar-campaign-agent    # launch campaign
    - corperks-hiring-agent      # 5 staff
  pricing: { model: bundled, price: "₹71,498", savings: "Save ₹8,500 vs à la carte" }
  sla: "21 days to launch"
  rating: 4.8
  reviews_count: 142

- id: saas-launch-30-days
  type: package
  name: "SaaS Launch in 30 Days"
  description: "B2B SaaS go-to-market: branding, landing page, content marketing, lead-gen campaign, first 10 customers"
  includes:
    - brandforge-studio           # full identity
    - sitecrafters-agency         # landing page + product tour
    - content-writer-worker       # 10 blog posts + email sequences
    - adbazaar-campaign-agent     # LinkedIn + Google lead-gen
    - genie-thinking-engine       # market + competitor analysis
  pricing: { model: bundled, price: "₹1,85,000", savings: "Save ₹25,000 vs à la carte" }
  sla: "30 days to launch"
  rating: 4.9
  reviews_count: 38

- id: restaurant-grand-opening
  type: package
  name: "Restaurant Grand Opening"
  description: "Physical restaurant launch: registration, GST, FSSAI, interior partner, branding, website, Zomato/Swiggy onboarding, launch marketing"
  includes:
    - corperks-compliance-agent
    - rtcs-consulting
    - brandforge-studio
    - sitecrafters-agency
    - adbazaar-campaign-agent
  pricing: { model: bundled, price: "₹2,40,000", savings: "Save ₹40,000 vs à la carte" }
  sla: "45 days to opening"
  rating: 4.7
  reviews_count: 76
```

### How Bizora uses this registry

When a user says *"I want to start a cloud kitchen"*, Bizora:

1. **Understands**: parses intent → "start_business" + "food" + "city=mumbai"
2. **Searches**: filters registry by `capabilities ⊇ {food_registration, fssai, cloud_kitchen}` + `location ⊇ Mumbai`
3. **Ranks**: scores each option by (rating × reviews_count) / price
4. **Presents**: shows user the top 3-5 options grouped by capability (as in the UX example)
5. **Routes**: when user picks, Bizora sends a structured brief to the chosen fulfillment's `invoke` endpoint
6. **Tracks**: polls/webs for status, aggregates into user dashboard
7. **Pays**: releases escrow payment on completion

The registry is the **catalog of who can do what**. Bizora never executes anything from this catalog directly.

---

## 8. What Already Exists vs What Needs Building

### ✅ Reuse as-is (production-ready, just wire)

| Asset | Where | Reuse for |
|---|---|---|
| Multi-provider LLM router (Claude/OpenAI/Gemini/Mistral/Llama) | `companies/REZ-Workspace/companies/hojai-ai/hojai-llm/providers/` | The brain's LLM layer |
| RAG service (port 4731) | `.../hojai-llm/rag/` | Company KB, regulatory docs |
| Genie OS Brain (keyword intent + 50+ URLs) | `companies/HOJAI-AI/products/genie/genie-os/runtime/genie/` | Patterns for delegation |
| hojai-whatsapp-ai (real OpenAI + WhatsApp) | `companies/HOJAI-AI/products/hojai-whatsapp-ai/` | WhatsApp channel adapter |
| 15 real BIZORA services (gst, payment, contract, escrow, invoice, people, vendor, etc.) | `companies/CorpPerks/BIZORA/services/` | The internal tool set |
| 24 Industry OS (restaurant, hotel, healthcare, etc.) | `industry-os/services/*` | The vertical logic |
| REZ-Workspace unified-fabric clients | `companies/REZ-Workspace/core/unified-fabric/` | Cross-service HTTP clients |
| 28 readiness tests for Genie | `companies/HOJAI-AI/products/genie/` | Test pattern |

### ⚠️ Refactor / extend (real but needs surgery)

| Asset | What needs changing |
|---|---|
| `bizora-chat` (4002) | Replace keyword regex → forward to new bizora-copilot |
| `ai-execution` (4065) | Replace `setTimeout` simulation → real tool dispatch |
| `orchestration-hub` (4095) | Add real `/tool/:name` endpoint with axios + retry |
| `workflow-orchestrator` (4050) | Make playbook executor actually call tools |
| `bizora-copilot` (4600 — HOJAI stub) | Either replace or align with the new bizora-copilot (4620) |
| 14 in-memory BIZORA services | Swap `Map<>` → Mongo for persistence |

### 🆕 Build new (the gaps)

| Service | Why | Effort |
|---|---|---|
| **bizora-copilot** (port 4620) | The actual LLM brain with tool-calling | 2 weeks |
| **registration-service** | MCA / Udyam / Shop license wrappers | 3 weeks |
| **fssai-service** | FSSAI GSP wrapper | 1 week |
| **trademark-service** | IPIndia wrapper | 1 week |
| **recruitment-service** | Job board API aggregator (Naukri/LinkedIn/Indeed) | 2 weeks |
| **partner-gateway** | Routes to vetted partner agencies (branding/dev/content/SEO) | 2 weeks |
| **bizora-frontend** | React chat UI + plan display + status dashboard | 3 weeks |
| **bizora-mobile** | do-app integration | 1 week |

### ❌ For later (Phase 2+)

- T2 features (advanced analytics, multi-location ops)
- T3 features (franchising, fundraising, M&A)
- Dubai freezone direct integration (partner via startup advisors initially)
- Voice-native (full duplex conversation)
- Mobile native apps

---

## 9. Phased Roadmap (16 weeks to MVP, then 16 more to full)

### Phase 0 — Stand up the brain (Week 1)

| Task | Output |
|---|---|
| Create `bizora-copilot` (port 4620) — Express + Claude via `@hojai/llm-providers` | Service running |
| Implement Anthropic tool-calling adapter with retries | LLM can call tools |
| `tools.yaml` schema + loader | Declarative tool registry |
| Mongo session store (replaces in-memory `Map` in bizora-chat) | Persistent conversations |
| Replace `bizora-chat` keyword regex with Claude call | Brain online |

**Deliverable**: User can chat with Bizora — no tools wired yet, but the brain works.

### Phase 1 — Wire the 12 MVP tools (Week 2-3)

| Module | Tools |
|---|---|
| **Start Business** | `check_mca_name`, `register_proprietorship`, `apply_gst`, `register_msme`, `apply_fssai`, `open_bank_account`, `setup_razorpay` |
| **Grow Business** | `run_meta_campaign`, `send_whatsapp_bulk` |
| **Run Business** | `file_gst_return`, `generate_invoice` |
| **Hire Faster** | `add_employee_payroll` |

All 12 point to **real BIZORA services** already built (`gst-filing`, `people-os`, `payment-service`, `whatsapp-service`, etc.) or to the new `registration-service` / `fssai-service` (built in parallel).

**Deliverable**: User says "register my company" → real MCA search + GST + Udyam via the copilot.

### Phase 2 — Multi-step plans + channel adapters (Week 4-6)

| Task | Output |
|---|---|
| Add Plan mode (compose multi-step plan from user answers) | Setup packages like the cloud kitchen example |
| Add Execute mode (sequence tools with state tracking) | Plans actually run end-to-end |
| Wire WhatsApp channel (via existing `hojai-whatsapp-ai`) | Founders can use WhatsApp |
| Web chat widget (React) | Founders can use web |
| Voice channel (via Voice OS STT/TTS) | Founders can use voice |
| Stripe-style status dashboard (each plan step's real status) | Founders can see progress |

**Deliverable**: 4 channels → 1 brain → real execution.

### Phase 3 — Partner network for missing capabilities (Week 7-8)

For capabilities we don't have (branding, web dev, content, SEO, photo/video):

| Task | Output |
|---|---|
| `partner-gateway` service — routes to vetted agencies | Single API surface |
| Onboard 10-30 partners per category (Branding, Web, Content, SEO, Photo/Video) | Real fulfillment |
| Partner rating system (delivery time, quality, NPS) | Quality control |
| "We don't do this in-house, here's a vetted partner" — honest fallback | Trust |

**Deliverable**: 80%+ of founder problems get a real answer, partner or in-house.

### Phase 4 — Diagnose mode (Week 9-10)

For "growth/protect/run" problems, the copilot needs to **analyze** before recommending:

| Capability | Backed by |
|---|---|
| Sales drop analysis | `revenue-intelligence` (port 5400, exists) |
| Review sentiment analysis | `brandpulse` (port 4770, exists) |
| Marketing ROI analysis | `AdBazaar` (exists) |
| Inventory optimization | `procurement-os` (port 5096, exists) |
| Customer retention analysis | `customer-intelligence` (port 5311, exists) |
| Compliance status check | `compliance` service (BIZORA, exists) |

**Deliverable**: User says "sales dropped 30%" → copilot runs diagnostics, presents findings, recommends actions, executes them.

### Phase 5 — GCC expansion (Week 11-12)

| Task | Output |
|---|---|
| UAE freezone directory (IFZA, DMCC, RAKEZ, Ajman) | Founder can compare options |
| India-to-Dubai expansion playbook | Cross-border workflow |
| Saudi SFZA + MISA pathways | KSA coverage |
| Partner with 2-3 GCC startup advisory firms | Fulfillment for legal/banking |
| Multi-currency invoicing (RABTUL multi-currency) | Already built |

**Deliverable**: User says "expand to Dubai" → copilot picks freezone, drafts application, connects to partner for bank account + visa.

### Phase 6 — Memory + learning (Week 13-14)

| Task | Output |
|---|---|
| Long-term user memory (OpenAI embeddings via `REZ-memory-cloud`) | Copilot remembers context |
| "Last month you filed GST for April, want to file May now?" | Proactive suggestions |
| Per-vertical templates (restaurant, SaaS, D2C, services) | Faster plans |
| Outcome tracking (did the user actually grow sales after our campaign?) | Improve recommendations |
| Audit log + explainability | Compliance + trust |

**Deliverable**: Copilot gets smarter with each interaction.

### Phase 7 — Polish + scale (Week 15-16)

| Task | Output |
|---|---|
| Observability (LangSmith or self-hosted) | Debug + improve |
| Rate limiting + cost controls | Don't burn money on runaway sessions |
| A/B test system prompts | Improve conversion |
| Onboarding for first 100 paying users | Real feedback loop |
| Marketing site + docs | Public launch |

**Deliverable**: MVP launch 🚀

---

### Phase 8-12 — Post-MVP (Week 17-32)

| Phase | What |
|---|---|
| **8 (T2 launch)** | SMB-focused features: multi-entity, advanced analytics, integrations with Tally/QuickBooks/Zoho |
| **9 (Marketplace)** | Third-party agencies + freelancers self-onboard into Bizora's partner network |
| **10 (Funding + Exit modules)** | Pitch deck generation, investor matching, due diligence workflows, M&A advisory |
| **11 (T3 launch)** | Franchise/multi-location features: central ops, expansion playbooks, royalty management |
| **12 (Scale)** | Multi-region, multi-language, mobile native |

---

## 10. Revenue Model — Hybrid Free Intake + Paid Execution

### The flow

```
Free intake: User can chat with the Bizora AI as much as they want.
             (Our cost: ~₹10-20 per conversation via Claude)

Paid execution: User pays only when they actually execute an outcome.
                 → File GST:           ₹99 (vs CA's ₹500)
                 → Register company:   ₹2,499 (vs CA's ₹5,000+)
                 → FSSAI license:     ₹1,999 (vs consultant's ₹5,000)
                 → Setup marketing:   12% of ad spend managed
                 → Hire 5 staff:      ₹4,999 per batch
                 → Plan subscription:  ₹2,999/mo for active execution
```

### Why this works

- **Zero CAC friction** — the chat is free, founders engage without commitment
- **Aligned incentives** — we only get paid when we deliver
- **Higher conversion** — by the time they pay, they've already gotten value
- **LTV expansion** — once they trust us for one thing, they come for everything
- **Margin improvement** — over time, more actions move from partner-executed to in-house (higher margin)

### Pricing tiers

| Tier | Price | Includes |
|---|---|---|
| **Free** | ₹0 | Unlimited chat, 1 free GST filing, basic diagnostics |
| **Pay-per-outcome** | per action | Only pay for what you execute |
| **Growth** | ₹4,999/mo | Unlimited plans, 10% off execution, monthly business review |
| **Scale** | ₹14,999/mo | Multi-location, dedicated partner manager, priority support |

### Revenue projection (conservative)

| Quarter | Users | Avg revenue/user | MRR | ARR |
|---|---|---|---|---|
| Q1 (post-MVP) | 200 | ₹1,500 | ₹3L | ₹36L |
| Q2 | 1,000 | ₹2,000 | ₹20L | ₹2.4Cr |
| Q3 | 5,000 | ₹2,500 | ₹1.25Cr | ₹15Cr |
| Q4 | 15,000 | ₹3,000 | ₹4.5Cr | ₹54Cr |

(Y1 target: ~₹54Cr ARR with 15K paying users — see Global Nexha Y1 target of $11M)

---

## 11. Team & Investment

### Team (for 16-week MVP)

| Role | Count | Why |
|---|---|---|
| Senior AI/LLM engineer | 1 | Owns bizora-copilot + tool registry |
| Backend engineer (TS/Node) | 2 | One orchestration, one compliance APIs |
| Frontend engineer | 1 | Chat widget + plan dashboard |
| DevOps (shared) | 0.5 | Multi-service deploy + observability |
| Product manager | 0.5 | Tool selection, partner onboarding |
| Partner manager | 1 | Vetted partner recruitment + QA |
| **Total FTE** | **6** | |

### Monthly burn (16-week MVP)

| Item | Monthly cost |
|---|---|
| Team (6 FTE, fully loaded) | ₹18L |
| Claude API + embeddings | ₹1.5L |
| MongoDB Atlas + hosting | ₹50K |
| External APIs (Razorpay, WhatsApp, GSTN, etc.) | pass-through |
| Partner onboarding (one-time, ₹2L each × 30) | ₹60L total, spread 4 months = ₹15L/mo |
| Marketing (early traction) | ₹3L |
| **Total monthly burn** | **~₹38L** |
| **16-week total** | **~₹1.5Cr** |

### Break-even

At Y1 target of 200 paying users @ ₹1,500 avg = ₹3L/mo MRR by month 6 — covers the AI infra but not the team. **Profitable at scale Y2 Q2** when 5,000 users @ ₹2,000 = ₹1Cr/mo MRR.

---

## 12. The 30-Day Quick Win

If 16 weeks feels too long, this is the path that ships a **real (not faked)** Bizora MVP for India SMBs in 30 days:

| Week | What ships |
|---|---|
| **1** | Stand up `bizora-copilot` (port 4620), wire to Claude via `@hojai/llm-providers`, replace `bizora-chat`'s regex with Claude call |
| **2** | Wire 7 tools: `file_gst_return`, `generate_invoice`, `create_escrow`, `draft_contract`, `add_employee`, `send_whatsapp`, `run_meta_campaign` |
| **3** | Build web chat widget (React) that calls `bizora-copilot`, deploy to staging |
| **4** | Test with 10 real Indian SMBs, fix top 20 bugs, ship to public |

**End of month 1**: A user opens the chat, types "I'm a small business owner in Mumbai, help me file this month's GST", and the copilot files the real GST return via the real `gst-filing` service, gets a real ack number, and messages them on WhatsApp when it's done.

**That alone is 10x more valuable than anything Bizora does today**, achievable in 30 days with 1 engineer.

---

## 13. Top 5 Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **LLM hallucination** — copilot calls wrong tool or invents data | High — user trust | Strict JSON schemas on every tool; manual review queue for high-risk actions (legal, financial >₹10K); test cases for 50 most common intents before launch |
| **In-memory stores lose data on restart** | Medium — bad UX | Phase 0+1 swaps all BIZORA `Map<>` → Mongo |
| **External API failures** (Razorpay, WhatsApp, GSTN) | Medium — broken promises | Circuit breaker (RABTUL `REZ-circuit-breaker`) + retry with backoff in orchestration-hub + clear "X is down, we'll retry in 5 min" UX |
| **Partner quality issues** | High — brand damage | Vetted onboarding, NPS-based rating, manual QA on first 10 deliveries per partner, replacement if rating <4.0 |
| **Regulatory risk** (FSSAI/MCA filings = legal liability) | Very high | Partner with licensed CAs/lawyers for actual filings in Y1; build our own filings only after Y2 with proper legal review |

---

## 14. Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Primary LLM | **Claude Sonnet 4.6** (via `@hojai/llm-providers`) | Best tool-calling, best at structured output, Anthropic SDK already integrated in your ecosystem |
| Tool registry format | **YAML** (declarative) | Easy to add tools without code, easy for non-engineers to review, easy to version |
| `bizora-copilot` location | **`companies/CorpPerks/BIZORA/services/bizora-copilot/`** (port 4620) | Natural fit next to bizora-chat, leverages existing BIZORA packages |
| Build vs partner for gaps | **Vetted partner network** | Faster to market, lower cost, leverages existing agency ecosystem |
| Revenue model | **Free intake + paid execution** | Lowest CAC, aligned incentives, mirrors HOJAI's "platform-as-an-economy" |
| Geography for MVP | **India + GCC** | Strongest HOJAI differentiator (India-to-GCC expansion) |
| Customer tier for MVP | **T1 (solo founders)** | Clearest problem-solution fit, lowest sales friction |

---

## 15. What Success Looks Like (6 months post-launch)

- **10,000 founders** have chatted with Bizora
- **2,000** have paid for at least one outcome
- **500** are on the Growth or Scale plan
- **₹1Cr/mo MRR** run rate
- **Net Promoter Score 60+** (vs industry SaaS average of 30)
- **Average outcome delivery**: 5-10 business tasks per paying user per month
- **Partner network**: 100+ vetted agencies across 8 categories
- **Coverage**: India + UAE + Saudi Arabia

---

## 16. Next Steps

| Action | Owner | When |
|---|---|---|
| Approve this plan | Founder | Today |
| Decide: 30-day quick win or 16-week roadmap? | Founder | This week |
| Hire senior AI/LLM engineer | Founder | This week |
| Create `bizora-copilot` service skeleton | AI engineer | Week 1 |
| Stand up `bizora-copilot` + wire Claude | AI engineer | Week 1 |
| Wire first 5 tools to existing real BIZORA services | AI engineer | Week 2 |
| Build web chat widget | Frontend | Week 3 |
| User test with 10 founders | PM | Week 4 |
| Public launch | Team | Week 5 |

---

*Last updated: 2026-06-24*
*Status: ✅ Approved for execution*
*Next review: After Week 4 user testing*
