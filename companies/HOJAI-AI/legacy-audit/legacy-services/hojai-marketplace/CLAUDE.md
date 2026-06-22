# CLAUDE.md - Hojai Marketplace

## Project Overview

**Name:** Hojai Marketplace
**Type:** HOJAI Core
**Purpose:** Hojai AI Marketplace - Agent Store for third-party AI agents

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
hojai-marketplace/
├── src/
│   └── index.ts          # Main entry point
├── test/                  # Unit tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── README.md
└── CLAUDE.md
```

**Default Port:** 4550

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Service port (default: 4550) |
| MONGODB_URI | Yes | MongoDB connection string |
| JWT_SECRET | Yes | JWT signing secret |
| REDIS_URL | No | Redis connection URL |

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/agents | GET request |
| GET | /api/agents/featured | GET request |
| GET | /api/agents/:id | GET request |
| GET | /api/agents/category/:category | GET request |
| GET | /api/categories | GET request |
| GET | /api/agents/:id/reviews | GET request |
| GET | /api/subscriptions/:userId | GET request |
| GET | /api/stats | GET request |
| GET | /api/provider/:providerId/analytics | GET request |
| POST | /api/agents | POST request |
| POST | /api/agents/:id/submit | POST request |
| POST | /api/admin/agents/:id/approve | POST request |
| POST | /api/admin/agents/:id/feature | POST request |
| POST | /api/admin/agents/:id/certify | POST request |
| POST | /api/admin/agents/:id/reject | POST request |

## Health Monitoring

### Health Endpoint

**GET** `/health`

```json
{
  "status": "healthy",
  "service": "hojai-marketplace",
  "version": "1.0.0"
}
```

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Balance management |
| RABTUL Notification | 4005 | Push notifications |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice AI |

## Deployment Checklist

- [x] Codebase exists
- [x] Documentation complete
- [ ] Unit tests written
- [ ] Integration tests written
- [x] Health endpoint implemented
- [x] Docker support added
- [ ] Environment variables documented
- [ ] Monitoring configured
- [ ] Security audit passed

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Verify MONGODB_URI |
| Redis timeout | Verify REDIS_URL |
| JWT validation fails | Verify JWT_SECRET |
| Health check fails | Check all dependencies |

---

**Last Updated:** 2026-06-12
