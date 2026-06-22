# @hojai/governance

**Multi-Tenant Governance**

---

## Overview

Authentication, authorization, RBAC, and tenant isolation.

## Features

- Multi-tenant isolation
- JWT authentication
- Role-based access control
- API keys
- Audit logging
- SSO/OAuth support

## Quick Start

```bash
npm install @hojai/governance
```

```typescript
import { Governance } from '@hojai/governance';

const gov = new Governance({ tenantId: 'merchant_123' });

// Create tenant
await gov.tenants.create({
  name: 'Acme Corp',
  plan: 'enterprise'
});

// Authenticate user
const token = await gov.auth.login({
  email: 'user@acme.com',
  password: 'xxx'
});

// Check permission
await gov.auth.checkPermission(token, 'orders:create');
```

## Roles

| Role | Permissions |
|------|-------------|
| admin | Full access |
| manager | Read/write + reports |
| staff | Read/write |
| viewer | Read only |

---

**Port:** 4501
**Status:** Production Ready
