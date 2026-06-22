# @hojai/unified-sdk

**Unified SDK**

---

## Overview

Single SDK for all Hojai AI and REZ Intelligence services.

## Features

- All services in one SDK
- Auto-discovery
- Unified authentication
- Type-safe
- Tree-shakeable

## Quick Start

```bash
npm install @hojai/unified-sdk
```

```typescript
import { UnifiedSDK } from '@hojai/unified-sdk';

const sdk = new UnifiedSDK({
  tenantId: 'merchant_123',
  apiKey: 'your-api-key'
});

// Access any service
await sdk.users.get('user_123');
await sdk.orders.create({ ... });
await sdk.ai.predict('churn', 'user_123');
await sdk.memory.store({ ... });
await sdk.events.publish('order', { ... });
```

## Available Services

| Namespace | Services |
|-----------|----------|
| users | User management |
| orders | Order operations |
| products | Product catalog |
| events | Event bus |
| ai | ML predictions |
| memory | Customer memory |
| comms | Communications |
| trust | Trust & safety |
| analytics | Attribution |
| workflows | Automation |

---

**Status:** Production Ready
