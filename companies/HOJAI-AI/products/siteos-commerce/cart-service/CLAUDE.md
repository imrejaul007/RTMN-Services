# SiteOS Cart Service - Documentation

> Shopping Cart Management microservice for HOJAI SiteOS

**Port:** 5477
**Type:** REST API Microservice
**Storage:** JSON file persistence (`/tmp/siteos-carts-{companyId}.json`)
**TTL:** 24 hours

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/siteos-commerce/cart-service
npm install
npm start
```

## API Endpoints

### Health Check

```
GET /health
```

Returns service health status.

**Response:**
```json
{
  "status": "ok",
  "service": "cart-service",
  "port": 5477
}
```

### Get Cart

```
GET /api/cart/:sessionId
```

Retrieve a cart by session ID.

**Headers:**
- `X-API-Key` (required): API key for authentication
- `X-Company-Id` (optional): Company identifier, defaults to 'default'

**Response:**
```json
{
  "sessionId": "sess_abc123",
  "companyId": "company_xyz",
  "customerId": "customer_123",
  "items": [
    {
      "id": "uuid-1234",
      "productId": "prod_001",
      "variantId": "var_001",
      "name": "Product Name",
      "price": 99.99,
      "quantity": 2,
      "image": "https://example.com/image.jpg"
    }
  ],
  "couponCode": "SAVE10",
  "discount": 100,
  "subtotal": 900,
  "tax": 162,
  "total": 1062,
  "createdAt": "2026-06-28T10:00:00.000Z",
  "updatedAt": "2026-06-28T10:30:00.000Z"
}
```

### Add Item to Cart

```
POST /api/cart/:sessionId/items
```

Add a new item to the cart.

**Headers:**
- `X-API-Key` (required): API key for authentication
- `X-Company-Id` (optional): Company identifier
- `X-Customer-Id` (optional): Customer identifier

**Request Body:**
```json
{
  "productId": "prod_001",
  "variantId": "var_001",
  "name": "Product Name",
  "price": 99.99,
  "quantity": 2,
  "image": "https://example.com/image.jpg"
}
```

**Response:** Returns updated cart (201 Created)

### Update Item Quantity

```
PUT /api/cart/:sessionId/items/:itemId
```

Update the quantity of an item in the cart. Set quantity to 0 to remove.

**Headers:**
- `X-API-Key` (required): API key for authentication
- `X-Company-Id` (optional): Company identifier

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:** Returns updated cart

### Remove Item from Cart

```
DELETE /api/cart/:sessionId/items/:itemId
```

Remove an item from the cart.

**Headers:**
- `X-API-Key` (required): API key for authentication
- `X-Company-Id` (optional): Company identifier

**Response:** Returns updated cart

### Clear Cart

```
DELETE /api/cart/:sessionId
```

Delete the entire cart.

**Headers:**
- `X-API-Key` (required): API key for authentication
- `X-Company-Id` (optional): Company identifier

**Response:**
```json
{
  "message": "Cart cleared successfully"
}
```

### Apply Coupon

```
POST /api/cart/:sessionId/apply-coupon
```

Apply a coupon code to the cart.

**Headers:**
- `X-API-Key` (required): API key for authentication
- `X-Company-Id` (optional): Company identifier

**Request Body:**
```json
{
  "couponCode": "SAVE10"
}
```

**Response:**
```json
{
  "cart": { /* updated cart */ },
  "couponApplied": {
    "code": "SAVE10",
    "description": "10% off",
    "discount": 100
  }
}
```

### Get Cart Summary

```
GET /api/cart/:sessionId/summary
```

Get a summary of the cart with line item details.

**Headers:**
- `X-API-Key` (required): API key for authentication
- `X-Company-Id` (optional): Company identifier

**Response:**
```json
{
  "sessionId": "sess_abc123",
  "itemCount": 3,
  "totalQuantity": 7,
  "subtotal": 900,
  "discount": 100,
  "couponCode": "SAVE10",
  "tax": 144,
  "total": 944,
  "items": [
    {
      "id": "uuid-1234",
      "name": "Product Name",
      "quantity": 2,
      "unitPrice": 99.99,
      "lineTotal": 199.98
    }
  ]
}
```

## Cart Schema

```javascript
{
  sessionId: string,        // Unique cart identifier
  companyId: string,        // Company/organization ID
  customerId: string,       // Customer identifier
  items: [{                // Cart line items
    id: string,             // UUID for the line item
    productId: string,      // Product identifier
    variantId: string,      // Product variant (optional)
    name: string,           // Product name
    price: number,          // Unit price
    quantity: number,       // Quantity
    image: string           // Product image URL (optional)
  }],
  couponCode: string|null,  // Applied coupon code
  discount: number,         // Discount amount
  subtotal: number,         // Sum of (price * quantity)
  tax: number,              // Tax amount (18% GST)
  total: number,             // Final total
  createdAt: timestamp,     // Cart creation time
  updatedAt: timestamp      // Last modification time
}
```

## Features

### Automatic Calculations
- **Subtotal:** Sum of all item prices multiplied by quantities
- **Tax:** 18% GST applied to (subtotal - discount)
- **Total:** subtotal - discount + tax

### Coupon Codes

| Code | Type | Value | Description |
|------|------|-------|-------------|
| SAVE10 | Percentage | 10% | 10% off |
| SAVE20 | Percentage | 20% | 20% off |
| FLAT50 | Fixed | ₹50 | ₹50 off |
| FLAT100 | Fixed | ₹100 | ₹100 off |
| WELCOME | Percentage | 15% | 15% off for new customers |

### Cart Expiry (TTL)
- Carts automatically expire after 24 hours of inactivity
- Expired carts are cleaned up on read operations
- `updatedAt` timestamp is used for TTL calculation

### Authentication
All API endpoints (except `/health`) require API key authentication.

**Header:** `X-API-Key: your-api-key`

Minimum API key length: 16 characters

### Multi-Tenant Support
- Company-specific cart storage via `X-Company-Id` header
- Carts stored in `/tmp/siteos-carts-{companyId}.json`
- Default company: 'default'

## Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Missing required fields | Invalid request body |
| 400 | Price cannot be negative | Price validation failed |
| 400 | Quantity must be at least 1 | Quantity too low |
| 400 | Invalid coupon code | Coupon not found |
| 401 | API key required | Missing X-API-Key header |
| 401 | Invalid API key | API key too short |
| 404 | Cart not found | Session doesn't exist |
| 404 | Item not found in cart | Item ID doesn't exist |
| 500 | Internal server error | Server error |

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## File Structure

```
cart-service/
├── package.json
├── vitest.config.js
├── CLAUDE.md
├── src/
│   └── index.js          # Main application
└── __tests__/
    └── unit/
        └── cart-service.test.js
```

## Integration

This service is part of HOJAI SiteOS Commerce suite:

```
SiteOS Commerce
├── cart-service (5477)     # Shopping cart
├── product-service (5478)  # [TODO] Product catalog
├── order-service (5479)    # [TODO] Order management
├── payment-service (5480)  # [TODO] Payment processing
└── checkout-service (5481) # [TODO] Checkout flow
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5477 | Service port |
| TAX_RATE | 0.18 | GST tax rate (18%) |
| CART_TTL_HOURS | 24 | Cart time-to-live |

## Changelog

- **v1.0.0** (2026-06-28): Initial release
  - Core CRUD operations
  - Coupon support
  - Multi-tenant storage
  - 24-hour TTL
  - 18% tax calculation
