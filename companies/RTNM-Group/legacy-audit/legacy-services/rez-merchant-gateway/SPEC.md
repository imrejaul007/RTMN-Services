# REZ Merchant Gateway - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Integration

---

## Overview

Unified API gateway consolidating access to all merchant services. Provides a single entry point for merchant-facing APIs with routing, rate limiting, and authentication.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REZ Merchant Gateway                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Router           → Request routing to services                      │
│  ├── Rate Limiter     → Request throttling                               │
│  ├── Auth Middleware  → JWT validation                                   │
│  └── Response Handler → Unified response format                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### RouteConfig
```typescript
{
  routeId: string
  path: string
  method: string
  targetService: string
  targetPath: string
  auth: boolean
  rateLimit?: number
  timeout?: number
}
```

### GatewayMetrics
```typescript
{
  service: string
  totalRequests: number
  successRate: number
  avgLatency: number
  p99Latency: number
}
```

---

## API Endpoints

### Gateway
| Method | Endpoint | Description |
|--------|----------|-------------|
| * | `/api/*` | Proxy to merchant services |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/gateway/routes` | List routes |
| POST | `/gateway/routes` | Add route |
| DELETE | `/gateway/routes/:id` | Remove route |
| GET | `/gateway/metrics` | Gateway metrics |
| GET | `/gateway/metrics/:service` | Service metrics |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "axios": "^1.6.0",
  "zod": "^3.22.0",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "ioredis": "^5.3.0",
  "jsonwebtoken": "^9.0.0",
  "winston": "^3.11.0"
}
```

---

## Status

- [x] Route management
- [x] Rate limiting
- [x] JWT authentication
- [x] Service metrics
- [x] Request proxying

