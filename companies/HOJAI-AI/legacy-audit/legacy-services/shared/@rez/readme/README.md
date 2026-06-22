# Service Template

> Brief description of what this service does.

## Overview

This service provides [main functionality]. It is part of the REZ ecosystem and follows standardized patterns.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 3000 | Service port |
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `REDIS_URL` | No | redis://localhost:6379 | Redis connection URL |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `LOG_LEVEL` | No | info | Log level (debug, info, warn, error) |

## API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-06-12T00:00:00.000Z",
  "version": "1.0.0"
}
```

### Example Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check with details |
| GET | `/api/v1/items` | List all items |
| POST | `/api/v1/items` | Create new item |
| GET | `/api/v1/items/:id` | Get item by ID |
| PUT | `/api/v1/items/:id` | Update item |
| DELETE | `/api/v1/items/:id` | Delete item |

### Request/Response Examples

#### Create Item

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Test Item",
    "description": "A test item"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Test Item",
    "description": "A test item",
    "createdAt": "2026-06-12T00:00:00.000Z",
    "updatedAt": "2026-06-12T00:00:00.000Z"
  }
}
```

## Authentication

This service uses JWT Bearer token authentication.

Include the token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

## Error Responses

All errors follow a standard format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "path": "email",
        "message": "Invalid email address"
      }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Health Check

The `/health` endpoint returns the service health status.

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-06-12T00:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "mongodb": { "status": "up", "latency": 5 },
    "redis": { "status": "up", "latency": 2 }
  }
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run typecheck` | TypeScript type check |

## Docker

```bash
# Build image
docker build -t my-service:latest .

# Run container
docker run -p 3000:3000 --env-file .env my-service:latest
```

## License

Proprietary - RTNM Digital

---

**Last Updated:** June 12, 2026  
**Version:** 1.0.0