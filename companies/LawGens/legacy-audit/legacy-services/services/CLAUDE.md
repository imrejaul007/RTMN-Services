# CLAUDE.md - LawGens API Gateway

## Project Overview

**Name:** LawGens API Gateway
**Company:** LawGens (Legal AI Platform)
**Type:** API Gateway
**Port:** 5099

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB (optional, for caching)
- Redis (optional, for caching)
- Axios (service communication)
- Winston (logging)
- Helmet (security)
- express-rate-limit (rate limiting)

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server |
| `npm run build` | Build TypeScript |
| `npm start` | Production server |
| `npm run lint` | Lint code |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 5099 | Service port |
| NODE_ENV | No | development | Environment mode |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| ENCRYPTION_KEY | Yes | - | Encryption key |
| CORS_ORIGINS | No | * | CORS allowed origins |
| HOJAI_GATEWAY_URL | No | http://localhost:4500 | HOJAI AI gateway |
| HOJAI_API_KEY | No | - | HOJAI API key |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Basic health check |
| GET | /api/status | Service status |
| POST | /api/contracts/create | Create contract |
| GET | /api/contracts | List contracts |
| GET | /api/contracts/:id | Get contract |
| PUT | /api/contracts/:id | Update contract |
| POST | /api/contracts/analyze | Analyze contract |
| POST | /api/contracts/review | Contract review |
| POST | /api/compliance/check | Compliance check |
| GET | /api/compliance/:id | Get compliance report |
| POST | /api/research/court-cases | Search court cases |
| POST | /api/research/precedents | Find precedents |
| POST | /api/documents/generate | Generate document |
| POST | /api/risk/assess | Risk assessment |
| POST | /api/ai/assist | AI legal assistant |
| POST | /api/ediscovery/upload | E-discovery upload |
| POST | /api/arbitration/initiate | Start arbitration |
| POST | /api/docket/track | Track court docket |

## Integration

- **HOJAI AI:** Legal reasoning and analysis
- **HOJAI Memory:** User context storage
- **HOJAI Agents:** Task execution
- **RABTUL Auth:** Authentication
- **RABTUL Wallet:** Payment processing
- **Contract OS:** Contract management

## Production Deployment

```bash
# Build Docker image
docker build -t lawgens-api:latest .

# Run with docker-compose
docker-compose up -d

# Or run directly
npm run build && npm start
```

---

**Last Updated:** 2026-06-12
