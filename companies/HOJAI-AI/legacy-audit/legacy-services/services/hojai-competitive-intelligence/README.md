# HOJAI Competitive Intelligence

> **HOJAI AI** | Company: hojai-ai  
> **Port:** 4756 | **Status:** ✅ **BUILT** (June 13, 2026)

## Overview

**HOJAI Competitive Intelligence** tracks and analyzes competitors. Monitor competitor activities, detect threats and opportunities, and stay ahead of the market.

### Key Features

- 🏢 **Competitor Tracking** - Track competitors with detailed profiles
- 💰 **Funding Monitoring** - Monitor funding rounds and valuations
- 👥 **Hiring Intelligence** - Track competitor hiring trends
- 📰 **News Monitoring** - Track competitor news with sentiment analysis
- 🚨 **Alert System** - Automatic threat and opportunity detection
- 📊 **Analytics** - Comprehensive competitor analytics

---

## Quick Start

```bash
npm install
npm run dev
npm run build
npm start
```

**Default Port:** `4756`

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | 4756 |
| MONGODB_URI | Yes | MongoDB connection |
| JWT_SECRET | Yes | JWT signing secret |
| HOJAI_COMPETITIVE_INTELLIGENCE_API_KEY | Yes | API key |
| CORS_ORIGIN | No | Allowed origins |

---

## API Endpoints

### Competitors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/competitors` | List competitors |
| POST | `/api/v1/competitors` | Create competitor |
| GET | `/api/v1/competitors/:id` | Get competitor |
| PUT | `/api/v1/competitors/:id` | Update competitor |
| DELETE | `/api/v1/competitors/:id` | Delete competitor |
| GET | `/api/v1/competitors/:id/analytics` | Competitor analytics |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/competitors/:id/products` | List products |
| POST | `/api/v1/competitors/:id/products` | Add product |

### Funding

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/competitors/:id/funding` | List funding rounds |
| POST | `/api/v1/competitors/:id/funding` | Record funding |

### Hiring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/competitors/:id/hiring` | List hiring |
| POST | `/api/v1/competitors/:id/hiring` | Record hiring |

### News & Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/news` | List news |
| POST | `/api/v1/news` | Record news |
| GET | `/api/v1/alerts` | List alerts |
| POST | `/api/v1/alerts` | Create alert |
| POST | `/api/v1/alerts/:id/acknowledge` | Acknowledge alert |

---

## Tech Stack

- Node.js 20+, Express.js 4.x, TypeScript 5.x, MongoDB 6.x, Zod 3.x, Pino

## Security

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ |
| API Key Auth | ✅ |
| Rate Limiting | ✅ |
| Input Validation | ✅ |
| NoSQL Injection Prevention | ✅ |
| Graceful Shutdown | ✅ |
| Request Correlation IDs | ✅ |

## Testing

```bash
npm test
```

**Tests:** ✅ 20 tests

---

**License:** Proprietary - RTNM Digital  
**Last Updated:** June 13, 2026
