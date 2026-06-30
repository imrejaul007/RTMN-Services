# Service Management - CompanyOS Module

> **Type:** CompanyOS Module
> **Port:** 4510
> **Status:** Production Ready

Unified ticketing system for Customer, IT, and HR requests.

## Features

- ✅ Unified ticketing (Customer + IT + HR)
- ✅ SLA tracking with breach monitoring
- ✅ Approval workflows
- ✅ AI resolution agent
- ✅ Dashboard with metrics
- ✅ Comments and history

## Quick Start

```bash
npm install
npm start
# Runs on port 4510
```

## API Endpoints

### Tickets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets` | List tickets |
| GET | `/api/tickets/:id` | Get ticket |
| PATCH | `/api/tickets/:id` | Update ticket |
| POST | `/api/tickets/:id/comments` | Add comment |
| GET | `/api/tickets/:id/sla` | SLA status |

### Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets/:id/approval` | Request approval |
| POST | `/api/approvals/:id/decide` | Approve/Reject |

### SLA

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sla-policies` | List policies |
| POST | `/api/sla-policies` | Create policy |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Metrics |

## Example

```bash
# Create ticket
curl -X POST http://localhost:4510/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Laptop not working",
    "type": "it",
    "priority": 2,
    "requester_id": "user_123",
    "requester_name": "John Doe"
  }'

# Get SLA status
curl http://localhost:4510/api/tickets/TKT-xxx/sla
```

## Ticket Types

- `customer` - Customer support
- `it` - IT requests
- `hr` - HR requests
- `general` - General requests

## Priorities

- 1 = Critical (SLA: 1 hour)
- 2 = High (SLA: 4 hours)
- 3 = Medium (SLA: 24 hours)
- 4 = Low (SLA: 72 hours)

## AI Resolution Agent

The service includes an AI agent that:

- Categorizes tickets automatically
- Suggests resolutions
- Finds similar resolved tickets
- Generates initial responses
- Suggests assignees

## Docker

```yaml
service-management:
  build: .
  ports:
    - "4510:4510"
```
