# @hojai/flow-orchestrator

**Workflow Orchestration**

---

## Overview

Coordinate complex multi-step workflows across services.

## Features

- Multi-step orchestration
- Distributed transactions
- Retry logic
- Compensation
- Monitoring

## Quick Start

```bash
npm install @hojai/flow-orchestrator
```

```typescript
import { Orchestrator } from '@hojai/flow-orchestrator';

const orch = new Orchestrator({ tenantId: 'merchant_123' });

const result = await orch.execute('order-fulfillment', {
  orderId: 'order_abc',
  customerId: 'cust_123'
});
```

## Capabilities

| Feature | Description |
|---------|-------------|
| Saga Pattern | Distributed transactions |
| Retry | Automatic retry with backoff |
| Compensation | Rollback on failure |
| Monitoring | Real-time status |

---

**Status:** Production Ready
