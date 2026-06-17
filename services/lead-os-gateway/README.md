# LeadOS Gateway

Unified Lead Intelligence API for the RTMN ecosystem - connects all lead intelligence services.

## Overview

LeadOS Gateway provides a unified API that connects:
- Lead discovery (Google Places, Knowledge Graph)
- Data enrichment (Atlas GTM, HOJAI Lead)
- Lead scoring (Atlas GTM, HOJAI Lead)
- Lead qualification (Hot/Warm/Cold, Spam, Competitor, Customer)
- Multi-channel outreach (Email, LinkedIn, Phone, SMS, WhatsApp)
- AI company intelligence (Account Intel, Signals, Research)
- CRM integration (HubSpot, CRM Engine)
- Analytics and reporting (Journey Intelligence)

## Quick Start

```bash
# Install dependencies
npm install

# Start the service
npm start

# Development mode (with auto-reload)
npm run dev
```

## Service Information

- **Port:** 5175
- **Health Check:** `GET /health`
- **API Docs:** `GET /api`

## API Endpoints

### Discovery
```
GET  /api/discover/google?query=...&location=...
GET  /api/discover/search?query=...
POST /api/discover/batch
```

### Enrichment
```
POST /api/enrich/company
POST /api/enrich/contact
POST /api/enrich/bulk
GET  /api/enrich/status/:jobId
```

### Scoring
```
POST /api/score/lead
POST /api/score/bulk
GET  /api/score/:leadId
```

### Qualification
```
POST /api/qualify/lead
POST /api/qualify/classify
GET  /api/qualify/types
```

### Outreach
```
POST /api/outreach/sequence
POST /api/outreach/execute
GET  /api/outreach/status/:campaignId
POST /api/outreach/pause
POST /api/outreach/resume
```

### Intelligence
```
POST /api/intelligence/company
POST /api/intelligence/research
GET  /api/intelligence/signals/:companyId
GET  /api/intelligence/competitors/:companyId
```

### Leads
```
GET    /api/leads
GET    /api/leads/:id
POST   /api/leads
PATCH  /api/leads/:id
DELETE /api/leads/:id
POST   /api/leads/:id/enrich
POST   /api/leads/:id/score
POST   /api/leads/:id/qualify
POST   /api/leads/:id/outreach
POST   /api/leads/:id/sync
```

### Analytics
```
GET /api/analytics/overview
GET /api/analytics/pipeline
GET /api/analytics/outreach
GET /api/analytics/conversion
GET /api/analytics/sources
GET /api/analytics/team
GET /api/analytics/trends
```

## Connected Services

| Service | Port | Purpose |
|---------|------|---------|
| REZ-SalesMind | 5170 | AI Copilot, Outreach |
| Atlas Discover | 4001 | Google Places |
| Atlas GTM | 4004 | Apollo, Clearbit, ZoomInfo |
| Atlas Signals | 4003 | Buying signals |
| HOJAI Lead | 4752 | Lead scoring |
| HOJAI Knowledge Graph | 4786 | Entity relationships |
| Lead Twin | 4894 | Lead database |
| CRM Engine | 4888 | Deals, Contacts |
| REZ CRM Hub | 4056 | HubSpot sync |
| Journey Intelligence | 4954 | Funnel analytics |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
PORT=5175
REZ_SALESMIND_URL=http://localhost:5170
ATLAS_DISCOVER_URL=http://localhost:4001
ATLAS_GTM_URL=http://localhost:4004
ATLAS_SIGNALS_URL=http://localhost:4003
HOJAI_LEAD_URL=http://localhost:4752
HOJAI_KNOWLEDGE_GRAPH_URL=http://localhost:4786
LEAD_TWIN_URL=http://localhost:4894
CRM_ENGINE_URL=http://localhost:4888
REZ_CRM_HUB_URL=http://localhost:4056
JOURNEY_INTELLIGENCE_URL=http://localhost:4954
LOG_LEVEL=info
```

## Mock Data Fallback

When connected services are unavailable, the gateway returns realistic mock data for demos.

## License

Internal use only - RTMN Ecosystem
