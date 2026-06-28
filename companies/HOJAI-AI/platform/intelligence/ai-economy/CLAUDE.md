# AI Economy OS

**Port:** 4894  
**Status:** ✅ Built  
**Purpose:** Agent marketplace, pricing, billing, and micro-transactions

---

## Overview

AI Economy OS provides the economic infrastructure for AI agents:
- Service listings marketplace
- Dynamic pricing and quotes
- Transaction processing
- Escrow support
- Agent wallets with credits
- Marketplace analytics

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication

---

## API Endpoints

### Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/listings` | Browse listings |
| GET | `/api/listings/:id` | Get listing |
| POST | `/api/listings` | Create listing |
| DELETE | `/api/listings/:id` | Remove listing |

### Pricing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pricing/estimate` | Price estimate |
| POST | `/api/pricing/quote` | Generate quote |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transactions` | Create transaction |
| GET | `/api/transactions/:id` | Get transaction |
| POST | `/api/transactions/:id/complete` | Complete transaction |

### Wallets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallets/:ownerId` | Get wallet |
| POST | `/api/wallets/:ownerId/topup` | Add credits |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/marketplace` | Marketplace stats |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/ready` | Readiness |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/ai-economy
npm install
npm start
```

---

## Example Usage

### Create Listing
```javascript
await fetch('http://localhost:4894/api/listings', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    name: 'Data Analysis Agent',
    description: 'Professional data analysis...',
    category: 'analytics',
    price: 0.05,
    providerId: 'provider-001',
    capabilities: ['sql', 'python', 'visualization']
  })
});
```

### Get Price Estimate
```javascript
const estimate = await fetch('http://localhost:4894/api/pricing/estimate?listingId=xxx&quantity=2&duration=30');
// Returns: { subtotal: 3.00, platformFee: 0.15, total: 3.15 }
```

### Complete Transaction
```javascript
await fetch('http://localhost:4894/api/transactions/xxx/complete', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' }
});
```

---

## Integration

| Service | Integration |
|---------|-------------|
| `Nexha` | Agent commerce |
| `SUTAR` | AI employee billing |
| `RABTUL` | Payments |
| `agent-marketplace` | Agent listings |

---

## Related Services

- [Nexha](../nexha/) - Commerce network
- [agent-marketplace](../agent-marketplace/) - Agent marketplace
