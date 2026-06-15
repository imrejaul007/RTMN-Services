# RTMN Deployment Guide

**Complete guide for deploying RTMN services to production.**

---

## Prerequisites

Before deploying, ensure you have:

- [ ] **Kubernetes cluster** (AWS EKS, GCP GKE, or Azure AKS)
- [ ] **kubectl** configured with cluster access
- [ ] **Docker** for building images
- [ ] **Helm** (optional, for some deployments)
- [ ] **AWS CLI** (for S3 backups)
- [ ] **Domain names** configured (api.rtmn.io, dashboard.rtmn.io)
- [ ] **SSL certificates** (or cert-manager for Let's Encrypt)

---

## Quick Start

### 1. Clone and Configure

```bash
git clone https://github.com/rtmn-group/rtmn-services.git
cd rtmn-services

# Copy environment template
cp deploy/docker/.env.prod.example .env.prod

# Edit with your values
nano .env.prod
```

### 2. Set Up Secrets

```bash
# Create Kubernetes secrets
kubectl create secret generic brandpulse-secrets \
  --from-literal=RTMN_API_KEY="your-key" \
  --from-literal=RTNM_SDK_KEY="your-key" \
  --from-literal=JWT_SECRET="your-secret" \
  --from-literal=SESSION_SECRET="your-secret" \
  --from-literal=SENTRY_DSN="your-sentry-dsn" \
  --from-literal=OPENAI_API_KEY="your-openai-key" \
  --namespace=rtmn
```

### 3. Deploy

```bash
# Using the deploy script
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh

# Or manually
kubectl apply -f deploy/kubernetes/namespace.yaml
kubectl apply -f deploy/kubernetes/monitoring.yaml
kubectl apply -f deploy/kubernetes/brandpulse-api.yaml
kubectl apply -f deploy/kubernetes/brandpulse-dashboard.yaml
```

### 4. Verify

```bash
# Check pods
kubectl get pods -n rtmn

# Check services
kubectl get svc -n rtmn

# Check ingress
kubectl get ingress -n rtmn

# Run health check
./deploy/scripts/health-check.sh
```

---

## Docker Compose (Development/Staging)

```bash
cd deploy/docker

# Copy and configure environment
cp .env.prod.example .env.prod
nano .env.prod

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Kubernetes Details

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rtmn
  labels:
    name: rtmn
    environment: production
```

### Deployments

- **brandpulse-api**: 3 replicas, 2 CPU, 2GB memory each
- **brandpulse-dashboard**: 2 replicas, 1 CPU, 1GB memory each
- **HorizontalPodAutoscaler**: Scales 3-20 replicas based on CPU/memory

### Services

- **brandpulse-api**: ClusterIP on port 80 (→ 4770)
- **brandpulse-dashboard**: ClusterIP on port 80 (→ 4780)

### Ingress

Requires:
- nginx-ingress controller
- cert-manager for SSL
- TLS certificates

---

## Monitoring

### Datadog

1. Create Datadog API key secret:
```bash
kubectl create secret generic datadog-api-key \
  --from-literal=api-key="YOUR_DATADOG_KEY" \
  --namespace=rtmn
```

2. Deploy monitoring:
```bash
kubectl apply -f deploy/kubernetes/monitoring.yaml
```

### Health Checks

```bash
# Local health check
./deploy/scripts/health-check.sh

# Remote health check
curl https://api.rtmn.io/health
```

---

## Backup & Restore

### Backup

```bash
# Run backup script
chmod +x deploy/scripts/backup.sh
./deploy/scripts/backup.sh

# Or manual backup
mongodump --uri="mongodb+srv://..." --out=/backups/mongodb
```

### Restore

```bash
# Restore MongoDB
mongorestore --uri="mongodb+srv://..." /backups/mongodb
```

---

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl get pods -n rtmn

# Describe pod
kubectl describe pod <pod-name> -n rtmn

# Check logs
kubectl logs <pod-name> -n rtmn
```

### Service unavailable

```bash
# Check service endpoints
kubectl get endpoints -n rtmn

# Check ingress
kubectl describe ingress brandpulse-api -n rtmn

# Check certificate
kubectl get certificate -n rtmn
```

### High memory/CPU

```bash
# Check resource usage
kubectl top pods -n rtmn

# Check node resources
kubectl top nodes
```

---

## Security Checklist

- [ ] Secrets stored in Kubernetes secrets (not in code)
- [ ] TLS certificates configured
- [ ] Network policies in place
- [ ] RBAC configured
- [ ] Container image scanning enabled
- [ ] Security headers configured (nginx)
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Backup schedule configured
- [ ] Monitoring alerts configured

---

## Support

- **Documentation:** docs.rtmn.io
- **Status:** status.rtmn.io
- **Support:** support@rtmn.com
