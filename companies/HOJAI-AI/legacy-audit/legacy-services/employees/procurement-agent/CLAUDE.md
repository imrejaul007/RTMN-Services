# CLAUDE.md - Procurement Agent

## Project Overview

**Name:** Procurement Agent
**Company:** hojai-ai
**Type:** L2 Specialist Employee
**Port:** 4786
**Status:** ✅ Connected & Working (June 14, 2026)

## Description

Intelligent procurement with Nexha Procurement OS integration. Handles RFQ creation, supplier matching, negotiation, and contract generation.

## Tech Stack

- Node.js 18+
- Express.js
- JavaScript
- Axios (HTTP client)

## Services Connected

| Service | Connects To | Port |
|---------|-------------|------|
| Procurement OS | Nexha Procurement OS | 4320 |

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Production server (port 4786) |
| `npm run dev` | Development server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4786 | Service port |
| PROCUREMENT_OS_URL | No | http://localhost:4320 | Nexha Procurement OS |
| INTERNAL_SERVICE_TOKEN | No | dev-token | Service authentication |

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

### RFQ
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rfq` | Create RFQ |
| GET | `/api/rfq` | List active RFQs |
| GET | `/api/rfq/:rfqId` | Get RFQ status |

### Negotiation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/negotiate` | Calculate negotiation strategy |
| POST | `/api/negotiate/counter` | Submit counter offer |

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suppliers` | Find suppliers by category |
| POST | `/api/suppliers/evaluate` | Evaluate supplier trust |
| POST | `/api/suppliers/contract` | Generate contract |

## Integration

### Nexha Procurement OS (Port 4320)
- RFQ creation and management
- Supplier directory
- Deal state machine
- Contract generation

### RABTUL Services
- Authentication (4002)
- Payments (4001)

## File Structure

```
procurement-agent/
├── src/
│   └── index.js           # Main server with all endpoints
├── package.json
├── README.md
├── CLAUDE.md
├── Dockerfile
└── docker-compose.yml
```

## Key Code Patterns

### Create RFQ
```javascript
const response = await procurementClient.post('/api/rfqs', {
  title: `RFQ: ${item}`,
  category,
  items: [{ name: item, quantity }],
  merchantId: hotelId,
  status: 'open',
});
```

### Calculate Negotiation
```javascript
const pricing = calculateTargetPrice(currentPrice, 'standard');
// Returns: { targetPrice, savings, discount, maxRounds }
```

### Match Suppliers
```javascript
const suppliers = matchSuppliers('ac');
// Returns: [{ id, name, rating, categories, location }, ...]
```

## Negotiation Strategies

| Strategy | Target Discount | Max Rounds |
|----------|---------------|------------|
| standard | 10% | 3 |
| aggressive | 20% | 5 |
| friendly | 5% | 2 |

## Supplier Categories

| Category | Suppliers |
|----------|-----------|
| ac | CoolAir Solutions, Climate Pro, Metro Cooling |
| plumbing | AquaFix Services, PipeMaster Pro |
| electrical | Spark Electric, PowerSafe Solutions |
| linen | SoftLinens Hotel Supply, Hotel Essentials |
| food | FreshFarm Foods, Quality Meats & More |
| general | ABC Supplies, XYZ Traders, Quality Goods Co |

## Story Coverage

| Chapter | Description | Status |
|---------|------------|--------|
| Ch 11 | Procurement → Nexha | ✅ Working |

---

**Last Updated:** June 14, 2026
