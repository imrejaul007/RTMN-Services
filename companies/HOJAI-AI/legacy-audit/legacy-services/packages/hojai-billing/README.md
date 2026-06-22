# @hojai/billing

**HOJAI Billing - Subscription, metering, and revenue management**

---

## Overview

Subscription management, usage metering, AI employee billing, and marketplace royalties.

## Features

- Subscription plans
- Usage metering
- AI employee billing
- Marketplace royalties
- Invoice generation
- Dashboard analytics

## Quick Start

```bash
npm install @hojai/billing
npm run dev
```

## Pricing

| Plan | Price | AI Employees |
|-------|-------|--------------|
| Starter | ₹99/mo | 5 |
| Professional | ₹499/mo | 25 |
| Enterprise | ₹1999/mo | 100 |

## API

### Plans

```typescript
// List plans
const plans = await billing.plans.list();

// Get subscription
const sub = await billing.subscriptions.current();
```

### Usage

```typescript
// Record usage
await billing.usage.record({
  type: 'api_call',
  quantity: 1
});

// Get summary
const summary = await billing.usage.summary();
```

### AI Employee Billing

```typescript
// Register AI employee
await billing.aiEmployees.register({
  employeeId: 'ai_sdr_001',
  role: 'SDR',
  basePrice: 99
});
```

---

**Port:** 4830
**Status:** Production Ready
