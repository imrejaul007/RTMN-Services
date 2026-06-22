# REZ Admin Service - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Admin

---

## Overview

Core admin dashboard and management service for REZ platform. Provides administrative functions including user management, service configuration, and operational controls.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REZ Admin Service                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── User Management  → Admin user CRUD                                  │
│  ├── Service Admin    → Service configuration                           │
│  ├── Auth Middleware  → Admin authentication                           │
│  └── Audit Logger     → Admin action logging                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### AdminUser
```typescript
{
  userId: string
  email: string
  passwordHash: string
  role: 'superadmin' | 'admin' | 'support'
  permissions: string[]
  mfaEnabled: boolean
  createdAt: Date
  lastLogin?: Date
}
```

### AdminAction
```typescript
{
  actionId: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  metadata: Record<string, any>
  ipAddress: string
  timestamp: Date
}
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Admin login |
| POST | `/auth/mfa/verify` | MFA verification |
| POST | `/auth/logout` | Admin logout |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users |
| GET | `/users/:id` | User details |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Deactivate user |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/services` | List services |
| GET | `/services/:id` | Service details |
| PUT | `/services/:id/config` | Update config |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "express": "^4.21.2",
  "cors": "^2.8.5",
  "helmet": "^8.0.0",
  "express-rate-limit": "^7.1.5",
  "mongoose": "^8.17.2",
  "uuid": "^14.0.0",
  "winston": "^3.17.0",
  "zod": "^3.23.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "otplib": "^12.0.1",
  "qrcode": "^1.5.4"
}
```

---

## Status

- [x] Admin authentication
- [x] MFA support
- [x] User management
- [x] Service configuration
- [x] Action auditing

