# @hojai/ml

**ML Model Registry**

---

## Overview

Central registry for ML models, versioning, and deployment.

## Features

- Model versioning
- A/B testing
- Rollback
- Performance tracking
- Auto-scaling

## Quick Start

```bash
npm install @hojai/ml
```

```typescript
import { MLRegistry } from '@hojai/ml';

const registry = new MLRegistry({ tenantId: 'merchant_123' });

// Register model
await registry.register({
  name: 'churn-prediction-v2',
  framework: 'sklearn',
  metrics: { accuracy: 0.92 }
});

// Deploy
await registry.deploy('churn-prediction-v2', { traffic: 0.2 });

// Predict
const result = await registry.predict('churn-prediction', { features });
```

## Model Types

| Type | Description |
|------|-------------|
| classification | Binary/multi-class |
| regression | Numeric prediction |
| recommendation | Product/content recs |
| nlp | Text processing |

---

**Port:** 4540
**Status:** Production Ready
