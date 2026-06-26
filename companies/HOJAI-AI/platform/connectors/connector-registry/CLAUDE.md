# Connector Registry Service

**Port:** 4753  
**Type:** Infrastructure  
**Phase:** Supporting Infrastructure  
**Author:** HOJAI AI

---

## What This Service Does

The Connector Registry is the central registry for all software connectors:
- Manages connector metadata
- Tracks capabilities
- Health monitoring
- Configuration management

---

## Key Endpoints

### List Connectors
```
GET /api/connectors?category=communication&status=active
```

### Get Connector
```
GET /api/connectors/:id
```

### Register Connector
```
POST /api/connectors
Body: { id: string, name: string, category: string, port: number, capabilities: [] }
```

### Configure Connector
```
POST /api/connectors/:id/config
Body: { credentials: {}, webhookUrl?: string, filters?: {} }
```

### Get Capabilities
```
GET /api/capabilities
```

### Find by Capability
```
GET /api/capabilities/:capability/connectors
```

### Health Check
```
GET /api/health/connectors
```

---

## Connector Categories

| Category | Description |
|----------|-------------|
| communication | Email, chat, messaging |
| crm | Customer relationship management |
| finance | Accounting, payments |
| development | Code, CI/CD |
| productivity | Docs, tasks, calendars |
| social | Social media |

---

## Registered Connectors

| Connector | Category | Port |
|-----------|----------|------|
| Slack | communication | 4790 |
| GitHub | development | 4791 |
| Gmail | communication | 4792 |
| Jira | productivity | 4793 |
| Notion | productivity | 4794 |
| Calendar | productivity | 4795 |
| HubSpot | crm | 4780 |
| Teams | communication | 4781 |
| Zoom | communication | 4782 |
| QuickBooks | finance | 4783 |
| Zoho | crm | 4784 |
| Salesforce | crm | 4786 |
| Shopify | commerce | 4787 |
| Stripe | finance | 4788 |

---

## Dependencies

| Service | Port | Purpose |
|--------|------|---------|
| All Connectors | Various | Health checks |
