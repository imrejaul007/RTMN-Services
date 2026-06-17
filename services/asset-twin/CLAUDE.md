# Asset Twin Service

**Version:** 1.0.0  
**Port:** 4890  
**Status:** Ready for Development

---

## Overview

Asset Twin is a comprehensive asset management service that tracks equipment and assets with warranty, AMC (Annual Maintenance Contract), maintenance history, IoT status monitoring, and performance metrics.

## Features

### Core Capabilities

- **Multi-tenant support** via `x-tenant-id` header
- **Asset types:** machine, vehicle, device, equipment
- **Asset categories:** electronics, machinery, vehicles, furniture, it_hardware, office_equipment, plant_equipment, other
- **Health score calculation** based on uptime, MTBF, MTTR, and maintenance trends
- **Warranty tracking** with expiration alerts
- **AMC management** with service schedules and SLA tracking
- **Maintenance history** with work details and costs
- **IoT integration** for real-time monitoring
- **Warranty claims tracking**

### Health Score Calculation

The health score (0-100) is calculated using:
- **Uptime percentage** (40% weight without IoT, 35% with)
- **Reliability score** based on MTBF/MTTR (30% weight without IoT, 25% with)
- **Maintenance score** based on trend (30% weight without IoT, 20% with)
- **IoT score** based on sensor metrics (20% weight)

Health Status:
- Excellent: 90-100
- Good: 75-89
- Fair: 50-74
- Poor: 25-49
- Critical: 0-24

## Quick Start

```bash
# Install dependencies
cd services/asset-twin
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
PORT=4890
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/asset-twin
JWT_SECRET=your-jwt-secret-here
LOG_LEVEL=info
```

## API Endpoints

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List all assets |
| GET | `/api/assets/:id` | Get single asset |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |
| GET | `/api/assets/:id/health` | Get health score |
| PATCH | `/api/assets/:id/metrics` | Update metrics |
| GET | `/api/assets/stats/summary` | Get statistics |

### Maintenance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/maintenance` | List maintenance records |
| GET | `/api/maintenance/:id` | Get single record |
| POST | `/api/maintenance` | Create maintenance record |
| PUT | `/api/maintenance/:id` | Update record |
| DELETE | `/api/maintenance/:id` | Delete record |
| GET | `/api/maintenance/scheduled/upcoming` | Get upcoming maintenance |
| GET | `/api/maintenance/stats/:assetId` | Get statistics |

### IoT

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/iot` | List IoT devices |
| GET | `/api/iot/:id` | Get single device |
| GET | `/api/iot/asset/:assetId` | Get by asset |
| POST | `/api/iot` | Register device |
| PUT | `/api/iot/:id` | Update device |
| POST | `/api/iot/:id/metrics` | Update metrics |
| POST | `/api/iot/:id/alerts` | Update alerts |
| GET | `/api/iot/alerts/active` | Get active alerts |
| DELETE | `/api/iot/:id` | Unregister device |

### Warranty Claims

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/claims` | List claims |
| GET | `/api/claims/:id` | Get single claim |
| POST | `/api/claims` | Create claim |
| PUT | `/api/claims/:id` | Update claim |
| DELETE | `/api/claims/:id` | Delete claim |
| POST | `/api/claims/:id/submit` | Submit claim |
| POST | `/api/claims/:id/approve` | Approve claim |
| POST | `/api/claims/:id/reject` | Reject claim |

### Warranties

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warranties` | List warranties |
| GET | `/api/warranties/expiring` | Get expiring warranties |
| GET | `/api/warranties/:id` | Get single warranty |
| GET | `/api/warranties/asset/:assetId` | Get by asset |
| POST | `/api/warranties` | Create warranty |
| PUT | `/api/warranties/:id` | Update warranty |
| POST | `/api/warranties/:id/extend` | Extend warranty |
| DELETE | `/api/warranties/:id` | Delete warranty |

### AMC

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/amc` | List AMCs |
| GET | `/api/amc/expiring` | Get expiring AMCs |
| GET | `/api/amc/:id` | Get single AMC |
| GET | `/api/amc/asset/:assetId` | Get by asset |
| POST | `/api/amc` | Create AMC |
| PUT | `/api/amc/:id` | Update AMC |
| POST | `/api/amc/:id/renew` | Renew AMC |
| POST | `/api/amc/:id/cancel` | Cancel AMC |
| DELETE | `/api/amc/:id` | Delete AMC |

## Health Check

```
GET /health
```

Returns:
```json
{
  "service": "asset-twin",
  "status": "running",
  "version": "1.0.0",
  "timestamp": "2026-06-16T00:00:00.000Z",
  "mongodb": "connected",
  "uptime": 1234.56
}
```

## Multi-Tenant Headers

All API requests should include:
```
x-tenant-id: your-tenant-id
```

Optional headers:
```
x-user-id: user-id-for-audit
```

## Example Requests

### Create Asset

```bash
curl -X POST http://localhost:4890/api/assets \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-001" \
  -d '{
    "name": "CNC Machine XYZ",
    "assetType": "machine",
    "category": "machinery",
    "manufacturer": "ABC Corp",
    "serialNumber": "SN-12345",
    "purchaseInfo": {
      "purchaseDate": "2024-01-15",
      "purchaseCost": 50000,
      "vendor": "ABC Industrial"
    }
  }'
```

### Get Health Score

```bash
curl http://localhost:4890/api/assets/{id}/health \
  -H "x-tenant-id: tenant-001"
```

### Update IoT Metrics

```bash
curl -X POST http://localhost:4890/api/iot/{id}/metrics \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-001" \
  -d '{
    "connectionStatus": "online",
    "metrics": {
      "temperature": 45.5,
      "humidity": 60
    },
    "operational": {
      "runningHours": 1500,
      "efficiency": 92
    }
  }'
```

## Models

### Asset
- Multi-tenant support
- Asset types: machine, vehicle, device, equipment
- Status tracking: active, inactive, maintenance, decommissioned, sold
- Performance metrics: uptime, downtime, MTBF, MTTR

### Warranty
- Warranty types: full, limited, extended, manufacturer, third_party
- Coverage details and provider info
- Expiration alerts

### AMC
- AMC types: comprehensive, non_comprehensive, annual, quarterly, monthly
- Service frequency and included services
- SLA tracking

### Maintenance
- Maintenance types: preventive, corrective, predictive, inspective, emergency
- Work details, parts used, labor hours
- Cost tracking

### IoTStatus
- Connection status monitoring
- Core metrics: temperature, humidity, pressure, voltage, etc.
- Operational metrics: running hours, efficiency, utilization
- Threshold-based alerts

### Claim
- Claim types: warranty, amc, insurance, damage, defect, malfunction
- Status workflow: draft, submitted, under_review, approved, rejected, completed
- Resolution tracking

## Dependencies

- express: ^4.18.2
- mongoose: ^8.0.3
- cors: ^2.8.5
- helmet: ^7.1.0
- zod: ^3.22.4
- uuid: ^9.0.1
- winston: ^3.11.0

## License

Internal use - RTMN Ecosystem
