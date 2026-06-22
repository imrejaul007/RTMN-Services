# @hojai/signal

**Event Signal Processing**

---

## Overview

Normalize, deduplicate, and process event signals.

## Features

- Event normalization
- Deduplication
- Signal enrichment
- Pattern detection
- Real-time processing

## Quick Start

```bash
npm install @hojai/signal
```

```typescript
import { SignalProcessor } from '@hojai/signal';

const processor = new SignalProcessor({ tenantId: 'merchant_123' });

// Process event
const signal = await processor.process({
  source: 'shopify',
  type: 'order.created',
  data: { id: '123', total: 99.99 }
});

// Enrich
const enriched = await processor.enrich(signal);

// Deduplicate
const isDuplicate = await processor.isDuplicate(signal);
```

## Signal Types

| Type | Description |
|------|-------------|
| page_view | Page visits |
| click | User clicks |
| purchase | Orders |
| signup | New users |
| subscription | Subscriptions |

---

**Port:** 4515
**Status:** Production Ready
