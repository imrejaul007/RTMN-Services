# @hojai/hitl

**Human-in-the-Loop**

---

## Overview

Approval workflows, escalation systems, and human override capabilities.

## Features

- Approval queues
- Escalation rules
- Manual override
- Audit trail
- SLA monitoring

## Quick Start

```bash
npm install @hojai/hitl
```

```typescript
import { HITL } from '@hojai/hitl';

const hitl = new HITL({ tenantId: 'merchant_123' });

// Request approval
await hitl.requestApproval({
  type: 'refund',
  amount: 500,
  reason: 'Customer complaint'
});

// Approve
await hitl.approve(requestId, approverId);
```

## Use Cases

| Case | Description |
|------|-------------|
| Refund > $100 | Manual approval |
| Contract | Legal review |
| Credit | Finance approval |
| Escalation | Manager review |

---

**Port:** 4517
**Status:** Production Ready
