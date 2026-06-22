# CLAUDE.md - Maintenance Agent

## Project Overview

**Name:** Maintenance Agent
**Company:** hojai-ai
**Type:** L2 Specialist Employee
**Port:** 4849
**Status:** ✅ Connected & Working (June 14, 2026)

## Description

Intelligent maintenance management with predictive capabilities. Analyzes equipment patterns and predicts failures before they happen.

## Tech Stack

- Node.js 18+
- Express.js
- JavaScript
- Axios (HTTP client for service communication)

## Services Connected

| Service | Connects To | Port |
|---------|-------------|------|
| Work Order Management | REZ Maintenance | 4831 |
| Parts Ordering | Nexha Procurement | 4320 |
| Guest History | HOJAI Memory | 4520 |

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Production server (port 4849) |
| `npm run dev` | Development server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4849 | Service port |
| MAINTENANCE_SERVICE_URL | No | http://localhost:4831 | REZ Maintenance Service |
| PROCUREMENT_SERVICE_URL | No | http://localhost:4320 | Nexha Procurement |
| INTERNAL_SERVICE_TOKEN | No | dev-token | Service authentication |

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

### Work Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/work-order` | Create work order |
| GET | `/api/work-orders/:hotelId` | Get all work orders |
| GET | `/api/work-orders/:hotelId/:workOrderId` | Get specific work order |
| PUT | `/api/work-orders/:workOrderId/status` | Update status |
| POST | `/api/work-orders/:workOrderId/assign` | Assign technician |

### Predictive Maintenance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predict` | Predict equipment failure |
| POST | `/api/equipment/:equipmentId/health` | Update equipment health |
| GET | `/api/equipment/:equipmentId/health` | Get equipment health |
| GET | `/api/predict/high-risk` | Get high-risk equipment |

### Vendors
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vendors` | Create vendor |
| GET | `/api/vendors/:hotelId` | Get vendors |

### Parts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/parts/order` | Order parts |

### Statistics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats/:hotelId` | Get maintenance stats |

## Integration

### REZ Maintenance (Port 4831)
- Work order CRUD
- Vendor management
- Status tracking

### Nexha Procurement (Port 4320)
- Parts ordering
- RFQ creation
- Supplier matching

### HOJAI Memory (Port 4520)
- Guest history
- Equipment patterns

## File Structure

```
maintenance-agent/
├── src/
│   └── index.js           # Main server with predictive engine
├── package.json
├── README.md
├── CLAUDE.md
├── Dockerfile
└── docker-compose.yml
```

## Predictive Maintenance Engine

### Equipment Types

| Type | Base Failure Rate | Avg Lifetime (days) | Warning Signs |
|------|-----------------|---------------------|---------------|
| ac | 0.02 | 3650 | vibration, temperature_spike, noise |
| elevator | 0.005 | 7300 | jerk, speed_variation, door_issue |
| plumbing | 0.01 | 1825 | pressure_drop, leak, color_change |
| electrical | 0.008 | 2555 | flicker, heat, spark |
| kitchen | 0.015 | 1095 | inconsistent_temp, noise, slow_response |

### Prediction Algorithm

1. Base failure rate from equipment type
2. Adjust for age (days / avgLifetime)
3. Adjust for warning signs (× 1.3 per sign)
4. Adjust for maintenance history (> 90 days → × 1.5)
5. Determine risk level (low < 3%, medium < 10%, high ≥ 10%)

### Auto-actions

- High risk → Auto-order parts via Nexha Procurement
- Add prediction notes to work orders
- Flag for immediate inspection

## Key Code Patterns

### Create Work Order
```javascript
const response = await maintenanceClient.post('/api/requests', {
  hotelId,
  category,
  priority,
  title,
  description,
  reportedBy,
  roomId,
});
```

### Predict Failure
```javascript
const prediction = predictiveEngine.predictFailure('ac', {
  warningSigns: ['vibration', 'noise'],
  ageDays: 1825,
  lastMaintenance: '2026-01-15',
});
// Returns: { probability, risk, estimatedDaysUntilFailure, recommendations }
```

## Story Coverage

| Chapter | Description | Status |
|---------|------------|--------|
| Ch 14 | AC vibration → Predictive analysis → Parts ordered | ✅ Working |

---

**Last Updated:** June 14, 2026
