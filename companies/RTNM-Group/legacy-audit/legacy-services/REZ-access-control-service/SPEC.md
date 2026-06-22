# REZ Access Control Service - SPEC.md

**Version:** 1.0.0
**Company:** RTNM-Group
**Category:** Security

---

## Overview

Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC) service for the REZ ecosystem. Provides fine-grained authorization decisions based on user roles and attributes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REZ Access Control Service                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── RBAC Engine    → Role definitions, permissions                        │
│  ├── ABAC Engine    → Attribute-based policies                            │
│  └── Policy Evaluator → Authorization decisions                           │
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
  description: string
  createdAt: Date
  updatedAt: Date
}
```

### Policy
```typescript
{
  policyId: string
  name: string
  effect: 'allow' | 'deny'
  actions: string[]
  resources: string[]
  conditions: Record<string, any>
}
```

### AccessDecision
```typescript
{
  decisionId: string
  principal: string
  action: string
  resource: string
  allowed: boolean
  reason: string
  evaluatedAt: Date
}
```

---

## API Endpoints

### Roles
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/roles` | Create role |
| GET | `/roles` | List roles |
| GET | `/roles/:id` | Get role |
| PUT | `/roles/:id` | Update role |
| DELETE | `/roles/:id` | Delete role |

### Policies
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/policies` | Create policy |
| GET | `/policies` | List policies |
| GET | `/policies/:id` | Get policy |
| PUT | `/policies/:id` | Update policy |

### Authorization
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/authorize` | Check authorization |
| POST | `/authorize/batch` | Batch authorization |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "uuid": "^9.0.1",
  "winston": "^3.11.0",
  "zod": "^3.22.4"
}
```

---

## Status

- [x] RBAC engine
- [x] ABAC policies
- [x] Authorization decisions
- [x] Batch evaluation

