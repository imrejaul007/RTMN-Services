# Creator App

> Last Updated: 2026-05-10

## Overview

The Creator App enables influencers and content creators to manage their advertising partnerships through the REZ ecosystem. It provides tools for creators to track sponsored content, manage QR code placements, and monitor earnings from advertising campaigns.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CREATOR APP                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Mobile App (React Native)                 │  │
│  │  • Dashboard        • Content Manager        • Earnings       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      REZ API Gateway                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│         ┌──────────────────┼──────────────────┐                     │
│         ▼                  ▼                  ▼                      │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│  │  AdBazaar   │   │   AdsQr     │   │  Analytics   │            │
│  │  (Listings) │   │  (QR Mgmt)  │   │  (Reports)   │            │
│  └─────────────┘   └─────────────┘   └─────────────┘            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Features

### Campaign Management

- View sponsored content campaigns
- Track campaign status and deliverables
- Manage content approval workflow
- Access creative assets and guidelines

### QR Code Integration

- Generate QR codes for sponsored posts
- Track QR scan performance
- View engagement analytics
- Monitor referral conversions

### Earnings Dashboard

- Track earnings from multiple campaigns
- View payment history
- Manage payout settings
- Access tax documents

### Content Calendar

- Schedule sponsored content
- View upcoming deliverables
- Receive deadline reminders
- Coordinate with brand managers

## Integration with AdBazaar

The Creator App connects to AdBazaar for influencer listings:

### Listing Categories (Influencer)

| Subcategory | Description |
|-------------|-------------|
| Instagram Feed Post | Static image post |
| Instagram Story | 24-hour story |
| Instagram Reel | Short-form video |
| Instagram Bio Link | Bio mention |
| Instagram Caption Mention | Caption endorsement |
| Instagram Live Mention | Live stream mention |
| YouTube Sponsored Video | Full video sponsorship |
| YouTube Pre/Mid-Roll | Ad placement in video |
| LinkedIn Post | Professional post |
| Twitter/X Thread | Tweet thread |

### Commission Rate

Influencer campaigns have a **20% platform commission**.

## QR Code Placement Types

Creators can place branded QR codes in:

- Instagram bio links
- YouTube video descriptions
- TikTok profile
- YouTube Shorts
- Podcast show notes
- Email signatures
- Physical merchandise

## User Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CREATOR WORKFLOW                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   1. ONBOARD                                                        │
│      Creator registers → Profile verified → Access granted                │
│      │                                                                │
│      ▼                                                                │
│   2. DISCOVER CAMPAIGNS                                             │
│      Browse available campaigns → Apply/accept invitations             │
│      │                                                                │
│      ▼                                                                │
│   3. CREATE CONTENT                                                 │
│      Create sponsored post → Submit for approval                       │
│      │                                                                │
│      ▼                                                                │
│   4. GENERATE QR                                                    │
│      Generate tracking QR → Place in content                          │
│      │                                                                │
│      ▼                                                                │
│   5. TRACK PERFORMANCE                                              │
│      Monitor scans → View engagement → Track conversions              │
│      │                                                                │
│      ▼                                                                │
│   6. EARN REWARDS                                                   │
│      Receive coin rewards → Track earnings → Request payout          │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## API Integration

### Authentication

```typescript
// OAuth2 flow with REZ Auth
POST /api/auth/creator/login
POST /api/auth/creator/refresh
POST /api/auth/creator/logout
```

### Campaign APIs

```typescript
// Get available campaigns
GET /api/creator/campaigns
Query: { status?: 'open' | 'assigned' | 'completed' }

// Get campaign details
GET /api/creator/campaigns/:id

// Accept campaign
POST /api/creator/campaigns/:id/accept

// Submit content for review
POST /api/creator/campaigns/:id/submit
Body: {
  contentUrl: string
  caption?: string
  scheduledAt?: string
}
```

### QR Code APIs

```typescript
// Generate tracking QR
POST /api/creator/qr/generate
Body: {
  campaignId: string
  placementType: 'instagram' | 'youtube' | 'twitter' | 'other'
  customMessage?: string
}

// Get QR analytics
GET /api/creator/qr/:id/analytics
```

### Earnings APIs

```typescript
// Get earnings summary
GET /api/creator/earnings
Query: { period?: 'week' | 'month' | 'year' }

// Get payment history
GET /api/creator/earnings/history

// Request payout
POST /api/creator/earnings/payout
```

## REZ Coin Integration

Creators earn REZ coins for:

| Action | Reward |
|--------|--------|
| Content viewed | 1-5 coins |
| QR scan | 20 coins |
| Store visit | 100 bonus |
| Purchase referral | 5% of amount |

### Coin Redemption

```typescript
// Check balance
GET /api/creator/wallet/balance

// Redeem coins
POST /api/creator/wallet/redeem
Body: {
  amount: number
  method: 'cash' | 'gift_card' | 'crypto'
}
```

## Technical Stack

### Mobile App

- **Framework**: React Native (Expo)
- **State Management**: Zustand
- **API Client**: Axios with interceptors
- **Navigation**: React Navigation
- **Storage**: AsyncStorage + SecureStorage

### Backend

- **Framework**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: REZ Auth Service
- **Payments**: REZ Wallet Service

## File Structure

```
creator-app/
├── src/
│   ├── screens/
│   │   ├── Dashboard/
│   │   ├── Campaigns/
│   │   ├── Content/
│   │   ├── QRGenerator/
│   │   ├── Earnings/
│   │   └── Profile/
│   ├── components/
│   │   ├── CampaignCard/
│   │   ├── QRCodePreview/
│   │   ├── EarningsChart/
│   │   └── common/
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── analytics.ts
│   ├── store/
│   │   └── useCreatorStore.ts
│   └── types/
│       └── index.ts
├── App.tsx
├── package.json
└── app.json
```

## Environment Variables

```bash
# API
NEXT_PUBLIC_API_URL=https://api.rezapp.com

# Auth
REZ_AUTH_SERVICE_URL=https://auth.rezapp.com
REZ_OAUTH_CLIENT_ID=creator-app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=https://creator.rezapp.com
```

## Security Considerations

### Creator Verification

- KYC document upload
- Social account verification
- Minimum follower threshold
- Content policy agreement

### Content Guidelines

- Brand safety compliance
- FTC disclosure requirements
- Platform-specific policies
- Content review workflow

## Related Documentation

- [README](README.md) - Advertising vertical overview
- [AdBazaar](01_ADBAZAAR.md) - Marketplace service
- [AdsQr](02_ADSQR.md) - QR campaigns
- [DOOH](03_DOOH.md) - Screen network
