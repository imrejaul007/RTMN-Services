# @hojai/twin

**HOJAI Digital Twin Platform**

---

## Overview

Digital twins that learn and predict for employees, customers, and companies.

## Twin Types

| Type | Learns | Predictions |
|------|--------|-------------|
| Employee | Work style, expertise, personality | Burnout, Flight Risk, Promotion |
| Customer | Preferences, behavior, lifetime | Next Purchase, Churn, LTV |
| Company | Revenue, operations, customers | Growth, Risk, Expansion |
| Merchant | Inventory, marketing, customers | Demand, Churn, Potential |

## Quick Start

```bash
npm install @hojai/twin
npm run dev
```

## Employee Twin

```typescript
// Create twin
await twin.employee.create({
  employeeId: 'emp_123',
  workStyle: { communication: 'async' },
  expertise: ['sales', 'negotiation']
});

// Get predictions
const predictions = await twin.employee.predictions('emp_123');
// { burnoutRisk: 0.2, flightRisk: 0.1, promotionReadiness: 0.85 }
```

## Customer Twin

```typescript
// Create twin
await twin.customer.create({
  customerId: 'cust_123',
  preferences: { channels: ['whatsapp', 'email'] }
});

// Get recommendations
const recs = await twin.customer.recommendations('cust_123');
```

---

**Port:** 4860
**Status:** Production Ready
