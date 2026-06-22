# CLAUDE.md - Society AI

## Project Overview

**Name:** Society AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Apartment/Society Management"
**Built from:** BuzzLocal
**Version:** 1.0.0
**Date:** June 12, 2026

## Target Customers

- Residential societies
- Housing complexes
- Gated communities

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Society Service | 4850 | Resident management, visitor tracking, complaints |

---

## AI EMPLOYEES (4 Agents)

### 1. Society Manager
```
Role: Overall coordination
Skills: Resident management, facilities, billing, complaints
Integration: All society services
```

### 2. Visitor Manager
```
Role: Pass generation
Skills: Visitor passes, entry/exit tracking, notifications
Channels: WhatsApp, app
```

### 3. Complaint Resolver AI
```
Role: Issue resolution
Skills: Complaint categorization, staff assignment, SLA tracking
Integration: Maintenance, vendors
```

### 4. Event Coordinator
```
Role: Community events
Skills: Event planning, invites, RSVP management
Integration: Community calendar
```

---

## FEATURES

### Resident Management
- [x] Flat/owner database
- [x] Tenant management
- [x] Family member registration
- [x] Vehicle registration
- [x] Emergency contact management

### Visitor Management
- [x] Digital visitor passes (QR code)
- [x] Pre-approve visitors (by owner)
- [x] Entry/exit logging
- [x] WhatsApp notification to owner
- [x] OTP verification at gate
- [x] Blacklist management

### Complaint Management
- [x] Complaint registration (app, WhatsApp)
- [x] Category (plumbing, electrical, cleanliness)
- [x] Assignment to staff
- [x] Status tracking (open, in-progress, resolved)
- [x] SLA tracking
- [x] Resident feedback

### Maintenance
- [x] AMC tracking (elevator, generator, water tank)
- [x] Work order generation
- [x] Vendor management
- [x] Invoice tracking

### Community
- [x] Event calendar
- [x] RSVP management
- [x] Notice board (digital)
- [x] Polls and surveys
- [x] Community fund tracking

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹2,999/mo | <100 flats |
| **Professional** | ₹4,999/mo | 100-500 flats |
| **Enterprise** | ₹9,999/mo | 500+ flats |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
society-ai/
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
| PORT | No | 4850 | Service port |
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
| GET | /api/residents | List residents |
| POST | /api/residents | Add resident |
| GET | /api/visitors | List visitors |
| POST | /api/visitors/pass | Generate visitor pass |
| GET | /api/complaints | List complaints |
| POST | /api/complaints | Register complaint |
| PUT | /api/complaints/:id/status | Update status |
| GET | /api/events | List events |
| POST | /api/events | Create event |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Maintenance payments |
| RABTUL Wallet | 4004 | Society fund management |
| RABTUL Notification | 4005 | Visitor alerts, complaint updates |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice commands |

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