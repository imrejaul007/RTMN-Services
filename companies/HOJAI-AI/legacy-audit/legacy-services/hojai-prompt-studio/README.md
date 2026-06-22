# Hojai Prompt Studio

> **HOJAI Core** | HOJAI Prompt Studio - Centralized prompt management

---

## Overview

This is a hojai core service in the HOJAI AI ecosystem.

## Quick Start

```bash
npm install
npm run dev
```

**Default Port:** `4590`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4590 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/prompts | GET request |
| GET | /api/prompts/:id | GET request |
| GET | /api/categories | GET request |
| GET | /api/analytics | GET request |
| POST | /api/prompts | POST request |
| POST | /api/prompts/:id/test | POST request |
| POST | /api/prompts/:id/test-cases | POST request |
| POST | /api/prompts/:id/run-tests | POST request |
| POST | /api/prompts/:id/compare | POST request |
| POST | /api/prompts/:id/deploy | POST request |
| PUT | /api/prompts/:id | PUT request |

## Health Check

```bash
curl http://localhost:4590/health
```

**Response:**
```json
{"status": "healthy", "service": "hojai-prompt-studio", "timestamp": "..."}
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
