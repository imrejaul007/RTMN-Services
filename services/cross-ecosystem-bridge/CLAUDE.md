# Cross-Ecosystem Bridge Service

**Version:** 1.0.0  
**Port:** 4898  
**Status:** Production Ready

---

## Overview

The Cross-Ecosystem Bridge Service is the unified customer view layer for the RTMN ecosystem. It connects multiple services (HOJAI AI, REZ, StayOwn, AdBazaar, CorpID) to create a single, unified customer profile and enable cross-service engagement.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CROSS-ECOSYSTEM BRIDGE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  HOJAI   │  │   REZ    │  │ StayOwn  │  │ AdBazaar │  │  CorpID  │  │
│  │   AI     │  │ Services │  │Hospitality│  │   CRM    │  │ Identity │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │            │             │             │             │         │
│       └────────────┴─────────────┴─────────────┴─────────────┘         │
│                                   │                                     │
│                    ┌──────────────▼──────────────┐                     │
│                    │   UNIFIED ECOSYSTEM PROFILE │                     │
│                    │  - Cross-service identity   │                     │
│                    │  - Engagement analytics      │                     │
│                    │  - Contextual offers        │                     │
│                    └─────────────────────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Capabilities

| Feature | Description |
|---------|-------------|
| **Identity Resolution** | Match users across services using email, phone, or service IDs |
| **Unified Profile** | Aggregate data from all connected services into one profile |
| **Cross-Service Linking** | Link accounts across HOJAI, REZ, StayOwn, AdBazaar, CorpID |
| **Offer Generation** | Generate contextual cross-service offers |
| **Engagement Analytics** | Track and analyze engagement patterns |

---

## Connected Services

| Service | Connection | Port |
|---------|-----------|------|
| **HOJAI AI** | Genie, Memory | 4500, 4501, 4703 |
| **REZ Consumer** | User profiles, Orders | 3000, 4801 |
| **REZ Merchant** | POS, Payments | 4800, 4803 |
| **StayOwn** | Hotel OS, Bookings | 5025, 6000 |
| **AdBazaar** | CRM, Ads, Campaigns | 4056, 5000 |
| **CorpID** | Universal Identity | 4702 |

---

## API Endpoints

### Profiles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles` | List profiles |
| POST | `/api/profiles` | Create profile |
| GET | `/api/profiles/:profileId` | Get profile |
| PUT | `/api/profiles/:profileId` | Update profile |
| DELETE | `/api/profiles/:profileId` | Delete profile |
| POST | `/api/profiles/resolve` | Resolve identity |
| POST | `/api/profiles/:profileId/refresh` | Refresh from services |
| GET | `/api/profiles/:profileId/engagement` | Get engagement |

### Links

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/links` | List links |
| POST | `/api/links` | Create link |
| GET | `/api/links/:linkId` | Get link |
| DELETE | `/api/links/:linkId` | Terminate link |
| POST | `/api/links/:linkId/entities` | Add entity |
| DELETE | `/api/links/:linkId/entities` | Remove entity |
| POST | `/api/links/household` | Find/create household |

### Offers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/offers` | List offers |
| POST | `/api/offers` | Create offer |
| POST | `/api/offers/generate` | Generate contextual offers |
| POST | `/api/offers/:offerId/redeem` | Redeem offer |
| POST | `/api/offers/cross-service-contextual` | Cross-service contextual offer |

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Build TypeScript
npm run build

# Start server
npm start

# Development mode
npm run dev
```

---

## Health Check

```bash
curl http://localhost:4898/health
```

Response:
```json
{
  "status": "ok",
  "service": "cross-ecosystem-bridge",
  "version": "1.0.0",
  "port": 4898,
  "dependencies": {
    "mongodb": "connected"
  }
}
```

---

## Example Usage

### Create and Resolve Identity

```bash
# Resolve identity across services
curl -X POST http://localhost:4898/api/profiles/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "rtmn",
    "identifiers": {
      "email": "user@example.com",
      "phone": "+1234567890"
    }
  }'
```

### Generate Contextual Offer (Refund Alternative)

```bash
# Offer hotel voucher instead of cash refund
curl -X POST http://localhost:4898/api/offers/cross-service-contextual \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "rtmn",
    "profileId": "EP-123456",
    "triggerType": "refund",
    "originalAmount": 500,
    "originalService": "retail-os"
  }'
```

### Link Household Members

```bash
# Create household link
curl -X POST http://localhost:4898/api/links/household \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "rtmn",
    "phone": "+1234567890",
    "entities": [
      { "service": "rez-consumer", "entityType": "user", "entityId": "user-001" },
      { "service": "stayown", "entityType": "guest", "entityId": "guest-001" }
    ]
  }'
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4898 | Server port |
| `MONGODB_URI` | localhost:27017 | MongoDB connection |
| `HOJAI_API_URL` | localhost:4500 | HOJAI API |
| `REZ_CONSUMER_URL` | localhost:3000 | REZ Consumer |
| `REZ_MERCHANT_URL` | localhost:4800 | REZ Merchant |
| `STAYOWN_API_URL` | localhost:6000 | StayOwn API |
| `ADBazaar_API_URL` | localhost:4056 | AdBazaar API |
| `CORPID_API_URL` | localhost:4702 | CorpID API |

---

## Multi-Tenant Support

The service supports multi-tenancy via the `tenantId` field. All API calls should include a tenant ID:

- Header: `X-Tenant-ID`
- Query param: `tenantId`
- Body: `tenantId`

Default tenant is `rtmn`.

---

## Architecture

### Profile Aggregation Flow

```
1. User authenticates in Service A
   └─> Service A creates profile
       └─> Cross-Ecosystem Bridge receives event

2. User authenticates in Service B
   └─> Identity Resolution searches all services
       └─> Matches by email/phone/service ID
           └─> Links to existing profile
               └─> Updates unified profile

3. Offer generation triggered
   └─> Analyze engagement across services
       └─> Generate contextual offers
           └─> Present cross-service alternatives
```

### Cross-Service Linking Types

| Type | Description |
|------|-------------|
| `account` | Same person using multiple services |
| `household` | Family members sharing phone/address |
| `business` | Business entity relationships |
| `referral` | Referral chain |
| `transaction` | Transaction-based connections |

---

## Metrics

| Metric | Description |
|--------|-------------|
| `profiles.created` | Total profiles created |
| `profiles.resolved` | Identity resolutions |
| `links.created` | Cross-service links |
| `offers.generated` | Offers generated |
| `offers.redeemed` | Offers redeemed |
| `offers.conversions` | Offer conversions |

---

## Service Status

| Endpoint | Service | Status Check |
|----------|---------|--------------|
| GET `/health` | Cross-Ecosystem Bridge | Local |
| GET `/api/services/status` | All connected services | External |

---

*Last Updated: June 2026*
*Cross-Ecosystem Bridge - Connecting the RTMN Ecosystem*
