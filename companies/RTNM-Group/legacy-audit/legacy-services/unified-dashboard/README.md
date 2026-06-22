# RTNM Unified Dashboard Service

Cross-company analytics and executive dashboard aggregating metrics from all RTNM Group companies.

**Port: 4900**

## Companies Covered

- **REZ Consumer** - Consumer-facing app and services
- **REZ Merchant** - Merchant and restaurant solutions
- **RisaCare** - Healthcare and elder care platform
- **CorpPerks** - Corporate benefits and HR services
- **HOJAI AI** - AI agent orchestration platform

## Features

- Real-time unified metrics across all companies
- Period-over-period trend analysis
- Cross-company performance comparison
- AI-powered insights and recommendations
- Alert system for anomalies
- Export capabilities (CSV, PDF)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/metrics` | Unified metrics across all companies |
| GET | `/api/metrics/:company` | Company-specific metrics |
| GET | `/api/metrics/:company/trends` | Historical trends |
| GET | `/api/compare` | Cross-company comparison |
| GET | `/api/insights` | AI-generated insights |
| GET | `/api/alerts` | Active alerts |

## Quick Start

```bash
npm install
npm run build
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 4900 |
| REFRESH_INTERVAL | Metrics refresh (ms) | 300000 |

## Data Sources

In production, this service aggregates from:
- REZ-analytics-service (port 4702)
- RisaCare analytics endpoints
- CorpPerks metrics APIs
- HOJAI AI observability data
