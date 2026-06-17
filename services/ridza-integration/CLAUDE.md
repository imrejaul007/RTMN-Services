# RidZa Integration Service

**Version:** 1.0.0  
**Port:** 4972  
**Status:** Development Ready

---

## Overview

RidZa Integration connects financial services to the RTMN ecosystem's Customer Operations layer. It bridges:
- **Payment Twin** - Payment tracking and reconciliation
- **Industry Twin (finance)** - Financial industry vertical
- **Trust Intelligence** - Compliance and fraud detection

## API Endpoints

### Remittance (Money Transfers)
- `POST /api/remittance/transfer` - Initiate money transfer
- `GET /api/remittance/quote` - Get transfer quote
- `GET /api/remittance/history` - Transfer history
- `GET /api/remittance/:id` - Transfer status

### CFO Dashboard
- `GET /api/cfo/dashboard` - Financial overview
- `GET /api/cfo/metrics` - Key financial metrics
- `GET /api/cfo/reports` - Financial reports
- `POST /api/cfo/reports` - Generate report

### Insurance
- `POST /api/insurance/quote` - Get insurance quote
- `POST /api/insurance/policy` - Purchase policy
- `GET /api/insurance/policies` - List policies
- `GET /api/insurance/claims` - File/view claims
- `POST /api/insurance/claims` - File new claim

## Connected Services

| Service | URL | Purpose |
|---------|-----|---------|
| Payment Twin | :3012 | Payment tracking |
| Industry Twin | :4705 | Finance vertical |
| Trust Intelligence | :4240 | Compliance |
| Event Bus | :4510 | Async messaging |
| Service Registry | :4399 | Discovery |

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

## Health Check

```
GET http://localhost:4972/health
```
