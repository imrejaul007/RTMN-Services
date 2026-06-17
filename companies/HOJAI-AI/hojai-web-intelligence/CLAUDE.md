# HOJAI Web Intelligence Service

## Overview
Market signals, competitor analysis, and web intelligence for the RTMN ecosystem.

## Port
**4595**

## Service Dependencies
- None (standalone service)

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/signals/search?q=&limit=` | Search market signals |
| GET | `/trends?industry=` | Get industry trends |
| GET | `/competitors?company=` | Competitor analysis |

## Authentication
Uses `X-Internal-Token` header for authentication in production.

## Run Commands
```bash
npm install
npm run build
npm start
```

## Environment Variables
- `PORT`: Server port (default: 4595)
- `INTERNAL_TOKEN`: Authentication token
- `ALLOWED_ORIGINS`: CORS allowed origins
- `NODE_ENV`: development/production
