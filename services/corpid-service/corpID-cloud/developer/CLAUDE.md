# Developer Identity

**Service:** Developer Platform
**Port:** 4702 (via gateway)
**Prefix:** `/api/developer`

---

## Overview

The Developer Identity service provides a platform for external developers to build applications on CorpID Cloud. It includes project management, API key generation, OAuth client creation, usage tracking, and billing.

## Features

- **4 Pricing Tiers:** Free, Pay-as-you-go, Startup, Enterprise
- **Project Management:** Create and manage multiple projects
- **App Registration:** OAuth client creation
- **API Key Management:** Create, rotate, revoke keys
- **Usage Tracking:** Per-key usage statistics
- **Rate Limiting:** Configurable per key
- **Scopes:** Fine-grained permissions
- **Billing:** Usage-based pricing support

## Pricing Plans

| Plan | Price | Requests/Month | Rate Limit | Features |
|------|-------|----------------|------------|----------|
| Free | $0 | 1,000 | 10/min | Basic API, Community support |
| Pay-as-you-go | $0.001/call | Unlimited | 100/min | Full API, Email support, Webhooks |
| Startup | $49/mo | 100,000 | 1000/min | Full API, Priority support, Custom domains |
| Enterprise | Custom | Unlimited | 10000/min | Full API, Dedicated support, SLA, Audit logs |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/developer/plans` | Get available plans (public) |
| GET | `/api/developer/me` | Get my developer profile |
| PUT | `/api/developer/me` | Update profile |
| POST | `/api/developer/me/upgrade` | Upgrade plan |
| GET | `/api/developer/projects` | List my projects |
| POST | `/api/developer/projects` | Create project |
| GET | `/api/developer/projects/:id` | Get project details |
| POST | `/api/developer/projects/:id/apps` | Create OAuth app |
| POST | `/api/developer/projects/:id/keys` | Create API key |
| GET | `/api/developer/projects/:id/keys` | List project keys |
| DELETE | `/api/developer/keys/:id` | Revoke key |
| GET | `/api/developer/me/usage` | Get usage statistics |
| GET | `/api/developer/stats` | Platform stats (admin) |

## Usage Example

### Create Project
```bash
curl -X POST http://localhost:4702/api/developer/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Web App",
    "description": "Awesome app",
    "type": "web"
  }'
```

### Create OAuth App
```bash
curl -X POST http://localhost:4702/api/developer/projects/PROJ_ID/apps \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web Client",
    "type": "web",
    "redirectUris": ["https://myapp.com/callback"],
    "scopes": ["read:users", "read:organizations"]
  }'
```

Response:
```json
{
  "success": true,
  "app": {
    "id": "app-abc",
    "name": "Web Client",
    "clientId": "app_xyz123",
    "clientSecret": "appsec_abc...", // SHOWN ONLY ONCE
    "redirectUris": ["https://myapp.com/callback"]
  }
}
```

### Create API Key
```bash
curl -X POST http://localhost:4702/api/developer/projects/PROJ_ID/keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "environment": "production",
    "scopes": ["read:users"],
    "rateLimit": { "requests": 1000, "window": "minute" }
  }'
```

Response:
```json
{
  "success": true,
  "key": {
    "id": "dkey-abc",
    "name": "Production Key",
    "key": "cpk_live_xyz...", // SHOWN ONLY ONCE
    "keyPrefix": "cpk_live_xy",
    "environment": "production"
  }
}
```

### Get Usage Stats
```bash
curl http://localhost:4702/api/developer/me/usage \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "usage": {
    "totalCalls": 15420,
    "totalErrors": 23,
    "errorRate": "0.15",
    "dailyUsage": {
      "2026-06-17": { "calls": 1234, "errors": 2 },
      "2026-06-18": { "calls": 1567, "errors": 1 }
    },
    "projectCount": 3,
    "appCount": 5,
    "keyCount": 8
  }
}
```

## File Structure

```
developer/
├── src/
│   ├── models/
│   │   └── developer.model.js
│   └── routes/
│       └── developer.routes.js
└── CLAUDE.md
```
