# CLAUDE.md - Salon AI

## Project Overview

**Name:** Salon AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Salon & Spa Management"
**Built from:** REZ-Merchant, hojai-telecom-bridge
**Version:** 1.0.0
**Date:** June 14, 2026

## Target Customers

- Salons (hair, beauty)
- Spas & wellness centers
- Nail salons
- Barber shops
- Multi-service beauty centers

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Booking Service | 4810 | Customer management, appointments |
| Staff Scheduler | 4811 | Shift management, rota generation |
| Inventory Service | 4812 | Product tracking, usage recording |

---

## Integration Hub ✅ NEW!

**Location:** `src/connectors/index.ts`

```typescript
import { salonAIHub } from './src/connectors';
await salonAIHub.healthCheck();
```

### Connectors

| Connector | Purpose | Status |
|-----------|---------|--------|
| Booking | Appointment automation | Built |
| Inventory | Stock management | Built |
| Staff | Scheduling | Built |

---

## AI EMPLOYEES (6 Agents)

### 1. Beauty Advisor
```
Role: Service recommendations
Skills: Skin/hair analysis, service matching
Channels: WhatsApp, App
```

### 2. Appointment Manager
```
Role: Booking automation
Skills: WhatsApp booking, reminders, rescheduling
Channels: WhatsApp
```

### 3. Campaign Manager
```
Role: Marketing & loyalty
Skills: Promotions, loyalty points, seasonal campaigns
Channels: WhatsApp, SMS
```

### 4. Retention Manager
```
Role: Customer retention
Skills: Churn prediction, win-back offers, reviews
Channels: WhatsApp
```

### 5. Treatment Advisor ✅ IMPLEMENTED
```
Role: Service bundles
Skills: Package suggestions, upselling
Integration: Service catalog
Port: 4813
Location: employees/treatment-advisor/
Features: Bundle suggestions, upsell recommendations, package deals
```

### 6. Inventory Alert Agent ✅ IMPLEMENTED
```
Role: Stock alerts
Skills: Product usage tracking, reorder alerts
Integration: Inventory management
Port: 4814
Location: employees/inventory-alert-agent/
Features: Low stock alerts, reorder recommendations, usage forecasting
```

---

## FEATURES

### Customer Experience
- [x] WhatsApp booking (natural language)
- [x] Voice appointment booking (IVR)
- [x] Service recommendations (based on hair/skin type)
- [x] Loyalty program (points, tiers)
- [x] Review requests (post-service)
- [x] Reminder notifications (1 day before)
- [x] Birthday offers

### Operations
- [x] Multi-staff scheduling (shifts, leaves, breaks)
- [x] Service catalog (services, duration, price, staff)
- [x] Inventory management (products, usage per service)
- [x] Package deals (bundles with discount)
- [x] Capacity management (rooms, chairs)
- [x] Staff commission tracking

### Marketing
- [x] Personalized recommendations
- [x] Seasonal campaigns (summer, wedding season)
- [x] Birthday offers
- [x] Win-back campaigns (inactive customers)
- [x] Review management (Google, Justdial)
- [x] Loyalty tiers (Bronze, Silver, Gold, Platinum)

---

## LOYALTY TIERS

| Tier | Points | Benefits |
|------|--------|----------|
| **Bronze** | 0+ | Base rewards |
| **Silver** | 10,000+ | 5% bonus points |
| **Gold** | 25,000+ | 10% bonus + priority |
| **Platinum** | 50,000+ | 15% bonus + exclusive offers |

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹1,999/mo | Single location, <200 customers |
| **Professional** | ₹4,999/mo | Multi-location, <1000 customers |
| **Enterprise** | ₹14,999/mo | Chains, unlimited |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
salon-ai/
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
| PORT | No | 4810 | Service port |
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
| GET | /api/customers | List customers |
| POST | /api/customers | Register customer |
| GET | /api/appointments | List appointments |
| POST | /api/appointments | Book appointment |
| GET | /api/services | List services |
| POST | /api/services | Create service |
| GET | /api/staff | List staff |
| POST | /api/staff/schedule | Generate schedule |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Service payments |
| RABTUL Wallet | 4004 | Loyalty points, cashback |
| RABTUL Notification | 4005 | Booking reminders, offers |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice booking |

---

## Deployment Checklist

- [x] Codebase exists
- [x] Documentation complete
- [x] AI Employees documented (6 agents)
- [x] Features documented
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Health endpoint implemented
- [ ] Docker support added
- [ ] Monitoring configured
- [ ] Security audit passed

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