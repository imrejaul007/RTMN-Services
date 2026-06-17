# AdBazaar DOOH Competitive Audit

> **Version:** 1.0.0 | **Date:** June 16, 2026  
> **Status:** Comprehensive analysis of current capabilities vs global leaders

---

## Executive Summary

AdBazaar has a **strong foundation** with intent intelligence, but needs to build out **physical inventory management**, **verification systems**, and **attribution layers** to compete with global leaders like Vistar Media, Hivestack, and Broadsign.

### What We Have vs What We Need

| Capability | AdBazaar | JCDecaux | Vistar | Hivestack | Broadsign |
|-----------|----------|----------|--------|-----------|-----------|
| **Intent Intelligence** | ✅ Excellent | ❌ | ❌ | ❌ | ❌ |
| **Audience Segments** | ✅ Good | ⚠️ Basic | ✅ Advanced | ✅ Advanced | ⚠️ Basic |
| **Physical Inventory** | ❌ Missing | ✅ Full | ⚠️ Via partners | ⚠️ Via partners | ⚠️ Via partners |
| **Screen Management** | ⚠️ Basic | ✅ Full | ⚠️ Via partners | ❌ | ✅ Full |
| **Programmatic DOOH** | ❌ Missing | ⚠️ Limited | ✅ Full | ✅ Full | ✅ Full |
| **Verification** | ❌ Missing | ⚠️ Manual | ✅ Automated | ✅ Automated | ⚠️ Basic |
| **Attribution** | ⚠️ QR-based | ❌ | ✅ Advanced | ✅ Advanced | ❌ |
| **Commerce Integration** | ✅ Excellent | ❌ | ❌ | ❌ | ❌ |
| **Hyperlocal Targeting** | ⚠️ City-level | ⚠️ City-level | ✅ Street-level | ✅ Street-level | ⚠️ City-level |

---

## Part 1: What AdBazaar Currently Has

### ✅ DOOH Service (rez-dooh-service)

**Location:** `/companies/AdBazaar/rez-dooh-service/`

**Port:** 4018

**Capabilities:**
- Screen management (CRUD, health monitoring)
- Ad decision engine (AdOS)
- Area intelligence
- 1:1 personalization
- Analytics
- In-memory storage (needs MongoDB integration)

**Screen Types Supported:**
```javascript
DEFAULT_CPM_RATES = {
    cab_tablet: 15,
    bus_shelter: 20,
    bus_interior: 12,
    train_display: 18,
    metro_screen: 25,
    flight_seatback: 50,
    flight_overhead: 45,
    airport_display: 35,
    airport_kiosk: 40,
    airport_gate: 40,
    airport_lounge: 60,
    airport_billboard: 75,
    restaurant_tv: 10,
    hotel_lobby: 15,
    mall_kiosk: 22,
    gym_screen: 12,
    office_elevator: 18,
    billboard_digital: 50,
    // ... 20+ types
}
```

### ✅ HOJAI AI Intelligence

**Location:** `/companies/AdBazaar/hojai-ai-gateway-v2/`

**Port:** 4560

**Unique Capabilities:**
- Intent prediction
- Behavior prediction (churn, LTV)
- Audience segmentation
- Targeting optimization
- Campaign prediction
- Creative generation
- Fraud detection

### ✅ Intent Signal Aggregator

**Location:** `/companies/AdBazaar/intent-signal-aggregator/`

**Port:** 4800

**Signal Sources:**
- buzzlocal (local discovery)
- airzy (travel)
- rez-menu-qr (QR ordering)
- rez-now (quick commerce)
- risacare (healthcare)
- corpperks (corporate)

### ✅ QR Integration

**DOOH QR Service:** `/companies/AdBazaar/REZ-decision-service/dist/engines/sampling/doohQR.ts`

**Features:**
- QR generation for screens
- Scan tracking
- Attribution tracking

### ✅ Knowledge Base Integration

**Location:** `/companies/AdBazaar/REZ-lead-intelligence/dist/integrations/knowledgeBaseIntegration.js`

**Integrates with:**
- ReZ Mind (user knowledge)
- User preferences
- Shopping history
- Recent searches/views

### ✅ REZ Decision Service

**Location:** `/companies/AdBazaar/REZ-decision-service/`

**Port:** 4027

**Features:**
- Targeting engine
- Frequency capping
- Attribution tracking
- Auction engine
- Sampling/Reach estimation

---

## Part 2: Global Leaders - What They Have

### JCDecaux (World's Largest)

| Capability | Description |
|------------|-------------|
| **Inventory** | 80+ countries, millions of surfaces |
| **Airport Media** | 250+ airports globally |
| **Street Furniture** | Bus shelters, kiosks, benches |
| **Digital City Screens** | Smart city displays |
| **Transit Networks** | Metro, bus, train networks |

**Gap for AdBazaar:** Physical inventory ownership/partnerships

---

### Vistar Media (Programmatic DOOH Leader)

| Capability | Description | AdBazaar Status |
|------------|-------------|------------------|
| **Programmatic API** | Real-time bidding for DOOH | ❌ Missing |
| **Audience Targeting** | Mobile + DOOH combined | ⚠️ Mobile missing |
| **Place Intelligence** | Venue-level data | ⚠️ Basic |
| **Measurement** | Attribution & analytics | ⚠️ QR-only |
| **SSP/DSP** | Supply/demand side platforms | ❌ Missing |
| **Self-Serve Portal** | Advertiser dashboard | ❌ Missing |

---

### Hivestack (Global DOOH Exchange)

| Capability | Description | AdBazaar Status |
|------------|-------------|------------------|
| **DOOH Exchange** | Global marketplace | ❌ Missing |
| **Audience Segments** | Mobile + DOOH unified | ⚠️ Mobile missing |
| **Measurement API** | Attribution endpoints | ⚠️ Basic |
| **SSP/DSP** | Full stack | ❌ Missing |
| **Audience Sync** | Mobile ↔ DOOH | ❌ Missing |
| **Proof of Play** | Verified impressions | ❌ Missing |

---

### Broadsign (DOOH Operating System)

| Capability | Description | AdBazaar Status |
|-----------|-------------|------------------|
| **Screen Management** | Hardware control | ⚠️ Basic |
| **Content Scheduling** | Playlist management | ❌ Missing |
| **Programmatic** | Real-time bidding | ❌ Missing |
| **Network Ops** | Multi-screen control | ❌ Missing |
| **Integrations** | 200+ SSP/DSP partners | ❌ Missing |

---

## Part 3: What AdBazaar Is Missing

### Critical Gaps (Must Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Physical Inventory Network** | Partner screens (billboards, shelters, malls) | P0 |
| **Programmatic API** | Real-time bidding endpoints | P0 |
| **SSP/DSP Platform** | Supply/demand side infrastructure | P0 |
| **Computer Vision Verification** | AI photo verification of ads | P0 |
| **Self-Serve Dashboard** | Advertiser portal | P0 |
| **Mobile Location Signals** | GPS/travel pattern data | P0 |
| **Store Visit Attribution** | Footfall measurement | P1 |
| **Inventory Marketplace** | Media owner self-service | P1 |

### Important Gaps (Should Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Place Intelligence API** | Venue-level demographics | P1 |
| **Audience Sync** | Mobile ↔ DOOH matching | P1 |
| **Proof of Play API** | Verified impression reporting | P1 |
| **Content Management** | Creative library & versioning | P2 |
| **Scheduling Engine** | Campaign calendar & optimization | P2 |
| **Creative Preview** | Ad preview on screen types | P2 |

---

## Part 4: User/Merchant/Knowledgebase Connections

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ADBAZAAR ECOSYSTEM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    USER LAYER                               │    │
│  │                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │    │
│  │  │  CorpID    │  │  Memory-OS  │  │  Agent-Twin│           │    │
│  │  │  (4702)   │  │  (4703)    │  │  (3011)   │           │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘           │    │
│  │         │                │                │                    │    │
│  │         └────────────────┼────────────────┘                    │    │
│  │                          ▼                                      │    │
│  │  ┌─────────────────────────────────────────────────────┐       │    │
│  │  │                  REZ MIND                           │       │    │
│  │  │  • User preferences    • Shopping history           │       │    │
│  │  │  • Search signals      • Intent signals             │       │    │
│  │  │  • Brand affinity     • Life events                │       │    │
│  │  └─────────────────────────────────────────────────────┘       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  INTENT INTELLIGENCE                         │    │
│  │                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │    │
│  │  │  HOJAI AI   │  │  Intent     │  │  Predictive  │         │    │
│  │  │  Gateway    │  │  Aggregator │  │  Engine     │         │    │
│  │  │  (4560)    │  │  (4800)    │  │  (4801)    │         │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │    │
│  │         │                │                │                  │    │
│  │         └────────────────┼────────────────┘                  │    │
│  │                          ▼                                   │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │              AUDIENCE SEGMENTS                        │   │    │
│  │  │  • High Intent    • Dormant Interest    • Near Buy    │   │    │
│  │  │  • Travelers     • Food Lovers        • Shoppers    │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  MERCHANT LAYER                             │    │
│  │                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │    │
│  │  │ REZ-Merchant│  │   Nexha     │  │  QR Ecosystem│         │    │
│  │  │             │  │  Commerce   │  │             │         │    │
│  │  │ • Stores   │  │ • Products  │  │ • QR Codes  │         │    │
│  │  │ • Products │  │ • Orders   │  │ • Scans     │         │    │
│  │  │ • Orders   │  │ • Inventory│  │ • Attribution│         │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │    │
│  │         │                │                │                  │    │
│  │         └────────────────┼────────────────┘                  │    │
│  │                          ▼                                   │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │              COMMERCE SIGNALS                         │   │    │
│  │  │  • Purchase intent    • Category affinity             │   │    │
│  │  │  • Price sensitivity  • Brand preference               │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    DOOH LAYER                               │    │
│  │                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │    │
│  │  │ DOOH Service│  │ REZ-Ads    │  │  Decision   │         │    │
│  │  │ (4018)     │  │ (4007)    │  │  Service   │         │    │
│  │  │             │  │             │  │  (4027)   │         │    │
│  │  │ • Screens  │  │ • Serve ads│  │ • Targeting│         │    │
│  │  │ • Inventory│  │ • Tracking │  │ • Freq cap│         │    │
│  │  │ • CPM rates│  │ • Analytics│  │ • Attribution│       │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### What's Connected ✅

| System | Connection Point | Data Shared |
|--------|-----------------|-------------|
| **CorpID** | All services | User identity |
| **Memory-OS** | ReZ Mind | User context |
| **Agent-Twin** | Cross-company journeys | Unified profiles |
| **Goal-OS** | Industry OS | Campaign goals |
| **REZ-Merchant** | adsqr integration | Store data |
| **Nexha Commerce** | Industry OS | Product data |
| **QR Ecosystem** | Intent signals | Scan attribution |
| **CorpPerks** | Targeting categories | Employee segments |
| **Genie** | HOJAI AI | User preferences |

### What's NOT Connected ❌

| System | Missing Connection | Impact |
|--------|-------------------|--------|
| **Mobile App Data** | User location/GPS | Cannot do location-based targeting |
| **POS Data** | In-store purchases | Cannot verify store visits |
| **Loyalty Data** | Customer profiles | Cannot measure incremental lift |
| **Weather Data** | External signals | Missing contextual triggers |
| **Calendar Data** | Life events | Missing milestone targeting |
| **Music/Entertainment** | Lifestyle signals | Missing interest data |

---

## Part 5: Roadmap Recommendations

### Phase 1: Foundation (0-3 months)

**Goal:** Build the Vistar Media of India

```
Tasks:
□ Deploy DOOH Service with MongoDB persistence
□ Partner with 100 screens (billboards, bus shelters, malls)
□ Build Inventory Management System
□ Create Programmatic API (OpenRTB 2.5)
□ Deploy QR Attribution System
□ Build Self-Serve Advertiser Portal
□ Integrate with HOJAI AI for targeting
```

### Phase 2: Intelligence (3-6 months)

**Goal:** Differentiate with unique intelligence

```
Tasks:
□ Deploy Audience Explorer tool
□ Build Intent Signal marketplace
□ Create AI Media Planner
□ Integrate with Mobile Location data (partner with location provider)
□ Deploy Computer Vision verification
□ Build Store Visit Attribution model
□ Create Audience Twin Studio
```

### Phase 3: Scale (6-12 months)

**Goal:** Become India's dominant DOOH platform

```
Tasks:
□ Expand to 10,000+ screens
□ Build SSP for media owners
□ Build DSP for advertisers
□ Launch Audience Marketplace (sell segments)
□ Deploy Programmatic Guaranteed
□ Integrate with major DSPs (Google DV360, Trade Desk)
□ Launch mobile app for media owners
```

---

## Part 6: Competitive Positioning

### AdBazaar vs Vistar Media

| Feature | Vistar Media | AdBazaar | Advantage |
|---------|--------------|----------|-----------|
| **Intent Data** | Mobile only | Commerce + Intent | ✅ AdBazaar |
| **Audience Segments** | Mobile demographics | Commerce-based intent | ✅ AdBazaar |
| **QR Attribution** | Not available | Native | ✅ AdBazaar |
| **Programmatic** | Full stack | Building | ❌ Vistar |
| **Screen Network** | Via partners | Via partners | Tie |
| **Verification** | Automated | QR-based | ❌ AdBazaar |
| **Price** | Premium | TBD | Tie |

### AdBazaar's Unique Position

> **"The Commerce Intelligence Network for DOOH"**

No competitor has:
1. Direct connection to commerce transactions
2. QR-based attribution infrastructure
3. Intent signals from 6+ commerce sources
4. HOJAI AI for prediction
5. Hyperlocal merchant network

---

## Part 7: Technical Recommendations

### Build These Services

| Service | Purpose | Priority |
|---------|---------|----------|
| `adbazaar-inventory-service` | Physical inventory management | P0 |
| `adbazaar-programmatic-api` | OpenRTB endpoints | P0 |
| `adbazaar-ssp` | Supply-side platform | P0 |
| `adbazaar-dsp` | Demand-side platform | P1 |
| `adbazaar-verification` | CV verification | P1 |
| `adbazaar-attribution` | Multi-touch attribution | P1 |
| `adbazaar-audience-marketplace` | Segment marketplace | P2 |

### Build These Integrations

| Integration | Partner | Purpose |
|-------------|---------|---------|
| **Mobile Location** | Location.ai, Near | Audience mobility |
| **Weather API** | OpenWeather | Contextual triggers |
| **Traffic Data** | HERE, MapMyIndia | Route-based targeting |
| **POS Data** | POS partners | Store attribution |
| **CRM Data** | HubSpot, Zoho | B2B targeting |

---

## Appendix: Code Reference

### Key Files for DOOH

| File | Purpose |
|------|---------|
| `rez-dooh-service/dist/index.js` | Main DOOH service |
| `rez-dooh-service/dist/services/screenManagement.js` | Screen CRUD |
| `rez-dooh-service/dist/services/adDecision.js` | Ad selection |
| `rez-dooh-service/dist/services/areaIntelligence.js` | Area analysis |
| `hojai-ai-gateway-v2/src/services/aiService.ts` | AI intelligence |
| `intent-signal-aggregator/src/routes/signalRoutes.ts` | Signal ingestion |
| `REZ-decision-service/dist/engines/sampling/doohQR.ts` | QR attribution |
| `REZ-lead-intelligence/dist/integrations/knowledgeBaseIntegration.js` | User knowledge |

---

## Summary

### AdBazaar's Strengths ✅
1. **Unique Intent Intelligence** - No competitor has this commerce-first approach
2. **QR Attribution Infrastructure** - Built-in measurement
3. **Merchant Network** - Direct commerce connections
4. **HOJAI AI** - Predictive capabilities
5. **RTMN Ecosystem** - CorpID, Memory-OS, Agent-Twin integration

### AdBazaar's Weaknesses ❌
1. **No Physical Inventory** - Need screen partners
2. **No Programmatic Stack** - Need SSP/DSP
3. **No Mobile Location Data** - Gap in mobility intelligence
4. **No Verification System** - Need CV-based proof of play
5. **No Self-Serve Portal** - Need advertiser dashboard

### The Opportunity 🎯

Build **"Nexha for OOH"** - connecting every billboard, bus shelter, mall screen, hotel screen, restaurant screen, and society screen into one unified commerce-intelligent DOOH marketplace.

---

*Audit completed: June 16, 2026*
