# rez-profile-service

REZ User Profile Management Service — manages user profiles, extended profile data (tier, karma), hidden internal routes, and feature/REE integration.

## Port
- **Main:** `3000`

## Tech Stack
- Node.js 18+
- Express 4
- MongoDB (Mongoose 8) — profile data
- Redis (ioredis 5) — profile cache (tier 5min TTL, karma 1min TTL)
- JWT (jsonwebtoken 9)
- Multer — file uploads
- Pino — structured logging

## API Endpoints
```
GET    /profile                    # Get user profile
PATCH  /profile                    # Update user profile
GET    /api/profile                # Extended profile (with REE integration)
GET    /api/features               # Features / REE routes
POST   /api/profile/avatar         # Upload avatar (multipart)
POST   /hidden/...                 # Internal hidden routes
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
docker build -t rez-profile-service .
docker run -p 3000:3000 --env-file .env rez-profile-service
```

## Deploy to Render

1. Create a new **Web Service** in Render
2. Connect this repo, select the `rez-profile-service` directory
3. Build command: `npm ci --omit=dev`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`
6. Add a health check path: `/health` on port `3000`

## Required Environment Variables

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`
- `CORS_ORIGINS` (comma-separated)

## Security Note
- `TRUST_PROXY` — set to `true` ONLY when behind a trusted reverse proxy that sanitizes X-Forwarded-For. Setting this on a public-facing server enables IP spoofing attacks.
