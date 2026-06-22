# REZ Auth Service

## Basic Info

| Field | Value |
|-------|-------|
| **Git Path** | `rez-auth-service` |
| **Port** | 4002 (HTTP), 4102 (Health) |
| **Status** | Active |
| **Live URL** | https://rez-auth-service.onrender.com |
| **Health Check** | `GET /health` |
| **Metrics** | `GET /metrics` |

---

## Purpose

The Auth Service is the central identity and authentication service for the ReZ platform. It handles user registration, login, OTP verification, JWT token management, TOTP-based MFA, OAuth2 partner integrations, and session management. All other services rely on the Auth Service for user identity verification.

---

## Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MongoDB
- **Cache/Queue**: Redis, BullMQ
- **Auth**: JWT, bcrypt, TOTP

---

## API Endpoints

### Authentication

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/v1/auth/signup` | User registration | None |
| POST | `/api/v1/auth/login` | User login | None |
| POST | `/api/v1/auth/refresh` | Refresh access token | Refresh Token |
| POST | `/api/v1/auth/logout` | Logout and invalidate tokens | Bearer |
| GET | `/api/v1/auth/me` | Get current user info | Bearer |

### OTP

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/v1/auth/otp/send` | Send OTP to email/phone | None |
| POST | `/api/v1/auth/otp/verify` | Verify OTP | None |

### MFA (TOTP)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/v1/mfa/setup` | Initialize MFA setup | Bearer |
| POST | `/api/v1/mfa/enable` | Enable MFA | Bearer |
| POST | `/api/v1/mfa/verify` | Verify TOTP code | Bearer |
| POST | `/api/v1/mfa/disable` | Disable MFA | Bearer |

### OAuth2 Partners

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/v1/oauth/:partner/authorize` | Initiate OAuth flow | None |
| GET | `/api/v1/oauth/:partner/callback` | OAuth callback | None |

### Profile

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/v1/profile` | Get user profile | Bearer |
| PUT | `/api/v1/profile` | Update profile | Bearer |

### Internal (Service-to-Service)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/internal/verify` | Verify JWT token | X-Internal-Token |
| POST | `/internal/user/create` | Create user (internal) | X-Internal-Token |
| GET | `/internal/user/:id` | Get user by ID | X-Internal-Token |

### Verification

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/v1/verification/email` | Verify email address | Bearer |
| POST | `/api/v1/verification/phone` | Verify phone number | Bearer |

---

## Database Collections

| Collection | Purpose |
|------------|---------|
| `users` | User accounts, credentials, roles |
| `sessions` | Active login sessions |
| `refresh_tokens` | JWT refresh tokens |
| `otp_codes` | OTP verification codes (TTL-based) |
| `mfa_secrets` | Encrypted TOTP secrets |
| `admin_mfa_configs` | MFA requirements per role |
| `oauth_partners` | OAuth2 partner configurations |

---

## Dependencies

| Service | Purpose | URL Config |
|---------|---------|------------|
| MongoDB | User data storage | `MONGODB_URI` |
| Redis | OTP caching, session storage | `REDIS_URL` |
| BullMQ | OTP queue processing | Built-in |
| Sentry | Error tracking | `SENTRY_DSN` |
| OpenTelemetry | Distributed tracing | `OTEL_EXPORTER_OTLP_ENDPOINT` |

### External Dependencies

| Service | Purpose |
|---------|---------|
| Resend | Transactional email |
| OAuth2 Partners | Rendez, StayOwen, AdBazaar, ReZNow, Hotel PMS, etc. |

---

## Dependents (Services that call this service)

| Service | Usage |
|---------|-------|
| All frontend apps | User authentication |
| Profile Service | JWT verification, user creation |
| Payment Service | JWT verification |
| Wallet Service | JWT verification |
| Order Service | JWT verification |
| Catalog Service | JWT verification |
| All backend services | Token validation |

---

## Environment Variables

```env
# Core
NODE_ENV=production
PORT=4002
HEALTH_PORT=4102
SERVICE_NAME=rez-auth-service

# Database
MONGODB_URI=mongodb://localhost:27017/rez-auth

# Cache
REDIS_URL=redis://localhost:6379

# Authentication (REQUIRED)
JWT_SECRET=<64-char secret>
JWT_MERCHANT_SECRET=<64-char secret>
JWT_ADMIN_SECRET=<64-char secret>
JWT_REFRESH_SECRET=<64-char secret>

# Internal Auth (REQUIRED)
INTERNAL_SERVICE_TOKENS_JSON={"auth-service": "<token>"}

# Security (REQUIRED)
OTP_HMAC_SECRET=<64-char secret>
OTP_TOTP_ENCRYPTION_KEY=<32-byte hex>

# CORS (REQUIRED)
CORS_ORIGIN=https://rez.money,https://admin.rez.money,https://merchant.rez.money

# OAuth2 Partners
PARTNER_RENDEZ_CLIENT_ID=rendez-app
PARTNER_RENDEZ_CLIENT_SECRET=<secret>
PARTNER_RENDEZ_REDIRECT_URI=<uri>

# AI/ML Services
REZ_AI_URL=https://rez-ai-platform.onrender.com
REZ_EVENTS_URL=https://rez-core-platform.onrender.com
REZ_INTELLIGENCE_URL=https://rez-core-intelligence.onrender.com

# Observability
SENTRY_DSN=<dsn>
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/v1/auth/login` | 10 requests / 15 minutes |
| `/api/v1/auth/otp/send` | 5 requests / 5 minutes |
| `/api/v1/auth/otp/verify` | 10 requests / 5 minutes |

---

## Business Logic

### Token Lifecycle

1. **Access Token**: 15-minute JWT for API authentication
2. **Refresh Token**: 24-hour token for obtaining new access tokens
3. **OTP Code**: 5-minute validity, single use

### MFA Flow

1. User initiates MFA setup
2. System generates TOTP secret, encrypts, stores
3. Returns otpauth:// URI for QR code generation
4. User scans QR with authenticator app
5. User verifies first code to enable MFA
6. Subsequent logins require TOTP verification

### OAuth2 Partners

Supports multiple partner applications:
- Rendez (consumer app)
- StayOwen (hotel partner)
- AdBazaar (ad platform)
- ReZNow (web app)
- Hotel PMS (property management)
- Hotel Panel (partner dashboard)
- NextaBiZ (B2B commerce)
- ReZ Merchant

---

## Health Check Response

```json
{
  "status": "ok",
  "mongo": true,
  "redis": true
}
```

- **200 OK**: Both MongoDB and Redis healthy
- **200 degraded**: MongoDB healthy, Redis degraded
- **503 Unhealthy**: MongoDB down

---

## Security Features

- [x] JWT with role-based access (user, merchant, admin, super_admin)
- [x] bcrypt password hashing (12 rounds)
- [x] OTP with HMAC verification
- [x] TOTP MFA (RFC 6238)
- [x] Rate limiting per endpoint
- [x] CORS whitelist validation
- [x] X-Forwarded-For spoofing detection
- [x] MongoDB injection prevention
- [x] Internal service token authentication
- [x] Encrypted MFA secrets at rest

---

## Deployment

| Environment | Platform | Auto-restart |
|-------------|----------|--------------|
| Production | Render | Yes |
| Staging | Render | Yes |
| Development | Local | Manual |

---

## Related Documentation

- [API Reference](../API_REFERENCE.md)
- [Security Architecture](./SECURITY.md)
