# Maintenance Agent - Features

**Company:** HOJAI AI
**Employee Type:** L2 Specialist
**Industry:** Facilities/Maintenance
**Port:** 4849
**Status:** ✅ Connected & Working

---

## Core Features

### 1. Work Order Management
- [x] Create maintenance requests
- [x] Priority levels (emergency, high, medium, low)
- [x] Status tracking (pending, assigned, in_progress, completed, cancelled)
- [x] Assign technicians
- [x] Schedule maintenance
- [x] Cost tracking
- [x] Add notes
- [x] Work order history

### 2. Predictive Maintenance
- [x] Equipment health monitoring
- [x] Failure probability prediction
- [x] Risk assessment (low, medium, high)
- [x] Days until failure estimation
- [x] Maintenance recommendations
- [x] Warning sign detection
- [x] Age-based risk adjustment
- [x] Maintenance history analysis

### 3. Vendor Management
- [x] Vendor directory
- [x] Category-based vendor matching
- [x] Vendor assignment to work orders
- [x] Create/manage vendors
- [x] Vendor rating system
- [x] Trust score evaluation

### 4. Proactive Parts Ordering
- [x] Auto-order parts for high-risk equipment
- [x] Integration with Nexha Procurement
- [x] RFQ creation
- [x] Emergency ordering
- [x] Multi-supplier comparison
- [x] Price negotiation

### 5. Equipment Types Supported

| Type | Base Failure Rate | Avg Lifetime | Warning Signs |
|------|-----------------|--------------|--------------|
| AC | 2% | 10 years | vibration, temperature_spike, noise |
| Elevator | 0.5% | 20 years | jerk, speed_variation, door_issue |
| Plumbing | 1% | 5 years | pressure_drop, leak, color_change |
| Electrical | 0.8% | 7 years | flicker, heat, spark |
| Kitchen | 1.5% | 3 years | inconsistent_temp, noise, slow_response |

---

## Service Connections

| Service | Port | Protocol | Status |
|---------|------|----------|--------|
| REZ Maintenance | 4831 | HTTP | ✅ Connected |
| Nexha Procurement | 4320 | HTTP | ✅ Connected |
| HOJAI Memory | 4520 | HTTP | ✅ Connected |

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

## Prediction Algorithm

1. **Base failure rate** from equipment type
2. **Age adjustment** (days / avgLifetime)
3. **Warning signs** (× 1.3 per matched sign)
4. **Maintenance history** (> 90 days → × 1.5)
5. **Risk level** (low < 3%, medium < 10%, high ≥ 10%)

---

## Auto-Actions

| Risk Level | Action |
|------------|--------|
| High | Auto-order parts via Nexha Procurement |
| High | Add prediction notes to work orders |
| High | Flag for immediate inspection |
| Medium | Schedule maintenance within 7 days |
| Low | Add to next maintenance schedule |

---

## Story Coverage

| Chapter | Description | Status |
|---------|------------|--------|
| Ch 14 | AC vibration → Predictive analysis → Parts ordered | ✅ Working |

---

**Last Updated:** June 14, 2026
