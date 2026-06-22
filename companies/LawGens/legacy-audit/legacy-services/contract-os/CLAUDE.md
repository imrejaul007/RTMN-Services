# CLAUDE.md - Contract OS

## Project Overview

**Name:** Contract OS (Machine-Readable Contracts for AI-to-AI Transactions)
**Company:** LawGens (Legal AI Platform)
**Type:** Backend Service
**Port:** 4190

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB (Mongoose ODM)
- Redis (caching)
- Winston (logging)
- Helmet (security)
- express-rate-limit (rate limiting)

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server (ts-node-dev) |
| `npm run build` | Build TypeScript to dist/ |
| `npm start` | Production server |
| `npm test` | Run tests |
| `npm run lint` | Lint code |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4190 | Service port |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret (min 32 chars) |
| ENCRYPTION_KEY | Yes | - | Encryption key (min 32 chars) |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |
| RATE_LIMIT_WINDOW_MS | No | 900000 | Rate limit window (15 min) |
| RATE_LIMIT_MAX | No | 100 | Max requests per window |
| CONTRACT_EXPIRY_DAYS | No | 365 | Default contract expiry |
| LOG_LEVEL | No | info | Logging level |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Basic health check |
| GET | /health/ready | Kubernetes readiness probe |
| GET | /health/live | Kubernetes liveness probe |
| GET | /api/stats | Service statistics |
| POST | /api/contracts | Create contract |
| GET | /api/contracts/:id | Get contract |
| PUT | /api/contracts/:id | Update contract |
| POST | /api/contracts/:id/sign | Sign contract |
| POST | /api/contracts/:id/execute | Execute contract |
| GET | /api/contracts/:id/history | Execution history |
| POST | /api/contracts/:id/validate | Validate contract |
| GET | /api/contracts/stats | Contract statistics |

## Integration

- **MongoDB:** Primary datastore for contracts
- **Redis:** Session cache and rate limiting
- **HOJAI AI:** Legal reasoning and analysis
- **RABTUL Auth:** Authentication (optional)

## Production Deployment

```bash
# Build Docker image
docker build -t lawgens-contract-os:latest .

# Run with docker-compose
docker-compose up -d

# Or run directly
npm run build && npm start
```

---

**Last Updated:** 2026-06-12
