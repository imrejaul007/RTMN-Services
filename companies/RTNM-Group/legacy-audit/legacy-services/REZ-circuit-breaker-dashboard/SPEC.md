# REZ Circuit Breaker Dashboard - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Infrastructure

---

## Overview

Real-time monitoring dashboard for circuit breaker states across the REZ ecosystem. Provides visibility into service health, failure rates, and circuit states.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 REZ Circuit Breaker Dashboard                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── WebSocket Server  → Real-time state updates                          │
│  ├── Redis Subscriber  → Circuit state changes                            │
│  ├── Dashboard UI      → Visual monitoring                                │
│  └── Alert Manager     → Notification triggers                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### CircuitState
```typescript
{
  serviceId: string
  circuitId: string
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failureCount: number
  successCount: number
  lastFailure: Date
  lastSuccess: Date
  threshold: number
  timeout: number
}
```

### Alert
```typescript
{
  alertId: string
  circuitId: string
  serviceId: string
  type: 'OPEN' | 'CLOSE' | 'THRESHOLD'
  message: string
  severity: 'info' | 'warning' | 'critical'
  createdAt: Date
}
```

---

## API Endpoints

### Circuits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/circuits` | List all circuits |
| GET | `/circuits/:id` | Circuit details |
| GET | `/circuits/:id/history` | State history |
| POST | `/circuits/:id/reset` | Reset circuit |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alerts` | List alerts |
| GET | `/alerts/:id` | Alert details |
| POST | `/alerts/:id/acknowledge` | Acknowledge alert |

### WebSocket
| Event | Description |
|-------|-------------|
| `circuit:state` | Circuit state changed |
| `alert:new` | New alert triggered |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "socket.io": "^4.7.2",
  "ioredis": "^5.3.2",
  "zod": "^3.22.4",
  "winston": "^3.11.0",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "compression": "^1.7.4",
  "node-fetch": "^2.7.0",
  "uuid": "^9.0.1"
}
```

---

## Status

- [x] Real-time monitoring
- [x] WebSocket updates
- [x] Alert management
- [x] State history

