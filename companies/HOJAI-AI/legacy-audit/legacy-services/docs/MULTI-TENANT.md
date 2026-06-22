# HOJAI V2 MULTI-TENANT ARCHITECTURE
**Version:** 1.0 | **Date:** May 29, 2026 | **Status:** DESIGN

---

## Overview

This document defines the multi-tenant architecture for Hojai v2.

Every Hojai Core service must support multi-tenancy from Day 1.

---

## Tenant Model

### 1.1 Tenant Hierarchy

```
Organization
    │
    └── Tenant (e.g., XYZ Retail, ABC Hospital, REZ)
            │
            └── Users (Admin, Agents, Customers)
                    │
                    └── API Keys (Service Accounts)
```

---

### 1.2 Tenant Types

| Type | Description | Example |
|------|-------------|---------|
| **Internal (REZ)** | Privileged access to REZ data | REZ Intelligence |
| **Commercial** | External paying clients | XYZ Retail, ABC Hospital |
| **Industry** | Platform-wide patterns | Jewellery Brain, Healthcare Brain |

---

### 1.3 Tenant Identifiers

```typescript
interface TenantIdentifier {
  tenant_id: string;       // UUID, unique across platform
  organization_id: string; // UUID, unique within tenant
  namespace: string;      // Database namespace: {tenant_id}_data
  display_name: string;   // Human readable: "XYZ Retail"
  type: 'internal' | 'commercial' | 'industry';
  industry?: string;       // For commercial: 'retail', 'healthcare', etc.
}
```

---

## Tenant Context

### 2.1 Tenant Context Object

Every request must include tenant context:

```typescript
// hojai-core/shared/types/tenant.ts

export interface TenantContext {
  // Required
  tenant_id: string;
  namespace: string;
  tenant_type: 'internal' | 'commercial' | 'industry';

  // Optional
  organization_id?: string;
  user_id?: string;

  // Roles & Permissions
  roles: string[];
  permissions: string[];

  // Metadata
  plan?: 'starter' | 'professional' | 'enterprise';
  limits?: TenantLimits;
}

export interface TenantLimits {
  max_users: number;
  max_api_calls: number;
  max_storage: number;
  rate_limit: number; // requests per minute
}

export interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}
```

---

### 2.2 Tenant Middleware

```typescript
// hojai-core/shared/middleware/tenant.ts

import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../types/tenant';

export const tenantMiddleware = () => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Extract tenant from header
    const tenant_id = req.headers['x-tenant-id'] as string;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'X-Tenant-Id header is required'
        }
      });
    }

    // Validate tenant exists and is active
    const tenant = await TenantService.getById(tenant_id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant not found'
        }
      });
    }

    if (!tenant.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_INACTIVE',
          message: 'Tenant account is inactive'
        }
      });
    }

    // Build tenant context
    const tenantContext: TenantContext = {
      tenant_id: tenant.id,
      namespace: `tenant_${tenant.id}`,
      tenant_type: tenant.type,
      organization_id: req.headers['x-organization-id'] as string,
      user_id: req.headers['x-user-id'] as string,
      roles: parseHeaderList(req.headers['x-roles']),
      permissions: await PermissionService.getForTenant(tenant.id),
      plan: tenant.plan,
      limits: tenant.limits
    };

    // Attach to request
    req.tenantContext = tenantContext;

    // Also attach to response for logging
    res.locals.tenant_id = tenant.id;

    next();
  };
};
```

---

### 2.3 Usage in Routes

```typescript
// Example: Customer routes

router.get('/customers',
  tenantMiddleware(),
  async (req: RequestWithTenant, res: Response) => {
    const { tenant_id } = req.tenantContext;

    // All queries are tenant-scoped
    const customers = await db.customers.findMany({
      where: { tenant_id }
    });

    res.json({
      success: true,
      data: customers,
      meta: { tenant_id }
    });
  }
);
```

---

## Database Isolation

### 3.1 Isolation Strategy

**Day 1:** Tenant ID column (simplest)
**Later:** Per-tenant database (compliance requirement)

---

### 3.2 Tenant ID Column Approach

```typescript
// Every collection has tenant_id
interface BaseDocument {
  _id: ObjectId;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

// Example: Customers collection
interface Customer extends BaseDocument {
  name: string;
  email: string;
  phone: string;
  preferences: Record<string, any>;
}

// Query helper - automatically adds tenant_id
export const tenantQuery = <T extends BaseDocument>(
  collection: Collection<T>,
  tenant_id: string
) => {
  return {
    findMany: (filter?: Partial<T>) =>
      collection.find({ ...filter, tenant_id }),
    findOne: (filter: Partial<T>) =>
      collection.findOne({ ...filter, tenant_id }),
    create: (data: Omit<T, keyof BaseDocument>) =>
      collection.insertOne({ ...data, tenant_id }),
    updateOne: (filter: Partial<T>, update: Partial<T>) =>
      collection.updateOne({ ...filter, tenant_id }, { $set: update }),
    deleteOne: (filter: Partial<T>) =>
      collection.deleteOne({ ...filter, tenant_id }),
  };
};
```

---

### 3.3 Usage

```typescript
// Before (NO tenant isolation - DANGEROUS)
const customers = await db.customers.find();

// After (tenant scoped - SAFE)
const customers = await tenantQuery(db.customers, tenant_id).findMany();

// Or with the helper
const customers = db.customers.find({ tenant_id });
```

---

### 3.4 Mongoose Plugin

```typescript
// hojai-core/shared/middleware/tenant-plugin.ts

import mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { getTenantId } from './tenant-context';

// Plugin to auto-add tenant_id to queries
export const tenantPlugin = (schema: Schema) => {
  // Add tenant_id field
  schema.add({
    tenant_id: {
      type: String,
      required: true,
      index: true
    }
  });

  // Add created/updated
  schema.add({
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  });

  // Pre-save hook to auto-set tenant_id
  schema.pre('save', function(next) {
    if (this.isNew && !this.tenant_id) {
      const tenant_id = getTenantId();
      if (tenant_id) {
        this.tenant_id = tenant_id;
      }
    }
    this.updated_at = new Date();
    next();
  });

  // Index for efficient tenant queries
  schema.index({ tenant_id: 1, _id: 1 });
};

// Usage
const customerSchema = new Schema({
  name: String,
  email: String
});

customerSchema.plugin(tenantPlugin);
```

---

### 3.5 Per-Tenant Database (Later)

```typescript
// For compliance-heavy tenants (healthcare, finance)

const tenantDatabases: Record<string, mongoose.Connection> = {};

export const getTenantConnection = async (tenant_id: string) => {
  if (!tenantDatabases[tenant_id]) {
    const db = mongoose.createConnection(
      `mongodb://host/${tenant_id}_data`,
      { /* options */ }
    );
    tenantDatabases[tenant_id] = db;
  }
  return tenantDatabases[tenant_id];
};
```

---

## API Isolation

### 4.1 API Key Authentication

```typescript
// hojai-core/shared/middleware/api-key.ts

import { Request, Response, NextFunction } from 'express';

export const apiKeyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: { code: 'MISSING_API_KEY' }
    });
  }

  // Lookup API key
  const keyRecord = await ApiKeyService.getByKey(apiKey);

  if (!keyRecord) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_API_KEY' }
    });
  }

  // Check if key is active
  if (!keyRecord.is_active) {
    return res.status(401).json({
      success: false,
      error: { code: 'API_KEY_INACTIVE' }
    });
  }

  // Attach tenant context from API key
  req.tenantContext = {
    tenant_id: keyRecord.tenant_id,
    namespace: `tenant_${keyRecord.tenant_id}`,
    tenant_type: keyRecord.tenant_type,
    organization_id: keyRecord.organization_id,
    user_id: undefined, // API keys don't have user context
    roles: keyRecord.roles,
    permissions: keyRecord.permissions
  };

  next();
};
```

---

### 4.2 Rate Limiting Per Tenant

```typescript
// hojai-core/shared/middleware/rate-limit.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

export const tenantRateLimiter = () => {
  return rateLimit({
    // Use Redis for distributed rate limiting
    store: new RedisStore({
      // @ts-expect-error - Known issue with types
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),

    // Key by tenant_id
    keyGenerator: (req) => {
      return req.tenantContext?.tenant_id || req.ip;
    },

    // Tenant-specific limits
    max: (req) => {
      return req.tenantContext?.limits?.rate_limit || 100;
    },

    windowMs: 60 * 1000, // 1 minute

    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    }
  });
};
```

---

## Event Isolation

### 5.1 Tenant-Tagged Events

```typescript
// Every event includes tenant_id

interface HojaiEvent {
  id: string;
  tenant_id: string;       // REQUIRED
  type: string;
  source: string;
  timestamp: string;
  correlationId?: string;
  causationId?: string;
  data: Record<string, any>;
}

// Publishing with tenant context
export const publishEvent = async (
  req: RequestWithTenant,
  type: string,
  data: Record<string, any>
) => {
  const event: HojaiEvent = {
    id: crypto.randomUUID(),
    tenant_id: req.tenantContext.tenant_id,
    type,
    source: 'hojai-service',
    timestamp: new Date().toISOString(),
    data
  };

  await eventBus.publish(type, event);
};
```

---

### 5.2 Event Subscriptions

```typescript
// Subscribe only to tenant-specific events

// Subscribe to all events for tenant
eventBus.subscribe({
  tenant_id: 'xyz-retail',
  eventType: 'order.*',
  handler: async (event) => {
    // Process event
  }
});

// Industry brain subscribes to anonymous patterns
eventBus.subscribe({
  industry: 'jewellery',
  eventType: 'purchase.pattern',
  handler: async (event) => {
    // Process anonymous pattern
    // NO tenant_id in event data
  }
});
```

---

## Cache Isolation

### 6.1 Tenant-Prefixed Keys

```typescript
// All cache keys are tenant-prefixed

export const cacheKey = {
  customer: (tenant_id: string, id: string) =>
    `tenant:${tenant_id}:customer:${id}`,

  session: (tenant_id: string, sessionId: string) =>
    `tenant:${tenant_id}:session:${sessionId}`,

  rateLimit: (tenant_id: string) =>
    `tenant:${tenant_id}:rate_limit`,

  feature: (tenant_id: string, featureId: string) =>
    `tenant:${tenant_id}:feature:${featureId}`
};

// Usage
await redis.set(
  cacheKey.customer(tenant_id, customer_id),
  JSON.stringify(customer),
  'EX', // expire
  3600  // 1 hour
);
```

---

## Storage Isolation

### 7.1 File Storage

```typescript
// Files are stored in tenant-prefixed paths

export const storagePath = {
  uploads: (tenant_id: string) =>
    `/uploads/${tenant_id}`,

  exports: (tenant_id: string) =>
    `/exports/${tenant_id}`,

  backups: (tenant_id: string) =>
    `/backups/${tenant_id}`
};

// Usage with S3-compatible storage
const uploadFile = async (
  tenant_id: string,
  file: Buffer,
  filename: string
) => {
  const key = `${storagePath.uploads(tenant_id)}/${filename}`;

  return s3.putObject({
    Bucket: 'hojai-storage',
    Key: key,
    Body: file
  });
};
```

---

## Logging & Audit

### 8.1 Tenant-Context Logging

```typescript
// All logs include tenant context

import { createLogger } from './logger';

export const tenantLogger = (tenant_id: string) => {
  return createLogger({
    tenant_id,
    // other options
  });
};

// Usage
const logger = tenantLogger(req.tenantContext.tenant_id);

logger.info('Processing customer', {
  customer_id: customer.id,
  action: 'create'
});
```

---

### 8.2 Audit Trail

```typescript
// Every tenant action is audited

interface AuditLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

// Create audit log
export const auditLog = async (
  req: RequestWithTenant,
  action: string,
  resource: string,
  details?: Record<string, any>
) => {
  await db.audit_logs.insert({
    tenant_id: req.tenantContext.tenant_id,
    user_id: req.tenantContext.user_id,
    action,
    resource,
    details,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
};
```

---

## Migration Checklist

### Multi-Tenant Implementation

- [ ] Tenant middleware created
- [ ] Tenant types defined
- [ ] Tenant context attached to requests
- [ ] All database queries tenant-scoped
- [ ] All cache keys tenant-prefixed
- [ ] All file paths tenant-prefixed
- [ ] All events include tenant_id
- [ ] Rate limiting per tenant
- [ ] API key auth per tenant
- [ ] Audit logging per tenant

---

*Document Version: 1.0*
*Last Updated: May 29, 2026*
