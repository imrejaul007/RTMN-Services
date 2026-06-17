# HOJAI Lead Service

## Overview
Lead scoring, enrichment, and prospect data for the RTMN ecosystem.

## Port
**4752**

## Service Dependencies
- None (standalone service)

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/score` | Score a lead |
| POST | `/enrich` | Enrich lead data |
| GET | `/prospects?limit=` | List prospects |

## Authentication
Uses `X-Internal-Token` header for authentication in production.

## Run Commands
```bash
npm install
npm run build
npm start
```

## Environment Variables
- `PORT`: Server port (default: 4752)
- `INTERNAL_TOKEN`: Authentication token
- `ALLOWED_ORIGINS`: CORS allowed origins
- `NODE_ENV`: development/production
