# Maintenance Agent

**Company:** HOJAI AI
**Type:** L2 Specialist Employee
**Industry:** Facilities/Maintenance
**Port:** 4849
**Status:** ✅ Connected & Working (June 14, 2026)

---

## Overview

Maintenance Agent is an AI employee that handles facility maintenance with predictive capabilities. It manages work orders, predicts equipment failures, and coordinates with vendors.

### Tagline
> "AI-powered predictive maintenance with work order management"

---

## Capabilities

### Work Order Management
- [x] Create maintenance requests
- [x] Priority levels (emergency, high, medium, low)
- [x] Status tracking (pending, assigned, in_progress, completed, cancelled)
- [x] Assign technicians
- [x] Schedule maintenance
- [x] Cost tracking
- [x] Add notes

### Predictive Maintenance
- [x] Equipment health monitoring
- [x] Failure probability prediction
- [x] Risk assessment (low, medium, high)
- [x] Days until failure estimation
- [x] Maintenance recommendations
- [x] Warning sign detection

### Vendor Management
- [x] Vendor directory
- [x] Category-based vendor matching
- [x] Vendor assignment to work orders
- [x] Create/manage vendors

### Proactive Parts Ordering
- [x] Auto-order parts for high-risk equipment
- [x] Integration with Nexha Procurement
- [x] RFQ creation
- [x] Emergency ordering

---

## Services Connected

| Service | Connects To | Port | Purpose |
|---------|-------------|------|---------|
| **Work Order Management** | REZ Maintenance | 4831 | Work orders, vendors |
| **Parts Ordering** | Nexha Procurement | 4320 | Parts ordering, RFQ |
| **Guest History** | HOJAI Memory | 4520 | Guest history |

---

## Integration Points

| Connected Service | Port | Purpose | Status |
|-------------------|------|---------|--------|
| REZ Maintenance | 4831 | Work orders, vendors | ✅ Connected |
| Nexha Procurement | 4320 | Parts ordering | ✅ Connected |
| HOJAI Memory | 4520 | Guest history | ✅ Connected |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/work-order` | Create work order |
| GET | `/api/work-orders/:hotelId` | Get all work orders |
| GET | `/api/work-orders/:hotelId/:workOrderId` | Get specific work order |
| PUT | `/api/work-orders/:workOrderId/status` | Update status |
| POST | `/api/work-orders/:workOrderId/assign` | Assign technician |
| POST | `/api/predict` | Predict equipment failure |
| POST | `/api/equipment/:equipmentId/health` | Update equipment health |
| GET | `/api/equipment/:equipmentId/health` | Get equipment health |
| GET | `/api/predict/high-risk` | Get high-risk equipment |
| POST | `/api/vendors` | Create vendor |
| GET | `/api/vendors/:hotelId` | Get vendors |
| POST | `/api/parts/order` | Order parts |
| GET | `/api/stats/:hotelId` | Get maintenance stats |

---

## Predictive Maintenance Engine

### Equipment Types Supported

| Type | Base Failure Rate | Avg Lifetime | Warning Signs |
|------|-----------------|--------------|--------------|
| AC | 2% | 10 years | vibration, temperature_spike, noise |
| Elevator | 0.5% | 20 years | jerk, speed_variation, door_issue |
| Plumbing | 1% | 5 years | pressure_drop, leak, color_change |
| Electrical | 0.8% | 7 years | flicker, heat, spark |
| Kitchen | 1.5% | 3 years | inconsistent_temp, noise, slow_response |

### Prediction Output

```json
{
  "probability": 0.15,
  "risk": "high",
  "estimatedDaysUntilFailure": 45,
  "recommendations": [
    { "priority": "urgent", "action": "Schedule immediate inspection" },
    { "priority": "high", "action": "Order replacement parts preemptively" }
  ]
}
```

---

## Quick Start

```bash
cd companies/hojai-ai/employees/maintenance-agent
npm install
npm start
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4849 | Service port |
| MAINTENANCE_SERVICE_URL | http://localhost:4831 | REZ Maintenance Service |
| PROCUREMENT_SERVICE_URL | http://localhost:4320 | Nexha Procurement |
| INTERNAL_SERVICE_TOKEN | dev-token | Service authentication |

---

## Tech Stack

- Node.js 18+
- Express.js
- JavaScript
- Axios (for service communication)

---

## Story Coverage

| Chapter | Story Component | Status |
|---------|----------------|--------|
| Ch 14 | AC → Maintenance Agent → Predictive analysis | ✅ Working |

---

## Example Usage

### Create Work Order

```bash
curl -X POST http://localhost:4849/api/work-order \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": "pentouz-indiranagar",
    "category": "ac",
    "priority": "high",
    "title": "Room 1812 AC vibrating",
    "description": "Guest reported unusual vibration from AC unit",
    "reportedBy": "housekeeping",
    "roomId": "1812",
    "equipmentId": "AC-1812-01"
  }'
```

### Predict Failure

```bash
curl -X POST http://localhost:4849/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "equipmentType": "ac",
    "equipmentData": {
      "warningSigns": ["vibration", "noise"],
      "ageDays": 1825,
      "lastMaintenance": "2026-01-15"
    }
  }'
```

---

**Last Updated:** June 14, 2026
