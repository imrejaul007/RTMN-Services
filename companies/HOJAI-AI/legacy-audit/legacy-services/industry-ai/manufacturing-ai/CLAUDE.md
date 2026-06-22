# CLAUDE.md - Manufacturing AI

## Project Overview

**Name:** Manufacturing AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered MES (Manufacturing Execution System)"
**Built from:** NeXha
**Version:** 1.0.0
**Date:** June 14, 2026

## Target Customers

- Factories
- Production plants
- SMEs

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| MES Service | 4890 | Work orders, workstations, quality inspections |

---

## Integration Hub ✅ NEW!

**Location:** `src/connectors/index.ts`

```typescript
import { manufacturingHub } from './src/connectors';
await manufacturingHub.checkSupplyChain('material-1');
```

### Connectors

| Connector | Purpose | Status |
|-----------|---------|--------|
| Supply | Material availability | Built |
| Quality | Defect tracking | Built |
| Maintenance | Predictive maintenance | Built |

---

## AI EMPLOYEES (4 Agents)

### 1. Production Planner
```
Role: Scheduling
Skills: Production schedule, resource allocation, flow optimization
Integration: Work orders, workstations
```

### 2. Procurement Agent
```
Role: Sourcing
Skills: Supplier finding, price comparison, order placement
Integration: Inventory, suppliers
```

### 3. Quality Auditor
```
Role: QC
Skills: Product inspection, defect logging, CAPA tracking
Integration: QC checkpoints
```

### 4. Maintenance Predictor
```
Role: Equipment
Skills: Machine failure prediction, preventive maintenance scheduling
Integration: IoT sensors
```

---

## FEATURES

### Production
- [x] Work order creation & tracking
- [x] Production planning (Gantt chart)
- [x] Batch tracking
- [x] Production rate monitoring
- [x] Yield calculation
- [x] Scrap tracking

### Quality Control
- [x] QC checkpoints (incoming, in-process, outgoing)
- [x] Defect logging (type, cause, severity)
- [x] NCR (Non-Conformance Report)
- [x] CAPA (Corrective & Preventive Action)
- [x] First Article Inspection (FAI)
- [x] SPC (Statistical Process Control)

### Workstations
- [x] Machine status tracking (running, idle, maintenance)
- [x] Downtime logging
- [x] OEE (Overall Equipment Effectiveness) calculation
- [x] Cycle time tracking
- [x] Capacity planning

### IoT Integration
- [x] Real-time machine data
- [x] Sensor monitoring (temperature, pressure, vibration)
- [x] Automated alerts
- [x] Predictive maintenance

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹19,999/mo | <50 employees |
| **Professional** | ₹49,999/mo | 50-200 employees |
| **Enterprise** | Custom | 200+ employees |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
manufacturing-ai/
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
| PORT | No | 4890 | Service port |
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
| GET | /api/work-orders | List work orders |
| POST | /api/work-orders | Create work order |
| PUT | /api/work-orders/:id/status | Update work order status |
| GET | /api/machines | List machines |
| POST | /api/machines/:id/maintenance | Schedule maintenance |
| GET | /api/qc/reports | List QC reports |
| POST | /api/qc/reports | Create QC report |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Procurement payments |
| RABTUL Wallet | 4004 | Supplier payments |
| RABTUL Notification | 4005 | Maintenance alerts |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice commands for production |

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