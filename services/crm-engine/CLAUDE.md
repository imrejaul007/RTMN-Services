# CRM Engine Service

**Version:** 1.0.0  
**Port:** 4888  
**Purpose:** Deals, Contacts, and Pipeline management for Customer Support OS

---

## Overview

CRM Engine provides comprehensive CRM functionality including:
- Contact management (leads, customers)
- Deal/Pipeline management with stages
- Activity tracking (calls, emails, notes, meetings)
- Multi-tenant support via tenantId
- HubSpot CRM integration
- Zoho CRM integration

---

## API Endpoints

### Health Check
```
GET /health
```

### Contacts
```
GET    /api/contacts              - List all contacts (with pagination)
GET    /api/contacts/:id           - Get contact by ID
POST   /api/contacts               - Create contact
PUT    /api/contacts/:id           - Update contact
DELETE /api/contacts/:id           - Delete contact
POST   /api/contacts/sync/hubspot  - Sync contacts with HubSpot
POST   /api/contacts/sync/zoho     - Sync contacts with Zoho
```

### Deals
```
GET    /api/deals                  - List all deals (with pagination)
GET    /api/deals/:id               - Get deal by ID
POST   /api/deals                   - Create deal
PUT    /api/deals/:id               - Update deal
DELETE /api/deals/:id               - Delete deal
PATCH  /api/deals/:id/stage         - Update deal stage
POST   /api/deals/sync/hubspot      - Sync deals with HubSpot
POST   /api/deals/sync/zoho         - Sync deals with Zoho
```

### Activities
```
GET    /api/activities             - List activities (filterable)
GET    /api/activities/:id          - Get activity by ID
POST   /api/activities               - Create activity
PUT    /api/activities/:id           - Update activity
DELETE /api/activities/:id           - Delete activity
```

---

## Data Models

### Contact
| Field | Type | Description |
|-------|------|-------------|
| tenantId | string | Multi-tenant identifier |
| name | string | Full name |
| email | string | Email address |
| phone | string | Phone number |
| company | string | Company name |
| lifecycleStage | enum | lead, prospect, customer, evangelist |
| leadSource | string | Where lead came from |
| owner | string | Assigned owner ID |
| externalIds | object | HubSpot contact ID, Zoho contact ID |
| metadata | object | Custom fields |

### Deal
| Field | Type | Description |
|-------|------|-------------|
| tenantId | string | Multi-tenant identifier |
| title | string | Deal name |
| value | number | Deal value (currency) |
| stage | enum | prospect, qualification, proposal, negotiation, closed_won, closed_lost |
| probability | number | 0-100 probability |
| contactId | string | Primary contact |
| expectedClose | Date | Expected close date |
| externalIds | object | HubSpot deal ID, Zoho deal ID |

### Activity
| Field | Type | Description |
|-------|------|-------------|
| tenantId | string | Multi-tenant identifier |
| type | enum | call, email, note, meeting, task |
| description | string | Activity details |
| contactId | string | Related contact |
| dealId | string | Related deal |
| date | Date | Activity date |

---

## Deal Pipeline Stages

1. **prospect** - Initial contact made
2. **qualification** - Lead qualified
3. **proposal** - Proposal sent
4. **negotiation** - In negotiation
5. **closed_won** - Deal won
6. **closed_lost** - Deal lost

---

## Integration

### HubSpot
Enable by setting `HUBSPOT_ENABLED=true` and providing `HUBSPOT_API_KEY`.  
Syncs contacts and deals bidirectionally.

### Zoho CRM
Enable by setting `ZOHO_ENABLED=true` and providing OAuth credentials.  
Syncs contacts and deals bidirectionally.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4888 | Service port |
| MONGODB_URI | mongodb://localhost:27017/crm-engine | MongoDB connection |
| JWT_SECRET | - | JWT signing secret |
| HUBSPOT_API_KEY | - | HubSpot API key |
| ZOHO_CLIENT_ID | - | Zoho OAuth client ID |

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Start service
npm run dev
```
