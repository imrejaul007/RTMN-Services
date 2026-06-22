# HOJAI AI - API Documentation
**Version:** 1.0 | **Date:** May 30, 2026

---

## Base URL

```
http://localhost:4500/api
```

## Authentication

```bash
X-Tenant-Id: <tenant_id>
```

## Response Format

```json
{
  "success": true,
  "data": {...},
  "meta": {
    "timestamp": "2026-05-30T00:00:00Z"
  }
}
```

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

## Platforms

| Platform | Port | Base Path |
|----------|------|-----------|
| Gateway | 4500 | /api |
| Governance | 4501 | /api/governance |
| Event | 4510 | /api/events |
| Memory | 4520 | /api/memory |
| Intelligence | 4530 | /api/intelligence |
| Agents | 4550 | /api/agents |
| Workflows | 4560 | /api/workflows |
| Communications | 4570 | /api/communications |
| Hyperlocal | 4580 | /api/hyperlocal |
| Data | 4590 | /api/data |
| Identity | 4600 | /api/identity |
| Analytics | 4610 | /api/analytics |
| Industry | 4700 | /api/industry |

## Rate Limits

| Plan | Requests/min |
|------|-------------|
| Starter | 60 |
| Professional | 300 |
| Enterprise | 1000 |

## Common Endpoints

### Events
- POST /api/events/publish - Publish event
- GET /api/events/history - Event history

### Memory
- GET /api/memory/customer/:id - Customer memory
- POST /api/memory - Store memory

### Intelligence
- POST /api/intelligence/predict - Predictions
- POST /api/intelligence/recommend - Recommendations
- POST /api/intelligence/segment - Segmentation

### Agents
- POST /api/agents/:id/invoke - Invoke agent
- GET /api/agents/:id/stats - Agent stats

### Workflows
- POST /api/workflows - Create workflow
- POST /api/workflows/:id/execute - Execute

### Analytics
- GET /api/analytics/dashboard - Dashboard
- GET /api/analytics/metrics - Metrics
