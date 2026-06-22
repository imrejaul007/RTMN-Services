# Hojai Trace Explorer

> **HOJAI Core** | HOJAI Trace Explorer - Visual trace debugging

---

## Overview

This is a hojai core service in the HOJAI AI ecosystem.

## Quick Start

```bash
npm install
npm run dev
```

**Default Port:** `4596`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4596 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/traces/:id | GET request |
| GET | /api/traces | GET request |
| GET | /api/traces/:traceId/steps/:stepId | GET request |
| GET | /api/metrics | GET request |
| GET | /api/traces/:id/flamegraph | GET request |
| GET | /api/traces/:id/timeline | GET request |
| GET | /api/traces/:id/spans | GET request |
| POST | /api/traces | POST request |
| POST | /api/traces/search | POST request |

## Health Check

```bash
curl http://localhost:4596/health
```

**Response:**
```json
{"status": "healthy", "service": "hojai-trace-explorer", "timestamp": "..."}
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
