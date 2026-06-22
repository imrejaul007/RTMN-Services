# genie-memory-service API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:PORT/api`  
**Authentication:** Headers (`X-Tenant-Id`, `X-User-Id`)

---

## Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| X-Tenant-Id | string | ✅ | Tenant identifier |
| X-User-Id | string | ✅ | User identifier |

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
  "service": "genie-memory-service",
  "version": "1.0.0",
  "timestamp": "2026-06-13T00:00:00.000Z"
}
```

### Liveness Probe

```http
GET /health/live
```

### Readiness Probe

```http
GET /health/ready
```

---

## Error Responses

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "meta": { "timestamp": "2026-06-13T00:00:00.000Z" }
}
```

## Rate Limiting

- **Global:** 100 requests/minute
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`
