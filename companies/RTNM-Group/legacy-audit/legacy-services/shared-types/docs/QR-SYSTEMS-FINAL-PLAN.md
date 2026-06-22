# QR Systems - Final Complete Upgrade Plan

**Date:** May 3, 2026  
**Status:** FINAL - All 4 Systems Are Individual/Standalone

---

# SYSTEM RELATIONSHIPS

```
┌─────────────────────────────────────────────────────────────────┐
│                 REZ ECOSYSTEM                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │          REZ NOW                                            │      │
│   │          INDIVIDUAL / STANDALONE                            │      │
│   │          now.rez.money/{slug}                            │      │
│   │          Universal - ALL Business Types                    │      │
│   │                                                          │      │
│   │          INCLUDES:                                         │      │
│   │          • Restaurant (ordering, menu)                     │      │
│   │          • Retail (catalog, products)                     │      │
│   │          • Salon (services, appointments)                 │      │
│   │          • Hotel (room service)                          │      │
│   │          • Service professionals                         │      │
│   │          • Payment Kiosk                                 │      │
│   │          • Staff Dashboard                                │      │
│   │          • Merchant CRM                                   │      │
│   │          • Offer Automation                               │      │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │          REZ WEB MENU                                     │      │
│   │          INDIVIDUAL / STANDALONE                          │      │
│   │          web-menu.rez.money/{slug}                    │      │
│   │          Restaurant ONLY                                  │      │
│   │                                                          │      │
│   │          RESTAURANT-SPECIFIC FEATURES:                    │      │
│   │          • Full Menu + Ordering                           │      │
│   │          • Waiter Calling (Native)                       │      │
│   │          • Kitchen Chat (Native)                         │      │
│   │          • Table Ordering                                │      │
│   │          • Group Ordering                                │      │
│   │          • Split Bill by Item/Person                    │      │
│   │          • Table Management (Occupancy/Waitlist)         │      │
│   │          • Kitchen Display System (KDS)                  │      │
│   │          • AI Chat (REZ Mind)                            │      │
│   │          • Dietary Filters + Allergens                   │      │
│   │          • Nutritional Info                              │      │
│   │          • Weather Suggestions                           │      │
│   │          • Taste Profile + Recommendations              │      │
│   │          • Loyalty + Gamification                      │      │
│   │          • REZ Wallet (Coins)                           │      │
│   │          • REZ Payment (UPI/Card)                       │      │
│   │          • Order Tracking                               │      │
│   │          • WhatsApp Receipts                            │      │
│   │          • Analytics + Insights                         │      │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │          ROOM QR                                          │      │
│   │          INDIVIDUAL / STANDALONE                          │      │
│   │          room.rez.money/{hotel}/{room}                   │      │
│   │          Hotel ONLY                                       │      │
│   │                                                          │      │
│   │          HOTEL-SPECIFIC FEATURES:                         │      │
│   │          • Token-Based Auto-Login (JWT)                  │      │
│   │          • StayOwn Integration                           │      │
│   │          • Hotel Folio Billing                           │      │
│   │          • Room Service Menu                            │      │
│   │          • Housekeeping Requests                        │      │
│   │          • Spa Booking                                  │      │
│   │          • Laundry Service                              │      │
│   │          • Minibar Billing                              │      │
│   │          • Staff Dashboard (Kanban)                     │      │
│   │          • Real-Time Request Tracking                    │      │
│   │          • AI Recommendations                           │      │
│   │          • Express Checkout                             │      │
│   │          • Personalized Welcome                          │      │
│   │          • Smart Upsell Bundles                         │      │
│   │          • REZ Wallet (Coins)                           │      │
│   │          • REZ Payment                                  │      │
│   │          • Chat with Staff                              │      │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │          ADS QR                                           │      │
│   │          INDIVIDUAL / STANDALONE                          │      │
│   │          adsqr.rez.money/c/{campaign}                   │      │
│   │          Campaign/Advertising ONLY                        │      │
│   │                                                          │      │
│   │          CAMPAIGN-SPECIFIC FEATURES:                     │      │
│   │          • Campaign Creation Wizard                       │      │
│   │          • Landing Page Templates                        │      │
│   │          • Attribution Tracking (Scan→Visit→Purchase)     │      │
│   │          • GPS Verification                             │      │
│   │          • Dynamic QR (Change content anytime)          │      │
│   │          • Reward System                                │      │
│   │            • REZ Coins                                  │      │
│   │            • Brand Coins                                │      │
│   │            • Free Samples                               │      │
│   │            • Free Consultations                         │      │
│   │          • ROI Analytics                                │      │
│   │          • A/B Testing                                  │      │
│   │          • Fraud Prevention                            │      │
│   │          • Retargeting Engine                           │      │
│   │          • Physical Analytics (Heatmaps)                 │      │
│   │          • REZ Auth + Wallet Integration                │      │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

# SHARED SERVICES (All 4 Systems Use These)

```
┌─────────────────────────────────────────────────────────────────┐
│                  SHARED SERVICES                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                      │
│   REZ AUTH ─────────────────────────────────────────────────────►   │
│   • OTP Login                                                     │
│   • JWT Tokens                                                    │
│   • Multi-Device Sessions                                         │
│   • Biometric (Future)                                           │
│                                                                      │
│   REZ WALLET ────────────────────────────────────────────────────►   │
│   • Coin Balance                                                  │
│   • Transactions                                                  │
│   • Earn/Spend Coins                                              │
│   • Gift Cards (Future)                                           │
│                                                                      │
│   REZ PAYMENT ────────────────────────────────────────────────────►   │
│   • UPI, Card, Net Banking                                       │
│   • Razorpay Integration                                          │
│   • Instant Settlement (Future)                                    │
│                                                                      │
│   REZ MIND ───────────────────────────────────────────────────────►   │
│   • Intent Capture                                                │
│   • Recommendations                                              │
│   • Sentiment Analysis                                            │
│   • Predictive Analytics                                          │
│                                                                      │
│   REZ CHAT ───────────────────────────────────────────────────────►   │
│   • AI Chat Widget                                                │
│   • RAG Knowledge Base                                             │
│   • Multi-Language                                                │
│                                                                      │
│   REZ KNOWLEDGE BASE ────────────────────────────────────────────►   │
│   • Unified Context Router                                         │
│   • Restaurant KB                                                 │
│   • Hotel/Room KB                                                 │
│   • Campaign/Ads KB                                               │
│   • Business/Services KB                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

# SYSTEM 1: REZ NOW

## Overview
**INDIVIDUAL / STANDALONE** - Universal merchant platform for ALL business types

## URL
`now.rez.money/{slug}`

## Supported Business Types

| Type | Features |
|------|----------|
| Restaurant | Menu, ordering, cart, checkout |
| Retail | Catalog, variants, stock, pricing |
| Salon | Services, staff, appointments, packages |
| Hotel | Room service, checkout |
| Services | On-demand booking, quotes |
| Events | Tickets, scheduling |
| Transport | Booking, tracking |
| Healthcare | Appointments, medicine |
| Education | Courses, enrollment |

## Features

### CORE (Already Built)

| Feature | Status |
|---------|--------|
| Payment Kiosk (QR + live feed) | ✅ Built |
| Scan & Pay (UPI, Card, Wallet) | ✅ Built |
| Menu + Cart + Checkout | ✅ Built |
| Kitchen Chat | ✅ Built |
| Waiter Call | ✅ Built |
| Order Tracking | ✅ Built |
| REZ Coins (Earn on tx) | ✅ Built |
| REZ Wallet | ✅ Built |
| Staff Dashboard | ✅ Built |
| Offline Mode (IndexedDB) | ✅ Built |
| Multi-language (EN/HI) | ✅ Built |
| Analytics Dashboard | ✅ Built |

### PHASE 1: RESTAURANT (Months 1-3)

| Feature | Description | Priority |
|---------|-------------|----------|
| Kitchen Display System (KDS) | Real-time order queue, item status, timers | 🔴 HIGH |
| Table Management | Occupancy, waitlist, reservations | 🔴 HIGH |
| Group Ordering | Friends join same table, share items | 🟠 MED |
| Digital Menu Boards | TV display for menu/ads | 🟡 LOW |

### PHASE 2: MERCHANT TOOLS (Months 3-5)

| Feature | Description | Priority |
|---------|-------------|----------|
| Merchant CRM | Customer list, LTV, segmentation | 🔴 HIGH |
| Offer Automation | First visit, milestones, birthday, weather | 🔴 HIGH |
| WhatsApp Receipts | Auto-send after payment | 🟠 MED |
| Multi-location Support | Chain management | 🟠 MED |

### PHASE 3: AI + GROWTH (Months 5-7)

| Feature | Description | Priority |
|---------|-------------|----------|
| AI Chatbot (RAG) | Menu Q&A, order taking, recommendations | 🔴 HIGH |
| Smart Reorder | "Your usual?", one-tap reorder | 🟠 MED |
| Loyalty Gamification | Streaks, badges, progress | 🟡 LOW |
| Referral System | Share + earn coins | 🟡 LOW |

### PHASE 4: ALL TYPES (Months 7-9)

| Feature | Description | Priority |
|---------|-------------|----------|
| Retail Features | Variants, stock, bulk pricing | 🔴 HIGH |
| Salon Features | Staff scheduling, packages | 🔴 HIGH |
| Service Features | Quotes, on-demand | 🟠 MED |

### PHASE 5: PAYMENTS (Months 9-12)

| Feature | Description | Priority |
|---------|-------------|----------|
| Sub-2s Settlement | Instant payout | 🔴 HIGH |
| Gift Cards | Buy, send, redeem | 🟠 MED |
| Multi-currency | For tourism | 🟡 LOW |

---

# SYSTEM 2: REZ WEB MENU

## Overview
**INDIVIDUAL / STANDALONE** - Restaurant-only with full restaurant features

## URL
`web-menu.rez.money/{slug}`

## Restaurant-Specific Features

### CORE (Already Built)

| Feature | Description | Status |
|---------|-------------|--------|
| Full Menu Display | Categories, items, photos | ✅ Built |
| Item Customization | Size, extras, special requests | ✅ Built |
| Add to Cart | Real-time cart management | ✅ Built |
| Checkout Flow | Address, payment, confirmation | ✅ Built |
| **Waiter Calling** | Priority + reason selection | ✅ Built |
| **Kitchen Chat** | Real-time kitchen communication | ✅ Built |
| **Table Ordering** | Table-specific orders | ✅ Built |
| **Split Bill** | By item, by person | ✅ Built |
| Dietary Filters | Vegan, GF, Nut-Free, Jain | ✅ Built |
| Allergen Warnings | 8 types highlighted | ✅ Built |
| Nutritional Info | Calories, macros | ✅ Built |
| AI Chat (REZ Mind) | Menu Q&A, recommendations | ✅ Built |
| AI Recommendations | Taste + weather-based | ✅ Built |
| Weather Suggestions | Hot → cold drinks | ✅ Built |
| Taste Profile | Learns preferences | ✅ Built |
| REZ Wallet (Coins) | Pay with coins | ✅ Built |
| REZ Payment | UPI, Card | ✅ Built |
| Order Tracking | Real-time status | ✅ Built |
| Analytics | Views, orders, revenue | ✅ Built |

### PHASE 1: ADVANCED ORDERING (Months 1-2)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Group Ordering** | Friends join, share items, "split what I had" | 🔴 HIGH |
| **Table Management** | Occupancy view, waitlist | 🔴 HIGH |
| **Kitchen Display (KDS)** | Real-time order queue, timers | 🔴 HIGH |
| **Order History** | Past orders, reorder | 🟠 MED |

### PHASE 2: LOYALTY + GROWTH (Months 2-4)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Loyalty Program** | Visit streaks, milestones, badges | 🔴 HIGH |
| **"Your Usual?"** | Smart reorder suggestions | 🔴 HIGH |
| **One-Tap Reorder** | Previous order, one click | 🟠 MED |
| **WhatsApp Receipts** | Auto-send after payment | 🟠 MED |
| **Smart Upsells** | "Add fries for ₹50" | 🟠 MED |

### PHASE 3: AI CHATBOT (Months 4-6)

| Feature | Description | Priority |
|---------|-------------|----------|
| **RAG Chatbot** | "Is this vegan?", "What pairs with biryani?" | 🔴 HIGH |
| **Order Taking** | "Order my usual" | 🔴 HIGH |
| **Cross-Sell** | "Add garlic naan for ₹50" | 🟠 MED |
| **Dietary Advisor** | "I'm gluten-free, what can I eat?" | 🟠 MED |

### PHASE 4: ENGAGEMENT (Months 6-8)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Photo Reviews** | User-uploaded dish photos | 🟠 MED |
| **Chef's Picks** | AI-suggested highlights | 🟡 LOW |
| **Seasonal Menu** | Limited time items | 🟡 LOW |
| **Social Sharing** | Share order, refer friends | 🟡 LOW |

---

# SYSTEM 3: ROOM QR

## Overview
**INDIVIDUAL / STANDALONE** - Hotel room services system

## URL
`room.rez.money/{hotelSlug}/{roomId}`

## Hotel-Specific Features

### CORE (Already Built)

| Feature | Description | Status |
|---------|-------------|--------|
| **Token-Based Auto-Login** | JWT from StayOwn, no login | ✅ Built |
| **StayOwn Integration** | Booking → QR → Guest notified | ✅ Built |
| **Hotel Folio Billing** | Charges sync to bill | ✅ Built |
| Room Service Menu | Food, beverages | ✅ Built |
| Housekeeping | Towels, sheets, toiletries | ✅ Built |
| Spa Booking | Services, appointments | ✅ Built |
| Laundry Service | Pickup, delivery | ✅ Built |
| Minibar Billing | View, consume, auto-bill | ✅ Built |
| Chat with Staff | Real-time messaging | ✅ Built |
| Express Checkout | Bill review, pay, done | ✅ Built |
| Staff Dashboard | Kanban, assignment | ✅ Built |
| AI Recommendations | Based on stay | ✅ Built |
| REZ Wallet | Coins on purchases | ✅ Built |
| REZ Payment | UPI, Card | ✅ Built |

### PHASE 1: DELIGHT + REVENUE (Months 1-2)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Personalized Welcome** | "Welcome back, [Name]" | 🔴 HIGH |
| **Smart Bundles** | Romantic dinner, spa combo | 🔴 HIGH |
| **Revenue Optimization** | Dynamic pricing, upsell nudges | 🔴 HIGH |
| **Express Checkout 2.0** | One-click, split billing | 🔴 HIGH |

### PHASE 2: STAFF INTELLIGENCE (Months 2-4)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Auto-Assignment** | Closest/least busy staff | 🔴 HIGH |
| **SLA Tracking** | Delay alerts, breaches | 🔴 HIGH |
| **Staff Performance** | Metrics per staff | 🟠 MED |
| **Real-Time Dashboard** | Live request board | 🟠 MED |

### PHASE 3: STAYOWN SYNC (Months 4-6)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Pre-Arrival** | Guest sets preferences | 🟠 MED |
| **In-Stay Sync** | All requests sync | 🟠 MED |
| **Post-Stay** | Review collection | 🟡 LOW |
| **Multi-Property** | Chain hotel support | 🟡 LOW |

### PHASE 4: ADVANCED (Months 6-9)

| Feature | Description | Priority |
|---------|-------------|----------|
| **IoT Control** | Lights, AC via QR | 🟠 MED |
| **Voice Assistant** | "REZ, dim lights" | 🟠 MED |
| **DND Toggle** | Auto-notify housekeeping | 🟡 LOW |
| **Clean Room** | Guest-requested | 🟡 LOW |

---

# SYSTEM 4: ADS QR

## Overview
**INDIVIDUAL / STANDALONE** - Campaign/advertising QR system

## URL
`adsqr.rez.money/c/{campaignSlug}`

## Campaign-Specific Features

### CORE (Already Built)

| Feature | Description | Status |
|---------|-------------|--------|
| Campaign Creation Wizard | 1-click, templates | ✅ Built |
| Landing Page Templates | Video, Coupon, Contest, Lead Capture | ✅ Built |
| QR Generation | Single + bulk | ✅ Built |
| Attribution Tracking | Scan → Visit → Purchase | ✅ Built |
| GPS Verification | Verify physical presence | ✅ Built |
| Dynamic QR | Change content without reprint | ✅ Built |
| Reward System | REZ Coins | ✅ Built |
| ROI Analytics | Revenue per campaign | ✅ Built |
| REZ Auth Integration | User login | ✅ Built |
| REZ Wallet Integration | Coin rewards | ✅ Built |

### PHASE 1: SIMPLICITY + DISTRIBUTION (Months 1-2)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Self-Serve Wizard** | 1-click campaign, templates | 🔴 HIGH |
| **Festival Templates** | Diwali, Holi, Christmas | 🔴 HIGH |
| **QR Customization** | Colors, logo, style | 🟠 MED |
| **Budget Controls** | Daily cap, pacing | 🟠 MED |

### PHASE 2: DISTRIBUTION (Months 2-4)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Print Shop Partner** | QR code printing network | 🔴 HIGH |
| **DOOH Integration** | Digital screens + QR | 🔴 HIGH |
| **Influencer QR** | Per-influencer tracking | 🟠 MED |
| **SMB Self-Print** | Download for self-printing | 🟠 MED |

### PHASE 3: FRAUD + RETARGETING (Months 4-6)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Fraud Detection** | Fake scan, GPS spoofing | 🔴 HIGH |
| **Device Fingerprinting** | Unique device tracking | 🔴 HIGH |
| **Retargeting Engine** | Push to non-purchasers | 🟠 MED |
| **CRM Integration** | Merchant CRM sync | 🟡 LOW |

### PHASE 4: BRAND COINS + SAMPLES (Months 6-8)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Brand Coins** | Create custom coins | 🔴 HIGH |
| **Free Samples** | Claim at store, pickup QR | 🔴 HIGH |
| **Free Consultations** | Book, calendar sync | 🟠 MED |
| **Redemption Catalog** | Redeem coins for rewards | 🟠 MED |

### PHASE 5: ANALYTICS (Months 8-10)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Scan Heatmaps** | Physical location analytics | 🟠 MED |
| **Attribution AI** | Multi-touch, incrementality | 🟠 MED |
| **Campaign Optimizer** | AI suggestions | 🟡 LOW |
| **Competitor Analysis** | Benchmark | 🟡 LOW |

---

# IMPLEMENTATION TIMELINE

```
YEAR 1:

Q1 (Months 1-3)
├── REZ NOW: Restaurant Phase 1 (KDS, Table Mgmt)
├── REZ WEB MENU: Advanced Ordering (Group, KDS)
├── ROOM QR: Delight + Revenue
└── ADS QR: Self-Serve Wizard + Distribution

Q2 (Months 4-6)
├── REZ NOW: Merchant Tools (CRM, Offer Engine)
├── REZ WEB MENU: Loyalty + Growth
├── ROOM QR: Staff Intelligence
└── ADS QR: Fraud Prevention

Q3 (Months 7-9)
├── REZ NOW: AI Chatbot
├── REZ WEB MENU: AI Chatbot
├── ROOM QR: StayOwn Sync
└── ADS QR: Brand Coins + Samples

Q4 (Months 10-12)
├── REZ NOW: All Business Types
├── REZ WEB MENU: Engagement
├── ROOM QR: Advanced (IoT)
└── ADS QR: Analytics
```

---

# RESOURCE REQUIREMENTS

| System | Team Size | Timeline |
|--------|-----------|---------|
| **Rez Now** | 6-8 devs | 12 months |
| **Rez Web Menu** | 4-5 devs | 12 months |
| **Room QR** | 3-4 devs | 9 months |
| **Ads QR** | 3-4 devs | 10 months |
| **Shared Services** | 2-3 devs | Ongoing |

---

# SUCCESS METRICS (Year 1)

| System | Metric | Target |
|--------|--------|--------|
| **Rez Now** | Merchants onboarded | 500 |
| **Rez Now** | Transactions/month | 100,000 |
| **Rez Web Menu** | Restaurants | 300 |
| **Rez Web Menu** | Orders via QR | 50,000/month |
| **Room QR** | Hotels | 50 |
| **Room QR** | Rooms with QR | 2,500 |
| **Ads QR** | Campaigns created | 200 |
| **Ads QR** | Total scans | 1,000,000 |

---

# SUMMARY

| System | Type | URL | Priority | Timeline |
|--------|------|-----|----------|----------|
| **Rez Now** | Individual | now.rez.money | #1 | 12 months |
| **Rez Web Menu** | Individual | web-menu.rez.money | #1 | 12 months |
| **Room QR** | Individual | room.rez.money | #2 | 9 months |
| **Ads QR** | Individual | adsqr.rez.money | #3 | 10 months |

All 4 are **equal, standalone systems** that share common services (Auth, Wallet, Payment, Mind, Chat).

---

*Document Generated: May 3, 2026*
