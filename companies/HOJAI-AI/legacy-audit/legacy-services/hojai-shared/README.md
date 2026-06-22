# HOJAI Shared Utilities Service

Shared types, validation utilities, and common functions across HOJAI ecosystem.

**Port: 4580**

## Features

- **Tenant Management**: Multi-tenant support with quotas
- **API Key Management**: Create, manage, and revoke API keys
- **Webhook Management**: Configure webhooks for events
- **Validation Utilities**: Email, URL, UUID validation
- **Schema Validation**: Request body validation with rules

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/tenants` | List tenants |
| POST | `/api/tenants` | Create tenant |
| GET | `/api/tenants/:id` | Get tenant |
| PUT | `/api/tenants/:id` | Update tenant |
| GET | `/api/apikeys` | List API keys |
| POST | `/api/apikeys` | Create API key |
| DELETE | `/api/apikeys/:id` | Revoke API key |
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks` | Create webhook |
| POST | `/api/validate` | Validate email/URL/UUID |
| GET | `/api/utils/uuid` | Generate UUID |

## Quick Start

```bash
npm install
npm run build
npm start
```

## Validation Types

| Type | Description |
|------|-------------|
| `email` | Email format validation |
| `url` | URL format validation |
| `uuid` | UUID format validation |
