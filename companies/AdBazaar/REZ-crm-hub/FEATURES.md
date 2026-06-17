# REZ-crm-hub — Feature Reference

**Service:** REZ CRM Hub  
**Port:** 4056  
**Stack:** Node.js · Express · Mongoose · Redis · TypeScript  
**Status:** ✅ Production Ready

---

## Overview

REZ-crm-hub is a unified CRM platform providing contact management, deal pipeline tracking, and integrations with HubSpot and Zoho CRM. It serves as the central CRM layer for the RTMN/AdBazaar advertising ecosystem.

---

## Core Features

### Contact Management
- [x] Create, read, update, delete contacts
- [x] Contact fields: email, firstName, lastName, phone, company, source, tags, custom fields
- [x] Search and filter contacts
- [x] Contact deduplication
- [x] Bulk import/export
- [x] Contact activity timeline

### Deal Pipeline
- [x] Create and manage deals across pipeline stages
- [x] Stage tracking: Lead → Qualified → Proposal → Negotiation → Closed Won/Lost
- [x] Deal value and probability
- [x] Deal-contact associations
- [x] Deal notes and attachments
- [x] Pipeline analytics

### HubSpot Integration
- [x] Bi-directional contact sync
- [x] Real-time webhook receiver
- [x] Custom field mapping
- [x] Sync history tracking
- [x] Conflict resolution
- [x] Scheduled full sync

### Zoho CRM Integration
- [x] OAuth 2.0 authentication
- [x] Bi-directional contact sync
- [x] Real-time webhook receiver
- [x] Custom field mapping
- [x] Multi-datacenter support (.in, .com, .eu, .au)
- [x] Sync history tracking

### Multi-Channel Communication
- [x] WhatsApp messaging via REZ-WhatsApp-Commerce
- [x] Email campaigns
- [x] SMS notifications
- [x] Push notifications
- [x] Unified inbox view

---

## API Endpoints

### Contacts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/contacts` | List contacts (paginated, filterable) |
| POST | `/api/contacts` | Create contact |
| GET | `/api/contacts/:id` | Get contact by ID |
| PUT | `/api/contacts/:id` | Update contact |
| DELETE | `/api/contacts/:id` | Delete contact |
| POST | `/api/contacts/bulk` | Bulk import contacts |
| GET | `/api/contacts/search?q=` | Search contacts |

### Deals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/deals` | List deals (filterable by stage, value) |
| POST | `/api/deals` | Create deal |
| GET | `/api/deals/:id` | Get deal by ID |
| PUT | `/api/deals/:id` | Update deal |
| DELETE | `/api/deals/:id` | Delete deal |
| PUT | `/api/deals/:id/stage` | Move deal to stage |
| GET | `/api/deals/pipeline` | Get pipeline overview |

### Integrations
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/integrations/hubspot/sync` | Trigger HubSpot sync |
| POST | `/api/integrations/hubspot/webhook` | Receive HubSpot webhook |
| GET | `/api/integrations/hubspot/status` | Sync status |
| POST | `/api/integrations/zoho/sync` | Trigger Zoho sync |
| POST | `/api/integrations/zoho/webhook` | Receive Zoho webhook |
| GET | `/api/integrations/zoho/status` | Sync status |

### Messaging
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/messages/whatsapp` | Send WhatsApp message |
| GET | `/api/messages` | List messages |
| GET | `/api/messages/:id` | Get message status |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/live` | Kubernetes liveness probe |
| GET | `/health/ready` | Kubernetes readiness probe |
| GET | `/api/health` | Detailed health with DB status |

---

## Data Models

### Contact
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  source: 'website' | 'referral' | 'ad' | 'import' | 'api';
  tags: string[];
  customFields: Record<string, unknown>;
  hubspotId?: string;
  zohoId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Deal
```typescript
{
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  contactId: string;
  ownerId?: string;
  expectedCloseDate?: Date;
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `PORT` | 4056 | HTTP server port |
| `NODE_ENV` | development | Environment |
| `MONGODB_URI` | — | MongoDB connection URI (required) |
| `REDIS_URL` | — | Redis connection URL (required) |
| `JWT_SECRET` | — | JWT signing secret |
| `RABTUL_AUTH_URL` | http://localhost:4002 | RABTUL Auth service |
| `RABTUL_WALLET_URL` | http://localhost:4004 | RABTUL Wallet |
| `RABTUL_NOTIFICATION_URL` | http://localhost:4005 | RABTUL Notification |
| `HUBSPOT_API_KEY` | — | HubSpot API key |
| `HUBSPOT_SYNC_INTERVAL` | 3600000 | Sync interval (ms) |
| `ZOHO_CLIENT_ID` | — | Zoho OAuth client ID |
| `ZOHO_CLIENT_SECRET` | — | Zoho OAuth client secret |
| `ZOHO_REFRESH_TOKEN` | — | Zoho refresh token |
| `ZOHO_DATACENTER` | .in | Zoho data center |
| `INTERNAL_SERVICE_TOKEN` | — | Service-to-service auth |

---

## Rate Limiting

- **Default:** 100 requests per 15 minutes per IP
- **API endpoints:** Configurable per route
- **Integration endpoints:** 10 requests per minute

---

## Observability

- Health endpoints for Kubernetes probes (`/health/live`, `/health/ready`)
- Structured JSON logging via Winston
- Redis key prefix: `rez:crm:`
- MongoDB connection pool: 2–10 connections

---

## Dependencies

| Service | Port | Required | Purpose |
|---------|------|----------|---------|
| MongoDB | 27017 | Yes | Persistence |
| Redis | 6379 | Yes | Cache & rate limit |
| RABTUL Auth | 4002 | Yes | Service token validation |
| RABTUL Wallet | 4004 | No | Payment links in deals |
| RABTUL Notification | 4005 | No | Alerts |

---

## File Structure

```
REZ-crm-hub/
├── src/
│   ├── __tests__/        # Unit tests (vitest)
│   ├── constants/        # Static constants
│   ├── workers/          # Background workers
│   └── index.ts          # Entry point
├── dist/                 # Compiled output
├── .env                  # Environment (gitignored)
├── package.json
├── tsconfig.json
└── FEATURES.md           # This file
```

---

*Last Updated: June 15, 2026*
