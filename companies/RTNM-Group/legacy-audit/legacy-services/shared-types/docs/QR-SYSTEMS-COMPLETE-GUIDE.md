# Complete QR Systems Guide

**Powered by ReZ Mind** - AI-powered commerce intelligence for QR-based experiences

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [QR System Types](#qr-system-types)
3. [User Flows](#user-flows)
4. [Technical Integration](#technical-integration)
5. [API Reference](#api-reference)
6. [Testing Guide](#testing-guide)
7. [Deployment Checklist](#deployment-checklist)
8. [Security Considerations](#security-considerations)
9. [Monitoring & Analytics](#monitoring--analytics)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              QR CODE SCANNING                                │
│                    (Native App / Camera / Third-party Scanner)               │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          QR DATA PARSING                                    │
│           Extracts: QR Type, ID, Token, Metadata from URL Scheme            │
│                                                                             │
│           Formats:                                                           │
│           - rez://room/{roomId}?token={token}                               │
│           - rez://menu/{merchantId}?table={tableId}                        │
│           - rez://profile/{profileId}                                      │
│           - rez://ad/{campaignId}?source=qr                                │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Room QR App  │   │  Menu QR App  │   │  Ads QR App   │
│   (rez-now)   │   │(Hotel OTA)    │   │  (AdBazaar)   │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REZ PLATFORM SERVICES                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │   Auth     │  │   Wallet   │  │  Payment   │  │  Merchant  │          │
│  │  Service   │  │  Service   │  │  Service   │  │  Service   │          │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘          │
│                                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │  Intent    │  │ Knowledge  │  │   Chat     │  │ Analytics  │          │
│  │   Graph    │  │   Base     │  │  Service   │  │   Engine   │          │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THIRD-PARTY INTEGRATIONS                             │
│                                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │  Supabase  │  │  Razorpay  │  │ MakCorps   │  │  StayOwn   │          │
│  │  Database  │  │  Payments  │  │   Hotel    │  │  Property  │          │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## QR System Types

### 1. Room QR System

**Purpose**: Guest services and room management in hotels

| Feature | Description |
|---------|-------------|
| Service Requests | Housekeeping, room service, maintenance |
| Checkout | Guest checkout with charges |
| Charge Management | Add items to room bill |
| Feedback | Post-stay surveys and reviews |

**QR Format**: `rez://room/{roomId}?token={encryptedToken}`

**Files**:
- `rez-now/` - Main application

### 2. Menu QR System

**Purpose**: Digital menu and ordering in restaurants

| Feature | Description |
|---------|-------------|
| Menu Display | Categories, items, prices |
| Cart Management | Add, modify, remove items |
| Order Processing | Send to kitchen display |
| Payment | Wallet, UPI, card integration |

**QR Format**: `rez://menu/{merchantId}?table={tableId}`

**Files**:
- `Hotel OTA/` - Restaurant ordering module

### 3. Rez Now System

**Purpose**: Digital business cards and social profiles

| Feature | Description |
|---------|-------------|
| Profile Display | Contact info, social links |
| Link Sharing | Social media, websites |
| QR Analytics | Scan tracking |
| Reclaim Attribution | Commission tracking |

**QR Format**: `rez://profile/{profileId}`

**Files**:
- `rez-now/` - Profile and QR generation

### 4. Ads QR System

**Purpose**: Advertising campaigns with QR codes

| Feature | Description |
|---------|-------------|
| Campaign Management | Create, pause, analytics |
| Bulk QR Generation | Multiple codes per campaign |
| Attribution Tracking | Scan, visit, purchase events |
| Reward System | Coins for engagement |

**QR Format**: `rez://ad/{campaignId}?source=qr`

**Files**:
- `adsqr/` - Campaign management
- `adBazaar/` - Marketplace

---

## User Flows

### Room QR Flow

```
Guest arrives at hotel
        │
        ▼
┌─────────────────┐
│ Scan Room QR    │
│ (On door/back)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authenticate    │
│ (Room token)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Service Menu    │
│ Options         │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Request│ │Add    │
│Service│ │Charge │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Guest Checkout  │
│ (Pay all chars) │
└─────────────────┘
```

### Menu QR Flow

```
Customer enters restaurant
        │
        ▼
┌─────────────────┐
│ Scan Table QR   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ View Menu       │
│ (Categories)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Add Items       │
│ to Cart         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Place Order     │
│ (Send to kitchn)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Payment         │
│ (Wallet/UPI)    │
└─────────────────┘
```

### Rez Now Flow

```
Attendee at event
        │
        ▼
┌─────────────────┐
│ Scan Profile QR │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ View Profile    │
│ (Contact info)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click Links     │
│ (Social/Site)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analytics Track │
│ (Attribution)  │
└─────────────────┘
```

### Ads QR Flow

```
User sees ad with QR
        │
        ▼
┌─────────────────┐
│ Scan Ad QR      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ View Campaign   │
│ Landing Page    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Visit │ │Purchase│
│ Store │ │Product │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Claim Rewards   │
│ (Earn Coins)    │
└─────────────────┘
```

---

## Technical Integration

### Service Dependencies

```
Room QR ──────┬──► ReZ Auth ───► JWT Validation
             ├──► ReZ Wallet ──► Balance check
             ├──► ReZ Payment ─► Checkout
             └──► StayOwn ─────► Property mgmt

Menu QR ──────┬──► ReZ Auth ───► User auth
             ├──► ReZ Wallet ──► Cart payment
             ├──► ReZ Merchant ─► Menu data
             └──► ReZ Order ────► Kitchen display

Rez Now ──────┬──► ReZ Auth ───► Profile auth
             ├──► ReZ Wallet ──► Reclaim att.
             └──► Intent Graph ─► Analytics

Ads QR ───────┼──► Supabase ───► Campaign data
             ├──► ReZ Wallet ──► Coin rewards
             ├──► ReZ Analytics ► Attribution
             └──► AdBazaar ─────► Marketplace
```

### Database Schema

#### campaigns (AdsQR)
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  merchant_id UUID REFERENCES merchants(id),
  landing_url TEXT,
  budget DECIMAL(12,2),
  spent DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  rewards JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### qr_codes (AdsQR)
```sql
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  slug VARCHAR(100) UNIQUE,
  qr_url TEXT,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### scan_events (AdsQR)
```sql
CREATE TABLE scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_codes(id),
  user_id UUID,
  device_type VARCHAR(50),
  location VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW()
);
```

#### room_services (Hotel OTA)
```sql
CREATE TABLE room_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(50) NOT NULL,
  guest_id UUID NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### room_charges (Hotel OTA)
```sql
CREATE TABLE room_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(50) NOT NULL,
  guest_id UUID NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Reference

### Authentication

#### POST /api/auth/login
```json
// Request
{
  "email": "user@example.com",
  "password": "password123"
}
// Response
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST /api/auth/verify-token
```json
// Request Header: Authorization: Bearer {token}
// Response
{
  "valid": true,
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

### Room QR APIs

#### POST /api/room/service-request
```json
// Request
{
  "roomId": "ROOM-001",
  "serviceType": "housekeeping",
  "description": "Extra towels please",
  "priority": "normal"
}
// Response
{
  "id": "SR-uuid",
  "status": "pending",
  "estimatedTime": "30 mins"
}
```

#### POST /api/room/add-charge
```json
// Request
{
  "roomId": "ROOM-001",
  "guestId": "GUEST-uuid",
  "item": "Room Service - Dinner",
  "amount": 2500
}
// Response
{
  "id": "CH-uuid",
  "status": "added",
  "newTotal": 4500
}
```

#### POST /api/room/checkout
```json
// Request
{
  "roomId": "ROOM-001",
  "guestId": "GUEST-uuid",
  "paymentMethod": "wallet"
}
// Response
{
  "checkoutId": "CO-uuid",
  "status": "completed",
  "invoiceId": "INV-uuid",
  "totalCharges": 4500
}
```

### Menu QR APIs

#### GET /api/menu/{merchantId}
```json
// Response
{
  "merchantId": "MERCHANT-001",
  "name": "Restaurant Name",
  "categories": [
    {
      "id": "CAT-1",
      "name": "Appetizers",
      "items": [
        { "id": "ITEM-1", "name": "Spring Rolls", "price": 299 }
      ]
    }
  ]
}
```

#### POST /api/order
```json
// Request
{
  "merchantId": "MERCHANT-001",
  "tableId": "TABLE-5",
  "items": [
    { "itemId": "ITEM-1", "quantity": 2 }
  ]
}
// Response
{
  "orderId": "ORD-uuid",
  "status": "confirmed",
  "estimatedTime": "15 mins",
  "total": 652
}
```

### Ads QR APIs

#### POST /api/campaigns
```json
// Request
{
  "name": "Summer Sale",
  "landingUrl": "https://example.com/sale",
  "budget": 50000,
  "rewards": {
    "scan": 10,
    "visit": 25,
    "purchase": 100
  }
}
// Response
{
  "id": "CAMP-uuid",
  "status": "draft"
}
```

#### POST /api/campaigns/{id}/qr
```json
// Request
{
  "count": 100,
  "location": "Mumbai Mall"
}
// Response
{
  "qrs": [
    { "id": "QR-uuid", "slug": "abc123", "downloadUrl": "..." }
  ]
}
```

#### POST /api/scan/{slug}
```json
// Request
{
  "userId": "USER-uuid",
  "deviceType": "mobile",
  "location": "Mumbai"
}
// Response
{
  "status": "recorded",
  "coinsEarned": 10,
  "newBalance": 510
}
```

---

## Testing Guide

### Run Integration Tests

```bash
# Run all QR system integration tests
npx tsx scripts/test-qr-integration.ts

# Expected output
# ============TEST RESULTS============
# Room QR Flow: PASS (5/5 tests)
# Menu QR Flow: PASS (5/5 tests)
# Rez Now Flow: PASS (4/4 tests)
# Ads QR Flow:  PASS (4/4 tests)
```

### Run Health Checks

```bash
# Run service health checks
npx tsx scripts/health-check.ts

# Check specific service
curl http://localhost:3001/api/health
```

### Manual Testing Checklist

#### Room QR
- [ ] Generate QR for room
- [ ] Scan and authenticate
- [ ] Submit service request
- [ ] Add charge to room
- [ ] Complete checkout

#### Menu QR
- [ ] Scan table QR
- [ ] Browse menu categories
- [ ] Add items to cart
- [ ] Place order
- [ ] Pay with wallet

#### Rez Now
- [ ] Generate profile QR
- [ ] Scan and view profile
- [ ] Click social links
- [ ] Verify analytics

#### Ads QR
- [ ] Create campaign
- [ ] Generate bulk QRs
- [ ] Scan QR code
- [ ] Complete attribution flow
- [ ] Claim rewards

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] CDN assets uploaded
- [ ] SSL certificates valid

### Services to Deploy

1. **Backend Services** (in order)
   - ReZ Auth Service
   - ReZ Wallet Service
   - ReZ Payment Service
   - ReZ Merchant Service
   - ReZ Intent Graph
   - ReZ Knowledge Base
   - ReZ Chat Service

2. **Frontend Apps**
   - rez-now (Vercel)
   - Hotel OTA (Vercel)
   - adBazaar (Vercel)
   - adsqr (Vercel)

3. **Databases**
   - Supabase (PostgreSQL)
   - MongoDB Atlas (if used)

### Post-Deployment

- [ ] Run health checks
- [ ] Verify QR codes work
- [ ] Test payment flows
- [ ] Check analytics
- [ ] Monitor error logs

---

## Security Considerations

### QR Token Security

- Tokens are encrypted with AES-256
- Tokens expire after configurable time (default: 24 hours)
- Single-use tokens for sensitive operations
- Token rotation on each checkout

### API Security

- JWT authentication for all protected endpoints
- Rate limiting: 100 requests/minute per user
- CORS configured for allowed origins
- Input validation and sanitization
- SQL injection prevention via parameterized queries

### Data Privacy

- PII encrypted at rest
- GDPR-compliant data retention
- User consent for analytics tracking
- Anonymized aggregated reports

---

## Monitoring & Analytics

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| QR Scans | Total scans per day | >1000 |
| Conversion Rate | Scans to actions | >15% |
| Error Rate | Failed requests | <1% |
| Response Time | API latency | <200ms |

### Dashboards

- **ReZ Analytics** - Real-time metrics
- **Supabase** - Campaign performance
- **Vercel Analytics** - Frontend performance
- **MongoDB Atlas** - Database metrics

### Alerts

Configure alerts for:
- Service health check failures
- Unusual scan patterns
- Payment failures
- High error rates

---

## Quick Links

| Document | Description |
|----------|-------------|
| [QUICK-START](./QUICK-START/) | Setup guides |
| [ENV-VARIABLES](./ENV-VARIABLES.md) | Environment config |
| [DEPLOYMENT-GUIDE](./DEPLOYMENT-GUIDE.md) | Deployment steps |
| [QR-AUDIT-SUMMARY](./QR-AUDIT-SUMMARY.md) | Audit results |

---

**Powered by ReZ Mind** - AI-powered commerce intelligence
