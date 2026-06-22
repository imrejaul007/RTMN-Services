# REZ Auth Service - SPEC.md

**Version:** 1.0.0
**Port:** 4002
**Company:** RABTUL-Technologies
**Category:** Core

---

## Overview

Authentication and identity service providing JWT tokens, OTP verification, device fingerprinting, TOTP 2FA, and OAuth flows. Central authentication hub for all REZ platform services.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REZ Auth Service                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── JWT Manager     → Token generation, verification, refresh            │
│  ├── OTP Engine     → SMS/Email OTP generation and verification          │
│  ├── Device Fingerprint → Device identification and tracking             │
│  ├── TOTP 2FA       → Time-based one-time passwords                     │
│  ├── OAuth Handler  → Social login flows                                 │
│  └── Session Manager → Active session management                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### User
```typescript
{
  userId: string
  email: string
  phone: string
  passwordHash?: string
  mfaEnabled: boolean
  totpSecret?: string
  devices: Device[]
  oauthProviders: OAuthProvider[]
  createdAt: Date
  lastLogin: Date
}
```

### Session
```typescript
{
  sessionId: string
  userId: string
  token: string
  deviceFingerprint: string
  ipAddress: string
  expiresAt: Date
  createdAt: Date
}
```

### Device
```typescript
{
  deviceId: string
  fingerprint: string
  type: 'mobile' | 'desktop' | 'tablet'
  browser: string
  os: string
  lastSeen: Date
  trusted: boolean
}
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/logout` | Logout (invalidate session) |
| POST | `/auth/logout-all` | Logout all sessions |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user |

### OTP
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/otp/send` | Send OTP (SMS/Email) |
| POST | `/auth/otp/verify` | Verify OTP |
| POST | `/auth/otp/login` | Login with OTP |

### MFA/2FA
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/mfa/setup` | Setup TOTP 2FA |
| POST | `/auth/mfa/verify` | Verify TOTP code |
| POST | `/auth/mfa/disable` | Disable 2FA |

### Password
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/password/forgot` | Request password reset |
| POST | `/auth/password/reset` | Reset password |
| POST | `/auth/password/change` | Change password |

### OAuth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/oauth/:provider` | Initiate OAuth flow |
| GET | `/auth/oauth/:provider/callback` | OAuth callback |
| POST | `/auth/oauth/link` | Link OAuth to account |

### Internal
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/internal/verify` | Verify token (internal) |
| POST | `/internal/create-service-token` | Create service token |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

---

## Dependencies

```json
{
  "express": "^4.18.0",
  "mongoose": "^8.17.2",
  "bullmq": "^5.4.0",
  "ioredis": "^5.3.0",
  "jsonwebtoken": "^9.0.0",
  "bcryptjs": "^3.0.3",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "winston": "^3.11.0",
  "zod": "^3.22.0",
  "uuid": "^14.0.0",
  "resend": "^6.1.3",
  "prom-client": "^15.1.0",
  "@sentry/node": "^7.120.4",
  "@opentelemetry/sdk-node": "^0.218.0"
}
```

---

## Integration Points

| Service | Direction | Purpose |
|---------|-----------|---------|
| RABTUL Notification | Write | Send OTP via SMS/Email |
| All Services | Read | Token verification |
| REZ Identity Graph | Write | Identity events |

---

## Status

- [x] User registration
- [x] Email/password login
- [x] OTP verification
- [x] OTP login
- [x] TOTP 2FA
- [x] OAuth (Google, Facebook)
- [x] Session management
- [x] Token refresh
- [x] Password reset
- [x] Device fingerprinting
- [x] Service tokens
