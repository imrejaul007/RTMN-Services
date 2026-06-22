# REZ Ecosystem - Company by Company Integration Plan
**Date:** May 20, 2026 | **Status:** COMPLETE AUDIT

---

## Overview

```
REZ-Intelligence
      │
      │ Data Flows
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ALL COMPANIES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  RABTUL    │  REZ-Consumer  │  REZ-Merchant  │  REZ-Media    │
│  Tech      │               │                │               │
│  ──────    │  ──────────   │  ────────────  │  ──────────   │
│  Auth      │  ReZ App      │  NexTaBizz     │  AdBazaar     │
│  Payment   │  ReZ Now      │  KDS           │  DOOH         │
│  Wallet    │  BuzzLocal    │  PO Mobile     │  Karma        │
│  Order     │  Safe QR      │                │               │
│  Search    │  Rendez       │                │               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. RABTUL-TECHNOLOGIES

**Purpose:** Core infrastructure - Auth, Payment, Wallet, Order, Catalog

### Services

| Service | Port | Data Generated |
|---------|------|----------------|
| `rez-auth-service` | 4002 | Login, signup, OTP, MFA |
| `rez-payment-service` | 4001 | Transactions, refunds |
| `rez-wallet-service` | 4004 | Coin changes, redemptions |
| `rez-order-service` | 4006 | Orders, carts, status |
| `rez-catalog-service` | 4007 | Products, prices |
| `rez-search-service` | 4008 | Search queries |
| `rez-delivery-service` | 4009 | Delivery status, driver |
| `rez-notifications-service` | 4011 | Notification events |
| `rez-profile-service` | 4013 | User profiles |
| `rez-booking-service` | 4020 | Reservations |

### Data TO REZ-Intelligence

| RABTUL Service | Event | Intelligence Use |
|---------------|-------|------------------|
| Auth | `identity.user.login` | Login patterns, device fingerprint |
| Payment | `commerce.payment.completed` | Transaction data, spend |
| Wallet | `loyalty.coins.earned` | Coin balance, redemption rate |
| Order | `commerce.order.completed` | Purchase history, frequency |
| Search | `engagement.search.performed` | Intent signals |
| Delivery | `delivery.status.updated` | Location, ETA |
| Notifications | `notification.sent` | Engagement |

### Data FROM REZ-Intelligence

| Intelligence Service | Data | RABTUL Use |
|-------------------|------|-------------|
| Decision Engine | Cashback % | Apply to wallet |
| Predictive Engine | Churn risk | Send retention offers |
| Personalization | User segments | Segment notifications |
| Attribution | Channel weights | Optimize ad spend |

### Integration Status

| Connection | Status | Missing |
|-----------|--------|---------|
| Event Bus → RABTUL | Partial | Full event emission |
| Decision Engine → Wallet | Partial | Real-time cashback |
| Profile → RABTUL | Partial | Sync |

### WHAT TO BUILD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. RABTUL → EVENT BUS EMISSION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ CURRENT: Services don't emit events                                    │
│                                                                       │
│ NEED: Add emit() to each RABTUL service:                             │
│                                                                       │
│ rez-auth-service/src/authService.ts                                   │
│ ┌─────────────────────────────────────────────────────────────────┐    │
│ │ async function login(userId, deviceId) {                      │    │
│ │   const result = await authenticate(userId, deviceId);         │    │
│ │   emitEvent('identity.user.login', { userId, deviceId });      │    │
│ │   return result;                                             │    │
│ │ }                                                            │    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                       │
│ rez-payment-service/src/paymentService.ts                             │
│ ┌─────────────────────────────────────────────────────────────────┐    │
│ │ async function processPayment(order) {                         │    │
│ │   const result = await paymentGateway.charge(order);            │    │
│ │   emitEvent('commerce.payment.completed', {                    │    │
│ │     orderId: order.id, amount: order.total,                   │    │
│ │     method: order.paymentMethod                               │    │
│ │   });                                                        │    │
│ │   return result;                                              │    │
│ │ }                                                            │    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                       │
│ Files to update:                                                     │
│ - RABTUL-Technologies/rez-auth-service/src/                         │
│ - RABTUL-Technologies/rez-payment-service/src/                       │
│ - RABTUL-Technologies/rez-wallet-service/src/                        │
│ - RABTUL-Technologies/rez-order-service/src/                         │
│ - RABTUL-Technologies/rez-search-service/src/                       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. REZ-CONSUMER

**Purpose:** Consumer apps - ReZ App, ReZ Now, BuzzLocal, Safe QR, Rendez

### Apps

| App | Platform | Features |
|-----|----------|----------|
| `ReZ App` | React Native | Food delivery, wallet, orders |
| `ReZ Now` | React Native | Quick commerce, QR pay |
| `BuzzLocal` | React Native | Hyperlocal community |
| `Safe QR` | Expo | Emergency QR codes (15 modes) |
| `Rendez` | React Native | Dating/social |

### Data TO REZ-Intelligence

| App | Events Generated | Intelligence Use |
|-----|----------------|------------------|
| ReZ App | `app.opened`, `menu.viewed`, `cart.added` | Intent, personalization |
| ReZ Now | `qr.scanned`, `payment.completed` | Offline purchase tracking |
| BuzzLocal | `post.created`, `comment.added` | Social signals |
| Safe QR | `qr.scanned` | Emergency response |
| Rendez | `profile.viewed`, `match.liked` | Social signals |

### Data FROM REZ-Intelligence

| Intelligence | Data | App Use |
|-------------|------|--------|
| Recommendations | Personalized feed | Show food/deals |
| Intent Prediction | Next order likely | Pre-populate cart |
| Cashback Engine | Offer % | Show savings |
| Loyalty | Points/coins | Display balance |

### Integration Status

| App | Connected | Missing |
|-----|-----------|---------|
| ReZ App | Partial | Full intent tracking |
| ReZ Now | Partial | QR → Offline purchase |
| BuzzLocal | None | Social signals |
| Safe QR | None | Emergency signals |
| Rendez | None | Social signals |

### WHAT TO BUILD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. REZ-CONSUMER → EVENT BUS EMISSION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ REZ-Consumer/rez-now/src/screens/OrderScreen.tsx                     │
│ ┌─────────────────────────────────────────────────────────────────┐    │
│ │ import { useIntelligenceEvents } from '@rez/intelligence';       │    │
│ │                                                                 │    │
│ │ const { emit } = useIntelligenceEvents();                        │    │
│ │                                                                 │    │
│ │ function OrderScreen() {                                        │    │
│ │   const handlePayment = async (order) => {                      │    │
│ │     await processPayment(order);                                │    │
│ │                                                                 │    │
│ │     // Emit to REZ-Intelligence                                 │    │
│ │     emit('commerce.payment.completed', {                        │    │
│ │       orderId: order.id,                                       │    │
│ │       merchantId: order.merchantId,                            │    │
│ │       amount: order.total,                                       │    │
│ │       method: order.paymentMethod,                               │    │
│ │       location: getCurrentLocation()                             │    │
│ │     });                                                        │    │
│ │   };                                                           │    │
│ │ }                                                              │    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                       │
│ Files to update:                                                     │
│ - REZ-Consumer/rez-now/src/screens/                                  │
│ - REZ-Consumer/rez-app/src/screens/                                  │
│ - REZ-Consumer/buzzlocal/src/screens/                               │
│                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. REZ-MERCHANT

**Purpose:** Merchant services - NexTaBizz, KDS, PO Mobile

### Services

| Service | Purpose | Data Generated |
|---------|---------|----------------|
| `nexTabizz-service` | Merchant dashboard | Orders, analytics |
| `kds-service` | Kitchen display | Order status, prep time |
| `po-mobile-service` | Purchase orders | Inventory data |

### Data TO REZ-Intelligence

| Merchant Service | Events | Intelligence Use |
|-----------------|--------|------------------|
| Order dashboard | `merchant.order.received` | Merchant analytics |
| KDS | `kitchen.order.started` | Prep time analysis |
| POS | `pos.transaction` | Offline purchase data |

### Data FROM REZ-Intelligence

| Intelligence | Data | Merchant Use |
|-------------|------|-------------|
| Merchant Intelligence | Customer segments, LTV | Target marketing |
| Predictive Engine | Demand forecast | Inventory planning |
| Attribution | Ad ROI | Optimize campaigns |
| Churn Detection | At-risk customers | Win-back offers |

### WHAT TO BUILD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. MERCHANT INTELLIGENCE DASHBOARD                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Connect REZ-Merchant/nexTabizz-service to:                            │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐    │
│ │ MERCHANT DASHBOARD WIDGETS                                      │    │
│ │                                                                 │    │
│ │ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │    │
│ │ │ Customer     │  │ Demand      │  │ Ad         │         │    │
│ │ │ Insights     │  │ Forecast    │  │ Performance │         │    │
│ │ │              │  │             │  │             │         │    │
│ │ │ • LTV: ₹12K │  │ • +23% Fri │  │ • ROI: 3.2x │         │    │
│ │ │ • Freq: 4x  │  │ • Peak: 7pm│  │ • Spend ₹5K│         │    │
│ │ │ • Seg: Young │ │ • Items: Pizza│ │ • Conv: 45 │         │    │
│ │ └──────────────┘  └──────────────┘  └──────────────┘         │    │
│ │                                                                 │    │
│ │ ┌──────────────────────────────────────────────────────────┐   │    │
│ │ │ AI RECOMMENDATIONS                                     │   │    │
│ │ │                                                         │   │    │
│ │ │ 💡 Add combo meals - 67% of high-LTV customers buy  │   │    │
│ │ │ 💡 Run evening promotion - Demand peaks 7-9pm         │   │    │
│ │ │ 💡 Target gym users - 23% of your customers gym      │   │    │
│ │ │     members                                              │   │    │
│ │ └──────────────────────────────────────────────────────────┘   │    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. REZ-MEDIA

**Purpose:** Advertising - DOOH, AdBazaar, Karma

### Services

| Service | Purpose | Data Generated |
|---------|---------|----------------|
| `rez-dooh-service` | DOOH screen management | Impressions, scans |
| `adBazaar-service` | Ad campaigns | Clicks, conversions |
| `karma-service` | Karma points | Engagement |
| `ads-qr-service` | QR ad campaigns | Scans, redemptions |

### Data TO REZ-Intelligence

| Media Service | Events | Intelligence Use |
|---------------|--------|------------------|
| DOOH | `dooh.impression`, `dooh.scan` | Attribution |
| AdBazaar | `ad.clicked`, `ad.converted` | Campaign optimization |
| Karma | `karma.earned`, `karma.redeemed` | Engagement patterns |

### Data FROM REZ-Intelligence

| Intelligence | Data | Media Use |
|-------------|------|----------|
| Offline Tracker | Customer near DOOH | Proximity targeting |
| Intent Prediction | High-intent users | Better ad selection |
| Visit Prediction | Likely visitors | Pre-target |

### WHAT TO BUILD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. DOOH → OFFLINE ATTRIBUTION                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ TRACK: DOOH → QR Scan → Store Visit → Purchase                      │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐    │
│ │ ATTRIBUTION FLOW                                                │    │
│ │                                                                 │    │
│ │   ┌─────────┐      ┌─────────┐      ┌─────────┐           │    │
│ │   │ DOOH    │ ───► │ QR Scan │ ───► │ Store   │           │    │
│ │   │ Impress │      │         │      │ Visit   │           │    │
│ │   └─────────┘      └─────────┘      └─────────┘           │    │
│ │       │                                    │                   │    │
│ │       │           ┌─────────┐             │                   │    │
│ │       │           │ Purchase│ ◄──────────┘                   │    │
│ │       │           └─────────┘                             │    │
│ │       │                                                    │    │
│ │       ▼                                                    │    │
│ │   ┌─────────────────────────────────────────────────┐   │    │
│ │   │ ATTRIBUTION ATTRIBUTES                           │   │    │
│ │   │                                                 │   │    │
│ │   │ • First Touch: DOOH impression (30%)            │   │    │
│ │   │ • Mid Touch: QR scan (30%)                     │   │    │
│ │   │ • Last Touch: Store visit (40%)               │   │    │
│ │   │                                                 │   │    │
│ │   │ Total Revenue Attributed: ₹45,000              │   │    │
│ │   │ DOOH Contribution: ₹13,500                   │   │    │
│ │   └─────────────────────────────────────────────────┘   │    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. STAYOWN-HOSPITALITY

**Purpose:** Hotels - Hotel OTA, Room QR

### Services

| Service | Purpose | Data Generated |
|---------|---------|----------------|
| `hotel-ota-api` | Hotel booking | Reservations |
| `room-qr-service` | Hotel room QR | Room service orders |

### Data TO REZ-Intelligence

| StayOwn Service | Events | Intelligence Use |
|-----------------|--------|------------------|
| Hotel OTA | `booking.created`, `check_in` | Travel patterns |
| Room QR | `room_service.ordered` | Spend patterns |

### Data FROM REZ-Intelligence

| Intelligence | Data | StayOwn Use |
|-------------|------|-------------|
| Travel Expert | Travel recommendations | Upsell |
| Customer360 | Guest preferences | Personalization |
| Predictive Engine | Demand forecast | Dynamic pricing |

### WHAT TO BUILD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. STAYOWN → REZ-INTELLIGENCE INTEGRATION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ TRACK: Hotel guest journey                                            │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐    │
│ │ GUEST JOURNEY                                                    │    │
│ │                                                                 │    │
│ │ Pre-Stay         │ During Stay        │ Post-Stay               │    │
│ │ ────────────────  │ ────────────────  │ ────────────────        │    │
│ │ Booking created   │ Room service      │ Review sent             │    │
│ │ Preferences set   │ Spa booked        │ Loyalty credited        │    │
│ │ Travel pattern   │ Restaurant visit  │ Return prediction       │    │
│ │                 │ Location tracked   │ Cross-sell prepared     │    │
│ └─────────────────┴──────────────────┴────────────────────────┘    │
│                                                                       │
│ INTEGRATION:                                                         │
│ - StayOwn → REZ-Intelligence: booking, preferences                  │
│ - REZ-Intelligence → StayOwn: AI recommendations, upsell             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. CORPPERKS

**Purpose:** Enterprise SaaS - PeopleOS, HR App, Insight Campus

### Services

| Service | Purpose | Data Generated |
|---------|---------|----------------|
| `people-os` | Workforce OS | Attendance, leave |
| `hr-app` | HR mobile | Employee data |
| `insight-campus` | Student hub | Academic data |

### Data TO REZ-Intelligence

| CorpPerks Service | Events | Intelligence Use |
|-------------------|--------|------------------|
| PeopleOS | `employee.checked_in`, `leave.taken` | Work patterns |
| Insight Campus | `event.attended`, `resource.booked` | Engagement |

### Data FROM REZ-Intelligence

| Intelligence | Data | CorpPerks Use |
|-------------|------|---------------|
| Behavior Analysis | Productivity insights | Employee engagement |
| Predictive Engine | Burnout risk | HR alerts |

---

## INTEGRATION MATRIX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW MATRIX                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                    TO REZ-Intelligence          FROM REZ-Intelligence │
│                    ────────────────────          ───────────────────── │
│                                                                       │
│ RABTUL-TECH           │                              │                   │
│ ├── Auth         ────►│ identity.* events           │◄── Cashback %      │
│ ├── Payment      ────►│ commerce.* events          │◄── Fraud alerts    │
│ ├── Wallet       ────►│ loyalty.* events           │◄── Points balance  │
│ ├── Order        ────►│ commerce.* events          │◄── Recommendations│
│ └── Search       ────►│ engagement.* events        │◄── Personalization│
│                                                                       │
│ REZ-CONSUMER         │                              │                   │
│ ├── ReZ App      ────►│ engagement.* events        │◄── Personalized feed│
│ ├── ReZ Now     ────►│ offline.purchase.events    │◄── Offers         │
│ ├── BuzzLocal   ────►│ social.* events            │◄── Trending        │
│ └── Safe QR     ────►│ emergency.* events         │◄── Alert protocols│
│                                                                       │
│ REZ-MERCHANT          │                              │                   │
│ ├── NexTaBizz    ────►│ merchant.* events          │◄── Customer LTV    │
│ ├── KDS          ────►│ kitchen.* events           │◄── Demand forecast│
│ └── POS          ────►│ pos.transaction            │◄── Inventory AI   │
│                                                                       │
│ REZ-MEDIA             │                              │                   │
│ ├── DOOH         ────►│ dooh.* events              │◄── Intent targeting│
│ ├── AdBazaar     ────►│ ad.* events                │◄── Better CPM     │
│ └── Karma        ────►│ karma.* events             │◄── Engagement     │
│                                                                       │
│ STAYOWN               │                              │                   │
│ ├── Hotel OTA    ────►│ booking.* events           │◄── Upsell AI      │
│ └── Room QR      ────►│ room_service.* events      │◄── Guest profile │
│                                                                       │
│ CORPPERKS             │                              │                   │
│ ├── PeopleOS    ────►│ enterprise.* events         │◄── Insights      │
│ └── Insight     ────►│ academic.* events           │◄── Predictions   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## WHAT TO BUILD (Priority Order)

### IMMEDIATE (This Week)

| # | Task | From | To | Impact |
|---|------|------|----|--------|
| 1 | Add Event Bus to RABTUL Auth | RABTUL | Intelligence | Identity signals |
| 2 | Add Event Bus to REZ Now | Consumer | Intelligence | Offline purchases |
| 3 | Connect DOOH → Offline Tracker | Media | Intelligence | Attribution |

### SHORT-TERM (This Month)

| # | Task | From | To | Impact |
|---|------|------|----|--------|
| 4 | Connect NexTaBizz → Merchant Intelligence | Merchant | Intelligence | Customer LTV |
| 5 | Connect StayOwn → Travel Intelligence | StayOwn | Intelligence | Guest journey |
| 6 | Connect BuzzLocal → Social Signals | Consumer | Intelligence | Social data |

### MEDIUM-TERM (Next Quarter)

| # | Task | From | To | Impact |
|---|------|------|----|--------|
| 7 | Connect CorpPerks → Behavior Analysis | CorpPerks | Intelligence | Enterprise AI |
| 8 | Build unified dashboard | All | All | Single view |
| 9 | Build attribution reports | All | Media | Ad ROI |

---

## DUPLICATE CHECK

### Already Exists - Don't Rebuild

| Need | Exists | Location |
|------|--------|----------|
| Event Bus | ✅ | RABTUL-Technologies/REZ-event-bus |
| Commerce Graph | ✅ | RABTUL-Technologies/REZ-graph-service |
| Decision Engine | ✅ | RABTUL-Technologies/REZ-decision-engine |
| User Profiles | ✅ | RABTUL-Technologies/REZ-profile-service |
| Offline Tracker | ✅ | REZ-Intelligence/REZ-offline-commerce-tracker |
| Moment Ads | ✅ | REZ-Intelligence/REZ-moment-ads |
| Visit Prediction | ✅ | REZ-Intelligence/REZ-visit-prediction |
| Cross-Sell Engine | ✅ | REZ-Intelligence/REZ-cross-sell-engine |
| Attribution | ✅ | RABTUL-Technologies/REZ-unified-attribution |
| Notifications | ✅ | RABTUL-Technologies/REZ-unified-notifications |
| Identity | ✅ | RABTUL-Technologies/REZ-unified-identity |

### Need to Build (NEW)

| Need | Priority | Impact |
|------|----------|--------|
| POS → Offline Tracker connector | HIGH | Revenue |
| DOOH → Offline Tracker connector | HIGH | Attribution |
| StayOwn → Intelligence connector | MEDIUM | Guest AI |
| CorpPerks → Intelligence connector | MEDIUM | Enterprise |
| BuzzLocal → Social Signals | MEDIUM | Social data |

---

## SUMMARY

### What Exists (Don't Rebuild)

- ✅ Event Bus infrastructure
- ✅ Commerce Graph
- ✅ Decision Engine
- ✅ All intelligence services
- ✅ Hyperlocal commerce (Offline Tracker, Moment Ads, etc.)

### What to Connect (Not Rebuild)

| Company | Already Exists | Need To Do |
|---------|---------------|-------------|
| RABTUL | Event emission helpers | Add to services |
| REZ-Consumer | Integration templates | Add to apps |
| REZ-Merchant | Merchant dashboard | Add intelligence widgets |
| REZ-Media | DOOH service | Connect to Offline Tracker |
| StayOwn | Hotel OTA | Add guest journey tracking |
| CorpPerks | PeopleOS | Add enterprise signals |

### What to Build (NEW)

| Service | Purpose |
|---------|---------|
| POS-Intelligence connector | POS → Offline Tracker |
| StayOwn-Intelligence connector | Hotel → Intelligence |
| CorpPerks-Intelligence connector | Enterprise → Intelligence |

---

**STATUS: READY TO CONNECT - NO DUPLICATES NEEDED**
