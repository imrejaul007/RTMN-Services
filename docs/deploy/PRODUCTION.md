# Production Deployment Guide

**Last Updated:** June 15, 2026

This guide covers deploying RTMN services to production.

---

## Prerequisites

- [ ] Cloud account (AWS/GCP/Azure)
- [ ] Domain name configured
- [ ] SSL certificates provisioned
- [ ] MongoDB Atlas cluster (production tier)
- [ ] Redis Cloud instance (production tier)
- [ ] API keys secured in secrets manager
- [ ] Monitoring configured

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │              LOAD BALANCER                │
                    │           (Cloudflare / AWS ALB)          │
                    └──────────────────┬────────────────────────┘
                                       │
                    ┌──────────────────┴────────────────────────┐
                    │           AUTO-SCALING GROUP               │
                    │  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
                    │  │  API 1  │  │  API 2  │  │  API 3  │      │
                    │  └─────────┘  └─────────┘  └─────────┘      │
                    └──────────────────┬────────────────────────┘
                                       │
                    ┌─────────────────┴────────────────────────┐
                    │                                         │
          ┌─────────┴─────────┐               ┌─────────┴─────────┐
          │   MongoDB Atlas   │               │   Redis Cloud     │
          │  (Production M30) │               │  (Production)     │
          └───────────────────┘               └───────────────────┘
```

---

## Step 1: Infrastructure Setup

### AWS (Recommended)

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create subnets (3 AZs)
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.3.0/24 --availability-zone us-east-1c

# Create security groups
aws ec2 create-security-group --group-name rtmn-api --description "RTMN API Security Group"
aws ec2 authorize-security-group-ingress --group-name rtmn-api --protocol tcp --port 4770

# Create IAM role for EC2
aws iam create-role --role-name rtmn-ec2-role
aws iam attach-role-policy --role-name rtmn-ec2-role --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
```

### GCP

```bash
# Create VPC
gcloud compute networks create rtmn-vpc --subnet-mode=custom

# Create subnets
gcloud compute networks subnets create rtmn-subnet \
  --network=rtmn-vpc \
  --region=us-central1 \
  --range=10.0.0.0/24

# Create firewall rules
gcloud compute firewall-rules create rtmn-api \
  --allow tcp:4770 \
  --network=rtmn-vpc
```

---

## Step 2: Database Setup

### MongoDB Atlas

1. Create cluster (M30 or higher for production)
2. Enable VPC Peering or Private Endpoints
3. Create database user with read/write roles
4. Enable backup (continuous)
5. Configure auto-failover

```bash
# Get connection string
# Settings → Connect → Connect your application
# mongosh "mongodb+srv://clusterxxx.mongodb.net/brandpulse" --apiVersion 1 --username admin
```

### Redis Cloud

1. Create subscription (Production)
2. Enable TLS
3. Create database with 1GB+ memory
4. Enable persistence (AOF every 1 second)
5. Enable automatic backups

```bash
# Get connection string from Redis Cloud console
# redis-cloud://xxx@redis-cloud.xxxxx.ng.0001.use1.cache.amazonaws.com:6379
```

---

## Step 3: Environment Configuration

### Environment Variables

Create `.env.production`:

```bash
# Application
NODE_ENV=production
PORT=4770
LOG_LEVEL=info

# API Keys
RTMN_API_KEY=rtmn_prod_xxxxxxxxxxxx
RTMN_WEBHOOK_SECRET=rtmn_whsec_xxxxxxxxxxxx

# Database
MONGODB_URI=mongodb+srv://admin:password@clusterxxx.mongodb.net/brandpulse?retryWrites=true&w=majority
MONGODB_DB=brandpulse

# Redis
REDIS_URL=rediss://:password@redis-cloud.xxxxx.ng.0001.use1.cache.amazonaws.com:6379

# RTNM SDK
RTNM_SDK_URL=https://api.rtmn.io
RTNM_SDK_KEY=rtmn_prod_yyyyyyyyyyyy

# OpenAI (optional)
OPENAI_API_KEY=sk-xxxxxxxxxxxx

# Security
CORS_ORIGIN=https://dashboard.rtmn.io
RATE_LIMIT_MAX=1000
SESSION_SECRET=generate-a-long-random-string

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
DATADOG_API_KEY=xxxxxxxxxxxx
```

### Secrets Management

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name rtmn/production/brandpulse \
  --secret-string file://.env.production

# Retrieve for deployment
aws secretsmanager get-secret-value \
  --secret-id rtmn/production/brandpulse \
  --query SecretString \
  --output text
```

---

## Step 4: Deploy Services

### Docker Deployment

```bash
# Build image
docker build -t brandpulse:latest .

# Tag for registry
docker tag brandpulse:latest ghcr.io/rtmn-group/brandpulse:v1.0.0

# Push to registry
docker push ghcr.io/rtmn-group/brandpulse:v1.0.0

# Deploy to production
docker run -d \
  --name brandpulse-api \
  --restart unless-stopped \
  -p 4770:4770 \
  --env-file .env.production \
  --health-cmd "curl -f http://localhost:4770/health" \
  --health-interval 30s \
  ghcr.io/rtmn-group/brandpulse:v1.0.0
```

### Docker Compose (Production)

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  brandpulse-api:
    image: ghcr.io/rtmn-group/brandpulse:v1.0.0
    container_name: brandpulse-api
    restart: unless-stopped
    ports:
      - "4770:4770"
    env_file:
      - .env.production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4770/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/brandpulse
        awslogs-stream-prefix: brandpulse
```

### Kubernetes Deployment

```yaml
# k8s/brandpulse-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: brandpulse-api
  labels:
    app: brandpulse
    tier: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: brandpulse
  template:
    metadata:
      labels:
        app: brandpulse
        tier: api
    spec:
      containers:
      - name: brandpulse-api
        image: ghcr.io/rtmn-group/brandpulse:v1.0.0
        ports:
        - containerPort: 4770
        envFrom:
        - secretRef:
            name: brandpulse-secrets
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 4770
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4770
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: brandpulse-api
spec:
  selector:
    app: brandpulse
  ports:
  - port: 80
    targetPort: 4770
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: brandpulse-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: brandpulse-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Step 5: DNS and SSL

### Configure DNS

```bash
# Cloudflare API
curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "A",
    "name": "api.rtmn.io",
    "content": "LOAD_BALANCER_IP",
    "proxied": true
  }'
```

### SSL Certificate

```bash
# Let's Encrypt with certbot
sudo certbot --nginx -d api.rtmn.io -d dashboard.rtmn.io

# Or use Cloudflare Origin Certificate (auto-renews)
# Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate
```

---

## Step 6: Monitoring Setup

### Datadog

```bash
# Install Datadog agent
DD_API_KEY=xxxxxxxxxxxx bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/datadog-install.sh)"

# Verify
sudo datadog-agent status
```

### Alerts

```bash
# Create PagerDuty integration
# Settings → Integrations → PagerDuty → Add integration

# Create alerts
# Monitors → New Monitor → Metric
# - Alert: CPU > 80% for 5 minutes
# - Alert: Error rate > 1% for 5 minutes
# - Alert: Latency p99 > 2s for 5 minutes
```

---

## Step 7: Verify Deployment

```bash
# Health check
curl -s https://api.rtmn.io/health | jq .

# Response should be:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "uptime": 12345,
#   "dependencies": {
#     "mongodb": "connected",
#     "redis": "connected"
#   }
# }

# Test API
curl -s https://api.rtmn.io/api/v1/brands \
  -H "Authorization: Bearer rtmn_prod_xxxxxxxxxxxx" | jq .

# Check logs
docker logs brandpulse-api --tail 100
```

---

## Step 8: Post-Deployment Checklist

- [ ] All health checks passing
- [ ] SSL certificate valid
- [ ] DNS propagated
- [ ] Monitoring dashboards visible
- [ ] Alerts configured and tested
- [ ] Backup running
- [ ] Runbook updated
- [ ] On-call notified
- [ ] Rollback plan documented

---

## Rollback Procedure

```bash
# Docker
docker pull ghcr.io/rtmn-group/brandpulse:v0.9.0
docker stop brandpulse-api
docker rm brandpulse-api
docker run -d --name brandpulse-api -p 4770:4770 --env-file .env.production ghcr.io/rtmn-group/brandpulse:v0.9.0

# Kubernetes
kubectl rollout undo deployment/brandpulse-api

# Verify
curl -s https://api.rtmn.io/health
```

---

## Support

- **Deployment issues:** support@rtmn.com
- **Documentation:** docs.rtmn.io
- **Status:** status.rtmn.io
