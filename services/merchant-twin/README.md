# RTMN Merchant Twin Service

**Version:** 1.0.0  
**Port:** 4888  
**Status:** Active

## Overview

The Merchant Twin Service provides comprehensive merchant digital twin functionality for the RTMN ecosystem. It manages merchant profiles, stores, offers, staff, settlements, and analytics.

## Twin Types

| Twin Type | Description |
|-----------|-------------|
| **Merchant** | Store/business profile with rating, revenue, and metrics |
| **Store** | Physical, virtual, or hybrid store locations |
| **Offer** | Special deals, promotions, discounts |
| **Staff** | Employee management with roles and permissions |
| **Settlement** | Financial settlement tracking and processing |

## Features

- Merchant profile CRUD operations
- Multi-store management with business hours
- Offer/deal management with redemption tracking
- Staff management with roles and permissions
- Settlement tracking (pending, processed, paid)
- Ratings and reviews system
- Location management
- Comprehensive merchant analytics

## API Endpoints

### Merchant Endpoints
```
GET    /api/twins/merchants          - List merchants
POST   /api/twins/merchants          - Create merchant
GET    /api/twins/merchant/:id       - Get merchant with related twins
PUT    /api/twins/merchant/:id       - Update merchant
DELETE /api/twins/merchant/:id       - Archive merchant
```

### Store Endpoints
```
GET    /api/twins/stores             - List stores
POST   /api/twins/stores             - Create store
GET    /api/twins/store/:id          - Get store
PUT    /api/twins/store/:id          - Update store
```

### Offer Endpoints
```
GET    /api/twins/offers             - List offers
POST   /api/twins/offers             - Create offer
PUT    /api/twins/offer/:id          - Update offer
POST   /api/twins/offer/:id/redeem   - Redeem offer
```

### Staff Endpoints
```
GET    /api/twins/staff              - List staff
POST   /api/twins/staff              - Create staff
PUT    /api/twins/staff/:id          - Update staff
DELETE /api/twins/staff/:id          - Archive staff
```

### Settlement Endpoints
```
GET    /api/twins/settlements       - List settlements
POST   /api/twins/settlements        - Create settlement
PUT    /api/twins/settlement/:id/process - Process settlement
PUT    /api/twins/settlement/:id/pay     - Mark as paid
```

### Review Endpoints
```
POST   /api/twins/reviews            - Create review
GET    /api/twins/merchant/:id/reviews - Get merchant reviews
```

### Analytics Endpoints
```
GET    /api/analytics/merchants      - Get all merchant analytics
GET    /api/analytics/merchant/:id   - Get specific merchant analytics
```

### Health Endpoints
```
GET    /health                       - Service health
GET    /ready                        - Readiness check
```

## Security

- JWT authentication via `requireAuth` middleware
- Rate limiting (default: standard, strict: for mutations)
- Input validation with prototype pollution prevention
- Field whitelisting
- Business scope validation
- Business ID isolation

## Data Model

### Merchant Twin
```json
{
  "id": "mer-xxxxxxxx",
  "type": "merchant",
  "businessName": "ABC Restaurant",
  "ownerName": "John Doe",
  "category": "restaurant",
  "rating": 4.5,
  "storeCount": 3,
  "staffCount": 25,
  "totalRevenue": 150000,
  "pendingSettlements": 5000,
  "status": "active"
}
```

### Store Twin
```json
{
  "id": "sto-xxxxxxxx",
  "merchantId": "mer-xxxxxxxx",
  "name": "Downtown Branch",
  "type": "physical",
  "location": { "lat": 40.7128, "lng": -74.0060 },
  "businessHours": { ... },
  "rating": 4.2,
  "status": "active"
}
```

## Quick Start

```bash
cd services/merchant-twin
npm install
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4888 | Service port |
| CORS_ORIGINS | * | Allowed CORS origins |

## Dependencies

- express: ^4.18.2
- helmet: ^7.1.0
- cors: ^2.8.5
- compression: ^1.7.4
- morgan: ^1.10.0
- uuid: ^9.0.1
- @rtmn/twinos-shared: file:../../shared

---

*Part of RTMN Ecosystem - HOJAI AI*
