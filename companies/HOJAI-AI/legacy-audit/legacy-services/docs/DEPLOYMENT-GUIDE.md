# HOJAI AI - DEPLOYMENT GUIDE
**Version:** 1.0 | **Date:** May 29, 2026

---

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
cd hojai-ai

# Copy environment file
cp config/.env.example .env

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Option 2: Local Development

```bash
cd hojai-ai

# Copy environment file
cp config/.env.example .env

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start services
./scripts/start-local.sh

# Run tests
./scripts/test-all.sh
```

---

## Services

| Service | Port | Health Check |
|---------|------|-------------|
| hojai-api-gateway | 4500 | GET /health |
| hojai-governance | 4501 | GET /health |
| hojai-event | 4510 | GET /health |
| hojai-memory | 4520 | GET /health |
| hojai-intelligence | 4530 | GET /health |
| hojai-agents | 4550 | GET /health |
| hojai-workflow | 4560 | GET /health |
| hojai-communications | 4570 | GET /health |
| hojai-hyperlocal | 4580 | GET /health |
| hojai-data | 4590 | GET /health |
| hojai-industry | 4700 | GET /health |
| rez-intelligence | 4100 | GET /health |

---

## API Testing

### Test Health

```bash
curl http://localhost:4500/health
```

### Test with Tenant Header

```bash
# Get tenant info
curl http://localhost:4500/api/tenant \
  -H "X-Tenant-Id: test-tenant"

# Send event
curl -X POST http://localhost:4500/api/events/publish \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: test-tenant" \
  -d '{"type":"test.event","data":{"message":"hello"}}'

# Get predictions
curl -X POST http://localhost:4500/api/predict \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: test-tenant" \
  -d '{"customerId":"cust_123"}'
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Environment |
| PORT | 4500 | Service port |
| MONGODB_URI | mongodb://localhost:27017/hojai | Database URL |
| REDIS_URL | redis://localhost:6379 | Cache URL |
| INTERNAL_SERVICE_TOKEN | - | Service auth token |

---

## Production Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB RAM minimum
- 20GB disk space

### Steps

1. Clone repository
2. Copy and configure `.env`
3. Build images: `docker-compose build`
4. Start services: `docker-compose up -d`
5. Verify: `./scripts/test-all.sh`

### Kubernetes (Coming Soon)

```bash
kubectl apply -f k8s/
```

---

## Monitoring

### Health Checks

```bash
# Check all services
./scripts/test-all.sh

# Check specific service
curl http://localhost:4500/health | jq
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f hojai-api-gateway
```

---

## Troubleshooting

### Service not starting

```bash
# Check logs
docker-compose logs <service-name>

# Rebuild
docker-compose build --no-cache <service-name>
```

### Database connection failed

```bash
# Check MongoDB
docker-compose logs hojai-mongo

# Restart MongoDB
docker-compose restart hojai-mongo
```

---

## Port Reference

```
4500-4599  HOJAI CORE
4600-4699  Reserved
4700-4799  HOJAI INDUSTRY
4100-4200  REZ INTELLIGENCE
4000-4100  RABTUL (External)
```
