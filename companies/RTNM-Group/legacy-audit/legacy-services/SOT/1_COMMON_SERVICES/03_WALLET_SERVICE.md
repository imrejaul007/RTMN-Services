# REZ Wallet Service

## Basic Info

| Field | Value |
|-------|-------|
| **Git Path** | `rez-wallet-service` |
| **Port** | 3010 (primary) |
| **Status** | Active |
| **Live URL** | https://rez-wallet-service-36vo.onrender.com |
| **Health Check** | `GET /health`, `GET /health/ready` |
| **Metrics** | `GET /metrics` (Internal) |
| **API Docs** | `/api-docs` |

---

## Purpose

The Wallet Service manages digital wallets for ReZ users and merchants. It handles balance tracking, multi-coin support (ReZ coins, Prive, Branded, Promo, Cashback, Referral), coin-to-rupee conversion, BNPL (Buy Now Pay Later), credit scoring, payouts, and savings tracking. It is the financial backbone for all wallet-based transactions on the platform.

---

## Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MongoDB
- **Cache/Queue**: Redis, BullMQ
- **Observability**: Sentry, Prometheus

---

## API Endpoints

### Consumer Wallet

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/wallet/balance` | Get wallet balance | Bearer |
| GET | `/api/wallet/transactions` | Get transaction history | Bearer |
| POST | `/api/wallet/topup` | Top up wallet | Bearer |
| POST | `/api/wallet/withdraw` | Withdraw funds | Bearer |
| GET | `/api/wallet/coins` | Get coin balances | Bearer |

### Merchant Wallet

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/merchant/wallet/balance` | Get merchant balance | Bearer |
| GET | `/api/merchant/wallet/transactions` | Get merchant transactions | Bearer |
| POST | `/api/merchant/wallet/payout` | Request payout | Bearer |

### Payout Operations

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/payout/initiate` | Initiate payout | Internal |
| GET | `/payout/:id` | Get payout status | Internal |
| POST | `/payout/:id/cancel` | Cancel payout | Internal |

### Credit/BNPL Operations

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/internal/credit/award` | Award credit | X-Internal-Token |
| POST | `/internal/credit/deduct` | Deduct credit | X-Internal-Token |
| GET | `/internal/credit/score/:userId` | Get credit score | X-Internal-Token |
| GET | `/api/credit/summary` | Get BNPL summary | Bearer |
| GET | `/api/credit/transactions` | Get BNPL transactions | Bearer |

### Credit Score

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/credit-score/:userId` | Get credit score | Internal |
| POST | `/credit-score/calculate` | Calculate new score | Internal |

### Savings Module

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/savings/summary` | Get savings summary | Bearer |
| GET | `/api/savings/insights` | Get savings insights | Bearer |
| GET | `/api/savings/recommendations` | Get recommendations | Bearer |
| POST | `/api/savings/goal` | Create savings goal | Bearer |
| GET | `/admin/savings/analytics` | Savings analytics | X-Internal-Token |

### CorpPerks (Corporate Benefits)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/corp/balance` | Get corporate balance | Bearer |
| POST | `/api/corp/claim` | Claim benefit | Bearer |
| GET | `/api/corp/transactions` | Corporate transactions | Bearer |

### Referral System

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/internal/referral/verify` | Verify referral code | X-Internal-Token |
| POST | `/internal/referral/award` | Award referral bonus | X-Internal-Token |

### Internal (CQRS Read Model)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/internal/wallet/read/:userId` | Read wallet data (optimized) | X-Internal-Token |

### Admin/DLQ Operations

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/admin/dlq/stats` | Dead letter queue stats | X-Internal-Token |
| GET | `/admin/dlq/entries` | List DLQ entries | X-Internal-Token |
| POST | `/admin/dlq/retry/:id` | Retry failed job | X-Internal-Token |

### Reconciliation

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/internal/reconciliation/status` | Get reconciliation status | X-Internal-Token |
| POST | `/internal/reconciliation/trigger` | Trigger reconciliation | X-Internal-Token |

---

## Database Collections

| Collection | Purpose |
|------------|---------|
| `wallets` | User/merchant wallet data |
| `wallet_transactions` | All wallet transactions |
| `coin_balances` | Per-coin type balances |
| `credit_scores` | User credit scores |
| `bnpl_orders` | BNPL order records |
| `payouts` | Payout requests |
| `savings_goals` | User savings goals |
| `referrals` | Referral records |
| `corp_perks` | Corporate benefit records |

---

## Dependencies

| Service | Purpose | URL Config |
|---------|---------|------------|
| MongoDB | Wallet data storage | `MONGODB_URI` |
| Redis | Balance caching, BullMQ | `REDIS_URL` |
| BullMQ | Async transaction processing | Built-in |
| Payment Service | Payment capture coordination | Via webhooks |
| Sentry | Error tracking | `SENTRY_DSN` |

---

## Dependents (Services that call this service)

| Service | Usage |
|---------|-------|
| Payment Service | Wallet payment processing, BNPL |
| Order Service | Wallet deduction during checkout |
| Consumer App | Wallet UI, topup, withdraw |
| Merchant App | Merchant wallet, payouts |
| Profile Service | Balance caching |
| Notification Service | Low balance alerts |

---

## Environment Variables

```env
# Core
NODE_ENV=production
PORT=3010
SERVICE_NAME=rez-wallet-service

# Database
MONGODB_URI=mongodb://localhost:27017/rez-wallet

# Cache
REDIS_URL=redis://:password@localhost:6379

# Authentication
JWT_SECRET=<secret>

# Internal Auth (REQUIRED)
INTERNAL_SERVICE_TOKENS_JSON={"wallet-service": "<token>"}

# CORS
CORS_ORIGIN=https://rez.money,https://admin.rez.money

# Coin Minting Caps (AML Compliance)
DAILY_COIN_CAP=1000
WEEKLY_COIN_CAP=5000
LIFETIME_COIN_CAP=100000

# AML Compliance Thresholds (in paise)
AML_CASH_THRESHOLD=10000000
AML_STR_THRESHOLD=5000000
AML_DAILY_LIMIT=50000000
AML_WEEKLY_LIMIT=200000000
AML_ROUND_TRIP_THRESHOLD=100000
AML_TX_COUNT_DAILY=50
AML_TX_COUNT_HOURLY=10
AML_LARGE_TRANSACTION_THRESHOLD=1000000

# Event Bus
EVENT_BUS_ENABLED=true
EVENT_STREAM_NAME=rez:events

# AI/ML Services
REZ_AI_URL=https://rez-ai-platform.onrender.com
REZ_EVENTS_URL=https://rez-core-platform.onrender.com
REZ_INTELLIGENCE_URL=https://rez-core-intelligence.onrender.com

# Observability
SENTRY_DSN=<dsn>
```

---

## Coin Types

| Coin Type | Purpose | Source |
|-----------|---------|--------|
| `rez` | Primary platform currency | ReZ ecosystem |
| `prive` | Premium benefits | VIP programs |
| `branded` | Brand-specific rewards | Partner brands |
| `promo` | Promotional bonuses | Campaigns |
| `cashback` | Cash back rewards | Transactions |
| `referral` | Referral bonuses | User referrals |

---

## Coin to Rupee Conversion

```typescript
const COIN_TO_RUPEE_RATE = 0.50; // 1 ReZ coin = Rs. 0.50
```

Conversion is configurable via environment variable.

---

## Business Logic

### Wallet Transactions

1. **Credit**: Add funds/coins to wallet
   - Topup from payment
   - Cashback
   - Referral bonus
   - BNPL settlement

2. **Debit**: Deduct funds/coins
   - Order payment
   - Withdrawal
   - BNPL repayment

3. **Transaction States**:
   - `pending`: Processing
   - `completed`: Success
   - `failed`: Error
   - `reversed`: Refund/reversal

### Credit Scoring

- Based on payment history, BNPL usage
- Used for BNPL eligibility
- Updates on payment completion

### BNPL (Buy Now Pay Later)

- Credit limit based on score
- Repayment via wallet or payment
- Interest-free period (configurable)

### Savings Module

- Track savings goals
- Provide insights
- Investment recommendations

---

## Rate Limiting

| Operation | Limit |
|-----------|-------|
| Wallet read | 100 requests / minute |
| Wallet write | 20 requests / minute |
| Payout | 5 requests / hour |

---

## AML Compliance (Anti-Money Laundering)

### Thresholds (in paise)
- Cash Transaction Report: 10,00,000 (Rs. 10L)
- Suspicious Transaction Report: 5,00,000 (Rs. 5L)

### Velocity Limits
- Daily transaction limit: 50 transactions
- Hourly transaction limit: 10 transactions
- Large transaction threshold: 1,00,000 (Rs. 1L)

### Round-Trip Detection
- Detects circular fund movement
- Threshold: 1,00,000 paise within 24 hours

---

## Health Check Response

```json
{
  "status": "ok",
  "service": "rez-wallet-service",
  "checks": {
    "db": "ok"
  },
  "uptime": 12345,
  "memory": {
    "heapUsed": 12345678,
    "heapTotal": 23456789,
    "rss": 34567890
  }
}
```

---

## Security Features

- [x] JWT authentication
- [x] Internal service token auth
- [x] Rate limiting per operation
- [x] X-Forwarded-For spoofing detection
- [x] CORS whitelist
- [x] MongoDB injection prevention
- [x] Coin minting caps (AML)
- [x] Velocity limits (AML)
- [x] Coin-to-rupee conversion validation

---

## CQRS Pattern

The service implements CQRS (Command Query Responsibility Segregation):

- **Commands**: Write operations go to MongoDB
- **Queries**: Read operations use optimized read models
- **Read Routes**: `/internal/wallet/read/:userId`

---

## Deployment

| Environment | Platform | Auto-restart |
|-------------|----------|--------------|
| Production | Render | Yes |
| Staging | Render | Yes |
| Development | Local | Manual |

---

## Related Documentation

- [API Reference](../API_REFERENCE.md)
- [AML Compliance](./AML_COMPLIANCE.md)
