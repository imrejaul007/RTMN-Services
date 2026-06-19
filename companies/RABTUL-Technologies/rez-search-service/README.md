# rez-search-service

REZ Search & Recommendation Service — handles product search, search history, personalized recommendations, and homepage data with cache invalidation via Redis pub/sub.

## Port
- **Main:** `3008`

## Tech Stack
- Node.js 18+
- Express 4
- MongoDB (Mongoose 8) — search index fallback, history
- Redis (ioredis 5) — search cache, pub/sub for cache invalidation
- Elasticsearch 8 (optional) — production-grade search
- Express-mongo-sanitize — NoSQL injection protection
- JWT (jsonwebtoken 9)
- Pino — structured logging
- Sentry — error tracking

## API Endpoints
```
GET    /search                     # Full-text search
GET    /search/suggest             # Search suggestions / autocomplete
GET    /search/history             # User's search history
POST   /search/history             # Record a search
DELETE /search/history             # Clear search history
GET    /homepage                   # Homepage data (personalized)
GET    /recommendations            # Personalized recommendations
GET    /recommendations/:userId    # Recommendations for a user
GET    /health                     # Service health
GET    /ready                      # Readiness (DB + cache check)
```

## Cache Invalidation
The service subscribes to a Redis pub/sub channel (`cache:invalidate`) and uses SCAN to flush matching keys in batches. This is event-driven — when catalog/product mutations happen upstream, they publish to this channel.

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
docker build -t rez-search-service .
docker run -p 3008:3008 --env-file .env rez-search-service
```

## Deploy to Render

1. Create a new **Web Service** in Render
2. Connect this repo, select the `rez-search-service` directory
3. Build command: `npm ci --omit=dev`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`
6. Add a health check path: `/health` on port `3008`

## Required Environment Variables

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET` (≥32 chars)

## Optional
- `ELASTICSEARCH_URL` + creds — for production-grade search; if not set, falls back to MongoDB text search
- `SENTRY_DSN` — for error tracking

## Architecture Note
Search indexing is currently **passive** (reads from MongoDB on each query). For production scale, this should be replaced with a reactive event-driven indexer (e.g., via BullMQ queue consuming catalog mutations).
