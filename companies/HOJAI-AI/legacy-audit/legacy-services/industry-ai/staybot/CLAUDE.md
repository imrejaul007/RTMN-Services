# CLAUDE.md - Staybot (Hotel AI)

## Project Overview

**Name:** Staybot
**Type:** Industry AI Product
**Tagline:** "AI-Powered Hotel Management"
**Version:** 1.0.0
**Date:** June 12, 2026
**Status:** 🚧 Skeleton - Needs Implementation

## Target Customers

- Hotels
- Resorts
- Homestays
- Hostels

---

## Expected AI EMPLOYEES (4 Agents)

### 1. Front Desk Agent
```
Role: Check-in/out
Skills: Digital check-in, room assignment, guest queries
Channels: WhatsApp, app, voice
Integration: PMS, smart locks
```

### 2. Housekeeping Agent
```
Role: Cleaning management
Skills: Cleaning schedules, room status tracking, request management
Integration: Housekeeping system
```

### 3. Revenue Manager
```
Role: Pricing optimization
Skills: Dynamic pricing, demand forecasting, promo management
Integration: PMS, channel manager
```

### 4. Guest Experience Agent
```
Role: Personalization
Skills: Welcome messages, room preferences, concierge services
Integration: Guest profiles, preferences
```

---

## Expected FEATURES

### Guest Experience
- [ ] Digital check-in/out
- [ ] Room booking (direct, OTA)
- [ ] WhatsApp concierge
- [ ] Voice commands

### Operations
- [ ] Housekeeping scheduling
- [ ] Restaurant/POS integration
- [ ] Spa booking
- [ ] Event management

### Guest Services
- [ ] Room service orders
- [ ] Guest messaging
- [ ] Review management
- [ ] Complaint handling

---

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Staybot Service | TBD | AI concierge, intent detection |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
staybot/
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
| PORT | No | TBD | Service port |
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

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, guest verification |
| RABTUL Payment | 4001 | Guest payments, deposits |
| RABTUL Wallet | 4004 | Guest wallet, minibar charges |
| RABTUL Notification | 4005 | Booking confirmations, reminders |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice commands for hotel |
| HOJAI Memory | 4520 | Guest preferences, history |

---

## Deployment Checklist

- [ ] Codebase exists
- [ ] Documentation complete
- [ ] AI Employees documented (4 agents)
- [ ] Features documented
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
| staybot | Hospitality | 4 (expected) |
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