# crm-connectors

**Port:** 5465
**Phase:** 3
**Purpose:** HubSpot, Salesforce, Zoho integration

## Features

- Unified API for all CRMs
- Contact sync
- Deal tracking
- Activity logging

## API

- `POST /api/crm/:type/sync` — Sync contacts
- `GET /api/crm/:type/contacts` — Get contacts

## Startup

```bash
cd products/crm-connectors && npm install && npm start
```
