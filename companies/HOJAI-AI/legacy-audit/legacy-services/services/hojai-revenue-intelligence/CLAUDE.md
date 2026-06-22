# HOJAI Revenue Intelligence - Service Documentation

**Company:** HOJAI AI  
**Port:** 4757  
**Version:** 1.0.0  
**Status:** ✅ **BUILT** (June 13, 2026)

---

## Overview

**HOJAI Revenue Intelligence** provides comprehensive revenue analytics and forecasting. Track ARR, MRR, LTV, CAC, churn rate, and generate predictive insights.

### Key Capabilities

- **Revenue Metrics** - Track ARR, MRR, LTV, CAC, churn rate
- **Forecasting** - ML-based revenue predictions
- **Churn Analysis** - Detect and track customer churn
- **LTV Calculation** - Customer lifetime value tracking
- **CAC Tracking** - Customer acquisition cost monitoring
- **Alert System** - Automatic alerts for churn risk
- **Burn Rate** - Track burn rate and runway
- **Health Metrics** - Comprehensive business health

---

## Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| Database | MongoDB 6.x |
| Validation | Zod 3.x |
| Logging | Pino |
| Auth | JWT + API Key |

### Directory Structure

```
hojai-revenue-intelligence/
├── src/
│   ├── index.ts          # Main server
│   └── types/
│       └── index.ts     # Type definitions
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── README.md
└── CLAUDE.md
```

---

## Data Models

### RevenueMetric

```typescript
{
  id: string;
  metricType: 'arr' | 'mrr' | 'revenue' | 'new_revenue' | 'expansion' | 'churn' | 'net_new' | 'ltv' | 'cac' | 'burn_rate' | 'runway_months';
  value: number;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
}
```

### Alert

```typescript
{
  id: string;
  type: 'churn_risk' | 'revenue_drop' | 'burn_rate' | 'milestone' | 'opportunity';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metricValue?: number;
  threshold?: number;
  acknowledged: boolean;
}
```

---

## API Endpoints

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Full health check |
| GET | `/health/live` | No | Liveness probe |
| GET | `/health/ready` | No | Readiness probe |

### Metrics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/metrics` | Yes | List metrics |
| POST | `/api/v1/metrics` | Yes | Record metric |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/analytics` | Yes | Business analytics |

### Alerts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/alerts` | Yes | List alerts |
| POST | `/api/v1/alerts/:id/acknowledge` | Yes | Acknowledge alert |

---

## Calculations

### Churn Rate

```typescript
churnRate = (churned / total) * 100
```

### CAC

```typescript
cac = marketingCost / newCustomers
```

### LTV

```typescript
ltv = revenue / (churnRate / 100)
```

### Runway

```typescript
runway = cash / burnRate
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4757 | Service port |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing |
| HOJAI_REVENUE_INTELLIGENCE_API_KEY | Yes | - | API key |
| CORS_ORIGIN | No | - | Allowed origins |

---

## Related Documents

| Document | Location |
|----------|----------|
| README.md | ./README.md |
| RTNM-COMPANIES-AUDIT.md | ../../../RTNM-COMPANIES-AUDIT.md |
| RTNM-PRODUCTS-FEATURES-AUDIT.md | ../../../RTNM-PRODUCTS-FEATURES-AUDIT.md |

---

**Last Updated:** June 13, 2026  
**Built by:** Claude Code
