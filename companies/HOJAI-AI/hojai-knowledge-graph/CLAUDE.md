# HOJAI Knowledge Graph Service

## Overview
Entity relationships and knowledge graph queries for the RTMN ecosystem.

## Port
**4786**

## Service Dependencies
- None (standalone service)

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/query?entity=&relationship=` | Query knowledge graph |
| GET | `/search?q=&type=` | Search entities |
| GET | `/entity/:id` | Get entity details |
| POST | `/entity` | Create entity |
| PUT | `/entity/:id` | Update entity |
| DELETE | `/entity/:id` | Delete entity |

## Authentication
Uses `X-Internal-Token` header for authentication in production.

## Run Commands
```bash
npm install
npm run build
npm start
```

## Environment Variables
- `PORT`: Server port (default: 4786)
- `INTERNAL_TOKEN`: Authentication token
- `ALLOWED_ORIGINS`: CORS allowed origins
- `NODE_ENV`: development/production
