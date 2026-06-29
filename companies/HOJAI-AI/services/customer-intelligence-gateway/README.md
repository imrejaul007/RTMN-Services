# Customer Intelligence Gateway

**Port:** 4896  
**Purpose:** Unified API entry point for all customer intelligence modules

## Full Analysis

```
POST /api/customer/analyze
  Input: { phone?, email?, orderHistory?, ... }
  Output: {
    customer_id,
    trust_score,
    cod_recommendation,
    return_risk,
    support_profile,
    selling_preferences,
    loyalty,
    communication,
    risk,
    segments
  }
```

## Individual Endpoints

```
POST /api/trust/score
POST /api/cod/recommend
POST /api/returns/risk
POST /api/support/profile
POST /api/sales/preferences
POST /api/loyalty/profile
POST /api/communication/preferences
POST /api/risk/scores
POST /api/recommend
```

## Start

```bash
npm start
# http://localhost:4896/health
```
