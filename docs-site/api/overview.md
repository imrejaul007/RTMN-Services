# API Reference

REST API for RTMN services.

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://api.rtmn.io/api/v1` |
| Test | `https://api-test.rtmn.io/api/v1` |

## Authentication

All requests require an API key:

```bash
curl https://api.rtmn.io/api/v1/brands \
  -H "Authorization: Bearer rtmn_prod_your_key"
```

## Rate Limits

| Plan | Requests/minute |
|------|-----------------|
| Free | 60 |
| Starter | 300 |
| Professional | 1,000 |
| Enterprise | Custom |

## Response Format

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_xyz"
  }
}
```

## Error Format

```json
{
  "error": {
    "code": "BRAND_NOT_FOUND",
    "message": "The requested brand does not exist"
  }
}
```
