# HOJAI TwinOS Service

## Overview
Digital twin management and AI persona data for the RTMN ecosystem.

## Port
**4521**

## Service Dependencies
- None (standalone service)

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/twin?id=` | Get twin data |
| POST | `/twin` | Create/update twin |
| DELETE | `/twin/:id` | Delete twin |
| POST | `/analyze/sentiment` | Sentiment analysis |
| POST | `/analyze/topics` | Topic extraction |
| POST | `/analyze/objections` | Objection detection |

## Authentication
Uses `X-Internal-Token` header for authentication in production.

## Run Commands
```bash
npm install
npm run build
npm start
```

## Environment Variables
- `PORT`: Server port (default: 4521)
- `INTERNAL_TOKEN`: Authentication token
- `ALLOWED_ORIGINS`: CORS allowed origins
- `NODE_ENV`: development/production
