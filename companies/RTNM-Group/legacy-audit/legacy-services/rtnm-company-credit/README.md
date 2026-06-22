# RTNM Company Credit Service

Company Credit service for RTNM Economic Network - Manages credit limits, BNPL, and payment terms between the 22 companies.

## Overview

This service provides a comprehensive credit management system for inter-company transactions within the RTNM Economic Network. It enables:
- Credit limit management
- BNPL (Buy Now Pay Later) operations
- Payment terms configuration
- Risk assessment and scoring
- Credit utilization tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  RTNM Company Credit                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Express │  │   Routes │  │  Services │       │
│  │   Server │  │             │  │             │       │
│  │  (Port 6006)│  │             │  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│         │                │                │              │
│         └────────────────┼────────────────┘ │
│                          │ │
│                          ▼                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                  MongoDB                              │ │
│  │            (CompanyCredit Collection)                │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Core Features
- **Credit Limit Management**: Set and update credit limits per company
- **Utilization Tracking**: Track current credit usage and available credit
- **Risk Assessment**: Automatic risk level calculation based on payment history
- **Payment Terms**: Configurable payment terms (0-180 days)
- **BNPL Operations**: Add/subtract credit utilization for BNPL

### Risk Levels
| Level | Multiplier | Description |
|-------|------------|--------------|
| LOW | 100% | Excellent payment history |
| MEDIUM | 80% | Normal credit operations |
| HIGH | 50% | Elevated risk, reduced limits |
| CRITICAL | 0% | No credit extension allowed |

## API Endpoints

### Credit Management

#### Get Credit
```
GET /api/credit/:corpId
```
Get credit information for a company.

**Response:**
```json
{
  "success": true,
  "data": {
    "corpId": "hojai-ai",
    "companyName": "HOJAI AI",
    "creditLimit": 1000000,
    "currentUtilization": 250000,
    "availableCredit": 750000,
    "riskLevel": "LOW",
    "creditScore": 850,
    "paymentTermsDays": 30
  }
}
```

#### Update Credit
```
PUT /api/credit/:corpId
```
Update credit information for a company.

**Body:**
```json
{
  "creditLimit": 1500000,
  "creditScore": 820,
  "riskLevel": "LOW"
}
```

#### Check Credit Extension
```
POST /api/can-extend-credit
```
Check if credit can be extended to a company.

**Body:**
```json
{
  "corpId": "hojai-ai",
  "amount": 50000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "canExtend": true,
    "availableCredit": 750000,
    "requestedAmount": 50000,
    "riskLevel": "LOW",
    "message": "Credit can be extended"
  }
}
```

#### Get Payment Terms
```
GET /api/terms/:corpId
```
Get payment terms for a company.

**Response:**
```json
{
  "success": true,
  "data": {
    "corpId": "hojai-ai",
    "paymentTermsDays": 30,
    "creditLimit": 1000000,
    "availableCredit": 750000,
    "currency": "INR",
    "riskLevel": "LOW",
    "creditScore": 850
  }
}
```

### BNPL Operations

#### Record Payment
```
POST /api/payment
```
Record a payment transaction.

**Body:**
```json
{
  "corpId": "hojai-ai",
  "amount": 50000,
  "status": "COMPLETED",
  "description": "Invoice payment #12345"
}
```

#### Update Utilization
```
POST /api/utilization
```
Update credit utilization (for BNPL operations).

**Body:**
```json
{
  "corpId": "hojai-ai",
  "amount": 25000,
  "operation": "add"
}
```

### Admin Operations

#### Get All Credits
```
GET /api/credits?page=1&limit=20&riskLevel=LOW&sortBy=creditScore&sortOrder=desc
```
Get all companies with credit (paginated).

#### Calculate Risk Level
```
GET /api/risk-level/:corpId
```
Calculate risk level for a company based on payment history.

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Basic health check |
| `GET /health/ready` | Readiness check (includes MongoDB) |
| `GET /health/live` | Liveness check |
| `GET /metrics` | Service metrics |

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 6+
- npm or yarn

### Installation

```bash
# Clone the repository
cd RTNM-Group/rtnm-company-credit

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Configuration

Create a `.env` file:

```env
PORT=6006
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rtnm_company_credit
LOG_LEVEL=info
LOG_FORMAT=json
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=*
```

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Docker
docker build -t rtnm-company-credit .
docker run -p 6006:6006 rtnm-company-credit
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Data Model

### CompanyCredit Schema

| Field | Type | Description |
|-------|------|-------------|
| corpId | String | Unique company identifier (indexed) |
| companyName | String | Company display name |
| creditLimit | Number | Maximum credit limit |
| currentUtilization | Number | Current credit used |
| availableCredit | Number | Available credit (creditLimit - utilization) |
| paymentHistory | Array | Array of payment transactions |
| riskLevel | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| creditScore | Number | Credit score (300-900) |
| paymentTermsDays | Number | Payment terms in days (0-180) |
| lastPaymentDate | Date | Last payment date |
| nextPaymentDue | Date | Next payment due date |
| totalOutstanding | Number | Total outstanding amount |
| currency | String | Currency code (default: INR) |

### PaymentHistory Schema

| Field | Type | Description |
|-------|------|-------------|
| transactionId | String | Unique transaction ID |
| amount | Number | Transaction amount |
| date | Date | Transaction date |
| status | Enum | PENDING, PROCESSING, COMPLETED, FAILED, OVERDUE |
| description | String | Transaction description |
| dueDate | Date | Payment due date |
| paidDate | Date | Actual payment date |

## Ecosystem Integration

This service is part of the RTNM Economic Network and integrates with:

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | Company authentication |
| RABTUL Wallet | 4004 | Credit transactions |
| RABTUL Payment | 4003 | Payment processing |
| HOJAI AI | 4800 | AI-powered risk assessment |
| REZ Intelligence | 4018 | Intent prediction |

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## License

MIT License - RTNM Group
