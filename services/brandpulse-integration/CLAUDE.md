# BrandPulse Integration Service

**Version:** 1.0.0
**Port:** 4974
**Status:** Ready for Integration

---

## Overview

The BrandPulse Integration Service acts as a bridge connecting BrandPulse social media monitoring and brand analytics to the Customer Operations OS, Digital Twins (Campaign Twin, Journey Twin), Trust Intelligence, and the Executive Dashboard.

```
BrandPulse
    │
    ├──► Campaign Twin (Brand campaigns, ad performance)
    │
    ├──► Journey Twin (Brand mentions as touchpoints)
    │
    ├──► Trust Intelligence (Brand sentiment scores, trust signals)
    │
    ├──► Customer Operations OS (Alerts, engagement, crisis handling)
    │
    └──► Executive Dashboard (Brand health KPIs)
```

---

## Architecture

### Service Components

| Component | File | Purpose |
|-----------|------|---------|
| **Express Server** | `src/index.ts` | HTTP API, middleware, routing |
| **BrandSync Models** | `src/models/BrandSync.ts` | Type definitions, sync records |
| **Sync Routes** | `src/routes/sync.ts` | REST endpoints for syncing data |
| **Webhook Routes** | `src/routes/webhooks.ts` | Incoming webhooks from social platforms |
| **BrandOps Bridge** | `src/services/brandOpsBridge.ts` | Bridge to Customer Operations OS |
| **Twin Sync** | `src/services/twinSync.ts` | Sync to Campaign & Journey Twins |
| **Trust Sync** | `src/services/trustSync.ts` | Sync sentiment to Trust Intelligence |

### Connected Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Campaign Twin** | `http://localhost:4705/api/campaigns` | Brand campaign digital twins |
| **Journey Twin** | `http://localhost:4705/api/journeys` | Customer journey touchpoints |
| **Trust Intelligence** | `http://localhost:4310` | Brand trust & reputation scoring |
| **Customer Operations** | `http://localhost:4990` | Operations, alerts, engagement |
| **Executive Dashboard** | `http://localhost:4000/api/dashboard` | Brand health KPIs |

---

## API Endpoints

### Sync Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sync/campaigns` | Sync brand campaigns to twins |
| `POST` | `/api/sync/mentions` | Sync brand mentions as touchpoints |
| `POST` | `/api/sync/sentiment` | Sync sentiment scores |
| `POST` | `/api/sync/full` | Full brand sync (campaigns + mentions + sentiment) |
| `GET` | `/api/sync/status/:syncId` | Get sync status |
| `GET` | `/api/sync/history` | Get sync history |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhooks/social` | Social media platform webhooks |
| `POST` | `/webhooks/brandpulse` | BrandPulse platform events |
| `POST` | `/webhooks/test` | Test webhook endpoint |

### Dashboard Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/brand-health` | Brand health KPIs |

### Health & Info

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |
| `GET` | `/api` | API documentation |

---

## Usage Examples

### Sync Campaigns

```bash
curl -X POST http://localhost:4974/api/sync/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "brand-123",
    "campaigns": [{
      "id": "camp-001",
      "brandId": "brand-123",
      "name": "Summer Sale",
      "status": "active",
      "metrics": {
        "impressions": 100000,
        "clicks": 5000,
        "conversions": 250
      }
    }]
  }'
```

### Sync Brand Mentions

```bash
curl -X POST http://localhost:4974/api/sync/mentions \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "brand-123",
    "mentions": [{
      "id": "mention-001",
      "brandId": "brand-123",
      "platform": "twitter",
      "content": "Love the new product!",
      "sentiment": "positive",
      "sentimentScore": 0.8,
      "reach": 5000
    }]
  }'
```

### Sync Sentiment

```bash
curl -X POST http://localhost:4974/api/sync/sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "brand-123",
    "sentiment": {
      "brandId": "brand-123",
      "platform": "aggregated",
      "score": 0.65,
      "positive": 65,
      "negative": 15,
      "neutral": 20,
      "volume": 1000
    }
  }'
```

### Receive Social Webhook

```bash
curl -X POST http://localhost:4974/webhooks/social \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <signature>" \
  -d '{
    "platform": "twitter",
    "event": "mention",
    "data": {
      "id": "tweet-123",
      "brand_id": "brand-123",
      "author_name": "@user",
      "content": "Amazing service!",
      "sentiment": "positive"
    }
  }'
```

---

## Data Flow

### Campaign Sync Flow

```
BrandPulse Campaign Data
        │
        ▼
┌───────────────────┐
│ Sync Routes       │
│ /api/sync/        │
└────────┬──────────┘
         │
         ├──────► Campaign Twin ──► Brand campaign twins
         │
         ├──────► Customer Ops ────► Campaign metrics
         │
         └──────► Dashboard ───────► Brand health KPIs
```

### Mention Sync Flow

```
Brand Mention / Webhook
        │
        ▼
┌───────────────────┐
│ Sync Routes /     │
│ Webhook Routes    │
└────────┬──────────┘
         │
         ├──────► Journey Twin ────► Touchpoints
         │
         ├──────► Customer Ops ────► Mention processing
         │
         ├──────► Trust Intelligence ──► Trust signals
         │
         └──────► Dashboard ───────► Sentiment KPIs
```

### Sentiment Sync Flow

```
BrandPulse Sentiment
        │
        ▼
┌───────────────────┐
│ /api/sync/        │
│ sentiment         │
└────────┬──────────┘
         │
         ├──────► Trust Intelligence ──► Trust score
         │
         ├──────► Dashboard ───────► Sentiment KPIs
         │
         └──────► Customer Ops ────► Sentiment alerts
```

---

## Configuration

### Environment Variables

```bash
# Server
PORT=4974
NODE_ENV=development

# BrandPulse API
BRANDPULSE_API_URL=http://localhost:4970
BRANDPULSE_API_KEY=your_api_key

# Campaign Twin
CAMPAIGN_TWIN_URL=http://localhost:4705/api/campaigns
CAMPAIGN_TWIN_API_KEY=your_key

# Journey Twin
JOURNEY_TWIN_URL=http://localhost:4705/api/journeys
JOURNEY_TWIN_API_KEY=your_key

# Trust Intelligence
TRUST_INTELLIGENCE_URL=http://localhost:4310
TRUST_INTELLIGENCE_API_KEY=your_key

# Customer Operations OS
CUSTOMER_OPS_URL=http://localhost:4990
CUSTOMER_OPS_API_KEY=your_key

# Executive Dashboard
DASHBOARD_URL=http://localhost:4000/api/dashboard
DASHBOARD_API_KEY=your_key

# Event Bus
EVENT_BUS_URL=http://localhost:4510
EVENT_BUS_API_KEY=your_key

# Webhooks
WEBHOOK_SECRET=your_webhook_secret
```

---

## Models

### BrandCampaign

```typescript
interface BrandCampaign {
  id: string;
  brandId: string;
  name: string;
  description: string;
  objective: 'awareness' | 'engagement' | 'conversion' | 'loyalty' | 'reputation';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  platforms: string[];
  budget: { total: number; spent: number; currency: string };
  metrics: {
    impressions: number;
    reach: number;
    clicks: number;
    conversions: number;
    ctr: number;
    roas: number;
    engagement: number;
    sentiment: { positive: number; negative: number; neutral: number };
  };
  startDate: Date;
  endDate?: Date;
}
```

### BrandMention

```typescript
interface BrandMention {
  id: string;
  brandId: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | ...;
  authorId: string;
  authorName: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  reach: number;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    replies: number;
  };
  hashtags: string[];
  url: string;
  createdAt: Date;
}
```

### BrandSentiment

```typescript
interface BrandSentiment {
  brandId: string;
  platform: string;
  score: number; // -1 to 1
  positive: number;
  negative: number;
  neutral: number;
  volume: number;
  trending: 'up' | 'down' | 'stable';
  keywords: string[];
  timestamp: Date;
}
```

---

## Event Handling

### Webhook Events

#### Social Platform Events
- `mention` - New social media mention
- `trend` - Trending topic detected
- `engagement` - Engagement spike
- `crisis` - Crisis detected

#### BrandPulse Events
- `campaign.created` - New campaign created
- `campaign.updated` - Campaign metrics updated
- `campaign.completed` - Campaign finished
- `sentiment.updated` - Sentiment scores updated
- `brand.created` - New brand added
- `alert.triggered` - Alert condition met
- `report.ready` - New report generated

---

## Error Handling

### Sync Error Handling

- Individual records continue processing if one fails
- Failed records are logged with error details
- Partial sync results are returned with success=false
- Sync records are persisted for debugging

### Webhook Error Handling

- Invalid signatures return 401 Unauthorized
- Processing errors return 200 (to prevent retries)
- Critical errors are logged and can trigger alerts

---

## Performance

### Batch Processing

- Mentions sync in batches of 50
- Campaigns sync individually (with retry)
- Sentiment aggregation for batch updates

### Timeouts

- Default API timeout: 30 seconds
- Health check timeout: 5 seconds

---

## Port Registry Entry

```
4974 - BrandPulse Integration Service
```

---

## Development

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Production
npm start
```

---

## Related Services

- **TwinOS Hub** (4705) - Digital Twin registry
- **Customer Operations OS** (4990) - Operations management
- **Trust Intelligence** (4310) - Trust scoring
- **Executive Dashboard** (4000) - Analytics & KPIs
- **REZ Event Bus** (4510) - Event messaging

---

*Last Updated: June 2026*
