# AdOS - HOJAI SiteOS

**Service:** AdOS (Advertising Operating System)
**Port:** 5464
**Package:** `@hojai/ados`
**Status:** Production Ready

## Overview

AdOS provides unified pixel tracking, server-side conversion API (CAPI), enhanced conversions, and ROAS analytics across multiple advertising platforms (Meta, Google, TikTok).

## Features

- **Meta Pixel + CAPI**: Track website events and send server-side conversions
- **Google Enhanced Conversions**: Hash and send customer data securely
- **TikTok Events API**: Track TikTok ad conversions
- **Audience Sync**: Build and sync custom audiences
- **ROAS Analytics**: Real-time return on ad spend tracking
- **Multi-Platform**: Unified API for all major ad platforms

## API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /ready` - Service readiness check

### Pixel Configuration
- `POST /api/pixel/config` - Configure pixel for platform
- `GET /api/pixel/config/:companyId/:platform` - Get pixel config
- `DELETE /api/pixel/config/:companyId/:platform` - Remove config

### Event Tracking
- `POST /api/events/track` - Track single conversion event
- `POST /api/events/track/batch` - Track multiple events
- `GET /api/events/:eventId` - Get event status

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:campaignId` - Get campaign details
- `PUT /api/campaigns/:campaignId` - Update campaign

### Audiences
- `GET /api/audiences` - List audiences
- `POST /api/audiences` - Create audience
- `POST /api/audiences/sync` - Sync audience data

### Enhanced Conversions
- `POST /api/enhanced-conversions` - Send enhanced conversion

### Analytics
- `GET /api/analytics/roas` - Get ROAS analytics
- `GET /api/analytics/conversions` - Get conversion analytics

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADOS_PORT` | 5464 | Service port |

### Pixel Configuration Schema

```javascript
{
  configId: string,
  companyId: string,
  platform: 'meta' | 'google' | 'tiktok',
  pixelId: string,
  accessToken: string,
  enhancedConversions: {
    enabled: boolean,
    conversionTypes: string[]
  },
  partnerInfo: object,
  status: 'active' | 'paused'
}
```

## Event Tracking

### Standard Events

| Event | Description |
|-------|-------------|
| `PageView` | Page viewed |
| `ViewContent` | Product/page content viewed |
| `AddToCart` | Item added to cart |
| `InitiateCheckout` | Checkout started |
| `AddPaymentInfo` | Payment info entered |
| `Purchase` | Order completed |
| `Lead` | Form submitted |
| `SignUp` | User signed up |
| `Search` | Search performed |
| `Contact` | Contact form submitted |

### User Data (hashed automatically)

```javascript
{
  email: 'user@example.com',
  phone: '+919876543210',
  firstName: 'John',
  lastName: 'Doe',
  city: 'Mumbai',
  country: 'IN'
}
```

## Usage Examples

### Configure Meta Pixel
```bash
curl -X POST http://localhost:5464/api/pixel/config \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "acme-corp",
    "platform": "meta",
    "pixelId": "123456789",
    "accessToken": "YOUR_TOKEN"
  }'
```

### Track Purchase Event
```bash
curl -X POST http://localhost:5464/api/events/track \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "acme-corp",
    "platform": "meta",
    "eventName": "Purchase",
    "userData": {
      "email": "customer@example.com",
      "phone": "+919876543210"
    },
    "customData": {
      "value": 999.00,
      "currency": "INR",
      "orderId": "ORD-12345"
    }
  }'
```

### Send Enhanced Conversion
```bash
curl -X POST http://localhost:5464/api/enhanced-conversions \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "acme-corp",
    "platform": "google",
    "conversionType": "purchase",
    "conversionData": {
      "value": 1999.00,
      "currency": "INR"
    },
    "userData": {
      "email": "customer@example.com",
      "phone": "+919876543210"
    }
  }'
```

### Get ROAS Analytics
```bash
curl "http://localhost:5464/api/analytics/roas?companyId=acme-corp"
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSpend": 50000,
      "totalRevenue": 200000,
      "totalConversions": 150,
      "roas": "4.00",
      "cpa": "333.33",
      "ctr": "2.50",
      "conversionRate": "3.20"
    }
  }
}
```

## Data Privacy

- All PII (email, phone) is hashed with SHA-256 before transmission
- No raw PII is ever stored or transmitted to ad platforms
- Consent management should be handled by calling application
- GDPR/CCPA compliance is responsibility of the integration

## Dependencies

- **express**: HTTP server
- **axios**: HTTP client for platform APIs
- **uuid**: ID generation
- **crypto-js**: SHA-256 hashing

## Related Services

- **Analytics OS**: Downstream analytics processing
- **Sales OS**: Conversion data enrichment
- **Marketing OS**: Campaign management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AdOS (5464)                          │
├─────────────────────────────────────────────────────────────┤
│  Pixel Config  │  Event Tracking  │  ROAS Analytics         │
├────────────────┼──────────────────┼─────────────────────────┤
│ Meta Pixel     │ Meta CAPI        │ Google Enhanced         │
│ Google Ads     │ TikTok Events    │ Audience Sync           │
├────────────────┴──────────────────┴─────────────────────────┤
│              Ad Platforms (Meta, Google, TikTok)            │
└─────────────────────────────────────────────────────────────┘
```
