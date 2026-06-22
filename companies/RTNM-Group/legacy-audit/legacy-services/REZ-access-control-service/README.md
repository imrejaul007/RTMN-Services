# REZ Access Control Service

A comprehensive access control service implementing RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control) with policy management, audit logging, and permission management capabilities.

## Features

- **RBAC Engine**: Role-based access control with hierarchical roles
- **ABAC Engine**: Attribute-based policies with complex condition evaluation
- **Policy Engine**: Unified policy evaluation combining RBAC and ABAC
- **Permission Manager**: Fine-grained permission management with constraints
- **Audit Logging**: Complete access attempt logging and querying
- **Role Definitions**: Comprehensive role templates and customization

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the service
npm start

# Development mode with hot reload
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

### Access Control
```
POST /api/v1/access/check
Body: {
  "userId": "user123",
  "resource": "documents:123",
  "action": "read",
  "attributes": {},
  "environment": {}
}
```

### User Permissions
```
GET /api/v1/users/:userId/permissions
```

### Role Management
```
GET  /api/v1/roles
GET  /api/v1/roles/:roleId
```

### Policy Management
```
GET  /api/v1/policies
POST /api/v1/policies
```

### Audit Logs
```
GET /api/v1/audit/logs?userId=xxx&startDate=xxx&endDate=xxx
```

### Resource Attributes
```
GET  /api/v1/resources/:resourceId/attributes
PUT  /api/v1/resources/:resourceId/attributes
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Access Control Service                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │  RBAC Engine │  │  ABAC Engine │  │  Policy Engine  │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
│         │                │                  │               │
│         └────────────────┼──────────────────┘              │
│                          │                                  │
│                  ┌───────┴───────┐                         │
│                  │ Permission    │                         │
│                  │ Manager       │                         │
│                  └───────────────┘                         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐                         │
│  │ Role        │  │ Audit       │                         │
│  │ Definitions │  │ Logging     │                         │
│  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Access Evaluation Flow

1. **RBAC Check**: Evaluate user roles and permissions
2. **ABAC Evaluation**: Check attribute-based policies
3. **Policy Engine**: Apply custom policies with obligations
4. **Audit Log**: Record the access decision

## Default Roles

| Role | Level | Description |
|------|-------|-------------|
| Super Admin | 100 | Unlimited access |
| Admin | 90 | Administrative access |
| Moderator | 70 | Content moderation |
| Editor | 50 | Content creation |
| Viewer | 10 | Read-only access |
| Guest | 1 | Minimal access |

## Configuration

Environment variables:
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging level (default: info)
- `NODE_ENV`: Environment mode
- `AUDIT_RETENTION_DAYS`: Audit log retention period

## Policy Conditions

Supported operators:
- `eq`, `ne`: Equality operators
- `gt`, `lt`, `gte`, `lte`: Comparison operators
- `in`: Value in array
- `contains`: String/array containment
- `matches`: Regex matching
- `exists`: Value existence check
- `and`, `or`, `not`: Logical operators

## License

Proprietary - REZ Technologies Inc.
