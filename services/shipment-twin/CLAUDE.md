# Shipment Twin Service

**Version:** 1.0.0
**Port:** 4903
**Status:** Production Ready

## Overview

The Shipment Twin service provides comprehensive shipment tracking, logistics management, and carrier integration for the RTMN ecosystem. It tracks shipments across multiple carriers, provides real-time location updates, and manages proof of delivery.

## Features

- **Multi-Tenant Support**: Full tenant isolation with API key authentication
- **Carrier Integration**: Support for FedEx, UPS, DHL, USPS, DTDC, and custom carriers
- **Real-Time Tracking**: Location updates with full history tracking
- **Status Management**: Complete shipment lifecycle (label_created -> delivered)
- **Proof of Delivery**: Signature, photo, and OTP verification
- **Bulk Operations**: Bulk tracking updates from carrier webhooks

## API Endpoints

### Shipments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shipments` | Create a new shipment |
| GET | `/api/shipments` | List shipments (with filters) |
| GET | `/api/shipments/stats` | Get shipment statistics |
| GET | `/api/shipments/active` | Get active shipments |
| GET | `/api/shipments/:id` | Get shipment by ID |
| PATCH | `/api/shipments/:id` | Update shipment |
| POST | `/api/shipments/:id/cancel` | Cancel shipment |
| POST | `/api/shipments/:id/proof` | Add proof of delivery |
| GET | `/api/shipments/track/:trackingNumber` | Track by tracking number |

### Carriers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/carriers` | List all carriers |
| GET | `/api/carriers/active` | List active carriers |
| POST | `/api/carriers` | Create a carrier |
| GET | `/api/carriers/:code` | Get carrier by code |
| PATCH | `/api/carriers/:code` | Update carrier |
| DELETE | `/api/carriers/:code` | Deactivate carrier |
| POST | `/api/carriers/seed` | Seed default carriers |

### Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tracking/:id` | Get tracking timeline |
| GET | `/api/tracking/:id/location` | Get current location |
| POST | `/api/tracking/:id/events` | Create tracking event |
| POST | `/api/tracking/bulk` | Bulk update tracking |
| POST | `/api/tracking/subscribe/:id` | Subscribe to updates |
| GET | `/api/tracking/generate/:carrier` | Generate tracking number |

## Shipment Status Flow

```
label_created -> picked_up -> in_transit -> out_for_delivery -> delivered
                    |              |               |
                    v              v               v
                 cancelled      returned         failed
```

## Data Models

### Shipment

```typescript
{
  shipmentId: string;           // Unique ID (SHP-XXXXXXXX)
  tenantId: string;             // Tenant identifier
  orderId: string;              // Associated order
  carrier: {
    code: string;               // FEDEX, UPS, DHL, etc.
    name: string;
    trackingUrl: string;
    trackingNumber: string;
  };
  status: ShipmentStatus;       // Current status
  origin: Location;             // Origin address
  destination: Location;        // Destination address
  location: {
    current: Location;          // Current location
    history: LocationHistory[]; // Location history
  };
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  proof: {
    signature?: string;
    photo?: string;
    otp?: string;
    recipientName?: string;
    deliveredAt?: Date;
  };
  metadata: Record<string, any>;
}
```

### Carrier

```typescript
{
  code: string;                 // Unique code (e.g., FEDEX)
  name: string;
  description?: string;
  trackingUrl: string;
  apiKey?: string;
  active: boolean;
  services: CarrierService[];
}
```

### TrackingEvent

```typescript
{
  shipmentId: string;
  tenantId: string;
  carrier: string;
  trackingNumber?: string;
  status: ShipmentStatus;
  previousStatus?: ShipmentStatus;
  location: Location;
  timestamp: Date;
  description: string;
  isDelivered: boolean;
  rawData: Record<string, any>;
}
```

## Authentication

### Headers Required

```bash
# Option 1: API Key
X-API-Key: your-api-key
X-Tenant-ID: your-tenant-id

# Option 2: Bearer Token
Authorization: Bearer your-jwt-token
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Health check
curl http://localhost:4903/health
```

## Environment Variables

```bash
PORT=4903
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/shipment-twin
JWT_SECRET=your-jwt-secret
SERVICE_REGISTRY_URL=http://localhost:4399
EVENT_BUS_URL=http://localhost:4510
```

## Default Carriers

The service seeds these carriers on startup:

| Code | Name | Tracking URL |
|------|------|--------------|
| FEDEX | FedEx | https://www.fedex.com/fedextrack/ |
| UPS | United Parcel Service | https://www.ups.com/track |
| DHL | DHL Express | https://www.dhl.com/express/tracking |
| USPS | US Postal Service | https://tools.usps.com/go/TrackConfirmAction |
| DTDC | DTDC Express | https://www.dtdc.in/tracking |

## Integration Examples

### Create Shipment

```bash
curl -X POST http://localhost:4903/api/shipments \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant-123" \
  -d '{
    "tenantId": "tenant-123",
    "orderId": "ORD-001",
    "carrier": {
      "code": "FEDEX",
      "name": "FedEx"
    },
    "origin": {
      "city": "New York",
      "state": "NY",
      "country": "USA"
    },
    "destination": {
      "city": "Los Angeles",
      "state": "CA",
      "country": "USA"
    }
  }'
```

### Update Tracking Status

```bash
curl -X POST http://localhost:4903/api/tracking/SHP-XXXXXXXX/events \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant-123" \
  -d '{
    "status": "in_transit",
    "location": {
      "city": "Denver",
      "state": "CO"
    },
    "description": "Package in transit to destination"
  }'
```

### Add Proof of Delivery

```bash
curl -X POST http://localhost:4903/api/shipments/SHP-XXXXXXXX/proof \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant-123" \
  -d '{
    "signature": "base64-encoded-signature",
    "recipientName": "John Doe"
  }'
```

## Related Services

- **REZ-ecosystem-connector** (4399): Service registry
- **REZ-event-bus** (4510): Pub/sub messaging
- **REZ-graphql-federation** (4000): GraphQL API

## License

Internal RTMN Ecosystem
