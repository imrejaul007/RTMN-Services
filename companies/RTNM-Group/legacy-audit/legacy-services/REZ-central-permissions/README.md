# REZ Central Permissions System

A comprehensive **RBAC + ABAC hybrid permission engine** for REZ Commerce OS. This service provides centralized authorization, access control, and audit logging for all REZ microservices.

## Features

- **RBAC (Role-Based Access Control)**: Traditional role-based permissions with inheritance
- **ABAC (Attribute-Based Access Control)**: Dynamic policies based on user attributes, resources, and context
- **Policy Engine**: Flexible policy creation with multiple combination algorithms
- **Multi-Tenant Support**: Merchant, Consumer, Staff, and Admin permission scopes
- **API Key Authentication**: Programmatic access with rate limiting
- **Webhook Permissions**: Event-based access control
- **Comprehensive Audit Logging**: Full audit trail for compliance
- **High-Performance Caching**: Redis-backed permission caching
- **Middleware Integration**: Express.js middleware for easy integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Permission Engine                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   RBAC      │  │   ABAC      │  │   Policy Engine     │ │
│  │   Engine    │  │   Engine    │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          │                                   │
│                   ┌──────▼──────┐                             │
│                   │   Combine   │                             │
│                   │   Results   │                             │
│                   └──────┬──────┘                             │
├──────────────────────────┼───────────────────────────────────┤
│  ┌─────────────┐  ┌──────▼──────┐  ┌─────────────────────┐  │
│  │   Cache     │  │    Audit    │  │   Module Handlers   │  │
│  │   Layer     │  │    Logger   │  │  (Merchant/Consumer │  │
│  │             │  │             │  │   /Admin/Staff/API) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
# Clone the repository
git clone https://github.com/rez-commerce/REZ-central-permissions.git
cd REZ-central-permissions

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Build
npm run build

# Start
npm start
```

## Configuration

Create a `.env` file with the following variables:

```env
# Server
PORT=3001
NODE_ENV=development

# Redis Cache
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL_SECONDS=300

# JWT Secret for API Key Validation
JWT_SECRET=your-secret-key-here

# Audit Configuration
AUDIT_ENABLED=true
AUDIT_RETENTION_DAYS=90

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000

# Security
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# Policy Engine
POLICY_CACHE_TTL_SECONDS=600
MAX_POLICY_DEPTH=10

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## API Reference

### Permission Check

```typescript
POST /api/v1/permissions/check

// Request
{
  "user_id": "user_123",
  "user_type": "merchant",
  "roles": ["owner", "manager"],
  "attributes": { "tier": "gold" },
  "resource": "order",
  "resource_id": "order_456",
  "action": "read",
  "context": {
    "ip_address": "192.168.1.1",
    "device_trusted": true,
    "merchant_id": "merchant_789"
  }
}

// Response
{
  "granted": true,
  "reason": "Access granted via role: owner",
  "matched_policy": "merchant_owner",
  "evaluated_policies": ["merchant_owner", "merchant_time_restricted"],
  "evaluation_time_ms": 2
}
```

### Batch Permission Check

```typescript
POST /api/v1/permissions/check-batch

// Request
{
  "user_id": "user_123",
  "user_type": "merchant",
  "roles": ["owner"],
  "attributes": {},
  "resource": "product",
  "resource_id": "product_789",
  "action": "create"
}

// Response (checks all CRUD actions)
{
  "create": { "granted": true, "reason": "..." },
  "read": { "granted": true, "reason": "..." },
  "update": { "granted": true, "reason": "..." },
  "delete": { "granted": true, "reason": "..." }
}
```

### Policy Management

```typescript
// Create policy
POST /api/v1/policies
{
  "id": "custom_policy_1",
  "name": "Restrict Order Delete",
  "type": "hybrid",
  "effect": "permit",
  "target": {
    "resources": ["order"],
    "actions": ["delete"]
  },
  "conditions": [...],
  "priority": 80,
  "enabled": true
}

// Create from template
POST /api/v1/policies/from-template
{
  "template": "timeRestricted",
  "params": {
    "name": "Business Hours Only",
    "roles": ["merchant", "staff"],
    "actions": ["create", "update", "delete"],
    "timeRegex": "^(0[8-9]|1[0-8]):[0-5][0-9]$"
  }
}
```

### Audit Query

```typescript
POST /api/v1/audit/query

// Request
{
  "user_id": "user_123",
  "decision": "denied",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "limit": 100
}

// Response
[
  {
    "id": "audit_789",
    "timestamp": "2024-01-15T10:30:00Z",
    "user_id": "user_123",
    "user_type": "merchant",
    "action": "delete",
    "resource": "order",
    "resource_id": "order_456",
    "decision": "denied",
    "reason": "No matching permission found",
    "matched_policy": null,
    "evaluation_time_ms": 1
  }
]
```

## Usage Examples

### Express Middleware Integration

```typescript
import { PermissionEngine } from '@rez-commerce/central-permissions';

const engine = new PermissionEngine();

// Middleware factory
function requirePermission(resource: string, action: string) {
  return async (req, res, next) => {
    const result = await engine.check({
      user_id: req.user.id,
      user_type: req.user.type,
      roles: req.user.roles,
      attributes: req.user.attributes,
      resource,
      action,
      context: {
        ip_address: req.ip,
        device_trusted: req.user.device_trusted,
      }
    });

    if (!result.granted) {
      return res.status(403).json({ error: 'Forbidden', reason: result.reason });
    }

    next();
  };
}

// Usage
app.delete('/orders/:id', requirePermission('order', 'delete'), orderController.delete);
```

### Programmatic Usage

```typescript
import { PermissionEngine } from '@rez-commerce/central-permissions';

const engine = new PermissionEngine();

// Check single permission
const result = await engine.check({
  user_id: 'user_123',
  user_type: 'merchant',
  roles: ['owner'],
  attributes: { merchant_id: 'merchant_456' },
  resource: 'order',
  action: 'create',
  context: {
    amount_threshold: 5000,
    merchant_id: 'merchant_456'
  }
});

console.log(result.granted); // true/false
console.log(result.reason); // Explanation
```

## Policy Templates

Available templates for quick policy creation:

| Template | Description |
|----------|-------------|
| `roleBased` | Grant access based on user role |
| `resourceOwnership` | Grant access to resource owners |
| `timeRestricted` | Grant access during specified hours |
| `amountThreshold` | Grant access based on transaction amount |
| `ipRestricted` | Grant access from specified IPs |
| `trustedDevice` | Extended access for trusted devices |
| `locationRestricted` | Grant access based on location |
| `rateLimited` | Apply rate limiting to access |
| `mfaRequired` | Require MFA for sensitive operations |
| `adminUnrestricted` | System admins have unrestricted access |

## Permission Model

```typescript
interface PermissionCheck {
  // Who
  user_id: string;
  user_type: 'merchant' | 'consumer' | 'staff' | 'system';
  roles: string[];
  attributes: Record<string, any>;

  // What resource
  resource: string;
  resource_id: string;

  // What action
  action: 'create' | 'read' | 'update' | 'delete';

  // Context
  context: {
    ip_address?: string;
    device_trusted?: boolean;
    location?: string;
    time_range?: { start: string; end: string };
    amount_threshold?: number;
  };

  // Decision
  granted: boolean;
  reason: string;
  policy_matched: string;
}
```

## Deployment

### Render.com

```bash
# Deploy using render.yaml
render blueprint apply
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rez-central-permissions
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rez-central-permissions
  template:
    spec:
      containers:
        - name: permissions
          image: rez-commerce/central-permissions:latest
          ports:
            - containerPort: 3001
          env:
            - name: NODE_ENV
              value: production
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: rez-secrets
                  key: redis-url
```

## License

MIT License - REZ Commerce OS
