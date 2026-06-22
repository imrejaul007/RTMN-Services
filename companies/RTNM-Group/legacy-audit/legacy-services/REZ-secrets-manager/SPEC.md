# REZ Secrets Manager - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Security

---

## Overview

Vault-based secrets management service for the REZ ecosystem. Provides secure storage, encryption, access control, and automatic rotation of sensitive credentials.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REZ Secrets Manager                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Vault Storage    → Encrypted secrets storage                         │
│  ├── Encryption Engine → AES-256 encryption                               │
│  ├── Access Control   → Role-based secret access                          │
│  └── Rotation Scheduler → Automatic secret rotation                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Secret
```typescript
{
  secretId: string
  name: string
  value: string
  encryptedValue: string
  version: number
  serviceId: string
  metadata: Record<string, any>
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

### AccessGrant
```typescript
{
  grantId: string
  secretId: string
  serviceId: string
  permissions: ('read' | 'write' | 'delete')[]
  grantedBy: string
  grantedAt: Date
  expiresAt?: Date
}
```

---

## API Endpoints

### Secrets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/secrets` | Create secret |
| GET | `/secrets/:id` | Get secret |
| PUT | `/secrets/:id` | Update secret |
| DELETE | `/secrets/:id` | Delete secret |
| POST | `/secrets/:id/rotate` | Rotate secret |

### Access
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/access` | Grant access |
| GET | `/access/:secretId` | List access grants |
| DELETE | `/access/:grantId` | Revoke access |

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
  "axios": "^1.6.7",
  "zod": "^3.22.4",
  "winston": "^3.11.0",
  "bcryptjs": "^2.4.3",
  "uuid": "^9.0.1",
  "jsonwebtoken": "^9.0.2",
  "crypto-js": "^4.2.0",
  "node-cron": "^3.0.3",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "express-rate-limit": "^7.2.0",
  "morgan": "^1.10.0"
}
```

---

## Status

- [x] Secret storage
- [x] Encryption
- [x] Access control
- [x] Secret rotation

