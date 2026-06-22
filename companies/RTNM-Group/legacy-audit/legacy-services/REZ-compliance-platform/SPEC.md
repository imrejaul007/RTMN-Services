# REZ Compliance Platform - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Security

---

## Overview

Compliance management platform for GDPR, DPDP, and data protection regulations. Manages consent, audit trails, policy enforcement, and data subject rights requests.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REZ Compliance Platform                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Consent Manager   → Consent collection and tracking                   │
│  ├── Audit Logger     → Comprehensive audit trails                        │
│  ├── Policy Engine    → Data protection policies                          │
│  └── Rights Handler   → GDPR/DPDP data subject requests                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Consent
```typescript
{
  consentId: string
  userId: string
  purpose: string
  granted: boolean
  timestamp: Date
  ipAddress: string
  userAgent: string
  version: string
}
```

### AuditLog
```typescript
{
  logId: string
  action: string
  userId: string
  resource: string
  resourceId: string
  metadata: Record<string, any>
  ipAddress: string
  timestamp: Date
}
```

### DataSubjectRequest
```typescript
{
  requestId: string
  userId: string
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'objection'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  submittedAt: Date
  completedAt?: Date
}
```

---

## API Endpoints

### Consent
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/consent` | Record consent |
| GET | `/consent/user/:userId` | User consents |
| GET | `/consent/audit/:userId` | Consent history |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/audit` | Log action |
| GET | `/audit/logs` | Query logs |
| GET | `/audit/export` | Export audit trail |

### Data Subject Rights
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/requests` | Submit request |
| GET | `/requests/:id` | Request status |
| POST | `/requests/:id/process` | Process request |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Dependencies

```json
{
  "uuid": "^9.0.0",
  "crypto-js": "^4.2.0",
  "date-fns": "^3.3.1",
  "express": "^4.18.2",
  "zod": "^3.22.4",
  "winston": "^3.11.0"
}
```

---

## Status

- [x] Consent management
- [x] Audit trails
- [x] GDPR compliance
- [x] DPDP compliance
- [x] Data subject rights

