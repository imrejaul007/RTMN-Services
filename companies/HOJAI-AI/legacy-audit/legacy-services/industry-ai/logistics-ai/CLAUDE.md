# CLAUDE.md - Logistics AI

## Project Overview

**Name:** Logistics AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Fleet & Delivery Management"
**Built from:** KHAIRMOVE
**Version:** 1.0.0
**Date:** June 14, 2026

## Target Customers

- Delivery companies
- Logistics firms
- E-commerce

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Fleet Service | 4880 | Vehicle management, driver management, maintenance |
| Dispatch Service | 4881 | Order assignment, route optimization, delivery tracking |

---

## Integration Hub ✅ NEW!

**Location:** `src/connectors/index.ts`

```typescript
import { logisticsHub } from './src/connectors';
await logisticsHub.optimizeRoute(vehicles, deliveries);
```

### Connectors

| Connector | Purpose | Status |
|-----------|---------|--------|
| Route | Optimize delivery routes | Built |
| Driver | Driver status tracking | Built |
| Tracking | Delivery tracking | Built |

---

## AI EMPLOYEES (4 Agents)

### 1. Dispatch AI
```
Role: Order assignment
Skills: Driver matching, zone assignment, priority handling
Integration: Order intake, driver pool
```

### 2. Route Optimizer
```
Role: Path optimization
Skills: Route calculation, multi-stop optimization, fuel efficiency
Integration: Maps, traffic data
```

### 3. Fleet Manager
```
Role: Vehicle management
Skills: Vehicle tracking, maintenance scheduling, fuel monitoring
Integration: IoT sensors, maintenance logs
```

### 4. Driver Assistant
```
Role: Navigation help
Skills: Real-time directions, ETA updates, delivery confirmations
Channels: Mobile app, voice
```

---

## FEATURES

### Fleet Management
- [x] Vehicle database (make, model, capacity)
- [x] Driver assignment
- [x] Maintenance tracking
- [x] Fuel consumption monitoring
- [x] Insurance renewal alerts
- [x] Vehicle documents (RC, permit)

### Dispatch
- [x] Order intake (API, manual)
- [x] Zone-based assignment
- [x] Priority handling
- [x] Load optimization
- [x] Multi-stop routing

### Delivery Tracking
- [x] Real-time GPS tracking
- [x] OTP verification at delivery
- [x] Proof of delivery (photo, signature)
- [x] Delivery status updates
- [x] Customer notifications

### Analytics
- [x] Delivery time analysis
- [x] Failed delivery reasons
- [x] Driver performance
- [x] Route efficiency
- [x] Cost per delivery

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹9,999/mo | <20 vehicles |
| **Professional** | ₹24,999/mo | 20-100 vehicles |
| **Enterprise** | Custom | 100+ vehicles |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
logistics-ai/
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
| PORT | No | 4880 | Service port |
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
| GET | /api/vehicles | List vehicles |
| POST | /api/vehicles | Add vehicle |
| GET | /api/drivers | List drivers |
| POST | /api/dispatch | Dispatch order |
| GET | /api/deliveries | List deliveries |
| POST | /api/deliveries/:id/track | Track delivery |
| POST | /api/deliveries/:id/confirm | Confirm delivery |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Cash on delivery, payments |
| RABTUL Wallet | 4004 | Driver earnings, fuel cards |
| RABTUL Notification | 4005 | Delivery updates, ETA notifications |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice dispatch commands |

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