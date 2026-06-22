# QR Systems - Complete Detailed Upgrade Plan

**Date:** May 3, 2026  
**Status:** Corrected Understanding

---

# CORRECT SYSTEM RELATIONSHIPS

```
┌─────────────────────────────────────────────────────────────────┐
│                    REZ ECOSYSTEM                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │               REZ NOW                                      │       │
│   │        INDIVIDUAL / STANDALONE                              │       │
│   │        now.rez.money/{slug}                              │       │
│   ├─────────────────────────────────────────────────────────┤       │
│   │                                                           │       │
│   │   RESTAURANT    │   RETAIL    │   SALON    │   HOTEL   │   │
│   │   (Built-in)     │   (Built-in)│   (Built-in)│   (Built-in)│   │
│   │                                                           │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │           REZ WEB MENU                                     │       │
│   │        SUBMODULE OF REZ NOW                              │       │
│   │        web-menu.rez.money/{slug}                        │       │
│   │        Restaurant features ONLY                            │       │
│   │        Same code, same features as Rez Now Restaurant     │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │               ROOM QR                                       │       │
│   │        INDIVIDUAL / STANDALONE                            │       │
│   │        room.rez.money/{hotel}/{room}                     │       │
│   │        Uses shared services from REZ ecosystem           │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │               ADS QR                                        │       │
│   │        INDIVIDUAL / STANDALONE                            │       │
│   │        adsqr.rez.money/c/{campaign}                     │       │
│   │        Uses shared services from REZ ecosystem           │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

# SYSTEM 1: REZ NOW

## What It Is
**INDIVIDUAL / STANDALONE** - Universal merchant platform for ALL business types

## URL
`now.rez.money/{slug}`

## Built-In Business Types

```
REZ NOW SUPPORTS:
├── Restaurant / Cafe / Cloud Kitchen
│   └── Menu, ordering, table booking, kitchen chat
├── Retail / Supermarket / Kirana
│   └── Product catalog, variants, stock, pricing
├── Salon / Beauty / Spa
│   └── Services, staff, appointments, packages
├── Hotel / Homestay
│   └── Room service, checkout, bookings
├── Service Professional
│   └── On-demand booking, quotes
├── Events / Venue
│   └── Tickets, bookings, scheduling
├── Transport
│   └── Booking, tracking
├── Healthcare
│   └── Appointments, medicine orders
├── Education
│   └── Courses, enrollment, scheduling
└── Government
    └── Payments, services, appointments
```

---

## REZ NOW FEATURE ROADMAP

### PHASE 1: RESTAURANT (Months 1-3)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Kitchen Display System (KDS)** | Real-time order queue, item status, timers | High | 🔴 |
| **Table Management** | Occupancy tracking, waitlist, reservations sync | Medium | 🔴 |
| **Group Ordering** | Friends join same table, share items | Medium | 🟠 |
| **Digital Menu Boards** | TV display for menu/ads | Medium | 🟡 |

### PHASE 2: MERCHANT TOOLS (Months 3-5)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Merchant CRM** | Customer list, LTV, segmentation | High | 🔴 |
| **Offer Automation Engine** | First visit, milestones, birthday, weather | High | 🔴 |
| **WhatsApp Receipts** | Auto-send after payment | Medium | 🟠 |
| **Staff Dashboard** | Unified for all business types | High | 🟠 |

### PHASE 3: AI + GROWTH (Months 5-7)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **AI Chatbot (RAG)** | Menu Q&A, order taking, recommendations | High | 🔴 |
| **Smart Reorder** | "Your usual?", one-tap reorder | Medium | 🟠 |
| **Loyalty Gamification** | Streaks, badges, progress bars | Medium | 🟡 |
| **Referral System** | Share + earn coins | Medium | 🟡 |

### PHASE 4: ALL BUSINESS TYPES (Months 7-9)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Retail Features** | Variants, stock, bulk pricing | High | 🔴 |
| **Salon Features** | Staff scheduling, packages, recurring | High | 🔴 |
| **Service Features** | Quotes, on-demand booking | Medium | 🟠 |
| **Event Features** | Tickets, scheduling | Medium | 🟠 |

### PHASE 5: PAYMENTS + SETTLEMENT (Months 9-12)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Sub-2s Settlement** | Instant payout to merchants | High | 🔴 |
| **Gift Cards** | Buy, send, redeem | Medium | 🟠 |
| **Multi-currency** | For tourism | Medium | 🟡 |
| **BNPL** | Buy now, pay later | High | 🟡 |

---

## REZ NOW TEAM STRUCTURE

```
REZ NOW TEAM (6-8 devs)
├── 2 Frontend (React/Next.js)
├── 2 Backend (Node.js/PostgreSQL)
├── 1 AI/ML (REZ Mind integration)
├── 1 Mobile (PWA optimization)
└── 1 DevOps (Deployment, monitoring)
```

---

# SYSTEM 2: REZ WEB MENU

## What It Is
**SUBMODULE OF REZ NOW** - Restaurant features only, same code

## URL
`web-menu.rez.money/{slug}`

## Relationship to Rez Now

```
┌─────────────────────────────────────────────────────────────────┐
│ REZ NOW                                                          │
│ └── Has Restaurant Module (built-in)                             │
│       └── Menu, ordering, cart, checkout, AI chat...           │
│                                                                     │
│ REZ WEB MENU                                                     │
│ └── IS the Restaurant Module                                      │
│       └── Exactly same code                                       │
│       └── Exactly same features                                   │
│       └── Just different entry point/URL                         │
│                                                                     │
│ WHY BOTH?                                                         │
│ ├── Rez Now = Universal (all business types)                     │
│ ├── Rez Web Menu = Focus on restaurants only                    │
│ └── Can be marketed separately                                   │
└─────────────────────────────────────────────────────────────────┘
```

## REZ WEB MENU FEATURE ROADMAP

Since it's a SUBMODULE of Rez Now, it automatically gets ALL restaurant features built for Rez Now.

### PHASE 1: CORE (Months 1-3)
*Inherited from Rez Now Phase 1*

| Feature | Source | Priority |
|---------|--------|----------|
| Kitchen Display System | Rez Now | 🔴 |
| Table Management | Rez Now | 🔴 |
| Group Ordering | Rez Now | 🟠 |
| AI Chatbot | Rez Now | 🔴 |

### PHASE 2: GROWTH (Months 3-6)
*Inherited from Rez Now Phase 2-3*

| Feature | Source | Priority |
|---------|--------|----------|
| Merchant CRM | Rez Now | 🔴 |
| Offer Automation | Rez Now | 🔴 |
| WhatsApp Receipts | Rez Now | 🟠 |
| Smart Reorder | Rez Now | 🟠 |
| Loyalty Gamification | Rez Now | 🟡 |

### RESOURCE REQUIREMENT

```
REZ WEB MENU TEAM (2-3 devs)
├── 1 Frontend (shares code with Rez Now)
├── 1 Backend (shares API with Rez Now)
└── 1 QA (for standalone URL testing)
```

**Note:** Most development is shared with Rez Now. Only need small team for standalone URL/ branding.

---

# SYSTEM 3: ROOM QR

## What It Is
**INDIVIDUAL / STANDALONE** - Hotel room services system

## URL
`room.rez.money/{hotelSlug}/{roomId}`

## Unique Features (Not in Other Systems)

```
ROOM QR SPECIAL FEATURES:
├── Token-Based Auto-Login
│   └── JWT token from StayOwn, no username/password
├── StayOwn Integration
│   └── Booking → Room Assignment → QR Generation → Guest Notified
├── Hotel Folio Billing
│   └── All charges sync to hotel bill
├── Staff Dashboard (Hotel-Specific)
│   └── Kanban for housekeeping, maintenance, room service
├── IoT Room Control (Future)
│   └── Lights, AC, TV control via QR interface
└── Voice Assistant (Future)
    └── REZ Mind voice for room control
```

## Shared with REZ Ecosystem

```
REZ AUTH ──────► Token validation
REZ WALLET ────► Coins on purchases
REZ PAYMENT ───► Checkout payments
REZ MIND ──────► AI recommendations
REZ CHAT ──────► Staff chat
REZ KNOWLEDGE ─► Hotel/Room KB
```

---

## ROOM QR FEATURE ROADMAP

### PHASE 1: CORE EXPERIENCE (Months 1-2)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Personalized Welcome** | "Welcome back, [Name]" + stay purpose | Low | 🔴 |
| **Smart Upsell Bundles** | Romantic dinner, spa combo, late checkout | Medium | 🔴 |
| **Revenue Optimization** | Dynamic pricing, upsell nudges, smart combos | Medium | 🔴 |
| **Express Checkout 2.0** | One-click checkout, split billing, digital invoice | Medium | 🔴 |

### PHASE 2: STAFF INTELLIGENCE (Months 2-4)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Auto-Assignment** | Closest/least busy staff | High | 🔴 |
| **SLA Tracking** | Delay alerts, breach notifications | Medium | 🟠 |
| **Staff Performance** | Metrics per staff member | Medium | 🟠 |
| **Real-Time Dashboard** | Live request board | Medium | 🟠 |

### PHASE 3: STAYOWN SYNC (Months 4-6)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Pre-Arrival Preferences** | Guest sets preferences before arrival | Medium | 🟠 |
| **In-Stay Sync** | All requests sync to StayOwn | Medium | 🟠 |
| **Post-Stay Follow-Up** | Review collection, feedback | Low | 🟠 |
| **Multi-Property** | Chain hotel support | High | 🟡 |

### PHASE 4: ADVANCED (Months 6-9)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **IoT Integration** | Lights, AC, TV control | High | 🟡 |
| **Voice Assistant** | "REZ, dim the lights" | High | 🟡 |
| **Do Not Disturb** | Auto-notify housekeeping | Low | 🟡 |
| **Clean Room Toggle** | Guest-requested room cleaning | Low | 🟡 |

---

## ROOM QR TEAM STRUCTURE

```
ROOM QR TEAM (3-4 devs)
├── 1 Frontend (React/Next.js)
├── 1 Backend (Hotel OTA APIs)
├── 1 Mobile (StayOwn integration)
└── 1 QA
```

---

# SYSTEM 4: ADS QR

## What It Is
**INDIVIDUAL / STANDALONE** - Campaign/Advertising QR system

## URL
`adsqr.rez.money/c/{campaignSlug}`

## Unique Features (Not in Other Systems)

```
ADS QR SPECIAL FEATURES:
├── Campaign Creation Wizard
│   └── 1-click campaign, templates, budget
├── Attribution Tracking
│   └── Scan → Visit (GPS) → Purchase
├── GPS Verification
│   └── Verify physical presence at location
├── Dynamic QR
│   └── Change content without reprinting
├── Landing Page Templates
│   └── Video, Coupon, Contest, Lead Capture
├── Reward Types
│   └── REZ Coins, Brand Coins, Free Samples, Consultations
├── ROI Analytics
│   └── Revenue attribution per campaign
└── A/B Testing
    └── Test different landing pages
```

## Shared with REZ Ecosystem

```
REZ AUTH ──────► User login
REZ WALLET ────► Coin rewards
REZ PAYMENT ───► Coin purchase
REZ MIND ──────► Campaign optimization
REZ CHAT ──────► Support chat
```

---

## ADS QR FEATURE ROADMAP

### PHASE 1: SIMPLICITY + DISTRIBUTION (Months 1-2)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Self-Serve Wizard** | 1-click campaign, templates | Medium | 🔴 |
| **Festival Templates** | Diwali, Holi, Christmas | Low | 🔴 |
| **QR Templates** | Custom colors, logo, style | Medium | 🟠 |
| **Budget Controls** | Daily cap, pacing | Low | 🟠 |

### PHASE 2: DISTRIBUTION NETWORK (Months 2-4)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Print Shop Partner** | QR code printing network | High | 🔴 |
| **DOOH Integration** | Digital screen + QR | High | 🟠 |
| **Influencer QR** | Per-influencer tracking | Medium | 🟠 |
| **SMB Self-Print** | Download QR for self-printing | Low | 🟠 |

### PHASE 3: FRAUD + RETARGETING (Months 4-6)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Fraud Detection** | Fake scan, GPS spoofing detection | High | 🔴 |
| **Device Fingerprinting** | Track unique devices | Medium | 🔴 |
| **Retargeting Engine** | Push to non-purchasers | Medium | 🟠 |
| **CRM Integration** | Connect to merchant CRM | Medium | 🟡 |

### PHASE 4: ANALYTICS + OPTIMIZATION (Months 6-8)

| Feature | Description | Effort | Priority |
|---------|-------------|---------|----------|
| **Scan Heatmaps** | Physical location analytics | High | 🟠 |
| **Attribution AI** | Multi-touch, incrementality testing | High | 🟠 |
| **Campaign Optimizer** | AI suggestions for improvements | Medium | 🟡 |
| **Competitor Analysis** | Benchmark vs industry | Low | 🟡 |

---

## ADS QR TEAM STRUCTURE

```
ADS QR TEAM (3-4 devs)
├── 1 Frontend (React/Next.js)
├── 1 Backend (Attribution engine)
├── 1 Data (Analytics, fraud detection)
└── 1 QA
```

---

# SHARED SERVICES (ALL 4 SYSTEMS)

These are shared across ALL QR systems:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED SERVICES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  REZ AUTH ────────────────────────────────────► All systems     │
│  ├── OTP login                                                 │
│  ├── Biometric (fingerprint, face)                              │
│  ├── Social login (Google, Apple)                               │
│  └── Passwordless                                               │
│                                                                     │
│  REZ WALLET ────────────────────────────────► All systems       │
│  ├── Coin balance                                               │
│  ├── Transactions                                                │
│  ├── Instant settlement                                          │
│  └── Gift cards                                                 │
│                                                                     │
│  REZ PAYMENT ────────────────────────────────► All systems     │
│  ├── UPI, Card, Net Banking                                     │
│  ├── Razorpay integration                                       │
│  └── Sub-2s settlement                                          │
│                                                                     │
│  REZ MIND ────────────────────────────────► All systems       │
│  ├── Intent capture                                             │
│  ├── Recommendations                                            │
│  ├── Sentiment analysis                                         │
│  └── Cross-context learning                                     │
│                                                                     │
│  REZ CHAT ────────────────────────────────► All systems       │
│  ├── AI chat widget                                             │
│  ├── RAG knowledge base                                         │
│  └── Multi-language                                             │
│                                                                     │
│  REZ KNOWLEDGE BASE ───────────────────────► All systems       │
│  ├── Hotel/Room KB                                              │
│  ├── Restaurant/Menu KB                                         │
│  ├── Business/Services KB                                       │
│  └── Campaign/Ads KB                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

# IMPLEMENTATION TIMELINE

```
YEAR 1:

Q1 (Months 1-3)
├── REZ NOW: Restaurant Phase 1 (KDS, Table Mgmt)
├── ROOM QR: Core Experience
└── SHARED: Biometric auth, instant settlement

Q2 (Months 4-6)
├── REZ NOW: Merchant Tools (CRM, Offer Engine)
├── ROOM QR: Staff Intelligence + StayOwn Sync
├── ADS QR: Distribution Network
└── SHARED: Unified chat widget

Q3 (Months 7-9)
├── REZ NOW: AI Chatbot, Smart Reorder
├── ROOM QR: Advanced (IoT, Voice)
├── ADS QR: Fraud + Retargeting
└── SHARED: Cross-context recommendations

Q4 (Months 10-12)
├── REZ NOW: All business types (Retail, Salon)
├── REZ WEB MENU: Full features (inherited)
├── ROOM QR: Multi-property
└── ADS QR: Analytics + Optimization
```

---

# RESOURCE SUMMARY

| System | Team Size | Timeline |
|--------|----------|----------|
| **Rez Now** | 6-8 devs | 12 months |
| **Rez Web Menu** | 2-3 devs | 12 months (shares with Rez Now) |
| **Room QR** | 3-4 devs | 9 months |
| **Ads QR** | 3-4 devs | 8 months |
| **Shared Services** | 2-4 devs | Ongoing |

---

# SUCCESS METRICS

| System | Metric | Target (Year 1) |
|--------|--------|-----------------|
| **Rez Now** | Merchants onboarded | 500 |
| **Rez Now** | Transactions/month | 100,000 |
| **Rez Web Menu** | Restaurants | 200 (subset of Rez Now) |
| **Room QR** | Hotels | 50 |
| **Room QR** | Rooms with QR | 2,500 |
| **Ads QR** | Campaigns created | 200 |
| **Ads QR** | Total scans | 1,000,000 |
| **Shared** | Auth uptime | 99.9% |
| **Shared** | Payment success | 99.5% |

---

# SUMMARY TABLE

| System | Type | URL | Priority | Timeline |
|--------|------|-----|----------|----------|
| **Rez Now** | Individual | now.rez.money | #1 | 12 months |
| **Rez Web Menu** | Sub of Rez Now | web-menu.rez.money | #1 (shares) | 12 months |
| **Room QR** | Individual | room.rez.money | #2 | 9 months |
| **Ads QR** | Individual | adsqr.rez.money | #3 | 8 months |

---

*Document Generated: May 3, 2026*
