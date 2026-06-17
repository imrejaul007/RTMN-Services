# AssetMind Integration Service

**Version:** 1.0.0
**Status:** Ready for Development
**Port:** 4969

## Overview

AssetMind Integration connects Wealth Management operations to the RTMN Customer Operations ecosystem. It provides investment tracking, portfolio management, and financial analytics with real-time synchronization to Digital Twins.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AssetMind Integration                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Investment  │  │  Portfolio  │  │  Analytics  │             │
│  │   Routes    │  │   Routes    │  │   Routes    │             │
│  │   :5011     │  │   :5012     │  │   :5013     │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│  ┌──────────────────────▼──────────────────────┐              │
│  │              CustomerOpsBridge                 │              │
│  │  - Service Registry Registration               │              │
│  │  - Twin Communication                           │              │
│  │  - Event Publishing                            │              │
│  └──────────────────────┬──────────────────────┘              │
│                         │                                      │
│  ┌──────────────────────▼──────────────────────┐              │
│  │              WealthSync Service               │              │
│  │  - Industry Twin (Finance)                    │              │
│  │  - Payment Twin                               │              │
│  │  - Customer Twin                              │              │
│  └───────────────────────────────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Twin Connections

| Twin | Purpose | Connection |
|------|---------|------------|
| **Industry Twin (Finance)** | Deal/Financial data sync | Port 3018 |
| **Payment Twin** | Payment history, linked accounts | Port 4004 |
| **Customer Twin** | Customer profile enrichment | Port 3017 |

## API Endpoints

### Investment Routes (`/api/investments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customer/:customerId` | Get all investments for customer |
| GET | `/:accountId` | Get specific investment account |
| POST | `/` | Create new investment account |
| PUT | `/:accountId` | Update investment account |
| DELETE | `/:accountId` | Delete investment account |
| GET | `/:accountId/performance` | Get investment performance |

### Portfolio Routes (`/api/portfolio`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customer/:customerId` | Get full portfolio |
| GET | `/summary` | Get portfolio summary stats |
| POST | `/sync/:customerId` | Sync portfolio to twins |
| PUT | `/allocation/:customerId` | Update allocation |
| GET | `/holdings/:customerId` | Get holdings breakdown |
| POST | `/rebalance/:customerId` | Rebalance portfolio |

### Analytics Routes (`/api/analytics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customer/:customerId` | Get wealth analytics |
| GET | `/market-insights` | Get market insights |
| GET | `/performance/:customerId` | Get performance metrics |
| GET | `/risk/:customerId` | Get risk analysis |
| GET | `/goals/:customerId` | Get goal tracking |
| GET | `/cross-twin/:customerId` | Cross-twin analytics |

## Quick Start

```bash
# Install dependencies
cd services/assetmind-integration
npm install

# Copy environment file
cp .env.example .env

# Start service
npm run dev

# Build for production
npm run build
npm start
```

## Environment Variables

```bash
PORT=4969
SERVICE_REGISTRY_URL=http://localhost:4399
INDUSTRY_TWIN_URL=http://localhost:3018
PAYMENT_TWIN_URL=http://localhost:4004
CUSTOMER_TWIN_URL=http://localhost:3017
EVENT_BUS_URL=http://localhost:4510
LOG_LEVEL=info
```

## Health Check

```bash
curl http://localhost:4969/health
```

## Integration Flow

1. **Service Registration**: On startup, registers with Service Registry
2. **Customer Lookup**: Enriches data from Customer Twin
3. **Investment Sync**: Pushes investment data to all twins
4. **Portfolio Update**: Syncs portfolio changes in real-time
5. **Analytics**: Generates analytics and stores in twins

## Example Usage

### Create Investment Account

```bash
curl -X POST http://localhost:4969/api/investments \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST-001",
    "type": "brokerage",
    "name": "Main Brokerage",
    "provider": "Fidelity",
    "balance": 150000,
    "currency": "USD"
  }'
```

### Sync Portfolio

```bash
curl -X POST http://localhost:4969/api/portfolio/sync/CUST-001
```

### Get Analytics

```bash
curl http://localhost:4969/api/analytics/customer/CUST-001
```

## Models

### WealthProfile

```typescript
interface WealthProfile {
  id: string;
  customerId: string;
  customerName: string;
  email: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'very-aggressive';
  accounts: InvestmentAccount[];
  portfolio: PortfolioSummary;
  financialGoals: FinancialGoal[];
  status: 'active' | 'inactive' | 'pending-review';
}
```

## Dependencies

- Express.js - Web framework
- TypeScript - Type safety
- Winston - Logging
- Axios - HTTP client for twin communication
- UUID - Unique identifiers

## Port Registry

| Service | Port | Status |
|---------|------|--------|
| AssetMind Integration | **4969** | This service |

## Related Services

- REZ-ecosystem-connector (4399) - Service Registry
- REZ-event-bus (4510) - Event messaging
- Deal Twin (3018) - Finance/Deal data
- Payment Twin (4004) - Payment data
- Customer Twin (3017) - Customer data
