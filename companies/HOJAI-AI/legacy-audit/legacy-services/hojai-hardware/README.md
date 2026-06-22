# Hojai Hardware

> **HOJAI Core** | Hojai Hardware - AI Device Management

---

## Overview

This is a hojai core service in the HOJAI AI ecosystem.

## Quick Start

```bash
npm install
npm run dev
```

**Default Port:** `4350`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4350 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/devices/:id | GET request |
| GET | /api/devices/serial/:serialNumber | GET request |
| GET | /api/devices | GET request |
| GET | /api/devices/:id/commands/:commandId | GET request |
| GET | /api/ota | GET request |
| GET | /api/devices/:id/update | GET request |
| GET | /api/devices/:id/events | GET request |
| GET | /api/analytics | GET request |
| POST | /api/devices | POST request |
| POST | /api/devices/:id/provision | POST request |
| POST | /api/devices/:id/suspend | POST request |
| POST | /api/devices/:id/report-stolen | POST request |
| POST | /api/devices/:id/factory-reset | POST request |
| POST | /api/devices/:id/heartbeat | POST request |
| POST | /api/devices/:id/commands | POST request |

## Health Check

```bash
curl http://localhost:4350/health
```

**Response:**
```json
{"status": "healthy", "service": "hojai-hardware", "timestamp": "..."}
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
docker build -t hojai-hardware:latest .
docker run -p 4350:3000 hojai-hardware:latest
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
