# genie-notion-service API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:PORT/api`  
**Authentication:** Headers (`X-Tenant-Id`, `X-User-Id`)

---

## Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| X-Tenant-Id | string | ✅ | Tenant identifier |
| X-User-Id | string | ✅ | User identifier |
| X-Request-Id | string | ❌ | Request tracking ID |

---

## Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "genie-notion-service",
  "version": "1.0.0",
  "timestamp": "2026-06-13T00:00:00.000Z",
  "uptime": 12345.67,
  "environment": "production"
}
```

### Liveness Probe

```http
GET /health/live
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-13T00:00:00.000Z"
}
```

### Readiness Probe

```http
GET /health/ready
```

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2026-06-13T00:00:00.000Z"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "meta": {
    "timestamp": "2026-06-13T00:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| MISSING_TENANT_ID | 400 | X-Tenant-Id header required |
| VALIDATION_ERROR | 400 | Invalid request body |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| NOT_FOUND | 404 | Resource not found |
| ROUTE_NOT_FOUND | 404 | Endpoint not found |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

- **Global:** 100 requests/minute
- **Strict:** 10 requests/minute (sensitive endpoints)
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Examples

### cURL

```bash
# Health check
curl http://localhost:PORT/health

# API request
curl -X GET http://localhost:PORT/api/status \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant-123" \
  -H "X-User-Id: user-456"
```

### JavaScript

```javascript
const response = await fetch('http://localhost:PORT/api/status', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Id': 'tenant-123',
    'X-User-Id': 'user-456'
  }
});

const data = await response.json();
console.log(data);
```
