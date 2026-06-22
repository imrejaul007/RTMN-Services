# Developer Cloud - RTMN Unified API Platform

Unified API platform providing SDKs, documentation, and API gateway for developers.

## Quick Start

```bash
cd core/developer-cloud
npm install
npm start
```

## SDK Languages

- JavaScript
- Python
- TypeScript
- Go
- Java
- Ruby

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/apis` | List APIs |
| GET | `/api/apis/:id` | API details |
| GET | `/api/sdk` | List SDKs |
| GET | `/api/sdk/:language` | SDK for language |
| GET | `/api/docs` | Documentation index |
| POST | `/api/auth/register` | Register developer |
| POST | `/api/auth/token` | Generate token |

## Example

```bash
# Register developer
curl -X POST http://localhost:3040/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@example.com", "name": "Developer"}'

# Get SDK
curl http://localhost:3040/api/sdk/python
```

## Rate Limits

| Plan | Requests/min |
|------|-------------|
| Free | 1,000 |
| Starter | 10,000 |
| Professional | 100,000 |
| Enterprise | Unlimited |

## Docker

```bash
docker build -t rtmn-developer-cloud core/developer-cloud
docker run -p 3040:3040 rtmn-developer-cloud
```
