# Production Deployment Guide
> **Date:** June 30, 2026
> **Status:** Production-ready
> **Version:** 3.2

---

## 📋 Pre-Deployment Checklist

### System Requirements
- **Node.js:** 18.x or higher
- **Memory:** Minimum 4GB RAM (8GB recommended)
- **Storage:** 10GB free space
- **OS:** Linux (Ubuntu 22.04+), macOS (12+), Windows Server 2022+
- **Network:** Ports 3001, 4399, 5400-5553, 5670-5680, 5750, 5800-5830 accessible

### Production Tools Required
- **Process Manager:** PM2 or systemd
- **Reverse Proxy:** Nginx or Caddy
- **SSL:** Let's Encrypt or commercial CA
- **Database:** MongoDB 6+, PostgreSQL 14+, Redis 7+
- **Monitoring:** Prometheus + Grafana
- **Logging:** Loki or ELK Stack

---

## 🏗️ Architecture Overview

```
                    [Internet / Users]
                            |
                    [Load Balancer / Nginx]
                            |
              +-------------------------------+
              |        RTMN Hub (4399)       |
              +-------------------------------+
                            |
        +-------------------+-------------------+
        |                   |                   |
   CommerceOS (5400)   BAM Gateway (5550)   Templates (5670)
        |                   |                   |
   Workers (5551-5553)  VendorPools (5680)  Studio API (5750)
        |                                       |
   ProductGraph (5800)                          |
   TradeFinance (5810)                          |
   CrossBorder (5820)                           |
   UniversalDist (5830)                         |
        |                                       |
   [MongoDB, Redis, PostgreSQL]

   +---------------------+
   | Commerce Studio UI |
   | (Next.js - 3001)   |
   +---------------------+
```

---

## 🚀 Deployment Steps

### Step 1: Environment Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install build tools
sudo apt-get install -y build-essential

# Install database
sudo apt-get install -y mongodb-org postgresql redis-server
```

### Step 2: Database Setup

```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create application database
mongosh --eval "db = db.getSiblingDB('nexha_commerce'); db.createUser({user: 'nexha_app', pwd: 'secure_password', roles: ['readWrite']})"

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb nexha_commerce
sudo -u postgres psql -c "CREATE USER nexha_app WITH ENCRYPTED PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nexha_commerce TO nexha_app;"

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Step 3: Application Setup

```bash
# Clone repository
git clone https://github.com/yourorg/RTMN-Services.git
cd RTMN-Services

# Install dependencies for all services
cd services/rtmn-unified-hub && npm install --production
cd ../../companies/HOJAI-AI/platform/commerce-os/commerce-os-gateway && npm install --production
cd ../../../HOJAI-AI/platform/bam/bam-gateway && npm install --production
cd ../../../../Nexha/services/template-engine && npm install --production
cd ../vendor-liquidity-pools && npm install --production
cd ../../../../HOJAI-AI/products/commerce-studio/studio-backend && npm install --production
# ... repeat for all 13 services

# Build all services
./scripts/start-commerce-stack.sh start
```

### Step 4: Process Management with PM2

Create `/opt/nexha/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'rtmn-hub',
      cwd: '/opt/nexha/services/rtmn-unified-hub',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4399
      },
      max_memory_restart: '512M',
      error_file: '/var/log/nexha/rtmn-hub-error.log',
      out_file: '/var/log/nexha/rtmn-hub-out.log'
    },
    {
      name: 'commerceos-gateway',
      cwd: '/opt/nexha/companies/HOJAI-AI/platform/commerce-os/commerce-os-gateway',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5400
      },
      max_memory_restart: '512M'
    },
    {
      name: 'bam-gateway',
      cwd: '/opt/nexha/companies/HOJAI-AI/platform/bam/bam-gateway',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5550 },
      max_memory_restart: '512M'
    },
    {
      name: 'vendor-acquisition',
      cwd: '/opt/nexha/companies/HOJAI-AI/platform/bam/vendor-acquisition-worker',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5551 },
      max_memory_restart: '512M'
    },
    {
      name: 'catalog-normalization',
      cwd: '/opt/nexha/companies/HOJAI-AI/platform/bam/catalog-normalization-worker',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5552 },
      max_memory_restart: '512M'
    },
    {
      name: 'recommendation',
      cwd: '/opt/nexha/companies/HOJAI-AI/platform/bam/recommendation-worker',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5553 },
      max_memory_restart: '512M'
    },
    {
      name: 'template-engine',
      cwd: '/opt/nexha/companies/Nexha/services/template-engine',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5670 },
      max_memory_restart: '512M'
    },
    {
      name: 'vendor-pools',
      cwd: '/opt/nexha/companies/Nexha/services/vendor-liquidity-pools',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5680 },
      max_memory_restart: '512M'
    },
    {
      name: 'studio-backend',
      cwd: '/opt/nexha/companies/HOJAI-AI/products/commerce-studio/studio-backend',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 5750 },
      max_memory_restart: '512M'
    },
    {
      name: 'studio-web',
      cwd: '/opt/nexha/companies/HOJAI-AI/products/commerce-studio/studio-web',
      script: 'npm',
      args: 'start',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 3001 },
      max_memory_restart: '1G'
    },
    {
      name: 'product-graph',
      cwd: '/opt/nexha/companies/Nexha/services/product-graph',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5800 },
      max_memory_restart: '512M'
    },
    {
      name: 'trade-finance',
      cwd: '/opt/nexha/companies/Nexha/services/trade-finance',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5810 },
      max_memory_restart: '512M'
    },
    {
      name: 'cross-border',
      cwd: '/opt/nexha/companies/Nexha/services/cross-border',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5820 },
      max_memory_restart: '512M'
    },
    {
      name: 'universal-distribution',
      cwd: '/opt/nexha/companies/Nexha/services/universal-distribution',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5830 },
      max_memory_restart: '512M'
    }
  ]
};
```

```bash
# Start all services
pm2 start /opt/nexha/ecosystem.config.js

# Save PM2 process list
pm2 save

# Enable PM2 on boot
pm2 startup systemd
sudo systemctl enable pm2-root
```

### Step 5: Nginx Reverse Proxy

Create `/etc/nginx/sites-available/nexha`:

```nginx
upstream rtmn_hub {
    server localhost:4399;
    keepalive 32;
}

upstream commerce_studio {
    server localhost:3001;
    keepalive 16;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=nexha_limit:10m rate=10r/s;

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.nexha.com studio.nexha.com;
    return 301 https://$server_name$request_uri;
}

# API Server
server {
    listen 443 ssl http2;
    server_name api.nexha.com;

    ssl_certificate /etc/letsencrypt/live/api.nexha.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nexha.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req zone=nexha_limit burst=20 nodelay;

    # API proxy
    location / {
        proxy_pass http://rtmn_hub;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://rtmn_hub;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /nginx-health {
        access_log off;
        return 200 "ok\n";
    }
}

# Commerce Studio
server {
    listen 443 ssl http2;
    server_name studio.nexha.com;

    ssl_certificate /etc/letsencrypt/live/studio.nexha.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/studio.nexha.com/privkey.pem;

    location / {
        proxy_pass http://commerce_studio;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nexha /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 6: SSL Certificates (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d api.nexha.com
sudo certbot --nginx -d studio.nexha.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Step 7: Monitoring & Logging

#### Prometheus Configuration

Create `/etc/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nexha-services'
    static_configs:
      - targets:
          - 'localhost:4399'   # Hub
          - 'localhost:5400'   # CommerceOS
          - 'localhost:5550'   # BAM
          - 'localhost:5670'   # Templates
          - 'localhost:5680'   # Vendor Pools
          - 'localhost:5750'   # Studio API
          - 'localhost:5800'   # Product Graph
          - 'localhost:5810'   # Trade Finance
          - 'localhost:5820'   # Cross-Border
          - 'localhost:5830'   # Distribution
```

#### Grafana Dashboard

Key metrics to monitor:
- Request rate (req/sec) per service
- Response time (p50, p95, p99) per service
- Error rate (5xx responses) per service
- CPU and memory usage
- Active connections
- Database connections
- Cache hit rate

---

## 🔒 Security Hardening

### 1. Environment Variables

Create `/opt/nexha/.env`:

```bash
# Database
DATABASE_URL=mongodb://nexha_app:secure_password@localhost:27017/nexha_commerce
POSTGRES_URL=postgresql://nexha_app:secure_password@localhost:5432/nexha_commerce
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
INTERNAL_SERVICE_TOKEN=internal-token-for-service-communication

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=nexha-assets

# Email
SENDGRID_API_KEY=SG....
FROM_EMAIL=noreply@nexha.com

# Monitoring
SENTRY_DSN=https://...@sentry.io/...

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### 2. Firewall Rules

```bash
# Install UFW
sudo apt-get install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 3. Service Authentication

All services use JWT tokens with:
- 15-minute access token expiry
- 7-day refresh token expiry
- HS256 signing algorithm
- Token rotation on each request

### 4. Rate Limiting

```javascript
// In each service
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

---

## 📊 Scaling Strategy

### Horizontal Scaling

For high-traffic services, scale horizontally:

```bash
# Scale Hub to 4 instances
pm2 scale rtmn-hub 4

# Scale CommerceOS to 3 instances
pm2 scale commerceos-gateway 3
```

### Database Scaling

```bash
# MongoDB replica set
mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongo1:27017'}, {_id: 1, host: 'mongo2:27017'}, {_id: 2, host: 'mongo3:27017'}]})"

# PostgreSQL read replicas
# (Configure in postgresql.conf and pg_hba.conf)
```

### Caching Strategy

```javascript
// Redis caching for hot data
const redis = require('redis');
const client = redis.createClient();

async function getCachedTemplate(id) {
  const cached = await client.get(`template:${id}`);
  if (cached) return JSON.parse(cached);

  const template = await db.templates.findById(id);
  await client.setEx(`template:${id}`, 3600, JSON.stringify(template));
  return template;
}
```

---

## 🔍 Monitoring & Alerts

### Health Check Endpoint

```bash
# Check all services
curl https://api.nexha.com/health
# Returns: {"status": "healthy", "services": [...]}

# Individual service
curl https://api.nexha.com/api/services/status
```

### Alert Rules (Prometheus AlertManager)

```yaml
groups:
  - name: nexha-alerts
    rules:
      - alert: ServiceDown
        expr: up{job="nexha-services"} == 0
        for: 1m
        annotations:
          summary: "Service {{ $labels.instance }} is down"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate on {{ $labels.instance }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        annotations:
          summary: "High latency on {{ $labels.instance }}"
```

### Backup Strategy

```bash
# Daily MongoDB backup
mongodump --uri="mongodb://nexha_app:secure_password@localhost:27017/nexha_commerce" --out=/backup/mongo/$(date +%Y%m%d)

# Daily PostgreSQL backup
pg_dump nexha_commerce > /backup/postgres/$(date +%Y%m%d).sql

# Upload to S3
aws s3 sync /backup/ s3://nexha-backups/$(date +%Y%m%d)/
```

---

## 🚨 Disaster Recovery

### RTO (Recovery Time Objective): 1 hour
### RPO (Recovery Point Objective): 15 minutes

### Multi-Region Setup

```bash
# Primary region (us-east-1)
# Standby region (us-west-2)

# Database replication
mongosh --eval "rs.add('mongo-standby.region2.example.com:27017')"

# DNS failover
# Use Route 53 health checks + failover routing
```

### Backup Restore Procedure

```bash
# 1. Stop services
pm2 stop all

# 2. Restore database
mongorestore --uri="mongodb://..." /backup/mongo/latest/

# 3. Restart services
pm2 restart all

# 4. Verify
./scripts/e2e-test.sh
```

---

## 📋 Post-Deployment Checklist

- [ ] All 13 services running and responding to health checks
- [ ] Nginx reverse proxy configured with SSL
- [ ] PM2 process manager active with auto-restart
- [ ] MongoDB, PostgreSQL, Redis running and connected
- [ ] Monitoring (Prometheus + Grafana) configured
- [ ] Logging (Loki/ELK) collecting logs
- [ ] Backups scheduled and tested
- [ ] Firewall rules applied
- [ ] SSL certificates installed and auto-renewing
- [ ] Rate limiting active on all endpoints
- [ ] End-to-end test passes
- [ ] Team trained on operations runbook
- [ ] On-call rotation established

---

## 📞 Support

- **Documentation:** https://docs.nexha.com
- **Status Page:** https://status.nexha.com
- **Support Email:** support@nexha.com
- **Slack:** #nexha-ops

---

**Deployment Guide Version:** 3.2
**Last Updated:** June 30, 2026