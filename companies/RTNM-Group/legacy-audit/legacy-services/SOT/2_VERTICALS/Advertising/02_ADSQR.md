# AdsQr Service

> Last Updated: 2026-05-10

## Overview

AdsQr is the QR code campaign management service within the REZ advertising ecosystem. It enables merchants and advertisers to create QR code campaigns that drive consumer engagement, attribute store visits, and credit REZ coins for scanning.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ADSQR                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     QR Campaign Dashboard                       │  │
│  │  • Create Campaigns    • Generate QR Codes    • Track Scans   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Supabase Database                          │  │
│  │  (campaigns, qr_codes, scan_events, attribution)              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      REZ Wallet API                            │  │
│  │                  (Coin Credits + Rewards)                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Features

### QR Code Campaigns

- **Bulk Generation**: Create multiple QR codes for physical placement
- **Custom Rewards**: Configure coins per scan, visit bonus, purchase bonus
- **Analytics**: Track scans, visits, and conversions
- **Attribution**: Full-funnel tracking from scan to purchase

### Reward Structure

| Reward Type | Default | Description |
|-------------|---------|-------------|
| Coins per Scan | 20 | REZ coins earned on scan |
| Visit Bonus | 100 | Bonus coins on first visit |
| Purchase Bonus | 5% | Percentage of purchase credited |

### Campaign Types

1. **Listing-based**: QR codes attached to AdBazaar listings
2. **Independent**: Standalone QR campaigns
3. **Broadcast**: Integrated with REZ marketing broadcasts

## QR Code Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        QR CODE LIFECYCLE                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   1. CREATE CAMPAIGN                                                │
│      Merchant creates campaign → QR codes generated                    │
│      │                                                                │
│      ▼                                                                │
│   2. PLACE QR CODES                                                  │
│      Print + place at physical locations                              │
│      │                                                                │
│      ▼                                                                │
│   3. USER SCANS                                                      │
│      GET /api/qr/scan/[slug] → Records scan event                    │
│      │                                                                │
│      ▼                                                                │
│   4. APP REDIRECT                                                    │
│      User → REZ App → POST /api/qr/scan/[slug]                       │
│      │                                                                │
│      ▼                                                                │
│   5. COINS CREDITED                                                  │
│      REZ Wallet API → Coins credited                                  │
│      │                                                                │
│      ▼                                                                │
│   6. VISIT TRACKING                                                  │
│      POST /api/visit → GPS location verified                          │
│      │                                                                │
│      ▼                                                                │
│   7. PURCHASE ATTRIBUTION                                            │
│      POST /api/purchase → Revenue attributed                          │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## Key API Endpoints

### QR Scan Handling

```typescript
// GET /api/qr/scan/[slug]
// Records scan event, returns redirect to landing page
// - Checks cooldown (IP, device fingerprint, user)
// - Records scan event with geolocation
// - Returns redirect with scanEventId

// POST /api/qr/scan/[slug]
// Credits coins (authenticated via Bearer token)
// Request: { scanEventId: string }
// Response: {
//   success: boolean,
//   coinsEarned: number,
//   isFirstVisit: boolean,
//   visitBonusCredited: number
// }
```

### Visit Tracking

```typescript
// POST /api/visit
interface VisitRequest {
  scanEventId: string
  qrSlug: string
  merchantId: string
  latitude: number
  longitude: number
  timestamp: string
}
```

### Purchase Attribution

```typescript
// POST /api/purchase
interface PurchaseRequest {
  scanEventId: string
  qrSlug: string
  merchantId: string
  amount: number
  receiptId?: string
}
```

### Analytics

```typescript
// GET /api/analytics/attribution
interface AttributionAnalytics {
  campaignId: string
  totalScans: number
  uniqueScanners: number
  totalVisits: number
  totalPurchases: number
  revenueAttributed: number
  roi: number
  costPerScan: number
  costPerVisit: number
}
```

## Security Measures

### Multi-factor Cooldown System

Prevents abuse on shared networks (offices, universities):

```typescript
interface CooldownCheck {
  // 1. Device fingerprint cooldown (30 min)
  // 2. IP cooldown (30 min) - lenient for shared networks
  // 3. Authenticated user cooldown (60 min) - strict
}
```

### Anti-Gaming Protections

1. **IP Validation**: Only trusts `x-real-ip` from trusted proxies
2. **Private IP Rejection**: Blocks localhost, RFC 1918, link-local
3. **Device Fingerprint**: Stored from REZ app header
4. **User Cooldown**: 60-minute cooldown per user per QR
5. **First Visit Bonus**: Only credited on first scan of QR

### Idempotency

Scan endpoint is idempotent - re-crediting is prevented:

```typescript
if (scanEvent.rez_coins_credited) {
  return { success: true, alreadyCredited: true }
}
```

## Scan Event Data Model

```typescript
interface ScanEvent {
  id: string
  qrId: string
  userId?: string | null          // From authenticated session
  deviceFingerprint?: string | null
  ipAddress: string
  userAgent?: string | null
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown'
  lat?: number | null
  lng?: number | null
  cityDerived?: string | null
  countryDerived?: string | null
  rezAppOpened: boolean
  rezCoinsCredited: boolean
  coinsAmount: number
  timestamp: string
}
```

## Integration with REZ Services

### Wallet Integration

```typescript
// Coin credit via REZ API
POST ${REZ_API_BASE_URL}/api/adbazaar/scan
Headers: { 'x-internal-key': REZ_INTERNAL_KEY }
Body: {
  rezUserId: string
  qrCodeId: string
  merchantId: string
  coinsAmount: number
  visitBonusCoins: number
  scanEventId: string
  adPlacementTitle: string
}
```

### Dead Letter Queue

Failed coin credits are recorded for retry:

```typescript
interface FailedCoinCredit {
  scanEventId: string
  userId: string
  merchantId: string
  coinsAmount: number
  attempts: number
  lastAttempt: string
  nextRetry: string
  status: 'pending' | 'retrying' | 'failed'
  errorMessage: string
}
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# REZ Integration
REZ_API_BASE_URL=https://api.rezapp.com/api
REZ_INTERNAL_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=https://ad-bazaar.vercel.app
NEXT_PUBLIC_REZ_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.rez.money
```

## File Structure

```
adsqr/
├── index.ts                    # Main entry point
├── types.ts                    # TypeScript types
├── services/
│   └── screenService.ts        # Screen management
├── package.json
└── vercel.json
```

## Related Documentation

- [README](README.md) - Advertising vertical overview
- [AdBazaar](01_ADBAZAAR.md) - Marketplace service
- [DOOH](03_DOOH.md) - Screen network
