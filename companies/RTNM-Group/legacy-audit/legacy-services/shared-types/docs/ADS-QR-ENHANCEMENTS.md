# Ads QR Enhancements

Comprehensive documentation for the Ads QR platform enhancements including Self-Serve Wizard, Festival Templates, Fraud Detection, Brand Coins, Free Samples, and Retargeting Engine.

## Table of Contents

- [Self-Serve Campaign Wizard](#self-serve-campaign-wizard)
- [Festival Templates](#festival-templates)
- [Fraud Detection System](#fraud-detection-system)
- [Brand Coins System](#brand-coins-system)
- [Free Samples System](#free-samples-system)
- [Retargeting Engine](#retargeting-engine)

---

## Self-Serve Campaign Wizard

### Overview

A multi-step wizard that guides brands through creating QR code campaigns with minimal friction.

### Features

- **5-Step Process**: Campaign Type -> Offer Details -> Budget & Duration -> Locations -> Review & Launch
- **Auto-Save**: Progress is automatically saved to localStorage
- **Festival Themes**: Apply themed branding for festivals
- **Real-time Preview**: See campaign preview at each step
- **Reward Configuration**: Set scan, visit, and purchase rewards

### File Structure

```
adsqr/src/app/campaigns/create/page.tsx    - Campaign creation page
adsqr/src/components/wizard/CampaignWizard.tsx - Main wizard component
```

### Campaign Types

| Type | Description | Default Rewards |
|------|-------------|-----------------|
| `scan` | Reward users for scanning QR code | Scan: 10-25 |
| `visit` | Reward users who visit your store | Scan: 5-10, Visit: 25-50 |
| `purchase` | Reward users for making a purchase | Scan: 5, Visit: 10, Purchase: 50-100 |

### Offer Types

- **Coins**: REZ coin rewards
- **Discount**: Percentage or fixed discount
- **Sample**: Free product samples
- **Coupon**: Coupon code delivery

### Wizard State Interface

```typescript
interface WizardFormData {
  campaignType: 'scan' | 'visit' | 'purchase'
  name: string
  description: string
  offer: {
    type: 'coins' | 'discount' | 'sample' | 'coupon'
    coinsAmount?: number
    discountPercent?: number
    discountCode?: string
    sampleProduct?: string
    couponValue?: number
  }
  budget: number
  durationDays: number
  dailyLimit: number
  locations: Location[]
  festivalId?: string
  scanReward: number
  visitReward: number
  purchaseReward: number
}
```

---

## Festival Templates

### Overview

Pre-designed campaign themes for Indian and global festivals.

### Available Festivals

| Festival | Date | Duration | Suggested Rewards |
|----------|------|----------|-------------------|
| Diwali | Oct/Nov | 5 days | Scan: 15, Visit: 35, Purchase: 75 |
| Holi | March | 2 days | Scan: 12, Visit: 30, Purchase: 65 |
| Christmas | December | 25 days | Scan: 20, Visit: 40, Purchase: 100 |
| New Year | Dec 31 | 7 days | Scan: 25, Visit: 50, Purchase: 120 |
| Valentine's | Feb 14 | 14 days | Scan: 15, Visit: 35, Purchase: 80 |
| Rakhi | August | 5 days | Scan: 15, Visit: 35, Purchase: 70 |
| Eid | Variable | 3 days | Scan: 18, Visit: 40, Purchase: 85 |
| Independence Day | Aug 15 | 3 days | Scan: 12, Visit: 30, Purchase: 60 |
| Pongal | January | 4 days | Scan: 15, Visit: 35, Purchase: 75 |
| Ganesh Chaturthi | Aug/Sep | 10 days | Scan: 18, Visit: 40, Purchase: 90 |
| Navratri | Sep/Oct | 9 days | Scan: 16, Visit: 38, Purchase: 80 |
| Easter | Mar/Apr | 2 days | Scan: 15, Visit: 35, Purchase: 75 |
| Halloween | Oct 31 | 3 days | Scan: 15, Visit: 35, Purchase: 80 |
| Black Friday | Nov (4th Fri) | 4 days | Scan: 20, Visit: 45, Purchase: 100 |

### File Structure

```
adsqr/src/lib/templates/festivalConfig.ts      - Festival configuration
adsqr/src/components/templates/FestivalTemplate.tsx - Template components
```

### Usage

```typescript
import { FESTIVAL_TEMPLATES, FestivalId, getFestivalById, generateFestivalStyles } from '@/lib/templates/festivalConfig'

// Get a specific festival
const diwali = getFestivalById('diwali')

// Generate CSS styles for a festival
const styles = generateFestivalStyles('diwali')
// Returns: { primaryColor, secondaryColor, gradient, qrBorder }
```

---

## Fraud Detection System

### Overview

Comprehensive fraud detection to prevent abuse of the QR scanning rewards system.

### Detection Checks

1. **Device Velocity Check**: Detects scanning too fast
   - Max 3 scans per minute
   - Max 20 scans per hour
   - Min 20 seconds between scans

2. **GPS Spoofing Detection**: Identifies fake location data
   - Impossible coordinates check
   - Static location detection
   - Suspicious precision analysis

3. **VPN/Proxy Detection**: Identifies VPN usage
   - Known VPN IP ranges
   - Historical VPN activity

4. **Device Consistency Check**: Ensures device fingerprint consistency
   - Tracks device fingerprints
   - Detects cloned/emulated devices

5. **Impossible Travel Check**: Detects impossible travel speeds
   - Max 500 km/h travel speed
   - Geographic impossibility alerts

6. **Abuse Limits Check**: Enforces daily/monthly limits
   - Max 100 scans per day

7. **IP Reputation Check**: Tracks IP fraud history
   - Recent fraud attempts

8. **Multiple Devices Check**: Detects device spoofing
   - Max 5 devices per user

### Risk Scoring

| Score Range | Result | Action |
|-------------|--------|--------|
| 0-39 | Pass | Allow scan, credit coins |
| 40-69 | Flag | Allow scan, review queue |
| 70+ | Block | Block scan, no coins |

### File Structure

```
adsqr/src/lib/fraud/detection.ts       - Fraud detection engine
adsqr/src/app/api/fraud/check/route.ts - Fraud check API
adsqr/src/app/api/scan/[slug]/route.ts - Updated scan API with fraud check
```

### API Endpoints

#### POST /api/fraud/check

```typescript
// Request
{
  deviceId: string
  deviceFingerprint: string
  ip: string
  userAgent: string
  scanLocation?: { lat: number; lng: number }
  timestamp: string
  qrId: string
  campaignId: string
  userId?: string
}

// Response
{
  deviceId: string
  result: 'pass' | 'flag' | 'block'
  riskScore: number
  reasons: FraudReason[]
  checksPerformed: FraudCheck[]
  timestamp: string
}
```

---

## Brand Coins System

### Overview

Allows brands to create and distribute their own custom coin tokens.

### Features

- Create brand-specific coins with custom branding
- Set coin value and expiration
- Distribute coins to users
- Redemption catalog for rewards
- Convert brand coins to REZ coins

### File Structure

```
adsqr/src/lib/rewards/brandCoins.ts      - Brand coin manager
adsqr/src/components/brand/BrandCoinDashboard.tsx - Dashboard component
adsqr/src/app/api/brand-coins/route.ts  - Brand coins API
```

### BrandCoin Interface

```typescript
interface BrandCoin {
  id: string
  brandId: string
  name: string
  symbol: string
  description: string
  valueInRupees: number
  expirationDays: number
  totalSupply: number
  circulatingSupply: number
  logo: string
  primaryColor: string
  secondaryColor: string
  isActive: boolean
  minRedemptionAmount: number
  maxRedemptionAmount: number
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/brand-coins | List brand coins |
| POST | /api/brand-coins?action=create | Create new coin |
| POST | /api/brand-coins?action=distribute | Distribute coins |
| POST | /api/brand-coins?action=redeem | Redeem coins |
| POST | /api/brand-coins?action=convert | Convert to REZ |

---

## Free Samples System

### Overview

Enable brands to offer free product samples as rewards.

### Features

- Browse available samples
- Request samples
- Store availability check
- Pickup QR generation
- Feedback collection

### File Structure

```
adsqr/src/components/samples/SampleCatalog.tsx - Sample catalog component
adsqr/src/app/api/samples/route.ts            - Samples API
```

### Sample Request Flow

1. User requests sample -> Status: `pending`
2. Brand approves request -> Status: `approved`
3. Sample marked ready -> Status: `ready`
4. User picks up sample -> Status: `claimed`
5. User submits feedback -> Complete

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/samples?action=available | List available samples |
| GET | /api/samples?action=requests | Get user's requests |
| POST | /api/samples?action=request | Request a sample |
| POST | /api/samples?action=approve | Approve request |
| POST | /api/samples?action=claim | Claim sample at store |

---

## Retargeting Engine

### Overview

Automated follow-up campaigns based on user behavior.

### Trigger Types

| Trigger | Description | Default Delay |
|---------|-------------|--------------|
| `scan_no_visit` | User scanned but didn't visit | 24 hours |
| `visit_no_purchase` | User visited but didn't purchase | 48 hours |
| `abandoned_cart` | User left items in cart | 1 hour |
| `inactive_user` | User inactive for X days | Immediate |
| `purchase_complete` | After purchase | 24 hours |

### File Structure

```
adsqr/src/lib/retargeting/engine.ts      - Retargeting engine
adsqr/src/app/api/retargeting/route.ts  - Retargeting API
```

### Usage

```typescript
import { getRetargetingEngine } from '@/lib/retargeting/engine'

const engine = getRetargetingEngine()

// Trigger scan no visit
await engine.triggerScanNoVisit(userId, campaignId)

// Trigger visit no purchase
await engine.triggerVisitNoPurchase(userId, campaignId)

// Schedule follow-up
await engine.scheduleFollowUp(userId, campaignId, 24)
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/retargeting?action=offers | Get user offers |
| GET | /api/retargeting?action=engagement | Get engagement data |
| POST | /api/retargeting?action=scan_no_visit | Trigger scan no visit |
| POST | /api/retargeting?action=visit_no_purchase | Trigger visit no purchase |
| POST | /api/retargeting?action=abandoned_cart | Trigger abandoned cart |
| POST | /api/retargeting?action=followup | Schedule follow-up |

---

## AdBazaar Dashboard

### Pages

| Page | Path | Description |
|------|------|-------------|
| Main Dashboard | /dashboard | Overview stats and quick actions |
| Fraud Detection | /dashboard/fraud | Monitor fraudulent activity |
| Brand Coins | /dashboard/brand-coins | Manage brand coins |
| Free Samples | /dashboard/samples | Manage samples and requests |

### File Structure

```
adBazaar/src/app/dashboard/page.tsx          - Main dashboard
adBazaar/src/app/dashboard/fraud/page.tsx     - Fraud dashboard
adBazaar/src/app/dashboard/brand-coins/page.tsx - Brand coins page
adBazaar/src/app/dashboard/samples/page.tsx   - Samples page
```

---

## Database Tables

The following tables are required for the enhancements:

```sql
-- Fraud Detection
CREATE TABLE fraud_logs (
  id UUID PRIMARY KEY,
  device_id VARCHAR,
  device_fingerprint TEXT,
  ip VARCHAR,
  qr_id UUID,
  campaign_id UUID,
  user_id UUID,
  latitude DECIMAL,
  longitude DECIMAL,
  risk_score INTEGER,
  result VARCHAR,
  reasons JSONB,
  checks_performed JSONB,
  created_at TIMESTAMP
);

CREATE TABLE fraud_review_queue (
  id UUID PRIMARY KEY,
  scan_event_id UUID,
  device_id VARCHAR,
  user_id UUID,
  risk_score INTEGER,
  reasons JSONB,
  status VARCHAR,
  created_at TIMESTAMP
);

-- Brand Coins
CREATE TABLE brand_coins (
  id UUID PRIMARY KEY,
  brand_id UUID,
  name VARCHAR,
  symbol VARCHAR,
  description TEXT,
  value_in_rupees DECIMAL,
  expiration_days INTEGER,
  total_supply INTEGER,
  circulating_supply INTEGER,
  logo TEXT,
  primary_color VARCHAR,
  secondary_color VARCHAR,
  is_active BOOLEAN,
  min_redemption_amount INTEGER,
  max_redemption_amount INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE brand_coin_balances (
  id UUID PRIMARY KEY,
  user_id UUID,
  brand_id UUID,
  coin_id UUID,
  balance INTEGER,
  lifetime_earned INTEGER,
  lifetime_redeemed INTEGER,
  earned_at TIMESTAMP,
  expires_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  status VARCHAR
);

CREATE TABLE brand_coin_transactions (
  id UUID PRIMARY KEY,
  coin_id UUID,
  user_id UUID,
  brand_id UUID,
  type VARCHAR,
  amount INTEGER,
  balance_before INTEGER,
  balance_after INTEGER,
  reason TEXT,
  reference_id UUID,
  campaign_id UUID,
  created_at TIMESTAMP
);

CREATE TABLE coin_redemption_catalog (
  id UUID PRIMARY KEY,
  coin_id UUID,
  brand_id UUID,
  name VARCHAR,
  description TEXT,
  type VARCHAR,
  coin_cost INTEGER,
  rupee_value DECIMAL,
  stock INTEGER,
  max_per_user INTEGER,
  image TEXT,
  is_active BOOLEAN,
  expires_at TIMESTAMP,
  terms TEXT
);

-- Samples
CREATE TABLE sample_products (
  id UUID PRIMARY KEY,
  campaign_id UUID,
  brand_id UUID,
  name VARCHAR,
  description TEXT,
  category VARCHAR,
  image TEXT,
  stock INTEGER,
  max_per_user INTEGER,
  value DECIMAL,
  expiry_date TIMESTAMP,
  terms TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP
);

CREATE TABLE sample_requests (
  id UUID PRIMARY KEY,
  sample_id UUID,
  user_id UUID,
  product_name VARCHAR,
  status VARCHAR,
  pickup_code VARCHAR,
  pickup_location JSONB,
  requested_at TIMESTAMP,
  approved_at TIMESTAMP,
  expires_at TIMESTAMP,
  claimed_at TIMESTAMP,
  feedback JSONB
);

-- Retargeting
CREATE TABLE retargeting_triggers (
  id UUID PRIMARY KEY,
  user_id UUID,
  campaign_id UUID,
  trigger_type VARCHAR,
  status VARCHAR,
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  offer JSONB,
  created_at TIMESTAMP
);

CREATE TABLE retargeting_campaigns (
  id UUID PRIMARY KEY,
  name VARCHAR,
  campaign_id UUID,
  trigger_type VARCHAR,
  delay_hours INTEGER,
  offer JSONB,
  is_active BOOLEAN,
  max_recipients INTEGER,
  sent_count INTEGER,
  created_at TIMESTAMP
);

-- Additional Scan Events
ALTER TABLE scan_events ADD COLUMN device_id VARCHAR;
ALTER TABLE scan_events ADD COLUMN device_fingerprint TEXT;
ALTER TABLE scan_events ADD COLUMN ip_address VARCHAR;
ALTER TABLE scan_events ADD COLUMN latitude DECIMAL;
ALTER TABLE scan_events ADD COLUMN longitude DECIMAL;
ALTER TABLE scan_events ADD COLUMN fraud_check_result VARCHAR;
ALTER TABLE scan_events ADD COLUMN fraud_risk_score INTEGER;
ALTER TABLE scan_events ADD COLUMN fraud_flagged BOOLEAN;
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URLs
NEXT_PUBLIC_APP_URL=https://adsqr.rezapp.com
NEXT_PUBLIC_ADBAZAAR_URL=https://adbazaar.rezapp.com
```

---

## Security Considerations

1. **Fraud Detection**: All scans are checked before crediting coins
2. **Rate Limiting**: Device velocity checks prevent rapid scanning
3. **Location Verification**: GPS spoofing detection ensures genuine locations
4. **Device Fingerprinting**: Tracks device consistency
5. **IP Reputation**: Tracks and blocks bad actors

---

## Version

- **Version**: 1.0.0
- **Last Updated**: 2024-08-15
- **Author**: ReZ Team
