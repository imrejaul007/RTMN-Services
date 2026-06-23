# Phase 1: Deployment Guide

**Status:** Planned
**Last Updated:** 2026-06-22

---

## Prerequisites

### API Keys Required

```bash
# .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
MISTRAL_API_KEY=...
HOJAI_LLM_ENDPOINT=http://localhost:5000
HOJAI_LLM_API_KEY=...

# Stripe (for billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Feature flags
USE_REAL_PROVIDERS=true
USE_BILLING=true
```

### Infrastructure Required

- Docker 20+
- Docker Compose 2.0+
- 2GB RAM minimum
- 10GB disk space

---

## Deployment Steps

### Step 1: Build Docker Images

```bash
# Build inference gateway
cd platform/intelligence/inference-gateway
docker build -t hojai/inference-gateway:1.0.0 .

# Build billing service
cd platform/infra/billing-apis
docker build -t hojai/billing-apis:1.0.0 .
```

### Step 2: Deploy with Docker Compose

```bash
# Create docker-compose.yml
cat > docker-compose.yml <<EOF
version: '3.8'

services:
  inference-gateway:
    image: hojai/inference-gateway:1.0.0
    ports:
      - "4294:4294"
    environment:
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY}
      - GOOGLE_API_KEY=\${GOOGLE_API_KEY}
      - USE_REAL_PROVIDERS=true
    volumes:
      - inference-costs:/app/data/costs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4294/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  billing-apis:
    image: hojai/billing-apis:1.0.0
    ports:
      - "4782:4782"
    environment:
      - STRIPE_SECRET_KEY=\${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=\${STRIPE_WEBHOOK_SECRET}
    volumes:
      - inference-costs:/app/data/costs:ro
      - billing-budgets:/app/data/budgets
    depends_on:
      - inference-gateway
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4782/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  inference-costs:
  billing-budgets:
EOF

# Start services
docker compose up -d
```

### Step 3: Verify Deployment

```bash
# Check inference gateway
curl http://localhost:4294/health
# Expected: {"status":"healthy","service":"inference-gateway"}

# Check billing service
curl http://localhost:4782/health
# Expected: {"status":"healthy","service":"billing-apis"}

# Test LLM call
curl -X POST http://localhost:4294/api/complete \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Step 4: Configure Monitoring

```bash
# Add Prometheus scraping
cat >> prometheus.yml <<EOF
scrape_configs:
  - job_name: 'inference-gateway'
    static_configs:
      - targets: ['localhost:4294']
  - job_name: 'billing-apis'
    static_configs:
      - targets: ['localhost:4782']
EOF

# Restart Prometheus
docker compose restart prometheus
```

---

## Production Deployment (Kubernetes)

### Step 1: Create Kubernetes Manifests

```yaml
# inference-gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inference-gateway
  namespace: hojai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: inference-gateway
  template:
    metadata:
      labels:
        app: inference-gateway
    spec:
      containers:
      - name: inference-gateway
        image: hojai/inference-gateway:1.0.0
        ports:
        - containerPort: 4294
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: hojai-secrets
              key: openai-api-key
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: hojai-secrets
              key: anthropic-api-key
        - name: USE_REAL_PROVIDERS
          value: "true"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4294
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4294
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: inference-gateway
  namespace: hojai
spec:
  selector:
    app: inference-gateway
  ports:
  - port: 4294
    targetPort: 4294
  type: LoadBalancer
```

### Step 2: Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace hojai

# Create secrets
kubectl create secret generic hojai-secrets \
  --from-literal=openai-api-key=$OPENAI_API_KEY \
  --from-literal=anthropic-api-key=$ANTHROPIC_API_KEY \
  --from-literal=stripe-secret-key=$STRIPE_SECRET_KEY \
  --namespace=hojai

# Deploy
kubectl apply -f inference-gateway-deployment.yaml
kubectl apply -f billing-apis-deployment.yaml

# Verify
kubectl get pods --namespace=hojai
```

---

## Rollback Procedure

### Quick Rollback (Docker Compose)

```bash
# Stop new version
docker compose down

# Restore previous version
docker compose up -d
```

### Database Rollback

```bash
# Backup before deployment
cp -r ./data/costs ./data/costs.backup.$(date +%Y%m%d)

# Restore if needed
rm -rf ./data/costs
cp -r ./data/costs.backup.20260622 ./data/costs
```

### Feature Flag Rollback

```bash
# Disable real providers (revert to stub)
export USE_REAL_PROVIDERS=false
docker compose up -d

# Disable billing
export USE_BILLING=false
docker compose up -d
```

---

## Post-Deployment Checklist

- [ ] All services healthy
- [ ] LLM calls working for all 9 models
- [ ] Cost tracking accurate
- [ ] Billing service operational
- [ ] Stripe integration working
- [ ] Prometheus scraping metrics
- [ ] Grafana dashboards showing data
- [ ] Alerts configured
- [ ] Logs being collected
- [ ] Documentation deployed
- [ ] Team notified

---

*Deployment guide: 2026-06-22*