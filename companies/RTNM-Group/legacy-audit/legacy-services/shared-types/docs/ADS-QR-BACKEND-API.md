# Ads QR Backend API Documentation

Complete API reference for the Ads QR backend services.

## Base URL

```
Production: https://api.adsqr.rez.money
Staging: https://api-staging.adsqr.rez.money
Local: http://localhost:3000
```

## Authentication

Most endpoints require Bearer token authentication:

```
Authorization: Bearer <access_token>
```

## Table of Contents

1. [Attribution Endpoints](#attribution-endpoints)
2. [Brand Coin Management](#brand-coin-management)
3. [Free Samples](#free-samples)
4. [Consultation Booking](#consultation-booking)
5. [Wallet Integration](#wallet-integration)
6. [Auth Integration](#auth-integration)
7. [Database Schema](#database-schema)

---

## Attribution Endpoints

### Verify Visit

Record a verified visit event with GPS location and dwell time.

**Endpoint:** `POST /api/v1/attribution/verify-visit`

**Request:**
```json
{
  "scanEventId": "uuid",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "dwellTime": 120,
  "userId": "uuid (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "visit": {
    "id": "uuid",
    "locationVerified": true,
    "locationDistance": 45.2,
    "dwellTimeVerified": true,
    "dwellTime": 120,
    "rewardAmount": 25,
    "rewardCredited": true
  },
  "metadata": {
    "qrLocation": "Store Entrance",
    "qrLabel": "QR-001",
    "campaignName": "Summer Sale"
  }
}
```

**Verification Rules:**
- Location must be within 100 meters of QR code
- Dwell time must be at least 30 seconds

---

### Record Purchase

Record a purchase event and credit rewards.

**Endpoint:** `POST /api/v1/attribution/purchase`

**Request:**
```json
{
  "scanEventId": "uuid (optional)",
  "amount": 500.00,
  "currency": "INR",
  "transactionId": "POS-123456",
  "items": ["Product A", "Product B"],
  "userId": "uuid (optional)",
  "merchantId": "uuid",
  "merchantName": "Store Name",
  "storeId": "uuid",
  "posLocation": "Counter 1"
}
```

**Response:**
```json
{
  "success": true,
  "purchase": {
    "id": "uuid",
    "amount": 500.00,
    "attributedRevenue": 25.00,
    "rewards": {
      "purchaseReward": 50,
      "brandCoins": 10,
      "total": 60
    },
    "credited": false
  },
  "attribution": {
    "source": "visit",
    "rate": 0.05,
    "campaignName": "Summer Sale"
  }
}
```

**Attribution Rate:** 5% of purchase amount is attributed to QR attribution.

---

### Attribution Funnel

Get detailed conversion funnel for a campaign.

**Endpoint:** `GET /api/v1/attribution/funnel/:campaignId`

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Summer Sale",
    "status": "active",
    "scanReward": 10,
    "visitReward": 25,
    "purchaseReward": 50
  },
  "funnel": {
    "totalScans": 1500,
    "verifiedVisits": 450,
    "purchases": 120,
    "totalRevenue": 60000.00,
    "attributedRevenue": 3000.00,
    "conversionRates": {
      "scanToVisit": 30.0,
      "visitToPurchase": 26.67,
      "overall": 8.0
    }
  },
  "metrics": {
    "uniqueUsers": 1200,
    "avgPurchaseValue": 500.00,
    "avgCoinsPerScan": 5.33
  },
  "dailyBreakdown": [
    { "date": "2026-05-01", "scans": 100, "visits": 30, "purchases": 8 },
    { "date": "2026-05-02", "scans": 150, "visits": 45, "purchases": 12 }
  ]
}
```

---

## Brand Coin Management

### Create Brand Coins

Create a new brand-specific coin (admin only).

**Endpoint:** `POST /api/v1/brand-coins/create`

**Request:**
```json
{
  "brandId": "uuid",
  "name": "Brand Rewards Coin",
  "symbol": "BRC",
  "initialSupply": 1000000,
  "description": "Exclusive rewards for Brand customers",
  "iconUrl": "https://cdn.example.com/coin-icon.png"
}
```

**Response:**
```json
{
  "success": true,
  "brandCoin": {
    "id": "uuid",
    "brandId": "uuid",
    "name": "Brand Rewards Coin",
    "symbol": "BRC",
    "initialSupply": 1000000,
    "currentSupply": 1000000,
    "status": "active"
  }
}
```

---

### Distribute Brand Coins

Distribute brand coins to a user.

**Endpoint:** `POST /api/v1/brand-coins/distribute`

**Request:**
```json
{
  "brandId": "uuid",
  "userId": "uuid",
  "amount": 100,
  "reason": "purchase_reward",
  "campaignId": "uuid",
  "metadata": { "orderId": "ORD-123" }
}
```

**Response:**
```json
{
  "success": true,
  "distribution": {
    "id": "uuid",
    "amount": 100,
    "reason": "purchase_reward",
    "brandCoinName": "Brand Rewards Coin",
    "brandCoinSymbol": "BRC"
  },
  "newSupply": 999900
}
```

---

### Get Brand Coin Balance

Get brand coin balance for a user.

**Endpoint:** `GET /api/v1/brand-coins/:brandId/balance/:userId`

**Response:**
```json
{
  "success": true,
  "brand": {
    "id": "uuid",
    "brandId": "uuid",
    "name": "Brand Rewards Coin",
    "symbol": "BRC"
  },
  "balance": {
    "available": 500,
    "locked": 0,
    "total": 500,
    "totalEarned": 750,
    "totalSpent": 250
  },
  "history": [
    {
      "id": "uuid",
      "amount": 100,
      "reason": "purchase_reward",
      "campaignId": "uuid",
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ]
}
```

---

## Free Samples

### Get Available Samples

Get available free samples for a campaign.

**Endpoint:** `GET /api/v1/samples/available/:campaignId`

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Summer Sale",
    "brandColor": "#FF5722"
  },
  "samples": [
    {
      "id": "uuid",
      "name": "Free Perfume Sample",
      "description": "Try our new fragrance",
      "imageUrl": "https://cdn.example.com/sample.jpg",
      "quantity": 100,
      "quantityRemaining": 45,
      "coinCost": 0,
      "isAvailable": true,
      "isClaimed": false
    }
  ],
  "summary": {
    "totalSamples": 5,
    "availableCount": 4,
    "claimedCount": 0
  }
}
```

---

### Request Sample

Request a free sample.

**Endpoint:** `POST /api/v1/samples/request`

**Request:**
```json
{
  "campaignId": "uuid",
  "userId": "uuid",
  "sampleId": "uuid",
  "storeId": "uuid (optional)",
  "preferredDate": "2026-05-15",
  "contactEmail": "user@example.com",
  "notes": "Please have it ready"
}
```

**Response:**
```json
{
  "success": true,
  "request": {
    "id": "uuid",
    "status": "pending",
    "redemptionCode": "SMP-A1B2C3D4",
    "sampleName": "Free Perfume Sample",
    "coinCost": 0
  },
  "instructions": {
    "message": "Visit the store and show this code to claim your sample.",
    "validUntil": "2026-06-30"
  }
}
```

---

### Get Redemption Details

Get redemption details by code.

**Endpoint:** `GET /api/v1/samples/redemption/:code`

**Response:**
```json
{
  "success": true,
  "redemption": {
    "id": "uuid",
    "code": "SMP-A1B2C3D4",
    "status": "pending",
    "isExpired": false,
    "sample": {
      "id": "uuid",
      "name": "Free Perfume Sample",
      "description": "Try our new fragrance",
      "imageUrl": "https://cdn.example.com/sample.jpg",
      "terms": "One per customer"
    },
    "store": {
      "id": "uuid",
      "name": "Brand Store - Mall",
      "address": "123 Shopping Street",
      "location": { "lat": 12.9716, "lng": 77.5946 }
    }
  }
}
```

---

### Claim Sample

Claim a free sample using redemption code (store staff).

**Endpoint:** `POST /api/v1/samples/redemption/:code/claim`

**Request:**
```json
{
  "claimedBy": "staff-uuid",
  "claimedAt": "2026-05-10T14:30:00Z",
  "notes": "Customer ID verified"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sample claimed successfully",
  "redemption": {
    "id": "uuid",
    "code": "SMP-A1B2C3D4",
    "status": "claimed",
    "claimedAt": "2026-05-10T14:30:00Z",
    "claimedBy": "staff-uuid"
  }
}
```

---

## Consultation Booking

### Get Available Consultations

Get available consultation types for a campaign.

**Endpoint:** `GET /api/v1/consultations/available/:campaignId`

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Skincare Consultation",
    "brandColor": "#4CAF50"
  },
  "consultationTypes": [
    {
      "id": "uuid",
      "name": "Skin Analysis",
      "description": "Professional skin type analysis",
      "duration": 30,
      "coinCost": 0,
      "mode": "in_store",
      "requiredDocuments": ["Photo ID"],
      "availableSlots": 5,
      "isBooked": false
    },
    {
      "id": "uuid",
      "name": "Video Consultation",
      "description": "Expert advice via video call",
      "duration": 45,
      "coinCost": 50,
      "mode": "video",
      "availableSlots": 10,
      "isBooked": false
    }
  ]
}
```

---

### Book Consultation

Book a consultation.

**Endpoint:** `POST /api/v1/consultations/book`

**Request:**
```json
{
  "campaignId": "uuid",
  "userId": "uuid",
  "consultationTypeId": "uuid",
  "preferredDate": "2026-05-15",
  "preferredTime": "10:00",
  "contactEmail": "user@example.com",
  "contactPhone": "+919876543210",
  "notes": "Interested in anti-aging products"
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "confirmationCode": "CNS-A1B2C3D4",
    "status": "pending",
    "preferredDate": "2026-05-15",
    "preferredTime": "10:00",
    "mode": "in_store",
    "duration": 30,
    "consultationName": "Skin Analysis"
  },
  "instructions": {
    "message": "You will receive a confirmation via email.",
    "modeDetails": "Please visit the store at your scheduled time."
  }
}
```

---

### Get Booking Details

Get booking details by ID.

**Endpoint:** `GET /api/v1/consultations/:bookingId`

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "confirmationCode": "CNS-A1B2C3D4",
    "status": "confirmed",
    "preferredDate": "2026-05-15",
    "preferredTime": "10:00",
    "confirmedDate": "2026-05-15",
    "confirmedTime": "10:00",
    "mode": "in_store",
    "duration": 30,
    "contactEmail": "user@example.com",
    "consultation": {
      "id": "uuid",
      "name": "Skin Analysis"
    },
    "campaign": {
      "id": "uuid",
      "name": "Skincare Consultation"
    }
  }
}
```

---

### Reschedule Booking

Reschedule a consultation.

**Endpoint:** `PATCH /api/v1/consultations/:bookingId`

**Request:**
```json
{
  "preferredDate": "2026-05-20",
  "preferredTime": "14:00",
  "notes": "Need afternoon slot"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking updated successfully",
  "booking": {
    "id": "uuid",
    "confirmationCode": "CNS-A1B2C3D4",
    "status": "pending",
    "preferredDate": "2026-05-20",
    "preferredTime": "14:00"
  }
}
```

---

### Cancel Booking

Cancel a consultation booking.

**Endpoint:** `DELETE /api/v1/consultations/:bookingId?reason=Schedule%20conflict`

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "refund": {
    "amount": 50,
    "coinType": "rez",
    "note": "Coins refunded to your wallet"
  }
}
```

---

## Wallet Integration

### Enhanced Features (lib/rezWallet.ts)

#### Reward Eligibility Check

Check if user is eligible for a reward (respects daily limits).

```typescript
import { checkRewardEligibility, RewardEligibility } from '@/lib/rezWallet'

const eligibility = await checkRewardEligibility(
  'user-uuid',
  'scan',
  'campaign-uuid'
)

// Response:
// {
//   eligible: true,
//   remainingScans: 8,
//   remainingVisits: 4,
//   remainingPurchases: 2
// }
```

**Daily Limits:**
- Scans: 10 per day
- Visits: 5 per day
- Purchases: 3 per day

#### Credit Brand Coins

Credit brand-specific coins to a user.

```typescript
import { creditBrandCoins } from '@/lib/rezWallet'

const result = await creditBrandCoins(
  'user-uuid',
  'brand-uuid',
  'BRC', // Brand coin symbol
  100,
  'purchase_reward',
  { idempotencyKey: 'unique-key' }
)
```

#### Get Brand Coin Balance

```typescript
import { getBrandCoinBalance } from '@/lib/rezWallet'

const balance = await getBrandCoinBalance('user-uuid', 'brand-uuid')
// Returns: { available: 500, locked: 0, total: 500, coinType: 'BRC' }
```

#### Batch Credit Rewards

Credit multiple users in a single request.

```typescript
import { batchCreditRewards } from '@/lib/rezWallet'

const results = await batchCreditRewards([
  { userId: 'user1', campaignId: 'camp1', amount: 10, reason: 'scan' },
  { userId: 'user2', campaignId: 'camp1', amount: 10, reason: 'scan' }
])
```

---

## Auth Integration

### Enhanced Features (lib/rezAuth.ts)

#### Device Fingerprinting

Generate and store device fingerprint for session security.

```typescript
import { generateDeviceFingerprint, storeDeviceFingerprint, getStoredDeviceFingerprint } from '@/lib/rezAuth'

// Generate fingerprint
const fingerprint = generateDeviceFingerprint()
// {
//   fingerprint: 'unique-hash',
//   userAgent: '...',
//   platform: '...',
//   language: '...',
//   screenResolution: '1920x1080',
//   timezone: 'Asia/Kolkata'
// }

// Store for later use
storeDeviceFingerprint(fingerprint)

// Retrieve stored fingerprint
const stored = getStoredDeviceFingerprint()
```

#### Session Management

```typescript
import {
  isSessionActive,
  updateLastActivity,
  validateSession,
  clearSession
} from '@/lib/rezAuth'

// Check if session is active (30 min timeout)
if (isSessionActive()) {
  // Session valid
}

// Update activity timestamp
updateLastActivity()

// Validate session with server
const { valid, needsRefresh, user } = await validateSession()

// Clear all session data
clearSession()
```

#### Enhanced Login with Fingerprint

```typescript
import { loginWithFingerprint } from '@/lib/rezAuth'

const response = await loginWithFingerprint(
  '+919876543210',
  '123456',
  '+91'
)
// Automatically handles device fingerprinting
```

#### Silent Token Refresh

```typescript
import { silentRefresh } from '@/lib/rezAuth'

const refreshed = await silentRefresh()
if (!refreshed) {
  // Token expired, redirect to login
}
```

#### Auth Status Check

```typescript
import { checkAuthStatus } from '@/lib/rezAuth'

const status = await checkAuthStatus()
// {
//   isAuthenticated: true,
//   isSessionValid: true,
//   user: { ... },
//   requiresMFA: false
// }
```

---

## Database Schema

### Migrations

| Migration | Description |
|-----------|-------------|
| 001_initial_schema | Core tables (campaigns, qr_codes, scan_events, coin_transactions) |
| 002_attribution_tracking | Visit and purchase tracking, attribution funnel view |
| 003_brand_coins | Brand-specific coin management |
| 004_free_samples | Free sample management and redemption |
| 005_consultations | Consultation booking system |
| 006_attribution_enhanced | Multi-touch attribution and UTM tracking |

### Key Tables

#### campaigns
- `id` - UUID primary key
- `brand_id` - Brand UUID
- `name` - Campaign name
- `offer` - JSONB offer details
- `scan_reward` - Coins per scan
- `visit_reward` - Coins for verified visit
- `purchase_reward` - Coins for purchase
- `coin_budget` - Total allocated coins
- `coins_used` - Coins spent

#### scan_events
- `id` - UUID primary key
- `qr_id` - QR code reference
- `campaign_id` - Campaign reference
- `user_id` - User (nullable)
- `coins_credited` - Whether rewards were credited

#### visit_events
- `id` - UUID primary key
- `scan_event_id` - Related scan
- `location_verified` - GPS verification status
- `dwell_time_seconds` - Time spent

#### purchase_events
- `id` - UUID primary key
- `scan_event_id` - Related scan (nullable)
- `purchase_amount` - Transaction amount
- `attributed_revenue` - Revenue attributed to QR

#### brand_coins
- `id` - UUID primary key
- `brand_id` - Brand UUID
- `name` - Coin name
- `symbol` - Coin symbol
- `current_supply` - Available supply
- `total_distributed` - Total issued

#### free_samples
- `id` - UUID primary key
- `campaign_id` - Campaign reference
- `name` - Sample name
- `quantity` - Total quantity
- `quantity_remaining` - Available

#### consultation_types
- `id` - UUID primary key
- `campaign_id` - Campaign reference
- `name` - Consultation name
- `mode` - 'in_store', 'video', 'phone'
- `duration_minutes` - Duration

---

## Error Handling

All API errors follow this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": { }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Read operations | 100/minute |
| Write operations | 50/minute |
| Auth operations | 10/minute |

---

## Support

For API support, contact:
- Email: api-support@rez.money
- Documentation: docs.rez.money/ads-qr
