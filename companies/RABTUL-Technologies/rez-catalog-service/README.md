# rez-catalog-service

REZ Product & Store Catalog Service — manages product catalog, store listings, categories, inventory snapshots, and merchant catalog data.

## Port
- **Main:** `3005`

## Tech Stack
- Node.js 18+
- Express 4
- MongoDB (Mongoose 8) — catalog data
- Redis (ioredis 5) — catalog cache
- Pino — structured logging
- Sentry — error tracking (optional)

## API Endpoints
```
GET    /products                   # List products (paginated)
GET    /products/:id               # Get product details
POST   /products                   # Create product (internal)
PATCH  /products/:id               # Update product (internal)
GET    /stores                     # List stores
GET    /stores/:id                 # Get store details
GET    /categories                 # List categories
GET    /categories/:id/products    # Products in a category
GET    /health                     # Service health
GET    /ready                      # Readiness (DB + cache check)
```

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in real values

## Local Development

```bash
npm install
npm run dev     # ts-node with hot reload (requires src/)
npm start       # Run compiled dist/index.js
```

## Docker

```bash
docker build -t rez-catalog-service .
docker run -p 3005:3005 --env-file .env rez-catalog-service
```

## Deploy to Render

1. Create a new **Web Service** in Render
2. Connect this repo, select the `rez-catalog-service` directory
3. Build command: `npm ci --omit=dev`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`
6. Add a health check path: `/health` on port `3005`

## Required Environment Variables

- `MONGODB_URI`
- `REDIS_URL`
- `INTERNAL_SERVICE_TOKENS_JSON` (or `INTERNAL_SERVICE_TOKEN`)
