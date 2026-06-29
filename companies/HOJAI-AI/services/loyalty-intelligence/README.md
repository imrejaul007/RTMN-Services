# Loyalty Intelligence Service

**Port:** 4904  
**Purpose:** LTV calculation, churn prediction, retention strategies

## API

```
POST /api/loyalty/profile
  Input: { purchaseHistory, engagementHistory }
  Output: { ltv, ltv_tier, churn_risk, retention_recommendations }
```
