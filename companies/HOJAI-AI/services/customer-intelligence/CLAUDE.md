# Customer Intelligence Service

**Port:** 4885  
**Status:** ✅ BUILT  
**Purpose:** 360° Customer View, Customer Data Platform (CDP), Customer Twin 2.0

---

## Overview

Customer Intelligence provides a complete 360° view of every customer with:
- Customer profiles and data
- Preferences management
- Loyalty and rewards
- Predictive analytics
- Segmentation
- Journey tracking

## Features

- ✅ Customer profiles with 360° view
- ✅ Customer data platform (CDP)
- ✅ Preferences and history tracking
- ✅ Loyalty and rewards management
- ✅ Predictive analytics (churn, LTV, NPS)
- ✅ Customer segmentation
- ✅ Real-time insights
- ✅ Journey tracking

## API Endpoints

### Customer Management
- `GET /api/customers` - List customers (filters: search, segment, tier, status)
- `GET /api/customers/:id` - Get 360° customer view
- `POST /api/customers` - Create customer
- `PATCH /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Segments
- `GET /api/segments` - List segments
- `GET /api/segments/:id` - Get segment with customers
- `POST /api/segments` - Create segment

### Preferences
- `GET /api/customers/:id/preferences` - Get preferences
- `PATCH /api/customers/:id/preferences` - Update preferences

### Loyalty
- `GET /api/customers/:id/loyalty` - Get loyalty info
- `POST /api/customers/:id/loyalty/points` - Add/redeem points

### Analytics
- `GET /api/customers/:id/predictions` - Get predictions
- `GET /api/customers/:id/insights` - Get AI insights
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/segments` - Segment analytics

### Events & Journey
- `POST /api/customers/:id/events` - Track event
- `GET /api/customers/:id/journey` - Get customer journey

## Data Models

### Customer
```json
{
  "id": "cust-xxx",
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Inc.",
  "industry": "Technology",
  "tier": "gold",
  "lifetimeValue": 50000,
  "engagementScore": 85,
  "nps": 9,
  "churnRisk": "low"
}
```

### Segment
```json
{
  "id": "seg-xxx",
  "name": "Enterprise",
  "criteria": { "type": "enterprise" }
}
```

## Quick Start

```bash
cd services/customer-intelligence
npm install
npm start
```

## Integration

- **TwinOS Hub** - Registers as Customer Twin
- **Event Bus** - Publishes customer events
- **Sales OS** - Syncs customer data
- **Marketing OS** - Segments for campaigns
