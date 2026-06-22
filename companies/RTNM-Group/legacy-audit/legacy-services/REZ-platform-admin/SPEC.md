# REZ Platform Admin - SPEC.md

**Version:** 1.0.0
**Port:** 3000
**Company:** RTNM-Group
**Category:** Admin

---

## Overview

Complete ecosystem control panel for REZ platform administration. Provides centralized management for companies, services, users, and AI models across the entire ecosystem.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REZ Platform Admin                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Company Manager  → Multi-company management                          │
│  ├── Service Registry → Service discovery and control                     │
│  ├── User Management  → Platform-wide user administration                 │
│  └── AI Model Registry → ML model management                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Company
```typescript
{
  companyId: string
  name: string
  slug: string
  services: string[]
  users: string[]
  settings: Record<string, any>
  createdAt: Date
}
```

### Service
```typescript
{
  serviceId: string
  name: string
  companyId: string
  category: string
  port: number
  status: 'active' | 'inactive' | 'maintenance'
  health: 'healthy' | 'degraded' | 'down'
}
```

### AdminUser
```typescript
{
  userId: string
  email: string
  role: 'superadmin' | 'companyadmin' | 'support'
  companyId?: string
  permissions: string[]
}
```

---

## API Endpoints

### Companies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List companies |
| POST | `/api/companies` | Create company |
| GET | `/api/companies/:id` | Company details |
| PUT | `/api/companies/:id` | Update company |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | List services |
| GET | `/api/services/:id` | Service details |
| PUT | `/api/services/:id/status` | Update status |
| GET | `/api/services/stats` | Platform statistics |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | User details |
| PUT | `/api/users/:id` | Update user |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Platform overview |
| GET | `/api/analytics/services` | Service metrics |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "next": "14.0.0",
  "react": "18.2.0",
  "react-dom": "18.2.0",
  "axios": "1.6.0",
  "recharts": "2.10.0",
  "lucide-react": "0.300.0",
  "date-fns": "2.30.0"
}
```

---

## Status

- [x] Company management
- [x] Service registry
- [x] User administration
- [x] Platform analytics

