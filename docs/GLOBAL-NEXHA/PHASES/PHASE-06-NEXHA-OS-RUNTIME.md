# Phase 6: Nexha OS Runtime

**Phase:** 6/8
**Status:** 📋 Planned
**Target Completion:** After Phase 5 (Routing & Governance)
**Dependencies:** Phases 1-5

---

## Overview

Nexha OS Runtime is the **self-hostable runtime environment** that allows any business to run their own Nexha instance. It packages all the Global Nexha infrastructure services into a single deployable unit.

---

## Runtime Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXHA OS RUNTIME                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                      CONTAINER LAYER                               │ │
│  │                                                                    │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │ │
│  │  │Service 1│ │Service 2│ │Service 3│ │Service 4│ │Service N│  │ │
│  │  │  (API)  │ │  (API)  │ │  (API)  │ │  (API)  │ │  (API)  │  │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │ │
│  │                                                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │              SHARED SERVICES                                │  │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │ │
│  │  │  │ MongoDB  │ │  Redis   │ │  Nginx   │ │  NATS    │     │  │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                      HOST LAYER                                    │ │
│  │                                                                    │ │
│  │  OS: Ubuntu 22.04 LTS / Docker Engine 24+                         │ │
│  │  Resources: 4+ vCPU, 8GB+ RAM, 100GB+ Storage                    │ │
│  │  Network: Public IP, Domain, SSL Certificate                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Docker Image Structure

### Image: `hojai/nexha-os`

```dockerfile
# Multi-stage build for optimized image size
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    nginx \
    certbot \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nexha && \
    adduser -S nexha -u 1001 -G nexha

# Copy application from builder
COPY --from=builder /app /app

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set ownership
RUN chown -R nexha:nexha /app

# Switch to non-root user
USER nexha

# Expose ports
EXPOSE 3000 3001 5432 6379 27017

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Entrypoint
ENTRYPOINT ["/entrypoint.sh"]
```

---

## Docker Compose Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    build: .
    container_name: nexha-api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    depends_on:
      - mongodb
      - redis
      - nats
    networks:
      - nexha-network
    restart: unless-stopped

  # Core Services
  identity-service:
    build: .
    container_name: nexha-identity
    environment:
      - NODE_ENV=production
      - SERVICE_NAME=identity
      - PORT=3001
    depends_on:
      - mongodb
    networks:
      - nexha-network
    restart: unless-stopped

  wallet-service:
    build: .
    container_name: nexha-wallet
    environment:
      - NODE_ENV=production
      - SERVICE_NAME=wallet
      - PORT=3002
    depends_on:
      - mongodb
      - redis
    networks:
      - nexha-network
    restart: unless-stopped

  # Data Stores
  mongodb:
    image: mongo:7.0
    container_name: nexha-mongodb
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USER:-nexha}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    networks:
      - nexha-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: nexha-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - nexha-network
    restart: unless-stopped

  nats:
    image: nats:2.10
    container_name: nexha-nats
    command: ["-c", "/etc/nats/nats-server.conf"]
    volumes:
      - ./config/nats-server.conf:/etc/nats/nats-server.conf
    networks:
      - nexha-network
    restart: unless-stopped

  # Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: nexha-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - certbot_data:/var/www/certbot
    depends_on:
      - api-gateway
    networks:
      - nexha-network
    restart: unless-stopped

  # Certbot for SSL
  certbot:
    image: certbot/certbot
    container_name: nexha-certbot
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl
      - certbot_data:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 86400; done'"

volumes:
  mongodb_data:
  mongodb_config:
  redis_data:
  certbot_data:

networks:
  nexha-network:
    driver: bridge
```

---

## Environment Configuration

### .env.example

```bash
# ============================================
# NEXHA OS CONFIGURATION
# ============================================

# Domain & SSL
NEXHA_DOMAIN=nexha.mycompany.com
NEXHA_PROTOCOL=https
SSL_ENABLED=true

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

# Database
MONGO_USER=nexha
MONGO_PASSWORD=secure-mongo-password-here
MONGO_DB=nexha_production

# Redis
REDIS_PASSWORD=secure-redis-password-here

# Admin
ADMIN_EMAIL=admin@mycompany.com
ADMIN_PASSWORD=secure-admin-password-here

# External Services
EXTERNAL_WEBHOOK_URL=https://hooks.example.com/nexha
LOG_LEVEL=info

# Federation
FEDERATION_MODE=standalone  # standalone | connected
GLOBAL_NEXHA_URL=https://api.globalnexha.io
FEDERATION_API_KEY=your-federation-api-key
```

---

## Service Manifest

### nexha-services.json

```json
{
  "version": "1.0.0",
  "runtime": {
    "name": "Nexha OS",
    "edition": "business",
    "services": [
      {
        "id": "identity-os",
        "name": "Identity OS",
        "port": 3001,
        "endpoints": [
          "/api/identity/register",
          "/api/identity/verify",
          "/api/identity/auth"
        ],
        "dependencies": ["mongodb"],
        "healthCheck": "/health"
      },
      {
        "id": "wallet-os",
        "name": "Wallet OS",
        "port": 3002,
        "endpoints": [
          "/api/wallet/create",
          "/api/wallet/balance",
          "/api/wallet/transfer"
        ],
        "dependencies": ["mongodb", "redis"],
        "healthCheck": "/health"
      },
      {
        "id": "capability-os",
        "name": "Capability OS",
        "port": 3003,
        "endpoints": [
          "/api/capabilities",
          "/api/capabilities/publish",
          "/api/capabilities/search"
        ],
        "dependencies": ["mongodb"],
        "healthCheck": "/health"
      },
      {
        "id": "reputation-os",
        "name": "Reputation OS",
        "port": 3004,
        "endpoints": [
          "/api/reputation/score",
          "/api/reputation/history",
          "/api/reputation/review"
        ],
        "dependencies": ["mongodb", "redis"],
        "healthCheck": "/health"
      },
      {
        "id": "discovery-os",
        "name": "Discovery OS",
        "port": 3005,
        "endpoints": [
          "/api/discover",
          "/api/discover/capabilities",
          "/api/discover/nexhas"
        ],
        "dependencies": ["mongodb"],
        "healthCheck": "/health"
      },
      {
        "id": "federation-os",
        "name": "Federation OS",
        "port": 3006,
        "endpoints": [
          "/api/federation/join",
          "/api/federation/handshake",
          "/api/federation/peers"
        ],
        "dependencies": ["mongodb", "nats"],
        "healthCheck": "/health"
      }
    ]
  }
}
```

---

## Installation Script

### install.sh

```bash
#!/bin/bash
set -e

echo "================================================"
echo "  NEXHA OS INSTALLATION"
echo "================================================"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed."; exit 1; }

# Get configuration
read -p "Enter your domain (e.g., nexha.mycompany.com): " DOMAIN
read -p "Enter admin email: " ADMIN_EMAIL
read -s -p "Enter admin password: " ADMIN_PASSWORD
echo ""

# Create installation directory
INSTALL_DIR="$HOME/nexha-os"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download docker-compose file
echo "Downloading Nexha OS..."
curl -fsSL https://releases.globalnexha.io/v1/install.sh | bash

# Create environment file
cat > .env << EOF
NEXHA_DOMAIN=$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
MONGO_PASSWORD=$(openssl rand -base64 24)
REDIS_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 64)
EOF

# Start services
echo "Starting Nexha OS..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Check health
echo "Checking health..."
curl -f https://$DOMAIN/health || { echo "Health check failed!"; exit 1; }

echo "================================================"
echo "  NEXHA OS INSTALLED SUCCESSFULLY!"
echo "  Access your dashboard at: https://$DOMAIN"
echo "================================================"
```

---

## Cloud Provider Deployment

### AWS (ECS)

```yaml
# nexha-ecs-task-definition.json
{
  "family": "nexha-os",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "4096",
  "memory": "8192",
  "containerDefinitions": [
    {
      "name": "nexha-api",
      "image": "hojai/nexha-os:latest",
      "essential": true,
      "portMappings": [
        {"containerPort": 3000, "protocol": "tcp"}
      ],
      "environment": [
        {"name": "SERVICE_NAME", "value": "api-gateway"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nexha-os",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "nexha"
        }
      }
    }
  ]
}
```

### Google Cloud (GKE)

```yaml
# nexha-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nexha-os
  namespace: nexha
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nexha-os
  template:
    metadata:
      labels:
        app: nexha-os
    spec:
      containers:
      - name: nexha-api
        image: hojai/nexha-os:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
        env:
        - name: MONGO_PASSWORD
          valueFrom:
            secretKeyRef:
              name: nexha-secrets
              key: mongo-password
```

---

## Runtime Management

### Health Monitoring

```bash
# Check all service health
curl https://nexha.mycompany.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-06-20T14:30:00Z",
  "services": {
    "api-gateway": "healthy",
    "identity-os": "healthy",
    "wallet-os": "healthy",
    "capability-os": "healthy",
    "reputation-os": "healthy",
    "discovery-os": "healthy",
    "federation-os": "healthy"
  },
  "uptime": 86400,
  "version": "1.0.0"
}
```

### Backup & Restore

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/nexha"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup MongoDB
docker exec nexha-mongodb mongodump \
  --archive=$BACKUP_DIR/mongodb_$TIMESTAMP.archive \
  --gzip

# Backup Redis
docker exec nexha-redis redis-cli SAVE
docker cp nexha-redis:/data/dump.rdb $BACKUP_DIR/redis_$TIMESTAMP.rdb

# Create tarball
tar -czf nexha_backup_$TIMESTAMP.tar.gz -C $BACKUP_DIR .

echo "Backup complete: nexha_backup_$TIMESTAMP.tar.gz"
```

### Auto-Scaling

```yaml
# kubernetes-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nexha-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nexha-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Implementation Checklist

### Docker Image
- [ ] Create Dockerfile with multi-stage build
- [ ] Optimize image size (< 500MB)
- [ ] Add health checks
- [ ] Configure non-root user
- [ ] Test on multiple architectures (amd64, arm64)

### Docker Compose
- [ ] Configure all core services
- [ ] Set up networking
- [ ] Configure volumes for persistence
- [ ] Add restart policies
- [ ] Configure resource limits

### Environment Configuration
- [ ] Create .env.example
- [ ] Add validation
- [ ] Support secrets from files
- [ ] Environment-specific configs

### Cloud Deployment
- [ ] AWS ECS template
- [ ] GCP GKE template
- [ ] Azure AKS template
- [ ] Kubernetes Helm chart

### Operations
- [ ] Health monitoring script
- [ ] Backup script
- [ ] Restore script
- [ ] Auto-scaling configuration
- [ ] Logging setup

---

## Next Phase

➡️ **Phase 7: Intelligence Enhancement** — AI-powered insights, predictive analytics, autonomous optimization
