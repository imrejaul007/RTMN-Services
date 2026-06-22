# @hojai/bridge

**REZ Ecosystem Bridge**

---

## Overview

Connects Hojai AI services with REZ Intelligence and the broader REZ ecosystem.

## Features

- Cross-platform identity linking
- Event bridging
- Data synchronization
- Audience sync
- Prediction sharing

## Quick Start

```bash
npm install @hojai/bridge
```

```typescript
import { createBridge } from '@hojai/bridge';

const bridge = createBridge({
  tenantId: 'merchant_123',
  rezEnabled: true
});

await bridge.linkIdentity({
  hojaiUserId: 'user_abc',
  rezUserId: 'rez_xyz'
});
```

## Integration Points

| Service | REZ Endpoint |
|---------|--------------|
| Identity | REZ-identity-graph:4050 |
| Events | REZ-event-bus:4025 |
| Signals | REZ-signal-aggregator:4121 |
| Attribution | REZ-attribution-system:4120 |

---

**Port:** 4519
**Status:** Production Ready
