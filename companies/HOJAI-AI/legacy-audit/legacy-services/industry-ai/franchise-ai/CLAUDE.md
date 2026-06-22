# CLAUDE.md - Franchise AI

## Project Overview

**Name:** Franchise AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Franchise Management"
**Built from:** NeXha FranchiseOS
**Version:** 1.0.0
**Date:** June 12, 2026

## Target Customers

- Franchise businesses
- Chain operators

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Franchise Portal | 4900 | Franchisee management, royalty tracking, compliance |

---

## AI EMPLOYEES (4 Agents)

### 1. Franchise Growth Manager
```
Role: Performance tracking
Skills: KPI monitoring, growth strategy, performance analysis
Integration: Sales, operations
```

### 2. Compliance Manager
```
Role: Standards enforcement
Skills: SOP compliance, brand standards, audit management
Integration: Training, quality control
```

### 3. Territory Manager
```
Role: Geographic management
Skills: Territory rights, cannibalization prevention, expansion planning
Integration: Maps, demographics
```

### 4. Royalty Collector
```
Role: Payment tracking
Skills: Royalty calculation, payment tracking, reminder management
Integration: Finance, accounts
```

---

## FEATURES

### Franchisee Management
- [x] Franchisee database
- [x] Agreement tracking
- [x] Performance scorecard
- [x] Training progress
- [x] Support ticket management

### Location Management
- [x] Outlet database
- [x] Location health tracking
- [x] Capacity planning
- [x] Expansion recommendations

### Royalty Management
- [x] Royalty calculation (revenue %, profit %)
- [x] Payment tracking
- [x] Pending alerts
- [x] Legal action triggers

### Compliance
- [x] SOP checklist
- [x] Audit scheduling
- [x] Issue tracking
- [x] Corrective action plan

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹24,999/mo | <10 franchisees |
| **Professional** | ₹49,999/mo | 10-50 franchisees |
| **Enterprise** | Custom | 50+ franchisees |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
franchise-ai/
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
| PORT | No | 4900 | Service port |
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
| GET | /api/franchisees | List franchisees |
| POST | /api/franchisees | Add franchisee |
| GET | /api/franchisees/:id/performance | Performance metrics |
| GET | /api/royalties | List royalty records |
| POST | /api/royalties/calculate | Calculate royalty |
| GET | /api/compliance | Compliance checklist |
| POST | /api/audit | Schedule audit |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Royalty payments |
| RABTUL Wallet | 4004 | Franchisee funds |
| RABTUL Notification | 4005 | Royalty reminders, compliance alerts |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice franchise queries |

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