# HOJAI SiteOS Loyalty Connector Service

**Port:** 5481
**Version:** 1.0.0
**Status:** Production Ready

## Overview

Loyalty Connector Service provides points, rewards, tiers, and referral management for HOJAI SiteOS. Integrates with REZ-unified-loyalty (mock for now).

## Features

- **Points System** - Earn and redeem points for purchases, reviews, referrals
- **Tier System** - Bronze → Silver → Gold → Platinum progression
- **Rewards Catalog** - Discounts, cashback, free shipping
- **Referral Program** - Unique codes and tracking
- **Multi-tenant** - Company-based isolation

## Points Earning Rules

| Action | Points |
|--------|--------|
| Purchase | 1 point per ₹1 |
| Product Review | 50 points |
| Referral Signup | 200 points |
| Referral Purchase | 10 points per ₹1 |
| Account Signup | 100 points |
| Birthday Bonus | 500 points |

## Tier System

| Tier | Min Lifetime Points | Discount | Perks |
|------|---------------------|----------|-------|
| Bronze | 0 | 0% | Basic rewards |
| Silver | 1,000 | 5% | 5% discount, Early access |
| Gold | 5,000 | 10% | 10% discount, Priority support, Free shipping |
| Platinum | 15,000 | 15% | 15% discount, VIP support, Free shipping, Exclusive events |

## API Endpoints

### Profile
- `POST /api/loyalty/profile` - Create/update profile
- `GET /api/loyalty/profile/:customerId` - Get profile details
- `GET /api/loyalty/balance/:customerId` - Get points balance
- `GET /api/loyalty/tier/:customerId` - Get current tier

### Points
- `POST /api/loyalty/earn` - Earn points
- `POST /api/loyalty/redeem` - Redeem points
- `GET /api/loyalty/transactions/:customerId` - Transaction history

### Tiers
- `GET /api/loyalty/tiers` - Get tier list

### Rewards
- `GET /api/loyalty/rewards` - List available rewards
- `POST /api/loyalty/rewards/:rewardId/redeem` - Redeem reward

### Referrals
- `POST /api/loyalty/referral` - Create referral link
- `GET /api/loyalty/referrals/:customerId` - Get referral stats

### Internal
- `POST /api/loyalty/reward-employee` - Reward employee

## Authentication

All API endpoints require:
- `X-API-Key` header or `Authorization: Bearer <key>`
- `X-Company-Id` header for multi-tenant isolation

## Environment Variables

```bash
PORT=5481
STORAGE_PATH=/tmp
```

## Redeem Rate

1 point = ₹0.01 (100 points = ₹1)

## Files

```
loyalty-connector/
├── src/index.js       # Main service (400 lines)
├── package.json
├── vitest.config.js
├── CLAUDE.md
└── __tests__/unit/
    └── loyalty-connector.test.js  # 15 tests
```

## Start

```bash
cd products/siteos-commerce/loyalty-connector
npm install
npm start
```
