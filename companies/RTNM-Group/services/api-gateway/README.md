# RTMN API Gateway

Unified entry point for all RTMN Industry OS services. Handles authentication, routing, rate limiting, and service discovery across 24 industries.

## Features

- **Unified API** - Single entry point for all industry services
- **Authentication** - JWT-based authentication and authorization
- **Rate Limiting** - 40 requests per 60 seconds (configurable)
- **Service Discovery** - Dynamic service registry
- **Caching** - Redis-based response caching
- **Industry Proxies** - Direct routing to industry-specific services

## Quick Start

```bash
# Install dependencies
cd core/api-gateway
npm install

# Set environment variables
cp .env.example .env

# Start the gateway
npm start
```

## Environment Variables

```env
PORT=3000
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379

# Industry service URLs
LEGAL_OS_URL=http://localhost:3001
HEALTHCARE_OS_URL=http://localhost:3002
FINANCE_OS_URL=http://localhost:3003
# ... etc
```

## API Endpoints

### Public Routes

```
GET  /health                    - Health check
GET  /services                  - List available services
POST /api/auth/login            - Authenticate user
POST /api/auth/verify           - Verify token
POST /api/auth/refresh          - Refresh token
```

### Protected Routes (require JWT)

```
# Twins
GET    /api/twins               - List twins
POST   /api/twins               - Create twin
GET    /api/twins/:id           - Get twin
PUT    /api/twins/:id           - Update twin
DELETE /api/twins/:id           - Delete twin

# Agents
GET    /api/agents               - List agents
GET    /api/agents/:id          - Get agent
POST   /api/agents/:id/execute  - Execute task
GET    /api/agents/:id/status   - Get agent status

# Industries
GET    /api/industries          - List industries
GET    /api/industries/:id      - Get industry
GET    /api/industries/:id/twins  - Industry twins
GET    /api/industries/:id/agents - Industry agents

# CRM
GET    /api/crm/providers       - List CRM providers
GET    /api/crm/contacts        - Get contacts
POST   /api/crm/contacts        - Create contact
POST   /api/crm/sync            - Start sync
```

### Industry Proxy Routes

```
GET/POST /api/v1/:industry/*   - Proxy to industry service
```

Example:
```
GET /api/v1/legal/cases         - Routes to Legal OS
GET /api/v1/healthcare/patients - Routes to Healthcare OS
```

## Rate Limiting

Default: 40 requests per 60 seconds per IP

Response when exceeded:
```json
{
  "error": "Rate limit exceeded. Max 40 requests per minute."
}
```

## Authentication

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass", "industry": "legal"}'

# Use token
curl http://localhost:3000/api/twins \
  -H "Authorization: Bearer <token>"
```

## Architecture

```
api-gateway/
├── src/
│   ├── index.js              # Main entry
│   ├── routes/
│   │   ├── auth.js           # Authentication
│   │   ├── twins.js          # Digital twins
│   │   ├── agents.js         # AI agents
│   │   ├── industries.js      # Industry listing
│   │   └── crm.js             # CRM integration
│   ├── middleware/
│   │   ├── auth.js           # JWT verification
│   │   ├── logging.js        # Request logging
│   │   └── cache.js          # Redis caching
│   └── services/
│       └── serviceRegistry.js # Service discovery
├── package.json
└── README.md
```

## License

MIT
