# HOJAI FounderOS

> **HOJAI AI** | FounderOS for CoPilot - Company Building Tools and AI-Powered Executive Briefings

---

## Overview

HOJAI FounderOS is a comprehensive company building platform that provides:

- **Business Model Canvas** - Build and analyze your business model using proven frameworks
- **GTM Strategy Planning** - Create data-driven go-to-market strategies
- **Fundraising Planning** - Track and manage your fundraising journey
- **Hiring Plans** - Plan and track team growth
- **Market Analysis** - Analyze markets, competitors, and opportunities
- **AI Executive Briefings** - Daily CEO, weekly executive, board, and investor briefings

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

**Default Port:** `4260`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4260 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| HOJAI_REVENUE_URL | No | http://localhost:4780 | Revenue service URL |
| HOJAI_CUSTOMER_URL | No | http://localhost:4752 | Customer service URL |
| HOJAI_PRODUCT_URL | No | http://localhost:4790 | Product service URL |
| HOJAI_GOAL_URL | No | http://localhost:4800 | GoalOS URL |
| HOJAI_MEETING_URL | No | http://localhost:4810 | Meeting service URL |
| HOJAI_WORKFORCE_URL | No | http://localhost:4820 | Workforce service URL |

## API Endpoints

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Basic health check |
| GET | /health/live | Liveness probe |
| GET | /health/ready | Readiness probe |

### Business Model Canvas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/business-model | List business models |
| POST | /api/business-model | Create business model |
| POST | /api/business-model/generate | AI generate canvas |
| GET | /api/business-model/:id | Get business model |
| PATCH | /api/business-model/:id | Update business model |
| DELETE | /api/business-model/:id | Delete business model |
| GET | /api/business-model/:id/analyze | Analyze gaps |
| GET | /api/business-model/suggest/revenue-streams | Suggest revenue streams |

### GTM Strategy

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/gtm | List GTM strategies |
| POST | /api/gtm | Create GTM strategy |
| POST | /api/gtm/generate | Generate from business model |
| GET | /api/gtm/:id | Get GTM strategy |
| PATCH | /api/gtm/:id | Update GTM strategy |
| DELETE | /api/gtm/:id | Delete GTM strategy |

### Fundraising

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/fundraising | List fundraising plans |
| POST | /api/fundraising | Create fundraising plan |
| GET | /api/fundraising/:id | Get fundraising plan |
| PATCH | /api/fundraising/:id | Update fundraising plan |
| DELETE | /api/fundraising/:id | Delete fundraising plan |
| POST | /api/fundraising/:id/investors | Add investor |
| PATCH | /api/fundraising/:id/investors/:name/status | Update investor status |
| GET | /api/fundraising/analytics/summary | Get analytics |
| GET | /api/fundraising/milestones/template/:stage | Get milestone template |

### Hiring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/hiring | List hiring plans |
| POST | /api/hiring | Create hiring plan |
| GET | /api/hiring/:id | Get hiring plan |
| PATCH | /api/hiring/:id | Update hiring plan |
| DELETE | /api/hiring/:id | Delete hiring plan |
| POST | /api/hiring/:id/roles | Add role |
| PATCH | /api/hiring/:id/roles/:roleId | Update role |
| DELETE | /api/hiring/:id/roles/:roleId | Remove role |
| GET | /api/hiring/analytics/summary | Get analytics |
| GET | /api/hiring/suggest/roles/:stage | Suggest roles |

### Market Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/market-analysis | List market analyses |
| POST | /api/market-analysis | Create market analysis |
| GET | /api/market-analysis/:id | Get market analysis |
| PATCH | /api/market-analysis/:id | Update market analysis |
| DELETE | /api/market-analysis/:id | Delete market analysis |
| POST | /api/market-analysis/:id/competitors | Add competitor |
| GET | /api/market-analysis/:id/competition | Analyze competition |
| GET | /api/market-analysis/estimates | Generate TAM/SAM/SOM |

### Briefings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/briefing/daily | Get daily briefing |
| POST | /api/briefing/daily | Generate daily briefing |
| GET | /api/briefing/weekly | Get weekly briefing |
| POST | /api/briefing/weekly | Generate weekly briefing |
| GET | /api/briefing/board | Get board briefing |
| POST | /api/briefing/board | Generate board briefing |
| GET | /api/briefing/investor | Get investor briefing |
| POST | /api/briefing/investor | Generate investor briefing |
| GET | /api/briefing/templates | List templates |
| POST | /api/briefing/templates | Create template |
| GET | /api/briefing/history/:type | Get briefing history |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics | Founder analytics dashboard |
| GET | /api/analytics/business-model | Business model analytics |
| GET | /api/analytics/gtm | GTM analytics |
| GET | /api/analytics/timeline | Timeline/milestone analytics |

## Health Check

```bash
curl http://localhost:4260/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "hojai-founder-os",
  "version": "1.0.0",
  "timestamp": "2026-06-12T00:00:00.000Z"
}
```

## Tech Stack

| Component | Technology |
|-----------|-------------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB |
| Validation | Zod |

## Docker

```bash
# Build and run
docker-compose up -d

# Run only the app
docker build -t hojai-founder-os .
docker run -p 4260:4260 hojai-founder-os
```

## Integration Points

### HOJAI AI Services

| Service | Port | Purpose |
|---------|------|---------|
| Revenue Intelligence | 4780 | Revenue metrics |
| Customer Intelligence | 4752 | Customer data |
| Product Intelligence | 4790 | Product metrics |
| GoalOS | 4800 | Goal tracking |
| Meeting Intelligence | 4810 | Meeting schedule |
| Workforce | 4820 | Team metrics |

## License

Proprietary - RTNM Digital

---

**Last Updated:** 2026-06-12
**Version:** 1.0.0