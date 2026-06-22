# HOJAI AI - Deployment Guide

**Production-grade deployment configuration for HOJAI AI Platform**

---

## Quick Start

### Development
```bash
docker compose up -d
```

### Staging
```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

### Production
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              Nginx LB                 │
                    │         (SSL Termination)            │
                    │           api.hojai.ai                │
                    └───────────────┬───────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ API Gateway   │         │   Memory      │         │ Intelligence  │
│  (3 replicas) │         │  (2 replicas)│         │ (2 replicas)  │
│   Port 4500   │         │  Port 4520    │         │  Port 4530    │
└───────────────┘         └───────────────┘         └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────┐         ┌───────────────┐
                    │    Agents     │         │   Voice OS    │
                    │ (2 replicas) │         │   WebSocket   │
                    │  Port 4550   │         │  Port 3000    │
                    └───────────────┘         └───────────────┘
```

---

## Services

| Service | Replicas (Prod) | CPU Limit | Memory | Port |
|---------|-----------------|-----------|--------|------|
| api-gateway | 3 | 1 core | 1 GB | 4500 |
| memory | 2 | 0.5 core | 512 MB | 4520 |
| intelligence | 2 | 1 core | 1 GB | 4530 |
| agents | 2 | 0.5 core | 512 MB | 4550 |
| governance | 2 | 0.25 core | 256 MB | - |
| event | 2 | 0.25 core | 256 MB | - |
| communications | 2 | 0.5 core | 512 MB | - |
| workflow | 2 | 0.5 core | 512 MB | - |

---

## Environment Files

### Required Variables
```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=info
MONGODB_URI=mongodb://mongo:27017/hojai
REDIS_URL=redis://redis:6379
JWT_SECRET=<generate-secure-key>
API_KEY=<api-key>
```

### Staging Variables
```bash
# .env.staging
NODE_ENV=staging
LOG_LEVEL=debug
MONGODB_URI=mongodb://mongo:27017/hojai_staging
```

---

## Nginx Load Balancer

Located in `deploy/ssl-nginx/`:

### Features
- **SSL Termination** with Let's Encrypt
- **Load Balancing** (least_conn algorithm)
- **Rate Limiting** (100 req/s API, 10 req/s auth)
- **WebSocket Support** for Voice OS
- **Security Headers** (HSTS, X-Frame-Options, etc.)
- **Circuit Breaker** pattern

### SSL Certificate Setup
```bash
# Using Let's Encrypt
certbot certonly --webroot -w /var/www/certbot -d api.hojai.ai

# Certificate locations
/etc/letsencrypt/live/api.hojai.ai/fullchain.pem
/etc/letsencrypt/live/api.hojai.ai/privkey.pem
```

### Rebuild Nginx
```bash
cd deploy/ssl-nginx
docker build -t hojai-nginx .
```

---

## CI/CD Pipeline

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for full pipeline.

### Jobs
1. **Lint & Type Check** - ESLint, TypeScript
2. **Unit Tests** - Vitest/Jest
3. **Build Core** - Build all services
4. **Build Employees** - Build AI employee agents
5. **Security Scan** - npm audit, Trivy
6. **Integration Tests** - E2E tests
7. **Docker Build** - Multi-arch images to GHCR

### Environment Variables (GitHub Secrets)
```
MONGODB_URI
REDIS_URL
JWT_SECRET
API_KEY
```

---

## Health Checks

```bash
# Check all services
curl https://api.hojai.ai/health

# Check specific service
curl https://api.hojai.ai/api/health
curl https://api.hojai.ai/memory/health
curl https://api.hojai.ai/intelligence/health
```

---

## Scaling

### Scale API Gateway
```bash
docker compose up -d --scale api-gateway=5
```

### Scale Intelligence (for AI workload)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale intelligence=4
```

---

## Monitoring

### Metrics Endpoint
```bash
curl https://api.hojai.ai/metrics
```

### Logs
```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f api-gateway

# View with timestamps
docker compose logs -f -t
```

---

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker compose logs <service-name>

# Rebuild without cache
docker compose build --no-cache <service-name>
```

### Database Connection Issues
```bash
# Check MongoDB
docker compose exec mongodb mongosh

# Check Redis
docker compose exec redis redis-cli ping
```

### SSL Certificate Issues
```bash
# Renew certificate
certbot renew

# Reload Nginx
docker exec <nginx-container> nginx -s reload
```

---

## Backup

### MongoDB Backup
```bash
docker compose exec mongodb mongodump --archive=/backup/$(date +%Y%m%d).archive
```

### Restore
```bash
docker compose exec -T mongodb mongorestore --archive=/backup/20250602.archive
```

---

## Security

- All services run as non-root user
- Secrets via environment variables (not in repo)
- Rate limiting on all endpoints
- CORS configured for allowed origins
- JWT authentication required
- Audit logging enabled

---

## License

Proprietary - RTNM Group
