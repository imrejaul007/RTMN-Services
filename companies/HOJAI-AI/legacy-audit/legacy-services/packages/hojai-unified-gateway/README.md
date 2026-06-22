# @hojai/unified-gateway

**HOJAI Unified Gateway - Single Entry Point**

---

## Overview

Single entry point for all HOJAI services. Routes requests to appropriate microservices.

## Features

- Single entry point for all services
- JWT authentication
- Rate limiting
- Request routing
- Service discovery
- Unified search
- Unified profile

## Quick Start

```bash
npm install @hojai/unified-gateway
npm run dev
```

```typescript
import { HojaiGateway } from '@hojai/unified-gateway';

const gateway = new HojaiGateway({
  port: 4800,
  services: {
    auth: 'http://localhost:4002',
    payment: 'http://localhost:4001',
    // ... other services
  }
});

gateway.start();
```

## Architecture

```
Client → Unified Gateway → RABTUL Services
                         → HOJAI Services
                         → REZ Intelligence
```

## Routes

### RABTUL Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | User login |
| POST | /api/payments/create | Create payment |
| GET | /api/wallet/balance | Get balance |
| POST | /api/orders | Create order |

### HOJAI Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/events/publish | Publish event |
| POST | /api/memory/store | Store memory |
| POST | /api/ai/predict | AI prediction |
| POST | /api/agents/execute | Execute agent |

### REZ Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/intent/predict | Intent prediction |
| GET | /api/identity/resolve | Resolve identity |
| POST | /api/signals/ingest | Ingest signals |

### Unified Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/unified/search | Search all services |
| GET | /api/unified/profile/:id | Get unified profile |
| POST | /api/unified/track | Track event everywhere |

---

**Port:** 4800
**Status:** Production Ready
