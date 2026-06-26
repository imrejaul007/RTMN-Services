# BillingOS — Revenue & Subscription Management

**Port:** 4595
**Purpose:** Handles all billing, subscriptions, and revenue operations

---

## Overview

BillingOS manages the entire revenue lifecycle:
- **Subscriptions** — Monthly/annual plans
- **Usage Billing** — AI tokens, API calls
- **Marketplace** — Revenue splits, partner payouts
- **Invoicing** — Generation, sending, tracking
- **Payments** — Processing, refunds
- **Credits & Coupons** — Promotions, retention

---

## Pricing Plans

| Plan | Monthly | Annual | AI Workers | Requests/mo | Users |
|------|---------|--------|-----------|-------------|-------|
| **Starter** | $499 | $4,990 | 1 | 1,000 | 1 |
| **Growth** | $1,499 | $14,990 | 5 | 10,000 | 10 |
| **Professional** | $4,999 | $49,990 | 20 | 50,000 | 50 |
| **Enterprise** | $14,999 | $149,990 | Unlimited | Unlimited | Unlimited |

### Enterprise Features (all plans include)
- Templates, integrations, analytics, API access
- Priority/24/7 support based on plan
- Custom domain, SSO/SAML (Enterprise)
- SLA guarantee (Enterprise)

---

## API Endpoints

### Plans
```
GET  /api/plans            - List all plans
GET  /api/plans/:id        - Get plan details
```

### Subscriptions
```
POST /api/subscriptions          - Create subscription
GET  /api/subscriptions         - List subscriptions
GET  /api/subscriptions/:id     - Get subscription
POST /api/subscriptions/:id/cancel    - Cancel
POST /api/subscriptions/:id/pause     - Pause
POST /api/subscriptions/:id/resume     - Resume
POST /api/subscriptions/:id/change     - Change plan
```

### Invoices
```
POST /api/invoices              - Create invoice
GET  /api/invoices             - List invoices
GET  /api/invoices/:id         - Get invoice
POST /api/invoices/:id/send    - Send invoice
POST /api/invoices/:id/void    - Void invoice
```

### Payments
```
POST /api/payments             - Process payment
GET  /api/payments             - List payments
GET  /api/payments/:id         - Get payment
POST /api/payments/:id/refund  - Refund payment
```

### Usage Billing
```
POST /api/usage/record         - Record usage
GET  /api/usage/:customerId    - Get usage
```

### Credits
```
POST /api/credits              - Add credits
GET  /api/credits/:customerId  - Get customer credits
```

### Coupons
```
POST /api/coupons              - Create coupon
GET  /api/coupons/:code       - Validate coupon
POST /api/coupons/:code/redeem - Redeem coupon
```

### Payouts (Marketplace)
```
POST /api/payouts             - Create payout
GET  /api/payouts             - List payouts
```

### Analytics
```
GET  /api/analytics           - Revenue analytics
```

---

## Example Usage

### Create Subscription
```bash
curl -X POST http://localhost:4595/api/subscriptions \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": "cust-123",
    "planId": "growth",
    "period": "annual",
    "trialDays": 14
  }'
```

### Record Usage
```bash
curl -X POST http://localhost:4595/api/usage/record \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": "cust-123",
    "subscriptionId": "sub-456",
    "metric": "ai_requests",
    "quantity": 150
  }'
```

### Create Coupon
```bash
curl -X POST http://localhost:4595/api/coupons \
  -H 'Content-Type: application/json' \
  -d '{
    "code": "SUMMER20",
    "type": "percentage",
    "value": 20,
    "maxRedemptions": 100,
    "expiresAt": "2026-08-31T23:59:59Z"
  }'
```

### Create Payout (Marketplace)
```bash
curl -X POST http://localhost:4595/api/payouts \
  -H 'Content-Type: application/json' \
  -d '{
    "partnerId": "partner-789",
    "amount": 5000,
    "currency": "USD",
    "method": "bank_transfer"
  }'
```

### Revenue Analytics
```bash
curl http://localhost:4595/api/analytics?period=30d
```

---

## Subscription Lifecycle

```
Trial → Active → Past Due → Canceled
         ↓
       Paused
         ↓
      Active
         ↓
    Canceled (at period end)
         ↓
      Canceled (immediate)
```

---

## Payment Flow

```
1. Invoice Created (draft)
2. Invoice Sent → Due Date
3. Payment Attempted
   ├── Success → Invoice Paid
   └── Failed → Retry Logic
4. Refund (if needed)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     BillingOS                           │
│                      (4595)                             │
├─────────────────────────────────────────────────────────┤
│  Plan Manager                                           │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Starter │ Growth │ Professional │ Enterprise  │  │
│  └─────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Subscription Engine                                    │
│  Trials │ Billing │ Upgrades │ Downgrades │ Cancel   │
├─────────────────────────────────────────────────────────┤
│  Payment Processor                                     │
│  Stripe │ Razorpay │ PayPal │ Square                  │
├─────────────────────────────────────────────────────────┤
│  Invoice Generator                                     │
│  Line Items │ Taxes │ Due Dates │ Reminders          │
├─────────────────────────────────────────────────────────┤
│  Revenue Analytics                                     │
│  MRR │ ARR │ Churn │ LTV │ CAC                     │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Add Stripe integration** — Real payment processing
2. **Add tax calculation** — Avalara, TaxJar
3. **Add dunning** — Automated retry sequences
4. **Add revenue recognition** — ASC 606 compliance
5. **Add partner portal** — Self-service payouts
