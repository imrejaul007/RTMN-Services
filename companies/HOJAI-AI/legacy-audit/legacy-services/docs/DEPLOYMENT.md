# HOJAI AI - Deployment Guide
**Version: 2.0 | Date: June 2, 2026**

---

## Quick Start

### 1. Clone & Setup

```bash
cd hojai-ai

# Copy environment file
cp .env.production .env

# Edit .env with your values
nano .env
```

### 2. Start with Docker Compose

```bash
# Start all services
./deploy/production-deploy.sh start

# Check status
./deploy/production-deploy.sh status
```

### 3. Verify Services

```bash
# Health check all services
curl http://localhost:4500/health  # API Gateway
curl http://localhost:4520/health  # Memory
curl http://localhost:4530/health  # Intelligence
curl http://localhost:4550/health  # Agents
```

---

## Deployment Options

### Option 1: Docker Compose (Development/Staging)

```bash
# Start infrastructure
docker compose up -d mongodb redis

# Wait for ready
docker compose ps

# Start services
docker compose up -d
```

### Option 2: Kubernetes (Production)

```bash
# Create namespace
kubectl apply -f deploy/kubernetes/namespace.yaml

# Apply secrets (edit with real values first)
kubectl apply -f deploy/kubernetes/configmap.yaml
kubectl apply -f deploy/kubernetes/secrets.yaml

# Deploy infrastructure
kubectl apply -f deploy/kubernetes/mongodb.yaml
kubectl apply -f deploy/kubernetes/redis.yaml

# Deploy services
kubectl apply -f deploy/kubernetes/api-gateway.yaml

# Scale
kubectl autoscale deployment hojai-api-gateway -n hojai \
  --cpu-percent=70 --min=2 --max=10
```

---

## Services Overview

### HOJAI CORE (Ports 4500-4610)

| Port | Service | Description |
|------|---------|-------------|
| 4500 | API Gateway | Main entry point, routing, auth |
| 4501 | Governance | RBAC, audit logs |
| 4510 | Event Bus | Pub/sub, streaming |
| 4520 | Memory | Vector store, timeline |
| 4530 | Intelligence | ML predictions |
| 4550 | Agents | Agent orchestration |
| 4560 | Workflow | Automation engine |
| 4570 | Communications | WhatsApp, SMS, Email |
| 4580 | Hyperlocal | Geo intelligence |
| 4600 | Identity | Identity resolution |
| 4610 | Analytics | BI dashboards |

### AI Employees (Ports 4755-4903)

Key employees with dedicated endpoints:
- `4760` - AI Support Agent
- `4783` - Receptionist AI
- `4859` - Analyst AI
- `4863` - Assistant AI

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `TWILIO_*` | No | - | Twilio credentials |
| `SENDGRID_API_KEY` | No | - | SendGrid for email |
| `CORS_ORIGINS` | No | `*` | Allowed origins |

---

## Health Checks

All services expose:
- `/health` - Basic health
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe

```bash
# Check all services
for port in 4500 4501 4510 4520 4530 4550 4560 4570 4580 4600 4610; do
  curl -s http://localhost:$port/health | jq -r '.status'
done
```

---

## Troubleshooting

### Services not starting

```bash
# Check logs
docker compose logs api-gateway
docker compose logs memory

# Check ports
lsof -i :4500
```

### MongoDB connection issues

```bash
# Test MongoDB
docker exec hojai-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Redis connection issues

```bash
# Test Redis
docker exec hojai-redis redis-cli -a password ping
```

---

## Scaling

### Horizontal Scaling (API Gateway)

```bash
# Scale to 3 replicas
docker compose up -d --scale api-gateway=3

# Or with Kubernetes HPA
kubectl autoscale deployment hojai-api-gateway -n hojai \
  --cpu-percent=70 --min=2 --max=10
```

### Load Balancing

Docker Compose includes built-in load balancing.
For Kubernetes, use the Ingress controller.

---

## Backup & Restore

### Backup

```bash
# MongoDB backup
docker exec hojai-mongodb mongodump --archive=/backup/hojai.gz --gzip

# Or use the deploy script
./deploy/production-deploy.sh backup
```

### Restore

```bash
docker exec -i hojai-mongodb mongorestore --archive=/backup/hojai.gz --gzip
```

---

## Monitoring

### Prometheus Metrics

Add to service environment:
```
PROMETHEUS_ENABLED=true
```

### Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api-gateway

# Follow logs in Kubernetes
kubectl logs -f deployment/hojai-api-gateway -n hojai
```

---

## Security

1. **Change all default passwords** in `.env`
2. **Enable SSL/TLS** in production
3. **Configure firewall** rules
4. **Use secrets** for sensitive data
5. **Enable audit logging** via Governance service

---

## Support

For issues, check:
1. Service logs
2. MongoDB connection
3. Redis connection
4. Environment variables
