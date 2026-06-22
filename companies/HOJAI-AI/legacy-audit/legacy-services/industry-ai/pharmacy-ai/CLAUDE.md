# CLAUDE.md - Pharmacy AI

## Project Overview

**Name:** Pharmacy AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Pharmacy Management"
**Version:** 1.0.0
**Date:** June 14, 2026
**Status:** 🚧 Skeleton + Connectors ✅

## Target Customers

- Retail pharmacies
- Hospital pharmacies
- Online pharmacies

---

## Integration Hub ✅ NEW!

**Location:** `src/connectors/index.ts`

```typescript
import { pharmacyHub } from './src/connectors';
await pharmacyHub.verifyPrescription('rx-123');
```

### Connectors

| Connector | Purpose | Status |
|-----------|---------|--------|
| Prescription | Verification | Built |
| Interactions | Drug safety | Built |
| Inventory | Stock check | Built |
| Delivery | Order tracking | Built |

---

## Expected AI EMPLOYEES (3 Agents)

### 1. Inventory Agent
```
Role: Stock management
Skills: Medicine tracking, expiry alerts, reorder management
Integration: Inventory system
```

### 2. Compliance Agent
```
Role: Drug regulations
Skills: License compliance, prescription validation, regulatory checks
Integration: Compliance database
```

### 3. Customer Advisor
```
Role: OTC recommendations
Skills: OTC medicine suggestions, drug interaction checks
Integration: Drug database
```

---

## Expected FEATURES

### Inventory Management
- [ ] Stock tracking
- [ ] Expiry alerts
- [ ] Auto-reorder

### Prescription Management
- [ ] Digital prescriptions
- [ ] Verification
- [ ] Interaction checks

### Customer Service
- [ ] OTC recommendations
- [ ] Order tracking
- [ ] Delivery scheduling

---

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Pharmacy Service | 4810 | Pharmacy operations |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
pharmacy-ai/
├── src/
│   └── index.ts          # Main entry point
├── test/                  # Unit tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── README.md
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

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Prescription payments |
| RABTUL Wallet | 4004 | Pharmacy wallet |
| RABTUL Notification | 4005 | Expiry alerts, order updates |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Voice | 4850 | Voice pharmacy queries |

---

## Deployment Checklist

- [ ] Codebase exists
- [ ] Documentation complete
- [ ] AI Employees documented (3 agents)
- [ ] Features documented
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Health endpoint implemented
- [ ] Docker support added
- [ ] Monitoring configured
- [ ] Security audit passed

---

**Last Updated:** 2026-06-12
**HOJAI AI - Industry AI Division**