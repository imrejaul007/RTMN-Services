# RTNM Inter-Company Ledger Service

Inter-Company Ledger Service for RTNM Economic Network - Tracks revenue and cost between the 22 companies in the REZ ecosystem.

## Overview

This service provides a centralized ledger system for tracking financial transactions between the 22 companies in the RTNM Economic Network. It maintains a complete audit trail of all inter-company transactions, calculates balances, and provides reconciliation capabilities.

## Features

- **Ledger Entries**: Create and track transactions between companies
- **Balance Tracking**: Real-time balance calculations for each company
- **Reconciliation**: Automated reconciliation of pending entries
- **Settlement Summary**: View settlement amounts between any two companies
- **Network Statistics**: Aggregate statistics across the entire network
- **Multi-currency Support**: INR, USD, EUR support
- **Transaction Types**: 10 different transaction types (SERVICE_FEE, REVENUE_SHARE, API_USAGE, etc.)

## Supported Companies

The service supports transactions between these 22 companies:

- HOJAI-AI
- RABTUL-Technologies
- REZ-Intelligence
- REZ-Consumer
- KHAIRMOVE
- AXOM
- AdBazaar
- REZ-Merchant
- REZ-Move
- RIDZA
- LawGens
- AssetMind
- RisaCare
- CorpPerks
- StayOwn-Hospitality
- RTNM-Group
- RisnaEstate
- REZ-Workspace
- Hotel OTA
- RABTUL-SaaS
- RTNM-Digital
- Nexha

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Installation

```bash
# Clone the repository
cd RTNM-Group/rtnm-inter-company-ledger

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your MongoDB URI

# Run in development mode
npm run dev
```

### Environment Variables

Create a `.env` file:

```env
PORT=6004
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rtnm_inter_company_ledger
LOG_LEVEL=info
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
CORS_ORIGIN=*
```

## API Endpoints

### Health Checks

```bash
GET /health          # Basic health check
GET /health/ready    # Readiness check (includes MongoDB)
GET /health/live     # Liveness check
```

### Ledger Entries

```bash
# Create a new ledger entry
POST /api/entries
Content-Type: application/json

{
  "fromCorpId": "HOJAI-AI",
  "toCorpId": "RABTUL-Technologies",
  "type": "SERVICE_FEE",
  "amount": 10000,
  "currency": "INR",
  "description": "AI service fees for Q1 2026"
}

# Get entries for a company
GET /api/entries/:corpId
GET /api/entries/:corpId?type=SERVICE_FEE&status=PENDING

# Get entries between two companies
GET /api/entries/between/:fromCorpId/:toCorpId

# Cancel a pending entry
POST /api/entries/:entryId/cancel
```

### Balances

```bash
# Get balance for a company
GET /api/balance/:corpId

# Get all company balances
GET /api/balances
```

### Reconciliation

```bash
# Run reconciliation for all pending entries
POST /api/reconciliation
```

### Settlement

```bash
# Get settlement summary between two companies
GET /api/settlement/:fromCorpId/:toCorpId
```

### Statistics

```bash
# Get network-wide statistics
GET /api/stats
```

### Reference Data

```bash
# Get supported companies and transaction types
GET /api/companies
```

## Example Usage

### Create an Inter-Company Transaction

```bash
# HOJAI-AI charges RABTUL-Technologies for AI services
curl -X POST http://localhost:6004/api/entries \
  -H "Content-Type: application/json" \
  -d '{
    "fromCorpId": "RABTUL-Technologies",
    "toCorpId": "HOJAI-AI",
    "type": "API_USAGE",
    "amount": 50000,
    "currency": "INR",
    "description": "Monthly AI API usage charges"
  }'
```

### Check Company Balance

```bash
curl http://localhost:6004/api/balance/HOJAI-AI
```

Response:
```json
{
  "success": true,
  "data": {
    "corpId": "HOJAI-AI",
    "revenue": 150000,
    "cost": 30000,
    "net": 120000,
    "pendingRevenue": 50000,
    "pendingCost": 0,
    "pendingNet": 50000,
    "updatedAt": "2026-06-09T12:00:00.000Z"
  }
}
```

### Run Reconciliation

```bash
curl -X POST http://localhost:6004/api/reconciliation
```

Response:
```json
{
  "success": true,
  "data": {
    "totalEntries": 25,
    "reconciledEntries": 25,
    "errors": [],
    "summary": {
      "totalRevenue": 250000,
      "totalCost": 250000,
      "netSettlement": 0
    }
  }
}
```

## Transaction Types

| Type | Description |
|------|-------------|
| SERVICE_FEE | Fees for services rendered |
| REVENUE_SHARE | Revenue sharing arrangements |
| API_USAGE | API usage charges |
| DATA_SHARING | Data sharing fees |
| MARKETING_FEE | Marketing campaign fees |
| INFRASTRUCTURE_COST | Infrastructure sharing costs |
| SUPPORT_FEE | Support service fees |
| REFERRAL_COMMISSION | Referral commissions |
| LOYALTY_REWARD | Loyalty program rewards |
| SETTLEMENT | Final settlement payments |

## Docker

### Build

```bash
docker build -t rtnm-inter-company-ledger .
```

### Run

```bash
docker run -p 6004:6004 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/rtnm_inter_company_ledger \
  rtnm-inter-company-ledger
```

### Docker Compose

```yaml
version: '3.8'

services:
  ledger:
    build: .
    ports:
      - "6004:6004"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/rtnm_inter_company_ledger
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RTNM INTER-COMPANY LEDGER                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │  HOJAI-AI  │    │   RABTUL   │    │ REZ-Intel  │          │
│  │  Service   │───►│  Service   │───►│  Service   │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│         │                 │                  │                  │
│         └─────────────────┼──────────────────┘                  │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │   LEDGER    │                              │
│                    │   SERVICE   │                              │
│                    │   (6004)   │                              │
│                    └──────┬──────┘                              │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                   │
│         │                 │                 │                    │
│  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐        │
│  │  LEDGER     │   │   BALANCE   │   │RECONCILIATION│        │
│  │  ENTRIES    │   │  TRACKING   │   │   SERVICE    │        │
│  └─────────────┘   └─────────────┘   └──────────────┘        │
│                           │                                     │
│                    ┌──────▼──────┐                              │
│                    │   MONGODB   │                              │
│                    └─────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT

## Support

For issues or questions, please contact the RTNM-Group team.
