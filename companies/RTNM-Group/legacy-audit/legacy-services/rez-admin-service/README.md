# ReZ Admin Service

Centralized admin dashboard and management API for the ReZ ecosystem. Provides authentication, user management, role-based access control, and comprehensive audit logging for all administrative operations.

## Overview

The `rez-admin-service` is a core infrastructure service within the RABTUL Technologies platform that serves as the central authority for administrative operations across all ReZ products and services.

### Role in the Ecosystem

```
┌─────────────────────────────────────────────────────────────┐
│                    ReZ Ecosystem                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ REZ-Consumer│    │REZ-Merchant │    │   REZ-Media     │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│          │                 │                    │            │
│          └─────────────────┼────────────────────┘            │
│                            │                                 │
│                            ▼                                 │
│              ┌───────────────────────┐                     │
│              │   rez-admin-service   │  Port 4003          │
│              │   (Central Admin API)  │                     │
│              └───────────────────────┘                     │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │Auth Service │    │Payment Svc  │    │ Wallet Svc  │    │
│  │  (RABTUL)   │    │  (RABTUL)   │    │  (RABTUL)   │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Multi-Role Access Control**: Three-tier role system (super_admin, admin, support) with granular permissions
- **Secure Authentication**: JWT-based auth with optional MFA support
- **Comprehensive Audit Logging**: All actions logged with user ID, IP address, timestamp, and details
- **Rate Limiting**: Built-in protection against brute-force attacks
- **MongoDB Persistence**: Reliable data storage with journaling
- **Service-to-Service Auth**: Integration with RABTUL `rez-auth-service` for token verification

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 18.0.0 | ES2020 features used |
| MongoDB | >= 6.0 | With journaling enabled |
| npm | >= 9.0.0 | For dependency management |

### Optional Dependencies

- **Redis** (optional): For enhanced session management and caching
- **RABTUL Auth Service**: External verification endpoint for internal service tokens

---

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/imrejaul007/RTNM-Group.git
cd RTNM-Group/rez-admin-service
npm install
```

### 2. Configure Environment

Create a `.env` file in the service root:

```bash
# Server Configuration
NODE_ENV=development
PORT=4003

# MongoDB (Required for production)
MONGODB_URI=mongodb://localhost:27017/rez_admin

# Authentication
JWT_SECRET=your-secure-jwt-secret-min-32-chars
INTERNAL_SERVICE_TOKEN=your-internal-service-token

# RABTUL Auth Service Integration
AUTH_SERVICE_URL=https://rez-auth-service.onrender.com

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://admin.rez.money

# Default Admin Setup (Required on first run)
DEFAULT_ADMIN_PASSWORD=YourSecureAdminPassword123!
DEFAULT_ADMIN_EMAIL=admin@rez.money
```

### 3. Run the Service

**Development Mode** (with hot-reload):
```bash
npm run dev
```

**Production Build**:
```bash
npm run build
npm start
```

### 4. Verify Installation

```bash
curl http://localhost:4003/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "admin-service",
  "timestamp": "2026-05-18T10:00:00.000Z",
  "environment": "development"
}
```

---

## API Documentation

### Base URL

```
Development: http://localhost:4003
Production:  https://rez-admin-service.onrender.com
```

### Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Endpoints

#### Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Service health status |

**Response:**
```json
{
  "status": "ok",
  "service": "admin-service",
  "timestamp": "2026-05-18T10:00:00.000Z",
  "environment": "development"
}
```

---

#### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Admin login |
| POST | `/api/auth/register` | No | Create new admin user |
| GET | `/api/auth/me` | Yes | Get current user profile |

##### POST /api/auth/login

**Request:**
```json
{
  "email": "admin@rez.money",
  "password": "YourPassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "60d5ec49f1b2c8a1234567890",
      "email": "admin@rez.money",
      "name": "Admin User",
      "role": "super_admin"
    }
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Missing email or password |
| 401 | UNAUTHORIZED | Invalid credentials |
| 429 | AUTH_RATE_LIMIT_EXCEEDED | Too many login attempts |

##### POST /api/auth/register

**Request:**
```json
{
  "email": "newadmin@rez.money",
  "password": "SecurePassword123!",
  "name": "New Admin",
  "role": "support"
}
```

**Valid Roles:** `super_admin`, `admin`, `support`

##### GET /api/auth/me

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "60d5ec49f1b2c8a1234567890",
    "email": "admin@rez.money",
    "name": "Admin User",
    "role": "super_admin",
    "permissions": ["*"]
  }
}
```

---

#### User Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Yes | List all admin users |

##### GET /api/users

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "60d5ec49f1b2c8a1234567890",
      "email": "admin@rez.money",
      "name": "Admin User",
      "role": "super_admin",
      "permissions": ["*"],
      "lastLogin": "2026-05-18T10:00:00.000Z",
      "isActive": true,
      "mfaEnabled": false,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### Audit Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/audit-logs` | Yes | Retrieve audit logs |

##### GET /api/audit-logs

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Max records (max: 100) |
| offset | number | 0 | Pagination offset |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid",
      "userId": "60d5ec49f1b2c8a1234567890",
      "action": "LOGIN_SUCCESS",
      "resource": "auth",
      "details": {},
      "ipAddress": "192.168.1.1",
      "timestamp": "2026-05-18T10:00:00.000Z"
    }
  ]
}
```

**Logged Actions:**

| Action | Description |
|--------|-------------|
| `LOGIN_SUCCESS` | Successful login |
| `LOGIN_FAILED` | Failed login attempt |
| `USER_CREATED` | New admin user created |
| `USER_UPDATED` | Admin user modified |
| `USER_DEACTIVATED` | Admin user deactivated |

---

### Rate Limiting

The service implements rate limiting on authentication endpoints:

| Endpoint | Window | Max Requests |
|----------|--------|--------------|
| `/api/auth/login` | 15 minutes | 10 attempts |

Exceeded limit response:
```json
{
  "error": "Too Many Requests",
  "code": "AUTH_RATE_LIMIT_EXCEEDED",
  "message": "Too many login attempts. Please try again later."
}
```

---

## Security

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes (Production) | JWT signing secret (min 32 chars) |
| `MONGODB_URI` | Yes (Production) | MongoDB connection string |
| `DEFAULT_ADMIN_PASSWORD` | Yes (First run) | Initial admin password (min 12 chars) |
| `ALLOWED_ORIGINS` | Yes (Production) | Comma-separated CORS origins |

### Security Features

#### Password Policy

- Minimum 8 characters for user registration
- Minimum 12 characters for default admin
- Weak patterns are rejected: `test`, `dev`, `changeme`, `password`, `admin`
- bcrypt hashing with cost factor 12

#### Production Fail-Fast

The service **refuses to start** in production if:

1. `JWT_SECRET` is missing or contains weak values
2. `ALLOWED_ORIGINS` is not configured
3. `DEFAULT_ADMIN_PASSWORD` is missing or too weak on first run

#### CORS Policy

- Development: Allows localhost and 127.0.0.1
- Production: Only explicitly configured origins allowed

#### Request Security

- Helmet.js for security headers (HSTS, X-Frame-Options, etc.)
- Request body size limit: 100KB
- Request ID tracking via `X-Request-Id` header
- Timing-safe token comparison

#### Audit Logging

All sensitive operations are logged with:

- User ID (or "unknown" for failed attempts)
- Action type
- Resource accessed
- Client IP address
- Timestamp

---

## Architecture

### Database Collections

#### AdminUser

Stores administrative user accounts.

```typescript
interface AdminUser {
  id: string;
  email: string;           // unique, indexed
  passwordHash: string;    // bcrypt hashed
  name: string;
  role: 'super_admin' | 'admin' | 'support';
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  mfaSecret?: string;      // TOTP secret
  mfaEnabled: boolean;
}
```

#### AuditLog

Immutable audit trail of all admin actions.

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  timestamp: Date;
}
```

### Service Connections

| Service | URL | Purpose |
|---------|-----|---------|
| RABTUL Auth | `https://rez-auth-service.onrender.com` | Token verification |

### Related Services

| Service | Port | Integration |
|---------|------|-------------|
| api-gateway | 4000 | Routes admin requests here |
| rez-auth-service | 4002 | External auth verification |
| rez-payment-service | 4001 | Payment admin operations |
| rez-wallet-service | 4004 | Wallet admin operations |

---

## Troubleshooting

### Common Issues

#### MongoDB Connection Failed

**Error:**
```
MongoServerSelectionError: connect ECONNREFUSED
```

**Solution:**
1. Verify MongoDB is running: `mongosh` or `mongo`
2. Check `MONGODB_URI` in your `.env`
3. For local dev: `MONGODB_URI=mongodb://localhost:27017/rez_admin`

#### JWT_SECRET Validation Failed

**Error:**
```
[FATAL] JWT_SECRET contains a weak value in production
```

**Solution:**
Use a cryptographically secure secret:
```bash
openssl rand -base64 32
```

#### CORS Origin Not Allowed

**Error:**
```
Origin http://localhost:3001 not allowed by CORS policy
```

**Solution:**
Add the origin to `ALLOWED_ORIGINS`:
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

#### Rate Limit Exceeded

**Error:**
```json
{
  "error": "Too Many Requests",
  "code": "AUTH_RATE_LIMIT_EXCEEDED"
}
```

**Solution:**
Wait 15 minutes, or adjust `windowMs` in `src/index.ts`.

---

### Debug Mode

Enable verbose logging:

```bash
DEBUG=* npm run dev
```

Or set log level via environment:

```bash
LOG_LEVEL=debug npm start
```

### Health Checks

**Basic Health:**
```bash
curl http://localhost:4003/health
```

**MongoDB Connection:**
```javascript
// In MongoDB shell
use rez_admin
db.adminusers.countDocuments()
```

---

## Contributing

### Code Style

- TypeScript strict mode enabled
- 2-space indentation
- Single quotes for strings
- No semicolons (JS standard)
- JSDoc comments for public APIs

### Testing

```bash
# Run all tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

### Submitting Changes

1. Create a feature branch: `git checkout -b feature/admin-enhancement`
2. Make changes with tests
3. Ensure typecheck passes: `npm run typecheck`
4. Run tests: `npm test`
5. Submit pull request with description

### Security Requirements

- Never commit secrets or credentials
- Use environment variables for all sensitive data
- Validate input with Zod schemas where applicable
- Log all administrative actions
- Reject weak passwords in production

---

## License

Internal use only - RABTUL Technologies
