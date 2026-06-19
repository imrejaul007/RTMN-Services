# Audit Trail

**Service:** Audit Logging
**Port:** 4702 (via gateway)
**Prefix:** `/api/audit`

---

## Overview

The Audit Trail service provides immutable logging of all identity-related events. It's essential for compliance, security investigations, and operational monitoring.

## Features

- **Immutable Logs:** Append-only, tamper-evident
- **100K Event Storage:** Automatic cleanup of old events
- **Categorized Events:** Authentication, authorization, data, system
- **Full Search:** Filter by actor, action, resource, date
- **Export Support:** JSON and CSV formats
- **Statistics:** Event counts by category and time
- **User Trails:** Complete history per user
- **Resource Trails:** All events for a specific resource
- **90-Day Retention:** Automatic expiry

## Audit Categories

| Category | Examples |
|----------|----------|
| `authentication` | Login, logout, MFA, password changes |
| `authorization` | Permission grants, denials |
| `user_management` | Create, update, delete users |
| `org_management` | Create, update, delete organizations |
| `security` | Device added, suspicious activity |
| `system` | System-level events |
| `data_access` | Data reads |
| `data_modification` | Data writes |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/events` | Query events |
| GET | `/api/audit/events/:id` | Get specific event |
| GET | `/api/audit/user/:userId` | User's audit trail |
| GET | `/api/audit/resource/:type/:id` | Resource audit trail |
| GET | `/api/audit/stats` | Statistics |
| POST | `/api/audit/export` | Export events |

## Usage Example

### Query Events
```bash
curl "http://localhost:4702/api/audit/events?action=auth.login&startDate=2026-06-01&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### Get User Trail
```bash
curl "http://localhost:4702/api/audit/user/USER_ID?limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Statistics
```bash
curl http://localhost:4702/api/audit/stats \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "stats": {
    "totalEvents": 5000,
    "byCategory": {
      "authentication": 3000,
      "data_modification": 1500,
      "user_management": 500
    },
    "byResult": {
      "success": 4800,
      "failure": 200
    },
    "byAction": {
      "auth.login": 2500,
      "user.created": 200,
      "org.created": 50
    },
    "dateRange": {
      "earliest": "2026-06-01T00:00:00Z",
      "latest": "2026-06-18T23:59:59Z"
    }
  }
}
```

### Export Events
```bash
curl -X POST http://localhost:4702/api/audit/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "startDate": "2026-01-01",
      "endDate": "2026-12-31"
    },
    "format": "json"
  }'
```

## Query Filters

| Filter | Type | Description |
|--------|------|-------------|
| `actorId` | string | Filter by actor ID |
| `actorEmail` | string | Filter by actor email |
| `action` | string | Filter by action (e.g., "auth.login") |
| `actions` | string[] | Filter by multiple actions |
| `category` | string | Filter by category |
| `resourceType` | string | Filter by resource type |
| `resourceId` | string | Filter by resource ID |
| `result` | string | success, failure, denied |
| `startDate` | ISO date | Start of date range |
| `endDate` | ISO date | End of date range |

## Retention Policy

- Default retention: 90 days
- Configurable via retentionDays field
- Automatic cleanup runs hourly
- Export before expiration for long-term storage

## File Structure

```
audit/
├── src/
│   ├── models/
│   │   └── audit.model.js
│   └── routes/
│       └── audit.routes.js
└── CLAUDE.md
```