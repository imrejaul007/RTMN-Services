# Service URL Map

## Standardized Service URL Variables

This document defines the canonical service URL environment variables.

| Service | URL Variable | Default Port | Notes |
|---------|-------------|-------------|-------|
| Auth Service | `AUTH_SERVICE_URL` | 4002 | User auth, JWT, OAuth |
| Wallet Service | `WALLET_SERVICE_URL` | 3010 | Coins, payments |
| Order Service | `ORDER_SERVICE_URL` | 4003 | Order management |
| Payment Service | `PAYMENT_SERVICE_URL` | 4001 | Razorpay integration |
| Catalog Service | `CATALOG_SERVICE_URL` | 3005 | Products, categories |
| Marketing Service | `MARKETING_SERVICE_URL` | 4000 | Campaigns, vouchers |
| Search Service | `SEARCH_SERVICE_URL` | 4006 | Search, recommendations |
| Gamification Service | `GAMIFICATION_SERVICE_URL` | 3001 | Achievements, streaks |
| Karma Service | `KARMA_SERVICE_URL` | 4011 | Impact economy |
| Intent Capture | `INTENT_CAPTURE_URL` | - | Analytics |

## Service Dependencies

### Auth Service
- Used by: All services, All apps
- Needs: MongoDB, Redis

### Wallet Service  
- Used by: Payment, Order, Gamification, Karma
- Needs: MongoDB, Redis, Auth (verify user)
- Calls: Payment service for deductions

### Order Service
- Used by: Payment, Catalog
- Needs: MongoDB, Redis, Auth, Wallet, Payment
- Calls: Catalog for product data, Wallet for balance check

### Payment Service
- Used by: Order, Wallet
- Needs: MongoDB, Redis, Razorpay API
- Calls: Wallet to credit coins, Order to update status

### Catalog Service
- Used by: Search, Order, Apps
- Needs: MongoDB, Redis
- Standalone - no dependencies

### Marketing Service
- Used by: Apps
- Needs: MongoDB, Redis, AWS SES
- Calls: Auth for user profiles

### Search Service
- Used by: Apps
- Needs: MongoDB, Redis, ML service
- Calls: Catalog for products

### Gamification Service
- Used by: Wallet
- Needs: MongoDB, Redis, Wallet
- Calls: Wallet to credit coins

### Karma Service
- Used by: Apps
- Needs: MongoDB, Redis, Auth, Wallet, FCM
- Calls: Wallet for coin deductions, Auth for user verification

## Internal Service Token Map

Each service needs tokens to authenticate with other services:

```json
{
  "auth-service": "<token>",
  "wallet-service": "<token>", 
  "order-service": "<token>",
  "payment-service": "<token>",
  "catalog-service": "<token>",
  "marketing-service": "<token>",
  "search-service": "<token>",
  "gamification-service": "<token>",
  "karma-service": "<token>"
}
```

## Production URLs (Render)

| Service | Production URL |
|---------|---------------|
| Auth | `https://rez-auth-service.onrender.com` |
| Wallet | `https://rez-wallet-service-36vo.onrender.com` |
| Payment | `https://rez-payment-service.onrender.com` |
| Intent Graph | `https://rez-intent-graph.onrender.com` |

## Client App URLs

| App | Production URL |
|-----|---------------|
| Consumer | `https://app.rez.money` |
| Admin | `https://rez-app-admin.vercel.app` |
