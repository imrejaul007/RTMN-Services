# REZ CRM Hub

**Unified CRM Platform for RTMN Ecosystem**

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](https://github.com)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

---

## Overview

REZ CRM Hub is a unified CRM platform providing contact management, deal pipeline tracking, and integrations with HubSpot and Zoho CRM. It serves as the central CRM layer for the RTMN/AdBazaar advertising ecosystem.

## Features

- **Contact Management** - CRUD, search, filter, deduplication, bulk import
- **Deal Pipeline** - Stage tracking, value/probability, analytics
- **HubSpot Integration** - OAuth 2.0, bi-directional sync, webhooks
- **Zoho CRM Integration** - OAuth 2.0, multi-datacenter support
- **Sync Engine** - Manual trigger, scheduled sync, per-entity sync
- **Real-time** - WebSocket for sync status updates
- **Rate Limiting** - 100 req/min general, 20 req/min write
- **Security** - Service-to-service auth via X-Internal-Token

---

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB
- Redis

### Installation

```bash
cd companies/AdBazaar/REZ-crm-hub
npm install
```

### Configuration

Create a `.env` file:

```bash
PORT=4056
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rez-crm
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
INTERNAL_SERVICE_TOKEN=your-internal-token
ALLOWED_ORIGINS=http://localhost:3000
PUBLIC_URL=http://localhost:4056
```

### Run

```bash
npm start
```

Service will be available at `http://localhost:4056`

---

## API Endpoints

### Health

```bash
curl http://localhost:4056/health
```

### Contacts

```bash
# List contacts
curl -H "X-Internal-Token: your-token" http://localhost:4056/api/contacts

# Create contact
curl -X POST http://localhost:4056/api/contacts \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: your-token" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com"}'
```

### Deals

```bash
# List deals
curl -H "X-Internal-Token: your-token" http://localhost:4056/api/deals

# Get pipeline stats
curl -H "X-Internal-Token: your-token" http://localhost:4056/api/deals/stats

# Create deal
curl -X POST http://localhost:4056/api/deals \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: your-token" \
  -d '{"title":"New Deal","amount":5000,"stage":"qualified"}'
```

### HubSpot OAuth

```bash
# Start OAuth flow
curl http://localhost:4056/api/crm/hubspot/connect?state=random-state
```

### Zoho OAuth

```bash
# Start OAuth flow
curl http://localhost:4056/api/crm/zoho/connect?state=random-state
```

### Sync

```bash
# Get sync status
curl -H "X-Internal-Token: your-token" http://localhost:4056/api/sync/status

# Trigger sync
curl -X POST http://localhost:4056/api/sync/trigger \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: your-token" \
  -d '{"provider":"hubspot","force":true}'
```

---

## Authentication

All `/api/*` endpoints require the `X-Internal-Token` header:

```bash
curl -H "X-Internal-Token: your-internal-token" http://localhost:4056/api/contacts
```

### Public Endpoints (No Auth Required)

- `/health`
- `/api/crm/hubspot/connect`
- `/api/crm/hubspot/callback`
- `/api/crm/zoho/connect`
- `/api/crm/zoho/callback`

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | HTTP server port (default: 4056) | No |
| `NODE_ENV` | Environment | No |
| `MONGODB_URI` | MongoDB connection URI | Yes |
| `REDIS_URL` | Redis connection URL | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `INTERNAL_SERVICE_TOKEN` | Service-to-service auth | Yes |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | No |
| `PUBLIC_URL` | Public URL for OAuth | Yes |
| `HUBSPOT_API_KEY` | HubSpot API key | No |
| `HUBSPOT_REDIRECT_URI` | HubSpot redirect URI | No |
| `ZOHO_CLIENT_ID` | Zoho client ID | No |
| `ZOHO_CLIENT_SECRET` | Zoho client secret | No |
| `ZOHO_REFRESH_TOKEN` | Zoho refresh token | No |
| `ZOHO_DATACENTER` | Zoho datacenter (.in/.com/.eu/.au) | No |

---

## Deployment

### Render

```bash
render blueprint apply render.yaml
```

### Manual Deploy

```bash
npm install
npm run build
node dist/index.js
```

### Procfile

```
web: node dist/index.js
```

---

## Bug Fixes

| Bug | Fix |
|-----|-----|
| `/deals/stats` 400 error | Route order fixed (specific routes before wildcard) |
| Auth wide open | X-Internal-Token required on all /api/* routes |
| CORS open | Origins driven by ALLOWED_ORIGINS env var |
| OAuth redirect localhost | Uses PUBLIC_URL env var |
| Stale token headers | Dynamic token injection via interceptors |

---

## License

MIT

---

**Last Updated: June 15, 2026**
