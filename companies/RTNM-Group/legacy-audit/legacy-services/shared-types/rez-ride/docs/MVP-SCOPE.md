# ReZ Ride — MVP Scope & Development Phases

## Overview

Development is divided into 4 phases, each building on the previous. The goal is to launch a working product quickly and iterate based on feedback.

---

## Phase Timeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DEVELOPMENT TIMELINE                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Phase 1: Core           │ Phase 2: Intelligence │ Phase 3: Scale │    │
│ (3 months)              │ (2 months)            │ (3 months)    │    │
│                          │                       │                 │    │
│ • Basic ride booking     │ • Rez Mind integration │ • Bus booking  │    │
│ • Driver app            │ • Intent targeting     │ • Multi-city  │    │
│ • Simple dispatch       │ • Ad serving           │ • Screen program│    │
│ • ReZ integrations      │ • Cashback automation  │ • Analytics    │    │
│                          │                       │                 │    │
│                          │                       │                 │    │
│ ┌────────────────────┐  │ ┌─────────────────┐  │ ┌─────────────┐ │    │
│ │ Launch: City 1     │  │ │ Launch: Ads     │  │ │ Launch:    │ │    │
│ │ Cab only          │  │ │ Targeting       │  │ │ Bus + City │ │    │
│ │ No screens        │  │ │                 │  │ │ 2 + 3     │ │    │
│ └────────────────────┘  │ └─────────────────┘  │ └─────────────┘ │    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Core Ride Booking

**Duration:** 3 months
**Goal:** Basic ride booking without screens

### In Scope

#### User App Features

```
USER_APP_V1:
├── Phone login (ReZ Auth)
├── Home screen with vehicle options (Cab only for MVP)
├── Pickup/drop location input
├── Fare estimation
├── Real-time driver tracking
├── In-ride support (call driver)
├── Ride completion with receipt
├── Ride history
├── Wallet balance display
└── Basic settings
```

#### Driver App Features

```
DRIVER_APP_V1:
├── Phone login
├── Go online/offline
├── Receive ride requests
├── Accept/decline rides
├── GPS navigation to pickup
├── Start/end ride
├── Earnings dashboard
├── Daily earnings summary
├── Bank account/UPI setup
└── Basic settings
```

#### Backend Services

```
BACKEND_V1:
├── Ride Service
│   ├── Create ride
│   ├── Fare calculation
│   ├── Ride state machine
│   └── Ride history
│
├── Driver Service
│   ├── Driver registration
│   ├── Status management
│   ├── Simple matching (nearest driver)
│   └── Earnings calculation
│
├── Integration: ReZ Auth
├── Integration: ReZ Wallet (payment + wallet balance)
├── Integration: Maps API (routing, ETA)
│
└── Admin Dashboard
    ├── Driver approval
    ├── Ride monitoring
    └── Basic analytics
```

#### What's NOT in Phase 1

```
OUT_OF_SCOPE_P1:
├── No vehicle screens
├── No ad serving
├── No cashback (yet)
├── No auto/bus (cab only)
├── No surge pricing
├── No driver ratings (user can rate)
├── No promo codes
├── No referrals
└── Single city only
```

### Phase 1 Success Metrics

```
METRICS_P1:
├── Rides completed: Target 1,000/month
├── Average ride value: Track
├── Driver satisfaction: >4.0 rating
├── User satisfaction: >4.0 rating
├── Payment success rate: >99%
├── App crash rate: <1%
└── Support tickets: Track and minimize
```

---

## Phase 2: Intelligence & Ads

**Duration:** 2 months
**Goal:** Add ad serving and cashback, powered by Rez Mind

### In Scope

#### Ad Integration

```
AD_FEATURES:
├── Rez Mind integration for user profiling
├── Basic intent targeting
├── Ad serving from AdsBazaar
├── Impression tracking
├── Ad revenue reporting
└── Cashback automation (10% of fare)
```

#### User Experience Additions

```
USER_APP_V2:
├── 10% cashback on every ride (auto-credited)
├── Cashback balance in wallet
├── "You earned ₹X cashback" celebration
├── Basic ad display during ride (in-app)
├── Ad interaction tracking
└── View cashback history
```

#### Driver Experience Additions

```
DRIVER_APP_V2:
├── Ad revenue share display (60%)
├── Daily breakdown: Ride fare + Ad earnings
├── Screen compliance tracking (if screens deployed)
└── Ad revenue payouts
```

#### Backend Additions

```
BACKEND_V2:
├── Ad Service
│   ├── Rez Mind integration
│   ├── AdsBazaar integration
│   ├── Impression tracking
│   ├── Interaction tracking
│   └── Revenue calculation
│
├── Cashback Service
│   ├── Calculate 10% cashback
│   ├── Credit to user wallet
│   └── Track cashback transactions
│
└── Enhanced Analytics
    ├── Ad performance
    ├── User targeting effectiveness
    └── Revenue metrics
```

### Phase 2 Success Metrics

```
METRICS_P2:
├── Ad impressions served: Track
├── Average CPM: Track (target >₹20)
├── Cashback distributed: Track
├── User retention: Compare P1 vs P2 users
├── Ad engagement rate: >10% interaction
└── Cashback utilization: % used on ReZ services
```

---

## Phase 3: Scale & Vehicle Screens

**Duration:** 3 months
**Goal:** Multi-city expansion, vehicle screens, bus booking

### In Scope

#### Vehicle Screens

```
SCREEN_PROGRAM:
├── Screen device specification
├── Screen app development (Android)
├── Screen registration & management
├── OTA updates
├── Real-time ad serving
├── Impression tracking from screen
├── Screen health monitoring
├── Uptime compliance tracking
└── Ad revenue attribution
```

#### Bus Booking

```
BUS_FEATURES:
├── Shared ride booking
├── Fixed route display
├── Seat selection
├── Bus-specific pricing
├── Bus driver app (same as cab)
└── Bus screening for ads
```

#### Multi-City

```
MULTI_CITY:
├── City configuration (pricing, zones)
├── City-specific driver onboarding
├── Regional admin dashboard
├── Multi-city analytics
└── Inter-city features (future)
```

#### Advanced Features

```
ADVANCED_P3:
├── Surge pricing
├── Promo codes
├── Referral system
├── Driver ratings
├── User to user tipping
├── Scheduled rides
└── Corporate accounts
```

### Phase 3 Success Metrics

```
METRICS_P3:
├── Screens deployed: 100+
├── Screen uptime: >70%
├── Ad revenue per screen: Track
├── Cities active: 2-3
├── Bus rides: Track
├── Total rides: 10,000+/month
└── Revenue per ride: Track
```

---

## Phase 4: Growth & Optimization

**Duration:** Ongoing
**Goal:** Optimize, expand, and add premium features

### Future Features

```
FUTURE_FEATURES:
├── Premium cab tiers
├── Electric vehicle support
├── Carpooling
├── Intercity rides
├── Airport express
├── Corporate travel
├── Loyalty tiers
├── Gamification
├── AI-powered matching
├── Dynamic pricing optimization
└── Driver incentives engine
```

---

## Technical Architecture by Phase

### Phase 1: MVP Architecture

```
MVP_ARCHITECTURE:
├── Monolithic app (or 2-3 services max)
├── PostgreSQL (single database)
├── Redis (sessions, caching)
├── Simple REST APIs
├── WebSocket for real-time (driver tracking)
├── Docker for deployment
└── Manual scaling (vertical initially)
```

### Phase 2: With Ad Intelligence

```
P2_ARCHITECTURE:
├── Microservices (Ride, Driver, Ad, Wallet)
├── Kafka for event streaming
├── Separate Ad Service
├── Integration: Rez Mind
├── Integration: AdsBazaar
├── Enhanced caching
└── Horizontal scaling ready
```

### Phase 3: Production Scale

```
P3_ARCHITECTURE:
├── Full microservices architecture
├── Kubernetes orchestration
├── CDN for ad content
├── Edge computing for targeting
├── Multi-region database (read replicas)
├── Advanced monitoring (Prometheus, Grafana)
├── Auto-scaling
└── 99.9% uptime SLA
```

---

## Dependencies

### External Dependencies

```
DEPENDENCIES:
├── ReZ Auth Service (must be ready)
├── ReZ Wallet Service (must be ready)
├── Rez Mind Service (Phase 2)
├── AdsBazaar API (Phase 2)
├── Maps API (Google/Mapbox)
└── Payment Gateway (UPI/Cards)
```

### Prerequisites Before Start

```
PREREQUISITES:
1. ReZ Auth working and stable
2. ReZ Wallet working and stable
3. Legal/regulatory approval for ride-hailing
4. City permit (if required)
5. Insurance in place
6. Basic driver vetting process defined
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Low driver adoption | Launch with incentive program |
| Low user demand | ReZ ecosystem marketing |
| Payment failures | Multiple payment options |
| Ad targeting not effective | Start with generic ads, improve over time |
| Screen hardware issues | Partner with reliable supplier |
| Regulatory challenges | Legal team engaged from start |

---

## Questions Before Building

These need to be answered before Phase 1 starts:

```
OPEN_QUESTIONS:
├── Which city to launch first?
├── Own vehicles or driver-partners?
├── Screen hardware sourcing plan?
├── Initial driver acquisition strategy?
├── Marketing budget?
├── Team size for MVP?
├── Timeline target for launch?
└── Success metrics (how will we know it's working)?
```

---

## Development Team建议

### Phase 1 Team

```
MVP_TEAM:
├── Tech Lead (1)
├── Backend Engineers (2)
├── Mobile Engineers (2) - iOS + Android
├── Designer (1)
└── QA (1)

Total: 7 people
```

### Phase 2 Team

```
P2_TEAM:
├── Add: Backend Engineer (1) - Ad integration
├── Add: Data Engineer (1) - Analytics
└── Total: 9 people
```

### Phase 3 Team

```
P3_TEAM:
├── Add: Mobile Engineer (1) - Screen app
├── Add: DevOps Engineer (1)
├── Add: Support (1)
└── Total: 12 people
```

---

## Documentation Checklist

The following documents are in `/docs`:

- [x] `README.md` — Product overview
- [x] `PRODUCT-CONCEPT.md` — Business model
- [x] `BUSINESS-LOGIC.md` — Fare, cashback, earnings
- [x] `USER-FLOWS.md` — All user journeys
- [x] `TECHNICAL-ARCHITECTURE.md` — System design
- [x] `DATABASE-SCHEMA.md` — Data models
- [x] `INTEGRATIONS.md` — External services
- [x] `SCREEN-SPEC.md` — Vehicle screen
- [x] `MVP-SCOPE.md` — This document

---

## Next Steps

When ready to build:

1. Answer open questions above
2. Set up development environment
3. Integrate with ReZ Auth & Wallet
4. Build backend services
5. Build mobile apps
6. Test with small driver pool
7. Soft launch
8. Iterate based on feedback
