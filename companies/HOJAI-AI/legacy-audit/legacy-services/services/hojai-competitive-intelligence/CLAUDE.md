# HOJAI Competitive Intelligence - Service Documentation

**Company:** HOJAI AI  
**Port:** 4756  
**Version:** 1.0.0  
**Status:** ✅ **BUILT** (June 13, 2026)

---

## Overview

**HOJAI Competitive Intelligence** tracks and analyzes competitors. Monitor competitor activities, detect threats and opportunities, and stay ahead of the market.

### Key Capabilities

- **Competitor Tracking** - Track competitors with detailed profiles
- **Funding Monitoring** - Monitor funding rounds and valuations
- **Hiring Intelligence** - Track competitor hiring trends
- **News Monitoring** - Track competitor news with sentiment analysis
- **Alert System** - Automatic threat and opportunity detection
- **Analytics** - Comprehensive competitor analytics

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
hojai-competitive-intelligence/
├── src/
│   ├── index.ts
│   ├── types/
│   │   └── index.ts
│   └── __tests__/
│       └── types.test.ts
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

### Competitor

```typescript
{
  id: string;
  name: string;
  description?: string;
  website?: string;
  logo?: string;
  industry: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  founded?: number;
  headquarters?: string;
  status: 'active' | 'inactive' | 'acquired' | 'defunct';
  metadata: object;
}
```

### FundingRound

```typescript
{
  id: string;
  competitorId: string;
  roundType: 'seed' | 'series_a' | 'series_b' | ...;
  amount: number;
  currency: string;
  valuation?: number;
  investors: string[];
  announcedDate: Date;
}
```

### Alert

```typescript
{
  id: string;
  competitorId?: string;
  type: 'threat' | 'opportunity' | 'milestone' | 'crisis';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  acknowledged: boolean;
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/competitors` | List competitors |
| POST | `/api/v1/competitors` | Create competitor |
| GET | `/api/v1/competitors/:id` | Get competitor |
| PUT | `/api/v1/competitors/:id` | Update competitor |
| DELETE | `/api/v1/competitors/:id` | Delete competitor |
| GET | `/api/v1/competitors/:id/analytics` | Competitor analytics |
| GET | `/api/v1/competitors/:id/products` | List products |
| POST | `/api/v1/competitors/:id/products` | Add product |
| GET | `/api/v1/competitors/:id/funding` | List funding |
| POST | `/api/v1/competitors/:id/funding` | Record funding |
| GET | `/api/v1/competitors/:id/hiring` | List hiring |
| POST | `/api/v1/competitors/:id/hiring` | Record hiring |
| GET | `/api/v1/news` | List news |
| POST | `/api/v1/news` | Record news |
| GET | `/api/v1/alerts` | List alerts |
| POST | `/api/v1/alerts` | Create alert |
| POST | `/api/v1/alerts/:id/acknowledge` | Acknowledge alert |

---

## Alert Detection

Automatic alerts are created based on:

| Event | Alert Type | Severity |
|-------|------------|----------|
| Negative news | threat | high |
| Positive news | opportunity | medium |
| 20%+ price drop | threat | high |
| Major funding round | threat/opportunity | depends |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4756 | Service port |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing |
| HOJAI_COMPETITIVE_INTELLIGENCE_API_KEY | Yes | - | API key |
| CORS_ORIGIN | No | - | Allowed origins |
| RATE_LIMIT_MAX | No | 100 | Max requests/minute |

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
