# Order Twin Service

**Version:** 1.0.0
**Port:** 4900
**Status:** Active

---

## Overview

Order Twin manages the complete order lifecycle including items, shipping, delivery, tracking, and relationships to customer, product, and payment. It supports multi-tenant architecture with full CRUD operations, status management, and comprehensive analytics.

---

## API Endpoints

### Health Check
```
GET /health - Service health status
```

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders with filters |
| GET | `/api/orders/:orderId` | Get single order |
| POST | `/api/orders` | Create new order |
| PUT | `/api/orders/:orderId` | Update order |
| PATCH | `/api/orders/:orderId/status` | Update order status |
| PATCH | `/api/orders/:orderId/tracking` | Update tracking info |
| DELETE | `/api/orders/:orderId` | Cancel order |
| GET | `/api/orders/customer/:customerId` | Get customer orders |

### Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tracking` | List tracking records |
| GET | `/api/tracking/:trackingId` | Get tracking record |
| GET | `/api/tracking/by-order/:orderId` | Get tracking by order |
| GET | `/api/tracking/by-number/:carrier/:trackingNumber` | Get by tracking number |
| POST | `/api/tracking` | Create tracking record |
| POST | `/api/tracking/:trackingId/events` | Add tracking event |
| POST | `/api/tracking/:trackingId/sync` | Sync with carrier API |
| PATCH | `/api/tracking/:trackingId` | Update tracking |
| DELETE | `/api/tracking/:trackingId` | Deactivate tracking |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Analytics overview |
| GET | `/api/analytics/orders` | Order metrics |
| GET | `/api/analytics/revenue` | Revenue analytics |
| GET | `/api/analytics/customers` | Customer analytics |
| GET | `/api/analytics/products` | Product analytics |
| GET | `/api/analytics/trends` | Order trends |
| GET | `/api/analytics/status` | Status distribution |
| GET | `/api/analytics/aov` | Average order value |

---

## Order Status Flow

```
pending -> confirmed -> processing -> shipped -> delivered
    |          |            |           |
    v          v            v           v
cancelled   cancelled    cancelled   returned -> refunded
```

---

## Order Schema

```typescript
interface Order {
  orderId: string;           // Unique order ID (ORD-XXXXXXXX)
  tenantId: string;          // Multi-tenant identifier
  customerId: string;        // Customer reference
  items: OrderItem[];        // Line items
  pricing: Pricing;          // Price breakdown
  status: OrderStatus;       // Current status
  shipping: Shipping;        // Shipping details
  paymentId?: string;        // Payment reference
  paymentMethod?: string;    // Payment method
  paymentStatus: PaymentStatus;
  notes?: string;
  internalNotes?: string;
  timeline: TimelineEvent[]; // Status history
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  sku?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

interface Pricing {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}

interface Shipping {
  address: ShippingAddress;
  method: 'standard' | 'express' | 'overnight' | 'same_day' | 'pickup';
  carrier?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  cost: number;
}

interface TimelineEvent {
  status: string;
  timestamp: Date;
  note?: string;
  updatedBy?: string;
  location?: string;
}
```

---

## Usage Examples

### Create Order
```bash
curl -X POST http://localhost:4900/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-001",
    "customerId": "cust-123",
    "items": [
      {
        "productId": "prod-001",
        "name": "Widget Pro",
        "quantity": 2,
        "price": 29.99,
        "discount": 5.00
      }
    ],
    "shipping": {
      "address": {
        "fullName": "John Doe",
        "addressLine1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "US"
      },
      "method": "standard"
    },
    "taxRate": 0.08,
    "shippingCost": 5.99
  }'
```

### Update Order Status
```bash
curl -X PATCH http://localhost:4900/api/orders/ORD-ABC12345/status \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-001" \
  -d '{
    "status": "shipped",
    "note": "Package shipped via FedEx",
    "updatedBy": "warehouse-staff-01",
    "location": "Warehouse A"
  }'
```

### Add Tracking Event
```bash
curl -X POST http://localhost:4900/api/tracking/TRK-ABC12345/events \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-001" \
  -d '{
    "status": "delivered",
    "description": "Package delivered to recipient",
    "location": "Front door"
  }'
```

### Get Analytics
```bash
curl http://localhost:4900/api/analytics/overview?startDate=2024-01-01 \
  -H "x-tenant-id: tenant-001"
```

---

## Multi-Tenant Support

All endpoints support multi-tenancy via the `x-tenant-id` header:

```bash
-H "x-tenant-id: your-tenant-id"
```

Or include `tenantId` in the request body for POST requests.

---

## Query Parameters

### Orders List
- `tenantId` - Filter by tenant
- `customerId` - Filter by customer
- `status` - Filter by status
- `startDate` - Filter by creation date (start)
- `endDate` - Filter by creation date (end)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - Sort order (asc/desc)

### Analytics
- `startDate` - Start date for metrics
- `endDate` - End date for metrics
- `granularity` - Time granularity (hour/day/week/month)
- `limit` - Result limit for top-N queries

---

## Environment Variables

```bash
PORT=4900
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/order-twin
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Installation

```bash
cd services/order-twin
npm install
npm run build
npm start
```

Or for development:
```bash
npm run dev
```

---

## Dependencies

- express: Web framework
- mongoose: MongoDB ODM
- cors: Cross-origin resource sharing
- helmet: Security headers
- zod: Schema validation
- uuid: Unique ID generation
- winston: Logging

---

*Last Updated: June 2026*
