# @hojai/cost

**AI Cost Governance**

---

## Overview

Track, optimize, and govern AI service costs across your organization.

## Features

- Real-time cost tracking
- Budget alerts
- Usage analytics
- Cost attribution
- Optimization recommendations

## Quick Start

```bash
npm install @hojai/cost
```

```typescript
import { CostGovernance } from '@hojai/cost';

const cost = new CostGovernance({ tenantId: 'merchant_123' });

const usage = await cost.getUsage({
  startDate: '2026-01-01',
  endDate: '2026-01-31'
});

await cost.setBudget({
  monthly: 10000,
  alertThreshold: 0.8
});
```

## Cost Categories

| Category | Description |
|----------|-------------|
| LLM | Language model calls |
| Embeddings | Vector embeddings |
| Storage | Data storage |
| API | API calls |

---

**Port:** 4516
**Status:** Production Ready
