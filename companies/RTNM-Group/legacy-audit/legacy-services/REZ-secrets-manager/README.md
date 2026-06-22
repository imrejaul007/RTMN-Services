# REZ Secrets Manager

Enterprise-grade secrets management service for the REZ ecosystem.

## Overview

REZ Secrets Manager (Vault) provides centralized secret storage, management, rotation, and access control for all REZ services. It implements industry best practices for secrets management including encryption at rest, automatic rotation, fine-grained access policies, and comprehensive audit logging.

## Features

- **Secrets Storage**: Store API keys, database credentials, service tokens, TLS certificates, OAuth credentials, SSH keys, passwords, and custom secrets
- **Encryption**: AES-256-GCM encryption with PBKDF2 key derivation
- **Secret Versioning**: Track all versions of secrets with history
- **Automatic Rotation**: Scheduled rotation with customizable schedules (daily, weekly, monthly, quarterly, yearly, custom cron)
- **Dynamic Secrets**: Generate temporary credentials on demand
- **Access Control**: Fine-grained policies based on RBAC/ABAC
- **Audit Logging**: Complete audit trail for all operations
- **Multi-tenancy**: Support for multiple services with isolated access

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis (optional, for caching)

### Installation

```bash
# Clone the repository
cd RTNM-Group/REZ-secrets-manager

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Generate encryption keys
openssl rand -hex 32
# Add to VAULT_MASTER_KEY in .env

# Build the project
npm run build

# Start the server
npm start
```

### Development Mode

```bash
npm run dev
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 4033 | Server port |
| `NODE_ENV` | No | development | Environment |
| `MONGODB_URI` | Yes | mongodb://localhost:27017/rez-secrets-vault | MongoDB connection string |
| `VAULT_MASTER_KEY` | Yes | - | Master encryption key |
| `ENCRYPTION_KEY` | No | VAULT_MASTER_KEY | Alternative encryption key |
| `INTERNAL_SERVICE_TOKEN` | Yes | - | Service-to-service authentication |
| `RATE_LIMIT_WINDOW` | No | 60000 | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | No | 100 | Max requests per window |
| `CORS_ORIGINS` | No | * | Allowed CORS origins |
| `ROTATION_CRON` | No | 0 */15 * * * * | Rotation scheduler cron |

## API Reference

### Authentication

All API requests require authentication via one of:

1. **Internal Token** (service-to-service):
   ```
   X-Internal-Token: <token>
   ```

2. **API Key** (service registration):
   ```
   X-API-Key: <api-key>
   ```

### Secrets Endpoints

#### Create Secret

```http
POST /api/v1/secrets
Content-Type: application/json

{
  "name": "razorpay-api-key",
  "type": "api_key",
  "value": "your-secret-value",
  "metadata": {
    "environment": "production",
    "service": "payment-service"
  },
  "tags": ["payment", "production"],
  "rotationSchedule": "monthly",
  "rotationConfig": {
    "rotateAutomatically": true
  },
  "allowedServices": ["payment-service", "order-service"]
}
```

#### Get Secret

```http
GET /api/v1/secrets/:name
```

#### List Secrets

```http
GET /api/v1/secrets?type=api_key&tag=production&page=1&limit=20
```

#### Update Secret

```http
PUT /api/v1/secrets/:name
Content-Type: application/json

{
  "metadata": {
    "environment": "staging"
  },
  "tags": ["payment", "staging"]
}
```

#### Delete Secret

```http
DELETE /api/v1/secrets/:name
DELETE /api/v1/secrets/:name?permanent=true
```

#### Rotate Secret

```http
POST /api/v1/secrets/:name/rotate
Content-Type: application/json

{
  "reason": "Scheduled rotation"
}
```

#### Get Version History

```http
GET /api/v1/secrets/:name/history?limit=10
```

#### Create Dynamic Secret

```http
POST /api/v1/secrets/:name/dynamic
Content-Type: application/json

{
  "ttl": 3600
}
```

### Policies Endpoints

#### Create Policy

```http
POST /api/v1/policies
Content-Type: application/json

{
  "name": "payment-service-policy",
  "description": "Access policy for payment service",
  "rules": [
    {
      "resource": "secrets/payment-*",
      "actions": ["read", "rotate"],
      "effect": "allow"
    },
    {
      "resource": "secrets/*",
      "actions": ["*"],
      "effect": "deny"
    }
  ],
  "priority": 100,
  "appliesTo": ["payment-service"]
}
```

#### List Policies

```http
GET /api/v1/policies?serviceId=payment-service&active=true
```

#### Update Policy

```http
PUT /api/v1/policies/:id
Content-Type: application/json

{
  "rules": [
    {
      "resource": "secrets/orders-*",
      "actions": ["read"],
      "effect": "allow"
    }
  ]
}
```

#### Delete Policy

```http
DELETE /api/v1/policies/:id
```

### Access Endpoints

#### Register Service

```http
POST /api/v1/access/services
Content-Type: application/json

{
  "serviceName": "my-service",
  "permissions": ["secrets:read", "secrets:rotate"],
  "metadata": {
    "team": "platform",
    "owner": "platform@rez.money"
  }
}
```

#### Check Access

```http
GET /api/v1/access/:serviceId
```

#### Evaluate Access

```http
POST /api/v1/access/check
Content-Type: application/json

{
  "resource": "secrets/razorpay-api-key",
  "action": "read",
  "serviceId": "payment-service"
}
```

#### Grant Temporary Access

```http
POST /api/v1/access/grant
Content-Type: application/json

{
  "serviceId": "new-service",
  "secretName": "legacy-api-key",
  "ttl": 3600,
  "reason": "Migration period access"
}
```

#### Get Audit Logs

```http
GET /api/v1/access/audit?secretName=razorpay-api-key&limit=100
```

## Secret Types

| Type | Description |
|------|-------------|
| `api_key` | API keys for external services |
| `database_credentials` | Database usernames and passwords |
| `service_token` | Internal service tokens |
| `tls_certificate` | TLS/SSL certificates |
| `oauth_credentials` | OAuth client IDs and secrets |
| `ssh_key` | SSH keys |
| `password` | Generic passwords |
| `encryption_key` | Encryption keys |
| `custom` | Custom secret types |

## Rotation Schedules

| Schedule | Description |
|----------|-------------|
| `daily` | Rotate every day at midnight |
| `weekly` | Rotate every Sunday at midnight |
| `monthly` | Rotate on the 1st of each month |
| `quarterly` | Rotate every 3 months |
| `yearly` | Rotate once a year |
| `custom` | Use custom cron expression |
| `manual` | No automatic rotation |

## Access Levels

| Level | Description |
|-------|-------------|
| `none` | No access |
| `read` | Can read secret value |
| `write` | Can update secret |
| `admin` | Can manage access |
| `owner` | Full control including delete |

## Security Features

### Encryption

- AES-256-GCM encryption for all secret values
- PBKDF2 key derivation (100,000 iterations)
- Per-secret salt for additional security
- Separate encryption keys from authentication

### Access Control

- RBAC with fine-grained policies
- Deny-first policy evaluation
- Policy priority system
- Service-specific permissions

### Audit Logging

- All operations logged
- Immutable audit trail
- 90-day retention (configurable)
- IP address and user agent tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      REZ Secrets Manager                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Express API │───>│   Services   │───>│   Models     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         │                   │                   │           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Middleware  │    │   Vault      │    │  MongoDB     │  │
│  │  - Auth      │    │   Service    │    │              │  │
│  │  - Rate Limit│    │   - Encrypt  │    │              │  │
│  │  - Logging   │    │   - Decrypt  │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                             │                                │
│         ┌───────────────────┼───────────────────┐           │
│         │                   │                   │            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Rotation    │    │  Access      │    │   Audit      │  │
│  │  Service     │    │  Control     │    │   Service    │  │
│  │  - Cron      │    │  - Policies  │    │   - Logs     │  │
│  │  - Schedules │    │  - Services  │    │   - Events   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- secrets.test.ts
```

## Monitoring

### Health Check

```bash
curl http://localhost:4033/health
```

### Metrics Endpoint

```bash
# View API documentation
curl http://localhost:4033/api
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

ENV NODE_ENV=production

EXPOSE 4033

CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  vault:
    build: .
    ports:
      - "4033:4033"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/rez-secrets-vault
      - VAULT_MASTER_KEY=${VAULT_MASTER_KEY}
      - INTERNAL_SERVICE_TOKEN=${INTERNAL_SERVICE_TOKEN}
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

## License

Proprietary - REZ Ecosystem
