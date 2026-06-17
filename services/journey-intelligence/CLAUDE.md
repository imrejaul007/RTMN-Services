# Journey Intelligence Service

**Version:** 1.0.0  
**Port:** 4954  
**Status:** Ready for Development

---

## Overview

The Journey Intelligence Service tracks and analyzes the complete customer journey from first touch to conversion and beyond. It provides comprehensive analytics including funnel analysis, dropout detection, conversion prediction, and attribution modeling.

---

## Features

### Journey Stages

| Stage | Description |
|-------|-------------|
| `awareness` | Customer becomes aware of the brand/product |
| `consideration` | Customer evaluates options |
| `acquisition` | Customer signs up or makes first purchase |
| `activation` | Customer uses the product/service |
| `retention` | Customer continues to use and engage |
| `referral` | Customer advocates for the brand |

### Touchpoint Types

| Type | Description |
|------|-------------|
| `ad` | Advertisement impressions/clicks |
| `website` | Website visits |
| `signup` | Account creation |
| `purchase` | Transaction completion |
| `delivery` | Product/service delivery |
| `support` | Customer support interactions |
| `review` | Product/service reviews |
| `repeat` | Repeat purchases |
| `referral` | Referral actions |
| `email` | Email campaigns |
| `social` | Social media interactions |
| `search` | Search engine interactions |
| `app` | Mobile app usage |
| `call` | Phone calls |
| `chat` | Chat interactions |

---

## API Endpoints

### Health Check
```
GET /health
```

### Journeys
```
POST   /api/journeys              - Create journey
GET    /api/journeys/:customerId  - Get customer journey
PATCH  /api/journeys/:customerId/stage  - Advance stage
POST   /api/journeys/:customerId/convert - Mark converted
POST   /api/journeys/:customerId/churn   - Mark churned
GET    /api/journeys/stats/summary       - Get journey statistics
GET    /api/journeys/stage/:stage        - Get journeys by stage
GET    /api/journeys/:customerId/timeline - Get journey timeline
```

### Touchpoints
```
POST   /api/touchpoints                    - Track touchpoint
GET    /api/touchpoints/customer/:id       - Get customer touchpoints
GET    /api/touchpoints/:touchpointId      - Get touchpoint by ID
GET    /api/touchpoints/session/:sessionId - Get touchpoints by session
GET    /api/touchpoints/stats/conversion    - Get conversion statistics
GET    /api/touchpoints/attribution/channel - Get channel attribution
GET    /api/touchpoints/attribution/:id    - Get customer attribution
GET    /api/touchpoints/type/:type         - Get touchpoints by type
```

### Funnels
```
POST   /api/funnels           - Create funnel
GET    /api/funnels           - List funnels
GET    /api/funnels/:id       - Get funnel
POST   /api/funnels/analyze   - Analyze funnel
GET    /api/funnels/:id/analyze - Analyze funnel by ID
POST   /api/funnels/compare   - Compare periods
DELETE /api/funnels/:id       - Delete funnel
GET    /api/funnels/templates - Get funnel templates
```

### Insights
```
GET    /api/insights/:customerId           - Get journey insights
GET    /api/insights/:customerId/dropout  - Get dropout risk
GET    /api/insights/:customerId/conversion - Get conversion prediction
GET    /api/insights/alerts/dropout        - Get all dropout alerts
GET    /api/insights/distribution/conversion - Get probability distribution
POST   /api/insights/batch/conversion      - Batch predictions
GET    /api/insights/predictions/high-value - Get high-value predictions
```

---

## Attribution Models

| Model | Description |
|-------|-------------|
| `last_touch` | 100% credit to last touchpoint |
| `first_touch` | 100% credit to first touchpoint |
| `linear` | Equal credit to all touchpoints |
| `time_decay` | More credit to recent touchpoints |
| `position_based` | 40% first, 20% middle, 40% last |
| `data_driven` | ML-based attribution |

---

## Example Usage

### Track a Touchpoint
```bash
curl -X POST http://localhost:4954/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_123",
    "tenantId": "tenant_abc",
    "type": "website",
    "source": {
      "type": "website",
      "channel": "organic",
      "referrer": "google.com"
    },
    "properties": {
      "url": "/products/widget",
      "pageTitle": "Widget Product Page"
    },
    "sessionId": "sess_abc123",
    "duration": 120
  }'
```

### Analyze Funnel
```bash
curl -X POST http://localhost:4954/api/funnels/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_abc",
    "dateRange": {
      "start": "2026-01-01",
      "end": "2026-06-15"
    },
    "filters": {
      "channels": ["organic", "paid"]
    }
  }'
```

### Get Dropout Alerts
```bash
curl http://localhost:4954/api/insights/alerts/dropout?tenantId=tenant_abc&minRiskLevel=high
```

---

## Configuration

```env
PORT=4954
MONGODB_URI=mongodb://localhost:27017/journey_intelligence
LOG_LEVEL=info
SERVICE_NAME=journey-intelligence
DEFAULT_TENANT=public
DEFAULT_ATTRIBUTION_MODEL=last_touch
CONVERSION_WINDOW_DAYS=30
DROPTOUT_THRESHOLD_PERCENT=20
```

---

## Service Dependencies

- **MongoDB** - Primary database for journeys, touchpoints, and funnels
- **RTMN Ecosystem** - Can integrate with other RTMN services via REST

---

## Models

### CustomerJourney
- Tracks customer progress through journey stages
- Maintains stage history with timestamps
- Records total value and lifetime metrics

### Touchpoint
- Individual interactions in the journey
- Rich metadata including device, location, source
- Supports session grouping

### Funnel
- Configurable funnel definitions
- Supports filtering by segments, channels, campaigns
- Stores analysis results

---

## Services

### JourneyTracker
- Creates and manages customer journeys
- Tracks touchpoints
- Calculates attribution

### FunnelAnalyzer
- Analyzes funnel performance
- Identifies drop-off points
- Compares time periods

### DropoutDetector
- Detects customers at risk
- Calculates dropout probability
- Recommends actions

### ConversionPredictor
- Predicts conversion probability
- Estimates customer value
- Identifies influence factors

---

## Multi-tenant Support

All endpoints support the `tenantId` query parameter or body field. Default tenant is `public`.

---

## Deployment

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start production
npm start

# Development
npm run dev
```

---

**Last Updated:** June 2026
