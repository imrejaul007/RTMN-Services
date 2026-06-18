# API Identity

**Service:** API Key, OAuth Client, and Webhook Management
**Port:** 4702 (via gateway)
**Prefix:** `/api/keys`, `/api/oauth`, `/api/webhooks`, `/api/scopes`

---

## Overview

The API Identity service provides comprehensive API access management including API keys, OAuth clients, webhooks, and scopes. It's the foundation for service-to-service authentication in the RTMN ecosystem.

## Features

- **API Keys:** Create, rotate, revoke with configurable rate limits
- **OAuth Clients:** Full OAuth 2.0 client registration
- **Webhooks:** Event subscription with HMAC signatures
- **Scopes:** 7 default scopes for fine-grained permissions
- **IP Whitelisting:** Restrict key usage by IP
- **Rate Limiting:** Per-key rate limit configuration
- **Usage Tracking:** Last used, call counts
- **22 Webhook Events:** user.created, organization.created, etc.
- **Key Hashing:** Secure storage with SHA-256

## Default Scopes

| Scope | Description |
|-------|-------------|
| `read:users` | Read user information |
| `write:users` | Create and update users |
| `read:organizations` | Read organization info |
| `write:organizations` | Create and update organizations |
| `read:roles` | Read roles and permissions |
| `manage:webhooks` | Manage webhooks |
| `admin` | Full administrative access |

## API Endpoints

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/keys` | Create API key |
| GET | `/api/keys` | List my keys |
| GET | `/api/keys/:id` | Get key details |
| PUT | `/api/keys/:id` | Update key |
| DELETE | `/api/keys/:id` | Revoke key |
| POST | `/api/keys/:id/rotate` | Rotate key (get new secret) |

### Scopes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scopes` | List all scopes |

### OAuth Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/oauth/clients` | Register client |
| GET | `/api/oauth/clients` | List clients |
| POST | `/api/oauth/clients/:id/rotate-secret` | Rotate secret |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/webhooks/events` | Available events |
| POST | `/api/webhooks` | Create webhook |
| GET | `/api/webhooks` | List webhooks |
| GET | `/api/webhooks/:id` | Get webhook |
| PUT | `/api/webhooks/:id` | Update webhook |
| DELETE | `/api/webhooks/:id` | Delete webhook |
| GET | `/api/webhooks/:id/deliveries` | Delivery history |

## Usage Example

### Create API Key
```bash
curl -X POST http://localhost:4702/api/keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "scopes": ["read:users", "read:organizations"],
    "environment": "production",
    "rateLimit": { "requests": 1000, "window": "hour" }
  }'
```

Response:
```json
{
  "success": true,
  "apiKey": {
    "id": "ak-abc",
    "name": "Production Key",
    "key": "cpk_xyz...",  // SHOWN ONLY ONCE
    "keyId": "cpk_xyz...",
    "scopes": ["read:users"]
  }
}
```

### Create Webhook
```bash
curl -X POST http://localhost:4702/api/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Webhook",
    "url": "https://example.com/webhook",
    "events": ["user.created", "user.deleted", "organization.created"]
  }'
```

### Available Webhook Events

22 events including:
- `user.created`, `user.updated`, `user.deleted`, `user.suspended`
- `organization.created`, `organization.updated`, `organization.deleted`
- `member.invited`, `member.joined`, `member.removed`, `member.suspended`
- `auth.login`, `auth.logout`, `auth.failed`, `auth.mfa_enabled`, `auth.password_changed`
- `role.created`, `role.assigned`, `role.revoked`
- `api_key.created`, `api_key.rotated`, `api_key.revoked`

## File Structure

```
api-identity/
├── src/
│   ├── models/
│   │   └── api-key.model.js
│   └── routes/
│       └── api-identity.routes.js
└── CLAUDE.md
```