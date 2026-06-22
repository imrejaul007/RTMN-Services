# HOJAI AI Ecosystem - Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Deployment (GCP, AWS, Azure)](#cloud-deployment-gcp-aws-azure)
6. [Monitoring Setup](#monitoring-setup)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Disk | 50 GB SSD | 100+ GB SSD |
| Node.js | 18.x LTS | 20.x LTS |
| Docker | 24.x | 25.x+ |
| Kubernetes | 1.28+ | 1.30+ |

### Required Tools

```bash
# Node.js
node --version  # >= 18.0.0

# Docker
docker --version  # >= 24.0.0
docker-compose --version  # >= 2.20.0

# Kubernetes (optional)
kubectl version --client  # >= 1.28

# Cloud CLIs (optional, based on deployment target)
gcloud --version  # GCP
aws --version  # AWS
az --version  # Azure
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/hojai/hojai-ai.git
cd hojai-ai
```

### 2. Environment Variables

Create `.env.production` from the template:

```bash
cp .env.example .env.production
```

Required environment variables:

```env
# Application
NODE_ENV=production
PORT=3000

# Security (REQUIRED - no defaults)
JWT_SECRET=<your-secure-jwt-secret>
API_TOKEN=<your-api-token>
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/hojai

# Redis
REDIS_URL=redis://host:6379

# External Services
OPENAI_API_KEY=<your-openai-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
```

**IMPORTANT**: The application now requires `JWT_SECRET` to be set. The previous default of `'your-secret-key'` has been removed for security. Missing this variable will cause the application to throw an error on startup.

### 3. CORS Configuration

The CORS middleware is now configured with a whitelist approach:

```env
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

Allowed methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
Allowed headers: `Content-Type`, `Authorization`

---

## Docker Deployment

### 1. Build Image

```bash
# Build the production image
docker build -t hojai-ai:latest .

# Or use docker-compose
docker-compose -f docker-compose.prod.yml build
```

### 2. Run with Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### 3. Docker Compose Production File

Key services included:
- `hojai-core` - Main application server
- `redis` - Caching and session storage
- `postgres` - Primary database
- `prometheus` - Metrics collection
- `grafana` - Monitoring dashboard

### 4. Environment-Specific Deployments

```bash
# Staging environment
docker-compose -f docker-compose.staging.yml up -d

# Compliance environment (HIPAA/SOC2 ready)
docker-compose -f docker-compose.compliance.yml up -d
```

---

## Kubernetes Deployment

### 1. Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"

# Install Helm
brew install helm

# Install kustomize
brew install kustomize
```

### 2. Create Namespace

```bash
kubectl create namespace hojai-ai
kubectl config set-context --current --namespace=hojai-ai
```

### 3. Deploy using Helm

```bash
cd deploy/kubernetes

# Install the chart
helm install hojai-ai ./charts/hojai-ai \
  --set image.tag=latest \
  --set replicaCount=3 \
  --values ./values.prod.yaml
```

### 4. Key Kubernetes Resources

| Resource | Purpose |
|----------|---------|
| `Deployment` | Application pods with rolling update strategy |
| `Service` | Internal cluster networking |
| `Ingress` | External HTTP/HTTPS access |
| `ConfigMap` | Non-sensitive configuration |
| `Secret` | Sensitive data (JWT, API keys) |
| `HorizontalPodAutoscaler` | Automatic scaling based on CPU/memory |

### 5. Configure Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hojai-ai-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.hojai.ai
      secretName: hojai-tls-secret
  rules:
    - host: api.hojai.ai
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: hojai-core
                port:
                  number: 3000
```

### 6. Scaling

```bash
# Manual scaling
kubectl scale deployment hojai-core --replicas=5

# Auto-scaling with HPA
kubectl autoscale deployment hojai-core \
  --cpu-percent=70 \
  --min=2 \
  --max=10
```

---

## Cloud Deployment (GCP, AWS, Azure)

### Google Cloud Platform (GCP)

#### 1. Setup

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable container.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com
```

#### 2. Deploy to Cloud Run

```bash
# Build and push to Artifact Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/hojai-ai:latest

# Deploy to Cloud Run
gcloud run deploy hojai-ai \
  --image gcr.io/YOUR_PROJECT_ID/hojai-ai:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "JWT_SECRET=$JWT_SECRET"
```

#### 3. GKE Deployment

```bash
# Create cluster
gcloud container clusters create hojai-cluster \
  --zone us-central1-a \
  --node-pool-name default-pool \
  --num-nodes=3

# Get credentials
gcloud container clusters get-credentials hojai-cluster --zone us-central1-a

# Apply Kubernetes manifests
kubectl apply -f deploy/kubernetes/
```

#### 4. Cloud SQL Setup

```bash
# Create PostgreSQL instance
gcloud sql instances create hojai-db \
  --database-version=POSTGRES_15 \
  --tier=db-n1-standard-2 \
  --region=us-central1

# Create database
gcloud sql databases create hojai --instance=hojai-db
```

### Amazon Web Services (AWS)

#### 1. Setup

```bash
# Configure AWS CLI
aws configure

# Create ECR repository
aws ecr create-repository --repository-name hojai-ai
```

#### 2. Deploy to ECS

```bash
# Login to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.region.amazonaws.com

# Build and push image
docker build -t hojai-ai:latest .
docker tag hojai-ai:latest ACCOUNT.dkr.ecr.region.amazonaws.com/hojai-ai:latest
docker push ACCOUNT.dkr.ecr.region.amazonaws.com/hojai-ai:latest

# Deploy using ECS CLI or CloudFormation
aws ecs create-cluster --cluster-name hojai-cluster
```

#### 3. RDS Setup

```bash
# Create PostgreSQL RDS instance
aws rds create-db-instance \
  --db-instance-identifier hojai-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username admin \
  --allocated-storage 50
```

#### 4. Application Load Balancer

```bash
# Create target group
aws elbv2 create-target-group \
  --name hojai-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id VPC_ID

# Create load balancer
aws elbv2 create-load-balancer \
  --name hojai-alb \
  --subnets SUBNET1 SUBNET2
```

### Microsoft Azure

#### 1. Setup

```bash
# Login and set subscription
az login
az account set --subscription SUBSCRIPTION_ID

# Create resource group
az group create --name hojai-rg --location eastus
```

#### 2. Deploy to Container Apps

```bash
# Create container app environment
az containerapp env create \
  --name hojai-env \
  --resource-group hojai-rg \
  --location eastus

# Deploy application
az containerapp create \
  --name hojai-ai \
  --resource-group hojai-rg \
  --environment hojai-env \
  --image hojaiai/hojai-ai:latest \
  --target-port 3000 \
  --ingress external \
  --set-env-vars "JWT_SECRET=$JWT_SECRET"
```

#### 3. Azure Database for PostgreSQL

```bash
# Create server
az postgres server create \
  --resource-group hojai-rg \
  --name hojai-postgres \
  --location eastus \
  --admin-user admin \
  --admin-password PASSWORD

# Configure firewall
az postgres server firewall-rule create \
  --resource-group hojai-rg \
  --server hojai-postgres \
  --name AllowAzureIPs \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

---

## Monitoring Setup

### 1. Prometheus Metrics

The application exposes metrics at `/metrics` endpoint.

```yaml
# prometheus-config.yaml
scrape_configs:
  - job_name: 'hojai-ai'
    static_configs:
      - targets: ['hojai-core:3000']
    metrics_path: '/metrics'
```

### 2. Grafana Dashboards

Import the provided dashboards from `deploy/grafana/`.

Key metrics to monitor:
- Request rate (requests/second)
- Response latency (p50, p95, p99)
- Error rate (5xx responses)
- CPU/Memory usage
- Database connection pool

### 3. Alerting Rules

```yaml
# alerting-rules.yaml
groups:
  - name: hojai-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
```

### 4. Health Checks

```bash
# Liveness probe
curl -f http://localhost:3000/health/live

# Readiness probe
curl -f http://localhost:3000/health/ready
```

### 5. Logging

Structured JSON logging is enabled by default:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Request processed",
  "method": "POST",
  "path": "/api/v1/chat",
  "statusCode": 200,
  "duration": 145
}
```

---

## Troubleshooting

### Common Issues

#### 1. Application Fails to Start

**Error**: `Error: JWT_SECRET environment variable is required`

**Solution**: Ensure `JWT_SECRET` is set in your environment:
```bash
export JWT_SECRET="your-secure-64-character-secret"
```

#### 2. CORS Errors

**Error**: `Access-Control-Allow-Origin header missing`

**Solution**: Verify `CORS_ORIGIN` environment variable is set correctly:
```bash
export CORS_ORIGIN="https://yourdomain.com,https://app.yourdomain.com"
```

#### 3. Database Connection Issues

**Error**: `Connection refused` or `ETIMEDOUT`

**Solution**:
```bash
# Verify database is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### 4. Memory Issues

**Error**: `FATAL: could not map memory`

**Solution**:
```bash
# Increase Docker memory limits
docker-compose -f docker-compose.prod.yml down
# Edit docker-compose.prod.yml and increase memory
docker-compose -f docker-compose.prod.yml up -d
```

#### 5. Request Body Too Large

**Error**: `Payload too large` or `413 Request Entity Too Large`

**Solution**: Default body limit is now 10kb. If you need more:
```typescript
app.use(express.json({ limit: '10kb' })); // Default
// Change to:
app.use(express.json({ limit: '50kb' }));
```

#### 6. Kubernetes Pod Crashes

```bash
# Check pod status
kubectl get pods

# View pod logs
kubectl logs hojai-core-xxx-yyy -f

# Describe pod for events
kubectl describe pod hojai-core-xxx-yyy

# Check events in namespace
kubectl get events --sort-by='.lastTimestamp'
```

#### 7. Image Pull Failures (Kubernetes)

```bash
# Check image pull policy
kubectl get pod hojai-core-xxx-yyy -o jsonpath='{.spec.containers[0].imagePullPolicy}'

# If using private registry, create imagePullSecret
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=YOUR_USER \
  --docker-password=YOUR_PASS \
  --docker-email=YOUR_EMAIL
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Enable verbose errors
export NODE_ENV=development

# Run with inspect for debugging
node --inspect index.js
```

### Health Check Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health/live` | Liveness probe - is the process running? |
| `/health/ready` | Readiness probe - is the service ready to accept traffic? |
| `/health` | Detailed health status with dependencies |
| `/metrics` | Prometheus-compatible metrics |

---

## Security Checklist

- [ ] Set `JWT_SECRET` environment variable (no defaults)
- [ ] Configure `CORS_ORIGIN` whitelist
- [ ] Enable TLS in production
- [ ] Use secrets management (Kubernetes Secrets, AWS Secrets Manager, etc.)
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Regular security scanning (`npm audit`)
- [ ] Keep dependencies updated

---

## Rollback Procedures

### Docker Rollback

```bash
# Rollback to previous version
docker-compose -f docker-compose.prod.yml down
docker tag hojai-ai:previous hojai-ai:latest
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/hojai-core

# Rollback to specific revision
kubectl rollout undo deployment/hojai-core --to-revision=2

# Check rollout status
kubectl rollout status deployment/hojai-core
```

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/hojai/hojai-ai/issues
- Documentation: https://docs.hojai.ai
- Email: support@hojai.ai
