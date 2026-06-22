# BrandPulse - AI Developer Guide

## Overview

**BrandPulse** is HOJAI's brand intelligence and sentiment analysis platform providing real-time monitoring of brand reputation across multiple review platforms.

## Quick Start

```bash
cd products/brandpulse
npm install
npm run dev
# API: http://localhost:4770
# Dashboard: http://localhost:4780
```

## Architecture

```
BrandPulse (4770)
├── Express API Server
├── WebSocket Server (/ws)
├── MongoDB (brand, review, sentiment, alert models)
└── RTNM Bridge (service integration)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main app entry, routes setup |
| `src/models/` | MongoDB schemas |
| `src/services/` | Business logic |
| `src/routes/` | API endpoints |
| `src/middleware/` | Auth, validation |
| `docs/openapi.json` | OpenAPI 3.0 spec |

## Features

### 1. Sentiment Analysis
- AFINN-based fast local scoring
- OpenAI GPT-powered deep analysis (optional)
- Aspect extraction: service, food, ambiance, value, cleanliness, location
- Keyword detection
- Trend detection

### 2. Review Management
- Multi-source: Google, Yelp, TripAdvisor, Facebook, Direct, Internal
- Bulk import (max 100)
- Moderation: pending, approved, rejected, flagged
- Response tracking

### 3. Analytics
- Brand overview with stats
- Sentiment trends (day/week/month)
- Rating distribution (1-5 stars)
- Source breakdown
- Aspect analysis

### 4. Alert System
- negative_review
- low_rating
- negative_spike
- trend_change

### 5. Real-time WebSocket
- Subscribe to brand updates
- Events: new_review, review_updated, alert, sentiment_changed

### 6. RTNM Integration
- Signal emission to RTNM Gateway
- Brand sync
- Loyalty rewards enrollment

## API Endpoints

### Brands
- `POST /api/v1/brands` - Create brand
- `GET /api/v1/brands/:brandId` - Get brand
- `PATCH /api/v1/brands/:brandId` - Update brand
- `DELETE /api/v1/brands/:brandId` - Soft delete

### Reviews
- `POST /api/v1/reviews` - Create review
- `POST /api/v1/reviews/bulk` - Bulk import
- `GET /api/v1/reviews/brand/:brandId` - List reviews
- `PATCH /api/v1/reviews/:reviewId/moderate` - Moderate

### Analytics
- `GET /api/v1/analytics/brand/:id/overview` - Overview
- `GET /api/v1/analytics/brand/:id/sentiment` - Sentiment trend
- `GET /api/v1/analytics/brand/:id/ratings` - Rating distribution
- `GET /api/v1/analytics/brand/:id/aspects` - Aspect analysis
- `GET /api/v1/analytics/brand/:id/alerts` - Alerts

### Sentiment
- `POST /api/v1/sentiment/analyze` - Analyze text
- `POST /api/v1/sentiment/analyze/batch` - Batch analyze

## Adding New Features

### 1. New Model
```typescript
// src/models/competitor.model.ts
import mongoose, { Schema } from 'mongoose';

const CompetitorSchema = new Schema({
  brandId: { type: String, required: true },
  name: { type: String, required: true }
});

export const Competitor = mongoose.model('Competitor', CompetitorSchema);
```

### 2. New Service
```typescript
// src/services/competitor.service.ts
import { Competitor } from '../models/index.js';

export async function getCompetitors(brandId: string) {
  return Competitor.find({ brandId });
}
```

### 3. New Route
```typescript
// src/routes/competitor.routes.ts
router.get('/brand/:brandId/competitors', async (req, res) => {
  const competitors = await getCompetitors(req.params.brandId);
  res.json({ success: true, data: competitors });
});
```

### 4. Register Route in index.ts
```typescript
import competitorRoutes from './routes/competitor.routes.js';
app.use('/api/v1/competitors', competitorRoutes);
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4770 | Service port |
| MONGODB_URI | localhost:27017/brandpulse | MongoDB connection |
| REDIS_URL | localhost:6379 | Redis for caching |
| API_KEY | - | API authentication |
| INTERNAL_SERVICE_TOKEN | - | Internal service auth |
| RTNM_GATEWAY_URL | localhost:4600 | RTNM Gateway |
| OPENAI_API_KEY | - | Optional AI analysis |

## Testing

```bash
# Generate demo data
curl -X POST http://localhost:4770/api/v1/demo/generate \
  -H "Content-Type: application/json" \
  -d '{"brandName":"Test Hotel","industry":"hotel"}'

# Test sentiment
curl -X POST http://localhost:4770/api/v1/sentiment/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"Great service and delicious food!"}'

# Open dashboard
http://localhost:4780/?brandId=demo-brand
```

## RTNM Integration

BrandPulse connects to RTNM Gateway for:
- Signal emission (sentiment, review events)
- Brand sync
- Alert distribution
- Loyalty rewards

## WebSocket

```javascript
const ws = new WebSocket('ws://localhost:4770/ws');

// Subscribe to brand
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: { brandIds: ['brand-123'] }
}));

// Events received:
// - new_review
// - alert
// - sentiment_changed
```

## Related Documents

- [docs/hojai-ai/BRANDPULSE.md](../../docs/hojai-ai/BRANDPULSE.md) - Full documentation
- [docs/hojai-ai/BRANDPULSE-PRODUCTS-GUIDE.md](../../docs/hojai-ai/BRANDPULSE-PRODUCTS-GUIDE.md) - Features guide
- [docs/hojai-ai/CLAUDE.md](../../docs/hojai-ai/CLAUDE.md) - HOJAI ecosystem overview
- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md)
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](../../RTNM-PRODUCTS-FEATURES-AUDIT.md)
