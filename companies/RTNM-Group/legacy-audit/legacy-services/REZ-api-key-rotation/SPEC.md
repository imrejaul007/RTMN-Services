# REZ API Key Rotation Service - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Security

---

## Overview

Automated API key rotation service for the REZ ecosystem. Manages lifecycle of API keys including generation, rotation, revocation, and notification.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REZ API Key Rotation Service                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Key Generator    → Secure key generation                              │
│  ├── Rotation Scheduler → Cron-based rotation                             │
│  ├── Key Store       → MongoDB-backed key storage                         │
│  └── Notifier        → Email alerts for rotation                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### APIKey
```typescript
{
  keyId: string
  keyHash: string
  keyPrefix: string
  serviceId: string
  permissions: string[]
  createdAt: Date
  expiresAt: Date
  lastRotated: Date
  rotationInterval: number
  status: 'active' | 'rotating' | 'revoked'
  metadata: Record<string, any>
}
```

### RotationLog
```typescript
{
  logId: string
  keyId: string
  rotatedAt: Date
  previousKeyHash: string
  newKeyHash: string
  triggeredBy: 'manual' | 'scheduled' | 'expiry'
}
```

---

## API Endpoints

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/keys` | Create API key |
| GET | `/keys` | List keys |
| GET | `/keys/:id` | Get key details |
| POST | `/keys/:id/rotate` | Rotate key |
| POST | `/keys/:id/revoke` | Revoke key |
| POST | `/keys/verify` | Verify key |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.3",
  "axios": "^1.6.2",
  "zod": "^3.22.4",
  "winston": "^3.11.0",
  "node-cron": "^3.0.3",
  "nodemailer": "^6.9.7",
  "crypto-js": "^4.2.0",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "express-rate-limit": "^7.1.5",
  "uuid": "^9.0.1"
}
```

---

## Status

- [x] Key generation
- [x] Automated rotation
- [x] Key revocation
- [x] Email notifications
- [x] Verification

