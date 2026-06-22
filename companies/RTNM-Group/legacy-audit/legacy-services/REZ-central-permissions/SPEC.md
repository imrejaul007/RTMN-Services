# REZ Central Permissions - SPEC.md

**Version:** 1.0.0
**Company:** RTNM-Group
**Category:** Security

---

## Overview

Centralized permissions system for REZ Commerce OS. Hybrid RBAC + ABAC engine providing fine-grained access control across all platform services.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REZ Central Permissions Service                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── RBAC Module    → Role definitions, permissions                       │
│  ├── ABAC Module    → Attribute-based policies                            │
│  ├── Policy Store   → Redis-cached policy storage                         │
│  └── JWT Validator  → Token-based authentication                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Role
```typescript
{
  roleId: string
  name: string
  permissions: string[]
  parentRole?: string
  metadata: Record<string, any>
}
```

### Policy
```typescript
{
  policyId: string
  name: string
  effect: 'allow' | 'deny'
  principals: string[]
  actions: string[]
  resources: string[]
  conditions?: Record<string, any>
}
```

---

## API Endpoints

### Roles
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/roles` | Create role |
| GET | `/roles` | List roles |
| PUT | `/roles/:id` | Update role |
| DELETE | `/roles/:id` | Delete role |

### Policies
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/policies` | Create policy |
| GET | `/policies` | List policies |
| PUT | `/policies/:id` | Update policy |

### Authorization
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/check` | Authorization check |
| POST | `/evaluate` | Full policy evaluation |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "ioredis": "^5.3.2",
  "jsonwebtoken": "^9.0.2",
  "uuid": "^9.0.1",
  "zod": "^3.22.4"
}
```

---

## Status

- [x] RBAC engine
- [x] ABAC policies
- [x] Redis caching
- [x] JWT validation

