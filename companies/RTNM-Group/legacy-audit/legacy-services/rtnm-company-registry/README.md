# RTNM Company Registry

Company Registry Service for RTNM Economic Network. Registers all 22 RTNM companies with their services, credit limits, trust scores, and AI agents.

## Overview

The RTNM Company Registry is the central service for managing company information across the RTNM Economic Network. It provides:

- Company registration and management
- Service tracking (provided and consumed)
- Credit limit management
- Trust score tracking
- Ledger management for financial transactions
- Network statistics and analytics

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RTNM COMPANY REGISTRY │
├─────────────────────────────────────────────────────────────────┤
│ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Company │  │   Service   │  │   Ledger │             │
│  │ Model │  │   Tracking  │  │   Entry     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Company Service Layer                          │ │
│  │  - registerCompany()    - getCompany()                     │ │
│  │  - updateCompany()      - deactivateCompany()              │ │
│  │  - getCompanyServices() - getCompanyLedger() │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              REST API (Port 6000)                           │ │
│  │  POST /companies           - Register company             │ │
│  │  GET    /companies           - List companies │ │
│  │  GET    /companies/:corpId   - Get company │ │
│  │  PUT    /companies/:corpId   - Update company               │ │
│  │  DELETE /companies/:corpId   - Deactivate company           │ │
│  │  GET    /companies/:corpId/services - Get services          │ │
│  │  GET    /companies/:corpId/ledger - Get ledger             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## RTNM Companies (22 Companies)

| Company | Type | Industry | Description |
|---------|------|----------|-------------|
| HOJAI-AI | ai | ai | AI Company - Memory, Agents, Knowledge Graph |
| RABTUL-Technologies | payment | fintech | Financial Infrastructure - Money Movement |
| REZ-Intelligence | ai | ai | AI/ML Platform + Merchant Growth OS |
| REZ-Consumer | consumer | ecommerce | B2C Consumer Apps |
| KHAIRMOVE | mobility | mobility | Mobility + Airport Ecosystem |
| AXOM | social | social | Social + Entertainment |
| AdBazaar | marketing | marketing | Marketing + DOOH + Social Automation |
| REZ-Merchant | merchant | ecommerce | Industry OS - Multi-industry platform |
| REZ-Move | merchant | realestate | Relocation & Living Platform |
| RIDZA | finance | fintech | Money Intelligence - CFO Suite |
| LawGens | legal | legal | Legal AI - Harvey AI competitor |
| AssetMind | finance | fintech | Financial Intelligence Platform |
| RisaCare | healthcare | healthcare | Healthcare OS |
| CorpPerks | hr | hr | HRMS Platform + BIZORA |
| StayOwn-Hospitality | hospitality | hospitality | Hotel Management Platform |
| RTNM-Group | other | other | Platform Administration |
| RisnaEstate | property | realestate | Real Estate Transaction Platform |
| REZ-Workspace | merchant | ecommerce | Business Operating System |
| Hotel OTA | hospitality | hospitality | Hotel OTA Channel Integration |
| RABTUL-SaaS | payment | fintech | SaaS Products (Invoice, POS, Tally) |
| RTNM-Digital | other | other | Digital Services |
| Nexha | merchant | ecommerce | Commerce Network OS |

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6.0+
- npm or yarn

### Installation

```bash
# Clone the repository
cd RTNM-Group/rtnm-company-registry

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your MongoDB URI
echo "MONGODB_URI=mongodb://localhost:27017/rtnm_company_registry" > .env
```

### Development

```bash
# Start development server
npm run dev

# Or with custom port
PORT=6000 npm run dev
```

### Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

### Docker

```bash
# Build Docker image
docker build -t rtnm-company-registry .

# Run container
docker run -p 6000:6000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/rtnm_company_registry \
  rtnm-company-registry
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

  company-registry:
    build: .
    ports:
      - "6000:6000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/rtnm_company_registry
      - NODE_ENV=production
    depends_on:
      - mongodb

volumes:
  mongodb_data:
```

```bash
docker-compose up -d
```

## API Reference

### Health Checks

```bash
# Liveness check
GET /health/live

# Readiness check
GET /health/ready

# Full health check
GET /health
```

### Company Management

#### Register Company

```bash
POST /companies
Content-Type: application/json

{
  "corpId": "HOJAI-AI",
  "name": "HOJAI AI",
  "type": "ai",
  "industry": "ai",
  "registrationNumber": "CIN123456",
  "taxId": "GSTIN123456",
  "aiAgentId": "hojai-agent-001",
  "creditLimit": 1000000,
  "walletId": "wallet-001"
}
```

#### Get All Companies

```bash
GET /companies
GET /companies?type=ai
GET /companies?industry=fintech
GET /companies?status=active
GET /companies?minTrustScore=70
GET /companies?search=HOJAI
GET /companies?page=1&limit=20&sortBy=trustScore&sortOrder=desc
```

#### Get Company

```bash
GET /companies/:corpId
```

#### Update Company

```bash
PUT /companies/:corpId
Content-Type: application/json

{
  "name": "HOJAI AI Private Limited",
  "trustScore": 95
}
```

#### Deactivate Company

```bash
DELETE /companies/:corpId
```

#### Activate Company

```bash
PATCH /companies/:corpId/activate
```

#### Update Trust Score

```bash
PATCH /companies/:corpId/trust-score
Content-Type: application/json

{
  "score": 85
}
```

#### Update Monthly Revenue

```bash
PATCH /companies/:corpId/revenue
Content-Type: application/json

{
  "revenue": 500000
}
```

### Service Management

#### Get Company Services

```bash
GET /companies/:corpId/services
```

#### Add Service Provided

```bash
POST /companies/:corpId/services/provided
Content-Type: application/json

{
  "name": "HOJAI Memory Platform",
  "type": "ai-memory",
  "port": 4540,
  "endpoint": "http://localhost:4540",
  "status": "active",
  "version": "2.0.0",
  "healthCheckUrl": "http://localhost:4540/health",
  "isInternal": true,
  "isExternal": true,
  "tier": "core",
  "monthlyCalls": 1000000
}
```

#### Add Service Consumed

```bash
POST /companies/:corpId/services/consumed
Content-Type: application/json

{
  "name": "RABTUL Auth Service",
  "type": "auth",
  "port": 4002,
  "endpoint": "http://localhost:4002",
  "status": "active",
  "version": "1.0.0",
  "isInternal": true,
  "tier": "core"
}
```

### Ledger Management

#### Get Company Ledger

```bash
GET /companies/:corpId/ledger
GET /companies/:corpId/ledger?page=1&limit=50
GET /companies/:corpId/ledger?startDate=2024-01-01&endDate=2024-12-31
```

#### Add Ledger Entry

```bash
POST /companies/:corpId/ledger
Content-Type: application/json

{
  "type": "credit",
  "amount": 50000,
  "currency": "INR",
  "description": "Monthly service subscription",
  "referenceId": "INV-2024-001",
  "relatedCorpId": "RABTUL-TECH"
}
```

### Network Statistics

```bash
GET /companies/stats
```

Response:

```json
{
  "success": true,
  "data": {
    "totalCompanies": 22,
    "activeCompanies": 20,
    "totalServices": 407,
    "averageTrustScore": 78.5,
    "byType": {
      "ai": 3,
      "payment": 2,
      "consumer": 1,
      "merchant": 4,
      "finance": 2,
      "other": 10
    },
    "byIndustry": {
      "ai": 3,
      "fintech": 4,
      "ecommerce": 3,
      "healthcare": 1,
      "hr": 1,
      "other": 10
    }
  }
}
```

## Data Models

### RegisteredCompany

| Field | Type | Description |
|-------|------|-------------|
| corpId | String | Unique company identifier (indexed, uppercase) |
| name | String | Company name |
| type | String | Company type (ai, payment, consumer, etc.) |
| industry | String | Industry category |
| registrationNumber | String | Legal registration number |
| taxId | String | Tax identification number |
| aiAgentId | String | Primary AI agent ID |
| creditLimit | Number | Maximum credit limit |
| currentCredit | Number | Current credit used |
| trustScore | Number | Trust score (0-100) |
| monthlyRevenue | Number | Monthly revenue |
| monthlyExpenses | Number | Monthly expenses |
| servicesProvided | Array | Services provided by the company |
| servicesConsumed | Array | Services consumed by the company |
| walletId | String | Associated wallet ID |
| status | String | Company status (active, inactive, etc.) |
| metadata | Object | Additional metadata |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

### LedgerEntry

| Field | Type | Description |
|-------|------|-------------|
| entryId | String | Unique entry identifier |
| corpId | String | Company ID |
| type | String | Entry type (credit, debit) |
| amount | Number | Transaction amount |
| currency | String | Currency code |
| description | String | Transaction description |
| referenceId | String | External reference ID |
| relatedCorpId | String | Related company ID |
| createdAt | Date | Entry timestamp |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 6000 | Server port |
| NODE_ENV | development | Environment (development, production) |
| MONGODB_URI | mongodb://localhost:27017/rtnm_company_registry | MongoDB connection URI |
| LOG_LEVEL | info | Logging level |
| RATE_LIMIT_WINDOW_MS | 60000 | Rate limit window in milliseconds |
| RATE_LIMIT_MAX_REQUESTS | 100 | Maximum requests per window |

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## Project Structure

```
rtnm-company-registry/
├── src/
│   ├── config/
│   │   └── index.ts          # Configuration
│   ├── models/
│   │   └── company.model.ts  # Mongoose models
│   ├── routes/
│   │   └── company.routes.ts # Express routes
│   ├── services/
│   │   └── company.service.ts # Business logic
│   ├── utils/
│   │   └── logger.ts         # Winston logger
│   └── index.ts              # Application entry point
├── .github/
│   └── workflows/
│       └── ci.yml            # GitHub Actions CI
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Author

RTNM-Group

## Version

1.0.0