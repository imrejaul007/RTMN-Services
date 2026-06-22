# RBAC - Role-Based Access Control

**Service:** RBAC (Roles, Permissions, Policies)
**Port:** 4702 (via gateway)
**Prefix:** `/api/roles`, `/api/permissions`, `/api/access`

---

## Overview

The RBAC service provides comprehensive role-based and attribute-based access control. It includes 8 system roles, 40+ permissions, policies, and feature flags.

## Features

- **8 System Roles:** From superadmin to guest
- **40+ Permissions:** Granular permission system
- **Custom Roles:** Create organization-specific roles
- **Wildcard Permissions:** `org:*` style patterns
- **Permission Hierarchy:** Role inheritance
- **ABAC Policies:** Attribute-based conditions
- **Feature Flags:** Percentage rollouts, user targeting
- **Permission Checking:** Single, batch, and dynamic checks
- **Wildcard Expansion:** Auto-expand wildcards

## System Roles

| Role | Scope | Level | Description |
|------|-------|-------|-------------|
| `superadmin` | global | 100 | Full system access |
| `org-owner` | organization | 90 | Organization owner |
| `org-admin` | organization | 80 | Organization administrator |
| `department-manager` | department | 60 | Department manager |
| `team-lead` | team | 50 | Team lead |
| `member` | organization | 10 | Standard member |
| `viewer` | organization | 5 | Read-only access |
| `guest` | organization | 1 | Limited guest |

## Permission Categories

| Category | Examples |
|----------|----------|
| `organization` | org:read, org:write, org:settings:read |
| `department` | dept:read, dept:write, dept:members:manage |
| `team` | team:read, team:write, team:members:add |
| `user` | user:read, user:write, user:password:change |
| `role` | role:read, role:write, role:assign |
| `api-key` | api-key:read, api-key:write, api-key:delete |
| `session` | session:read, session:manage |
| `audit` | audit:read, audit:export |
| `billing` | billing:read, billing:write |
| `system` | system:*, * |

## API Endpoints

### Roles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roles` | List all roles |
| GET | `/api/roles/:id` | Get role details |
| POST | `/api/roles` | Create custom role |
| PUT | `/api/roles/:id` | Update role |
| DELETE | `/api/roles/:id` | Delete role |

### Permissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/permissions` | List permissions |
| GET | `/api/permissions?category=organization` | Filter by category |

### Feature Flags
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/features` | List all flags |
| GET | `/api/features/:key/evaluate` | Check flag for user |

### Access Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/access/check` | Check single permission |
| POST | `/api/access/batch-check` | Check multiple permissions |
| GET | `/api/access/permissions` | Get my permissions |

## Usage Example

```bash
# List roles
curl http://localhost:4702/api/roles \
  -H "Authorization: Bearer $TOKEN"

# Create custom role
curl -X POST http://localhost:4702/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom-role",
    "displayName": "Custom Role",
    "description": "A custom role",
    "permissions": ["org:read", "dept:read", "team:*"]
  }'

# Check permission
curl -X POST http://localhost:4702/api/access/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permission": "org:read"
  }'

# Batch check
curl -X POST http://localhost:4702/api/access/batch-check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["org:read", "dept:write", "team:read"]
  }'
```

## Wildcard Permissions

Use `*` to match all or `category:*` to match category:

| Pattern | Matches |
|---------|---------|
| `*` | All permissions |
| `org:*` | All organization permissions |
| `dept:read` | Specific permission |
| `team:*` | All team permissions |

## Role Hierarchy

Roles have a hierarchy level (lower = less privileged):

```
superadmin (100) > org-owner (90) > org-admin (80) > department-manager (60) > team-lead (50) > member (10) > viewer (5) > guest (1)
```

## File Structure

```
RBAC/
├── src/
│   ├── models/
│   │   └── rbac.model.js
│   └── services/
│       └── rbac.service.js
└── CLAUDE.md
```