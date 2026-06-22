# @hojai/api-gateway

**Unified API Gateway**

---

## Overview

Central routing and authentication for all Hojai AI services.

## Features

- Request routing
- Rate limiting
- Authentication
- Logging & monitoring
- Multi-tenant isolation

## Quick Start

```bash
npm install @hojai/api-gateway
```

```typescript
import { createGateway } from '@hojai/api-gateway';

const gateway = createGateway({
  port: 4500,
  services: {
    governance: 'http://localhost:4501',
    event: 'http://localhost:4510',
    intelligence: 'http://localhost:4530'
  }
});

gateway.listen();
```

## Routes

| Path | Service |
|------|---------|
| /api/governance/* | Governance |
| /api/event/* | Event Bus |
| /api/intelligence/* | Intelligence |
| /api/agents/* | Agents |
| /api/memory/* | Memory |

---

**Port:** 4500
**Status:** Production Ready
