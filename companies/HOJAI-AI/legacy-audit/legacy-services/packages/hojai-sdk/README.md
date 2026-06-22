# @hojai/sdk

**Hojai AI SDK**

---

## Overview

Official SDK for building on Hojai AI platform.

## Features

- TypeScript support
- Auto-completion
- Error handling
- Retry logic
- Type-safe

## Quick Start

```bash
npm install @hojai/sdk
```

```typescript
import { Hojai } from '@hojai/sdk';

const client = new Hojai({
  tenantId: 'merchant_123',
  apiKey: 'your-api-key'
});

// Use services
const user = await client.users.get('user_123');
await client.events.publish('order.created', { orderId: 'abc' });
const prediction = await client.ai.predict('churn', 'user_123');
```

## Services

| Service | Access |
|--------|--------|
| users | User management |
| orders | Order operations |
| events | Event bus |
| ai | AI predictions |
| memory | Customer memory |
| communications | Messaging |

---

**Status:** Production Ready
