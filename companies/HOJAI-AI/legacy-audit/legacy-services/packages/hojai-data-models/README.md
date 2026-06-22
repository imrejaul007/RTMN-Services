# @hojai/data-models

**Shared Data Models**

---

## Overview

TypeScript types and Zod schemas for Hojai AI platform.

## Features

- Type-safe models
- Runtime validation
- Serialization
- Documentation

## Quick Start

```bash
npm install @hojai/data-models
```

```typescript
import { Tenant, User, Event } from '@hojai/data-models';
import { z } from 'zod';

// Validate data
const validated = User.parse(rawData);

// Create with types
const user = new User({
  id: 'user_123',
  tenantId: 'tenant_abc',
  email: 'user@example.com'
});
```

## Models

| Model | Description |
|-------|-------------|
| Tenant | Multi-tenant organization |
| User | Platform user |
| Event | System event |
| Session | User session |
| AuditLog | Audit trail |

---

**Status:** Production Ready
