# Hojai Sso

> **HOJAI Core** | HOJAI SSO - OIDC/SAML enterprise login

---

## Overview

This is a hojai core service in the HOJAI AI ecosystem.

## Quick Start

```bash
npm install
npm run dev
```

**Default Port:** `4603`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4603 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/providers | GET request |
| GET | /.well-known/openid-configuration | GET request |
| GET | /authorize | GET request |
| GET | /userinfo | GET request |
| GET | /api/users | GET request |
| GET | /api/sessions/:id | GET request |
| GET | /saml/:provider/metadata | GET request |
| POST | /api/providers | POST request |
| POST | /token | POST request |
| POST | /api/users | POST request |
| POST | /api/sessions | POST request |
| POST | /api/sessions/:id/refresh | POST request |
| POST | /api/sessions/:id/logout | POST request |
| POST | /saml/:provider/slo | POST request |

## Health Check

```bash
curl http://localhost:4603/health
```

**Response:**
```json
{"status": "healthy", "service": "hojai-sso", "timestamp": "..."}
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
