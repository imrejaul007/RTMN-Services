# Sales Intelligence Service

**Port:** 4901  
**Purpose:** Analyzes customer purchase behavior to provide personalized selling recommendations, segment customers, and optimize pricing strategies.

## API

```
POST /api/sales/preferences
```

### Input

```javascript
{
  purchaseHistory: {
    totalSpend: 75000,
    orderCount: 30,
    avgOrderValue: 2500
  },
  browsingHistory: {
    categories: ["electronics", "fashion"],
    avgSessionDuration: 600
  }
}
```

### Output

```javascript
{
  customer_segment: "premium_explorer",
  premium_buyer: true,
  price_sensitivity: "low",
  preferred_categories: ["electronics", "fashion"],
  discount_elasticity: 0.3,
  recommended_offers: ["bundle_deals", "membership"],
  upsell_categories: ["accessories", "premium_brands"],
  cross_sell_opportunities: ["complementary_products"]
}
```

## Customer Segments

| Segment | Orders/Month | AOV | Description |
|---------|--------------|-----|-------------|
| Premium Explorer | > 4 | > 3000 | High-value, frequent buyers |
| Loyal Brand | 2-4 | 1500-3000 | Consistent, brand-focused |
| Value Hunter | 1-2 | < 1500 | Price-sensitive, deal-seekers |
| Occasional | < 1 | Any | Infrequent shoppers |

## Start

```bash
npm install
npm start
# http://localhost:4901/health
```

## Tests

```bash
npm test
```

## Related

- Gateway: `services/customer-intelligence-gateway` (4896)
- Recommendation Engine: `services/recommendation-engine` (4902)
- Sales OS: `industry-os/services/sales-os` (5055)
