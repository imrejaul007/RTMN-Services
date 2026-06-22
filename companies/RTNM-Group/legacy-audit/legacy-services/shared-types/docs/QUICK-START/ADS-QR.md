# Quick Start - Ads QR Setup

> **Launch QR-based advertising campaigns in minutes**

---

## Overview

Ads QR enables:
- Quick campaign creation
- Bulk QR code generation
- Multi-step attribution tracking
- Coin rewards for engagement
- ROI analytics

---

## Prerequisites

- [Basic Setup Complete](./SETUP.md)
- AdBazaar app running
- Supabase configured

---

## Step 1: Create Campaign

### Via Dashboard

1. Go to `adBazaar/campaigns/new`
2. Enter campaign details
3. Set budget and rewards
4. Choose landing page template
5. Click "Create Campaign"

### Via API

```bash
curl -X POST http://localhost:3002/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Sale 2024",
    "description": "Get 20% off on all items",
    "landingUrl": "https://your-store.com/summer-sale",
    "landingTemplate": "promo",
    "budget": 50000,
    "rewards": {
      "scan": 10,
      "visit": 25,
      "purchase": 100
    },
    "startDate": "2024-06-01",
    "endDate": "2024-08-31"
  }'

# Response
{
  "id": "CAMP-uuid",
  "status": "draft",
  "name": "Summer Sale 2024",
  "budget": 50000,
  "rewards": {...}
}
```

---

## Step 2: Generate QR Codes

### Single QR

```bash
curl -X POST http://localhost:3002/api/campaigns/{campaignId}/qr \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Mumbai Mall - Entrance"
  }'

# Response
{
  "id": "QR-uuid",
  "slug": "abc123xyz",
  "qrUrl": "rez://ad/{campaignId}?source=qr",
  "landingUrl": "https://your-app.com/campaign/{campaignId}?ref=abc123xyz",
  "qrImage": "data:image/png;base64,..."
}
```

### Bulk QR Generation

```bash
curl -X POST http://localhost:3002/api/campaigns/{campaignId}/qr/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "count": 100,
    "locations": [
      "Mumbai Mall - Entrance",
      "Mumbai Mall - Food Court",
      "Delhi Mall - Entrance",
      "Bangalore Mall - Entrance"
    ],
    "prefix": "MUM"
  }'

# Response
{
  "batchId": "BATCH-uuid",
  "count": 100,
  "status": "processing",
  "downloadUrl": "/api/campaigns/{campaignId}/qr/bulk/{batchId}/download"
}
```

---

## Step 3: Configure Landing Pages

Choose from 3 templates:

| Template | Use Case | Features |
|----------|----------|----------|
| `promo` | Sales, discounts | Hero image, countdown, CTA |
| `product` | Product launches | Gallery, specs, buy button |
| `basic` | General | Logo, description, links |

### Landing Page Config

```bash
curl -PUT http://localhost:3002/api/campaigns/{campaignId} \
  -H "Content-Type: application/json" \
  -d '{
    "landingTemplate": "promo",
    "landingConfig": {
      "headline": "Summer Sale - Up to 50% Off!",
      "subheadline": "Limited time offer",
      "ctaText": "Shop Now",
      "heroImage": "https://example.com/summer.jpg",
      "brandColor": "#6B46C1",
      "expiresIn": "7 days"
    }
  }'
```

---

## Step 4: Activate Campaign

```bash
curl -X PUT http://localhost:3002/api/campaigns/{campaignId} \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

---

## Step 5: Track Attribution

### User Flow

1. User scans QR code
2. System records scan event
3. User redirected to landing page
4. System records visit (if GPS verified)
5. User makes purchase (tracked via pixel/webhook)
6. User claims rewards

### Attribution Events

```typescript
interface AttributionEvent {
  type: 'scan' | 'visit' | 'purchase';
  campaignId: string;
  qrCodeId: string;
  userId?: string;
  timestamp: string;
  metadata?: {
    deviceType?: string;
    location?: string;
    amount?: number;
    transactionId?: string;
  };
}
```

### Webhook for Purchases

```bash
# Set up purchase webhook
curl -X POST http://localhost:3002/api/campaigns/{campaignId}/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-store.com/api/ads-qr/purchase",
    "events": ["purchase"]
  }'
```

---

## Step 6: Test the Flow

### Automated Test

```bash
npx tsx scripts/test-qr-integration.ts --test=ads
```

### Manual Test

1. Scan QR code
2. Verify landing page loads
3. Check rewards credited
4. Review analytics dashboard

---

## API Reference

### Campaign Management

```bash
# List campaigns
GET /api/campaigns

# Get campaign
GET /api/campaigns/{id}

# Update campaign
PUT /api/campaigns/{id}

# Delete campaign
DELETE /api/campaigns/{id}

# Pause/Resume
PUT /api/campaigns/{id}/status
{"status": "paused" | "active"}
```

### QR Codes

```bash
# Generate single QR
POST /api/campaigns/{id}/qr

# Generate bulk QRs
POST /api/campaigns/{id}/qr/bulk

# Get QR stats
GET /api/qrcodes/{id}/stats

# Download bulk QRs
GET /api/campaigns/{id}/qr/bulk/{batchId}/download
```

### Attribution

```bash
# Record scan
POST /api/scan/{slug}

# Record visit
POST /api/visit

# Record purchase
POST /api/purchase

# Get ROI metrics
GET /api/analytics/attribution?campaignId={id}
```

### Rewards

```bash
# Claim reward
POST /api/rewards/claim

# Get balance
GET /api/rewards/balance?userId={id}

# Get history
GET /api/rewards/history?userId={id}
```

---

## Reward Configuration

```typescript
const REWARD_TIERS = {
  scan: {
    coins: 10,
    description: 'Scanned QR code',
    cooldown: 0, // No cooldown
  },
  visit: {
    coins: 25,
    description: 'Visited store location',
    cooldown: 3600, // 1 hour cooldown
    requiresGPS: true,
    radiusMeters: 100,
  },
  purchase: {
    coins: 100,
    description: 'Completed purchase',
    cooldown: 86400, // 24 hour cooldown
    minAmount: 100, // Minimum purchase amount
    maxCoins: 500, // Per-transaction cap
  },
};
```

---

## Database Schema

```sql
-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  landing_url TEXT,
  landing_template VARCHAR(50) DEFAULT 'basic',
  landing_config JSONB DEFAULT '{}',
  budget DECIMAL(12,2) NOT NULL,
  spent DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  rewards JSONB DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  attribution_window INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- QR Codes
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE NOT NULL,
  qr_url TEXT,
  location VARCHAR(255),
  batch_id UUID,
  scan_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Attribution Events
CREATE TABLE scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE,
  user_id UUID,
  device_type VARCHAR(50),
  ip_address VARCHAR(45),
  location VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Coin Transactions
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),
  amount INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Troubleshooting

### QR not scanning
- Verify QR code is not damaged
- Check URL scheme is correct
- Test with multiple scanner apps

### Rewards not credited
- Check user is authenticated
- Verify wallet service is running
- Review coin transaction logs

### Attribution not tracking
- Verify Supabase is connected
- Check scan event recorded
- Review attribution window settings

---

## Next Steps

| Task | Guide |
|------|-------|
| Full testing | [Testing Guide](./TESTING.md) |
| Deployment | [Deployment Guide](../DEPLOYMENT-GUIDE.md) |
| Analytics | [QR Systems Guide](../QR-SYSTEMS-COMPLETE-GUIDE.md) |

---

## Flow Diagram

```
Advertiser creates campaign
         │
         ▼
┌─────────────────┐
│ Generate QR     │
│ codes (single   │
│ or bulk)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Print + place   │
│ QRs at locations│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User scans QR   │
│                 │
│ System records  │
│ scan event      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User redirected │
│ to landing page │
│                 │
│ System records  │
│ visit event     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User visits     │
│ physical store  │
│ (GPS verified)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User makes      │
│ purchase        │
│                 │
│ Webhook records │
│ purchase event  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User claims     │
│ rewards         │
│ (Coins credited │
│ to wallet)      │
└─────────────────┘
```
