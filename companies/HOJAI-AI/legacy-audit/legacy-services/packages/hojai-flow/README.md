# @hojai/flow

**Workflow Automation**

---

## Overview

Build and run automated workflows with visual builder support.

## Features

- Visual workflow builder
- Conditional logic
- Parallel execution
- Error handling
- Scheduling
- Webhooks

## Quick Start

```bash
npm install @hojai/flow
```

```typescript
import { Workflow } from '@hojai/flow';

const workflow = new Workflow({ tenantId: 'merchant_123' });

// Create workflow
await workflow.create({
  name: 'Order Processing',
  steps: [
    { type: 'trigger', event: 'order.created' },
    { type: 'action', service: 'inventory', method: 'reserve' },
    { type: 'condition', check: 'stock.available' },
    { type: 'action', service: 'fulfillment', method: 'ship' }
  ]
});

// Execute
await workflow.run('order_123');
```

## Step Types

| Type | Description |
|------|-------------|
| trigger | Workflow start event |
| action | Service call |
| condition | Branch logic |
| delay | Wait period |
| notification | Send alert |

---

**Port:** 4560
**Status:** Production Ready
