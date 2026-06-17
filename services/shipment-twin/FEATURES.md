# Shipment Twin - Feature Documentation

## Core Features

### 1. Shipment Management
- Create shipments with origin, destination, and carrier information
- Track shipment lifecycle from label creation to delivery
- Cancel shipments (only in early stages)
- Bulk shipment operations

### 2. Carrier Integration
- **Supported Carriers**: FedEx, UPS, DHL, USPS, DTDC
- **Custom Carriers**: Add your own carrier with tracking URL
- **Services**: Define carrier services (ground, express, overnight)
- **API Key Management**: Secure carrier API credentials

### 3. Real-Time Tracking
- **Location Updates**: Record current location with full history
- **Status Transitions**: Validated status flow
- **Timeline View**: Complete event timeline
- **Bulk Updates**: Process carrier webhook updates

### 4. Proof of Delivery
- **Signature Capture**: Base64 encoded signature images
- **Photo Proof**: Photo attachment support
- **OTP Verification**: One-time password confirmation
- **Recipient Details**: Name and timestamp

### 5. Multi-Tenant Architecture
- **Tenant Isolation**: All data scoped to tenant
- **API Key Authentication**: Service-to-service auth
- **JWT Support**: Bearer token authentication
- **Tenant Statistics**: Per-tenant analytics

## API Capabilities

### Shipment Operations
| Feature | Description |
|---------|-------------|
| Create Shipment | Create with carrier, origin, destination |
| List Shipments | Paginated with filters (status, orderId) |
| Get Shipment | Retrieve by shipmentId |
| Update Shipment | Modify location, status, metadata |
| Cancel Shipment | Cancel before delivery |
| Track by Number | Find by carrier tracking number |
| Get Statistics | Count by status |
| Get Active | All non-delivered shipments |

### Carrier Operations
| Feature | Description |
|---------|-------------|
| Create Carrier | Add new carrier with services |
| List Carriers | All or active only |
| Get Carrier | Retrieve by code |
| Update Carrier | Modify carrier details |
| Deactivate Carrier | Soft delete |
| Seed Defaults | Initialize default carriers |

### Tracking Operations
| Feature | Description |
|---------|-------------|
| Get Timeline | Full tracking history |
| Get Location | Current location only |
| Create Event | Add new tracking event |
| Bulk Update | Process multiple events |
| Subscribe | Real-time update subscription |
| Generate Number | Create tracking number |

## Status Lifecycle

```
┌──────────────┐     ┌──────────┐     ┌───────────┐     ┌──────────────────┐
│ label_created│────►│ picked_up│────►│ in_transit│────►│ out_for_delivery │
└──────────────┘     └──────────┘     └───────────┘     └────────┬─────────┘
      │                   │                 │                     │
      │                   v                 v                     v
      │              ┌──────────┐     ┌──────────┐         ┌───────────┐
      │              │ cancelled│     │ returned │         │ delivered│
      └─────────────►└──────────┘     └──────────┘         └───────────┘
                          │                 │                     │
                          │                 v                     │
                          │            ┌────────┐                │
                          └───────────►│ failed │◄───────────────┘
                                       └────────┘
```

## Data Models

### Shipment Schema
```javascript
{
  shipmentId: String,          // SHP-XXXXXXXX
  tenantId: String,            // Required
  orderId: String,            // Required
  carrier: {
    code: String,              // FEDEX, UPS, etc.
    name: String,
    trackingUrl: String,
    trackingNumber: String
  },
  status: String,              // enum: [8 statuses]
  origin: Location,
  destination: Location,
  location: {
    current: Location,
    history: [LocationHistory]
  },
  estimatedDelivery: Date,
  actualDelivery: Date,
  proof: {
    signature: String,
    photo: String,
    otp: String,
    recipientName: String,
    deliveredAt: Date
  },
  metadata: Mixed
}
```

### Location Schema
```javascript
{
  address: String,
  city: String,
  state: String,
  country: String,
  postalCode: String,
  coordinates: {
    lat: Number,
    lng: Number
  }
}
```

## Usage Examples

### Creating a Shipment
```javascript
POST /api/shipments
{
  tenantId: "tenant-123",
  orderId: "ORD-001",
  carrier: {
    code: "FEDEX",
    name: "FedEx Express"
  },
  origin: {
    address: "123 Main St",
    city: "New York",
    state: "NY",
    country: "USA",
    postalCode: "10001"
  },
  destination: {
    address: "456 Oak Ave",
    city: "Los Angeles",
    state: "CA",
    country: "USA",
    postalCode: "90001"
  },
  weight: 2.5,
  estimatedDelivery: "2024-01-15T00:00:00Z"
}
```

### Adding Tracking Event
```javascript
POST /api/tracking/SHP-12345678/events
{
  status: "in_transit",
  location: {
    city: "Denver",
    state: "CO",
    coordinates: { lat: 39.7392, lng: -104.9903 }
  },
  description: "Package departed from Denver hub"
}
```

### Proof of Delivery
```javascript
POST /api/shipments/SHP-12345678/proof
{
  signature: "data:image/png;base64,...",
  recipientName: "John Smith",
  otp: "123456"
}
```

## Query Parameters

### List Shipments
```
GET /api/shipments?status=in_transit&orderId=ORD-001&skip=0&limit=20
```

### Get Statistics
```
GET /api/shipments/stats
```

Response:
```javascript
{
  label_created: 10,
  picked_up: 5,
  in_transit: 25,
  out_for_delivery: 8,
  delivered: 150,
  returned: 3,
  failed: 2,
  cancelled: 1,
  total: 204
}
```

## Error Handling

All errors return consistent format:
```javascript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human readable message"
  }
}
```

Error codes:
- `NOT_FOUND` - Resource not found (404)
- `VALIDATION_ERROR` - Invalid input (400)
- `UNAUTHORIZED` - Authentication failed (401)
- `CONFLICT` - Duplicate resource (409)
- `INTERNAL_ERROR` - Server error (500)
