# HOJAI Merchant Intelligence Service

## Overview
Business intelligence, sales insights, and company profiles for the RTMN ecosystem.

## Port
**4751**

## Service Dependencies
- None (standalone service)

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/company-intel?name=` | Get company intelligence |
| GET | `/company-profile?name=` | Get company profile |
| GET | `/market-intel?industry=` | Get market intelligence |

## Authentication
Uses `X-Internal-Token` header for authentication in production.

## Run Commands
```bash
npm install
npm run build
npm start
```

## Environment Variables
- `PORT`: Server port (default: 4751)
- `INTERNAL_TOKEN`: Authentication token
- `ALLOWED_ORIGINS`: CORS allowed origins
- `NODE_ENV`: development/production
