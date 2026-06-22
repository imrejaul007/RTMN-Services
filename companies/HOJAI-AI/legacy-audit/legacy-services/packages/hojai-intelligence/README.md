# @hojai/intelligence

**ML Predictions & Recommendations**

---

## Overview

AI-powered predictions, recommendations, and decision engine.

## Features

- Churn prediction
- LTV scoring
- Product recommendations
- Demand forecasting
- Decision engine

## Quick Start

```bash
npm install @hojai/intelligence
```

```typescript
import { Intelligence } from '@hojai/intelligence';

const ai = new Intelligence({ tenantId: 'merchant_123' });

// Get predictions
const churn = await ai.predict.churn('user_123');
const ltv = await ai.predict.ltv('user_123');

// Recommendations
const products = await ai.recommend.products({
  userId: 'user_123',
  limit: 10
});

// Decision
const decision = await ai.decide({
  context: 'checkout',
  userId: 'user_123',
  amount: 99.99
});
```

## Predictions

| Model | Description |
|-------|-------------|
| churn | Will user churn? |
| ltv | Customer lifetime value |
| nps | NPS score prediction |
| conversion | Conversion probability |

---

**Port:** 4530
**Status:** Production Ready
