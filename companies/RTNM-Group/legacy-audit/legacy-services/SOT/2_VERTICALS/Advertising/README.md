# Advertising Vertical - System of Truth

> Last Updated: 2026-05-10

## Overview

The REZ Advertising Vertical provides a complete closed-loop advertising ecosystem that connects physical advertising surfaces with digital engagement and attribution. It enables merchants to monetize ad spaces and advertisers to reach audiences with measurable ROI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REZ ADVERTISING ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        REZ MIND                               │  │
│  │              (User behavior + context signals)                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                         ADOS                                   │  │
│  │              (Ad Decision + Optimization Engine)              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│         ┌──────────────────┼──────────────────┐                     │
│         │                  │                  │                      │
│         ▼                  ▼                  ▼                      │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐                │
│   │ AdBazaar  │    │  AdsQr    │    │   DOOH    │                │
│   │ Marketplace│    │ QR Campaigns│   │  Screens  │                │
│   └───────────┘    └───────────┘    └───────────┘                │
│         │                  │                  │                      │
│         └──────────────────┼──────────────────┘                     │
│                            ▼                                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │               ATTRIBUTION + WALLET                             │  │
│  │          (Scan → Visit → Purchase → Coins)                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Components

| Component | Description | Status |
|-----------|-------------|--------|
| **AdBazaar** | Marketplace for ad inventory (listings, bookings, payments) | Production |
| **AdsQr** | QR code campaign management and scanning | Production |
| **DOOH** | Digital Out of Home screen network management | Production |
| **AdOS** | Ad decision and optimization engine | Production |
| **REZ Mind** | Context signals and user behavior intelligence | Production |
| **Attribution** | Full-funnel attribution tracking | Production |
| **Wallet** | REZ coin credits and rewards | Production |

---

## Core Flows

### 1. Merchant Onboarding

```
Merchant registers → REZ Auth validates → Profile created → Dashboard ready
```

### 2. Campaign Creation

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

### 3. QR Code Attribution Flow

```
User scans QR
         │
         ▼
    ┌────────────────┐
    │ 1. Scan event  │ ← /api/qr/scan/[slug]
    │ 2. Visit (GPS) │ ← /api/visit
    │ 3. Purchase    │ ← /api/purchase
    │ 4. Coins credit│ ← REZ Wallet API
    │ 5. ROI calc    │ ← AdOS ROI Engine
    └────────────────┘
```

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Physical Ad Space                                                    │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────┐    QR Scan    ┌─────────────────┐              │
│  │   AdBazaar      │◄──────────────►│     AdsQr       │              │
│  │  (Listings,      │                │   (QR Codes,     │              │
│  │   Bookings)      │                │    Campaigns)    │              │
│  └────────┬────────┘                └────────┬─────────┘              │
│           │                                  │                        │
│           │          ┌─────────────────┐     │                        │
│           └──────────►│   Supabase      │◄────┘                        │
│                       │  (PostgreSQL)   │                              │
│                       └────────┬────────┘                              │
│                                │                                      │
│           ┌────────────────────┼────────────────────┐                │
│           │                    │                    │                │
│           ▼                    ▼                    ▼                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  REZ Wallet     │  │  REZ Marketing  │  │   AdOS /         │    │
│  │  (Coin Credits) │  │  (Broadcasts)   │  │   DOOH Engine    │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### AdBazaar (Marketplace)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/listings` | Create new listing |
| `GET` | `/api/listings` | List/search listings |
| `GET` | `/api/listings/[id]` | Get listing details |
| `POST` | `/api/bookings` | Create booking |
| `GET` | `/api/bookings` | List bookings |
| `POST` | `/api/bookings/verify-payment` | Verify payment |
| `POST` | `/api/inquiries/[id]/quote` | Submit quote |
| `GET` | `/api/attribution` | Get attribution analytics |

### AdsQr (QR Campaigns)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/campaigns` | Create campaign |
| `POST` | `/api/campaigns/[id]/qr/bulk` | Bulk generate QR codes |
| `GET` | `/api/qr/scan/[slug]` | Handle QR scan |
| `POST` | `/api/qr/scan/[slug]` | Credit coins (authenticated) |
| `POST` | `/api/visit` | Record store visit |
| `POST` | `/api/purchase` | Record purchase |
| `GET` | `/api/analytics/attribution` | Attribution analytics |

### DOOH (Screens)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/screens/register` | Register new screen |
| `GET` | `/api/screens` | List screens |
| `POST` | `/api/playlist/generate` | Generate playlist |
| `POST` | `/api/heartbeat` | Screen heartbeat |

---

## Environment Configuration

### AdBazaar Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Payment (Razorpay)
RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx

# REZ Services
REZ_API_BASE_URL=https://api.rezapp.com/api
REZ_WALLET_SERVICE_URL=https://rez-wallet-service.onrender.com
REZ_MARKETING_SERVICE_URL=https://rez-marketing-service.onrender.com
REZ_PAYMENT_SERVICE_URL=https://rez-payment-service.onrender.com
ADBAZAAR_INTERNAL_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=https://ad-bazaar.vercel.app
```

### DOOH Environment Variables

```bash
DOOH_SERVER_URL=https://dooh.rezapp.com
DOOH_API_KEY=xxx
```

---

## Database Schema

### Supabase Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (vendors and buyers) |
| `listings` | Ad inventory and spaces |
| `campaigns` | Ad campaigns |
| `bookings` | Booking transactions |
| `qr_codes` | QR code tracking records |
| `scan_events` | QR scan attribution events |
| `visit_events` | Store visit events (GPS) |
| `purchase_events` | Purchase conversion events |
| `attribution` | Attribution linking |
| `coin_transactions` | Wallet ledger |

---

## Commission Rates

| Category | Rate |
|----------|------|
| Outdoor OOH | 12% |
| Transit Infrastructure | 12% |
| Property Spaces | 12% |
| Local Business | 15% |
| Print Broadcast | 10% |
| Influencer | 20% |
| Digital | 18% |
| Unconventional | 15% |

---

## Security Measures

1. **Idempotency**: Booking creation uses idempotency keys to prevent duplicate bookings
2. **Signature Verification**: All payment webhooks verified with HMAC-SHA256
3. **Rate Limiting**: Upstash Redis for distributed rate limiting
4. **Multi-factor Cooldown**: IP + device fingerprint + user cooldown for QR scans
5. **Input Validation**: Zod schemas for all API inputs
6. **SQL Injection Prevention**: Wildcard escaping for LIKE/ilike queries

---

## Related Documentation

- [AdBazaar Service](01_ADBAZAAR.md)
- [AdsQr Service](02_ADSQR.md)
- [DOOH Network](03_DOOH.md)
- [Creator App](04_CREATOR_APP.md)

---

## Support

- **Documentation**: This directory
- **AdBazaar App**: https://ad-bazaar.vercel.app
- **Issues**: GitHub Issues
- **Internal**: Slack #advertising-platform
