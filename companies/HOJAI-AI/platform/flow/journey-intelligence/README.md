# Journey Intelligence Service

Lead journey tracking and analytics service for LeadOS.

## Overview

Journey Intelligence Service provides journey tracking and analytics capabilities including conversion funnels, sales pipelines, and trend analysis.

## Quick Start

```bash
cd journey-intelligence
npm install
npm start
```

## Port

**4954**

## Endpoints

### Health Check
```
GET /health
```

### Overview
```
GET /overview
```

### Journey Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /journey | List all journeys |
| GET | /journey/:id | Get single journey |
| POST | /journey | Create new journey |
| PATCH | /journey/:id | Update journey stage |
| DELETE | /journey/:id | Delete journey |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /analytics/overview | Overview metrics |
| GET | /analytics/funnel | Conversion funnel |
| GET | /analytics/pipeline | Sales pipeline stages |
| GET | /analytics/trends | Monthly trend data |
| GET | /analytics/performance | Performance by source |

## Data Models

### Journey
```json
{
  "id": "journey_123456789",
  "leadId": "lead_sample_1",
  "stage": "consideration",
  "company": "TechCorp",
  "value": 50000,
  "milestones": [
    {
      "from": "awareness",
      "to": "consideration",
      "timestamp": "2026-06-17T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-06-17T10:00:00.000Z"
}
```

### Funnel Stage
```json
{
  "stage": "awareness",
  "count": 1000,
  "conversionRate": 0.15,
  "dropoff": 850
}
```

### Pipeline Stage
```json
{
  "stage": "Qualified",
  "count": 20,
  "value": 150000,
  "probability": 50
}
```

## Metrics Overview

The service provides comprehensive metrics including:
- Total leads and qualified leads
- Open deals and revenue
- Conversion rate
- Average time to convert
- Active campaigns
