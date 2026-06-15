# API Reference Overview

**Base URL:** `https://api.rtmn.io/api/v1`
**Test URL:** `https://api-test.rtmn.io/api/v1`

---

## Authentication

All API requests require an API key in the Authorization header:

```bash
curl https://api.rtmn.io/api/v1/brands \
  -H "Authorization: Bearer rtmn_prod_your_key_here"
```

See [API Key Management](API-KEY-MANAGEMENT.md) for details.

---

## Request Format

- **Content-Type:** `application/json`
- **Accept:** `application/json`
- All timestamps in **ISO 8601** format (UTC)

```bash
curl -X POST https://api.rtmn.io/api/v1/brands \
  -H "Authorization: Bearer rtmn_prod_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Brand", "industry": "restaurant"}'
```

---

## Response Format

### Success

```json
{
  "data": {
    "id": "brand_abc123",
    "name": "My Brand",
    "industry": "restaurant",
    "createdAt": "2026-06-15T10:30:00.000Z"
  },
  "meta": {
    "requestId": "req_xyz789"
  }
}
```

### Error

```json
{
  "error": {
    "code": "BRAND_NOT_FOUND",
    "message": "The requested brand does not exist",
    "details": {
      "id": "brand_abc123"
    }
  },
  "meta": {
    "requestId": "req_xyz789"
  }
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (e.g., DELETE) |
| 400 | Bad Request — Invalid parameters |
| 401 | Unauthorized — Invalid or missing API key |
| 403 | Forbidden — Insufficient permissions |
| 404 | Not Found — Resource doesn't exist |
| 409 | Conflict — Resource already exists |
| 422 | Unprocessable — Validation failed |
| 429 | Too Many Requests — Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limits

| Plan | Requests/minute | Requests/day |
|------|----------------|--------------|
| Free | 60 | 1,000 |
| Starter | 300 | 10,000 |
| Professional | 1,000 | 100,000 |
| Enterprise | Custom | Custom |

Rate limit headers in response:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1623777600
```

### Retry Logic

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '5';
      await new Promise(r => setTimeout(r, parseInt(retryAfter) * 1000));
      continue;
    }

    return response;
  }
  throw new Error('Max retries exceeded');
}
```

---

## Pagination

All list endpoints use **cursor-based pagination**:

```bash
# First page
GET /api/v1/brands?limit=20

# Next page (use cursor from previous response)
GET /api/v1/brands?limit=20&cursor=eyJpZCI6ImJyYW5kXzEyMyJ9
```

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6ImJyYW5kXzEyMyJ9",
    "hasMore": true,
    "total": 150
  }
}
```

---

## Idempotency

For POST requests, use the `Idempotency-Key` header to safely retry:

```bash
curl -X POST https://api.rtmn.io/api/v1/brands \
  -H "Authorization: Bearer rtmn_prod_xxxxx" \
  -H "Idempotency-Key: unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Brand", "industry": "restaurant"}'
```

If the same key is used within 24 hours, the original response is returned.

---

## Filtering & Sorting

### Filtering

```bash
# Filter by industry
GET /api/v1/brands?industry=restaurant

# Filter by sentiment score
GET /api/v1/reviews?sentiment=negative

# Filter by date range
GET /api/v1/reviews?createdAt.gte=2026-01-01&createdAt.lt=2026-06-01
```

### Sorting

```bash
# Sort by created date (descending)
GET /api/v1/brands?sort=createdAt&order=desc

# Sort by sentiment score (ascending)
GET /api/v1/reviews?sort=sentiment.score&order=asc
```

---

## Versioning

The API is versioned via the URL path (`/api/v1/`). Breaking changes are introduced in new versions with a migration guide.

Current version: **v1**

---

## SDKs

| Language | Package | Install |
|----------|---------|---------|
| TypeScript/Node.js | `@rtmn/sdk` | `npm install @rtmn/sdk` |
| Python | `rtmn-sdk` | `pip install rtmn-sdk` |
| Go | `rtmn-go` | `go get github.com/rtmn-group/rtmn-go` (TBD) |

---

## Postman Collection

Download the RTMN Postman collection:
- [RTMN API v1](https://api.rtmn.io/collection.json) (TBD)

---

## OpenAPI Spec

Full OpenAPI 3.0 specification:
- [Swagger UI](https://api.rtmn.io/docs) (TBD)
- [OpenAPI JSON](https://api.rtmn.io/openapi.json) (TBD)
- [OpenAPI YAML](https://api.rtmn.io/openapi.yaml) (TBD)
