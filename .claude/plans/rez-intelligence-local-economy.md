# REZ Intelligence + Local Autonomous Economy

> **Date:** 2026-06-22
>
> **Purpose:** Document the REZ Intelligence (existing but unused) and the Local Autonomous Economy (the missing scale layer).

---

## 0. Executive Summary

**The plan misses two critical pieces:**

1. **REZ Intelligence** — a major existing asset that powers real-time business intelligence but is not integrated with HOJAI agents
2. **Local Autonomous Economy** — the biggest TAM (Local Nexha + BuzzLocal + DO) that makes HOJAI a consumer-scale platform

**Together, these make HOJAI the operating system for:**
- Global cross-border commerce (Global Nexha)
- National/niche networks (Industry Nexha)
- Local city economies (Local Nexha + BuzzLocal + DO)
- Consumer-facing AI (DO + Genie + REZ Wallet)

**This is the bridge from B2B-only to B2B + B2C + Local.**

---

## 1. REZ Intelligence — The Gold Mine

### What's already built (12+ services in AdBazaar + HOJAI AI)

| Service | Port | What it does |
|---|---|---|
| `REZ-intelligence-bridge` | 4980 | Bridge between AdBazaar and HOJAI AI |
| `REZ-media-intelligence` | — | Media intelligence |
| `REZ-media-intelligence-platform` | — | Media platform |
| `adbazaar-revenue-intelligence` | — | Revenue AI |
| `adbazaar-competitive-intelligence` | — | Competitive intelligence |
| `merchant-intelligence` | — | Merchant intelligence |
| `adbazaar-intelligence-graph` | — | Intelligence graph |
| `REZ-Intent-Graph` (11 agents) | — | Intent detection + routing + resolution |
| `sales-intelligence` | — | Sales intelligence |
| `revenue-intelligence-os` | — | Revenue OS |
| `workforce-intelligence` | — | Workforce intelligence |
| `company-intelligence-nexha` | — | Company intelligence |
| `customer-intelligence` | — | Customer intelligence |
| `merchant-insights-os` | — | Merchant insights |
| `intent-signal-aggregator` | — | Intent signals |
| `intent-prediction-engine` | — | Intent prediction |
| `intent-graph-service` | — | Intent graph |

**This is a gold mine** because it provides real-time business intelligence that can power every SUTAR agent.

### What REZ Intelligence does

**Currently provides:**
- Merchant intelligence (how a merchant is performing)
- Revenue intelligence (revenue trends, forecasts)
- Competitive intelligence (how a merchant compares to competitors)
- Customer intelligence (who their customers are, what they want)
- Sales intelligence (sales trends, opportunities)
- Workforce intelligence (team performance)
- Intent intelligence (what customers want, when)
- Media intelligence (advertising effectiveness)

### What it SHOULD do (the integration)

**Every SUTAR agent should have access to real-time intelligence:**

```
SUTAR Sales Agent
    ↓ (reads)
REZ Intelligence
    ↓ (returns)
- Top 3 products this customer might want
- Best time to send marketing message
- Competitive pricing benchmarks
- Customer's predicted lifetime value
- Churn risk score
    ↓ (uses)
Sales Agent makes better decisions
    ↓ (outcomes)
+30% conversion rate
+50% customer retention
+25% revenue per customer
```

### The integration architecture

```
HOJAI Gateway (multi-model)
    ↓
SUTAR OS (agents)
    ↓ (calls)
REZ Intelligence (real-time business intelligence)
    ↓ (returns)
Insights + predictions + recommendations
    ↓ (uses)
Agents make better decisions
    ↓ (feeds back)
Continuous learning loop
```

### Build plan (4 weeks)

**Week 1-2: SUTAR Integration**
- Wire every SUTAR agent to call REZ Intelligence
- Add real-time intelligence to agent context
- Create unified intelligence API

**Week 3-4: Developer API**
- Expose REZ Intelligence as APIs for developers
- Add to BAM as a category
- Document usage patterns

### 4 REZ Intelligence BAM packages (immediate value)

| Package | What it does | Price |
|---|---|---|
| **Merchant Intelligence Pack** | Real-time merchant performance, competitor benchmarks | $99/mo |
| **Customer Intelligence Pack** | Customer behavior, preferences, churn prediction | $149/mo |
| **Revenue Intelligence Pack** | Revenue forecasting, pricing optimization | $199/mo |
| **Sales Intelligence Pack** | Lead scoring, opportunity identification | $149/mo |

**These become BAM categories. Developers can install them in any HOJAI-generated company.**

---

## 1.5 Dual-Client Architecture (HOJAI + REZ) — Routing Update (2026-06-25)

> **Update:** Per user correction — "HOJAI Intelligence is for non-REZ/RTMN ecosystem clients; REZ Intelligence is for REZ ecosystem clients." All SUTAR agents and copilots now go through a **dual-client router** at `@rtmn/shared/intel/dual-client`, not directly to REZ Intelligence.

### The routing layer

```
SUTAR Agent / Copilot
    ↓ (calls dual-client helper, e.g. classifyIntent, getForecast, getCustomerChurnRisk)
@rtmn/shared/intel/dual-client
    ↓ (INTEL_MODE=hojai|rez|dual, default 'dual')
    ├── HOJAI Intelligence (port 4881) — first choice
    │   • /api/analyze (intent + sentiment + retrieval)
    │   • /api/customer/:id/insights
    │   • /api/policy/evaluate
    │
    └── REZ Intelligence Integration (port 5370) — fallback / business predictions
        • /api/v1/intent/classify
        • /api/v1/predict/{churn,ltv,revenue,demand}
        • /api/v1/pricing/recommend
        • /api/v1/insights/{merchant,customer,revenue,sales}
```

### Why dual-client, not REZ-only

| Concern | HOJAI Intelligence (4881) | REZ-Intel (5370) |
|---|---|---|
| **Scope** | Core AI (intent, sentiment, retrieval, policy) | Business predictions (churn, LTV, revenue, demand, pricing) |
| **Audience** | All HOJAI agents (incl. non-REZ clients) | REZ ecosystem clients (Merchant, AdBazaar, RABTUL) |
| **Coverage overlap** | None on business predictions | None on core AI |
| **Best fit for** | "What is this customer saying?" | "What's this customer's churn risk?" |

**Conclusion:** Both are needed. HOJAI for core AI, REZ for business predictions. The dual-client dispatches based on the call type and falls back gracefully if one backend is down.

### Configuration

```bash
# Default — try HOJAI first, fall back to REZ
INTEL_MODE=dual

# HOJAI-only mode (no REZ, business-prediction helpers return null)
INTEL_MODE=hojai

# REZ-only mode (skip HOJAI entirely, faster path)
INTEL_MODE=rez

# Disable individual backends (still respects INTEL_MODE)
HOJAI_INTEL_ENABLED=false
REZ_INTEL_ENABLED=false
HOJAI_INTEL_URL=http://localhost:4881
REZ_INTEL_URL=http://localhost:5370
```

### What was wired (31 services, 444 tests, 0 failures)

- **7 copilots** — sales, support, finance, marketing, agent, business, executive (3-4 deep endpoints each, 112 tests)
- **18 CJS SUTAR shallow services** — acn-hub, acn-integration, acn-network, acp-protocol, agent-analytics, agent-contracts, agent-learning, agent-marketplace, agent-orchestration, agent-teaming, negotiation-ai, sutar-contracts, sutar-agent-id, sutar-agent-network, sutar-gateway, sutar-identity, sutar-memory-bridge, sutar-monitoring (2 endpoints each: classify-intent, next-best-action, 270 tests)
- **1 ESM SUTAR** — agent-twin (9 tests)
- **5 TypeScript SUTAR** — sutar-decision-engine, sutar-trust-engine, sutar-contract-os, sutar-negotiation-engine, sutar-economy-os (TS `.d.ts` declarations added)
- **2 additional CJS SUTAR** fully migrated to dual-client (2026-06-25):
  - `sutar-os/core/sutar-twin-os` — 16 tests (NEW test file)
  - `sutar-os/core/sutar-tenant-instances` (ESM, test rewritten as .mjs) — 9 tests
- **Out of scope:** `merchant-agents` keeps the OLD shallow client as the reference implementation (10 tests); `widget-backend` is out of scope

### Test helper

`@rtmn/shared/test/rez-intel-helpers.cjs` provides 16 standard dual-client tests (exports, mode dispatch, fallback chain, network errors, both-disabled, health per-backend, timeout enforcement). Used by every service.

For ESM packages (`agent-twin`, `sutar-tenant-instances`), tests use `.mjs` with dynamic `import()` + cache-buster query string because the shared helper uses CJS `require()` and ESM modules cache aggressively.

---

## 2. The Local Autonomous Economy

### The 3-Economy Model

```
Global Economy
    ↓
Global Nexha (cross-border)
    ↓
National Economy
    ↓
Nexha Networks (industry)
    ↓
Local Economy (city)
    ↓
Local Nexha + BuzzLocal + DO + REZ
```

**The plan focuses on Global + National. The Local Economy is missing.**

### What's already built (Local Economy stack)

| Component | Status |
|---|---|
| **DO** (consumer app) | ✅ Built (do-app) |
| **BuzzLocal** | ⚠️ Partially built |
| **REZ Wallet** | ✅ Built |
| **REZ Coin** | ✅ Built (database) |
| **Local Nexha** | ❌ Not built |
| **DO + REZ integration** | ⚠️ Partial |

### The Local Autonomous Economy (LAE) — what it is

**LAE = A city-wide network of AI-native businesses, connected via Local Nexha, discovered via BuzzLocal, transacted via DO, and incentivized via REZ.**

```
City: Bangalore (3M residents, 100K businesses)
    ↓
Local Nexha (Bangalore)
    ↓
├── 10,000 restaurants
├── 5,000 hotels
├── 2,000 clinics
├── 1,000 gyms
├── 500 salons
├── 10,000 retail stores
├── 5,000 service providers
├── 500 wholesalers
├── 100 local manufacturers
├── 50 NGOs
├── 20 event venues
└── 3M consumers
    ↓
Each business:
- Has SUTAR AI employees
- Accepts REZ
- Discoverable via BuzzLocal
- Transacts via DO
- Connected via Local Nexha
- Listed in CapabilityOS
- Has ACI score
- Empowered by REZ Intelligence
```

### The 5 layers of Local Nexha

```
Layer 5: Global Nexha (connects to other cities, countries, industries)
Layer 4: National Nexha (connects cities within a country)
Layer 3: State/Region Nexha (connects cities within a state)
Layer 2: City Nexha (connects businesses within a city)
Layer 1: Neighborhood Nexha (connects businesses within a neighborhood)
```

**Every business belongs to a Local Nexha. Every Local Nexha federates upward.**

### What's in the Local Nexha

| Feature | Description |
|---|---|
| **Local Discovery** | BuzzLocal finds businesses by location |
| **Local CapabilityOS** | Machine-readable capabilities of local businesses |
| **Local ReputationOS** | Trust scores for local businesses |
| **Local Federation** | Businesses collaborate via ACP |
| **Local Compliance** | Local tax, license, regulatory rules |
| **Local Currency** | REZ + local fiat |
| **Local Logistics** | Local delivery, pickup, courier |
| **Local Marketplace** | B2B + B2C within the city |
| **Local Events** | Festivals, markets, networking |
| **Local AI Benchmarks** | Performance vs local competitors |

### BuzzLocal — the local discovery layer

**BuzzLocal is the "Instagram + Google Maps + Eventbrite + Facebook Events + Neighborhood Network" for local.**

**Features:**
- Discover nearby businesses, events, deals
- See what's trending in your area
- Local community feed
- Friend activity (opt-in)
- Photos, reviews, ratings
- Local news + events
- Hyperlocal recommendations
- Local delivery / pickup
- Community forums

**BuzzLocal is the front door to Local Nexha for consumers.**

### DO — the consumer gateway

**DO is the consumer's "operating system" for the local autonomous economy.**

**Features (current + future):**
- Food (Zomato / Swiggy)
- Shopping (Amazon / Flipkart)
- Travel (Booking.com / Airbnb)
- Healthcare (Practo)
- Entertainment (BookMyShow)
- Events (Eventbrite)
- Services (Urban Company)
- Bookings (OpenTable)
- Payments (Paytm)
- Rewards (REZ)

**One app for everything. Powered by Local Nexha + REZ + HOJAI Intelligence.**

### REZ in the Local Economy

**Every transaction in the local economy earns REZ:**

```
Restaurant:  5% REZ cashback
Hotel:      10% REZ cashback
Events:      3% REZ cashback
Gym:        10% REZ cashback (referrals)
Shopping:   5% REZ cashback
Services:   5% REZ cashback
```

**Closed-loop:** REZ earned at restaurant → spent at hotel → spent at gym → spent at salon.

### The Local Opportunity Engine (the differentiator)

**The biggest innovation is the "Local Opportunity Engine" — AI matches local demand to local supply in real-time.**

**Example 1: Restaurant has extra food**
- AI finds nearby NGO
- Offers free food
- NGO accepts
- Restaurant donates
- Tax deduction + REZ bonus

**Example 2: Gym has 50% unused capacity**
- AI finds nearby companies
- Offers corporate wellness packages
- Books automatically
- Gym earns revenue

**Example 3: Hotel has empty rooms**
- AI finds nearby events
- Offers discounted rooms to event attendees
- Books automatically
- Hotel fills rooms

**This is what makes Local Nexha unique — the AI orchestrates the local economy.**

---

## 3. Build Plan for Local Economy

### Phase 1: BuzzLocal Full Integration (8 weeks)

**Already partially built.** Need to complete:

- ✅ Location-based discovery
- ✅ Reviews + ratings
- ✅ Photos + videos
- ⚠️ Community feed
- ⚠️ Events integration
- ⚠️ Friend activity
- ⚠️ Trending detection
- ⚠️ Hyperlocal recommendations
- ⚠️ Local news

**Time to ship:** 8 weeks

### Phase 2: Local Nexha (12 weeks)

**New infrastructure to build:**

- Local Nexha gateway (port per city)
- Local Discovery (BuzzLocal integration)
- Local CapabilityOS
- Local ReputationOS
- Local Federation (up to National + Global)
- Local compliance packs
- Local AI benchmarks
- Local marketplace
- Local events
- Local logistics

**Time to ship:** 12 weeks

### Phase 3: DO + Local Nexha Integration (8 weeks)

- DO discovers businesses via Local Nexha
- DO orders from local businesses
- DO pays with REZ
- DO tracks via Local Logistics
- DO earns REZ cashback
- DO rates + reviews via BuzzLocal

**Time to ship:** 8 weeks

### Phase 4: REZ Intelligence + Local (4 weeks)

- Every SUTAR agent reads REZ Intelligence
- Real-time local insights (trending, popular, etc.)
- Local pricing recommendations
- Local demand forecasting
- Local opportunity matching

**Time to ship:** 4 weeks

### Phase 5: First Local Nexha Pilot (8 weeks)

- Pick a city (e.g., Bangalore, Dubai, Singapore)
- Onboard 100+ local businesses
- Launch BuzzLocal + DO in that city
- Track metrics
- Iterate
- Scale

**Time to ship:** 8 weeks

**Total Local Economy: ~40 weeks (10 months) parallel**

---

## 4. Why Local Economy is the Killer Scale

### The numbers

| Metric | Global SaaS | Local Economy (per city) |
|---|---|---|
| TAM per city | n/a | $10-50B |
| Number of cities | n/a | 10,000+ globally |
| Total TAM | $500B | $50-500T |
| Customer count | 100K | 10M+ per city |
| Network effects | Slow | **Fast** (local density) |
| Switching cost | Medium | **High** (local data) |
| Trust requirement | Medium | **High** (face-to-face) |

### The local network effect

```
100 businesses in Bangalore
    ↓
1,000 consumers
    ↓
10,000 transactions
    ↓
$1M GMV
    ↓
10% commission = $100K revenue
    ↓
More businesses join
    ↓
5,000 businesses
    ↓
50,000 consumers
    ↓
500,000 transactions
    ↓
$50M GMV
    ↓
$5M revenue
    ↓
50,000 businesses
    ↓
500,000 consumers
```

**Local density = viral growth.**

### Why Local is different from Global

**Global Nexha:**
- Slow network effects (years)
- Trust at distance
- Cross-border complexity
- Currency exchange
- Compliance

**Local Nexha:**
- Fast network effects (months)
- Trust at proximity
- Same regulatory zone
- Same currency
- Same compliance

**Local grows 10x faster than Global.**

---

## 5. REZ Intelligence + Local Economy = The Flywheel

```
Businesses join Local Nexha
    ↓
They get SUTAR AI employees
    ↓ powered by
REZ Intelligence
    ↓ (real-time insights)
    ↓
AI makes better decisions
    ↓
+30% conversion, +50% retention
    ↓
Business grows
    ↓
More consumers attracted via BuzzLocal
    ↓
More REZ transactions
    ↓
REZ cashback to consumers
    ↓
Consumers come back
    ↓
Local network effect compounds
    ↓
More businesses join
    ↓
(loop)
```

---

## 6. The 10 Local Economy Use Cases (killer apps)

### Use Case 1: Restaurant Procurement
- Restaurant needs vegetables
- AI finds local farmer via Local Nexha
- Negotiates price via Procurement Agent
- Books delivery via Local Logistics
- Pays via REZ
- Reviews via BuzzLocal

### Use Case 2: Hotel Staffing
- Hotel has 30% understaffed today
- AI finds nearby hospitality workers
- Books shifts via Staffing Agent
- Auto-pays via REZ Wallet
- Reviews via BuzzLocal

### Use Case 3: Gym Corporate Wellness
- Gym has 50% unused capacity
- AI finds nearby companies
- Offers corporate wellness packages
- Books via Sales Agent
- Manages via Subscription Agent

### Use Case 4: Local Manufacturing
- Small factory needs raw materials
- AI finds local suppliers
- Negotiates via Procurement Agent
- Books delivery via Local Logistics

### Use Case 5: Tourism
- Tourist in Bangalore
- DO suggests: hotel + restaurant + events + taxi
- All booked via Local Nexha
- All paid via REZ
- All rated via BuzzLocal

### Use Case 6: Healthcare
- Patient needs MRI
- AI finds nearby diagnostic center
- Books appointment via Booking Agent
- Verifies insurance
- Sends results to patient

### Use Case 7: Local Events
- Festival organizer
- AI finds: venue, vendors, performers, attendees
- Books all via Local Nexha
- Sells tickets via DO
- REZ rewards to attendees

### Use Case 8: Real Estate
- Buyer needs 2BHK
- AI finds nearby listings
- Schedules site visits
- Pre-checks loan eligibility
- Books through Real Estate Agent

### Use Case 9: Local Services
- Customer needs electrician
- AI finds nearby verified electricians
- Books via Service Agent
- Tracks via Local Logistics
- Pays via REZ
- Reviews via BuzzLocal

### Use Case 10: Local Government
- City government needs road repair
- AI finds qualified contractors
- Evaluates bids
- Awards contract
- Tracks via Government Agent
- Reports to citizens

---

## 7. Local Nexha Cities (Year 1 target)

| City | Population | Businesses | Pilot Month |
|---|---|---|---|
| Bangalore | 13M | 100K | Month 1 |
| Dubai | 3.5M | 50K | Month 2 |
| Singapore | 5.5M | 80K | Month 3 |
| London | 9M | 100K | Month 4 |
| Mumbai | 20M | 200K | Month 5 |
| New York | 8M | 100K | Month 6 |
| San Francisco | 800K | 50K | Month 7 |
| Berlin | 3.5M | 50K | Month 8 |
| Tokyo | 14M | 150K | Month 9 |
| Sydney | 5M | 50K | Month 10 |
| Sao Paulo | 12M | 100K | Month 11 |
| Lagos | 15M | 50K | Month 12 |

**12 Local Nexhas in Year 1.**

---

## 8. The 4 New Categories to Add to BAM

| Category | Description |
|---|---|
| **REZ Intelligence Packs** | Merchant intelligence, customer intelligence, revenue intelligence, sales intelligence |
| **Local Nexha Packs** | City-specific packs (Bangalore, Dubai, Singapore, etc.) |
| **Local AI Employees** | Local-specific AI employees (Local Procurement Officer, Local Event Coordinator, etc.) |
| **BuzzLocal Components** | Embeddable BuzzLocal widgets for local discovery |

---

## 9. Updated Priority List

| # | What | Why | Effort |
|---|---|---|---|
| 1 | **Wire REZ Intelligence** into SUTAR agents | Immediate value (existing asset) | 4 weeks |
| 2 | **Build HOJAI Widget** | Billion-dollar distribution | 8-12 weeks |
| 3 | **Build Local Nexha infrastructure** | The local economy play | 12 weeks |
| 4 | **Complete BuzzLocal** | Local discovery layer | 8 weeks |
| 5 | **Integrate DO + Local Nexha** | Consumer gateway | 8 weeks |
| 6 | **Pilot first Local Nexha** (Bangalore or Dubai) | Validate the model | 8 weeks |
| 7 | **Add 4 new BAM categories** (REZ Intel + Local packs) | Complete taxonomy | 4-8 weeks |

---

## 10. The Single Sentence

> **REZ Intelligence (existing but unused) + Local Nexha (city-level networks) + BuzzLocal (local discovery) + DO (consumer gateway) = the Local Autonomous Economy — the bridge from B2B-only to B2B + B2C + Local, making HOJAI a consumer-scale platform that reaches every business and every person in every city on Earth.**

---

## 11. Next Steps

1. **Wire REZ Intelligence** into SUTAR (4 weeks, immediate value)
2. **Build Local Nexha infrastructure** (12 weeks)
3. **Complete BuzzLocal** (8 weeks)
4. **Integrate DO + Local Nexha** (8 weeks)
5. **Pilot first Local Nexha** (Bangalore, 8 weeks)
6. **Add 4 new BAM categories** (4-8 weeks each)
7. **Expand to 12 cities** in Year 1

**Total: ~40 weeks parallel (10 months)**

---

*This document complements the architecture v2, the 5-year plan, the BAM complete spec, the HOJAI Widget spec, and the developer platform gaps. Together, they form the complete vision including the Local Autonomous Economy.*

*Last updated: 2026-06-22*
