# RABTUL Technologies

**Core platform services** for the RTMN ecosystem — authentication, payments, workflow, and integrations.

---

## Services

### REZ Auth
**Authentication & Authorization**

- Port: 4002
- JWT-based authentication
- OAuth 2.0 / OpenID Connect
- Multi-tenant support
- MFA support

### REZ Wallet
**Payments & Transactions**

- Port: 4004
- Balance management
- Transfers between users/agents
- Transaction history
- Webhook notifications

### REZ Manufacturing OS
**Manufacturing operations**

- Port: 4330
- Order management
- Production tracking
- Quality control
- Machine integration

### REZ Workflow Executor
**Business process automation**

- Workflow definition
- Step orchestration
- Error handling and retry
- Audit logging

### REZ Knowledge Search
**RAG-powered search**

- Vector storage
- Semantic search
- Context augmentation
- Multi-source retrieval

### REZ Memory Cloud
**Persistent storage**

- Vector embeddings
- Knowledge graphs
- Memory retrieval

### REZ Agent Marketplace
**Agent registry & discovery**

- Agent profiles
- Capability matching
- Karma scoring

### REZ Event Bus
**Pub/Sub messaging**

- Port: 4510
- Event subscription
- Real-time notifications
- Cross-service communication

### REZ GraphQL Federation
**Unified API**

- Port: 4000
- Single endpoint for all services
- Schema federation
- Real-time subscriptions

---

## Architecture

```
RABTUL Technologies
├── Auth ────────────► Authentication
├── Wallet ──────────► Payments
├── Event Bus ───────► Messaging
├── GraphQL ─────────► Unified API
├── Integration Hub ──► Service mesh
└── Industry Services ─► Domain-specific
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/rtmn-group/rabtul-technologies.git
cd rabtul-technologies

# Install
npm install

# Start services
npm run start:auth
npm run start:wallet
npm run start:event-bus

# Or start all
docker-compose up -d
```

---

## Integration

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

// Authenticate
const session = await rtmn.auth.login({
  email: 'user@example.com',
  password: '...'
});

// Make a payment
const payment = await rtmn.wallet.transfer({
  to: 'agent_xyz',
  amount: 0.50,
  currency: 'USD'
});

// Subscribe to events
rtmn.events.subscribe('order.*', (event) => {
  console.log('Order event:', event.type, event.data);
});
```

---

## SDK

The RABTUL SDK is included in `@rtmn/sdk`:

```bash
npm install @rtmn/sdk
```

```typescript
import { RABTULClient } from '@rtmn/sdk';

const rabtul = new RABTULClient({
  authUrl: 'http://localhost:4002',
  walletUrl: 'http://localhost:4004',
  apiKey: process.env.RTMN_API_KEY
});
```

---

## Documentation

- [SDK Documentation](sdk/README.md)
- [API Reference](docs/api-reference/)
- [RTNM Integration Guide](RTNM-SERVICE-INTEGRATION-ARCHITECTURE.md)

---

## License

Proprietary — RTMN Group. All rights reserved.

---

**Built with ❤️ by RABTUL — part of the RTMN ecosystem**
