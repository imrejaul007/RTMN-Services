# REZ Unified Merchant Gateway

**Port:** 4080

Unified API gateway that consolidates access to ALL merchant-related services across the ReZ ecosystem.

## Overview

This gateway provides a single entry point for merchant operations, aggregating data from:

| Company | Services |
|---------|----------|
| **RABTUL** | Auth, Wallet, Payment, Orders, Catalog, Notifications |
| **REZ-Merchant** | Merchant profiles, B2B, POS |
| **REZ-Media** | Marketing, Loyalty, Engagement |
| **REZ-Intelligence** | AI, Attribution |
| **RTNM-Digital** | Trust, Operations |

## Quick Start

```bash
cd RTNM-Group/rez-merchant-gateway
npm install
cp .env.example .env
npm run dev
```

## API Endpoints

### Unified Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile` | Get unified merchant profile |
| GET | `/api/v1/dashboard` | Get dashboard metrics |

### Core Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/orders` | List orders |
| GET | `/api/v1/customers` | List customers |
| GET | `/api/v1/inventory` | List inventory |
| GET | `/api/v1/inventory/low-stock` | Low stock alerts |
| GET | `/api/v1/financials` | Financial overview |
| GET | `/api/v1/financials/balance` | Wallet balance |

### B2B Commerce

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/b2b/suppliers` | List suppliers |
| GET | `/api/v1/b2b/purchase-orders` | List purchase orders |

### Marketing & Engagement

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/loyalty` | Loyalty stats |
| GET | `/api/v1/marketing` | Marketing campaigns |

### Trust & AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/trust` | Trust score |
| GET | `/api/v1/ai/recommendations` | AI recommendations |

## Authentication

All endpoints require Bearer token in Authorization header:

```bash
curl -H "Authorization: Bearer <merchant-jwt>" https://api.rez.money/api/v1/profile
```

For service-to-service calls:

```bash
curl -H "X-Internal-Token: <internal-token>" https://api.rez.money/api/v1/profile
```

## Health Check

```bash
curl https://api.rez.money/health
curl https://api.rez.money/ready
```

## Example Response

```json
{
  "success": true,
  "data": {
    "profile": {
      "merchantId": "merch_123",
      "businessName": "ABC Restaurant",
      "industry": "restaurant",
      "tier": "gold"
    },
    "orders": { "total": 150, "recent": [...] },
    "financials": {
      "wallet": { "balance": 25000 },
      "payments": { "total": 150000 }
    },
    "loyalty": { "members": 500, "pointsIssued": 50000 }
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Merchant App/Dashboard                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               REZ Merchant Gateway (Port 4080)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Unified  │  │  Auth     │  │  Routes   │              │
│  │   Profile  │  │  Middleware │  │            │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
        ┌───────────────────┼───────────────────┬───────────────────┐
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   RABTUL    │   │REZ-Merchant │   │  REZ-Media  │   │    RTNM     │
│  Services   │   │   Service   │   │   Services  │   │   Digital    │
│ Auth|Wallet │   │   B2B|POS   │   │Marketing|AI │   │  Trust|Ops  │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```
