# RTNM Automated Billing Service

Automated billing, settlements, and reconciliation service for the RTNM Economic Network (22 companies).

## Overview

This service handles:
- **Invoice Generation**: Create invoices between the 22 RTNM companies
- **Invoice Payment**: Pay and track invoice status
- **Monthly Settlements**: Run settlement cycles for billing periods
- **Reconciliation**: Reconcile accounts across all companies

## Architecture

```
RTNM Economic Network (22 Companies)
├── HOJAI-AI
├── RABTUL-Technologies
├── REZ-Intelligence
├── REZ-Consumer
├── KHAIRMOVE
├── AXOM
├── AdBazaar
├── REZ-Merchant
├── REZ-Move
├── RIDZA
├── LawGens
├── AssetMind
├── RisaCare
├── CorpPerks
├── StayOwn-Hospitality
├── RTNM-Group
├── RisnaEstate
├── REZ-Workspace
├── Hotel OTA
├── RABTUL-SaaS
├── RTNM-Digital
└── Nexha
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+
- npm or pnpm

### Installation

```bash
# Clone the repository
cd RTNM-Group/rtnm-automated-billing

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start the service
npm run dev
```

### Configuration

Create a `.env` file with:

```env
PORT=6005
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rtnm-billing
LOG_LEVEL=info
INTERNAL_SERVICE_TOKEN=your-secure-token
```

## API Endpoints

### Health Checks
| Endpoint | Description |
|----------|-------------|
| `GET /health` | Service health check |
| `GET /health/ready` | Readiness check (includes MongoDB) |
| `GET /health/live` | Liveness check |
| `GET /metrics` | Prometheus metrics |

### Invoices
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/invoices` | POST | Generate a new invoice |
| `/api/invoices` | GET | List invoices for a company |
| `/api/invoices/:invoiceId` | GET | Get single invoice |
| `/api/invoices/:invoiceId/pay` | POST | Pay an invoice |
| `/api/invoices/:invoiceId/cancel` | POST | Cancel an invoice |

### Settlements
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settlements/run` | POST | Run settlement for a period |
| `/api/settlements` | GET | List settlements |
| `/api/settlements/:settlementId` | GET | Get single settlement |

### Reconciliation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reconciliation` | POST | Run reconciliation |
| `/api/reconciliation/:reconciliationId` | GET | Get reconciliation status |

### Utilities
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/summary/:corpId` | GET | Get billing summary |
| `/api/overdue` | GET | Get overdue invoices |
| `/api/companies` | GET | List registered companies |

## Example API Calls

### Generate Invoice
```bash
curl -X POST http://localhost:6005/api/invoices \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: rtnm-internal-token" \
  -d '{
    "fromCorpId": "HOJAI-AI",
    "toCorpId": "RABTUL-Technologies",
    "amount": 50000,
    "currency": "INR",
    "description": "Monthly AI Services",
    "lineItems": [
      {
        "description": "AI Processing - June 2026",
        "quantity": 1,
        "unitPrice": 50000
      }
    ]
  }'
```

### Pay Invoice
```bash
curl -X POST http://localhost:6005/api/invoices/INV-1234567890-ABCDEF12/pay \
  -H "X-Internal-Token: rtnm-internal-token"
```

### Run Settlement
```bash
curl -X POST http://localhost:6005/api/settlements/run \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: rtnm-internal-token" \
  -d '{
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "month": "2026-06"
  }'
```

### Run Reconciliation
```bash
curl -X POST http://localhost:6005/api/reconciliation \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: rtnm-internal-token" \
  -d '{
    "period": {
      "start": "2026-06-01",
      "end": "2026-06-30",
      "month": "2026-06"
    }
  }'
```

## Data Models

### Invoice
```typescript
{
  invoiceId: string;        // Unique invoice ID (INV-timestamp-uuid)
  fromCorpId: string;       // Company generating invoice
  toCorpId: string;         // Company to pay
  amount: number;           // Total amount
  currency: string;        // Currency code (default: INR)
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;           // Payment due date
  paidAt?: Date;           // When paid
  lineItems: LineItem[];    // Invoice line items
}
```

### Settlement
```typescript
{
  settlementId: string;    // Unique settlement ID
  period: {
    start: Date;
    end: Date;
    month: string;         // YYYY-MM format
  };
  transactions: Transaction[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  executedAt?: Date;
  summary: {
    totalTransactions: number;
    totalVolume: number;
    settledCount: number;
    pendingCount: number;
  };
}
```

### Reconciliation
```typescript
{
  reconciliationId: string;
  period: { start, end, month };
  companies: string[];
  discrepancies: Discrepancy[];
  balances: Balance[];
  status: 'in_progress' | 'completed' | 'failed';
}
```

## Docker

### Build Image
```bash
docker build -t rtnm-automated-billing .
```

### Run Container
```bash
docker run -d \
  --name rtnm-billing \
  -p 6005:6005 \
  -e MONGODB_URI=mongodb://host:27017/rtnm-billing \
  rtnm-automated-billing
```

### Docker Compose
```yaml
version: '3.8'
services:
  billing:
    build: .
    ports:
      - "6005:6005"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/rtnm-billing
    depends_on:
      - mongo
```

## Scripts

```bash
# Development
npm run dev          # Run with ts-node-dev (hot reload)

# Production
npm run build        # Compile TypeScript
npm run start        # Run compiled JavaScript

# Testing
npm test             # Run Jest tests
npm run lint         # Run ESLint
npm run format       # Run Prettier

# Docker
docker build -t rtnm-automated-billing .
docker run -p 6005:6005 rtnm-automated-billing
```

## Health Monitoring

### Prometheus Metrics
```
# HELP rtnm_billing_uptime_seconds Service uptime in seconds
# TYPE rtnm_billing_uptime_seconds gauge
rtnm_billing_uptime_seconds 12345

# HELP rtnm_billing_memory_heap_used_bytes Heap memory used
# TYPE rtnm_billing_memory_heap_used_bytes gauge
rtnm_billing_memory_heap_used_bytes 12345678

# HELP rtnm_billing_mongodb_readystate MongoDB connection
# TYPE rtnm_billing_mongodb_readystate gauge
rtnm_billing_mongodb_readystate 1
```

## Security

- **API Authentication**: All endpoints require `X-Internal-Token` header
- **Rate Limiting**: 100 requests per minute per IP
- **Helmet**: Security headers enabled
- **CORS**: Configured for allowed origins

## Error Handling

All errors return consistent JSON format:
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable message"
}
```

## License

Internal RTNM Economic Network Service