# CLAUDE.md - Real Estate AI

## Project Overview

**Name:** Real Estate AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Real Estate Management"
**Built from:** RisnaEstate
**Version:** 1.0.0
**Date:** June 14, 2026

## Target Customers

- Individual agents
- Agencies
- Developers

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Property Service | 4830 | Listings, search, lead management |

---

## Integration Hub ✅ NEW!

**Location:** `src/connectors/index.ts`

```typescript
import { realEstateHub } from './src/connectors';
await realEstateHub.getValuation('prop-1');
```

### Connectors

| Connector | Purpose | Status |
|-----------|---------|--------|
| Valuation | Property value estimation | Built |
| Leads | Lead scoring | Built |
| Tours | Schedule property tours | Built |
| Mortgage | EMI calculation | Built |

---

## AI EMPLOYEES (3 Agents)

### 1. Lead Qualifier Agent
```
Role: Scoring & qualifying
Skills: Lead scoring (hot/warm/cold), budget qualification, urgency detection
Integration: CRM, pipeline
```

### 2. Property Advisor AI
```
Role: Recommendations
Skills: Property matching, preference learning, market analysis
Integration: Listings, user profiles
```

### 3. Site Visit Coordinator
```
Role: Scheduling
Skills: Visit booking, agent assignment, reminder management
Integration: Calendar, maps
```

---

## FEATURES

### Property Listings
- [x] Property details (type, size, price, amenities)
- [x] Photo/video upload
- [x] Location map integration
- [x] Virtual tours (360°)
- [x] Property comparison

### Lead Management
- [x] Lead capture (website, WhatsApp, calls)
- [x] Lead scoring (budget, timeline, motivation)
- [x] Source tracking (where lead came from)
- [x] Follow-up scheduling
- [x] Lead assignment to agents
- [x] Pipeline stages (New, Contacted, Visited, Negotiating, Closed)

### Site Visits
- [x] Visit scheduling
- [x] Agent assignment
- [x] GPS tracking of visit
- [x] Visit feedback
- [x] OTP verification at site

### Analytics
- [x] Conversion rates
- [x] Average deal time
- [x] Source performance
- [x] Agent performance
- [x] Property demand analysis

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹4,999/mo | Individual agents |
| **Professional** | ₹14,999/mo | Agencies |
| **Enterprise** | Custom | Large developers |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
real-estate-ai/
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
| PORT | No | 4830 | Service port |
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
| GET | /api/properties | List properties |
| POST | /api/properties | Create listing |
| GET | /api/properties/:id | Get property details |
| GET | /api/leads | List leads |
| POST | /api/leads | Capture lead |
| PUT | /api/leads/:id/stage | Update lead stage |
| GET | /api/site-visits | List visits |
| POST | /api/site-visits | Schedule visit |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Booking payments |
| RABTUL Wallet | 4004 | Commission tracking |
| RABTUL Notification | 4005 | Lead alerts, visit reminders |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice property search |

---

## Deployment Checklist

- [x] Codebase exists
- [x] Documentation complete
- [x] AI Employees documented (3 agents)
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