# Customer Graph Service

**Port:** 4903  
**Purpose:** Builds and queries customer relationship graphs - identifying connections between customers (shared addresses, devices, family members, etc.) for fraud detection and targeting.

## API

```
POST /api/graph/relationships
```

### Input

```javascript
{
  customerId: "cust_abc123",
  depth: 2
}
```

### Output

```javascript
{
  customer_id: "cust_abc123",
  connections: [
    {
      type: "shared_address",
      related_customer: "cust_def456",
      strength: 0.85,
      shared_attributes: ["address", "pincode"]
    },
    {
      type: "family",
      related_customer: "cust_ghi789",
      strength: 0.92
    }
  ],
  fraud_risk_indicators: [],
  network_value: 150
}
```

## Connection Types

| Type | Description |
|------|-------------|
| shared_address | Same delivery address |
| shared_device | Same device fingerprint |
| shared_payment | Same payment method |
| family | Family/household relationship |
| colleague | Work address match |
| referral | Referred by each other |

## Use Cases

1. **Fraud Detection** - Identify fraudulent accounts by connection patterns
2. **Family Bundling** - Offer family plans to connected customers
3. **Network Effects** - Leverage social connections for referrals

## Start

```bash
npm install
npm start
# http://localhost:4903/health
```

## Tests

```bash
npm test
```

## Related

- Gateway: `services/customer-intelligence-gateway` (4896)
- Trust Score: `services/trust-score-service` (4897)
- Return Risk: `services/return-risk-engine` (4899)
