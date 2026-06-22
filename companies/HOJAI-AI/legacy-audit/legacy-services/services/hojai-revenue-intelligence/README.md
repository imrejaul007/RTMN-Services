# HOJAI Revenue Intelligence

> **HOJAI AI** | Company: hojai-ai  
> **Port:** 4757 | **Status:** ✅ **BUILT** (June 13, 2026)

## Overview

**HOJAI Revenue Intelligence** provides comprehensive revenue analytics and forecasting capabilities. Track ARR, MRR, LTV, CAC, churn rate, and generate predictive insights.

### Key Features

- 📊 **Revenue Metrics** - Track ARR, MRR, LTV, CAC, churn rate
- 🔮 **Forecasting** - ML-based revenue predictions
- 🚨 **Alert System** - Automatic alerts for churn risk and anomalies
- 📈 **Health Metrics** - Comprehensive business health dashboard
- 💰 **Burn Rate** - Track burn rate and runway
- 📉 **Churn Analysis** - Detect and track customer churn

## Architecture

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| Database | MongoDB 6.x |
| Validation | Zod 3.x |
| Auth | JWT + API Key |

## API Endpoints

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/metrics` | List revenue metrics |
| POST | `/api/v1/metrics` | Record metric |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics` | Business analytics overview |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/alerts` | List alerts |
| POST | `/api/v1/alerts/:id/acknowledge` | Acknowledge alert |

## Supported Metrics

| Metric | Description |
|--------|-------------|
| arr | Annual Recurring Revenue |
| mrr | Monthly Recurring Revenue |
| revenue | Total revenue |
| new_revenue | New revenue |
| expansion | Expansion revenue |
| churn | Churn rate (%) |
| net_new | Net new revenue |
| ltv | Lifetime Value |
| cac | Customer Acquisition Cost |
| burn_rate | Monthly burn rate |
| runway_months | Months of runway |

## Security Features

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ |
| API Key Auth | ✅ |
| Rate Limiting | ✅ |
| Input Validation (Zod) | ✅ |
| Graceful Shutdown | ✅ |
| Health Checks | ✅ |

## Quick Start

```bash
npm install
npm run dev
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | 4757 |
| MONGODB_URI | Yes | MongoDB connection |
| JWT_SECRET | Yes | JWT signing |
| HOJAI_REVENUE_INTELLIGENCE_API_KEY | Yes | API key |
| CORS_ORIGIN | No | Allowed origins |

---

**License:** Proprietary - RTNM Digital  
**Last Updated:** June 13, 2026
