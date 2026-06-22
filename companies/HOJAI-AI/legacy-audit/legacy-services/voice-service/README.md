# Voice Service

> **Industry AI** | Voice Service - STT/TTS

---

## Overview

This is a industry ai service in the HOJAI AI ecosystem.

## Quick Start

```bash
npm install
npm run dev
```

**Default Port:** `3000`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3000 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/tts/preview | GET request |
| GET | /api/voices | GET request |
| POST | /api/stt | POST request |
| POST | /api/stt/stream | POST request |
| POST | /api/tts | POST request |

## Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{"status": "healthy", "service": "voice-service", "timestamp": "..."}
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
