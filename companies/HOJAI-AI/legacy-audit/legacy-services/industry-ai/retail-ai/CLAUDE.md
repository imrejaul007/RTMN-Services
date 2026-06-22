# CLAUDE.md - Retail AI

## Project Overview

**Name:** Retail AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Retail Management"
**Built from:** REZ-Merchant POS, hojai-analytics
**Version:** 1.0.0
**Date:** June 14, 2026

## Target Customers

- Fashion boutiques
- Electronics stores
- Grocery stores
- Convenience stores
- Multi-location retail chains

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| POS Service | 4820 | Point of Sale operations |
| Inventory Service | 4821 | Stock management |
| Demand Forecast | 4822 | Sales prediction |

---

## Integration Hub ✅ NEW!

**Location:** `src/connectors/index.ts`

```typescript
import { retailHub } from './src/connectors';
await retailHub.healthCheck();
```

### Connectors

| Connector | Purpose | Status |
|-----------|---------|--------|
| Procurement | Low stock → Nexha order | Built |
| Loyalty | Customer tracking | Built |
| Discovery | Store search | Built |

---

## AI EMPLOYEES (4 Agents)

### 1. Inventory AI
```
Role: Stock optimization
Skills: Demand prediction, reorder optimization
Integration: POS, Inventory
```

### 2. Merchandising AI
```
Role: Product placement
Skills: Planogram, category management
Integration: POS, Analytics
```

### 3. Customer AI
```
Role: Personalization
Skills: Recommendations, segmentation
Integration: CRM, POS
```

### 4. Loyalty AI
```
Role: Rewards & retention
Skills: Points management, tier system
Integration: POS, CRM
```

---

## FEATURES

### Point of Sale
- [x] Barcode scanning (camera/laser)
- [x] Multiple payment methods (cash, card, UPI, wallet)
- [x] Customer loyalty integration
- [x] Discount management (% off, BOGO, combo)
- [x] Receipt generation (thermal printer, email, SMS)
- [x] Void/refund handling with audit trail

### Inventory
- [x] Multi-location stock tracking
- [x] Transfer management between stores
- [x] Low stock alerts (email, SMS, WhatsApp)
- [x] Stock adjustments (damage, theft, count)
- [x] Batch tracking (expiry dates)
- [x] SKU management
- [x] Barcode generation

### Analytics
- [x] Daily/weekly/monthly sales summary
- [x] Product performance ranking
- [x] Demand forecasting (ML-based)
- [x] Trend analysis (seasonal, cyclical)
- [x] Customer segmentation (RFM analysis)
- [x] Profit margin tracking
- [x] Inventory turnover rate

### Customer Management
- [x] Loyalty program (points, tiers)
- [x] Purchase history tracking
- [x] Points redemption
- [x] Personalized offers based on behavior
- [x] Birthday discounts
- [x] Membership cards (digital)

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹2,999/mo | Single store, <500 SKUs |
| **Professional** | ₹7,999/mo | Multi-store, <5000 SKUs |
| **Enterprise** | ₹19,999/mo | Chains, unlimited |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
retail-ai/
├── src/
│   └── index.ts          # Main entry point
├── test/                  # Unit tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── README.md
├── PRODUCT.md            # Product documentation
└── CLAUDE.md             # This file
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4820 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection URL |

---

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/products | List products |
| POST | /api/products | Create product |
| GET | /api/inventory | Get inventory |
| POST | /api/inventory/adjust | Adjust stock |
| GET | /api/analytics/sales | Sales analytics |
| GET | /api/customers | List customers |
| POST | /api/transactions | Process transaction |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Balance management, coins |
| RABTUL Notification | 4005 | Push notifications |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice AI |
| HOJAI Memory | 4520 | Memory services |

---

## Deployment Checklist

- [x] Codebase exists
- [x] Documentation complete
- [x] AI Employees documented (4 agents)
- [x] Features documented
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Health endpoint implemented
- [ ] Docker support added
- [ ] Monitoring configured
- [ ] Security audit passed

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Verify MONGODB_URI |
| Redis timeout | Verify REDIS_URL |
| JWT validation fails | Verify JWT_SECRET |
| Health check fails | Check all dependencies |
| Payment fails | Verify RABTUL Payment (4001) |

---

## Related Products

| Product | Industry | AI Agents |
|---------|----------|-----------|
| retail-ai | Retail | 4 |
| hr-ai | HR/Payroll | 4 |
| fitness-ai | Gym/Fitness | 6 |
| salon-ai | Salon/Spa | 6 |
| manufacturing-ai | Manufacturing | 4 |
| society-ai | Apartments | 4 |
| real-estate-ai | Real Estate | 3 |
| finance-ai | Finance | 4 |
| education-ai | Education | 4 |
| logistics-ai | Logistics | 4 |
| franchise-ai | Franchise | 4 |
| travel-ai | Travel | 4 |

---

**Last Updated:** 2026-06-12
**HOJAI AI - Industry AI Division**