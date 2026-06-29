# COD Intelligence Service

**Port:** 4898  
**Purpose:** Cash on Delivery recommendation engine - determines whether to allow COD for a customer based on their history and risk factors.

## API

```
POST /api/cod/recommend
```

### Input

```javascript
{
  phone: "+919876543210",
  orderHistory: {
    total: 20,      // Total orders
    completed: 19   // Successfully completed
  },
  addressHistory: {
    changes90d: 0,  // Address changes in 90 days
    verified: true
  },
  deviceHistory: {
    changes30d: 0    // Device changes in 30 days
  },
  purchaseAmount: 2500,
  accountAge: 180
}
```

### Output

```javascript
{
  allowed: true,
  confidence: 94,
  recommendation: "allow",
  factors: ["High completion rate (95%)", "Stable address"],
  reasons: ["Customer has reliable delivery history"]
}
```

## Algorithm

| Factor | Weight | Description |
|--------|--------|-------------|
| COD Success Rate | 35% | Previous COD order completion rate |
| Address Stability | 20% | Few address changes = reliable delivery |
| Device Consistency | 15% | Same device = lower fraud risk |
| Account Age | 15% | Older accounts are more trusted |
| Purchase Amount | 15% | High-value orders have additional risk |

## Start

```bash
npm install
npm start
# http://localhost:4898/health
```

## Tests

```bash
npm test
```

## Related

- Gateway: `services/customer-intelligence-gateway` (4896)
- Customer Twin: `platform/twins/customer-twin` (4895)
