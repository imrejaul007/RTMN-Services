# Executive Copilot Service

**Version:** 1.0.0
**Port:** 4933
**Status:** Ready for Development

---

## Overview

Executive Copilot is an AI-powered service designed for CEOs and executive leadership. It provides daily briefings, risk alerts, board-ready summaries, KPI tracking, and revenue forecasting.

## Features

- **Daily Morning Briefing** - Automated AI-generated briefings at 6 AM
- **Risk Alerts** - Real-time identification and tracking of business risks
- **Opportunity Highlights** - Discovery of growth opportunities
- **Board-Ready Summaries** - Executive summaries formatted for board presentations
- **KPI Tracking** - Comprehensive key performance indicator monitoring
- **Revenue Forecasting** - Data-driven revenue predictions

## API Endpoints

### Health Check
```
GET /health
```

### Briefing
```
GET  /api/executive/briefing              - Get latest briefing
GET  /api/executive/briefing/history      - Get briefing history
GET  /api/executive/briefing/:id          - Get specific briefing
POST /api/executive/briefing/generate     - Generate new briefing
```

### Alerts
```
GET  /api/executive/alerts                 - Get all alerts
GET  /api/executive/alerts/unread         - Get unread alerts
GET  /api/executive/alerts/action-required - Get action-required alerts
GET  /api/executive/alerts/stats          - Get alert statistics
POST /api/executive/alerts/:id/read        - Mark as read
POST /api/executive/alerts/:id/acknowledge - Acknowledge alert
POST /api/executive/alerts/mark-all-read  - Mark all as read
```

### Summary
```
GET /api/executive/summary                - Get daily summary
GET /api/executive/summary/weekly         - Get weekly summary
GET /api/executive/summary/monthly        - Get monthly summary
GET /api/executive/summary/board          - Get board-ready summary
```

### Recommendations
```
GET  /api/executive/recommendations       - Get all recommendations
GET  /api/executive/recommendations/strategic - Get strategic recommendations
GET  /api/executive/recommendations/operational - Get operational recommendations
GET  /api/executive/recommendations/by-category - Get grouped by category
POST /api/executive/recommendations       - Add new recommendation
PATCH /api/executive/recommendations/:id  - Update recommendation
DELETE /api/executive/recommendations/:id  - Delete recommendation
```

### Forecast
```
GET /api/executive/forecast               - Get all forecasts
GET /api/executive/forecast/revenue       - Get revenue forecast
GET /api/executive/forecast/growth        - Get growth forecast
GET /api/executive/forecast/customers     - Get customer forecast
GET /api/executive/forecast/scenarios     - Get forecast scenarios
```

## Quick Start

```bash
# Install dependencies
cd services/executive-copilot
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start the service
npm run dev

# Or build and start production version
npm run build
npm start
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4933 | Service port |
| MONGODB_URI | mongodb://localhost:27017/executive-copilot | MongoDB connection string |
| OPENAI_API_KEY | - | OpenAI API key for AI features |
| LOG_LEVEL | info | Logging level |
| ALLOWED_ORIGINS | * | CORS allowed origins |

## Data Models

### Briefing
- Daily executive briefing with sections, metrics, risks, opportunities
- Generated automatically at 6 AM or on-demand

### Alert
- Executive alerts with severity levels
- Supports risk, opportunity, milestone, warning, info types
- Action tracking with acknowledgment

### Metric
- Key performance indicators with history
- Support for targets and thresholds
- Status tracking (on-track, at-risk, off-track)

### Recommendation
- AI-generated strategic recommendations
- Impact and effort assessment
- Priority ordering

### Forecast
- Revenue, growth, and customer predictions
- Confidence levels and scenario analysis
- Multiple time horizons

## Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| Daily Briefing | 6:00 AM | Generate daily executive briefing |
| Metric Update | Every hour | Refresh metric data |
| Alert Cleanup | Midnight | Clean old acknowledged alerts |
| Weekly Summary | Monday 7 AM | Generate weekly executive summary |

## Integration Points

The service integrates with:
- Service Registry (4399) - Service discovery
- Event Bus (4510) - Pub/sub for alerts
- GraphQL Federation (4000) - Unified API access

## Development

### Build
```bash
npm run build
```

### Run Development
```bash
npm run dev
```

### Type Checking
```bash
npx tsc --noEmit
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Executive Copilot (4933)               │
├─────────────────────────────────────────────────────┤
│  Routes Layer                                        │
│  ├── briefing.ts   - Daily briefings                │
│  ├── alerts.ts     - Executive alerts               │
│  ├── summary.ts    - Executive summaries            │
│  ├── recommendations.ts - AI recommendations       │
│  └── forecast.ts   - Revenue/metric forecasting     │
├─────────────────────────────────────────────────────┤
│  Services Layer                                      │
│  ├── briefingGenerator.ts - AI briefing generation  │
│  ├── riskAnalyzer.ts      - Risk identification      │
│  ├── opportunityFinder.ts - Opportunity discovery    │
│  ├── insights.ts          - Executive insights       │
│  └── scheduler.ts          - Task scheduling         │
├─────────────────────────────────────────────────────┤
│  Models Layer                                        │
│  ├── Briefing.ts   - MongoDB briefing schema        │
│  ├── Alert.ts      - MongoDB alert schema           │
│  └── Metric.ts     - MongoDB metric schema          │
└─────────────────────────────────────────────────────┘
```

## License

Internal use only - RTMN Ecosystem
