# 🚪 RTNM API Gateway

## Overview

**Service Name:** RTNM API Gateway  
**Version:** 1.0.0  
**Location:** `core/api-gateway/`  
**Purpose:** Unified entry point for all RTNM Industry OS services

**Status:** ✅ PRODUCTION READY  
**Last Updated:** June 13, 2026

---

## Quick Start

```bash
cd core/api-gateway
npm install
npm start
```

---

## Features

| Feature | Description | Status |
|---------|-------------|--------|
| Service Proxy | Route requests to backend services | ✅ |
| JWT Authentication | Secure API access | ✅ |
| Rate Limiting | Protect services from overload | ✅ |
| CORS Support | Cross-origin requests | ✅ |
| Security Headers | Helmet.js middleware | ✅ |
| Redis Caching | Fast response caching | ✅ |
| Proxy Middleware | http-proxy-middleware | ✅ |

---

## Architecture

```
API Gateway
├── Request Validation
├── JWT Auth
├── Rate Limiter
├── Proxy Router
├── Redis Cache
└── Response
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | - | Service port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `JWT_SECRET` | - | JWT signing secret |

---

## Security

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ |
| Rate Limiting | ✅ |
| Helmet.js Headers | ✅ |
| CORS Configuration | ✅ |

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web framework |
| http-proxy-middleware | ^2.0.6 | Proxy routing |
| ioredis | ^5.3.2 | Redis client |
| jsonwebtoken | ^9.0.2 | JWT auth |
| winston | ^3.11.0 | Logging |
| cors | ^2.8.5 | CORS support |
| helmet | ^7.1.0 | Security headers |
| express-rate-limit | ^7.1.5 | Rate limiting |
| dotenv | ^16.3.1 | Environment config |

---

## Related Documentation

- [HOJAI AI CLAUDE.md](../../companies/hojai-ai/CLAUDE.md)
- [RTNM-COMPANIES-AUDIT.md](../../RTNM-COMPANIES-AUDIT.md)

---

**Built with ❤️ by RTNM**
