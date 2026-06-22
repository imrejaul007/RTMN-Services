# Hojai Collaboration

> **HOJAI Core** | HOJAI Collaboration - Comments, reviews, team sharing

---

## Overview

This is a hojai core service in the HOJAI AI ecosystem.

## Quick Start

```bash
npm install
npm run dev
```

**Default Port:** `4598`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4598 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/users | GET request |
| GET | /api/users/:id | GET request |
| GET | /api/comments | GET request |
| GET | /api/reviews | GET request |
| GET | /api/shares | GET request |
| GET | /api/activity | GET request |
| POST | /api/comments | POST request |
| POST | /api/comments/:id/resolve | POST request |
| POST | /api/comments/:id/reply | POST request |
| POST | /api/reviews | POST request |
| POST | /api/reviews/:id/submit | POST request |
| POST | /api/reviews/:id/decision | POST request |
| POST | /api/shares | POST request |
| POST | /api/shares/:id/revoke | POST request |

## Health Check

```bash
curl http://localhost:4598/health
```

**Response:**
```json
{"status": "healthy", "service": "hojai-collaboration", "timestamp": "..."}
```

## Tech Stack

| Component | Technology |
|-----------|-------------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB |
| Cache | Redis |

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
