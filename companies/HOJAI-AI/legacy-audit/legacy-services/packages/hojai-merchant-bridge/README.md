# @hojai/merchant-bridge

**Merchant Integration Bridge**

---

## Overview

Connect merchant systems with Hojai AI platform.

## Features

- Product sync
- Order integration
- Inventory management
- Customer sync
- Analytics integration

## Quick Start

```bash
npm install @hojai/merchant-bridge
```

```typescript
import { MerchantBridge } from '@hojai/merchant-bridge';

const bridge = new MerchantBridge({ tenantId: 'merchant_123' });

// Sync products
await bridge.sync.products();

// Sync orders
await bridge.sync.orders();

// Get merchant analytics
const analytics = await bridge.getAnalytics();
```

## Integration

| System | Status |
|--------|--------|
| POS | ✅ |
| ERP | ✅ |
| CRM | ✅ |
| Inventory | ✅ |

---

**Status:** Production Ready
