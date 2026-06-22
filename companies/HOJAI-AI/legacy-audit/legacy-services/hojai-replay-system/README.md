# Hojai Replay System

> **HOJAI Core** | HOJAI Replay System - Save failure, replay locally, fix, redeploy

---

## Overview

This is a hojai core service in the HOJAI AI ecosystem.

## Quick Start

```bash
npm install
npm run dev
```

**Default Port:** `4593`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4593 | Service port |
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
| GET | /api/traces/:id/export | GET request |
| POST | /api/traces | POST request |
| POST | /api/replay | POST request |
| POST | /api/replay/:id/run | POST request |
| POST | /api/debug | POST request |
| POST | /api/debug/:id/step | POST request |

## Health Check

```bash
curl http://localhost:4593/health
```

**Response:**
```json
{"status": "healthy", "service": "hojai-replay-system", "timestamp": "..."}
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
