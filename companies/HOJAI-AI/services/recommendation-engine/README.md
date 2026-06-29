# Recommendation Engine

**Port:** 4902  
**Purpose:** Provides personalized product, offer, and next-best-action recommendations based on customer behavior and preferences.

## API

```
POST /api/recommend
```

### Input

```javascript
{
  customerId: "cust_abc123",
  context: "product_page",
  categories: ["electronics", "fashion"],
  currentCart: ["product_1", "product_2"],
  browsingHistory: ["category_phones", "brand_apple"]
}
```

### Output

```javascript
{
  next_best_action: {
    action: "show_bundle",
    confidence: 0.92,
    alternatives: ["show_comparison", "offer_discount"]
  },
  recommendations: [
    {
      type: "product",
      items: ["product_3", "product_4"],
      reason: "Frequently bought together"
    },
    {
      type: "offer",
      items: ["BUNDLE_20_OFF"],
      reason: "Cross-sell opportunity"
    }
  ]
}
```

## Recommendation Types

| Type | Purpose |
|------|---------|
| Product | Similar/complementary products |
| Offer | Discounts, bundles, promotions |
| Next Best Action | Next step in customer journey |

## Start

```bash
npm install
npm start
# http://localhost:4902/health
```

## Tests

```bash
npm test
```

## Related

- Gateway: `services/customer-intelligence-gateway` (4896)
- Sales Intelligence: `services/sales-intelligence` (4901)
- Product Twin: `platform/twins/product-twin` (4720)
