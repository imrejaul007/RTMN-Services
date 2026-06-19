# REZ QR Unified Service

Cross-company QR code service — unified QR scanning, cross-company rewards/loyalty aggregation, QR analytics, cross-promotion engine, and unified dashboard API.

## Port
- **Main:** `4090`

## Features
1. **Unified QR scanning** — accept any QR from any REZ-family company (rez, stayown, karma, etc.)
2. **Cross-company rewards** — aggregate loyalty across all companies
3. **QR Analytics Hub** — track scan events, conversion, intent distribution
4. **Cross-promotion engine** — suggest relevant offers across companies
5. **Unified Dashboard API** — single endpoint for cross-company metrics

## Tech Stack
- Node.js 18+
- Express 4
- MongoDB (Mongoose 8)
- Helmet, CORS, express-rate-limit
- QRCode — QR generation
- Zod — request validation
- Pino — structured logging

## API Endpoints
```
POST   /api/scan                   # Record a QR scan event
GET    /api/scan/:id               # Get scan details
GET    /api/scan/list              # List scans (paginated)
POST   /api/qr/generate            # Generate a QR code
POST   /api/qr/verify              # Verify a QR code
GET    /api/rewards/cross          # Get cross-company rewards
GET    /api/analytics/dashboard    # Unified QR analytics
GET    /api/cross-promotion/list   # Get cross-promotion offers
GET    /health                     # Service health
```

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in real values (MongoDB URI, allowed origins, company config)

## Local Development

```bash
npm install
npm run dev     # ts-node with hot reload (requires src/)
npm start       # Run compiled dist/index.js
```

## Docker

```bash
docker build -t rez-qr-unified .
docker run -p 4090:4090 --env-file .env rez-qr-unified
```

## Deploy to Render

1. Create a new **Web Service** in Render
2. Connect this repo, select the `REZ-qr-unified` directory
3. Build command: `npm ci --omit=dev`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`
6. Add a health check path: `/health` on port `4090`

## Required Environment Variables

- `MONGODB_URI` (required)
- `ALLOWED_ORIGINS` (comma-separated list)
- `COMPANY_CONFIG` (JSON-encoded map of company name → base URL)
- `PORT` (default 4090)
