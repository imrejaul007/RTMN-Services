# Sales Intelligence Service

**Port:** 4901  
**Purpose:** Selling preferences and recommendations

## API

```
POST /api/sales/preferences
  Input: { purchaseHistory, browsingHistory, responseHistory }
  Output: { customer_segment, price_sensitivity, premium_buyer, next_best_offer }
```
