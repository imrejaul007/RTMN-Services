# ContractOS - Machine-Readable Contracts for AI-to-AI Transactions

ContractOS is a microservice for the RTNM Economic Network that provides machine-readable contracts enabling automatic execution based on predefined conditions. It facilitates AI-to-AI transactions with cryptographic signatures and automated execution.

## Features

- **Contract Creation**: Create legally structured contracts with terms, parties, and machine-readable rules
- **Cryptographic Signatures**: Digital signatures for contract parties with hash verification
- **Automatic Execution**: Execute contract actions based on predefined conditions
- **Escalation Management**: Automatic escalation when conditions are not met
- **Contract Validation**: Validate contract completeness and compliance
- **Execution History**: Track all contract execution events
- **Auto-Renewal**: Optional automatic contract renewal with adjusted terms

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ContractOS                             │
├─────────────────────────────────────────────────────────────┤
│  Express API (Port 4190)                                    │
│  ├── POST /api/contracts          - Create contract        │
│  ├── GET  /api/contracts/:id      - Get contract           │
│  ├── PUT  /api/contracts/:id      - Update contract       │
│  ├── GET  /api/contracts/entity/:eid - Get entity contracts│
│  ├── POST /api/contracts/:id/sign - Sign contract          │
│  ├── POST /api/contracts/:id/execute - Execute contract     │
│  ├── GET  /api/contracts/:id/history - Execution history    │
│  └── POST /api/contracts/:id/validate - Validate contract   │
├─────────────────────────────────────────────────────────────┤
│  MongoDB (contract-os database)                             │
│  ├── contracts              - Contract documents            │
│  ├── contract_signatures    - Signature records             │
│  └── contract_executions    - Execution events              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or pnpm

### Installation

```bash
cd LawGens/contract-os
npm install
```

### Configuration

Create a `.env` file:

```env
PORT=4190
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/contract-os
LOG_LEVEL=info
```

### Run Development Server

```bash
npm run dev
```

### Run with Docker

```bash
docker build -t contract-os .
docker run -p 4190:4190 contract-os
```

### Run with Docker Compose

```yaml
version: '3.8'
services:
  contract-os:
    build: .
    ports:
      - "4190:4190"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/contract-os
```

## API Reference

### Create Contract

```bash
POST /api/contracts
Content-Type: application/json

{
  "type": "service",
  "parties": {
    "buyer": { "entityId": "ENT-001", "name": "Acme Corp", "walletAddress": "0x..." },
    "seller": { "entityId": "ENT-002", "name": "Tech Solutions", "walletAddress": "0x..." }
  },
  "terms": {
    "items": [{ "description": "AI Agent Service", "quantity": 1, "price": 5000 }],
    "delivery": { "date": "2026-07-01" },
    "payment": { "method": "milestone", "amount": 5000, "currency": "USD" },
    "quality": { "standards": ["ISO-27001"] }
  },
  "machineReadable": {
    "executeOn": [
      { "condition": "delivery_complete", "action": "release_payment" }
    ],
    "escalateOn": [
      { "condition": "payment_overdue", "action": "notify_escalation", "notify": ["admin"] }
    ],
    "autoRenew": true,
    "renewalTerms": { "periodDays": 365, "priceAdjustment": 5 }
  },
  "expiresAt": "2027-07-01"
}
```

### Sign Contract

```bash
POST /api/contracts/:contractId/sign
Content-Type: application/json

{
  "party": "buyer",
  "signedBy": "ENT-001",
  "signature": "optional-cryptographic-signature"
}
```

### Execute Contract

```bash
POST /api/contracts/:contractId/execute
Content-Type: application/json

{
  "action": "release_payment",
  "params": { "milestone": 1 },
  "triggeredBy": "AI-AGENT-001"
}
```

### Get Execution History

```bash
GET /api/contracts/:contractId/history?limit=50
```

### Validate Contract

```bash
POST /api/contracts/:contractId/validate
```

## Contract Types

| Type | Description |
|------|-------------|
| `service` | Service level agreements |
| `purchase` | Goods purchase contracts |
| `rental` | Equipment/property rental |
| `subscription` | Recurring subscription contracts |
| `partnership` | Business partnership agreements |
| `nda` | Non-disclosure agreements |
| `license` | Software/content licensing |

## Contract Statuses

| Status | Description |
|--------|-------------|
| `draft` | Contract created but not signed |
| `pending_signature` | Awaiting signatures |
| `active` | Fully executed and operational |
| `executed` | All terms completed |
| `expired` | Contract has expired |
| `terminated` | Contract terminated early |
| `disputed` | Contract under dispute |

## Supported Execution Actions

| Action | Description |
|--------|-------------|
| `release_payment` | Release payment to seller |
| `deliver_service` | Mark service as delivered |
| `terminate_contract` | Terminate contract early |
| `renew_contract` | Renew contract |
| `apply_penalty` | Apply penalty for breach |

## Health Checks

```bash
# Liveness check
GET /health/live

# Readiness check
GET /health/ready

# Full health
GET /health
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4190 | Service port |
| `NODE_ENV` | development | Environment mode |
| `MONGODB_URI` | mongodb://localhost:27017/contract-os | MongoDB connection string |
| `LOG_LEVEL` | info | Logging level |
| `CONTRACT_EXPIRY_DAYS` | 365 | Default contract expiry |
| `AUTO_RENEW_ENABLED` | true | Enable auto-renewal |

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

## License

MIT