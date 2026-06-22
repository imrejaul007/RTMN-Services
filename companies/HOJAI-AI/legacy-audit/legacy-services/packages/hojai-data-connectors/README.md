# @hojai/data-connectors

**Data Connectors**

---

## Overview

Connect to external data sources for enrichment and sync.

## Features

- Multiple data sources
- Real-time sync
- Data transformation
- Schema mapping
- Error handling

## Quick Start

```bash
npm install @hojai/data-connectors
```

```typescript
import { DataConnectors } from '@hojai/data-connectors';

const connectors = new DataConnectors({ tenantId: 'merchant_123' });

// Connect Shopify
await connectors.connect('shopify', {
  shop: 'mystore.myshopify.com',
  token: 'shpat_xxx'
});

// Sync data
await connectors.sync('orders');
```

## Supported Sources

| Source | Status |
|--------|--------|
| Shopify | ✅ |
| WooCommerce | ✅ |
| Magento | ✅ |
| Custom API | ✅ |

---

**Status:** Production Ready
