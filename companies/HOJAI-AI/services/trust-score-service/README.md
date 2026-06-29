# Trust Score Service

**Port:** 4897  
**Purpose:** Calculates a composite trust score (0-100) for customers based on their behavior across orders, payments, and account history.

## API

```
POST /api/trust/score
```

### Input

```javascript
{
  phone: "+919876543210",
  orderHistory: {
    total: 25,
    completed: 23,
    returned: 2
  },
  paymentHistory: {
    successful: 23,
    failed: 2
  },
  accountAge: 180
}
```

### Output

```javascript
{
  score: 85,
  level: "high",
  badge: "trusted",
  factors: [
    { name: "order_completion_rate", contribution: 0.15 },
    { name: "return_rate", contribution: -0.05 },
    { name: "account_age", contribution: 0.1 }
  ]
}
```

## Trust Levels

| Score | Level | Badge |
|-------|-------|-------|
| 80-100 | Trusted | 🏆 VIP |
| 60-79 | High | ⭐ Verified |
| 40-59 | Medium | 🥉 New |
| 0-39 | Low | ⚠️ Risk |

## Algorithm

| Factor | Weight | Description |
|--------|--------|-------------|
| Order Completion | 30% | Completed / Total orders |
| Return Rate | 20% | Returns / Total orders (negative) |
| Payment Success | 20% | Successful / Total payments |
| Account Age | 15% | Older = more trusted |
| Base Score | 15% | Baseline |

## Start

```bash
npm install
npm start
# http://localhost:4897/health
```

## Tests

```bash
npm test
```

## Related

- Gateway: `services/customer-intelligence-gateway` (4896)
- COD Intelligence: `services/cod-intelligence` (4898)
- Customer Twin: `platform/twins/customer-twin` (4895)
