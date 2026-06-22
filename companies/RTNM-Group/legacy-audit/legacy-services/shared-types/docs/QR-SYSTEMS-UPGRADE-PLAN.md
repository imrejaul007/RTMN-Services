# QR Systems Upgrade Plan - Complete Architecture

**Date:** May 3, 2026  
**Status:** Post-Audit Correction

---

## THE CORRECT UNDERSTANDING

### How All 4 QR Systems Relate

```
┌─────────────────────────────────────────────────────────────────┐
│                    REZ ECOSYSTEM                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    REZ NOW                                    │ │
│  │         Universal Merchant Platform                          │ │
│  │   (now.rez.money/{slug})                                    │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────┐     │ │
│  │  │           REZ WEB MENU                                │     │ │
│  │  │   (Restaurant Module - Built INTO REZ Now)          │     │ │
│  │  │   OR Standalone: web-menu.rez.money/{slug}          │     │ │
│  │  │                                                       │     │ │
│  │  │   CAN operate independently with SAME features:       │     │ │
│  │  │   • Menu display                                       │     │ │
│  │  │   • Ordering & Cart                                    │     │ │
│  │  │   • AI Chat                                           │     │ │
│  │  │   • Waiter Call                                       │     │ │
│  │  │   • Kitchen Chat                                       │     │ │
│  │  │   • Split Bill                                        │     │ │
│  │  │   • REZ Wallet (Coins)                                │     │ │
│  │  │   • Payment (UPI/Card)                                 │     │ │
│  │  │   • Analytics                                          │     │ │
│  │  │   • REZ Mind (Recommendations)                        │     │ │
│  │  │   • REZ Chat (Support)                                 │     │ │
│  │  └─────────────────────────────────────────────────────┘     │ │
│  │                                                               │ │
│  │  ALSO INCLUDES (Non-Restaurant):                           │ │
│  │  • Retail catalog                                           │ │
│  │  • Salon/Spa services                                      │ │
│  │  • Appointments                                            │ │
│  │  • Payment Kiosk                                          │ │
│  │  • Staff Dashboard                                         │ │
│  │  • Merchant CRM                                            │ │
│  │  • Offer Automation                                        │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    ROOM QR                                     │ │
│  │           Hotel Room Services                                  │ │
│  │   (room.rez.money/{hotel}/{room})                            │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │  UNIQUE FEATURES:                                            │ │
│  │  • Token-based auto-login (JWT)                              │ │
│  │  • StayOwn integration (booking → QR)                         │ │
│  │  • Hotel folio billing                                        │ │
│  │  • Housekeeping, Spa, Laundry, Minibar                       │ │
│  │  • Staff dashboard (Kanban)                                   │ │
│  │  • Real-time requests                                        │ │
│  │  • Checkout sync to StayOwn                                  │ │
│  │                                                               │ │
│  │  SHARED WITH REZ NOW:                                       │ │
│  │  • AI Chat (REZ Mind)                                       │ │
│  │  • REZ Wallet (Coins)                                       │ │
│  │  • REZ Payment                                              │ │
│  │  • REZ Auth                                                 │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    ADS QR                                     │ │
│  │           Campaign/Advertising QR                             │ │
│  │   (adsqr.rez.money/c/{campaign})                            │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │  UNIQUE FEATURES:                                            │ │
│  │  • Campaign creation wizard                                  │ │
│  │  • Attribution tracking (Scan → Visit → Purchase)              │ │
│  │  • GPS verification                                          │ │
│  │  • Rewards (Coins, Brand Coins, Samples, Consultations)        │ │
│  │  • Landing page templates (Video, Coupon, Contest)           │ │
│  │  • Dynamic QR (change content without reprint)                 │ │
│  │  • ROI analytics                                             │ │
│  │                                                               │ │
│  │  SHARED WITH REZ NOW:                                       │ │
│  │  • REZ Wallet (Coins)                                       │ │
│  │  • REZ Auth                                                 │ │
│  │  • REZ Payment (for coin purchase)                           │ │
│  │  • REZ Mind (campaign optimization)                           │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## KEY RELATIONSHIPS

| Question | Answer |
|----------|--------|
| Is REZ Web Menu same as REZ Now Menu? | **YES** - Same code, same features |
| Can REZ Web Menu work alone? | **YES** - Standalone URL |
| Is Room QR part of REZ Now? | **NO** - Separate vertical, shares services |
| Is Ads QR part of REZ Now? | **NO** - Separate vertical, shares services |
| What do all share? | REZ Auth, REZ Wallet, REZ Mind, REZ Chat |

---

# UPGRADE PLAN FOR ALL 4 QR SYSTEMS

---

## 1. REZ NOW + REZ WEB MENU

### Both Systems Share These Restaurant Features

| Feature | REZ Now | REZ Web Menu | Status |
|--------|---------|--------------|--------|
| **Menu Display** | ✓ | ✓ | Built |
| **Category Navigation** | ✓ | ✓ | Built |
| **Item Customization** | ✓ | ✓ | Built |
| **Add to Cart** | ✓ | ✓ | Built |
| **AI Chat** | ✓ | ✓ | Built |
| **Waiter Call** | ✓ | ✓ | Built |
| **Kitchen Chat** | ✓ | ✓ | Built |
| **Split Bill** | ✓ | ✓ | Built |
| **REZ Wallet/Coins** | ✓ | ✓ | Built |
| **Payment (UPI/Card)** | ✓ | ✓ | Built |
| **Order Tracking** | ✓ | ✓ | Built |
| **REZ Mind (AI Recs)** | ✓ | ✓ | Built |
| **REZ Chat (Support)** | ✓ | ✓ | Built |
| **Dietary Filters** | ✓ | ✓ | Built |
| **Nutritional Info** | ✓ | ✓ | Built |
| **Allergen Warnings** | ✓ | ✓ | Built |
| **Weather Suggestions** | ✓ | ✓ | Built |
| **Taste Profile** | ✓ | ✓ | Built |

### What's Different

| Feature | REZ Now | REZ Web Menu |
|--------|---------|--------------|
| **URL** | now.rez.money/{slug} | web-menu.rez.money/{slug} |
| **Business Types** | Restaurant, Retail, Salon, Hotel, etc. | Restaurant ONLY |
| **Payment Kiosk** | ✓ (for all types) | ✗ |
| **Staff Dashboard** | ✓ (unified) | ✗ |
| **Merchant CRM** | ✓ (unified) | ✗ |
| **Offer Automation** | ✓ (unified) | ✗ |
| **Appointments** | ✓ (all types) | ✗ |

### Upgrade Plan for REZ Now + REZ Web Menu

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: COMPLETE RESTAURANT FEATURES (Weeks 1-4)                │
├─────────────────────────────────────────────────────────────────┤
│ │
│ [x] Already Built:                                               │
│ • Menu display, cart, checkout                                   │
│ • AI Chat (REZ Mind)                                            │
│ • Waiter call, kitchen chat                                     │
│ • Split bill, dietary filters                                   │
│ • REZ Wallet, payment                                          │
│                                                               │
│ [ ] ADD: Kitchen Display System (KDS)                            │
│     • Real-time order queue                                     │
│     • Item status updates (received → preparing → ready)         │
│     • Printer integration (ESC/POS)                              │
│     • Timer tracking                                           │
│                                                               │
│ [ ] ADD: Table Management                                        │
│     • Occupancy tracking                                        │
│     • Waitlist system                                          │
│     • Reservation sync                                          │
│                                                               │
│ [ ] ADD: Group Ordering                                          │
│     • Friends join same table                                  │
│     • Share items across carts                                 │
│     • "Split what I had" feature                              │
│                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: MERCHANT CRM + OFFER ENGINE (Weeks 5-8)               │
├─────────────────────────────────────────────────────────────────┤
│ │
│ [ ] ADD: Merchant CRM                                           │
│     • Customer list with LTV                                   │
│     • Segmentation (new, repeat, at-risk, VIP)                   │
│     • Visit frequency tracking                                  │
│     • Favorite items per customer                              │
│                                                               │
│ [ ] ADD: Offer Automation Engine                                │
│     • First visit reward                                      │
│     • 5th/10th/15th visit milestones                          │
│     • Birthday campaigns                                       │
│     • Dormant user reactivation (14 days)                       │
│     • Happy hour automation                                    │
│     • Weather-based offers                                     │
│                                                               │
│ [ ] ADD: WhatsApp Receipts                                      │
│     • Auto-send after payment                                 │
│     • Order summary + QR                                      │
│     • Reorder link                                             │
│                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: AI + GROWTH (Weeks 9-12)                              │
├─────────────────────────────────────────────────────────────────┤
│ │
│ [ ] ADD: AI Chatbot (RAG-powered)                              │
│     • Menu Q&A ("Is this vegan?")                             │
│     • Order taking ("Order my usual")                          │
│     • Recommendations ("What goes with Biryani?")               │
│     • Cross-sell ("Add garlic naan for ₹50")                   │
│                                                               │
│ [ ] ADD: Smart Reorder                                         │
│     • "Your usual?" prompt                                    │
│     • One-tap reorder                                          │
│     • Subscription/recurring orders                             │
│                                                               │
│ [ ] ADD: Loyalty Gamification                                  │
│     • Visit streaks                                            │
│     • Unlock badges                                          │
│     • Progress bars                                            │
│     • Unlock rewards at milestones                             │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. ROOM QR (Hotel)

### What's Already Built

| Feature | Status |
|---------|--------|
| **Token-based Auto-Login** | Built |
| **Room Service Menu** | Built |
| **Housekeeping Requests** | Built |
| **Spa Booking** | Built |
| **Laundry Service** | Built |
| **Minibar Billing** | Built |
| **Chat with Staff** | Built |
| **Express Checkout** | Built |
| **Staff Dashboard (Kanban)** | Built |
| **StayOwn Integration** | Built |
| **AI Recommendations** | Built |
| **REZ Wallet/Coins** | Built |
| **REZ Auth** | Built |

### Upgrade Plan for Room QR

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: DELIGHT + REVENUE (Weeks 1-4)                          │
├─────────────────────────────────────────────────────────────────┤
│ │
│ [ ] ADD: Personalized Welcome                                  │
│     • "Welcome back, [Name]"                                   │
│     • Stay purpose (business/pleasure)                         │
│     • Previous stay preferences                                │
│                                                               │
│ [ ] ADD: Smart Upsell Bundles                                  │
│     • Romantic dinner package                                  │
│     • Spa combo (massage + facial)                             │
│     • Late checkout + breakfast                                 │
│     • Airport transfer + lounge access                          │
│                                                               │
│ [ ] ADD: Revenue Optimization                                  │
│     • Dynamic pricing (peak hours)                            │
│     • Upsell nudges ("Add breakfast ₹199")                    │
│     • Smart combos                                             │
│                                                               │
│ [ ] ADD: Express Checkout 2.0                                   │
│     • One-click checkout                                       │
│     • Split billing (family/friends)                           │
│     • Digital invoice breakdown                                │
│     • Auto-post to StayOwn folio                              │
│                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: STAFF INTELLIGENCE (Weeks 5-8)                        │
├─────────────────────────────────────────────────────────────────┤
│ │
│ [ ] ADD: Auto-Assignment                                       │
│     • Closest staff priority                                  │
│     • Least busy staff                                        │
│     • Skill matching                                          │
│                                                               │
│ [ ] ADD: SLA Tracking                                          │
│     • Delay alerts                                           │
│     • SLA breach notifications                                │
│     • Staff performance metrics                               │
│                                                               │
│ [ ] ADD: IoT Integration (Future)                              │
│     • Smart room control (lights, AC)                        │
│     • Voice assistant (REZ Mind voice)                        │
│     • "Do Not Disturb" auto-notify                          │
│     • "Clean Room" toggle                                    │
│                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: STAYOWN SYNC (Weeks 9-12)                             │
├─────────────────────────────────────────────────────────────────┤
│ │
│ [ ] ADD: Full StayOwn Integration                              │
│     • Pre-arrival preferences                                 │
│     • In-stay requests sync                                   │
│     • Post-stay follow-up                                    │
│     • Review collection                                        │
│                                                               │
│ [ ] ADD: Multi-Property Support                               │
│     • Chain hotel management                                  │
│     • Cross-property loyalty                                  │
│     • Centralized dashboard                                   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. ADS QR (Campaign)

### What's Already Built

| Feature | Status |
|---------|--------|
| **Campaign Creation** | Built |
| **QR Generation** | Built |
| **Reward System (Coins)** | Built |
| **Attribution Tracking** | Built |
| **Landing Page Templates** | Built |
| **REZ Wallet Integration** | Built |
| **REZ Auth Integration** | Built |

### Upgrade Plan for Ads QR

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: SIMPLICITY + DISTRIBUTION (Weeks 1-4)                  │
├─────────────────────────────────────────────────────────────────┤
│ │
│ [ ] ADD: Self-Serve Campaign Wizard                             │
│     • 1-click campaign creation                                │
│     • Templates (Festival, Discount, New Launch)              │
│     • Budget slider                                           │
│     • Location picker                                         │
│                                                               │
│ [ ] ADD: QR Distribution Network                               │
│     • Partner with print shops                               │
│     • DOOH integration (digital screens)                      │
│     • Influencer QR campaigns                                 │
│     • SMB self-print portal                                   │
│                                                               │
│ [ ] ADD: Brand Coin System                                     │
│     • Create brand-specific coins                            │
│     • Redemption catalog                                      │
│     • Brand dashboard                                          │
│                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: FRAUD + RETARGETING (Weeks 5-8)                        │
├─────────────────────────────────────────────────────────────────┤
│ │
│ [ ] ADD: Fraud Prevention                                      │
│     • Fake scan detection                                     │
│     • GPS spoofing protection                                  │
│     • Device fingerprinting                                    │
│     • Abuse limits (max scans/day)                            │
│                                                               │
│ [ ] ADD: Retargeting System                                   │
│     • Push notifications (scan, no purchase)                 │
│     • Follow-up campaigns                                    │
│     • CRM integration                                         │
│     • "Visit again" offers                                    │
│                                                               │
│ [ ] ADD: Attribution Enhancement                              │
│     • Multi-touch attribution                                │
│     • View-through conversion                                 │
│     • Incrementality testing                                 │
│                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: ANALYTICS + OPTIMIZATION (Weeks 9-12)                  │
├─────────────────────────────────────────────────────────────────┤
│ │
│ [ ] ADD: Physical Analytics                                    │
│     • Scan heatmaps                                          │
│     • Dwell time tracking                                    │
│     • Foot traffic patterns                                   │
│                                                               │
│ [ ] ADD: Campaign Optimization                                 │
│     • AI-powered suggestions                                  │
│     • A/B testing for landing pages                          │
│     • Budget optimization                                     │
│                                                               │
│ [ ] ADD: Reporting Dashboard                                  │
│     • Real-time metrics                                      │
│     • ROI calculator                                          │
│     • Export to PDF/CSV                                       │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. SHARED SERVICES (All QR Systems)

These are shared across all 4 QR systems:

```
┌─────────────────────────────────────────────────────────────────┐
│ SHARED SERVICES UPGRADE PLAN                                    │
├─────────────────────────────────────────────────────────────────┤
│ │
│ REZ AUTH (Authentication)                                       │
│ ├── Multi-device sessions                                      │
│ ├── Biometric auth (fingerprint, face)                         │
│ ├── Social login (Google, Apple)                               │
│ └── Passwordless OTP                                           │
│ │
│ REZ WALLET (Payments & Coins)                                  │
│ ├── Instant settlement (Sub-2s)                                │
│ ├── Gift cards                                                 │
│ ├── Merchant-to-merchant transfers                              │
│ └── Cross-brand coin pooling                                   │
│ │
│ REZ MIND (AI & Recommendations)                                │
│ ├── Unified intent graph across all QR types                  │
│ ├── Cross-context recommendations                              │
│ ├── Sentiment analysis from feedback                           │
│ └── Predictive LTV scoring                                     │
│ │
│ REZ CHAT (Support & AI Chat)                                  │
│ ├── Unified chat widget (works on all QR types)               │
│ ├── RAG-powered knowledge base                                 │
│ ├── Multi-language support                                     │
│ └── Voice input (speech-to-text)                               │
│ │
│ REZ KNOWLEDGE BASE                                             │
│ ├── Hotel room service KB                                      │
│ ├── Restaurant menu KB                                         │
│ ├── Business services KB                                       │
│ ├── Campaign/ad KB                                             │
│ └── Unified context router                                     │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION TIMELINE

```
MONTH 1-3: REZ NOW + REZ WEB MENU (Restaurant)
├── Week 1-2: Kitchen Display System
├── Week 3-4: Table Management + Group Ordering
├── Week 5-6: Merchant CRM
├── Week 7-8: Offer Automation Engine
├── Week 9-10: AI Chatbot
├── Week 11-12: WhatsApp Receipts + Gamification

MONTH 4-6: ROOM QR (Hotel)
├── Week 1-2: Personalized Welcome + Bundles
├── Week 3-4: Revenue Optimization + Express Checkout 2.0
├── Week 5-6: Auto-Assignment + SLA Tracking
├── Week 7-8: StayOwn Full Sync
├── Week 9-10: IoT Integration (lights, AC)
├── Week 11-12: Multi-Property Support

MONTH 7-9: ADS QR (Campaign)
├── Week 1-2: Self-Serve Wizard + Templates
├── Week 3-4: QR Distribution Network
├── Week 5-6: Fraud Prevention + Retargeting
├── Week 7-8: Attribution Enhancement
├── Week 9-10: Physical Analytics
├── Week 11-12: AI Optimization + Reporting

ONGOING: SHARED SERVICES
├── Week 1: Biometric auth
├── Week 2-3: Instant settlement
├── Week 4-5: Unified chat widget
├── Week 6-7: Cross-context recommendations
└── Week 8+: Continuous improvement
```

---

## PRIORITY MATRIX

| System | Impact | Effort | Priority | Start |
|--------|--------|--------|---------|-------|
| **REZ Now (Restaurant)** | 🔴 Very High | 🟡 Medium | #1 | Now |
| **Room QR** | 🔴 Very High | 🟡 Medium | #2 | Month 4 |
| **Ads QR** | 🟠 High | 🟢 Low | #3 | Month 7 |
| **Shared Services** | 🔴 Critical | 🟡 Medium | Parallel | Always |

---

## RESOURCE REQUIREMENTS

| Phase | Team Size | Focus |
|-------|-----------|-------|
| REZ Now + Web Menu | 4-5 devs | Restaurant features |
| Room QR | 2-3 devs | Hotel vertical |
| Ads QR | 2-3 devs | Campaign features |
| Shared Services | 2 devs | Infrastructure |

---

## SUCCESS METRICS

| System | Metric | Target |
|--------|--------|--------|
| REZ Now | Restaurants onboarded | 100 in 3 months |
| REZ Now | Orders per restaurant/day | 50+ |
| Room QR | Hotels onboarded | 25 in 3 months |
| Room QR | Requests per hotel/day | 30+ |
| Ads QR | Campaigns created | 50 in 3 months |
| Ads QR | Scans per campaign | 500+ |
| Shared | Auth success rate | 99.9% |
| Shared | Payment success rate | 99.5% |

---

## SUMMARY

```
┌─────────────────────────────────────────────────────────────────┐
│                    UPGRADE PLAN SUMMARY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  #1: REZ NOW + REZ WEB MENU (Restaurant)                        │
│     Timeline: Months 1-3                                         │
│     Focus: KDS, Table Management, CRM, AI Chatbot                  │
│                                                                     │
│  #2: ROOM QR (Hotel)                                             │
│     Timeline: Months 4-6                                          │
│     Focus: Delight, Revenue, StayOwn Sync                        │
│                                                                     │
│  #3: ADS QR (Campaign)                                           │
│     Timeline: Months 7-9                                          │
│     Focus: Distribution, Fraud Prevention, Retargeting              │
│                                                                     │
│  PARALLEL: Shared Services                                        │
│     Timeline: Ongoing                                              │
│     Focus: Auth, Wallet, Mind, Chat, Knowledge Base              │
│                                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

*Document Generated: May 3, 2026*
