# CRM Connectors - HOJAI SiteOS

Unified CRM integration for HubSpot, Salesforce, and Zoho.

## Quick Start

```bash
cd crm-connectors
npm install
npm start
```

## Features

- **Unified API**: Single interface for all CRM operations
- **Data Normalization**: Consistent schema across CRMs
- **Real-time Sync**: Keep data in sync across systems
- **Contact Management**: Full CRUD operations
- **Deal Tracking**: Pipeline and stage management
- **Company Management**: Account tracking
- **Analytics**: CRM reporting and insights

## Setup

### Configure CRM

```bash
# HubSpot
curl -X POST http://localhost:5465/api/crm/config \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "crmType": "hubspot",
    "apiKey": "your-api-key"
  }'

# Salesforce
curl -X POST http://localhost:5465/api/crm/config \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "crmType": "salesforce",
    "apiKey": "your-access-token",
    "instanceUrl": "https://your-instance.salesforce.com"
  }'

# Zoho
curl -X POST http://localhost:5465/api/crm/config \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "crmType": "zoho",
    "apiKey": "your-api-key"
  }'
```

## Contacts

### Create Contact
```bash
curl -X POST http://localhost:5465/api/crm/contacts \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "crmType": "hubspot",
    "contactData": {
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+919876543210",
      "jobTitle": "Marketing Manager",
      "company": "Acme Corp"
    }
  }'
```

### List Contacts
```bash
curl "http://localhost:5465/api/crm/contacts?companyId=your-company&search=john"
```

### Update Contact
```bash
curl -X PUT http://localhost:5465/api/crm/contacts/cnt_abc123 \
  -H 'Content-Type: application/json' \
  -d '{
    "phone": "+919876543211",
    "jobTitle": "VP Marketing"
  }'
```

## Companies

### Create Company
```bash
curl -X POST http://localhost:5465/api/crm/companies \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "crmType": "hubspot",
    "companyData": {
      "name": "Acme Corporation",
      "domain": "acme.com",
      "industry": "Technology",
      "phone": "+919876543200"
    }
  }'
```

## Deals

### Create Deal
```bash
curl -X POST http://localhost:5465/api/crm/deals \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "crmType": "hubspot",
    "dealData": {
      "title": "Enterprise License - Acme Corp",
      "value": 100000,
      "stage": "presentationscheduled",
      "closeDate": "2026-08-30"
    },
    "contactIds": ["cnt_abc123"],
    "companyIdRef": "cmp_xyz789"
  }'
```

### Update Deal Stage
```bash
curl -X PUT http://localhost:5465/api/crm/deals/dl_abc123/stage \
  -H 'Content-Type: application/json' \
  -d '{
    "stage": "contractsent",
    "notes": "Contract sent for review"
  }'
```

### Deal Stages

| Stage | Description |
|-------|-------------|
| `appointmentscheduled` | Meeting booked |
| `qualifiedtobuy` | Lead qualified |
| `presentationscheduled` | Demo given |
| `decisionmakerboughtin` | Decision maker involved |
| `contractsent` | Contract sent |
| `closedwon` | Deal won |
| `closedlost` | Deal lost |

## Sync

### Trigger Full Sync
```bash
curl -X POST http://localhost:5465/api/crm/sync \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "crmType": "hubspot",
    "syncType": "full"
  }'
```

### Check Sync Status
```bash
curl http://localhost:5465/api/crm/sync/sync_abc123
```

Response:
```json
{
  "success": true,
  "data": {
    "jobId": "sync_abc123",
    "status": "completed",
    "progress": 100,
    "results": {
      "created": 10,
      "updated": 25,
      "errors": 0
    },
    "startedAt": "2026-06-27T10:00:00Z",
    "completedAt": "2026-06-27T10:05:00Z"
  }
}
```

## Query

### Search Contacts
```bash
curl -X POST http://localhost:5465/api/crm/query \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "crmType": "hubspot",
    "entity": "contacts",
    "filters": { "company": "Acme Corp" },
    "page": 1,
    "limit": 20
  }'
```

### Filter Deals by Stage
```bash
curl -X POST http://localhost:5465/api/crm/query \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "crmType": "hubspot",
    "entity": "deals",
    "filters": { "stage": "closedwon" },
    "page": 1,
    "limit": 50
  }'
```

## Analytics

### Get CRM Analytics
```bash
curl "http://localhost:5465/api/crm/analytics?companyId=your-company"
```

Response:
```json
{
  "success": true,
  "data": {
    "deals": {
      "total": 45,
      "byStage": {
        "appointmentscheduled": 5,
        "qualifiedtobuy": 10,
        "presentationscheduled": 8,
        "decisionmakerboughtin": 5,
        "contractsent": 7,
        "closedwon": 8,
        "closedlost": 2
      },
      "totalPipeline": 5000000,
      "totalWon": 1200000,
      "winRate": "17.78"
    },
    "contacts": {
      "total": 250
    },
    "companies": {
      "total": 85
    }
  }
}
```

## Environment Variables

```bash
CRM_CONNECTORS_PORT=5465
MEMORY_OS_URL=http://localhost:4703
TWIN_OS_URL=http://localhost:4705
```

## License

Proprietary - HOJAI AI
