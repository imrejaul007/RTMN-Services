# Return Risk Engine

**Port:** 4899  
**Purpose:** Detects return abuse patterns and recommends return policies based on customer behavior.

## API

```
POST /api/returns/risk
```

### Input

```javascript
{
  orderHistory: {
    orders: 20,
    returns: 2
  },
  returnVelocity: {
    returns7d: 0,
    returns30d: 2
  },
  itemValues: {
    avgOrderValue: 2500,
    avgReturnValue: 2400
  }
}
```

### Output

```javascript
{
  risk: "low",
  policy_recommendation: "free_returns",
  abuse_probability: 0.15,
  factors: ["Return rate: 10%", "Return velocity: 2 in 30 days"],
  confidence: 0.9
}
```

## Risk Levels

| Risk | Threshold | Policy |
|------|-----------|--------|
| Low | < 0.4 | Free returns |
| Medium | 0.4 - 0.6 | Standard policy |
| High | > 0.6 | Manual review required |

## Algorithm

| Factor | Weight | Description |
|--------|--------|-------------|
| Return Rate | 40% | Returns / Total orders |
| Return Velocity | 25% | Returns in last 30 days |
| Value Difference | 15% | High-value returns vs order value |
| Base Risk | 20% | Baseline risk score |

## Start

```bash
npm install
npm start
# http://localhost:4899/health
```

## Tests

```bash
npm test
```

## Related

- Gateway: `services/customer-intelligence-gateway` (4896)
- Trust Score: `services/trust-score-service` (4897)
