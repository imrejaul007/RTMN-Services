# Hojai Marketplace

> **HOJAI Core** | Hojai AI Marketplace - Agent Store for third-party AI agents

---

## Overview

This is a hojai core service in the HOJAI AI ecosystem.

## Quick Start

```bash
npm install
npm run dev
```

**Default Port:** `4550`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4550 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |

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

## Health Check

```bash
curl http://localhost:4550/health
```

**Response:**
```json
{"status": "healthy", "service": "hojai-marketplace", "timestamp": "..."}
```

## Tech Stack

| Component | Technology |
|-----------|-------------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB |
| Cache | Redis |

## Docker Support

```bash
docker build -t hojai-marketplace:latest .
docker run -p 4550:3000 hojai-marketplace:latest
```

## Integration Points

### RABTUL Services

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | User authentication |
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Balance management |
| RABTUL Notification | 4005 | Push notifications |

### HOJAI AI

| Service | Port | Purpose |
|---------|------|---------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI |
| HOJAI Voice | 4850 | Voice AI |

## License

Proprietary - RTNM Digital

---

**Last Updated:** 2026-06-12
**Version:** 1.0.0
