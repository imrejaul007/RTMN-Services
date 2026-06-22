# RTNM Company Trust Service

Company Trust Service for RTNM Economic Network - Provides trust scores for all 22 RTNM companies.

## Overview

The RTNM Company Trust Service is a microservice that calculates and maintains trust scores for companies within the RTNM Economic Network. Trust scores are calculated based on multiple factors including payment history, fulfillment performance, dispute resolution, and verification status.

## Features

- **Trust Score Calculation**: Weighted overall score from multiple dimensions
- **Score Components**:
  - Payment Score (30% weight)
  - Fulfillment Score (30% weight)
  - Dispute Score (25% weight)
  - Verification Score (15% weight)
- **Trend Tracking**: Monitor score changes over time
- **Risk Level Assessment**: Automatic risk classification (low/medium/high)
- **Badge System**: Award badges for achievements
- **Transaction Recording**: Track transaction counts
- **Trust History**: Full audit trail of score changes
- **Leaderboard**: Top companies by trust score

## API Endpoints

### Trust Management

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/trust/:corpId` | Get trust score for a company |
| POST | `/api/trust/:corpId/update` | Update trust scores |
| GET | `/api/trust/:corpId/history` | Get trust history |
| GET | `/api/trust` | Get all trust scores |
| GET | `/api/trust/leaderboard` | Get top companies |
| GET | `/api/trust/risk/:level` | Get companies by risk level |
| POST | `/api/trust/:corpId/transaction` | Record a transaction |
| POST | `/api/trust/:corpId/badge` | Add a badge |

### Health Checks

| Endpoint | Description |
|----------|-------------|
| GET `/health` | Basic health check |
| GET `/health/ready` | Readiness probe (includes MongoDB) |
| GET `/health/live` | Liveness probe |
| GET `/metrics` | Service metrics |

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 6+
- npm or pnpm

### Installation

```bash
# Clone the repository
cd RTNM-Group/rtnm-company-trust

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the service
npm start
```

### Development Mode

```bash
npm run dev
```

### Docker

```bash
# Build image
docker build -t rtnm-company-trust .

# Run container
docker run -p 6007:6007 \
  -e MONGODB_URI=mongodb://host:27017/rtnm_company_trust \
  rtnm-company-trust
```

### Docker Compose

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  rtnm-company-trust:
    build: .
    ports:
      - "6007:6007"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/rtnm_company_trust
      - NODE_ENV=production
    depends_on:
      - mongodb

volumes:
  mongodb_data:
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 6007 | Service port |
| `MONGODB_URI` | mongodb://localhost:27017/rtnm_company_trust | MongoDB connection URI |
| `NODE_ENV` | development | Environment (development/production) |

## API Examples

### Get Trust Score

```bash
curl http://localhost:6007/api/trust/hojai-ai
```

Response:
```json
{
  "success": true,
  "data": {
    "corpId": "hojai-ai",
    "companyName": "HOJAI-AI",
    "overallScore": 85,
    "paymentScore": 90,
    "fulfillmentScore": 88,
    "disputeScore": 85,
    "verificationScore": 80,
    "transactionCount": 150,
    "trend": "up",
    "riskLevel": "low",
    "badges": ["verified", "top-performer"],
    "updatedAt": "2026-06-08T10:00:00Z"
  }
}
```

### Update Trust Scores

```bash
curl -X POST http://localhost:6007/api/trust/hojai-ai/update \
  -H "Content-Type: application/json" \
  -d '{
    "scores": {
      "paymentScore": 95,
      "fulfillmentScore": 90
    },
    "triggeredBy": "payment-service",
    "reason": "Payment completed on time"
  }'
```

### Get Trust History

```bash
curl "http://localhost:6007/api/trust/hojai-ai/history?limit=10"
```

## RTNM Companies

The service tracks trust scores for all 22 RTNM companies:

1. HOJAI-AI
2. RABTUL-Technologies
3. REZ-Intelligence
4. REZ-Consumer
5. KHAIRMOVE
6. AXOM
7. AdBazaar
8. REZ-Merchant
9. REZ-Move
10. RIDZA
11. LawGens
12. AssetMind
13. RisaCare
14. CorpPerks
15. StayOwn-Hospitality
16. RTNM-Group
17. RisnaEstate
18. REZ-Workspace
19. Hotel OTA
20. RABTUL-SaaS
21. RTNM-Digital
22. Nexha

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RTNM Company Trust                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Express │  │   Helmet    │  │ CORS      │         │
│  │   Server │  │   Security  │  │   Config │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Routes Layer │   │
│  │  GET /trust/:corpId | POST /trust/:corpId/update    │   │
│  │  GET /trust/:corpId/history | GET /trust/leaderboard│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Service Layer │   │
│  │  CompanyTrustService: getTrust, updateTrust,       │   │
│  │  getTrustHistory, getLeaderboard, etc.             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Model Layer                          │   │
│  │  CompanyTrust | TrustHistory (Mongoose)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Database │   │
│  │  MongoDB: rtnm_company_trust                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Trust Score Calculation

The overall trust score is calculated using a weighted average:

```
OverallScore = (PaymentScore × 0.30) +
 (FulfillmentScore × 0.30) +
               (DisputeScore × 0.25) +
               (VerificationScore × 0.15)
```

### Risk Level Thresholds

| Score Range | Risk Level |
|-------------|------------|
| 70-100 | Low |
| 40-69 | Medium |
| 0-39 | High |

## License

MIT