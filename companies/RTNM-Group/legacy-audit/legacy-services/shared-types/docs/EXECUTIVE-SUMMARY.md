# REZ Commerce Intelligence Platform - Executive Summary
**Date:** May 19, 2026 | **Version:** 1.0

---

## What We Built

**REZ** is a real-time commerce intelligence platform for the physical world — combining the scale of Salesforce CDP, the targeting of Meta Ads, the vertical integration of Toast POS, and the network effects of Uber, specialized for hyperlocal commerce with QR codes, DOOH advertising, and multi-company loyalty.

---

## Platform Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REZ ECOSYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXPERIENCE LAYER                                                          │
│  ├── Consumer Apps (ReZ App, ReZ Now, BuzzLocal, Safe QR, Rendez)       │
│  ├── Merchant Apps (NexTaBizz, KDS, PO Mobile)                         │
│  ├── Enterprise Apps (PeopleOS, HR App, Insight Campus)                  │
│  └── Media Apps (AdBazaar, DOOH Screen, Karma Mobile)                   │
│                                                                             │
│  RABTUL PLATFORM                                                          │
│  ├── Core Services (Auth, Payment, Wallet, Order, Catalog, Search)      │
│  ├── Delivery Services (Tracking, Routing, Driver Management)            │
│  └── Infrastructure (Circuit Breaker, Policy Engine, Secrets)            │
│                                                                             │
│  REZ INTELLIGENCE                                                          │
│  ├── Expert Services (9) - Fitness, Health, Travel, Education, etc.     │
│  ├── AI Agents (8) - DemandSignal, Personalization, Attribution         │
│  ├── Support Intelligence (4) - Customer360, CSAT, Proactive Detection │
│  └── Predictive Models (6) - Churn, LTV, Revisit, Conversion            │
│                                                                             │
│  INTELLIGENCE INFRASTRUCTURE (NEW)                                        │
│  ├── Event Bus - 87 event types, schema registry, DLQ                     │
│  ├── Decision Engine - Real-time cashback, fraud, pricing decisions     │
│  ├── Commerce Graph - User-merchant relationships                        │
│  └── Feature Store - 50+ ML features                                    │
│                                                                             │
│  UNIFIED SERVICES (NEW)                                                    │
│  ├── Unified Identity - Single source for all identity                   │
│  ├── Unified Attribution - Single source for all attribution             │
│  └── Unified Notifications - Single source for all notifications      │
│                                                                             │
│  ACTIVATION                                                                │
│  ├── DOOH Targeting - Real-time ads based on user intent              │
│  ├── QR Campaigns - Intent-triggered QR experiences                     │
│  └── Loyalty Engine - Multi-company rewards and points                   │
│                                                                             │
│  GOVERNANCE                                                                │
│  └── Privacy, Consent, Audit, GDPR/DPDP Compliance                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Metrics

| Metric | Value |
|--------|-------|
| **Total Services** | 385+ |
| **Companies** | 10 |
| **Mobile Apps** | 16 |
| **Web Apps** | 25+ |
| **AI/ML Services** | 161 |
| **Event Types** | 87 |
| **Expert Services** | 9 |
| **AI Agents** | 8 |

---

## Revenue Model

| Stream | Month 12 Target | Month 24 Target |
|--------|-----------------|------------------|
| Merchant SaaS | ₹2.05Cr | ₹10Cr |
| Transactions | ₹9Cr | ₹30Cr |
| DOOH + QR Ads | ₹55L | ₹3Cr |
| Financial Services | ₹30L | ₹2Cr |
| **Total** | **₹13.7Cr** | **₹47.5Cr** |

---

## Strategic Positioning

### What REZ Is

> **"Real-Time Commerce Intelligence Infrastructure for the Physical World"**

### Competitive Differentiation

| Traditional Platform | REZ Approach |
|---------------------|--------------|
| Cashback App | Commerce Intelligence Platform |
| Analytics Dashboard | Decision Engine |
| Ad Network | Intent-Based Activation |
| Loyalty Program | Multi-Company Network |
| Point Solution | Platform Ecosystem |

### Network Effect Flywheel

```
More Merchants → More Data → Better AI → Higher Conversion
                                              ↑
More Users ← Better Targeting ← Better Personalization
    ↑
Better Cashback ← Higher Retention ←┘
```

---

## Architecture Highlights

### Event-Driven Design

Every action in the ecosystem creates an event:
- `commerce.order.created` → Triggers cashback decision
- `engagement.search.performed` → Updates intent prediction
- `dooh.ad.impression` → Tracks attribution
- `support.ticket.created` → Triggers proactive detection

### Real-Time Intelligence

| Decision | Latency | Action |
|-----------|---------|--------|
| Cashback amount | < 100ms | Credit wallet |
| Fraud detection | < 50ms | Block payment |
| Ad selection | < 200ms | Show on DOOH |
| Churn risk | < 500ms | Send retention offer |

### Unified Identity

Single view of user across:
- Mobile apps (iOS, Android)
- Web platforms
- Physical stores (QR scans)
- DOOH interactions
- Partner platforms

---

## Products & Features

### QR Ecosystem (9 Products)

| Product | Purpose | Users |
|---------|---------|-------|
| Safe QR | Emergency codes (15 modes) | All |
| Verify QR | Product authenticity | All |
| Creator QR | Personal commerce | Sellers |
| ReZ Now QR | Store payments | Merchants |
| Room QR | Hotel services | Hotel guests |
| Ads QR | Campaign rewards | Advertisers |

### DOOH Network

| Screen Type | CPM | Locations |
|-------------|-----|----------|
| Cab Tablet | ₹20 | Taxis |
| Mall Kiosk | ₹15 | Shopping centers |
| Restaurant Menu | ₹12 | Restaurants |
| Elevator Screen | ₹8 | Buildings |
| Billboard LED | ₹50 | Highways |

---

## Integration Partners

### RABTUL Services (19 Core)

```
Auth → Payment → Wallet → Order → Catalog → Search
  ↓       ↓        ↓       ↓       ↓       ↓
Events ← Events ← Events ← Events ← Events ← Events
```

### REZ Intelligence (161 Services)

```
Expert Services → AI Agents → Predictive Models → Decision Engine
      ↓               ↓              ↓               ↓
  User Context    Personalization   Churn/LTV      Actions
```

---

## Technical Stack

### Backend
- Node.js, Python, TypeScript
- MongoDB, Neo4j, Redis
- Kafka, WebSocket
- Express, FastAPI

### Frontend
- React, React Native
- Next.js, Expo
- Tailwind CSS

### Infrastructure
- Kubernetes, Docker
- Cloudflare, Render
- GitHub Actions

---

## Documentation

| Document | Purpose |
|----------|---------|
| `SOT.md` | Complete system overview |
| `ARCHITECTURE.md` | Technical architecture |
| `REZ-INTELLIGENCE-INFRASTRUCTURE.md` | Intelligence layer |
| `REZ-INTELLIGENCE-HOW-IT-WORKS.md` | Visual guides |
| `ECONOMIC-ENGINE.md` | Revenue model |
| `ECOSYSTEM-GAP-AUDIT.md` | Gap analysis |

---

## Git Repositories

| Repository | Purpose | Services |
|-----------|---------|----------|
| `RABTUL-Technologies` | Core platform | 56 |
| `REZ-Intelligence` | AI/ML services | 159 |
| `REZ-Consumer` | Consumer apps | 25 |
| `REZ-Merchant` | Merchant OS | 16 |
| `REZ-Media` | Advertising, DOOH | 106 |
| `StayOwn-Hospitality` | Hotels | 7 |
| `CorpPerks` | Enterprise SaaS | 13 |
| `RTNM-Group` | Platform controllers | 22 |

---

## Strategic Moat

### 1. Identity Graph
Cross-device, cross-platform, cross-company user identity — extremely hard to replicate.

### 2. Commerce Graph
User-merchant relationships, influence scoring, attribution tracking — creates network effects.

### 3. Event Bus
87 event types across 10 connectors — unified behavioral intelligence.

### 4. Decision Engine
Real-time decisions at scale — enables personalization at sub-100ms latency.

### 5. Multi-Company Loyalty
Single loyalty program across 10 companies — unique in the market.

---

## Next Steps

### Phase 1: Launch (Month 1-3)
- [ ] Deploy Event Bus to production
- [ ] Connect existing services to event bus
- [ ] Launch DOOH targeting
- [ ] Deploy Decision Engine

### Phase 2: Scale (Month 4-6)
- [ ] Expand merchant base
- [ ] Grow DOOH network
- [ ] Launch QR campaigns
- [ ] Enable attribution reporting

### Phase 3: Network (Month 7-12)
- [ ] Cross-company loyalty
- [ ] Attribution marketplace
- [ ] Enterprise intelligence
- [ ] API marketplace

---

## Contact

**Platform:** admin@rez.money
**Documentation:** See docs folder
**Service Registry:** REZ-Master/services.json

---

**Built with Claude Code - May 19, 2026**
