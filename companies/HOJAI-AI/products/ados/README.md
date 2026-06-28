# AdOS - Advertising Operating System for HOJAI SiteOS

Pixel tracking, CAPI integration, and ROAS analytics for Meta, Google, and TikTok ads.

## Quick Start

```bash
cd ados
npm install
npm start
```

## Features

- **Multi-Platform Tracking**: Meta Pixel, Google Ads, TikTok Events
- **Server-Side CAPI**: Reliable conversion tracking without browser
- **Enhanced Conversions**: Secure PII handling with hashing
- **Custom Audiences**: Build and sync audience lists
- **ROAS Analytics**: Real-time return on ad spend

## Setup

### Configure Meta Pixel + CAPI

```bash
curl -X POST http://localhost:5464/api/pixel/config \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "platform": "meta",
    "pixelId": "YOUR_PIXEL_ID",
    "accessToken": "YOUR_ACCESS_TOKEN"
  }'
```

### Configure Google Enhanced Conversions

```bash
curl -X POST http://localhost:5464/api/pixel/config \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "platform": "google",
    "pixelId": "YOUR_CONVERSION_ID",
    "accessToken": "YOUR_DEVELOPER_TOKEN"
  }'
```

### Configure TikTok Events API

```bash
curl -X POST http://localhost:5464/api/pixel/config \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "platform": "tiktok",
    "pixelId": "YOUR_PIXEL_ID",
    "accessToken": "YOUR_ACCESS_TOKEN"
  }'
```

## Track Events

### Client-Side Event (via JavaScript Pixel)
Track from your website using the platform's standard pixel code.

### Server-Side Event (via AdOS CAPI)
Track server-side conversions that are more reliable:

```bash
curl -X POST http://localhost:5464/api/events/track \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "platform": "meta",
    "eventName": "Purchase",
    "userData": {
      "email": "customer@example.com",
      "phone": "+919876543210"
    },
    "customData": {
      "value": 1499.00,
      "currency": "INR",
      "orderId": "ORD-12345",
      "numItems": 3
    }
  }'
```

### Batch Event Tracking
Track multiple events in one request:

```bash
curl -X POST http://localhost:5464/api/events/track/batch \
  -H 'Content-Type: application/json' \
  -d '{
    "events": [
      {
        "companyId": "your-company",
        "platform": "meta",
        "eventName": "PageView",
        "eventData": { "url": "https://yoursite.com/products" }
      },
      {
        "companyId": "your-company",
        "platform": "meta",
        "eventName": "ViewContent",
        "eventData": { "url": "https://yoursite.com/product/123" },
        "customData": { "contentName": "Premium Widget", "contentCategory": "Electronics" }
      }
    ]
  }'
```

## Standard Events

| Event Name | When to Fire |
|------------|--------------|
| PageView | User views a page |
| ViewContent | User views product/content |
| AddToCart | Item added to cart |
| AddToWishlist | Item added to wishlist |
| InitiateCheckout | Checkout started |
| AddPaymentInfo | Payment info entered |
| Purchase | Order completed |
| Lead | Form submission |
| SignUp | User registration |
| Search | Search performed |
| Contact | Contact form submitted |

## Enhanced Conversions

Send hashed customer data for improved conversion measurement:

```bash
curl -X POST http://localhost:5464/api/enhanced-conversions \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "platform": "google",
    "conversionType": "purchase",
    "conversionData": {
      "value": 2499.00,
      "currency": "INR"
    },
    "userData": {
      "email": "customer@example.com",
      "phone": "+919876543210",
      "firstName": "John",
      "lastName": "Doe",
      "address": "123 Main St",
      "city": "Mumbai",
      "state": "MH",
      "zip": "400001",
      "country": "IN"
    }
  }'
```

## ROAS Analytics

### Get ROAS Summary
```bash
curl "http://localhost:5464/api/analytics/roas?companyId=your-company"
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSpend": 100000,
      "totalRevenue": 450000,
      "totalConversions": 320,
      "roas": "4.50",
      "cpa": "312.50",
      "ctr": "2.80",
      "conversionRate": "3.50"
    },
    "campaigns": [
      {
        "campaignId": "cmp_abc123",
        "name": "Summer Sale",
        "platform": "meta",
        "spend": 50000,
        "revenue": 220000,
        "conversions": 160,
        "roas": "4.40"
      }
    ]
  }
}
```

### Get Conversion Breakdown
```bash
curl "http://localhost:5464/api/analytics/conversions?companyId=your-company"
```

## Audience Management

### Create Audience
```bash
curl -X POST http://localhost:5464/api/audiences \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "platform": "meta",
    "name": "High-Value Customers",
    "description": "Customers with LTV > 10000"
  }'
```

### Sync Audience
```bash
curl -X POST http://localhost:5464/api/audiences/sync \
  -H 'Content-Type: application/json' \
  -d '{
    "audienceId": "aud_xyz789",
    "users": [
      { "email": "customer1@example.com", "phone": "+919876543210" },
      { "email": "customer2@example.com", "phone": "+919876543211" }
    ]
  }'
```

## Data Privacy

All user data (email, phone) is automatically hashed with SHA-256 before being sent to advertising platforms. No raw PII is stored or transmitted.

For GDPR/CCPA compliance:
1. Obtain user consent before tracking
2. Only send data for consented users
3. Implement data deletion requests via platform tools

## License

Proprietary - HOJAI AI
