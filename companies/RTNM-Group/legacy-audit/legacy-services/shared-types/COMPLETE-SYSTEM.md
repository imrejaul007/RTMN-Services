# ReZ Advertising Ecosystem - Complete System Documentation

**Last Updated:** 2026-05-02

---

# TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Products](#products)
3. [System Architecture](#system-architecture)
4. [ReZ Mind](#rez-mind)
5. [AdOS - Advertising Operating System](#ados---advertising-operating-system)
6. [DOOH Network](#dooh-network)
7. [AdBazaar](#adbazaar)
8. [AdsQr](#adsqr)
9. [Integration](#integration)
10. [Revenue Model](#revenue-model)
11. [Technical Stack](#technical-stack)
12. [Build Order](#build-order)

---

# EXECUTIVE SUMMARY

## What We're Building

**"India's real-world advertising infrastructure powered by commerce data."**

We're building a system that connects offline advertising to online/offline transactions.

---

## The Big Picture

```
Traditional World:
- Google → online ads (clicks)
- Meta → social ads (attention)
- Neither → real purchases

Our World:
- Offline ads → QR scans → Visits → Purchases → Revenue
```

---

## The Core Loop

```
More ads → More users → More data → Better targeting → Better ROI → More ads
```

---

# PRODUCTS

## 3 Core Products

| Product | Purpose | Status |
|---------|----------|---------|
| **AdBazaar** | Marketplace for ad inventory | Live |
| **AdsQr** | Quick QR campaigns | MVP Ready |
| **AdOS** | Intelligence + DOOH | Built |

---

# SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REZ ECOSYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    ReZ Mind                              │   │
│   │              (Intelligence Layer)                        │   │
│   │                                                          │   │
│   │   • User behavior signals                               │   │
│   │   • Location patterns                                  │   │
│   │   • Purchase intent                                   │   │
│   │   • Category preferences                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                       AdOS                                │   │
│   │                  (Decision Engine)                        │   │
│   │                                                          │   │
│   │   ├── Campaign Intelligence                            │   │
│   │   │    ├── ROI Engine                                │   │
│   │   │    ├── Scoring Engine                            │   │
│   │   │    ├── Allocation Engine                         │   │
│   │   │    └── Guardrails                               │   │
│   │   └── DOOH Network                                  │   │
│   │        ├── Screen Manager                            │   │
│   │        ├── Delivery Engine                           │   │
│   │        └── Playlist Generator                        │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│         ┌───────────────────┼───────────────────┐                  │
│         │                   │                   │                    │
│         ▼                   ▼                   ▼                    │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │  AdBazaar  │    │   AdsQr    │    │    DOOH    │        │
│   │ Marketplace │    │ QR Campaigns│    │   Screens  │        │
│   │ + Bookings │    │ + Rewards  │    │ + Playlists│        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

# REZ MIND

## What It Is

ReZ Mind is the unified intelligence layer that processes user behavior and generates actionable signals.

## What It Knows

### User Data
- Search history
- Purchase patterns
- Location history
- App usage

### Location Data
- Hotspots
- Movement patterns
- Time-based density

### Category Data
- Food preferences
- Fitness users
- Premium vs budget shoppers

## What It Produces (Signals, NOT raw data)

```typescript
interface ContextSignal {
  location_cluster: string      // "IT workers", "families", "students"
  time_pattern: string           // "morning commute", "lunch hour", "evening"
  category_intent: string[]       // ["food", "fintech", "fitness"]
  spending_level: string         // "low", "medium", "high"
  density: string              // "sparse", "moderate", "dense"
}
```

### Example Signals

**Morning (8 AM - Office Area)**
```json
{
  "location_cluster": "IT workers",
  "time_pattern": "morning commute",
  "category_intent": ["coffee", "fintech", "quick_food"],
  "spending_level": "medium",
  "density": "dense"
}
```

**Evening (7 PM - Mall Area**
```json
{
  "location_cluster": "families",
  "time_pattern": "evening",
  "category_intent": ["dining", "shopping", "entertainment"],
  "spending_level": "high",
  "density": "moderate"
}
```

---

# ADOS - ADVERTISING OPERATING SYSTEM

## What It Is

AdOS is the brain that optimizes advertising decisions using ReZ Mind signals and attribution data.

## Two Parts

### 1. Campaign Intelligence
Optimizes budget allocation for ad campaigns.

### 2. DOOH Network
Delivers ads to physical screens.

---

## Campaign Intelligence Services

### 1. ROI Engine (`roi.service.ts`)

Calculates Return on Ad Spend with confidence scoring.

```typescript
interface ROIResult {
  roas: number           // Revenue / Cost
  cpp: number           // Cost per purchase
  cpv: number          // Cost per visit
  confidence: number    // 0-1 (data quality)
  estimate: {
    min: number
    max: number
  }
}
```

**Formula:**
```
ROAS = Revenue / Cost
Confidence = data_points / 200 (capped at 1.0)
```

**Fallback Logic:**
1. If real data exists → use it
2. Else → use category average
3. Else → use platform default

---

### 2. Scoring Engine (`scoring.service.ts`)

Scores listings using weighted factors.

```typescript
interface ScoringWeights {
  roas: 0.5,        // Primary metric
  confidence: 0.2,   // Data reliability
  volume: 0.2,       // Scale potential
  category_match: 0.1  // Targeting precision
}
```

**Score Formula:**
```
Score = (ROAS_score × 0.5) + (confidence × 0.2) + (volume × 0.2) + (match × 0.1)
```

---

### 3. Allocation Engine (`allocation.service.ts`)

Intelligently distributes budget across listings.

```typescript
interface BudgetAllocation {
  listing_id: string
  allocated_budget: number
  expected_visits: number
  expected_purchases: number
  expected_roas: number
  confidence: number
  warnings: AllocationWarning[]
}
```

**Allocation Method:**
- Score each listing
- Calculate weight ratio
- Distribute budget proportionally
- Enforce guardrails

---

### 4. Guardrails Engine (`guardrails.service.ts`)

Enforces safety limits and prevents abuse.

```typescript
interface Guardrails {
  min_budget_per_listing: 500      // ₹500 minimum
  max_cost_per_visit: 50            // ₹50 cap
  min_roas_threshold: 0.5           // 50% minimum
  max_scan_rate_per_hour: 100        // Fraud prevention
}
```

**Checks:**
- Budget limits
- Performance thresholds
- Fraud patterns
- Data quality

---

## Guardrail Examples

| Rule | Value | Purpose |
|------|-------|---------|
| Min budget/listing | ₹500 | Prevent tiny campaigns |
| Max CPV | ₹50 | Control costs |
| Min ROAS | 0.5x | Ensure profitability |
| Fraud detection | 100/hr | Prevent fake scans |

---

# DOOH NETWORK

## What Is DOOH?

**D**igital **O**ut **o**f **H**ome = Screens in physical locations showing ads.

## Screen Types

| Type | Examples | Audience | Best For |
|------|----------|----------|----------|
| `cab_tablet` | Ola, Uber, ReZ | Office workers | Fintech, Food |
| `restaurant_tv` | Cafe, QSR | Foodies | Food delivery |
| `mall_kiosk` | Mall directories | Shoppers | Retail, Fashion |
| `gym_screen` | Fitness centers | Fitness enthusiasts | Health, Supplements |
| `salon_display` | Salons, Spas | Premium users | Beauty, Wellness |
| `hotel_lobby` | Hotel displays | Travelers | Travel, Tourism |
| `airport_display` | Terminals | Business travelers | Premium brands |
| `office_lobby` | Office receptions | Office workers | B2B services |
| `bus_shelter` | Street displays | Commuters | Local businesses |
| `billboard_digital` | LED billboards | General | Brand awareness |

---

## DOOH Services

### 1. Screen Manager (`screen.service.ts`)

Manages screen network.

```typescript
interface Screen {
  id: string
  type: ScreenType
  location: {
    city: string
    area: string
    lat: number
    lng: number
  }
  audience_profile: AudienceProfile
  cpm: number  // Cost per 1000 impressions
  status: 'active' | 'offline' | 'maintenance'
}
```

### 2. Delivery Engine (`delivery.service.ts`)

Decides which ads to show on which screens.

```typescript
interface DeliveryRequest {
  screen_id: string
  available_slots: number
  context: DeliveryContext  // From ReZ Mind
}

interface DeliveryResponse {
  screen_id: string
  slots: DeliverySlot[]
}
```

**Decision Factors:**
- Audience fit (40%)
- Time targeting (20%)
- Context signals (20%)
- Budget urgency (20%)

### 3. Playlist Generator (`playlist.service.ts`)

Creates optimized playlists for screens.

```typescript
interface Playlist {
  id: string
  screen_id: string
  date: Date
  slots: PlaylistSlot[]
  total_duration: number
}
```

---

## Context Targeting by Screen Type

### Cab Screen

| Time | Context | Ad Category |
|------|----------|-------------|
| 8-10 AM | Morning commute | Coffee, Fintech, Quick Bites |
| 12-2 PM | Lunch | Food Delivery, Restaurants |
| 5-7 PM | Evening commute | Entertainment, Shopping |
| 8-10 PM | Home time | Groceries, OTT |

### Mall Screen

| Time | Context | Ad Category |
|------|----------|-------------|
| Morning | Early shoppers | Breakfast, Coffee |
| Afternoon | Family shoppers | Kids, Apparel |
| Evening | Post-shopping | Restaurants, Movies |
| Weekend | Crowds | Entertainment, Food |

### Gym Screen

| Time | Context | Ad Category |
|------|----------|-------------|
| Morning | Pre-workout | Supplements, Energy drinks |
| Evening | Post-workout | Protein, Recovery |
| Weekend | Leisure | Wellness, Spa |

---

# ADBAZAAR

## What Is It

**India's first closed-loop offline advertising marketplace.**

## Two-Sided Marketplace

### Vendors (Ad Space Owners)
Own physical advertising inventory.

| Feature | Description |
|---------|-------------|
| Listing Management | Create, edit, pause, delete |
| Bulk Upload | CSV import |
| Availability Calendar | Set dates/slots |
| Pricing Models | Fixed or quote-based |
| QR Code Generation | Auto per booking |
| Inquiry Handling | Receive/respond to buyers |
| Quote Sending | Custom quotes with validity |
| Proof Upload | Execution proof |
| Earnings Dashboard | Revenue & payouts |
| KYC Verification | Document submission |
| 2FA Security | Two-factor auth |

### Buyers (Brands/Advertisers)
Want to advertise on physical spaces.

| Feature | Description |
|---------|-------------|
| Browse Listings | Search & filter |
| Map View | Interactive map |
| Instant Booking | Direct booking |
| Inquiries | Quote requests |
| Cart | Multi-booking checkout |
| Campaigns | Group bookings |
| Payment | Razorpay checkout |
| Attribution | Scans → Visits → Purchases |

---

## Booking Flow

```
BUYER                          VENDOR
 │                              │
 │ Browse listings              │
 │─────── Instant Book ─────────▶│
 │                              │
 │ OR: Send Inquiry            │
 │─────── Inquiry ─────────────▶│
 │                              │── Review
 │                              │── Send Quote
 │◀─────── Quote ───────────────│
 │                              │
 │ Accept Quote                │
 │─────── Accept ─────────────▶│
 │                              │
 │ Payment (Razorpay)         │
 │────────────────────────────▶│
 │                              │
 │ QR Code Generated          │
 │                              │── Execute ad
 │                              │── Upload proof
 │◀─────── Review Proof ───────│
 │                              │
 │ Approve Proof              │
 │─────── Approve ──────────▶│
 │                              │
 │                              │── Payout
```

---

## Pricing Models

| Model | Description |
|-------|-------------|
| **Owner** | Vendor sets price, we take commission (10-20%) |
| **Platform** | We set price (AdsQr style) |
| **Hybrid** | Base price + performance layer |

---

## Commission Rates

| Category | Rate |
|----------|------|
| Outdoor OOH | 12% |
| Transit | 12% |
| Property | 12% |
| Local Business | 15% |
| Print Broadcast | 10% |
| Influencer | 20% |
| Digital | 18% |
| Unconventional | 15% |

---

## QR Attribution System

### Coin Rewards

| Action | Default | Configurable |
|--------|---------|--------------|
| Scan | 20 coins | Yes |
| Visit (GPS verified) | 100 coins | Yes |
| Purchase | 5% of amount | Yes |

### Anti-Gaming

- IP-based duplicate prevention (24h cooldown)
- Rate limiting via Redis
- Device fingerprinting
- Authenticated credits only

---

# ADSQR

## What Is It

**Self-serve QR campaign platform for quick advertising.**

## Ideal For

- Restaurants (table QR codes)
- Events (poster QR codes)
- Small businesses ( ₹500 to start)
- Testing campaigns quickly

---

## Features

### Campaign Management
- Create in 5 minutes
- Set rewards (scan/visit/purchase)
- Coin budget control
- Status management

### QR System
- Single QR generation
- Bulk generation (up to 50 at once)
- Download as PDF/HTML
- Location tagging

### Attribution
- Scan events tracked
- Visit events (GPS verified)
- Purchase events
- Full funnel view

---

## Landing Page Templates

### 1. Bold
Dark gradient, large text, eye-catching

### 2. Minimal
Clean white, card-based, professional

### 3. Image First
Large banner, overlay, modern

---

# INTEGRATION

## Data Flow

```
ReZ Mind
   │
   ▼
AdOS (signals)
   │
   ├──► AdBazaar (campaigns)
   ├──► AdsQr (quick campaigns)
   └──► DOOH (screens)
   │
   ▼
Attribution (tracking)
   │
   ▼
ReZ Mind (learns)
```

## Environment Variables Needed

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# REZ Services
REZ_WALLET_API=https://wallet.rezapp.com/api
REZ_AUTH_SERVICE_URL=https://auth.rezapp.com
REZ_MARKETING_SERVICE_URL=https://marketing.rezapp.com

# Payment
RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx

# Notifications
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
RESEND_API_KEY=xxx
```

---

# REVENUE MODEL

## Multi-Layer Revenue

### 1. Marketplace Commission
| Model | Rate |
|-------|------|
| Owner pricing | 10-20% per booking |
| Hybrid pricing | Base + performance |

### 2. Platform Margin
| Item | Margin |
|------|--------|
| Coin markup | 5-15% |
| Scan pricing | ₹0.50-2 per scan |

### 3. Performance Fees
| Metric | Rate |
|--------|-------|
| Cost per visit | ₹10-30 |
| Cost per purchase | ₹50-200 |

### 4. DOOH Revenue
| Type | Rate |
|------|------|
| CPM | ₹10-50 per 1000 impressions |
| Slot pricing | ₹100-500 per 10-sec slot |
| Screen owner share | 60% |
| Platform share | 40% |

### 5. Future Revenue
- AdOS SaaS (premium analytics)
- Featured listings
- Dynamic pricing

---

# TECHNICAL STACK

## Frontend
- **Framework:** Next.js 16 (React)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel

## Backend
- **Runtime:** Node.js
- **APIs:** Next.js API routes
- **Cron:** Vercel Cron Jobs

## Database
- **Primary:** Supabase (PostgreSQL)
- **Cache:** Upstash Redis
- **Files:** Supabase Storage

## Services
- **Payments:** Razorpay
- **Auth:** Supabase Auth + REZ Auth
- **Email:** Resend
- **SMS:** Twilio
- **Push:** OneSignal
- **Maps:** Google Maps API

## Intelligence
- **ReZ Mind:** Behavior signals
- **AdOS:** Decision engine
- **Attribution:** Event tracking

---

# BUILD ORDER

## Phase 1: Foundation ✅ (Done)

- [x] AdBazaar core
- [x] AdsQr MVP
- [x] Attribution system
- [x] AdOS intelligence
- [x] DOOH network

## Phase 2: Intelligence (Next)

- [ ] Connect ReZ Mind signals
- [ ] Real-time optimization
- [ ] ML models (after data)
- [ ] Dashboard UI

## Phase 3: Scale

- [ ] Screen OS app
- [ ] DOOH partnerships
- [ ] Performance ads

---

# POSITIONING

## What We Are

**Not just:**
- ❌ QR platform
- ❌ Marketplace
- ❌ Ad network

**We are:**
- ✅ "India's real-world advertising infrastructure"

## The One-Liner

> **"Run ads anywhere. Track real revenue."**

---

# KEY METRICS TO TRACK

## Acquisition
| Metric | Target |
|--------|--------|
| Campaigns launched | 50 (MVP) |
| Active merchants | 100 |
| Monthly scans | 10,000 |

## Attribution
| Metric | Target |
|--------|--------|
| Attribution accuracy | 80%+ |
| Scan to visit rate | 30%+ |
| Visit to purchase | 15%+ |

## Revenue
| Metric | Target |
|--------|--------|
| Cost per purchase | < ₹50 |
| Merchant ROI | 3x+ |
| Platform margin | 15%+ |

---

# NEXT STEPS

1. **Connect Supabase** to AdsQr
2. **Deploy AdBazaar** with fixes
3. **Integrate ReZ Mind** signals
4. **Build dashboard** for AdOS
5. **Deploy Screen OS** to test screens
6. **Launch pilot** with 10 merchants

---

# CONTACT

For questions about this system, refer to individual module documentation:
- [AdBazaar README](adBazaar/README.md)
- [AdsQr README](adsqr/README.md)
- [AdOS README](ados/README.md)
- [AdBazaar Features](adBazaar/FEATURES.md)
- [AdBazaar Fixes](adBazaar/FIXES-REQUIRED.md)
