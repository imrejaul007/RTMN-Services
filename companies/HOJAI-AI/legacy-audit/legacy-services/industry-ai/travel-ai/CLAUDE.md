# CLAUDE.md - Travel AI

## Project Overview

**Name:** Travel AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Travel Management"
**Built from:** Airzy
**Version:** 1.0.0
**Date:** June 14, 2026

## Target Customers

- Individual travelers
- Corporate travel
- Travel agencies

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Travel Service | 4910 | Trip planning, itinerary, bookings |

---

## Integration Hub ✅ NEW!

**Location:** `src/connectors/index.ts`

```typescript
import { travelHub } from './src/connectors';
await travelHub.searchFlights({ from: 'BLR', to: 'DEL', date: '2026-07-01' });
```

### Connectors

| Connector | Purpose | Status |
|-----------|---------|--------|
| Flights | Search & booking | Built |
| Hotels | Search & booking | Built |
| Itinerary | Trip planning | Built |
| Currency | Conversion | Built |

---

## AI EMPLOYEES (4 Agents)

### 1. Travel Planner
```
Role: Trip suggestions
Skills: Destination recommendations, itinerary creation, deal finding
Integration: Flights, hotels, activities
```

### 2. Concierge Agent
```
Role: 24/7 support
Skills: Booking changes, cancellations, special requests
Channels: WhatsApp, phone, app
```

### 3. Visa Assistant
```
Role: Requirements
Skills: Visa need checking, status tracking, application guidance
Integration: Embassy data, application portals
```

### 4. Airport Assistant
```
Role: Check-in help
Skills: Check-in guidance, luggage info, security/gate navigation
Channels: Mobile app, voice
```

---

## FEATURES

### Trip Planning
- [x] Destination search (filters: budget, weather, activities)
- [x] Itinerary builder (drag-drop interface)
- [x] Budget calculator
- [x] Packing checklist

### Bookings
- [x] Flight search & booking
- [x] Hotel search & booking
- [x] Activity booking (tours, tickets)
- [x] Transfer booking (cab, train)
- [x] Visa assistance

### Corporate Travel
- [x] Travel policy compliance
- [x] Approval workflow
- [x] Expense tracking
- [x] Travel report generation

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹999/user/mo | Individual |
| **Professional** | ₹499/user/mo | Teams |
| **Enterprise** | Custom | Agencies |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
travel-ai/
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
| PORT | No | 4910 | Service port |
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
| GET | /api/destinations | Search destinations |
| POST | /api/itineraries | Create itinerary |
| GET | /api/flights | Search flights |
| GET | /api/hotels | Search hotels |
| GET | /api/activities | Search activities |
| POST | /api/bookings | Create booking |
| GET | /api/bookings/:id | Get booking details |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Booking payments |
| RABTUL Wallet | 4004 | Travel wallet, rewards |
| RABTUL Notification | 4005 | Booking confirmations, reminders |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice travel commands |

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