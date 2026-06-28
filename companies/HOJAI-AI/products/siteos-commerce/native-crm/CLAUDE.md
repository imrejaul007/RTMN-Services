# HOJAI SiteOS Native CRM Service

**Port:** 5484
**Version:** 1.0.0
**Status:** Production Ready

## Overview

Native CRM built into SiteOS - contact management, deal pipeline, tasks, analytics.

## Features

- **Contact Management** - Full CRUD, tags, custom fields
- **Deal Pipeline** - 6-stage Kanban with drag-and-drop
- **Task Management** - Tasks linked to contacts/deals
- **Activity Timeline** - All interactions in one place
- **Import/Export** - CSV bulk operations
- **Analytics** - Pipeline metrics, win rates

## Deal Stages

| Stage | Probability | Color |
|-------|-------------|-------|
| Qualification | 10% | Gray |
| Discovery | 25% | Blue |
| Proposal | 50% | Amber |
| Negotiation | 75% | Purple |
| Won | 100% | Green |
| Lost | 0% | Red |

## Lifecycle Stages

subscriber → lead → opportunity → customer → churned

## API Endpoints

### Contacts
- `GET /api/contacts` - List contacts (with filters)
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/contacts/:id/timeline` - Activity timeline
- `POST /api/contacts/:id/notes` - Add note
- `POST /api/contacts/:id/tags` - Add tags

### Deals
- `GET /api/deals` - List deals
- `GET /api/deals/pipeline` - Pipeline view
- `POST /api/deals` - Create deal
- `GET /api/deals/:id` - Get deal
- `PUT /api/deals/:id` - Update deal
- `PUT /api/deals/:id/stage` - Move stage
- `POST /api/deals/:id/activities` - Add activity
- `DELETE /api/deals/:id` - Delete deal

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update/complete task
- `DELETE /api/tasks/:id` - Delete task

### Analytics
- `GET /api/analytics/summary` - CRM summary
- `GET /api/analytics/pipeline` - Pipeline analytics

### Import/Export
- `POST /api/contacts/import` - Bulk import
- `GET /api/contacts/export` - CSV export

## Example Usage

```bash
# Create contact
curl -X POST http://localhost:5484/api/contacts \
  -H "Content-Type: json" \
  -H "X-API-Key: your-key" \
  -d '{"firstName": "John", "email": "john@example.com", "company": "Acme Inc"}'

# Create deal
curl -X POST http://localhost:5484/api/deals \
  -H "Content-Type: json" \
  -H "X-API-Key: your-key" \
  -d '{"title": "Enterprise License", "value": 50000, "contactId": "uuid"}'

# Get pipeline
curl http://localhost:5484/api/deals/pipeline -H "X-API-Key: your-key"
```

## Files

```
native-crm/
├── src/index.js       # Main service (400 lines)
├── package.json
├── vitest.config.js
└── CLAUDE.md
```
