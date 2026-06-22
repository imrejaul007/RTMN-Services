# RTNM Company Twins Service

> Company Twins service for RTNM Economic Network. Every RTNM company has a twin with budget, policies, AI agent, and trust rules.

## Overview

The **RTNM Company Twins Service** is a microservice that creates and manages digital twins for companies in the RTNM Economic Network. Each company twin contains:

- **Budget Management** - Financial allocation and tracking
- **Policies** - Company policies and rules
- **AI Agent** - Company-specific AI agent configuration
- **Trust Rules** - Trust levels, transaction limits, and compliance rules
- **Financial Model** - Revenue model, cost structure, margins, and growth targets

## Features

- ✅ Create and manage company digital twins
- ✅ Budget tracking and allocation
- ✅ Policy management with rule-based engine
- ✅ AI agent configuration and monitoring
- ✅ Trust rules with transaction limits
- ✅ Financial modeling (revenue, costs, margins)
- ✅ Growth target tracking
- ✅ Health checks and monitoring
- ✅ RESTful API with OpenAPI-style documentation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RTNM Company Twins Service                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Budget    │  │  Policies  │  │   AI Agent │             │
│  │  Manager   │  │  Engine    │  │  Config     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Trust Rules│  │ Financial  │  │  Growth    │             │
│  │            │  │  Model     │  │  Targets   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│                      Express.js REST API                        │
│                 (Port 6002, Health Checks)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    MongoDB      │
                    │ (Company Twins) │
                    └─────────────────┘
```

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5.x
- **Framework:** Express.js 4.x
- **Database:** MongoDB with Mongoose ODM
- **Logging:** Winston
- **Security:** Helmet, CORS, Rate Limiting
- **Testing:** Jest, Supertest
- **Containerization:** Docker, Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+ (or Docker)
- MongoDB 6+ (or Docker)

### Installation

```bash
# Clone the repository
cd rtnm-company-twins

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=6002
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/rtnm_company_twins
MONGODB_POOL_SIZE=10

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### Running the Service

#### Development Mode

```bash
# Start with ts-node (auto-reload)
npm run dev

# Or with nodemon
npm run dev:watch
```

#### Production Mode

```bash
# Build the TypeScript
npm run build

# Start the production server
npm start
```

#### Docker

```bash
# Build the Docker image
npm run docker:build

# Run the container
npm run docker:run

# Or using docker-compose
docker-compose up -d
```

## API Endpoints

### Company Twins

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/twins` | Create a new company twin |
| `GET` | `/twins` | Get all company twins |
| `GET` | `/twins/:corpId` | Get a specific company twin |
| `PUT` | `/twins/:corpId` | Update company twin |
| `PUT` | `/twins/:corpId/budget` | Update company twin budget |
| `PUT` | `/twins/:corpId/policies` | Update company twin policies |
| `PUT` | `/twins/:corpId/ai-agent` | Update AI agent configuration |
| `PUT` | `/twins/:corpId/trust-rules` | Update trust rules |
| `DELETE` | `/twins/:corpId` | Delete company twin |
| `POST` | `/twins/:corpId/activate` | Activate company twin |
| `POST` | `/twins/:corpId/suspend` | Suspend company twin |
| `GET` | `/twins/:corpId/summary` | Get company twin summary |

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Basic health check |
| `GET` | `/health/ready` | Readiness check (includes DB) |
| `GET` | `/health/live` | Liveness check |
| `GET` | `/api` | API documentation |

## API Examples

### Create a Company Twin

```bash
curl -X POST http://localhost:6002/twins \
  -H "Content-Type: application/json" \
  -d '{
    "corpId": "corp_123",
    "name": "Acme Corporation",
    "type": "enterprise",
    "revenueModel": {
      "type": "subscription",
      "pricing": {
        "basePrice": 9999,
        "currency": "INR",
        "billingCycle": "monthly"
      }
    },
    "budget": {
      "total": 1000000,
      "fiscalYear": "2026"
    }
  }'
```

### Get a Company Twin

```bash
curl http://localhost:6002/twins/corp_123
```

### Update Budget

```bash
curl -X PUT http://localhost:6002/twins/corp_123/budget \
  -H "Content-Type: application/json" \
  -d '{
    "total": 1500000,
    "allocated": 1200000,
    "categories": [
      {
        "category": "marketing",
        "allocated": 500000,
        "spent": 250000,
        "remaining": 250000
      }
    ]
  }'
```

### Update Policies

```bash
curl -X PUT http://localhost:6002/twins/corp_123/policies \
  -H "Content-Type: application/json" \
  -d '{
    "policies": [
      {
        "policyId": "pol_001",
        "name": "Expense Policy",
        "description": "Monthly expense limits",
        "rules": [
          {
            "ruleId": "rule_001",
            "condition": "amount > 50000",
            "action": "require_approval",
            "priority": 1
          }
        ],
        "status": "active"
      }
    ],
    "action": "replace"
  }'
```

### Get Twin Summary

```bash
curl http://localhost:6002/twins/corp_123/summary
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
rtnm-company-twins/
├── src/
│   ├── config/
│   │   └── index.ts          # Configuration
│   ├── models/
│   │   └── company-twin.model.ts  # Mongoose models
│   ├── routes/
│   │   └── company-twin.routes.ts # Express routes
│   ├── services/
│   │   └── company-twin.service.ts # Business logic
│   ├── utils/
│   │   └── logger.ts         # Winston logger
│   └── index.ts              # Application entry point
├── .github/
│   └── workflows/
│       └── ci.yml            # GitHub Actions CI/CD
├── .gitignore
├── .prettierrc
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── package.json
├── README.md
└── tsconfig.json
```

## Company Twin Schema

Each Company Twin contains:

```typescript
interface CompanyTwin {
  twinId: string;           // Unique twin identifier
  corpId: string;           // Company corpId
  name: string;             // Company name
  type: 'startup' | 'smb' | 'midmarket' | 'enterprise' | 'corporate';

  // Financial Model
  revenueModel: {
    type: 'subscription' | 'transaction' | 'subscription_transaction' | 'usage';
    pricing: {
      basePrice: number;
      currency: string;
      billingCycle: 'monthly' | 'quarterly' | 'yearly';
    };
  };
  costStructure: {
    fixed: number;
    variable: number;
    total: number;
  };
  margins: {
    gross: number;
    net: number;
    operating: number;
    target: { gross: number; net: number; operating: number; };
  };
  growthTargets: {
    revenue: { monthly: number; quarterly: number; yearly: number; };
    customers: { new: number; retained: number; churnRate: number; };
    market: { shareTarget: number; geographicExpansion: string[]; };
  };

  // Management
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  aiAgent: {
    agentId: string;
    name: string;
    type: 'ceo' | 'cfo' | 'cto' | 'coo' | 'cmo' | 'custom';
    model: string;
    status: 'active' | 'inactive' | 'training';
  };
  budget: {
    total: number;
    allocated: number;
    remaining: number;
    categories: BudgetCategory[];
  };
  policies: Policy[];
  trustRules: {
    trustLevel: 'minimal' | 'standard' | 'high' | 'maximum';
    transactionLimits: { daily: number; monthly: number; perTransaction: number; };
    complianceLevel: 'basic' | 'standard' | 'enhanced' | 'strict';
  };
  status: 'active' | 'inactive' | 'suspended' | 'pending';
}
```

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

UNLICENSED - Private use only.

## Support

For support, email support@rtnm.example.com or create an issue in this repository.

---

Built with ❤️ by RTNM Group
