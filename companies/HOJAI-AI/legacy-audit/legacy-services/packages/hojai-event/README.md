# @hojai/event

**Event Bus & Streaming**

---

## Overview

Event ingestion, streaming, and routing for real-time data.

## Features

- Event publishing
- Subscription management
- Real-time streaming
- Event schema validation
- Dead letter queue

## Quick Start

```bash
npm install @hojai/event
```

```typescript
import { EventBus } from '@hojai/event';

const bus = new EventBus({ tenantId: 'merchant_123' });

// Publish event
await bus.publish('order.created', {
  orderId: 'order_abc',
  customerId: 'cust_123',
  total: 99.99
});

// Subscribe
bus.subscribe('order.created', async (event) => {
  console.log('Order received:', event);
});
```

## Event Schema

```typescript
{
  type: string,
  timestamp: Date,
  source: string,
  data: object,
  metadata?: object
}
```

---

**Port:** 4510
**Status:** Production Ready
