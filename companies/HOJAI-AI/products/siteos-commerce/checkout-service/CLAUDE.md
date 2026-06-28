# Checkout Service - HOJAI SiteOS

> REST API microservice for managing checkout and orders in HOJAI SiteOS.

**Port:** 5478
**Package:** `@hojai/checkout-service`

## Quick Start

```bash
# Install dependencies
npm install

# Start service
npm start

# Run tests
npm test
```

## Architecture

```
checkout-service/
├── src/
│   ├── index.js              # Main Express app with all routes
│   ├── middleware/
│   │   └── requireAuth.js    # API key authentication
│   ├── services/
│   │   └── orderService.js   # JSON file persistence
│   └── utils/
│       ├── orderNumberGenerator.js  # Order number generation
│       ├── orderStateMachine.js     # Order state transitions
│       └── validators.js            # Input validation
├── __tests__/unit/
│   └── checkout-service.test.js
├── vitest.config.js
└── package.json
```

## API Endpoints

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "checkout-service",
  "port": 5478
}
```

---

### POST /api/checkout/initiate

Start checkout - validate cart and create session.

**Headers:**
```
X-API-Key: your-api-key
Content-Type: application/json
```

**Request:**
```json
{
  "companyId": "company_123",
  "customerId": "customer_456",
  "sessionId": "optional-session-id",
  "items": [
    {
      "productId": "prod_001",
      "name": "Product Name",
      "price": 999.00,
      "quantity": 2,
      "image": "https://example.com/image.jpg"
    }
  ],
  "couponCode": "SAVE10"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-v4",
    "companyId": "company_123",
    "customerId": "customer_456",
    "items": [...],
    "subtotal": 1998.00,
    "shippingCost": 0,
    "tax": 359.64,
    "discount": 0,
    "total": 2357.64,
    "status": "initiated"
  },
  "message": "Checkout initiated successfully"
}
```

---

### POST /api/checkout/address

Save shipping and billing address.

**Request:**
```json
{
  "sessionId": "uuid-v4",
  "shippingAddress": {
    "name": "John Doe",
    "phone": "+91 9876543210",
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "billingAddress": {
    "name": "John Doe",
    "phone": "+91 9876543210",
    "line1": "456 Billing Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400002",
    "country": "India"
  },
  "useSameAddress": false
}
```

---

### POST /api/checkout/shipping

Select shipping method.

**Request:**
```json
{
  "sessionId": "uuid-v4",
  "shippingMethod": "standard"
}
```

**Valid Methods:** `standard` (₹50), `express` (₹150), `pickup` (free)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-v4",
    "shippingMethod": "standard",
    "shippingCost": 50,
    "subtotal": 1998.00,
    "total": 2407.64
  }
}
```

---

### POST /api/checkout/payment

Get payment options or initiate payment.

**Without paymentMethod (get options):**
```json
{
  "sessionId": "uuid-v4"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-v4",
    "total": 2407.64,
    "paymentOptions": [
      { "id": "razorpay", "name": "Razorpay" },
      { "id": "upi", "name": "UPI" },
      { "id": "card", "name": "Credit/Debit Card" },
      { "id": "wallet", "name": "Wallet" }
    ]
  }
}
```

**With paymentMethod (initiate payment):**
```json
{
  "sessionId": "uuid-v4",
  "paymentMethod": "razorpay"
}
```

---

### POST /api/checkout/confirm

Confirm and create order.

**Request:**
```json
{
  "sessionId": "uuid-v4",
  "paymentId": "pay_abc123",
  "paymentStatus": "paid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid-v4",
    "orderNumber": "HOJAI-20260628-123456",
    "companyId": "company_123",
    "customerId": "customer_456",
    "items": [...],
    "subtotal": 1998.00,
    "shippingCost": 50.00,
    "tax": 368.64,
    "discount": 0,
    "total": 2416.64,
    "paymentMethod": "razorpay",
    "paymentStatus": "paid",
    "orderStatus": "confirmed",
    "createdAt": "2026-06-28T10:30:00.000Z"
  },
  "message": "Order confirmed successfully"
}
```

---

### GET /api/orders/:orderId

Get order details.

**Query Parameters:**
- `companyId` (required): Company identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid-v4",
    "orderNumber": "HOJAI-20260628-123456",
    "companyId": "company_123",
    "customerId": "customer_456",
    "items": [...],
    "total": 2416.64,
    "orderStatus": "confirmed",
    "paymentStatus": "paid",
    ...
  }
}
```

---

### GET /api/orders

List orders (admin only).

**Headers:**
```
X-API-Key: admin_api-key
```

**Query Parameters:**
- `companyId` (required): Company identifier
- `customerId` (optional): Filter by customer
- `status` (optional): Filter by order status
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page

**Valid Status Values:** `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`

---

### POST /api/orders/:orderId/cancel

Cancel an order.

**Request:**
```json
{
  "companyId": "company_123",
  "reason": "Customer requested cancellation"
}
```

**Note:** Orders can only be cancelled if they are in `pending`, `confirmed`, or `processing` status.

---

## Order Schema

```javascript
{
  orderId: string (UUID),
  orderNumber: string (HOJAI-YYYYMMDD-XXXXXX),
  companyId: string,
  customerId: string,
  sessionId: string,
  items: [{
    productId: string,
    name: string,
    price: number,
    quantity: number,
    image: string
  }],
  subtotal: number,
  shippingCost: number,
  tax: number,
  discount: number,
  total: number,
  shippingAddress: {
    name: string,
    phone: string,
    line1: string,
    line2: string,
    city: string,
    state: string,
    pincode: string,
    country: string
  },
  billingAddress: { ... },
  shippingMethod: 'standard' | 'express' | 'pickup',
  paymentMethod: 'razorpay' | 'upi' | 'card' | 'wallet',
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  couponCode: string,
  notes: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Order State Machine

```
pending ──► confirmed ──► processing ──► shipped ──► delivered
   │              │             │
   └──────────────┴─────────────┴───► cancelled
```

**Valid Transitions:**
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `processing`, `cancelled`
- `processing` → `shipped`, `cancelled`
- `shipped` → `delivered`, `cancelled`
- `delivered` → (terminal)
- `cancelled` → (terminal)

## Data Persistence

Orders are persisted to JSON files:
```
/tmp/siteos-orders-{companyId}.json
```

## Authentication

All endpoints require API key authentication via `X-API-Key` header.

**Admin endpoints** (`GET /api/orders`, `PATCH /api/orders/:orderId/status`) require admin API key (prefixed with `admin_` or `sk_live_admin`).

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "errors": ["Additional error details"]  // optional
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5478 | Server port |
| NODE_ENV | development | Environment mode |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Integration with SiteOS

This service is designed to work with other SiteOS services:
- **Cart Service**: Consumed by `/api/checkout/initiate`
- **Payment Gateway**: Integrated via `/api/checkout/payment`
- **Order Service**: Core order management
- **Notification Service**: Can be added for order updates