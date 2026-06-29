# @hojai/core

HOJAI Core SDK - Foundation for AI companies

## Installation

```bash
npm install @hojai/core
```

## Quick Start

```typescript
import { createClient } from '@hojai/core';

const hojai = createClient({
  apiKey: process.env.HOJAI_API_KEY,
  environment: 'production',
});

// Use with Memory
const memory = await hojai.memory();
await memory.save({ type: 'fact', content: 'Meeting at 3pm' });

// Use with Twins
const twins = await hojai.twins();
const customer = await twins.load('customer', 'cust_123');
```

## Features

- **Authentication** - API key and OAuth support
- **Multi-tenancy** - Tenant isolation and management
- **Permissions** - Role-based access control
- **Events** - Real-time event system
- **Logging** - Structured logging with levels
- **Runtime** - Execution context management

## Modules

### Client

```typescript
import { createClient } from '@hojai/core';

const hojai = createClient({
  apiUrl: 'https://api.hojai.ai',
  apiKey: 'your-api-key',
  timeout: 30000,
  logLevel: 'info',
});
```

### Authentication

```typescript
// API Key
const hojai = createClient({ apiKey: 'your-key' });

// Login with email/password
await hojai.auth.login('user@example.com', 'password');
```

### Events

```typescript
hojai.events.on('agent.executed', (data) => {
  console.log('Agent executed:', data);
});

hojai.events.subscribe('flow.completed', (data) => {
  console.log('Flow completed:', data);
});
```

### Multi-tenancy

```typescript
// Create tenant
const tenant = await hojai.multiTenancy.create({
  name: 'Acme Corp',
  plan: 'enterprise',
});

// Use tenant context
const scoped = hojai.multiTenancy.forTenant(tenant.id);
```

### Permissions

```typescript
const perms = hojai.permissions;

// Check permission
const allowed = await perms.check(
  { type: 'agent', id: 'agent_123' },
  'memory:write'
);

// Grant permission
await perms.grant({ type: 'agent', id: 'agent_456' }, 'memory:read');
```

## API Reference

See full documentation at [docs.hojai.ai](https://docs.hojai.ai)
