# Core - User Authentication

**Service:** Core (User Management & Authentication)
**Port:** 4702 (via gateway)
**Prefix:** `/auth`, `/api/users`

---

## Overview

The Core service provides the foundation for user identity and authentication. It handles user registration, login, JWT tokens, sessions, and password management.

## Features

- **User Registration:** With password strength validation
- **JWT Authentication:** Access + Refresh tokens
- **Session Management:** Multi-device tracking
- **Password Hashing:** bcrypt with 12 salt rounds
- **Password History:** Prevent reuse of last 5 passwords
- **MFA Support:** TOTP, backup codes
- **User Profile:** Preferences, status, metadata
- **GDPR Ready:** Email verification, data export

## User States

| Status | Description |
|--------|-------------|
| `active` | Normal active user |
| `inactive` | Account not in use |
| `suspended` | Temporarily blocked |
| `locked` | Locked due to failed attempts |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/password` | Change password |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/sessions` | List my sessions |
| DELETE | `/api/auth/sessions/:id` | Revoke session |
| DELETE | `/api/auth/sessions` | Revoke all sessions |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (admin) |
| GET | `/api/users/:id` | Get user by ID |

## Token Architecture

### Access Token (1 hour)
```
Header: { alg: "HS256", typ: "JWT" }
Payload: { sub, email, role, organizationId, type: "access" }
```

### Refresh Token (7 days)
- Stored in memory with metadata
- Rotated on each refresh
- Revocable

## Usage Example

### Register
```bash
curl -X POST http://localhost:4702/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:4702/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": "1h",
  "tokenType": "Bearer",
  "user": { "id": "user-abc", "email": "...", "name": "...", "role": "member" }
}
```

### Refresh
```bash
curl -X POST http://localhost:4702/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "eyJ..." }'
```

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

## File Structure

```
core/
├── src/
│   └── models/
│       └── user.model.js
└── CLAUDE.md
```