# QR Systems - Complete Feature Guide
**Date:** May 3, 2026

---

# TABLE OF CONTENTS
1. [Room QR (Hotel)](#1-room-qr-hotel)
2. [Menu QR (Restaurant)](#2-menu-qr-restaurant)
3. [Rez Now (Linktree)](#3-rez-now-linktree)
4. [Ads QR (Campaign)](#4-ads-qr-campaign)
5. [Dashboards](#5-dashboards)
6. [How They're Connected](#6-how-theyre-connected)

---

# 1. ROOM QR (HOTEL)

## What It Is
Room QR is a hotel room-specific QR code that guests scan to access hotel services directly from their phone.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROOM QR WORKFLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. HOTEL SETUP (via Hotel OTA Dashboard)
   │
   ├── Hotel admin creates property
   ├── Admin sets up room types (Standard, Deluxe, Suite)
   ├── Admin enables services (Room Service, Housekeeping, etc.)
   └── System auto-generates QR codes for each room

2. GUEST BOOKING (via StayOwn)
   │
   ├── Guest books room via StayOwn
   ├── Room assigned automatically
   ├── Room QR generated with unique token
   └── QR sent to guest via Email/WhatsApp/SMS

3. GUEST ARRIVES
   │
   ├── Guest scans Room QR (located in room)
   ├── Token validated automatically
   ├── Guest sees Room Hub with services
   └── No login needed (token authenticates)

4. GUEST USES SERVICES
   │
   ├── Browse room service menu
   ├── Order food/beverages
   ├── Request housekeeping
   ├── Book spa appointment
   ├── Request laundry
   └── Chat with hotel staff

5. CHECKOUT
   │
   ├── Guest reviews folio (all charges)
   ├── Pay via REZ Wallet or Card
   ├── Charges sync to StayOwn
   └── Digital receipt sent

```

## Features

### For Guests (Mobile/Web)

| Feature | Description |
|---------|-------------|
| **Auto-Login** | Token-based, no username/password |
| **Room Service Menu** | Browse food, beverages, amenities |
| **Order Tracking** | Real-time order status updates |
| **Housekeeping** | Request towels, fresh sheets, toiletries |
| **Spa Booking** | View services, book appointments |
| **Laundry Service** | Request pickup, track status |
| **Minibar Billing** | View/consume items, auto-billing |
| **Chat with Staff** | Real-time messaging |
| **AI Recommendations** | "Based on your stay..." |
| **Express Checkout** | Review bill, pay, done |
| **Feedback** | Rate experience, report issues |

### For Hotels (Dashboard)

| Feature | Description |
|---------|-------------|
| **Room Management** | View/manage all rooms |
| **Service Dashboard** | See all requests in real-time |
| **Staff Assignment** | Assign requests to staff |
| **Kanban Board** | Drag-drop request management |
| **Revenue Tracking** | Revenue from room services |
| **Guest Messaging** | Real-time chat with guests |
| **Checkout Management** | Review/approve checkouts |
| **Analytics** | Request stats, popular services |
| **QR Code Download** | Download all room QR codes |
| **Multi-language** | Support for Hindi/English |

### For Staff (Hotel OTA)

| Feature | Description |
|---------|-------------|
| **Request Notifications** | Push alerts for new requests |
| **Kanban Board** | Pending → In Progress → Done |
| **Room Status** | Occupied, Vacant, Cleaning |
| **Staff Chat** | Internal communication |
| **Quick Replies** | Pre-written responses |
| **Guest History** | View past preferences |

## QR Code Format

```json
{
  "intent": "room-hub",
  "v": 1,
  "hotelId": "hotel_grand_123",
  "roomId": "room_201",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "checkIn": "2026-05-03",
  "checkOut": "2026-05-06"
}
```

## Dashboard Location
- **Staff Dashboard:** `Hotel OTA/apps/ota-web/src/app/staff/`
- **Guest View:** `rez-now/app/[hotelSlug]/room/[roomId]/`

---

# 2. MENU QR (RESTAURANT)

## What It Is
Menu QR is a restaurant-specific QR code that opens a digital menu with ordering capability.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    MENU QR WORKFLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. RESTAURANT SETUP (via Rez Merchant)
   │
   ├── Restaurant creates profile
   ├── Uploads menu (CSV, PDF, or manual)
   ├── Sets categories and items
   ├── Configures prices and customizations
   └── Generates Menu QR code

2. GUEST ARRIVES
   │
   ├── Scans Menu QR (on table or receipt)
   ├── Sees digital menu with categories
   ├── Can filter by dietary preferences
   ├── Browse items with photos

3. ORDERING
   │
   ├── Add items to cart
   ├── Customize (size, extras, allergies)
   ├── View recommendations
   ├── Call waiter if needed
   └── Checkout when done

4. PAYMENT
   │
   ├── Split bill (by item or person)
   ├── Pay via REZ Wallet (coins)
   ├── Pay via UPI/Card
   ├── Leave tip (optional)
   └── Digital receipt

5. POST-DINING
   │
   ├── Rate experience
   ├── AI learns preferences
   ├── Rez Mind updates profile
   └── Future recommendations improve

```

## Features

### For Customers (Mobile/Web)

| Feature | Description |
|---------|-------------|
| **Digital Menu** | Categories, items, photos |
| **Nutritional Info** | Calories, protein, carbs, fat |
| **Allergen Warnings** | 8 allergen types highlighted |
| **Dietary Filters** | Vegan, GF, Nut-Free, Jain |
| **Search** | Find items quickly |
| **Customization** | Size, extras, special requests |
| **Pairing Suggestions** | Wine, beer, beverages |
| **Chef's Special** | Highlighted recommendations |
| **Popular Dishes** | "Most ordered" badges |
| **Seasonal Items** | Limited time indicators |
| **Waiter Calling** | Tap to call with reason |
| **Order Tracking** | Real-time kitchen updates |
| **Split Bill** | By item or by person |
| **REZ Wallet** | Pay with coins |
| **AI Recommendations** | "You might like..." |
| **Weather Suggestions** | Hot day → cold drinks |
| **Taste Profile** | Learns your preferences |

### For Restaurants (Dashboard)

| Feature | Description |
|---------|-------------|
| **Menu Management** | Add/edit/remove items |
| **Category Organization** | Drag-drop ordering |
| **Pricing** | Set prices, offers |
| **Dietary Labels** | Mark vegan, GF, etc. |
| **Item Photos** | Upload high-quality images |
| **Analytics** | Popular items, times |
| **Order History** | All orders with details |
| **Waiter Requests** | View/respond to calls |
| **Kitchen Chat** | Staff communication |
| **AI Insights** | Suggest menu improvements |
| **QR Download** | Download Menu QR |

## QR Code Format

```json
{
  "intent": "menu-qr",
  "v": 1,
  "storeId": "store_pizza_palace_456",
  "storeSlug": "pizza-palace",
  "tableNumber": "5"
}
```

## Dashboard Location
- **Merchant Dashboard:** `rez-app-merchant/app/(dashboard)/qr-hub/menu-qr.tsx`
- **Guest View:** `rez-now/app/[storeSlug]/`

---

# 3. REZ NOW (LINKTREE)

## What It Is
Rez Now is a universal business QR that serves as a digital business card, linktree, and mini-website.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    REZ NOW WORKFLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. BUSINESS SETUP (via Rez Merchant)
   │
   ├── Create business profile
   ├── Add business info (name, bio, logo)
   ├── Configure services/products
   ├── Add custom links (website, social)
   ├── Set up appointment slots
   └── Generate Rez Now QR code

2. CUSTOMER SCANS
   │
   ├── Scans Rez Now QR
   ├── Sees business profile
   ├── Views all links and info
   ├── Can book/order/contact
   └── Follows on social media

3. CUSTOMER ACTIONS
   │
   ├── Click links (menu, website, social)
   ├── Book appointment
   ├── View products/catalog
   ├── Contact via WhatsApp/phone
   └── Leave review

4. ANALYTICS
   │
   ├── Track page views
   ├── Track link clicks
   ├── See popular links
   ├── Customer journey
   └── Improve based on data

```

## Features

### For Customers (Mobile/Web)

| Feature | Description |
|---------|-------------|
| **Business Profile** | Logo, name, bio, tagline |
| **Custom Links** | Website, menu, booking, social |
| **Service Catalog** | Browse services with pricing |
| **Appointment Booking** | Select time, book slot |
| **Contact Options** | Call, WhatsApp, email |
| **Social Links** | Instagram, Facebook, etc. |
| **Gallery** | Photos, videos |
| **Reviews** | Customer testimonials |
| **Hours** | Business hours display |
| **Location** | Address with map |
| **Quick Actions** | Order, Book, Call buttons |

### For Businesses (Dashboard)

| Feature | Description |
|---------|-------------|
| **Profile Editor** | All business info |
| **Link Manager** | Add/edit/reorder links |
| **Service Catalog** | Manage services/pricing |
| **Appointment Slots** | Set availability |
| **Gallery Manager** | Upload photos/videos |
| **FAQ Section** | Add common questions |
| **Theme Customization** | Colors, fonts |
| **QR Generator** | Multiple QR formats |
| **Analytics** | Views, clicks, conversions |
| **Review Management** | View/respond to reviews |

## QR Code Format

```json
{
  "intent": "rez-now",
  "v": 1,
  "storeId": "store_awesome_store_789",
  "storeSlug": "awesome-store",
  "page": "home"
}
```

## Dashboard Location
- **Merchant Dashboard:** `rez-app-merchant/app/(dashboard)/qr-hub/`
- **Guest View:** `now.rez.money/[storeSlug]`

---

# 4. ADS QR (CAMPAIGN)

## What It Is
Ads QR is a marketing campaign QR that tracks attribution and rewards users for engagement.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADS QR WORKFLOW                                │
└─────────────────────────────────────────────────────────────────┘

1. BRAND CREATES CAMPAIGN (via AdBazaar)
   │
   ├── Create campaign with offer
   ├── Choose reward type (coins, discount, sample)
   ├── Set budget and duration
   ├── Define locations/targeting
   └── Generate campaign QR codes

2. USER SEES QR (Physical Location)
   │
   ├── Scans QR on billboard/flyer/product
   ├── Lands on campaign landing page
   ├── Sees offer details
   ├── Claims reward

3. ATTRIBUTION TRACKING
   │
   ├── Record scan event
   ├── Track GPS location (if visit required)
   ├── Track purchase (if applicable)
   └── Attribute revenue to campaign

4. REWARDS
   │
   ├── REZ Coins credited to wallet
   ├── Brand Coins (if applicable)
   ├── Discount codes generated
   ├── Free samples claimed
   └── Consultation booked

5. BRAND ANALYTICS
   │
   ├── View scan counts
   ├── See conversion funnel
   ├── Track ROI
   ├── Optimize based on data

```

## Features

### For Users (Mobile/Web)

| Feature | Description |
|---------|-------------|
| **Campaign Landing** | Branded offer pages |
| **Video Template** | Video hero with CTA |
| **Coupon Template** | Claim discount codes |
| **Contest Entry** | Enter giveaways |
| **Lead Capture** | Submit contact info |
| **REZ Coins** | Earn on scan/visit/purchase |
| **Brand Coins** | Brand-specific rewards |
| **Free Samples** | Request samples |
| **Free Consultations** | Book appointments |
| **Redemption Tracking** | View earned rewards |
| **Wallet Integration** | View coin balance |

### For Brands (Dashboard)

| Feature | Description |
|---------|-------------|
| **Campaign Builder** | Create offers quickly |
| **Multiple Templates** | Video, Coupon, Contest, etc. |
| **Dynamic QR** | Change content without reprint |
| **Time-based** | Different content by time |
| **Location-based** | Different by location |
| **GPS Verification** | Verify physical visits |
| **Attribution Funnel** | Scan → Visit → Purchase |
| **ROI Calculator** | Revenue per campaign |
| **Budget Controls** | Set daily caps |
| **A/B Testing** | Test different offers |
| **Brand Coins** | Create custom coins |
| **Sample Management** | Manage inventory |
| **Consultation Booking** | Calendar integration |

## QR Code Format

```json
{
  "intent": "ad-campaign",
  "v": 1,
  "campaignId": "campaign_summer_2026",
  "adId": "ad_billboard_mumbai",
  "merchantId": "brand_nike_123",
  "rewardType": "coins"
}
```

## Dashboard Location
- **AdBazaar:** `adBazaar/src/app/dashboard/`
- **Merchant Dashboard:** `rez-app-merchant/app/(dashboard)/qr-hub/ads-qr.tsx`
- **Guest View:** `adsqr.rezapp.com/scan/[slug]`

---

# 5. DASHBOARDS

## Unified QR Hub (Rez Merchant)

### Main Dashboard
Located at: `rez-app-merchant/app/(dashboard)/qr-hub/page.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│  QR HUB - UNIFIED DASHBOARD                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  QUICK STATS                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 5,234   │ │ ₹2.5L    │ │ 89       │ │ 3        │          │
│  │ Total    │ │ Revenue  │ │ Active   │ │Campaigns │          │
│  │ Scans    │ │          │ │ Rooms    │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  QR TYPE CARDS                                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🍽️ MENU QR          │ 234 scans │ 45 orders │ ₹12,000 │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🛏️ ROOM QR          │ 1,234 scans │ 89 requests │ ₹45,000 │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📣 ADS QR            │ 3,456 scans │ 234 conversions │ │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🔗 LINK QR           │ 890 views │ 234 clicks │ - │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│  QUICK ACTIONS                                                 │
│  [Generate QR] [Analytics] [Download]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Menu QR Dashboard Tab

| Section | Description |
|---------|-------------|
| **Period Selector** | Today / This Week / This Month |
| **Stats Grid** | Scans, Orders, Revenue |
| **Top Items** | Most ordered dishes |
| **Popular Times** | Busiest hours |
| **Actions** | Edit Menu, View Orders |

### Room QR Dashboard Tab

| Section | Description |
|---------|-------------|
| **Room Status** | Active / Total Rooms |
| **Request Stats** | Today, Pending, Completed |
| **Revenue** | Today, This Week |
| **Recent Requests** | Real-time list |
| **Top Services** | By order count |
| **Actions** | Download QR, Print Labels |

### Ads QR Dashboard Tab

| Section | Description |
|---------|-------------|
| **Overview Stats** | Scans, Conversions, ROI |
| **Attributed Revenue** | Revenue from campaigns |
| **Campaign List** | Active campaigns with stats |
| **Actions** | Create Campaign, Analytics |

---

## Hotel OTA Staff Dashboard

Located at: `Hotel OTA/apps/ota-web/src/app/staff/`

### Main Dashboard

| Section | Description |
|---------|-------------|
| **Today's Overview** | Requests, Rooms, Revenue |
| **Quick Actions** | Pending requests, Alerts |
| **Recent Activity** | Real-time feed |

### Requests Board (Kanban)

| Column | Description |
|--------|-------------|
| **Pending** | New requests awaiting action |
| **In Progress** | Being worked on |
| **Completed** | Done |

### Features

| Feature | Description |
|---------|-------------|
| **Real-time Updates** | WebSocket push |
| **Staff Assignment** | Assign to team member |
| **Priority Levels** | Low, Medium, High, Urgent |
| **Room Filter** | View by room |
| **Service Filter** | Filter by type |
| **Quick Replies** | Pre-written responses |

---

## Onboarding (< 5 Minutes)

### Merchant Onboarding V2

Located at: `rez-app-merchant/app/onboarding-v2/`

| Step | Fields | Time |
|------|--------|------|
| **1. Business Info** | Name, Owner, Phone, Type, Category | ~1 min |
| **2. Services** | Select what you offer (checkboxes) | ~30 sec |
| **3. Quick Setup** | Menu upload, QR preview | ~1 min |
| **4. Complete** | Success screen, QR download | ~30 sec |

### Hotel OTA Onboarding

Located at: `Hotel OTA/apps/ota-web/src/app/onboarding/`

| Step | Fields | Time |
|------|--------|------|
| **1. Hotel Info** | Name, Location, Type, Rating | ~1 min |
| **2. Rooms** | Auto-generate room QR codes | ~1 min |
| **3. Services** | Enable services (checkboxes) | ~30 sec |
| **4. Staff** | Invite team (optional) | ~30 sec |
| **5. Complete** | Success, QR download | ~30 sec |

---

# 6. HOW THEY'RE CONNECTED

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED QR ECOSYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

                        ┌─────────────────┐
                        │   REZ APP      │
                        │   (Consumer)    │
                        └────────┬────────┘
                                 │
                    ┌───────────┴───────────┐
                    │                       │
              ┌─────▼─────┐         ┌─────▼─────┐
              │  QR Scan   │         │  Web QR   │
              │  (Native)  │         │  Scanner  │
              └─────┬─────┘         └─────┬─────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │    UNIFIED ROUTER     │
                    │   (QR Type Detect)    │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼───────┐     ┌───────▼───────┐     ┌───────▼───────┐
│   ROOM QR     │     │   MENU QR    │     │   ADS QR     │
│  ──────────── │     │  ─────────── │     │  ─────────── │
│ room-hub intent│     │ menu-qr intent│     │ad-campaign intent│
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Room Hub    │     │  Store Menu  │     │  Campaign    │
│  (Services)  │     │  (Ordering) │     │  (Rewards)   │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   REZ CHAT   │     │   REZ CHAT   │     │   REZ CHAT   │
│  (AI Chat)  │     │  (AI Chat)  │     │  (AI Chat)  │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     REZ MIND        │
                    │  (AI Recommendations)│
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │    REZ WALLET       │
                    │ (Payments & Coins)   │
                    └───────────────────┘
```

## Shared Services

| Service | Used By | Purpose |
|---------|---------|---------|
| **REZ Auth** | All QR types | User authentication |
| **REZ Wallet** | All QR types | Payments, coins |
| **REZ Payment** | All QR types | Payment processing |
| **REZ Mind** | All QR types | AI recommendations |
| **REZ Chat** | All QR types | Customer support |
| **REZ Knowledge Base** | All QR types | Context-aware responses |
| **REZ Intent Graph** | All QR types | User preference tracking |

## Data Flow

### Room QR Flow
```
StayOwn Booking → Generate Token → Send QR → Guest Scans → 
Token Validate → Room Hub Opens → Services Used → 
Charge to Folio → Checkout → Sync to StayOwn
```

### Menu QR Flow
```
Restaurant Creates Menu → Generate QR → Guest Scans → 
Menu Opens → Order Placed → Payment → 
AI Learns Preferences → Rez Mind Updates Profile
```

### Rez Now Flow
```
Business Creates Profile → Generate QR → Customer Scans → 
Profile Opens → Actions Taken → Analytics Tracked
```

### Ads QR Flow
```
Brand Creates Campaign → Generate QR → User Scans → 
Attribution Recorded → Reward Claimed → 
Analytics Dashboard → ROI Calculated
```

## Database Connections

| QR Type | Primary DB | Shared Services |
|---------|-----------|----------------|
| Room QR | Hotel OTA (MongoDB) | REZ Auth, Wallet, Intent |
| Menu QR | Rez Catalog (PostgreSQL) | REZ Auth, Wallet, Order |
| Rez Now | Rez Merchant (PostgreSQL) | REZ Auth, Analytics |
| Ads QR | AdBazaar (Supabase) | REZ Auth, Wallet, Intent |

## API Gateway

All QR systems route through unified endpoints:

| Endpoint | Routes To |
|----------|-----------|
| `/api/qr/scan` | All QR types |
| `/api/qr/resolve` | Short URL resolution |
| `/api/auth/*` | REZ Auth |
| `/api/wallet/*` | REZ Wallet |
| `/api/payment/*` | REZ Payment |
| `/api/intent/*` | REZ Intent Graph |

---

# SUMMARY

## Quick Reference

| Feature | Room QR | Menu QR | Rez Now | Ads QR |
|----------|---------|---------|---------|--------|
| **Auto-Login** | Token | No | No | No |
| **Ordering** | Room service | Full menu | Services | N/A |
| **Payment** | Folio | Cart | Links | Rewards |
| **AI Chat** | Yes | Yes | Yes | Yes |
| **AI Recommendations** | Yes | Yes | No | Yes |
| **Analytics** | Revenue | Orders | Clicks | Attribution |
| **Real-time** | Requests | Orders | Views | Scans |
| **REZ Coins** | Yes | Yes | No | Yes |
| **Dietary Filters** | N/A | Yes | N/A | N/A |
| **GPS Tracking** | No | No | No | Yes |
| **Multi-language** | Yes | Yes | Yes | Yes |

## Dashboard Access

| Dashboard | URL | For |
|----------|-----|-----|
| **QR Hub** | `rez-app-merchant/qr-hub` | Merchants (all QR types) |
| **Hotel Staff** | `hotel-ota/staff` | Hotel staff |
| **AdBazaar** | `adBazaar/dashboard` | Campaign managers |
| **Rez Now** | `rez-merchant/rez-now` | Business profiles |

---

*Document Generated: May 3, 2026*
