# BrandPulse - Brand Monitoring & Analytics Service

**Version:** 1.0.0
**Port:** 4974
**Status:** Ready for Development

---

## Overview

BrandPulse is a comprehensive brand monitoring, social listening, reputation tracking, and brand health analytics service for the RTMN ecosystem.

### Key Features

- **Social Media Monitoring** - Track brand mentions across Twitter, Facebook, Instagram, LinkedIn, and news sources
- **Sentiment Analysis** - Real-time sentiment scoring with positive/neutral/negative classification
- **Brand Health Score** - Composite health score (0-100) based on 5 key metrics
- **Campaign Tracking** - Monitor and track brand campaign performance
- **Crisis Detection** - Automated crisis alerts with severity classification
- **Competitor Comparison** - Compare brand health against competitors
- **TwinOS Integration** - Sync to Journey Twin, Campaign Twin, and Trust Intelligence

---

## Architecture

```
                    ┌──────────────────────────────────────┐
                    │           BrandPulse (Port 4974)      │
                    ├──────────────────────────────────────┤
                    │  Routes: Brands, Mentions, Sentiment  │
                    │  Campaigns, Analytics, Alerts         │
                    ├──────────────────────────────────────┤
                    │  Services:                            │
                    │  - SocialMonitor (Social listening)   │
                    │  - SentimentAnalysis (NLP)            │
                    │  - BrandHealth (Health scoring)        │
                    │  - CustomerOpsBridge (Integration)    │
                    │  - TwinSync (TwinOS Hub)              │
                    └──────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  TwinOS Hub     │  │ Customer Ops    │  │  MongoDB        │
│  (Port 4705)    │  │ Bridge (4399)   │  │  (brandpulse)   │
│                 │  │                 │  │                 │
│ - Journey Twin  │  │ - Crisis Alert   │  │ - Brands        │
│ - Campaign Twin │  │ - Trust Intel   │  │ - Mentions      │
│ - Trust Twin    │  │ - Journey Events │  │ - Sentiment     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## API Endpoints

### Brands
```
GET    /api/brands                    # List all brands
GET    /api/brands/:id                # Get brand by ID
POST   /api/brands                    # Create brand
PUT    /api/brands/:id                # Update brand
DELETE /api/brands/:id                # Delete brand
PATCH  /api/brands/:id/settings       # Update brand settings
POST   /api/brands/:id/competitors    # Add competitors
GET    /api/brands/:id/competitors    # Get competitor comparison
```

### Mentions
```
GET    /api/mentions/brand/:brandId           # List mentions
GET    /api/mentions/:id                      # Get mention by ID
POST   /api/mentions                          # Create mention
POST   /api/mentions/bulk                     # Bulk create mentions
GET    /api/mentions/crisis/:brandId          # Get crisis mentions
GET    /api/mentions/sources/:brandId/:source # Get by source
GET    /api/mentions/trending/:brandId        # Get trending mentions
PATCH  /api/mentions/:id/crisis              # Mark as crisis
DELETE /api/mentions/:id                     # Delete mention
```

### Sentiment
```
GET    /api/sentiment/brand/:brandId          # Get sentiment history
GET    /api/sentiment/brand/:brandId/latest  # Get latest sentiment
POST   /api/sentiment/analyze                 # Analyze text
GET    /api/sentiment/sources/:brandId        # Get by source
GET    /api/sentiment/trends/:brandId         # Get sentiment trends
GET    /api/sentiment/report/:brandId         # Generate report
POST   /api/sentiment/calculate/:brandId      # Calculate from mentions
```

### Campaigns
```
GET    /api/campaigns/brand/:brandId         # List campaigns
GET    /api/campaigns/:id                     # Get campaign
POST   /api/campaigns                         # Create campaign
PUT    /api/campaigns/:id                    # Update campaign
PATCH  /api/campaigns/:id/status              # Update status
GET    /api/campaigns/:id/performance         # Get performance
POST   /api/campaigns/:id/milestones         # Add milestone
GET    /api/campaigns/:id/alerts             # Get alerts
POST   /api/campaigns/:id/alerts              # Add alert
DELETE /api/campaigns/:id                     # Delete campaign
```

### Analytics
```
GET    /api/analytics/health/:brandId        # Get health score
GET    /api/analytics/overview/:brandId      # Get overview
GET    /api/analytics/volume/:brandId         # Get mention volume
GET    /api/analytics/engagement/:brandId     # Get engagement stats
GET    /api/analytics/demographics/:brandId  # Get demographics
GET    /api/analytics/competitors/:brandId    # Compare competitors
GET    /api/analytics/crisis/:brandId         # Get crisis analytics
GET    /api/analytics/trending/:brandId       # Get trending topics
```

### Alerts
```
GET    /api/alerts/brand/:brandId             # List alerts
GET    /api/alerts/brand/:brandId/count       # Get alert counts
GET    /api/alerts/brand/:brandId/history     # Get alert history
GET    /api/alerts/:id                        # Get alert
POST   /api/alerts                            # Create alert
POST   /api/alerts/crisis                     # Create crisis alert
POST   /api/alerts/sentiment                  # Create sentiment alert
POST   /api/alerts/volume                     # Create volume alert
PATCH  /api/alerts/:id/acknowledge            # Acknowledge
POST   /api/alerts/bulk/acknowledge           # Bulk acknowledge
DELETE /api/alerts/:id                        # Delete alert
```

---

## Data Models

### Brand
| Field | Type | Description |
|-------|------|-------------|
| brandId | String | Unique identifier (BRAND-XXXXXXXX) |
| name | String | Brand name |
| slug | String | URL-friendly slug |
| industry | String | Industry category |
| keywords | String[] | Tracking keywords |
| competitors | String[] | Competitor names |
| currentHealth | Object | Health score and trend |
| settings | Object | Alert thresholds |

### Mention
| Field | Type | Description |
|-------|------|-------------|
| mentionId | String | Unique identifier |
| brandId | String | Parent brand |
| source | String | Platform (twitter, facebook, etc.) |
| content | String | Mention text |
| sentiment | Object | Score, label, confidence |
| engagement | Object | Likes, shares, comments, reach |
| isCrisis | Boolean | Crisis flag |

### Campaign
| Field | Type | Description |
|-------|------|-------------|
| campaignId | String | Unique identifier |
| brandId | String | Parent brand |
| name | String | Campaign name |
| hashtags | String[] | Campaign hashtags |
| status | String | planning, active, paused, completed |
| performance | Object | Reach, impressions, engagement |
| milestones | Array | Campaign milestones |

---

## Brand Health Score (0-100)

The composite health score is calculated from 5 components:

| Component | Weight | Description |
|-----------|--------|-------------|
| Sentiment | 30% | Positive vs negative mentions ratio |
| Engagement | 25% | Average engagement per mention |
| Reach | 20% | Total reach and audience diversity |
| Growth | 15% | Mentions growth vs previous period |
| Crisis | 10% | Crisis mentions and velocity spikes |

### Score Ranges
- **80-100**: Excellent brand health
- **60-79**: Good brand health
- **40-59**: Average brand health
- **20-39**: Below average - attention needed
- **0-19**: Poor brand health - crisis mode

---

## Integration Points

### TwinOS Hub (Port 4705)
| Sync | Endpoint | Data |
|------|----------|------|
| Journey Twin | /api/twins/journey/mentions | Brand mentions |
| Campaign Twin | /api/twins/campaign/sync | Campaign performance |
| Trust Twin | /api/twins/trust/sentiment | Sentiment data |
| Dashboard | /api/twins/dashboard/health | Brand health |

### Customer Operations Bridge (Port 4399)
| Integration | Purpose |
|-------------|---------|
| Crisis Alert | Real-time crisis notifications |
| Trust Intelligence | Brand trust metrics |
| Journey Events | Customer journey touchpoints |
| Campaign Performance | CampaignTwin sync |
| Notifications | Alert notifications |

---

## Environment Variables

```env
# Server
PORT=4974
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/brandpulse

# Social Media APIs
TWITTER_BEARER_TOKEN=your_token
FACEBOOK_ACCESS_TOKEN=your_token
INSTAGRAM_ACCESS_TOKEN=your_token
LINKEDIN_ACCESS_TOKEN=your_token
NEWS_API_KEY=your_key

# Sentiment Thresholds
SENTIMENT_THRESHOLD_NEGATIVE=-0.3
SENTIMENT_THRESHOLD_POSITIVE=0.3
CRISIS_VOLUME_THRESHOLD=100

# Integration
CUSTOMER_OPS_BRIDGE_URL=http://localhost:4399
TWIN_HUB_URL=http://localhost:4705

# Monitoring
SOCIAL_POLL_INTERVAL=300000
```

---

## Quick Start

```bash
# Install dependencies
cd services/brandpulse
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev

# Build for production
npm run build
npm start

# Health check
curl http://localhost:4974/health
```

---

## Example Usage

### Create a Brand
```bash
curl -X POST http://localhost:4974/api/brands \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "industry": "Technology",
    "keywords": ["Acme Corp", "Acme Product"],
    "competitors": ["Competitor Inc"]
  }'
```

### Track a Mention
```bash
curl -X POST http://localhost:4974/api/mentions \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "BRAND-XXXXXXXX",
    "source": "twitter",
    "content": "Love Acme Corp new product!",
    "author": { "name": "John Doe", "followers": 5000 },
    "publishedAt": "2026-06-15T10:00:00Z"
  }'
```

### Get Brand Health
```bash
curl http://localhost:4974/api/analytics/health/BRAND-XXXXXXXX
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | HTTP server |
| mongoose | ^8.0.3 | MongoDB ODM |
| axios | ^1.6.2 | HTTP client |
| sentiment | ^5.0.2 | Sentiment analysis |
| natural | ^6.10.4 | NLP toolkit |
| winston | ^3.11.0 | Logging |
| uuid | ^9.0.1 | ID generation |

---

## RTMN Integration

BrandPulse connects to the following RTMN services:

- **TwinOS Hub** - Digital twin synchronization
- **Customer Operations** - Crisis alerts and trust intelligence
- **REZ-ecosystem-connector** - Service discovery
- **REZ-event-bus** - Event publishing

---

*Last Updated: June 2026*
