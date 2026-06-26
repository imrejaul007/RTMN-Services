# Predictive Maintenance OS

**Port:** 5281  
**Status:** ✅ Built (June 26, 2026)

AI-Powered Predictive Maintenance: Equipment health monitoring, failure prediction, maintenance scheduling, and reliability engineering.

## AI Agents (4)

| Agent | Purpose |
|-------|---------|
| Failure Prediction Agent | Equipment failure prediction, remaining useful life (RUL) calculation |
| Maintenance Scheduler Agent | Work order creation, technician assignment, schedule optimization |
| Spare Parts Agent | Inventory management, usage forecasting, reorder optimization |
| Reliability Engineer Agent | MTBF/MTTR analysis, failure mode analysis, reliability reports |

## Key Features

- **Equipment Monitoring**: Real-time sensor data, health indices, degradation tracking
- **Failure Prediction**: ML-based failure forecasting, risk scoring, anomaly detection
- **Maintenance Scheduling**: Preventive/corrective maintenance, resource optimization
- **Spare Parts**: Inventory optimization, reorder points, cost management
- **Reliability Analysis**: MTBF, MTTR, failure mode analysis, root cause tracking

## Endpoints

```
POST /api/equipment                  # Register equipment
GET  /api/equipment                # List equipment
POST /api/predictions/failure     # Predict failure
GET  /api/predictions/:id/rul     # Remaining useful life
POST /api/work-orders             # Create work order
POST /api/schedule/optimize       # Optimize schedule
GET  /api/spare-parts/inventory   # Inventory status
POST /api/failures                # Log failure
```

## Start

```bash
cd industry-os/services/predictive-maintenance-os
npm start
```

## Dependencies

- express, cors, helmet, express-rate-limit
