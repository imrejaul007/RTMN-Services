# 🚪 API Gateway - Features

**Service:** RTNM API Gateway  
**Location:** `core/api-gateway/`  
**Status:** ✅ PRODUCTION READY

---

## Core Features

### 1. Service Proxy
- [x] Route requests to backend services
- [x] Load balancing
- [x] Circuit breaker
- [x] Retry logic
- [x] Health-based routing

### 2. Authentication
- [x] JWT verification
- [x] Token validation
- [x] Role-based access
- [x] API key support
- [x] OAuth integration

### 3. Rate Limiting
- [x] Request throttling
- [x] Per-user limits
- [x] Per-service limits
- [x] Burst handling
- [x] Redis-backed

### 4. Security
- [x] Helmet.js headers
- [x] CORS configuration
- [x] Request validation
- [x] SQL injection prevention
- [x] XSS protection

### 5. Caching
- [x] Redis caching
- [x] Response caching
- [x] Cache invalidation
- [x] TTL management

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
| `UPSTREAM_URL` | - | Backend service URL |

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

## Related Services

| Service | Description |
|---------|-------------|
| All RTNM Services | Backend services |
| HOJAI Services | AI services |
| RABTUL Services | Core platform services |

---

**Documentation:** [CLAUDE.md](./CLAUDE.md)
