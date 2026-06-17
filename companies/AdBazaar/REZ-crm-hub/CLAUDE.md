# REZ CRM Hub - Development Guide

**Service:** REZ CRM Hub  
**Port:** 4056  
**Location:** `companies/AdBazaar/REZ-crm-hub/`  
**Status:** ✅ **PRODUCTION READY** | **Deployed on Render**  
**Last Updated:** June 15, 2026

---

## Overview

REZ CRM Hub is a unified CRM platform providing contact management, deal pipeline tracking, and integrations with HubSpot and Zoho CRM. It serves as the central CRM layer for the RTMN/AdBazaar advertising ecosystem.

---

## Architecture

### Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript (compiled to dist/) |
| Database | MongoDB (Mongoose ODM) |
| Cache | Redis (ioredis) |
| Security | Helmet, CORS, JWT, X-Internal-Token |
| Rate Limiting | express-rate-limit |
| Validation | Zod |
| Real-time | WebSocket (ws) |
| Logging | Winston |

### Directory Structure

```
REZ-crm-hub/
├── dist/                    # Compiled JavaScript
│   ├── index.js             # Entry point
│   ├── routes/index.js      # API routes
│   ├── services/            # Business logic
│   ├── middleware/          # Auth, validation, error handling
│   ├── models/              # MongoDB schemas
│   ├── integrations/        # HubSpot/Zoho integrations
│   ├── clients/             # External API clients
│   ├── config/              # Configuration
│   └── utils/               # Utilities
├── src/                     # TypeScript source (placeholder)
├── .env                     # Environment variables
├── package.json
├── render.yaml              # Render deployment
├── Procfile                 # Process definition
├── FEATURES.md             # Feature reference
└── CLAUDE.md               # This file
```

---

## API Routes

### Health Check
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Basic health check |

### HubSpot OAuth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/crm/hubspot/connect` | Initiate HubSpot OAuth |
| GET | `/api/crm/hubspot/callback` | HubSpot OAuth callback |

### Zoho OAuth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/crm/zoho/connect` | Initiate Zoho OAuth |
| GET | `/api/crm/zoho/callback` | Zoho OAuth callback |

### Connections
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/connections` | Get all connection statuses |
| GET | `/api/connections/:provider` | Get provider status |
| DELETE | `/api/connections/:provider` | Disconnect provider |

### Contacts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/contacts` | List contacts (paginated, filterable) |
| POST | `/api/contacts` | Create contact |
| GET | `/api/contacts/:id` | Get contact by ID |
| POST | `/api/contacts/:id/sync` | Force sync contact |
| POST | `/api/contacts/link` | Link contact to ReZ user |
| POST | `/api/contacts/:id/unlink` | Unlink contact |

### Deals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/deals` | List deals (filterable) |
| POST | `/api/deals` | Create deal |
| GET | `/api/deals/stats` | Get pipeline statistics |
| GET | `/api/deals/contact/:contactId` | Get deals by contact |
| GET | `/api/deals/:id` | Get deal by ID |
| PATCH | `/api/deals/:id/stage` | Update deal stage |

### Sync
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sync/status` | Get sync status |
| POST | `/api/sync/trigger` | Trigger sync |
| GET | `/api/sync/history` | Get sync history |

---

## Authentication

### Service-to-Service Auth

All `/api/*` routes require the `X-Internal-Token` header:

```bash
curl -H "X-Internal-Token: your-token" http://localhost:4056/api/contacts
```

### Public Routes
- `/health`
- `/api/crm/hubspot/connect`
- `/api/crm/hubspot/callback`
- `/api/crm/zoho/connect`
- `/api/crm/zoho/callback`

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | HTTP server port | No (default: 4056) |
| `NODE_ENV` | Environment (production/development) | No |
| `MONGODB_URI` | MongoDB connection URI | Yes |
| `REDIS_URL` | Redis connection URL | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `INTERNAL_SERVICE_TOKEN` | Service-to-service auth token | Yes |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | No |
| `PUBLIC_URL` | Public URL for OAuth redirects | Yes in production |
| `HUBSPOT_API_KEY` | HubSpot API key | No |
| `HUBSPOT_REDIRECT_URI` | HubSpot OAuth redirect URI | No |
| `ZOHO_CLIENT_ID` | Zoho OAuth client ID | No |
| `ZOHO_CLIENT_SECRET` | Zoho OAuth client secret | No |
| `ZOHO_REFRESH_TOKEN` | Zoho refresh token | No |
| `ZOHO_DATACENTER` | Zoho data center (.in/.com/.eu/.au) | No |

---

## Bug Fixes Applied

### Route Order Bug (Critical)

**Problem:** `GET /api/deals/stats` returned 400 Bad Request because Express matched "stats" as the `:id` parameter and failed MongoDB ObjectId cast.

**Fix:** Moved `/deals/stats` and `/deals/contact/:id` routes BEFORE the wildcard `/deals/:id` route in `dist/routes/index.js`:

```javascript
// ✅ CORRECT ORDER (specific routes first)
router.get('/deals/stats', ...);           // Line 370
router.get('/deals/contact/:contactId', ...);  // Line 381
router.get('/deals/:id', ...);             // Line 392

// ❌ WRONG ORDER (wildcard first catches everything)
router.get('/deals/:id', ...);             // Catches "stats" as id
router.get('/deals/stats', ...);           // Never reached
```

### CORS Fix

**Problem:** CORS was wide open (`origin: true`) in production.

**Fix:** CORS origins now driven by `ALLOWED_ORIGINS` env var:

```javascript
function getAllowedOrigins() {
    const env = process.env.ALLOWED_ORIGINS || '';
    if (!env) return true; // development: allow all
    return env.split(',').map(o => o.trim()).filter(Boolean);
}
app.use(cors({ origin: getAllowedOrigins(), credentials: true }));
```

### OAuth Redirect URI Fix

**Problem:** HubSpot/Zoho OAuth redirect URIs were hardcoded to localhost.

**Fix:** Redirect URIs now use `PUBLIC_URL` env var:

```javascript
redirectUri: process.env.HUBSPOT_REDIRECT_URI
    || (process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/api/crm/hubspot/callback` : 'http://localhost:4056/api/crm/hubspot/callback'),
```

### Stale Token Headers

**Problem:** Token was captured at module load time, causing stale auth headers.

**Fix:** Using axios interceptors for dynamic token injection at request time.

---

## Testing

### Health Check
```bash
curl http://localhost:4056/health
```

### Test with Auth
```bash
curl -H "X-Internal-Token: your-token" http://localhost:4056/api/contacts
```

### Test Deals Stats
```bash
curl -H "X-Internal-Token: your-token" http://localhost:4056/api/deals/stats
```

### Create Contact
```bash
curl -X POST http://localhost:4056/api/contacts \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: your-token" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com"}'
```

### Get Pipeline Stats
```bash
curl -H "X-Internal-Token: your-token" http://localhost:4056/api/deals/stats
```

---

## Deployment

### Render Blueprint

The service is deployed via `render.yaml`:

```bash
render blueprint apply render.yaml
```

### Manual Deploy

```bash
cd companies/AdBazaar/REZ-crm-hub
npm install
npm run build
node dist/index.js
```

### Procfile
```
web: node dist/index.js
```

---

## Production Checklist

- [x] Set `NODE_ENV=production`
- [x] Set `INTERNAL_SERVICE_TOKEN` to a strong random value
- [x] Set `JWT_SECRET` to a strong random value
- [x] Configure `ALLOWED_ORIGINS` (comma-separated)
- [x] Set `PUBLIC_URL` to production URL
- [x] Set `MONGODB_URI` to production MongoDB
- [x] Set `REDIS_URL` to production Redis
- [x] Health check returns 200 OK

---

## Integration with SalesMind

REZ SalesMind (port 5170) integrates with REZ CRM Hub via:

```
SalesMind → CRM Hub
  ├── Reads CRM_HUB_TOKEN env var
  ├── Request interceptor injects X-Internal-Token
  └── Fetches contacts, deals, pipeline data
```

Ensure `CRM_HUB_TOKEN` in SalesMind matches `INTERNAL_SERVICE_TOKEN` in CRM Hub.

---

## File Reference

| File | Purpose |
|------|---------|
| `dist/index.js` | Entry point, Express app setup |
| `dist/routes/index.js` | All API route definitions |
| `dist/services/authService.js` | OAuth flows for HubSpot/Zoho |
| `dist/services/contactService.js` | Contact CRUD operations |
| `dist/services/dealService.js` | Deal CRUD operations |
| `dist/services/syncService.js` | Sync engine |
| `dist/middleware/auth.js` | Internal auth middleware |
| `dist/middleware/errorHandler.js` | Error handling |
| `dist/middleware/validation.js` | Zod validation |
| `dist/models/*.js` | MongoDB schemas |

---

*Last Updated: June 15, 2026*
