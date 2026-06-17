# KHAIRMOVE Integration Service

**Version:** 1.0.0
**Port:** 4967
**Status:** Ready for Development

---

## Overview

KHAIRMOVE Integration connects ride-sharing, delivery, and fleet management operations to the RTMN Customer Operations ecosystem via digital twins.

```
KHAIRMOVE Operations          RTMN Twin Ecosystem
┌─────────────────┐            ┌──────────────────┐
│  Ride Service   │───────────►│  Shipment Twin    │
│  Port: 4967     │            │  (tracking)       │
└────────┬────────┘            └─────────┬──────────┘
         │                             │
┌────────▼────────┐            ┌──────▼───────────┐
│ Delivery Service │───────────►│  Order Twin       │
│                  │            │  (order sync)     │
└────────┬────────┘            └─────────┬──────────┘
         │                             │
┌────────▼────────┐            ┌──────▼───────────┐
│ Fleet Manager   │───────────►│  Customer Twin    │
│                 │            │  (profiles)      │
└─────────────────┘            └──────────────────┘
```

---

## Services Connected

| Service | Endpoint | Description |
|---------|----------|-------------|
| **Ride** | `/api/ride` | Ride booking, tracking, and management |
| **Delivery** | `/api/delivery` | Package delivery with order sync |
| **Fleet** | `/api/fleet` | Fleet operations and driver management |

---

## Twin Integrations

### Shipment Twin (Port 3013)
- Real-time ride/delivery tracking
- Location updates
- Status synchronization
- Timeline history

### Order Twin (Port 3018)
- Links deliveries to customer orders
- Order fulfillment tracking
- Delivery confirmation

### Customer Twin (Port 3017)
- Customer profiles
- Ride/delivery history
- Preferences

### Agent Twin (Port 3011)
- Driver profiles
- Karma/rating tracking
- Fleet association

---

## API Endpoints

### Ride API (`/api/ride`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/request` | Create ride request |
| POST | `/:tripId/accept` | Accept ride (driver) |
| POST | `/:tripId/status` | Update ride status |
| GET | `/:tripId` | Get ride details |
| GET | `/customer/:customerId` | Get customer rides |
| GET | `/nearby-drivers` | Find nearby drivers |
| POST | `/:tripId/rate` | Rate completed ride |

### Delivery API (`/api/delivery`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/request` | Create delivery request |
| POST | `/:tripId/assign` | Assign driver |
| POST | `/:tripId/status` | Update delivery status |
| GET | `/:tripId` | Get delivery details |
| GET | `/customer/:customerId` | Get customer deliveries |
| GET | `/driver/:driverId/active` | Get driver's active deliveries |
| POST | `/:tripId/cancel` | Cancel delivery |

### Fleet API (`/api/fleet`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new fleet |
| GET | `/:fleetId` | Get fleet details |
| POST | `/:fleetId/vehicles` | Add vehicle to fleet |
| POST | `/:fleetId/drivers` | Add driver to fleet |
| POST | `/drivers/:driverId/status` | Update driver status |
| GET | `/available` | Get available drivers |
| GET | `/:fleetId/performance` | Get fleet performance |
| POST | `/:fleetId/status` | Update fleet status |

---

## Event Bus Events

### Ride Events
- `ride.requested`
- `ride.accepted`
- `ride.picked_up`
- `ride.in_transit`
- `ride.delivered`
- `ride.cancelled`
- `ride.rated`

### Delivery Events
- `delivery.requested`
- `delivery.assigned`
- `delivery.picked_up`
- `delivery.in_transit`
- `delivery.delivered`
- `delivery.cancelled`

### Fleet Events
- `fleet.driver.status`
- `fleet.vehicle.added`
- `fleet.driver.added`

---

## Configuration

```bash
PORT=4967
NODE_ENV=development

# Twin URLs
TWINOS_HUB_URL=http://localhost:4705
SHIPMENT_TWIN_URL=http://localhost:3013
ORDER_TWIN_URL=http://localhost:3018
CUSTOMER_TWIN_URL=http://localhost:3017
AGENT_TWIN_URL=http://localhost:3011

# Event Bus
EVENT_BUS_URL=http://localhost:4510

# Logging
LOG_LEVEL=info
```

---

## Quick Start

```bash
# Install dependencies
cd services/khairmove-integration
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

---

## Health Check

```bash
curl http://localhost:4967/health
```

Response:
```json
{
  "service": "khairmove-integration",
  "status": "healthy",
  "timestamp": "2026-06-16T10:00:00.000Z",
  "port": 4967,
  "connections": {
    "shipmentTwin": "localhost:3013",
    "orderTwin": "localhost:3018",
    "customerTwin": "localhost:3017",
    "agentTwin": "localhost:3011"
  }
}
```

---

## Example: Create a Ride

```bash
curl -X POST http://localhost:4967/api/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST-001",
    "pickup": {
      "latitude": 26.8467,
      "longitude": 80.9462,
      "address": "Hazratganj",
      "city": "Lucknow"
    },
    "dropoff": {
      "latitude": 26.8523,
      "longitude": 80.9540,
      "address": "Charbagh Station",
      "city": "Lucknow"
    },
    "serviceType": "car",
    "estimatedFare": 150,
    "distance": 5.2,
    "duration": 15
  }'
```

---

## Example: Create a Delivery

```bash
curl -X POST http://localhost:4967/api/delivery/request \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST-001",
    "pickup": {
      "latitude": 26.8467,
      "longitude": 80.9462,
      "address": "Gomti Nagar",
      "city": "Lucknow"
    },
    "dropoff": {
      "latitude": 26.8121,
      "longitude": 80.9102,
      "address": "Alambagh",
      "city": "Lucknow"
    },
    "package": {
      "description": "Electronics",
      "weight": 2.5,
      "category": "parcel",
      "fragile": true,
      "value": 5000
    },
    "orderId": "ORD-12345",
    "distance": 8.0,
    "estimatedFare": 80
  }'
```

---

## Data Models

### KHAIRMOVETrip
```typescript
{
  tripId: string;
  type: 'ride' | 'delivery';
  status: 'requested' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  customerId: string;
  driverId?: string;
  pickup: KHAIRMOVECoordinates;
  dropoff: KHAIRMOVECoordinates;
  package?: KHAIRMOVEPackage;
  estimatedFare: number;
  distance: number;
  createdAt: Date;
}
```

### KHAIRMOVEFleet
```typescript
{
  fleetId: string;
  name: string;
  ownerId: string;
  vehicles: KHAIRMOVEVehicle[];
  drivers: string[];
  status: 'active' | 'inactive' | 'suspended';
  zones: string[];
}
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    KHAIRMOVE Integration                      │
│                         Port: 4967                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Ride Routes │  │Delivery    │  │ Fleet Routes        │  │
│  │             │  │ Routes     │  │                     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│  ┌──────▼────────────────▼─────────────────────▼──────────┐ │
│  │              CustomerOpsBridge                          │ │
│  │  - linkToCustomerTwin()                                 │ │
│  │  - linkToOrderTwin()                                    │ │
│  │  - linkToAgentTwin()                                    │ │
│  │  - publishRide/DeliveryEvent()                          │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                 │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │                 ShipmentSync                             │ │
│  │  - createShipmentForRide()                              │ │
│  │  - createShipmentForDelivery()                           │ │
│  │  - updateShipment()                                      │ │
│  │  - trackShipment()                                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
    ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
    │  Shipment   │    │   Order     │    │  Customer    │
    │  Twin       │    │   Twin      │    │  Twin        │
    │  :3013      │    │   :3018     │    │  :3017       │
    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal error |

---

*Last Updated: June 16, 2026*
*KHAIRMOVE Integration - Ride, Delivery, Fleet connected to RTMN*
