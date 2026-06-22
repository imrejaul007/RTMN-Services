# User Twin

**Version:** 1.0.0
**Port:** 4889
**Status:** ✅ RUNNING | June 22, 2026
**Package:** `@rtmn/user-twin`

---

## Overview

The User Twin manages platform user identity, devices, sessions, permissions, trust levels, biometric enrollment, and activity history. Unlike most twins that focus on a single entity, User Twin is a multi-store service acting as the **identity control plane** for RTMN users.

It uses `createBaseTwinService` from `@rtmn/twinos-shared` to scaffold its Express app, then layers user/device/session/permission endpoints on top. The `calculateTrustScore()` heuristic combines device count, active session count, and 24h activity volume into a 0–4 trust level (NONE → FULL).

Twin types: `user`, `device`, `session`, `permission`, `trust`, `biometric`.

---

## Endpoints

### Users
```
GET    /api/twins/users                    # List (filters: search, status) — paginated
POST   /api/twins/users                    # Create (email uniqueness enforced)
GET    /api/twins/user/:id
PUT    /api/twins/user/:id                 # Update (name, phone, preferences, settings, avatar, bio, timezone, language)
```

### Devices
```
GET    /api/twins/devices                  # List (filters: userId, type, status)
POST   /api/twins/devices                  # Register (type: phone/watch/tablet/desktop/earbuds/glasses/car/other)
GET    /api/twins/devices/:id
PUT    /api/twins/devices/:id              # Update (lastSeen refreshed on each call)
DELETE /api/twins/devices/:id              # Remove + log DEVICE_REMOVED security event
```

### Sessions
```
GET    /api/twins/sessions                 # List (default: active only; filter: userId, status)
POST   /api/twins/sessions                 # Create (7-day expiry default)
GET    /api/twins/sessions/:id
DELETE /api/twins/sessions/:id             # Revoke (status='revoked')
```

### Permissions & Trust
```
GET    /api/twins/user/:id/permissions     # Get roles[], scopes[], resourcePermissions{}
PUT    /api/twins/user/:id/permissions     # Update (logs PERMISSIONS_UPDATED)
GET    /api/twins/user/:id/trust           # Compute live trust score + factor breakdown
```

### Activity, Biometrics, Preferences
```
GET    /api/twins/user/:id/activity        # Filter by action/resource; cap 1000 per user (FIFO)
GET    /api/twins/user/:id/biometric       # enrollment status + methods
POST   /api/twins/user/:id/biometric       # Enroll method (logs BIOMETRIC_ENROLLED)
GET    /api/twins/user/:id/preferences     # preferences + settings
PUT    /api/twins/user/:id/preferences     # Update (deep-merged with existing)
```

### Security & Analytics
```
GET    /api/twins/security-logs            # Filter by userId/type (default 100 most recent)
GET    /api/analytics/users                # Total, byStatus, byRole, withDevices, averageTrustScore
GET    /health                              # Service + version
GET    /ready                               # users/devices/sessions counts
GET    /metrics                             # uptime + counts
```

---

## Data Stores

All 6 stores use `PersistentMap` (note: `PersistentMap`, not `PersistentStore`).

| Store Name | Purpose |
|---|---|
| `user-storage` | User records with email, name, role, preferences, settings, biometric flags |
| `device-storage` | Registered devices with type, os, model, pushToken, lastSeen |
| `session-storage` | Active/expired/revoked sessions with ipAddress, userAgent, expiresAt |
| `permission-storage` | Per-user RBAC: roles[], scopes[], resourcePermissions{} |
| `security-log-storage` | Audit trail (USER_CREATED, DEVICE_REGISTERED, SESSION_REVOKED, BIOMETRIC_ENROLLED, etc.) |
| `activity-storage` | Per-user activity ring buffer (capped at 1000 entries per user) |

---

## Architecture

```
user-twin/
├── src/
│   └── index.js              # ESM, ~960 LOC
├── package.json
└── CLAUDE.md
```

---

## Dependencies

- **@rtmn/twinos-shared** — base service scaffold, auth, validation, Errors helpers, PAGINATION, sanitizeObject
- **@rtmn/shared** — env + PersistentMap + requireAuth primitive
- **express**, **helmet**, **cors**, **compression**, **morgan**, **uuid**

---

## Recent Changes

- 2026-06-21: Activity buffer cap (1000 per user, FIFO to 500) prevents unbounded memory growth
- 2026-06-20: `calculateTrustScore()` heuristic — base MEDIUM + device/session/activity bonuses, capped at FULL
- 2026-06-19: `createBaseTwinService` adoption — replaces inline helmet/cors/json setup with shared scaffold
- 2026-06-18: Security event log on every state change (USER_CREATED, DEVICE_REGISTERED, SESSION_REVOKED, etc.)
- 2026-06-17: Biometric enrollment tracks methods[] + lastVerified timestamp

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/twins/user-twin
npm install
npm start

# Create a user
curl -X POST http://localhost:4889/api/twins/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "email": "alice@example.com", "name": "Alice", "role": "user" }'

# Register a device
curl -X POST http://localhost:4889/api/twins/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "userId": "user-abc12345", "type": "phone", "name": "iPhone 15", "os": "iOS 18" }'

# Check trust score
curl http://localhost:4889/api/twins/user/user-abc12345/trust -H "Authorization: Bearer $TOKEN"

curl http://localhost:4889/health
```