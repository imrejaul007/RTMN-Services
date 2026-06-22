# LawGens Deployment Guide

**Version:** 2.0.0 | **Date:** June 12, 2026

---

## Quick Start

```bash
# 1. Clone and setup
./scripts/setup.sh

# 2. Edit .env with your secrets
nano .env

# 3. Start with Docker
docker-compose up -d

# 4. Verify
./scripts/health-check.sh
```

---

## Architecture

```
LawGens/
├── apps/lawgens-web/      # Next.js 14 Web App (Port 3001)
├── contract-os/           # Contract Engine (Port 4190)
├── services/              # API Gateway (Port 5099)
└── shared/                # Shared utilities
```

---

## Prerequisites

- Node.js 18+
- Docker 24+
- Docker Compose 2+
- MongoDB 7.0+ (or Docker)
- Redis 7+ (optional, for caching)

---

## Environment Configuration

### Required Variables

```bash
# Generate secrets
openssl rand -base64 32

# .env file
JWT_SECRET=your-32-char-minimum-secret
ENCRYPTION_KEY=another-32-char-minimum-secret
MONGODB_URI=mongodb://localhost:27017/lawgens
```

### Optional Variables

```bash
# Redis for caching
REDIS_HOST=localhost
REDIS_PORT=6379

# HOJAI AI Integration
HOJAI_GATEWAY_URL=http://localhost:4500
HOJAI_API_KEY=your-api-key
```

---

## Development Setup

### Option 1: Docker (Recommended)

```bash
# Start infrastructure
docker-compose up -d mongodb

# Start services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Access
open http://localhost:3001
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Start web app
npm run dev --workspace=apps/lawgens-web

# Start contract-os (separate terminal)
npm run dev --workspace=contract-os

# Start services (separate terminal)
npm run dev:services
```

---

## Production Deployment

### Docker Deployment

```bash
# 1. Build images
docker build -t lawgens-web:latest ./apps/lawgens-web
docker build -f Dockerfile.contract-os -t lawgens-contract-os:latest .

# 2. Start services
docker-compose up -d

# 3. Verify
./scripts/health-check.sh
```

### Manual Deployment (Linux)

```bash
# 1. Create user
sudo useradd -r -s /bin/false lawgens

# 2. Install application
sudo mkdir -p /opt/lawgens
sudo cp -r . /opt/lawgens
sudo chown -R lawgens:lawgens /opt/lawgens

# 3. Configure systemd
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable lawgens-web lawgens-contract-os lawgens-api

# 4. Start services
sudo systemctl start lawgens-web lawgens-contract-os lawgens-api
```

---

## Services & Ports

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| LawGens Web | 3001 | http://localhost:3001 |
| Contract OS | 4190 | http://localhost:4190/health |
| API Gateway | 5099 | http://localhost:5099/health |
| MongoDB | 27017 | - |
| Redis | 6379 | - |
| Elasticsearch | 9200 | - |

---

## Health Checks

### Script Usage

```bash
# Check all services
./scripts/health-check.sh

# Check specific service
./scripts/health-check.sh web 3001
./scripts/health-check.sh contract-os 4190

# Check infrastructure
./scripts/health-check.sh mongodb
./scripts/health-check.sh redis
```

### Manual Checks

```bash
# Web App
curl http://localhost:3001

# Contract OS
curl http://localhost:4190/health
curl http://localhost:4190/health/ready
curl http://localhost:4190/health/live

# API Gateway
curl http://localhost:5099/health
```

---

## Monitoring

### Health Endpoint Response

```json
{
  "status": "healthy",
  "service": "contract-os",
  "timestamp": "2026-06-12T12:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "mongodb": "connected",
    "memory": "ok"
  }
}
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f contract-os

# Export logs
docker-compose logs > lawgens-logs.txt
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs <service-name>

# Check port conflicts
lsof -i :5099

# Restart service
docker-compose restart <service-name>
```

### Database Connection Failed

```bash
# Check MongoDB
docker-compose exec mongodb mongosh

# Verify connection
nc -zv localhost 27017
```

### Build Failures

```bash
# Clean build artifacts
npm run clean
npm run clean:build

# Rebuild
npm run build
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out=/backup

# Restore
docker-compose exec mongodb mongorestore /backup
```

### Configuration Backup

```bash
# Export environment
cp .env .env.backup

# Export docker-compose
cp docker-compose.yml docker-compose.yml.backup
```

---

## Scaling

### Horizontal Scaling (Docker)

```bash
# Scale web app
docker-compose up -d --scale web=3

# Scale contract-os
docker-compose up -d --scale contract-os=2
```

### Load Balancer

Configure nginx or a cloud load balancer to distribute traffic across instances.

---

## Security Checklist

- [ ] JWT_SECRET generated (min 32 chars)
- [ ] ENCRYPTION_KEY generated (min 32 chars)
- [ ] CORS origins configured
- [ ] Rate limiting enabled
- [ ] SSL/TLS configured (for production)
- [ ] Firewall rules applied
- [ ] Secrets managed securely
- [ ] Database backups configured

---

## Support

- Documentation: https://docs.lawgens.app
- Email: support@lawgens.app
- GitHub: https://github.com/lawgens/lawgens

---

*Last updated: June 12, 2026*