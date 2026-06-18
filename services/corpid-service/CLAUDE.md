# CorpID - Universal Identity Service v2.0

**Version:** 2.0.0
**Port:** 4702
**Status:** ✅ FULLY OPERATIONAL | **June 18, 2026**

---

## Overview

CorpID is the **Universal Identity Service** for the RTMN ecosystem. It provides enterprise-grade identity management, authentication, and user profiles with JWT-based security.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CorpID v2.0 (4702)                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                       SECURITY LAYER                                   │       │
│  │                                                                       │       │
│  │   JWT Authentication ────→ Access tokens (1h) + Refresh (7d)         │       │
│  │   Password Hashing ────→ bcrypt with 12 salt rounds                  │       │
│  │   Rate Limiting ────→ 5 attempts/15min for auth, 100/min for API     │       │
│  │   Security Headers ────→ Helmet.js, CORS configured                   │       │
│  │   Input Validation ────→ express-validator + prototype pollution safe │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                       IDENTITY MANAGEMENT                             │       │
│  │                                                                       │       │
│  │   User Registry ────→ CRUD operations with role-based access         │       │
│  │   Business Registry ────→ Multi-tenant organization support         │       │
│  │   Session Management ────→ JWT tokens with refresh rotation          │       │
│  │   Role-Based Access ────→ superadmin, admin, manager, user, customer│       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
services/corpid-service/
├── src/
│   └── index.js              # Complete API (ES Modules)
├── package.json              # Dependencies
└── CLAUDE.md                 # This file
```

---

## Security Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| JWT Authentication | Access + Refresh tokens | ✅ |
| Password Hashing | bcrypt (12 rounds) | ✅ |
| Rate Limiting | express-rate-limit | ✅ |
| Security Headers | Helmet.js | ✅ |
| CORS | Configurable origins | ✅ |
| Input Validation | express-validator | ✅ |
| Prototype Pollution Prevention | Custom sanitizer | ✅ |
| Request Logging | Morgan + Winston | ✅ |
| Role-Based Access Control | 5 roles supported | ✅ |
| Business Scoping | Multi-tenant isolation | ✅ |

---

## Roles & Permissions

| Role | Description | Capabilities |
|------|-------------|---------------|
| **superadmin** | System administrator | Full access to all users/businesses |
| **admin** | Business administrator | Manage users within their business |
| **manager** | Department manager | Create users, limited management |
| **user** | Standard user | View profile, limited operations |
| **customer** | External customer | Public access, minimal permissions |

---

## API Endpoints

### Health & Status
```
GET  /health               # Service health check
GET  /ready                # Readiness probe
```

### Authentication
```
POST /auth/register        # Register new user + business
POST /auth/login           # Login, get JWT tokens
POST /auth/refresh          # Refresh access token
POST /auth/logout           # Logout, revoke session
GET  /auth/me               # Get current user info
```

### User Management
```
GET    /api/users           # List users (admin)
GET    /api/users/:id       # Get user by ID
POST   /api/users           # Create user (admin/manager)
PUT    /api/users/:id       # Update user
DELETE /api/users/:id       # Delete user (admin)
```

### Business Management
```
GET /api/businesses         # List all businesses (admin)
GET /api/businesses/:id     # Get business details
```

### Profile
```
GET  /api/profile           # Get own profile
PUT  /api/profile           # Update own profile
PUT  /api/profile/password  # Change password
```

---

## Environment Variables

```env
PORT=4702
JWT_SECRET=your-secure-secret-key-min-32-chars
JWT_EXPIRES_IN=1h
REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=https://app.example.com,https://admin.example.com
NODE_ENV=production
LOG_LEVEL=info
```

---

## Usage Examples

### Register
```bash
curl -X POST http://localhost:4702/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@acme.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "businessId": "ACME-CORP",
    "businessName": "ACME Corporation"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "1h",
  "tokenType": "Bearer",
  "user": {
    "id": "user-abc12345",
    "email": "john@acme.com",
    "name": "John Doe",
    "role": "owner",
    "businessId": "ACME-CORP"
  }
}
```

### Login
```bash
curl -X POST http://localhost:4702/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@acme.com",
    "password": "SecurePass123!"
  }'
```

### Get Current User
```bash
curl http://localhost:4702/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### Create User (Admin)
```bash
curl -X POST http://localhost:4702/api/users \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@acme.com",
    "password": "SecurePass123!",
    "name": "Jane Smith",
    "role": "manager"
  }'
```

### Refresh Token
```bash
curl -X POST http://localhost:4702/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

### Change Password
```bash
curl -X PUT http://localhost:4702/api/profile/password \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123!",
    "newPassword": "NewPass456!"
  }'
```

---

## Default Data

### Default Business
| ID | Name | Industry | Plan |
|----|------|----------|------|
| RTMN-HQ | RTMN Headquarters | technology | enterprise |

### Default Admin User
| ID | Email | Role |
|----|-------|------|
| user-admin-001 | admin@rtmn.com | superadmin |

**⚠️ Default Password:** `TempPass123!`

---

## Connected Services

| Service | Port | Integration |
|---------|------|-------------|
| RTMN Hub | 4399 | ✅ Identity provider |
| TwinOS Hub | 4705 | ✅ User identity |
| All Industry OS | 5010-5240 | ✅ Authentication |
| Genie Services | 4701-4715 | ✅ User context |

---

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Auth (login/register) | 5 requests | 15 minutes |
| General API | 100 requests | 1 minute |
| Strict operations | 20 requests | 1 minute |

---

## Data Storage

Currently uses **in-memory storage** (Maps). For production:

```javascript
// Recommended: MongoDB with mongoose
const mongoose = require('mongoose');

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'manager', 'user', 'customer'] },
  businessId: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'] }
});

// Business schema
const businessSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  industry: String,
  plan: { type: String, enum: ['starter', 'professional', 'enterprise'] },
  status: { type: String }
});
```

---

## Quick Start

```bash
cd services/corpid-service

# Install dependencies
npm install

# Start service
npm start

# Or for development (auto-reload)
npm run dev

# Health check
curl http://localhost:4702/health
```

---

## Security Checklist

- [x] JWT Authentication implemented
- [x] Password hashing with bcrypt
- [x] Rate limiting on auth endpoints
- [x] Helmet.js security headers
- [x] CORS configuration
- [x] Input validation on all endpoints
- [x] Prototype pollution prevention
- [x] Role-based access control
- [x] Business scoping for multi-tenancy
- [x] Request logging with request IDs
- [x] Error handling middleware
- [x] Token refresh rotation

---

*Last Updated: June 18, 2026*
*RTMN Ecosystem - Real-Time Multi-Industry Network*
