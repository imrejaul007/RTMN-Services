# rez-order-service

REZ Order Management Service — handles order creation, lifecycle, status transitions, fulfillment, BullMQ-based async processing, and read-only order queries.

## Port
- **Main:** `3006`

## Tech Stack
- Node.js 18+
- Express 4
- MongoDB (Mongoose 8) — order records
- Redis (ioredis 5) + BullMQ — background job processing
- JWT (jsonwebtoken 9)
- Pino — structured logging
- Sentry — error tracking

## API Endpoints
```
POST   /orders                     # Create new order
GET    /orders/:id                 # Get order details
GET    /orders                     # List user orders
PATCH  /orders/:id/status          # Update order status
POST   /orders/:id/cancel          # Cancel order
GET    /orders/:id/track           # Track order
POST   /orders/:id/refund          # Request refund
GET    /health                     # Service health
GET    /ready                      # Readiness (DB + cache check)
```

## Architecture
This service is a worker + HTTP hybrid:
- **BullMQ worker** — processes order-related background jobs (state transitions, fulfillment, etc.)
- **HTTP server** — handles read-only queries and the `/health` endpoint
- **Graceful shutdown** — handles SIGTERM/SIGINT to drain in-flight jobs

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in real values
3. Generate strong secrets:
   ```bash
   openssl rand -hex 32
   ```

## Local Development

```bash
npm install
npm run dev     # ts-node with hot reload (requires src/)
npm start       # Run compiled dist/index.js
```

## Docker

```bash
docker build -t rez-order-service .
docker run -p 3006:3006 --env-file .env rez-order-service
```

## Deploy to Render

1. Create a new **Web Service** in Render
2. Connect this repo, select the `rez-order-service` directory
3. Build command: `npm ci --omit=dev`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`
6. Add a health check path: `/health` on port `3006`

## Required Environment Variables

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`, `JWT_MERCHANT_SECRET`, `JWT_ADMIN_SECRET` (all ≥32 chars)
- `INTERNAL_SERVICE_TOKENS_JSON` (or `INTERNAL_SERVICE_TOKEN`)
- `INTERNAL_SERVICE_HMAC_SECRET` (≥32 chars, required for secure internal token verification)
