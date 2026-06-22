# REZ Integration Hub - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Digital
**Category:** Integration

---

## Overview

Central integration hub connecting all REZ services and external platforms. Provides unified API gateway, service orchestration, and cross-platform data synchronization.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REZ Integration Hub                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── API Gateway     → Unified service entry point                       │
│  ├── Service Router  → Request routing to services                       │
│  ├── Event Bus      → Cross-service event handling                      │
│  ├── Sync Manager   → Data synchronization                              │
│  └── Monitoring     → Integration health tracking                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integrations

| Platform | Services |
|----------|----------|
| RABTUL | Auth, Wallet, Payment, Order |
| REZ Intelligence | Intent, Predictions |
| REZ-Media | Ads, Karma, DOOH |
| CorpPerks | Benefits, Corporate |
| StayOwn | Hotels, Bookings |
| External | Third-party integrations |

---

## Data Models

### Integration
```typescript
{
  integrationId: string
  name: string
  provider: string
  type: 'inbound' | 'outbound' | 'bidirectional'
  endpoints: string[]
  authConfig: Record<string, string>
  status: 'active' | 'inactive' | 'error'
  lastSync?: Date
}
```

### SyncJob
```typescript
{
  jobId: string
  integrationId: string
  type: 'full' | 'incremental'
  status: 'queued' | 'running' | 'completed' | 'failed'
  recordsProcessed: number
  errors: string[]
  startedAt?: Date
  completedAt?: Date
}
```

---

## API Endpoints

### Integrations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/integrations` | List integrations |
| POST | `/integrations` | Add integration |
| PUT | `/integrations/:id` | Update integration |
| DELETE | `/integrations/:id` | Remove integration |

### Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sync/trigger` | Trigger sync |
| GET | `/sync/jobs` | List sync jobs |
| GET | `/sync/jobs/:id` | Job details |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Status

- [x] Service gateway
- [x] Multi-platform integration
- [x] Data synchronization
- [x] Event orchestration

