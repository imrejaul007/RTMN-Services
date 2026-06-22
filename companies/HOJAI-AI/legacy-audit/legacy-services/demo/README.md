# HOJAI AI - Demo Scripts

This directory contains demo scripts to test and showcase the HOJAI AI platform.

## Prerequisites

1. **Start the HOJAI Unified Platform server:**

```bash
cd hojai-ai/hojai-unified-platform
npm install
npm run dev
```

The server will start on `http://localhost:4850`

2. **Or set environment variables:**

```bash
# Use a different base URL
export HOJAI_API_URL=http://localhost:4850

# Use a custom tenant
export HOJAI_TENANT_ID=my_tenant
```

## Scripts

### Quick API Test

Run this first to verify all API endpoints are working:

```bash
cd hojai-ai
npx tsx demo/scripts/api-test.ts
```

**What it tests:**
- `GET /health` - Health check
- `GET /api/info` - Platform information
- `GET /api/commerce/products` - Product listing
- `POST /api/commerce/cart` - Create shopping cart
- `POST /api/commerce/cart/:id/items` - Add item to cart
- `POST /api/brain/process` - AI brain message processing
- `GET /api/brain/suggestions` - Get contextual suggestions
- `POST /api/support/tickets` - Create support ticket
- `GET /api/channels` - List available channels

**Expected Output:**
```
╔════════════════════════════════════════════════════════════════════╗
║              HOJAI AI - API TEST SUITE                             ║
╚════════════════════════════════════════════════════════════════════╝

  Testing Health Check... PASS (45ms)
  Testing Platform Info... PASS (32ms)
  Testing Get Products... PASS (28ms)
  Testing Create Cart... PASS (51ms)
  Testing Add to Cart... PASS (48ms)
  Testing AI Brain Process... PASS (95ms)
  Testing Get Suggestions... PASS (41ms)
  Testing Create Ticket... PASS (62ms)
  Testing Get Channels... PASS (35ms)

────────────────────────────────────────────────────────────────
                              TEST SUMMARY
────────────────────────────────────────────────────────────────

  PASSED:  9/9
  FAILED:  0/9
  SKIPPED: 0/9
  TOTAL:   9/9

  Total Duration: 437ms
────────────────────────────────────────────────────────────────

All tests passed!
```

### Full Platform Demo

Run the complete demo showing all HOJAI AI capabilities:

```bash
cd hojai-ai
npx tsx demo/scripts/full-demo.ts
```

**What it demonstrates:**

1. **Health Check** - Verify platform status
2. **Platform Info** - Display features and channels
3. **Product Catalog** - Browse demo products
4. **Cart Management** - Create cart, add items, calculate totals
5. **AI Brain Processing** - Intent detection and response
6. **Contextual Suggestions** - Action recommendations
7. **Support Tickets** - Create and manage tickets
8. **Complete AI Flow** - End-to-end user journey

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                     HOJAI AI - PLATFORM DEMO                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

================================================================
  STEP 1: Platform Health Check
================================================================

[HEALTH] Service: hojai-unified-platform
[HEALTH] Version: 1.0.0
[HEALTH] MongoDB: healthy

================================================================
  STEP 2: Platform Information
================================================================

[INFO] Platform: HOJAI Unified Platform

  Features:
    - WhatsApp Business API Integration
    - Multi-channel Support
    - AI-powered Chat Bot
    ...

================================================================
  STEP 3: Product Catalog
================================================================

[PRODUCTS] Found 3 products

  1. Margherita Pizza
     Price: ₹299 (was ₹349, save ₹50)
     ...

================================================================
  STEP 4: Cart Management
================================================================

[CART] Created cart: cart_xxx
[CART] + Added: Margherita Pizza x 2 = ₹598
...

  Cart Summary:
  ─────────────────────────────────
  Margherita Pizza x 2 = ₹598
  ...
  TOTAL: ₹1284

================================================================
  STEP 5: AI Brain - Intent Processing
================================================================

  User: "I want to order some food for delivery"
  AI Response: I can help you order food!
  Intent: order_food
  Confidence: 95%

================================================================
  STEP 6: Support Ticket System
================================================================

[TICKET] Created ticket: TKT-2606-1001
[TICKET] Status: open
...

================================================================
  DEMO COMPLETED SUCCESSFULLY
================================================================
```

## API Endpoints Tested

### Health & Info

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Platform health check |
| GET | `/api/info` | Platform information |
| GET | `/api/channels` | Available channels |

### Commerce

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/commerce/products` | List products |
| GET | `/api/commerce/products/:id` | Get product |
| POST | `/api/commerce/cart` | Create cart |
| GET | `/api/commerce/cart/:id` | Get cart |
| GET | `/api/commerce/cart?customerId=X` | Get cart by customer |
| POST | `/api/commerce/cart/:id/items` | Add to cart |
| PATCH | `/api/commerce/cart/:id/items/:idx` | Update cart item |
| DELETE | `/api/commerce/cart/:id/items/:idx` | Remove from cart |

### AI Brain

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/brain/process` | Process message |
| GET | `/api/brain/suggestions` | Get suggestions |

### Support

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/support/tickets` | Create ticket |
| GET | `/api/support/tickets` | List tickets |
| GET | `/api/support/tickets/:id` | Get ticket |
| PATCH | `/api/support/tickets/:id` | Update ticket |
| POST | `/api/support/tickets/:id/assign` | Assign ticket |
| POST | `/api/support/tickets/:id/resolve` | Resolve ticket |

## Demo Data

The demo uses seeded demo products:

| SKU | Name | Price | Category |
|-----|------|-------|----------|
| PIZZA-MARGH | Margherita Pizza | ₹299 | food |
| BURGER-VEG | Veggie Burger | ₹199 | food |
| PASTA-CREAM | Creamy Pasta | ₹249 | food |

## Troubleshooting

### Server not running

If you see "Server not running" error:

```bash
# Start the server
cd hojai-ai/hojai-unified-platform
npm run dev

# Wait for "Server started on port 4850"
```

### Connection refused

Check if the port is available:

```bash
lsof -i :4850
```

### MongoDB connection issues

The platform works without MongoDB for demo purposes. Data is stored in-memory.

## Customization

### Custom Tenant

```bash
export HOJAI_TENANT_ID=my_tenant
npx tsx demo/scripts/api-test.ts
```

### Custom API URL

```bash
export HOJAI_API_URL=http://production.example.com
npx tsx demo/scripts/api-test.ts
```

### Custom Customer

Modify the constants in the demo scripts:

```typescript
const CUSTOMER_ID = 'my_customer';
const CUSTOMER_NAME = 'My Customer';
const CUSTOMER_EMAIL = 'my@customer.com';
```

## Extending the Demo

To add more test cases:

```typescript
async function testMyFeature(): Promise<TestReport> {
  const start = Date.now();
  try {
    const response = await client.post('/api/my/endpoint', {
      // Your request data
    });
    const duration = Date.now() - start;

    if (response.data.success) {
      return { name: 'My Feature', status: 'PASS', duration };
    }
    return { name: 'My Feature', status: 'FAIL', duration, error: 'No success' };
  } catch (error: any) {
    return { name: 'My Feature', status: 'FAIL', duration: Date.now() - start, error: error.message };
  }
}
```

## License

MIT - See hojai-ai/LICENSE
