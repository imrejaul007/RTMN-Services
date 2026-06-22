# ReZ Agent OS - Environment Variables

## Required for AI Brain

### Anthropic API
```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Database (for Shared Memory)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
REDIS_URL=redis://localhost:6379
```

## Service URLs (for Tool Execution)

### Development (Local)
```env
# Hotel OTA API - Hotel Room Hub
HOTEL_OTA_URL=http://localhost:4000

# Merchant Service - Restaurant & Retail
MERCHANT_SERVICE_URL=http://localhost:4005

# Order Service - Order Processing
ORDER_SERVICE_URL=http://localhost:3006

# Wallet Service - ReZ Coins & Balance
WALLET_SERVICE_URL=http://localhost:4004

# Loyalty/Karma Service - Points & Tiers
LOYALTY_SERVICE_URL=http://localhost:4007

# Search Service
SEARCH_SERVICE_URL=http://localhost:4007
```

### Production (OnRender)
```env
# Hotel OTA API
HOTEL_OTA_URL=https://hotel-ota-api.onrender.com

# Merchant Service
MERCHANT_SERVICE_URL=https://rez-merchant-service.onrender.com

# Order Service
ORDER_SERVICE_URL=https://rez-order-service.onrender.com

# Wallet Service
WALLET_SERVICE_URL=https://rez-wallet-service-36vo.onrender.com

# Loyalty/Karma Service
LOYALTY_SERVICE_URL=https://rez-karma-service.onrender.com
```

## Service Endpoints Used by AI Tools

| Service | Tool | Endpoint |
|---------|------|----------|
| Hotel OTA | search_hotels | GET /hotel/search |
| Hotel OTA | create_hotel_booking | POST /booking/hold → POST /booking/confirm |
| Hotel OTA | get_booking_details | GET /booking/:id |
| Hotel OTA | cancel_booking | POST /booking/:id/cancel |
| Hotel OTA | request_room_service | POST /room-service |
| Hotel OTA | request_housekeeping | POST /housekeeping/request |
| Wallet | get_wallet_balance | GET /api/wallet/balance |
| Order | get_order_status | GET /orders/:id |
| Order | place_order | POST /orders |
| Loyalty | get_loyalty_points | GET /api/karma/summary |

## Usage in Socket Handler

The socket handler automatically uses these env vars:

```typescript
createAIChatService({
  apiKey: process.env.ANTHROPIC_API_KEY,
  memoryEnabled: true,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  redisUrl: process.env.REDIS_URL,
  hotelServiceUrl: process.env.HOTEL_OTA_URL,
  merchantServiceUrl: process.env.MERCHANT_SERVICE_URL,
  walletServiceUrl: process.env.WALLET_SERVICE_URL,
  orderServiceUrl: process.env.ORDER_SERVICE_URL,
  loyaltyServiceUrl: process.env.LOYALTY_SERVICE_URL,
  searchServiceUrl: process.env.SEARCH_SERVICE_URL,
});
```
