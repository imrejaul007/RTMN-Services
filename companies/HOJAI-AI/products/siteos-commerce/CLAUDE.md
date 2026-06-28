# HOJAI SiteOS Commerce Module

**Version:** 1.0
**Date:** June 28, 2026
**Status:** Production Ready

## Overview

SiteOS Commerce provides complete e-commerce capabilities for HOJAI SiteOS:
- Product Catalog
- Cart Management
- Checkout & Orders
- Payment Gateway (Razorpay, UPI)
- Review Collection
- Loyalty & Rewards

## Services

| Port | Service | Description |
|------|---------|-------------|
| 5476 | Product Catalog | Product management, search, categories |
| 5477 | Cart Service | Shopping cart, coupon codes |
| 5478 | Checkout Service | Order processing, addresses |
| 5479 | Payment Gateway | Razorpay, UPI, payment processing |
| 5480 | Review Collection | Active review requests, sentiment |
| 5481 | Loyalty Connector | Points, tiers, rewards, referrals |

## Quick Start

```bash
# Install dependencies for all services
for dir in */; do
  cd "$dir" && npm install && cd ..
done

# Start services
node product-catalog/src/index.js &    # Port 5476
node cart-service/src/index.js &       # Port 5477
node checkout-service/src/index.js &    # Port 5478
node payment-gateway/src/index.js &    # Port 5479
node review-collection/src/index.js &   # Port 5480
node loyalty-connector/src/index.js &   # Port 5481
```

## API Examples

### Create Product
```bash
curl -X POST http://localhost:5476/api/products \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Company-Id: company123" \
  -d '{
    "name": "Nike Shoes",
    "price": 4999,
    "category": "footwear",
    "inventory": 100
  }'
```

### Add to Cart
```bash
curl -X POST http://localhost:5477/api/cart/session123/items \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Company-Id: company123" \
  -d '{
    "productId": "prod123",
    "name": "Nike Shoes",
    "price": 4999,
    "quantity": 1
  }'
```

### Initiate Payment
```bash
curl -X POST http://localhost:5479/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Company-Id: company123" \
  -d '{
    "orderId": "order123",
    "amount": 4999,
    "customerId": "cust123",
    "method": "razorpay"
  }'
```

### Earn Loyalty Points
```bash
curl -X POST http://localhost:5481/api/loyalty/earn \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Company-Id: company123" \
  -d '{
    "customerId": "cust123",
    "type": "purchase",
    "amount": 4999,
    "orderId": "order123"
  }'
```

## Architecture

```
Widget/WhatsApp
      │
      ▼
┌─────────────────────────────────────────┐
│           Commerce Engine               │
├─────────────────────────────────────────┤
│  Product ──► Cart ──► Checkout ──► Order │
│     │         │           │         │    │
│     │         │           │         ▼    │
│     │         │           └──────► Payment │
│     │         │                       │    │
│     │         └──────► Loyalty ◄──────┘    │
│     │                                      │
│     └──────► Reviews ◄─────────────────┘   │
└─────────────────────────────────────────┘
```

## Files

```
siteos-commerce/
├── CLAUDE.md
├── product-catalog/          # Port 5476
│   ├── src/index.js
│   ├── package.json
│   ├── vitest.config.js
│   ├── CLAUDE.md
│   └── __tests__/unit/
├── cart-service/            # Port 5477
│   ├── src/index.js
│   ├── package.json
│   ├── vitest.config.js
│   ├── CLAUDE.md
│   └── __tests__/unit/
├── checkout-service/        # Port 5478
│   ├── src/index.js
│   ├── package.json
│   ├── vitest.config.js
│   ├── CLAUDE.md
│   └── __tests__/unit/
├── payment-gateway/        # Port 5479
│   ├── src/index.js
│   ├── package.json
│   ├── vitest.config.js
│   ├── CLAUDE.md
│   └── __tests__/unit/
├── review-collection/      # Port 5480
│   ├── src/index.js
│   ├── package.json
│   ├── vitest.config.js
│   ├── CLAUDE.md
│   └── __tests__/unit/
└── loyalty-connector/      # Port 5481
    ├── src/index.js
    ├── package.json
    ├── vitest.config.js
    ├── CLAUDE.md
    └── __tests__/unit/
```
