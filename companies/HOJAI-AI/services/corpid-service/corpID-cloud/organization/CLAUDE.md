# Organization Identity

**Service:** Multi-Tenant Organization Management
**Port:** 4702 (via gateway)
**Prefix:** `/api/organizations`

---

## Overview

The Organization Identity service provides multi-tenant organization management with hierarchical structure (Organization → Departments → Teams → Members). It's the foundation for Workforce OS, Sales OS, and other department-level services.

## Features

- **Multi-Tenant:** Full organization isolation
- **Hierarchical Structure:** Orgs → Departments → Teams
- **Member Management:** Roles, invitations, suspensions
- **Nested Departments:** Sub-departments supported
- **Teams:** Cross-functional or functional teams
- **Invitations:** Email-based with token verification
- **Statistics:** Member counts, department analytics
- **Business Scope:** Role-based business access control
- **Custom Domains:** Branded organization URLs
- **Identity Providers:** Per-org SSO configuration

## Organization Hierarchy

```
Organization
├── Departments (nested)
│   ├── Sub-departments
│   ├── Teams
│   │   └── Members
│   └── Head (User)
└── Members
    ├── Org Role
    ├── Department
    ├── Team Memberships
    └── Manager
```

## Organization Types

| Type | Description |
|------|-------------|
| `company` | For-profit company |
| `nonprofit` | Non-profit organization |
| `government` | Government agency |
| `individual` | Individual/solo |
| `educational` | Educational institution |

## Sizes

| Size | Employee Count |
|------|----------------|
| `startup` | 1-10 |
| `small` | 11-50 |
| `medium` | 51-200 |
| `large` | 201-1000 |
| `enterprise` | 1000+ |

## API Endpoints

### Organizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/organizations` | Create organization |
| GET | `/api/organizations` | List organizations |
| GET | `/api/organizations/:id` | Get organization |
| PUT | `/api/organizations/:id` | Update organization |
| DELETE | `/api/organizations/:id` | Delete organization |
| GET | `/api/organizations/:id/stats` | Get statistics |
| GET | `/api/organizations/:id/hierarchy` | Get hierarchy tree |

### Departments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/organizations/:orgId/departments` | Create department |
| GET | `/api/organizations/:orgId/departments` | List departments |
| GET | `/api/organizations/:orgId/departments/:id` | Get department |
| PUT | `/api/organizations/:orgId/departments/:id` | Update department |
| DELETE | `/api/organizations/:orgId/departments/:id` | Delete department |
| GET | `/api/organizations/:orgId/departments/:id/members` | Get members |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/organizations/:orgId/teams` | Create team |
| GET | `/api/organizations/:orgId/teams` | List teams |
| GET | `/api/organizations/:orgId/teams/:id` | Get team |
| PUT | `/api/organizations/:orgId/teams/:id` | Update team |
| DELETE | `/api/organizations/:orgId/teams/:id` | Delete team |
| POST | `/api/organizations/:orgId/teams/:id/members` | Add member |
| DELETE | `/api/organizations/:orgId/teams/:id/members/:userId` | Remove member |

### Memberships
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations/:orgId/members` | List members |
| GET | `/api/organizations/:orgId/members/:userId` | Get member |
| PUT | `/api/organizations/:orgId/members/:userId` | Update member |
| POST | `/api/organizations/:orgId/members/:userId/suspend` | Suspend |
| POST | `/api/organizations/:orgId/members/:userId/reactivate` | Reactivate |
| DELETE | `/api/organizations/:orgId/members/:userId` | Remove |

### Invitations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/organizations/:orgId/invitations` | Send invitation |
| GET | `/api/organizations/:orgId/invitations` | List invitations |
| POST | `/api/organizations/:orgId/invitations/:id/resend` | Resend |
| DELETE | `/api/organizations/:orgId/invitations/:id` | Cancel |
| POST | `/api/invitations/:token/accept` | Accept (public) |
| GET | `/api/invitations/:token` | View (public) |

## Usage Example

```bash
# Create organization
curl -X POST http://localhost:4702/api/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "slug": "acme-corp",
    "type": "company",
    "industry": "technology",
    "size": "medium"
  }'

# Create department
curl -X POST http://localhost:4702/api/organizations/ORG_ID/departments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering",
    "code": "ENG"
  }'

# Send invitation
curl -X POST http://localhost:4702/api/organizations/ORG_ID/invitations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "role": "member"
  }'
```

## File Structure

```
organization/
├── src/
│   ├── models/
│   │   └── organization.model.js
│   ├── services/
│   │   └── organization.service.js
│   └── routes/
│       └── organization.routes.js
└── CLAUDE.md
```