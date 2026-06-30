# Creator Economy — Partner Ecosystem with Revenue Sharing

> **Port:** 4514
> **Status:** ✅ BUILT
> **Purpose:** Partner ecosystem with revenue sharing, payouts, and certification

---

## Overview

The Creator Economy enables partners (developers, agencies, integrators, consultants) to earn revenue by:
- Creating companies on HOJAI Foundry
- Selling subscriptions
- Processing transactions
- Referring new partners

---

## Partner Tiers

| Tier | Min Earnings | Revenue Share | Benefits |
|------|-------------|---------------|----------|
| **Bronze** | ₹0 | 10% | Basic support |
| **Silver** | ₹50,000 | 15% | Priority support, training |
| **Gold** | ₹2,00,000 | 20% | Dedicated support, early access, co-marketing |
| **Platinum** | ₹10,00,000 | 25% | Executive support, joint ventures |

---

## Revenue Share Model

| Source | Share | Description |
|--------|-------|-------------|
| **Company Creation** | 20% | First year subscription |
| **Subscription** | 10% | Monthly recurring |
| **Transaction** | 2% | Per transaction |
| **Referral** | ₹500 | Per successful referral |

---

## Quick Start

```bash
cd platform/company-os/creator-economy
npm install
npm start

# Server runs on http://localhost:4514
```

---

## API Endpoints

### Partners

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/partners` | Register partner |
| GET | `/api/partners` | List partners |
| GET | `/api/partners/:id` | Get partner details |
| POST | `/api/partners/:id/activate` | Activate partner |
| GET | `/api/partners/:id/earnings` | Get earnings |
| GET | `/api/partners/:id/certifications` | Get certifications |
| GET | `/api/partners/:id/referrals` | Get referral stats |

### Earnings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/earnings` | Record revenue share |
| GET | `/api/earnings` | List all earnings (admin) |

### Payouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payouts` | Request payout |
| GET | `/api/payouts` | List payouts |
| GET | `/api/payouts/:id` | Get payout details |
| POST | `/api/payouts/:id/process` | Process payout |
| POST | `/api/payouts/:id/cancel` | Cancel payout |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/:partnerId` | Partner dashboard |
| GET | `/api/admin/dashboard` | Admin dashboard |

### Certifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/certifications` | Issue certification |

### Referrals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/referrals` | Create referral |
| GET | `/api/partners/:id/referrals` | Get referral stats |

---

## Payout Configuration

```typescript
{
  platformFee: 2,        // 2% platform fee
  minPayout: 500,       // ₹500 minimum
  payoutSchedule: 'weekly',
  processingDays: 2,
  holidays: ['2026-01-26', '2026-08-15', ...]
}
```

### Withdrawal Limits by Tier

| Tier | Min | Max | Daily Limit | Monthly Limit |
|------|-----|-----|-------------|----------------|
| Bronze | ₹500 | ₹50,000 | ₹50,000 | ₹2,00,000 |
| Silver | ₹500 | ₹1,00,000 | ₹1,00,000 | ₹5,00,000 |
| Gold | ₹1,000 | ₹2,50,000 | ₹2,50,000 | ₹10,00,000 |
| Platinum | ₹1,000 | ₹10,00,000 | ₹10,00,000 | ₹50,00,000 |

---

## Example Usage

### Register a Partner

```bash
curl -X POST http://localhost:4514/api/partners \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Acme Agency",
    "type": "agency",
    "email": "hello@acme.com"
  }'
```

### Record Earnings

```bash
curl -X POST http://localhost:4514/api/earnings \
  -H 'Content-Type: application/json' \
  -d '{
    "partnerId": "partner_abc123",
    "source": "subscription",
    "amount": 10000,
    "companyId": "company_xyz"
  }'
```

### Request Payout

```bash
curl -X POST http://localhost:4514/api/payouts \
  -H 'Content-Type: application/json' \
  -d '{
    "partnerId": "partner_abc123",
    "type": "bank_transfer",
    "amount": 5000,
    "bankAccount": {
      "accountNumber": "1234567890",
      "ifsc": "HDFC0001234",
      "bankName": "HDFC Bank",
      "accountHolder": "Acme Agency"
    }
  }'
```

### Get Partner Dashboard

```bash
curl http://localhost:4514/api/dashboard/partner_abc123
```

---

## Webhook Events

| Event | Description |
|-------|-------------|
| `earnings.recorded` | New earnings added |
| `payout.requested` | Payout requested |
| `payout.completed` | Payout successful |
| `payout.cancelled` | Payout cancelled |

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "uuid": "^9.0.1"
}
```

---

## Related

- [Department Packs](../department-packs/) — Complete AI departments
- [LearningOS](../learning-os/) — Collective intelligence
- [GovernanceOS](../governance-os/) — Policies and compliance
