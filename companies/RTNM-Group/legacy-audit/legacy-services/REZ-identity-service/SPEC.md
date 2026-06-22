# REZ Identity Service - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Identity

---

## Overview

Core identity graph and resolution service for unified user profiles. Resolves fragmented identities across platforms and maintains a unified customer view.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REZ Identity Service                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Identity Graph   → Relationship mapping                               │
│  ├── Resolution Engine → Identity merging/splitting                        │
│  ├── Profile Manager  → Unified profile data                              │
│  └── Link Tracker    → Cross-platform links                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Identity
```typescript
{
  identityId: string
  userId: string
  provider: string
  providerId: string
  email?: string
  phone?: string
  linkedAt: Date
  confidence: number
}
```

### UnifiedProfile
```typescript
{
  profileId: string
  masterId: string
  identities: string[]
  attributes: Record<string, any>
  createdAt: Date
  updatedAt: Date
}
```

---

## API Endpoints

### Identities
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/identities` | Add identity |
| GET | `/identities/:id` | Get identity |
| POST | `/identities/:id/link` | Link to master |
| POST | `/identities/:id/unlink` | Unlink identity |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profiles/:id` | Get profile |
| PUT | `/profiles/:id` | Update profile |
| GET | `/profiles/:id/identities` | Profile identities |

### Resolution
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/resolve` | Resolve identity |
| POST | `/merge` | Merge identities |
| POST | `/split` | Split identity |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "mongoose": "^8.2.0",
  "uuid": "^9.0.1",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "compression": "^1.7.4",
  "express-rate-limit": "^7.2.0",
  "joi": "^17.12.2",
  "winston": "^3.11.0",
  "crypto-js": "^4.2.0"
}
```

---

## Status

- [x] Identity graph
- [x] Profile resolution
- [x] Identity linking
- [x] Cross-platform resolution

