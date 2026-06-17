# Nexha Integration Service

**Version:** 1.0.0
**Port:** 4966
**Status:** Ready for Development

---

## Overview

Nexha Integration Service connects Nexha Commerce (Procurement & Distribution) to the RTMN ecosystem, specifically integrating with:
- **Order Twin** (3018) - Order synchronization
- **Payment Twin** (3020) - Payment tracking
- **Asset Twin** (3015) - Warehouse/Asset management

## Quick Start

```bash
# Install dependencies
cd services/nexha-integration
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## API Endpoints

### Health & Info
- `GET /health` - Service health check
- `GET /api/info` - Service information

### Procurement
- `GET /api/procurement` - List all procurement orders
- `GET /api/procurement/:id` - Get procurement order by ID
- `POST /api/procurement` - Create procurement order
- `PUT /api/procurement/:id` - Update procurement order
- `PATCH /api/procurement/:id/status` - Update order status
- `POST /api/procurement/:id/approve` - Approve order
- `GET /api/procurement/supplier/:supplierId` - Get orders by supplier
- `GET /api/procurement/status/:status` - Get orders by status
- `GET /api/procurement/analytics/summary` - Get procurement analytics

### Distribution
- `GET /api/distribution` - List all distribution orders
- `GET /api/distribution/:id` - Get distribution order by ID
- `POST /api/distribution` - Create distribution order
- `PUT /api/distribution/:id` - Update distribution order
- `PATCH /api/distribution/:id/status` - Update order status
- `GET /api/distribution/warehouse/:warehouseId` - Get orders by warehouse
- `GET /api/distribution/channel/:channelId` - Get orders by channel
- `GET /api/distribution/warehouses/all` - List all warehouses
- `GET /api/distribution/warehouses/:id` - Get warehouse by ID
- `POST /api/distribution/warehouses` - Create warehouse
- `PUT /api/distribution/warehouses/:id` - Update warehouse
- `PATCH /api/distribution/warehouses/:id/utilization` - Update utilization
- `GET /api/distribution/channels/all` - List all channels
- `GET /api/distribution/analytics/summary` - Get distribution analytics

### Suppliers
- `GET /api/suppliers` - List all suppliers
- `GET /api/suppliers/:id` - Get supplier by ID
- `POST /api/suppliers` - Create new supplier
- `PUT /api/suppliers/:id` - Update supplier
- `PATCH /api/suppliers/:id/status` - Update supplier status
- `POST /api/suppliers/:id/contacts` - Add supplier contact
- `POST /api/suppliers/:id/certifications` - Add certification
- `PATCH /api/suppliers/:id/rating` - Update supplier rating
- `GET /api/suppliers/category/:category` - Get suppliers by category
- `GET /api/suppliers/analytics/summary` - Get supplier analytics
- `DELETE /api/suppliers/:id` - Delete supplier

## Environment Variables

```env
PORT=4966
NODE_ENV=development

# Twin Service URLs
ORDER_TWIN_URL=http://localhost:3018
PAYMENT_TWIN_URL=http://localhost:3020
ASSET_TWIN_URL=http://localhost:3015
EVENT_BUS_URL=http://localhost:4510
ECOSYSTEM_CONNECTOR_URL=http://localhost:4399

# Authentication
SERVICE_API_KEY=your-api-key
JWT_SECRET=your-jwt-secret

# Sync Configuration
SYNC_INTERVAL_MS=30000
MAX_RETRY_ATTEMPTS=3
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Nexha Integration (4966)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Procurement  │  │ Distribution │  │  Suppliers   │      │
│  │   Routes     │  │   Routes     │  │   Routes     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│  ┌──────▼─────────────────▼──────────────────▼───────┐      │
│  │              CustomerOpsBridge                    │      │
│  │         Twin Connections & Event Bus              │      │
│  └──────┬─────────────────┬─────────────────┬───────┘      │
│         │                 │                 │               │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
    ┌─────▼─────┐    ┌──────▼──────┐   ┌──────▼──────┐
    │Order Twin │    │Payment Twin │   │ Asset Twin  │
    │  (3018)   │    │  (3020)    │   │  (3015)     │
    └───────────┘    └────────────┘   └─────────────┘
```

## Twin Integration

### Order Twin (3018)
- Syncs procurement and distribution orders
- Maps order statuses to standard format
- Tracks order lifecycle events

### Payment Twin (3020)
- Receives payment events from procurement
- Tracks payment status and reconciliation

### Asset Twin (3015)
- Syncs warehouse data
- Tracks capacity and utilization
- Manages asset metadata

### Event Bus (4510)
- Publishes domain events (order.created, order.status_changed, etc.)
- Enables event-driven workflows

## Data Models

### Procurement Order
```typescript
{
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'pending' | 'approved' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  lineItems: {
    productId: string;
    productSku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  currency: string;
  shippingAddress: Address;
  expectedDeliveryDate?: Date;
}
```

### Distribution Order
```typescript
{
  orderNumber: string;
  sourceWarehouseId: string;
  destinationAddress: Address;
  channel: {
    id: string;
    name: string;
    type: 'retail' | 'wholesale' | 'online' | 'direct';
  };
  items: {
    productId: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
  }[];
  status: 'pending' | 'processing' | 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'failed';
  trackingNumber?: string;
  carrier?: string;
}
```

### Supplier
```typescript
{
  companyName: string;
  email: string;
  phone: string;
  address: Address;
  categories: string[];
  certifications: {
    type: string;
    issuer: string;
    issuedDate: Date;
    expiryDate: Date;
  }[];
  rating: {
    average: number;
    totalReviews: number;
    deliveryRating: number;
    qualityRating: number;
    communicationRating: number;
  };
  paymentTerms: string;
  minimumOrderValue: number;
  leadTimeDays: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
}
```

## Sync Behavior

### Order Sync
- Orders are automatically synced to Order Twin on creation/update
- Failed syncs are queued for retry
- Sync loop runs every 30 seconds (configurable)
- Status changes trigger twin updates

### Twin Status Mapping

| Nexha Status | Order Twin Status |
|--------------|-------------------|
| draft | draft |
| pending | pending |
| approved | confirmed |
| confirmed | confirmed |
| shipped | shipped |
| delivered | delivered |
| cancelled | cancelled |

## Logging

The service uses Winston for structured logging:
- Request/response logging
- Error tracking with stack traces
- Twin sync events
- Health check results

Log levels: error, warn, info, debug

## Testing

```bash
# Health check
curl http://localhost:4966/health

# Create procurement order
curl -X POST http://localhost:4966/api/procurement \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "sup-001",
    "supplierName": "Fresh Farms India",
    "lineItems": [
      { "productId": "prod-001", "productName": "Organic Rice", "quantity": 100, "unitPrice": 50 }
    ]
  }'

# Create distribution order
curl -X POST http://localhost:4966/api/distribution \
  -H "Content-Type: application/json" \
  -d '{
    "sourceWarehouseId": "wh-001",
    "destinationAddress": { "city": "Delhi", "state": "Delhi", "country": "India" },
    "items": [
      { "productId": "prod-001", "productName": "Organic Rice", "quantity": 50, "unitPrice": 55 }
    ]
  }'

# Create supplier
curl -X POST http://localhost:4966/api/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Supplier",
    "email": "test@supplier.com",
    "phone": "+91-9876543210",
    "categories": ["Electronics"]
  }'
```

## File Structure

```
nexha-integration/
├── package.json
├── tsconfig.json
├── .env.example
├── CLAUDE.md
└── src/
    ├── index.ts              # Express server entry point
    ├── models/
    │   └── NexhaProfile.ts   # Data models & factory functions
    ├── routes/
    │   ├── procurement.ts   # Procurement API routes
    │   ├── distribution.ts   # Distribution & warehouse routes
    │   └── supplier.ts       # Supplier management routes
    └── services/
        ├── customerOpsBridge.ts  # Twin connection service
        └── orderSync.ts          # Order synchronization service
```

## Dependencies

- **express** - HTTP server framework
- **cors** - Cross-origin resource sharing
- **helmet** - Security headers
- **winston** - Logging
- **axios** - HTTP client for twin communication
- **uuid** - Unique ID generation

---

*Last Updated: June 16, 2026*
*RTMN-Services - Nexha Commerce Integration*
