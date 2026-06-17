# Campaign Twin Service

Marketing campaigns, channels, and ROI tracking for the RTMN ecosystem.

**Version:** 1.0.0
**Port:** 4909
**Status:** Production Ready

---

## Overview

Campaign Twin is a microservice that manages marketing campaigns across multiple channels. It provides comprehensive tracking of campaign metrics, ROI calculation, channel allocation, and analytics.

---

## Features

### Campaign Management
- Create, read, update, delete campaigns
- Multiple campaign types: email, SMS, social, ads, SEO, content, influencer
- Campaign objectives: awareness, consideration, conversion, retention
- Status tracking: draft, scheduled, active, paused, completed, cancelled
- Multi-channel support with budget allocation

### Channel Management
- Configure marketing channels
- Channel types: email, SMS, social, ads, SEO, content, influencer, display, video
- Provider configuration and credentials management
- Status tracking for each channel

### Metrics Tracking
- Real-time metrics recording
- Daily metrics aggregation
- Channel-specific breakdown
- Automated ROI calculation
- Performance rate computation (CTR, CPC, CPA, ROAS)

### Analytics
- Comprehensive campaign analytics
- Trend analysis
- ROI forecasting
- Multi-campaign comparison
- Industry benchmarking

---

## API Endpoints

### Health & Info
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/` | Service information |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns` | List campaigns |
| GET | `/api/campaigns/:campaignId` | Get campaign |
| PUT | `/api/campaigns/:campaignId` | Update campaign |
| DELETE | `/api/campaigns/:campaignId` | Delete campaign |
| PATCH | `/api/campaigns/:campaignId/status` | Update status |
| PATCH | `/api/campaigns/:campaignId/metrics` | Update metrics |
| GET | `/api/campaigns/:campaignId/stats` | Get campaign stats |
| GET | `/api/campaigns/tenant/:tenantId` | Tenant campaigns |

### Channels
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/channels` | Create channel |
| GET | `/api/channels` | List channels |
| GET | `/api/channels/:channelId` | Get channel |
| PUT | `/api/channels/:channelId` | Update channel |
| DELETE | `/api/channels/:channelId` | Delete channel |
| PATCH | `/api/channels/:channelId/status` | Update status |
| GET | `/api/channels/tenant/:tenantId` | Tenant channels |
| GET | `/api/channels/types/summary` | Channel summary |

### Metrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/metrics/record` | Record metrics |
| GET | `/api/metrics/campaign/:campaignId` | Campaign metrics |
| GET | `/api/metrics/summary/:campaignId` | Metrics summary |
| POST | `/api/metrics/summary/generate` | Generate summary |
| GET | `/api/metrics/channels/:campaignId` | Channel breakdown |
| PATCH | `/api/metrics/campaign/:campaignId/bulk` | Bulk update |

---

## Data Models

### Campaign
```typescript
{
  campaignId: string;
  tenantId: string;
  name: string;
  description?: string;
  objective: 'awareness' | 'consideration' | 'conversion' | 'retention';
  type: 'email' | 'sms' | 'social' | 'ads' | 'seo' | 'content' | 'influencer';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  channels: [{ channel, budget, spent }];
  startDate: Date;
  endDate: Date;
  targetAudience?: { demographics, interests, locations };
  metrics: { impressions, clicks, leads, conversions, revenue };
  roi: { calculated, value, cost, revenue };
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Channel
```typescript
{
  channelId: string;
  tenantId: string;
  name: string;
  type: 'email' | 'sms' | 'social' | 'ads' | 'seo' | 'content' | 'influencer' | 'display' | 'video';
  provider?: string;
  config: { apiKey, accountId, audienceSize, avgCpc, avgCpm, ... };
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  isEnabled: boolean;
}
```

### DailyMetrics
```typescript
{
  metricId: string;
  campaignId: string;
  tenantId: string;
  date: Date;
  metrics: { impressions, clicks, leads, conversions, revenue, spend };
  channelMetrics?: [{ channel, impressions, clicks, spend }];
}
```

---

## Quick Start

```bash
# Install dependencies
cd services/campaign-twin
npm install

# Start in development
npm run dev

# Build for production
npm run build

# Start production
npm start

# Health check
curl http://localhost:4909/health
```

---

## Environment Variables

```bash
PORT=4909
MONGODB_URI=mongodb://localhost:27017/campaign_twin
NODE_ENV=development
LOG_LEVEL=info
```

---

## Example Usage

### Create a Campaign
```bash
curl -X POST http://localhost:4909/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "name": "Summer Sale Campaign",
    "objective": "conversion",
    "type": "social",
    "startDate": "2026-06-01T00:00:00Z",
    "endDate": "2026-06-30T23:59:59Z",
    "channels": [
      { "channel": "facebook", "budget": 5000 },
      { "channel": "instagram", "budget": 3000 }
    ]
  }'
```

### Record Metrics
```bash
curl -X POST http://localhost:4909/api/metrics/record \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "CMP-ABC12345",
    "tenantId": "tenant-123",
    "metrics": {
      "impressions": 50000,
      "clicks": 1500,
      "conversions": 75,
      "revenue": 7500
    }
  }'
```

### Get Analytics
```javascript
const response = await fetch('http://localhost:4909/api/campaigns/CMP-ABC12345/stats');
const data = await response.json();
console.log(data);
```

---

## Service Integration

### Event Bus
Publish campaign events:
```javascript
// Publish to REZ-event-bus (port 4510)
eventBus.publish('campaign.created', { campaignId, tenantId });
eventBus.publish('campaign.completed', { campaignId, metrics });
```

### Service Registry
Register at: `REZ-ecosystem-connector` (port 4399)

---

## Related Services

- **REZ-crm-hub** (port 4056) - CRM integration
- **AdBazaar** - Ad platform
- **REZ-event-bus** (port 4510) - Event messaging
- **REZ-ecosystem-connector** (port 4399) - Service registry

---

## License

RTMN Ecosystem - Internal Use
