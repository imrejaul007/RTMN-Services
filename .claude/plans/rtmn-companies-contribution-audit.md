# RTMN Companies Contribution Audit — for the Global Nexha Vision

> **Date:** 2026-06-22
>
> **Purpose:** Audit every RTMN company to determine what it can contribute to the Global Nexha + Autonomous Economy vision, and what gaps need to be filled.
>
> **Methodology:** For each company, evaluate (1) what exists, (2) what it can contribute, (3) what it needs to evolve into, (4) gaps.

---

## Executive Summary

The RTMN ecosystem has **25+ companies**. Most were built as standalone SaaS products. For the Global Nexha vision, we need to think of them as **potential Federation participants** + **potential capability providers**.

| Category | Companies | Contribution to Global Nexha |
|---|---|---|
| **Strong contributors** (real, integrated) | RABTUL, Nexha, HOJAI-AI, KHAIRMOVE, StayOwn-Hospitality, RisaCare, Karma-Foundation, AdBazaar | Directly contribute services to Nexha network |
| **Industry-specific** (vertical templates) | AssetMind, Axom, RisnaEstate, RidZa, RTNM-REE | Can become Industry Nexha templates |
| **Consumer apps** | do-app, REZ-Consumer, REZ-Exhibitor | External consumers of Global Nexha |
| **Legacy/duplicate** | HOJAI-AI-restored, RTNM-Group, RTNM-Digital, REZ-Workspace | Need scope audit |
| **External client** | Leverge (NOT RTMN) | Out of scope |

**Big gap discovered:** **Logistics is partially covered by KHAIRMOVE but lacks an "agentic logistics" layer** — autonomous shipment coordination, multi-carrier AI orchestration, customs/border AI agents, last-mile AI dispatch. This needs to be built.

---

## 1. RABTUL Technologies — Economic Layer

### What exists (verified)

**300+ files / 178+ services.** RABTUL is the **economic layer** for RTMN: authentication, payments, wallet, BNPL, trust, treasury.

### Can contribute to Global Nexha

| Service category | RABTUL has | Becomes in Global Nexha |
|---|---|---|
| **Identity & Auth** | rez-auth-service (4002), rez-merchant-auth-service, rez-mfa-service | CorpID-compatible identity layer for all Nexha members |
| **Payments** | rez-payment-service (4001), rez-wallet-service (4004) | EconomyOS-compatible payment rails |
| **BNPL / Trade Finance** | REZ-bnpl-service, REZ-capital-service | Trade finance APIs for nexha-trade-finance-network |
| **Trust** | rabtul-trust-engine (4050) | Bridges to SADA / ReputationOS |
| **Loyalty / Rewards** | rez-loyalty-gateway, rez-rewards, REZ-unified-loyalty | Karma / rewards engine for autonomous commerce |
| **Multi-currency / FX** | REZ-multi-currency (4042) | Cross-border payment for Global Nexha |
| **Treasury** | REZ-treasury-os (4055) | Corporate treasury for autonomous finance agents |
| **Fraud** | rez-fraud-service | Trust verification for new Nexha members |

### Strategic recommendation

**RABTUL becomes the "Economic Layer of Global Nexha."** It already has 178+ services covering 90% of what nexha-trade-finance-network needs. Rather than rebuild, **consolidate RABTUL's economic services as the canonical payment/trust/treasury backend** for Global Nexha.

### Action items

1. **Re-scope RABTUL** as "Economic Infrastructure for Global Nexha" (not just RTMN)
2. **Wire CorpID** into all RABTUL services (currently uses rez-auth)
3. **Expose RABTUL services as ACP-compatible** for cross-Nexha transactions
4. **Add agent APIs** so SUTAR CFO Agent / Finance Agent can use RABTUL directly
5. **Add multi-Nexha settlement** (split payments across Nexhas in a federation)

---

## 2. AdBazaar — Advertising + Commerce Media

### What exists (verified)

**~264 services.** AdBazaar is **advertising + commerce media only** (after the June 22 scope correction). DSP, SSP, ad exchange, DOOH, CTV/OTT, retail media, identity (ad-tech), audience (ad-tech), pixel/SDK (ad-tech), attribution (ad-tech), creative (ad-tech).

### Can contribute to Global Nexha

| Service category | AdBazaar has | Becomes in Global Nexha |
|---|---|---|
| **Intent signals** | REZ-signal-service, REZ-buzzlocal-intelligence | "What customers want" — OpportunityOS input |
| **Audience / CDP** | rez-audience, REZ-cdp (4961) | Audience intelligence for AI Sales Agent |
| **Attribution** | rez-attribution-engine, REZ-attribution-sdk | Multi-touch attribution for autonomous campaigns |
| **AI Campaign Builder** | REZ-ai-campaign-builder | Marketing Agent capability |
| **Live shopping** | rez-live-shopping | Commerce experience for Nexha storefronts |
| **Cross-device** | REZ-cross-device | Identity resolution across devices |
| **Reviews** | rez-reviews | Reputation signal for ReputationOS |
| **Heatmaps** | REZ-heatmaps | UX analytics for Nexha storefronts |

### Critical observation

**AdBazaar is the OPPOSITE of what Global Nexha enables.** Today, businesses compete via AdBazaar-style attention buying. Global Nexha's vision is **"reputation-based discovery replaces attention buying."** This is a strategic tension.

### Strategic recommendation

**Don't kill AdBazaar — make it the "transition product."** Many businesses still need paid acquisition today. AdBazaar can be:
- The **monetization channel** for Nexha network members (a marketplace Nexha can advertise itself to attract initial counterparties)
- The **intent signal source** for OpportunityOS (knowing what customers are searching for)
- The **gradual transition**: businesses move from paid acquisition → reputation-based discovery over time

AdBazaar's underlying tech (DSP, attribution, audience) becomes **infrastructure for AI Marketing Agent** within SUTAR.

### Action items

1. **Position AdBazaar as "the transition layer"** — paid acquisition that gradually becomes reputation-based discovery
2. **Wire AdBazaar signals into OpportunityOS** — "15 companies searching for X in your category"
3. **Build AI Marketing Agent** in SUTAR that uses AdBazaar signals + ReputationOS
4. **Phase down AdBazaar** over 5 years as reputation economy matures

---

## 3. HOJAI-AI — The Multi-Product AI Company

### What exists (verified)

**Massive.** HOJAI-AI is the AI infrastructure layer: foundation models, foundation services, SUTAR OS, Genie AI, BLR AI Marketplace, divisions, products, skills, training, trust, memory, twins.

### Can contribute to Global Nexha

| HOJAI product line | Contributes |
|---|---|
| **HOJAI Intelligence** | Foundation models for all Nexha AI agents |
| **HOJAI Foundation** (CorpID, MemoryOS, TwinOS, etc.) | Identity + memory + twins for every Nexha entity |
| **HOJAI SUTAR OS** | The autonomous business OS embedded in every Nexha |
| **HOJAI Foundry** | The startup generator that produces new Nexhas |
| **HOJAI Cloud** | Hosting for Nexha OS + Foundry projects |
| **HOJAI Skills** | Skill marketplace — specialist agents for Nexha members |
| **HOJAI Copilot** | Employee AI for Nexha customers |
| **HOJAI Genie** | Consumer AI for Nexha end-users |

### Strategic recommendation

**HOJAI is already the right shape.** The plan in Section 2 of the development plan is correct. The work is:
1. Wire HOJAI Foundry to generate Nexha-compatible projects
2. Build the developer platform (SDKs, CLI, sandbox)
3. Expand the foundation services to be Nexha-network-aware

### Action items

1. **HOJAI Foundry v1** — 5 starter kits (B2B marketplace, D2C, hotel, restaurant, ERP) — see plan
2. **SDK releases** — Foundation SDK, SUTAR SDK, Commerce SDK, Nexha SDK, ACP SDK
3. **Documentation as a product** — site.hojai.ai with guides, examples, API ref
4. **Developer relations** — community, certifications, conferences

---

## 4. KHAIRMOVE — Mobility + Logistics + Airport + Delivery

### What exists (verified)

**~30 services.** KHAIRMOVE is **mobility + delivery + logistics + airport**:
- Ride-hailing (khaimove-ride-service, khaimove-driver-app, khaimove-user-app)
- Delivery (khaimove-delivery-service, khaimove-logistics-aggregator)
- Rentals (khaimove-rental-service)
- Airzy airport ecosystem (18 services — flight, lounge, itinerary, wallet, AI brain, etc.)
- Community (rider-circle)
- Food delivery (rez-food-delivery-service, rez-delivery-tracking, rez-instant-delivery-service)
- Couriers (rez-ride, buzzlocal-rides-integration)

### Can contribute to Global Nexha

| Service category | KHAIRMOVE has | Becomes in Global Nexha |
|---|---|---|
| **Last-mile delivery** | khaimove-delivery-service, rez-instant-delivery-service | "Last-mile agent" in nexha-distribution-network |
| **Multi-carrier logistics** | khaimove-logistics-aggregator | Already used by nexha-distribution-network |
| **Airport logistics** | Airzy 18-service ecosystem | Airzy Nexha (airport-specific network) |
| **Fleet management** | khaimove-fleet-service | Warehouse Agent + Logistics Agent backbone |
| **Delivery tracking** | rez-delivery-tracking | Shipment Agent capability |
| **Dispatch** | khaimove-dispatch | Logistics Orchestrator Agent |

### 🚨 CRITICAL GAP: Agentic Logistics

**You flagged this correctly.** For the autonomous economy to work, we need **logistics that AI agents can orchestrate autonomously.** Right now:

- ✅ nexha-distribution-network exists (multi-carrier shipping)
- ✅ nexha-warehouse-network exists (slot booking + WMS)
- ✅ KHAIRMOVE has delivery + dispatch
- ❌ **No autonomous logistics orchestrator** — no AI agent that says "Ship 100T of steel from Mumbai to Dubai, optimize for cost + speed, choose multi-modal, handle customs, track to delivery"

### What we need to build: **nexha-autonomous-logistics** (or extend KHAIRMOVE)

This needs to be a new service (or a major extension to KHAIRMOVE) that handles:

**Capabilities required:**
1. **Multi-carrier AI orchestration** — DHL, Maersk, FedEx, plus regional carriers (BlueDart, Delhivery, Aramex)
2. **Multi-modal routing** — air, sea, road, rail, courier
3. **Customs + border AI** — HS codes, country regulations, document generation
4. **Real-time tracking** — unified view across carriers
5. **Dynamic rerouting** — when shipment is delayed, AI finds alternatives
6. **Cost optimization** — cheapest viable path given constraints
7. **Carbon-aware logistics** — minimize emissions when customer cares
8. **Insurance integration** — auto-bind cargo insurance
9. **Delivery confirmation + reputation** — feeds back to ReputationOS

**Suggested location:** Extend KHAIRMOVE rather than create yet another company. KHAIRMOVE already owns the physical mobility + delivery assets.

### Action items

1. **Build nexha-autonomous-logistics service** in `companies/Nexha/services/nexha-autonomous-logistics/` (port 4293)
2. **Integrate with existing nexha-distribution-network (4285)** — extend its capabilities
3. **Integrate with KHAIRMOVE** — use khaimove-dispatch + khaimove-logistics-aggregator as backbone
4. **Add Customs Agent** to SUTAR — knows HS codes + regulations for 100+ countries
5. **Add Logistics Orchestrator Agent** to SUTAR — handles end-to-end shipment decisions
6. **Multi-carrier adapters** — DHL, Maersk, FedEx, BlueDart, Delhivery, Aramex, etc.
7. **AI Logistics Simulator** — for testing before real shipments

---

## 5. StayOwn-Hospitality — Hotel Management

### What exists (verified)

**45+ services.** StayOwn is the **hotel + hospitality management platform**: room management, booking, reservations, guest services, check-in, housekeeping, maintenance, concierge, restaurant, bar, spa, etc.

### Can contribute to Global Nexha

| Service category | StayOwn has | Becomes in Global Nexha |
|---|---|---|
| **Booking** | booking-service, reservation-service | "Book a room" — handled by Hospitality Network |
| **Guest services** | guest-service, concierge-service | Customer Success Agent for hospitality |
| **Housekeeping** | housekeeping-service | Operations Agent capability |
| **Hotel restaurant** | restaurant-service | Connects to Restaurant / Food Network |
| **Spa / Bar** | spa-service, bar-service | Industry-specific OS modules |
| **Hotel AI Front Desk** | ai-front-desk | Industry-specialist SUTAR agent |

### Strategic recommendation

**StayOwn becomes the canonical Hospitality Industry Nexha template.** When a hotel deploys Nexha, the StayOwn templates are pre-loaded.

### Action items

1. **Re-scope StayOwn** as "Hospitality Industry OS for Nexha"
2. **Wire all StayOwn services** to use CorpID + ReputationOS + DiscoveryOS
3. **Create the Hospitality Network** in Global Nexha (one of the first 3-5 industry networks)
4. **Hotel SUTAR agent templates** — Concierge Agent, Reservation Agent, Housekeeping Agent, etc.

---

## 6. RisaCare — Healthcare

### What exists (verified)

**56+ services.** RisaCare is **India's Consumer Healthcare OS** — AI-powered healthcare navigation, B2C consumer healthcare, B2B healthcare enterprise.

### Can contribute to Global Nexha

| Service category | RisaCare has | Becomes in Global Nexha |
|---|---|---|
| **Patient navigation** | Healthcare AI services | Patient Success Agent |
| **Healthcare data** | Patient records, lab data | Healthcare Twin (extends TwinOS) |
| **Provider directory** | Hospital / clinic listings | DiscoveryOS for healthcare |
| **Insurance integration** | Insurance claims | Healthcare Network finance |

### Strategic recommendation

**RisaCare becomes the canonical Healthcare Industry Nexha template.** One of the first 5 industry networks.

### Action items

1. **Re-scope RisaCare** as "Healthcare Industry OS for Nexha"
2. **Wire to CorpID + ReputationOS**
3. **Create the Healthcare Network**
4. **Healthcare-specialist SUTAR agents** — Patient Agent, Provider Agent, Insurance Agent, Pharmacy Agent

---

## 7. Karma-Foundation — Social Impact + Loyalty

### What exists (verified)

**REZ-anniversary-rewards, REZ-birthday-rewards, REZ-gamification-service, karma-loyalty-bridge, etc.**

### Can contribute to Global Nexha

| Service category | Karma has | Becomes in Global Nexha |
|---|---|---|
| **Loyalty / Rewards** | rez-gamification-service, REZ-unified-loyalty | Karma system across all Nexhas — companies earn reputation points |
| **Volunteer / Impact** | Karma social programs | ESG signal for ReputationOS |
| **Anniversary / Birthday rewards** | REZ-anniversary-rewards, REZ-birthday-rewards | Personalization for consumer Genie |
| **Karma bridge** | karma-loyalty-bridge | Cross-Nexha loyalty points |

### Strategic recommendation

**Karma becomes the loyalty / ESG layer for the autonomous economy.** Every Nexha member gets Karma points; ESG actions boost ACI.

### Action items

1. **Wire Karma to ReputationOS** — ESG activities feed into ACI
2. **Cross-Nexha Karma** — points earned in one Nexha work in others
3. **Karma as a Trust signal** — companies with high Karma scores rank higher

---

## 8. Other companies — quick assessment

### AssetMind — Financial Intelligence

**What:** Digital Twins for every asset (stocks, crypto, forex, commodities, ETFs).

**Contribution:** **Asset Twin + Portfolio Twin + Market Twin** — perfect extension of TwinOS. Could become the financial intelligence layer for any Nexha member's CFO Agent.

**Action:** Wire AssetMind Twins into TwinOS. Make AssetTwin available to Nexha financial agents.

### Axom — Cosmic-OS

**What:** Unclear from audit (need deeper look). Appears to be a vertical-specific OS.

**Action:** Audit Axom specifically to determine its scope and contribution.

### RisnaEstate — Real Estate

**What:** Real estate management platform.

**Contribution:** Real Estate Industry Network template.

**Action:** Wire to CorpID + Nexha; create Real Estate Network.

### RidZa — Finance + Accounting

**What:** Finance & accounting services.

**Contribution:** Finance Agent capabilities for Nexha. Could integrate with AssetMind.

**Action:** Wire to EconomyOS + AssetMind. Finance Agent template.

### RTNM-REE — Marketplace + Attribution

**What:** RTNM Real Estate Exchange? Has ai-marketplace, attribution-engine.

**Contribution:** Marketplace template for Foundry. Attribution for ReputationOS.

**Action:** Consolidate or re-scope.

### do-app — Consumer App (already external)

**What:** External consumer app (Expo mobile + Express backend). Talks to RTMN over HTTP.

**Contribution:** Already a Nexha consumer. Uses Genie, CorpID, TwinOS.

**Action:** Continue as external. Add more Nexha consumption (procurement, etc.).

### REZ-Consumer — Consumer Apps

**What:** Various consumer-facing apps.

**Contribution:** External consumers of Global Nexha.

**Action:** Audit REZ-Consumer for specific apps.

### REZ-Exhibitor — Exhibitions

**What:** Exhibition platform.

**Contribution:** Events Network template (exhibitions are events).

**Action:** Wire to Nexha; create Events Network.

### HOJAI-AI-restored — Recovery directory

**What:** Restored version of HOJAI-AI from backup. Likely duplicate.

**Action:** Verify and delete if duplicate.

### RTNM-Group — Legacy company

**What:** Various legacy services (boa-os, capability-matrix, etc.).

**Action:** Audit and either re-home services or archive.

### RTNM-Digital — Parent holding

**What:** Has REZ-SalesMind, REZ-attribution-engine, REZ-integration-hub, rez-identity-hub, shared.

**Contribution:** Identity + integration infrastructure.

**Action:** Consolidate into HOJAI-AI (CorpID is already canonical) or document parent role.

### REZ-Workspace — Workspace platform

**What:** Workspace tools + some industry OSs.

**Contribution:** Possibly redundant with HOJAI Foundry.

**Action:** Audit for overlap with HOJAI Foundry.

---

## 9. The Big Gaps

### Gap 1: Agentic Logistics (CONFIRMED)

**Missing:** nexha-autonomous-logistics or extension to KHAIRMOVE. AI agents need to orchestrate shipments end-to-end without humans.

**Build:** Phase D (parallel to CapabilityOS). Port 4293. Integrate with KHAIRMOVE.

### Gap 2: HOJAI Foundry

**Missing:** Platform for generating AI-native startups. Critical for the developer flywheel.

**Build:** Phase D-E. 5 starter kits first.

### Gap 3: Industry Networks (Healthcare, Hospitality, Manufacturing, Food, Logistics)

**Missing:** Industry-specific federations. These are the wedges for adoption.

**Build:** Phases F-I. 2-3 industry networks first, then expand.

### Gap 4: Developer Platform (SDKs, CLI, Sandbox, Docs)

**Missing:** The platform for developers to build on HOJAI.

**Build:** Phase D-H. Continuous work.

### Gap 5: AI Marketing Agent + Marketing-as-Reputation

**Missing:** Marketing doesn't disappear; it transforms. We need AI Marketing Agent that publishes machine-readable capabilities instead of buying ads.

**Build:** Phase E. Wire to AdBazaar for transition, then phase out.

### Gap 6: Consumer-facing Nexha Portal

**Missing:** Way for consumers + businesses to interact with Global Nexha (beyond the Next.js portal at 4388).

**Build:** Phase G. Mobile + web apps for browsing the network.

### Gap 7: Federation Governance

**Missing:** Who decides protocol changes? Who handles disputes? Membership tiers?

**Build:** Phase G. Foundation-style governance.

---

## 10. Strategic Recommendations Summary

### Companies that need RE-SCOPING

| Company | Current scope | New scope (for Global Nexha) |
|---|---|---|
| RABTUL | Economic layer for RTMN | Economic infrastructure for Global Nexha |
| KHAIRMOVE | Mobility + delivery + airport | Agentic logistics + autonomous mobility |
| StayOwn | Hotel management | Hospitality Industry Network template |
| RisaCare | Consumer healthcare | Healthcare Industry Network template |
| AdBazaar | Advertising platform | Transition product for paid → reputation |
| Karma | Social impact | Loyalty + ESG layer for the autonomous economy |
| AssetMind | Financial intelligence | TwinOS extension (financial twins) |

### Companies that need NEW BUILD

| Gap | New service | Where |
|---|---|---|
| Agentic logistics | nexha-autonomous-logistics | `companies/Nexha/services/nexha-autonomous-logistics/` |
| HOJAI Foundry | New product line | `companies/HOJAI-AI/foundry/` |
| Industry Networks | 5 starter networks | New in `companies/Nexha/networks/` |
| Developer Platform | SDKs + CLI + Sandbox | `companies/HOJAI-AI/developer-platform/` |

### Companies that need AUDIT / CLEANUP

| Company | Action |
|---|---|
| HOJAI-AI-restored | Verify duplicate; delete if so |
| RTNM-Group | Audit and either re-home or archive |
| RTNM-Digital | Document as parent holding |
| REZ-Workspace | Audit for overlap with HOJAI Foundry |
| Axom | Audit scope |
| RTNM-REE | Consolidate |

---

## 11. Updated Build Effort Estimate

Adding the new workstreams:

| Workstream | Effort | When |
|---|---|---|
| nexha-autonomous-logistics | 8 weeks | Phase D |
| KHAIRMOVE agentification | 12 weeks (parallel) | Phase D-E |
| HOJAI Foundry v1 | 12 weeks | Phase D-E |
| HOJAI SDKs (5 SDKs) | 8 weeks (parallel) | Phase E |
| Industry Network templates (3 first) | 16 weeks | Phase F |
| Healthcare Network (RisaCare) | 8 weeks | Phase F |
| Hospitality Network (StayOwn) | 8 weeks | Phase F |
| Logistics Network (KHAIRMOVE) | 8 weeks | Phase F |
| Developer Platform | 12 weeks | Phase E-G |
| AdBazaar → Reputation transition | 16 weeks | Phase E-H |

**Total new effort:** ~16 weeks of critical-path + ~80 weeks of parallel work. **No impact on the 18-month plan timeline** (most of this is parallel work).

---

## 12. The Refined Vision

Putting it all together, the full RTMN ecosystem contribution to Global Nexha looks like this:

```
RTMN Digital
│
├── HOJAI AI (multi-product AI company)
│   ├── HOJAI Intelligence
│   ├── HOJAI Foundation
│   ├── HOJAI SUTAR OS
│   ├── HOJAI Foundry ← NEW
│   ├── HOJAI Cloud
│   ├── HOJAI Skills
│   ├── HOJAI Copilot
│   └── HOJAI Genie
│
├── Nexha (autonomous business network)
│   ├── Nexha OS
│   ├── Network services (CapabilityOS, ReputationOS, ...)
│   ├── nexha-autonomous-logistics ← NEW
│   ├── Global Nexha federation
│   └── 5+ Industry Networks
│       ├── Hospitality Network (StayOwn)
│       ├── Healthcare Network (RisaCare)
│       ├── Logistics Network (KHAIRMOVE)
│       ├── Manufacturing Network
│       ├── Financial Network (AssetMind + RidZa)
│       └── [more...]
│
├── RABTUL (economic infrastructure)
│   ├── Auth + Identity
│   ├── Payments + Wallet
│   ├── Trade Finance (BNPL, escrow)
│   ├── Trust + Fraud
│   ├── Treasury
│   └── Multi-currency + FX
│
├── Karma Foundation (loyalty + ESG)
│   ├── Gamification
│   ├── Rewards + Loyalty
│   ├── Social impact
│   └── ESG signals
│
├── AdBazaar (transition product)
│   ├── DSP / Ad Exchange
│   ├── Audience / CDP
│   ├── Attribution
│   └── Intent signals
│
├── RTNM-Group / RTNM-Digital (parent + legacy)
│
└── [external consumers: do-app, REZ-Consumer, REZ-Exhibitor]
```

**Every company has a role in the autonomous economy.** Some are core (HOJAI, Nexha, RABTUL, KHAIRMOVE). Some are templates (StayOwn, RisaCare, AssetMind). Some are transition products (AdBazaar). Some are external consumers.

---

## 13. Top 5 Immediate Action Items

If we were to start **tomorrow**, these are the 5 highest-leverage moves:

1. **Wire KHAIRMOVE into Nexha network** — biggest gap. Build nexha-autonomous-logistics. Port 4293.
2. **Build HOJAI Foundry MVP** — the developer flywheel. 5 starter kits. 
3. **Re-scope RABTUL** — make it the canonical economic layer for Global Nexha.
4. **Pick 1 industry network to launch first** — recommend Hospitality (StayOwn is most ready) or Food (highest autonomous commerce potential).
5. **Update CLAUDE.md** — document the RTNM Digital → HOJAI + Nexha structure with the new multi-product HOJAI view.

---

*This audit identifies 5 critical contributions, 6 gaps to fill, and 12+ companies that need re-scoping for the Global Nexha vision. The 18-month plan stays on track; the new workstreams are mostly parallel.*

*Last updated: 2026-06-22*
