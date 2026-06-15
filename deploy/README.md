# RTMN BrandPulse - Production Deployment Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring Setup](#monitoring-setup)
- [Backup & Restore](#backup--restore)
- [Troubleshooting](#troubleshooting)
- [Security Checklist](#security-checklist)

---

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 20.10+ | Container runtime |
| Docker Compose | 2.0+ | Multi-container orchestration |
| kubectl | 1.25+ | Kubernetes CLI |
| Helm | 3.10+ | Kubernetes package manager |
| AWS CLI | 2.0+ | AWS resource management |

### Optional Tools

| Tool | Purpose |
|------|---------|
| kubectx/kubens | Kubernetes context/namespace switching |
| k9s | Terminal-based Kubernetes UI |
| stern | Multi-pod log tailing |
| helmfile | Declarative Helm deployments |

### Cloud Requirements

- **Kubernetes Cluster**: GKE, EKS, AKS, or self-hosted (1.25+)
- **Container Registry**: Docker Hub, GCR, ECR, or GHCR
- **Database**: MongoDB Atlas (recommended) or self-hosted
- **Cache**: Redis Cloud (recommended) or self-hosted
- **Object Storage**: S3 or compatible (for backups)
- **Domain**: Configured DNS with SSL certificates

---

## Quick Start

### 5-Minute Deployment

```bash
# 1. Clone and navigate to deploy directory
cd /Users/rejaulkarim/Documents/RTMN/deploy

# 2. Configure environment
cp docker/.env.prod.example docker/.env.prod
# Edit .env.prod with your actual values

# 3. Deploy with Docker Compose
docker-compose -f docker/docker-compose.prod.yml up -d

# 4. Verify deployment
./scripts/health-check.sh http://localhost:4770

# 5. Access services
# API: http://localhost:4770
# Dashboard: http://localhost:4780
# Health: http://localhost:4770/health
```

---

## Configuration

### Environment Variables

Copy the example file and configure:

```bash
cp docker/.env.prod.example docker/.env.prod
```

### Required Secrets

Generate secure secrets for production:

```bash
# JWT Secret
openssl rand -base64 64

# Session Secret
openssl rand -base64 64

# RTMN API Key
openssl rand -hex 32
```

### Kubernetes Secrets

Base64 encode your secrets:

```bash
# Encode a secret
echo -n 'your-secret-value' | base64
```

Update the following secrets in Kubernetes manifests:
- `brandpulse-api-secrets`
- `datadog-api-key`

---

## Docker Compose Deployment

### Full Stack Deployment

```bash
# Navigate to deploy directory
cd /Users/rejaulkarim/Documents/RTMN/deploy

# Start all services
docker-compose -f docker/docker-compose.prod.yml up -d

# View logs
docker-compose -f docker/docker-compose.prod.yml logs -f

# Scale API service
docker-compose -f docker/docker-compose.prod.yml up -d --scale brandpulse-api=4

# Stop services
docker-compose -f docker/docker-compose.prod.yml down
```

### Service-Specific Commands

```bash
# Start only API
docker-compose -f docker/docker-compose.prod.yml up -d brandpulse-api

# Start only dashboard
docker-compose -f docker/docker-compose.prod.yml up -d brandpulse-dashboard

# Restart a service
docker-compose -f docker/docker-compose.prod.yml restart brandpulse-api

# View service logs
docker-compose -f docker/docker-compose.prod.yml logs -f brandpulse-api
```

### SSL Certificates

Place SSL certificates in `docker/nginx/ssl/`:

```
docker/nginx/ssl/
├── cert.pem      # SSL certificate
├── key.pem       # Private key
└── fullchain.pem # Full certificate chain (optional)
```

Generate self-signed certificates for testing:

```bash
cd docker/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=RTMN/CN=*.rtmn.io"
```

---

## Kubernetes Deployment

### Cluster Preparation

```bash
# Set your cluster context
kubectl config use-context your-cluster-context

# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Verify namespace
kubectl get namespace rtmn
```

### Deploy Services

```bash
# Navigate to deploy directory
cd /Users/rejaulkarim/Documents/RTMN/deploy

# Run deployment script
./scripts/deploy.sh

# Or deploy manually:
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/brandpulse-api.yaml
kubectl apply -f kubernetes/brandpulse-dashboard.yaml
kubectl apply -f kubernetes/monitoring.yaml
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n rtmn

# Check services
kubectl get svc -n rtmn

# Check ingress
kubectl get ingress -n rtmn

# View pod logs
kubectl logs -n rtmn -l app=brandpulse-api -f

# Port-forward for local testing
kubectl port-forward -n rtmn svc/brandpulse-api 4770:80
```

### Access Services

```bash
# Get external IPs/Ingress
kubectl get ingress -n rtmn

# API endpoints (replace with your domain)
https://api.rtmn.io/health
https://api.rtmn.io/api/v1/...

# Dashboard
https://dashboard.rtmn.io
```

### Scaling

```bash
# Scale API
kubectl scale deployment brandpulse-api -n rtmn --replicas=5

# Scale dashboard
kubectl scale deployment brandpulse-dashboard -n rtmn --replicas=3

# HPA automatically scales based on CPU/memory
kubectl get hpa -n rtmn
```

### Rollback

```bash
# Rollback to previous version
./scripts/rollback.sh brandpulse-api

# Rollback to specific revision
kubectl rollout undo deployment/brandpulse-api -n rtmn --to-revision=2

# Check rollout history
kubectl rollout history deployment/brandpulse-api -n rtmn
```

---

## Monitoring Setup

### Datadog Integration

1. Create Datadog account at https://datadoghq.com
2. Get your API key from Datadog Settings > API Keys
3. Update the secret:

```bash
# Encode your API key
echo -n 'your-datadog-api-key' | base64

# Update secret
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: datadog-api-key
  namespace: rtmn
type: Opaque
stringData:
  api-key: your-datadog-api-key
EOF
```

4. Verify Datadog agent:

```bash
kubectl get daemonset datadog-agent -n rtmn
kubectl logs -n rtmn -l app=datadog-agent -f
```

### Key Metrics to Monitor

| Metric | Alert Threshold |
|--------|-----------------|
| API Response Time | p99 > 500ms |
| Error Rate | > 1% |
| CPU Usage | > 80% |
| Memory Usage | > 85% |
| Pod Restarts | > 5 in 1 hour |
| HPA Scale Events | Any |

### Dashboards

Create dashboards in Datadog for:
- API Request Rate
- Response Time Percentiles
- Error Rates
- Database Connection Pool
- Redis Hit/Miss Rate
- Active Users

---

## Backup & Restore

### Automated Backups

```bash
# Run backup script
./scripts/backup.sh

# Backup with custom options
./scripts/backup.sh --retention-days 14 --s3-bucket my-backups

# Skip S3 upload (local only)
./scripts/backup.sh --skip-s3
```

### Manual Backup

```bash
# MongoDB backup
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/brandpulse" \
  --archive=./backup.archive --gzip

# Redis backup
redis-cli -h redis-host -p 6379 -a password BGSAVE
# Wait for save, then copy dump.rdb
```

### Restore from Backup

```bash
# Restore MongoDB
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/brandpulse" \
  --archive=./backup.archive --gzip

# Restore Redis
redis-cli -h redis-host -p 6379 -a password SHUTDOWN NOSAVE
# Copy dump.rdb to Redis data directory
redis-server --daemonize yes
```

### Backup Schedule

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full (MongoDB + Redis) | Daily at 2 AM | 7 days |
| Incremental | Every 6 hours | 3 days |
| Weekly Archive | Sunday 3 AM | 30 days |
| Monthly Archive | 1st of month | 1 year |

---

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n rtmn

# Describe problematic pod
kubectl describe pod <pod-name> -n rtmn

# View pod logs
kubectl logs <pod-name> -n rtmn --previous

# Check events
kubectl get events -n rtmn --sort-by='.lastTimestamp'
```

#### ImagePullBackOff

```bash
# Check image exists
docker pull ghcr.io/rtmn-group/brandpulse:latest

# Check image pull secret
kubectl get secret -n rtmn | grep image

# Fix registry authentication
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<user> \
  --docker-password=<token> \
  -n rtmn
```

#### CrashLoopBackOff

```bash
# Check logs
kubectl logs <pod-name> -n rtmn --previous

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Insufficient resources
# - Permission issues

# Verify ConfigMap and Secret
kubectl get configmap brandpulse-api-config -n rtmn -o yaml
kubectl get secret brandpulse-api-secrets -n rtmn -o yaml
```

#### High Memory/CPU

```bash
# Check resource usage
kubectl top pods -n rtmn
kubectl top nodes

# Check HPA status
kubectl get hpa -n rtmn

# Increase resources in deployment
kubectl edit deployment brandpulse-api -n rtmn
```

#### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress brandpulse-api -n rtmn

# Check TLS certificate
kubectl get certificate -n rtmn

# Check DNS resolution
nslookup api.rtmn.io
```

#### Database Connection Issues

```bash
# Test MongoDB connection
kubectl run mongodb-test --rm -it --image=mongosh -- \
  mongosh "$MONGODB_URI"

# Test Redis connection
kubectl run redis-test --rm -it --image=redis -- \
  redis-cli -h redis-host -p 6379 -a password ping

# Check connection string (no secrets in logs!)
# Use: echo $MONGODB_URI | sed 's/:[^:@]*@/:****@/'
```

### Debug Commands

```bash
# Get all resources
kubectl get all -n rtmn

# Get with labels
kubectl get all -n rtmn -l app=brandpulse-api

# Execute shell in pod
kubectl exec -it <pod-name> -n rtmn -- /bin/sh

# Port-forward to pod
kubectl port-forward <pod-name> 4770:4770 -n rtmn

# Watch resources
kubectl get pods -n rtmn -w

# Export all manifests
kubectl get all -n rtmn -o yaml > debug-export.yaml
```

---

## Security Checklist

### Pre-Deployment

- [ ] Generate strong JWT_SECRET (64+ random characters)
- [ ] Generate strong SESSION_SECRET (64+ random characters)
- [ ] Update all placeholder API keys
- [ ] Configure CORS_ORIGIN for production domains
- [ ] Enable SSL/TLS (HTTPS only)
- [ ] Configure firewall rules
- [ ] Review network policies

### Container Security

- [ ] Use non-root user (UID 1001)
- [ ] Read-only root filesystem
- [ ] No privileged containers
- [ ] Dropped capabilities (ALL)
- [ ] No secrets in image layers
- [ ] Use specific image tags (not :latest)

### Kubernetes Security

- [ ] RBAC configured correctly
- [ ] Network policies in place
- [ ] Pod Security Standards enforced
- [ ] Resource limits set
- [ ] Security contexts configured
- [ ] Secrets encrypted at rest
- [ ] Audit logging enabled

### Runtime Security

- [ ] Monitor for anomalies
- [ ] Regular security updates
- [ ] Log aggregation enabled
- [ ] Alert on suspicious activity
- [ ] Regular penetration testing
- [ ] Incident response plan

### Compliance

- [ ] Data encryption in transit (TLS 1.2+)
- [ ] Data encryption at rest
- [ ] Access logging
- [ ] Data retention policies
- [ ] GDPR/CCPA compliance (if applicable)

---

## Support

### Documentation

- [RTMN Documentation](https://docs.rtmn.io)
- [BrandPulse API Docs](https://api.rtmn.io/docs)
- [Kubernetes Docs](https://kubernetes.io/docs)
- [Datadog Docs](https://docs.datadoghq.com)

### Getting Help

- GitHub Issues: [rtmn-group/brandpulse](https://github.com/rtmn-group/brandpulse/issues)
- Slack: #rtmn-support
- Email: support@rtmn.io

### Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

---

## License

Copyright (c) 2026 RTMN Group. All rights reserved.
