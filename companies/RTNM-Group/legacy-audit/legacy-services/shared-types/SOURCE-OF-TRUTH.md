# SOURCE OF TRUTH - Complete Advertising System Documentation

> Last Updated: 2026-05-02

---

## SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REZ ADVERTISING ECOSYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   REZ MIND                              │ │
│  │             (User behavior + signals)                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                       ADOS                                 │ │
│  │              (Decision + Optimization)                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                       │
│         ┌──────────────────┼──────────────────┐                  │
│         │                  │                  │                   │
│         ▼                  ▼                  ▼                   │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐           │
│   │ AdBazaar │    │  AdsQr   │    │   DOOH    │           │
│   │ Marketplace│    │ QR Campaigns│   │  Screens  │           │
│   └───────────┘    └───────────┘    └───────────┘           │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              ATTRIBUTION + WALLET                         │ │
│  │         (Scan → Visit → Purchase → Coins)                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## SYSTEM STATUS

| Component | Status | Ready |
|-----------|---------|--------|
| AdBazaar | ✅ Built | Yes |
| AdsQr | ✅ Built | Yes |
| AdOS | ✅ Built | Yes |
| DOOH | ✅ Built | Yes |
| REZ Mind | ✅ Connected | Yes |
| Attribution | ✅ Built | Yes |
| Wallet | ✅ Connected | Yes |

---

## HOW IT WORKS

### 1. MERCHANT ONBOARDING

```
Merchant registers → REZ Auth validates → Profile created → Dashboard ready
```

### 2. CAMPAIGN CREATION

```
Merchant creates campaign
         │
         ▼
    ┌────────────┐
    │ Choice:     │
    │ QR Campaign │
    │ Listing     │
    └────────────┘
```

### 3. QR CODE FLOW

```
User scans QR
         │
         ▼
    ┌────────────────┐
    │ 1. AdBazaar   │ ← Campaign visible in dashboard
    │ 2. AdsQr      │ ← QR landing page shown
    │ 3. Coins credited│ ← REZ Wallet updated
    └────────────────┘
```

---

## QR CODE CREATION (STEP BY STEP)

### For AdBazaar Listings

1. **Merchant creates listing on AdBazaar**
   - Location + price + photos
   - Listing saved to Supabase `listings` table
   - QR code auto-generated on booking

2. **Booking creates QR code**
   - When buyer books → `qr_codes` table populated
   - QR slug generated
   - Landing page URL: `/scan/[slug]`

3. **QR links to campaign page**

### For AdsQr Campaigns

1. **Merchant creates campaign on AdsQr dashboard**
   - Visit: `/campaigns/new`
   - Select offer + rewards
   - Generate QR codes
   - Download & print

2. **QR codes placed on physical locations**

### QR Code Structure

```
/scan/[slug]
    │
    └── Landing page with offer
         │
         └── User scans → coins credited
```

---

## DOOH NETWORK (STEP BY STEP)

### Adding Screens to DOOH Network

1. **Register Screen**
   ```typescript
   // POST /api/screens/register
   {
     "name": "Cab Tablet #001",
     "type": "cab_tablet",
     "location": { "city": "Bangalore", "lat": 12.9716, "lng": 77.5946 }
   }
   ```

2. **Install Screen OS on device**
   - Lightweight app on tablet/TV
   - Heartbeats to server every 60s

3. **Screen receives playlists**
   ```
   Playlist → Screen → Display ads → Track impressions
   ```

### Screen Types Supported

| Type | Example | Audience |
|------|---------|----------|
| cab_tablet | Ola/Uber/ReZ cabs | Office workers |
| restaurant_tv | Cafe menus | Foodies |
| mall_kiosk | Mall directories | Shoppers |
| gym_screen | Fitness centers | Health-focused |
| hotel_lobby | Hotel displays | Travelers |

---

## ATTRIBUTION FLOW

```
User scans QR
         │
         ▼
    ┌────────────────┐
    │ 1. Scan event   │ ← /api/scan/[slug]
    │ 2. Visit (GPS)  │ ← /api/visit
    │ 3. Purchase     │ ← /api/purchase
    │ 4. Coins credited│ ← REZ Wallet API
    │ 5. ROI calculated│ ← AdOS ROI Engine
    └────────────────┘
```

---

## API ENDPOINTS

### AdBazaar (Marketplace)
```
POST   /api/listings
GET    /api/listings/[id]
POST   /api/bookings
POST   /api/bookings/[id]/verify-payment
POST   /api/inquiries/[id]/quote
GET    /api/attribution
```

### AdsQr (QR Campaigns)
```
POST   /api/campaigns
POST   /api/campaigns/[id]/qr/bulk
POST   /api/scan/[slug]
POST   /api/visit
POST   /api/purchase
GET    /api/analytics/attribution
```

### DOOH (Screens)
```
POST   /api/screens/register
GET    /api/screens
POST   /api/playlist/generate
POST   /api/heartbeat
```

### Internal Services
```
REZ_AUTH_SERVICE_URL    → Authentication
REZ_WALLET_API         → Coin credits
REZ_MARKETING_SERVICE → Campaigns
REZ_WALLET_SECRET      → Admin operations
```

---

## ENVIRONMENT VARIABLES

### AdBazaar
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# REZ Services
REZ_AUTH_SERVICE_URL=https://auth.rezapp.com
REZ_WALLET_API=https://wallet.rezapp.com/api
REZ_MARKETING_SERVICE_URL=https://marketing.rezapp.com

# Payment
RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx
```

### AdsQr
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### DOOH
```bash
DOOH_SERVER_URL=https://dooh.rezapp.com
DOOH_API_KEY=xxx
```

---

## DATABASE TABLES

### Supabase (AdBazaar + AdsQr)

| Table | Purpose |
|-------|---------|
| users | User accounts |
| listings | Ad inventory |
| campaigns | Ad campaigns |
| bookings | Transactions |
| qr_codes | QR tracking |
| scan_events | Attribution |
| visit_events | GPS visits |
| purchase_events | Conversions |
| coin_transactions | Wallet ledger |

### MongoDB (Internal Services)
- Wallets
- Orders
- Sessions

---

## DEPLOYMENT

### AdBazaar
```bash
cd adBazaar
vercel --prod
```

### AdsQr
```bash
cd adsqr
vercel --prod
```

### Internal Services (Render)

```bash
# REZ Auth Service
render deploy --proto=grpc --service=rez-auth-service

# REZ Wallet Service
render deploy --proto=grpc --service=rez-wallet-service
```

---

## CONNECTIONS DIAGRAM

```
┌────────────────────────────────────────────────────────────┐
│                    MERCHANT DASHBOARD                      │
└─────────────────────┬──────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│                 ADBAZAAR + ADSQR                       │
│  (Next.js frontend + Supabase + Vercel)              │
└─────────────────────┬──────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌────────┐   ┌──────────┐   ┌──────────┐
│Supabase│   │  Razorpay│   │ REZ Auth │
└────────┘   └──────────┘   └──────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Internal Services│
                     │ • Auth        │
                     │ • Wallet      │
                     │ • Marketing   │
                     │ • Intent Graph│
                     └──────────────┘
```

---

## MERCHANT QUICK START

### 1. Register & Login
Visit https://ad-bazaar.vercel.app/auth/login

### 2. Create Listing/Campaign
- Dashboard → New Listing
- Or: Quick Campaign → AdsQr

### 3. Add Payment Method
Razorpay checkout

### 4. Launch Campaign
- QR codes generated
- Analytics dashboard visible

---

## FILES REFERENCE

| Path | Purpose |
|------|----------|
| adBazaar/src/app/ | Next.js pages |
| adsqr/src/app/api/ | API routes |
| adsos/src/ | AdOS services |
| rez-wallet-service/ | Wallet API |
| rez-auth-service/ | Auth API |
| supabase/migrations/ | Database schema |

---

## SUPPORT

- Documentation: This file
- AdBazaar: https://ad-bazaar.vercel.app
- Issues: GitHub Issues
- Internal: Slack #advertising-platform
