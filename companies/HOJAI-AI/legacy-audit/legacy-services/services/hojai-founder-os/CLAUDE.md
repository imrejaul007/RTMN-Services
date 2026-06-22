# CLAUDE.md - HOJAI FounderOS

## Project Overview

**Name:** HOJAI FounderOS
**Type:** HOJAI AI Core Service
**Purpose:** Company Building Tools and AI-Powered Executive Briefings for CoPilot

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript (ESM)
- **Database:** MongoDB
- **Validation:** Zod
- **Auth:** JWT

## Project Structure

```
hojai-founder-os/
├── src/
│   ├── index.ts              # Main entry point
│   ├── routes/
│   │   ├── businessModel.ts  # Business model routes
│   │   ├── gtm.ts            # GTM strategy routes
│   │   ├── fundraising.ts    # Fundraising routes
│   │   ├── hiring.ts         # Hiring routes
│   │   ├── marketAnalysis.ts # Market analysis routes
│   │   ├── briefings.ts      # Briefing routes
│   │   └── analytics.ts      # Analytics routes
│   ├── services/
│   │   ├── businessModelService.ts
│   │   ├── gtmService.ts
│   │   ├── fundraisingService.ts
│   │   ├── hiringService.ts
│   │   ├── marketAnalysisService.ts
│   │   ├── briefingService.ts
│   │   └── analyticsService.ts
│   ├── models/
│   │   └── index.ts          # Mongoose models
│   ├── types/
│   │   └── index.ts          # TypeScript types & Zod schemas
│   ├── middleware/
│   │   ├── tenant.ts         # Tenant isolation
│   │   └── auth.ts           # JWT authentication
│   └── utils/
│       └── logger.ts         # JSON logging
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
└── CLAUDE.md
```

**Default Port:** 4260

## MongoDB Collections

| Collection | Purpose |
|------------|---------|
| BusinessModel | Business model canvas data |
| GTMStrategy | Go-to-market strategies |
| FundraisingPlan | Fundraising tracking |
| HiringPlan | Hiring plans and roles |
| MarketAnalysis | Market research and TAM/SAM/SOM |
| FounderBriefing | AI-generated briefings |
| BriefingTemplate | Briefing templates |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Service port (default: 4260) |
| MONGODB_URI | Yes | MongoDB connection string |
| JWT_SECRET | Yes | JWT signing secret |
| HOJAI_REVENUE_URL | No | Revenue service URL |
| HOJAI_CUSTOMER_URL | No | Customer service URL |
| HOJAI_PRODUCT_URL | No | Product service URL |
| HOJAI_GOAL_URL | No | GoalOS URL |
| HOJAI_MEETING_URL | No | Meeting service URL |
| HOJAI_WORKFORCE_URL | No | Workforce service URL |

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |

## API Routes Summary

### Health
- `GET /health` - Basic health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe (checks MongoDB)

### Business Model Canvas
- `GET /api/business-model` - List all
- `POST /api/business-model` - Create
- `POST /api/business-model/generate` - AI generate
- `GET /api/business-model/:id` - Get by ID
- `PATCH /api/business-model/:id` - Update
- `DELETE /api/business-model/:id` - Delete
- `GET /api/business-model/:id/analyze` - Gap analysis

### GTM Strategy
- `GET /api/gtm` - List all
- `POST /api/gtm` - Create
- `POST /api/gtm/generate` - Generate from business model
- `GET /api/gtm/:id` - Get by ID
- `PATCH /api/gtm/:id` - Update
- `DELETE /api/gtm/:id` - Delete

### Fundraising
- `GET /api/fundraising` - List all
- `POST /api/fundraising` - Create
- `GET /api/fundraising/:id` - Get by ID
- `PATCH /api/fundraising/:id` - Update
- `DELETE /api/fundraising/:id` - Delete
- `POST /api/fundraising/:id/investors` - Add investor
- `PATCH /api/fundraising/:id/investors/:name/status` - Update investor

### Hiring
- `GET /api/hiring` - List all
- `POST /api/hiring` - Create
- `GET /api/hiring/:id` - Get by ID
- `PATCH /api/hiring/:id` - Update
- `DELETE /api/hiring/:id` - Delete
- `POST /api/hiring/:id/roles` - Add role
- `PATCH /api/hiring/:id/roles/:roleId` - Update role
- `DELETE /api/hiring/:id/roles/:roleId` - Remove role

### Market Analysis
- `GET /api/market-analysis` - List all
- `POST /api/market-analysis` - Create
- `GET /api/market-analysis/:id` - Get by ID
- `PATCH /api/market-analysis/:id` - Update
- `DELETE /api/market-analysis/:id` - Delete
- `POST /api/market-analysis/:id/competitors` - Add competitor
- `GET /api/market-analysis/:id/competition` - Competitive analysis
- `GET /api/market-analysis/estimates` - TAM/SAM/SOM estimates

### Briefings
- `GET /api/briefing/daily` - Get daily briefing
- `POST /api/briefing/daily` - Generate daily
- `GET /api/briefing/weekly` - Get weekly briefing
- `POST /api/briefing/weekly` - Generate weekly
- `GET /api/briefing/board` - Get board briefing
- `POST /api/briefing/board` - Generate board
- `GET /api/briefing/investor` - Get investor briefing
- `POST /api/briefing/investor` - Generate investor
- `GET /api/briefing/templates` - List templates
- `POST /api/briefing/templates` - Create template

### Analytics
- `GET /api/analytics` - Founder dashboard
- `GET /api/analytics/business-model` - Business model analytics
- `GET /api/analytics/gtm` - GTM analytics
- `GET /api/analytics/timeline` - Milestone timeline

## AI Features

### Business Model Canvas Generation
- Generate canvas from company description
- Suggest value propositions based on market
- Identify revenue stream opportunities
- Gap analysis against business model patterns

### GTM Strategy Suggestions
- Recommend target segments based on TAM/SAM/SOM
- Suggest channels based on product type
- Pricing model recommendations
- Go-to-market timeline planning

### Executive Briefings

#### Daily CEO Briefing
- Key metrics from revenue/customer/product services
- Top 3 priorities for the day
- Risks to monitor
- Opportunities to pursue
- Meeting schedule integration

#### Weekly Executive Briefing
- Week-over-week performance summary
- Goal progress from GoalOS
- Project status
- Team metrics from workforce
- Recommended focus areas

#### Board Briefing
- Company performance summary
- Financial metrics (ARR, MRR, growth)
- Key milestones achieved
- Upcoming milestones
- Fundraising status
- Team growth

#### Investor Briefing
- Investor-ready metrics
- Traction highlights
- Financial model summary
- Ask amount and use of funds
- Competitive positioning

## Integration Points

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| hojai-revenue-intelligence | 4780 | Revenue metrics for briefings |
| hojai-customer-intelligence | 4752 | Customer data for briefings |
| hojai-product-intelligence | 4790 | Product metrics for briefings |
| hojai-goal-os | 4800 | Goal progress for briefings |
| hojai-meeting-intelligence | 4810 | Meeting schedule for daily briefing |
| hojai-workforce | 4820 | Team metrics for briefings |

## Deployment Checklist

- [x] Codebase complete
- [x] Documentation complete (README.md)
- [x] Health endpoints implemented
- [x] Docker support configured
- [x] Environment variables documented
- [x] Tenant isolation on all schemas
- [x] JWT authentication middleware
- [x] Zod validation on all routes
- [x] JSON logging with structured events
- [x] Graceful shutdown handling

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Verify MONGODB_URI |
| JWT validation fails | Verify JWT_SECRET |
| Health check fails | Check MongoDB connection |
| Briefing data empty | Verify service URLs in environment |

---

**Last Updated:** 2026-06-12