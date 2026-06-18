# CorpID Cloud - Deployment Guide v4.0

**Version:** 4.0.0
**Date:** June 18, 2026

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Deployment](#development-deployment)
3. [Production Deployment](#production-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Load Balancing](#load-balancing)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Minimum (Development):**
- CPU: 1 core
- RAM: 1 GB
- Disk: 1 GB
- Node.js: 18+ (ESM support required)
- OS: macOS, Linux, Windows

**Recommended (Production):**
- CPU: 4+ cores
- RAM: 8+ GB
- Disk: 50+ GB SSD
- Node.js: 20+ LTS
- OS: Ubuntu 22.04 LTS or similar

### Software Dependencies
- Node.js 18+ (with ESM support)
- npm 9+ or yarn
- Git
- (Production) Docker & Docker Compose
- (Production) Nginx or similar reverse proxy
- (Production) MongoDB 6+
- (Production) Redis 7+

---

## Development Deployment

### 1. Clone Repository
```bash
git clone https://github.com/rtmn/corpid-cloud.git
cd corpid-cloud
```

### 2. Install Dependencies
```bash
cd services/corpid-service/corpID-cloud
npm install
```

### 3. Environment Configuration
Create `.env` file:
```env
# Server
PORT=4702
NODE_ENV=development

# JWT
JWT_SECRET=dev-secret-change-in-production-min-32-chars
JWT_EXPIRES_IN=1h
REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=*

# Logging
LOG_LEVEL=debug
```

### 4. Start Development Server
```bash
# Standard start
npm start

# With auto-reload
npm run dev
```

### 5. Verify Installation
```bash
curl http://localhost:4702/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "CorpID Cloud Gateway",
  "version": "4.0.0",
  "port": 4702,
  "timestamp": "2026-06-18T19:00:00.000Z"
}
```

---

## Production Deployment

### Option 1: Single Server (Small Scale)

For deployments with < 10,000 users.

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Deploy Application
```bash
# Clone and install
git clone https://github.com/rtmn/corpid-cloud.git /opt/corpID
cd /opt/corpID/services/corpid-service/corpID-cloud
npm ci --production

# Create .env file
sudo nano /opt/corpID/.env
```

#### 3. Configure PM2
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'corpid-cloud',
    script: 'gateway.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4702
    },
    max_memory_restart: '1G',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
```

#### 4. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 2: Docker (Recommended)

#### 1. Create Dockerfile

```dockerfile
# services/corpid-service/corpID-cloud/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 corpid

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=corpid:nodejs . .

USER corpid

EXPOSE 4702

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4702/health || exit 1

CMD ["node", "gateway.js"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  corpid-cloud:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: corpid-cloud
    restart: unless-stopped
    ports:
      - "4702:4702"
    environment:
      - NODE_ENV=production
      - PORT=4702
      - JWT_SECRET=${JWT_SECRET}
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - mongodb
      - redis
    networks:
      - corpid-network
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4702/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongodb:
    image: mongo:7
    container_name: corpid-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - corpid-network

  redis:
    image: redis:7-alpine
    container_name: corpid-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - corpid-network

  nginx:
    image: nginx:alpine
    container_name: corpid-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - corpid-cloud
    networks:
      - corpid-network

volumes:
  mongodb_data:
  redis_data:

networks:
  corpid-network:
    driver: bridge
```

#### 3. Environment File
```env
# .env
NODE_ENV=production
JWT_SECRET=your-very-secure-secret-key-min-32-characters-long
JWT_EXPIRES_IN=1h
REFRESH_EXPIRES_IN=7d

MONGO_USER=admin
MONGO_PASSWORD=secure-mongo-password
MONGODB_URI=mongodb://admin:secure-mongo-password@mongodb:27017/corpid?authSource=admin

REDIS_URL=redis://redis:6379

CORS_ORIGINS=https://app.example.com,https://admin.example.com
```

#### 4. Deploy
```bash
docker-compose up -d
docker-compose logs -f corpid-cloud
```

---

## Environment Configuration

### Production Environment Variables

```env
# ============ Server ============
PORT=4702
NODE_ENV=production

# ============ Security ============
JWT_SECRET=CHANGE-THIS-TO-A-STRONG-SECRET-MIN-32-CHARS
JWT_EXPIRES_IN=1h
REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=64-CHAR-HEX-STRING-FOR-AES-256-ENCRYPTION

# ============ Database ============
MONGODB_URI=mongodb://user:pass@host:27017/corpid
REDIS_URL=redis://host:6379
ELASTICSEARCH_URL=http://host:9200

# ============ CORS ============
CORS_ORIGINS=https://app.example.com,https://admin.example.com

# ============ Rate Limiting ============
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5

# ============ Logging ============
LOG_LEVEL=info
LOG_FORMAT=json

# ============ Email (for verification) ============
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=smtp-password
SMTP_FROM=noreply@example.com

# ============ SMS (for OTP) ============
SMS_PROVIDER=twilio
SMS_API_KEY=your-sms-api-key
SMS_FROM=+1234567890

# ============ KYC Vendor (Optional) ============
KYC_VENDOR=sumsub
KYC_API_KEY=your-kyc-api-key
KYC_API_SECRET=your-kyc-secret

# ============ Storage (for documents) ============
STORAGE_TYPE=s3
S3_BUCKET=corpid-documents
S3_REGION=us-east-1
S3_ACCESS_KEY=your-s3-key
S3_SECRET_KEY=your-s3-secret

# ============ Monitoring (Optional) ============
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
```

### Generating Secrets
```bash
# JWT Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (64 hex characters for AES-256)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup

### MongoDB Schema (Future)

When migrating from in-memory to MongoDB, the following collections are needed:

```javascript
// Users Collection
{
  _id: ObjectId,
  email: String (unique, indexed),
  emailVerified: Boolean,
  passwordHash: String,
  name: String,
  role: String (indexed),
  organizationId: String (indexed),
  mfaEnabled: Boolean,
  status: String,
  preferences: Object,
  createdAt: Date (indexed),
  updatedAt: Date
}

// Organizations Collection
{
  _id: ObjectId,
  name: String,
  slug: String (unique, indexed),
  type: String,
  status: String,
  settings: Object,
  createdAt: Date
}

// Departments Collection
{
  _id: ObjectId,
  organizationId: String (indexed),
  name: String,
  parentId: String,
  createdAt: Date
}

// Memberships Collection
{
  _id: ObjectId,
  userId: String (indexed),
  organizationId: String (indexed),
  role: String,
  status: String,
  compound index: { userId: 1, organizationId: 1 } (unique)
}

// Sessions Collection
{
  _id: ObjectId,
  userId: String (indexed),
  refreshToken: String (indexed),
  userAgent: String,
  ip: String,
  expiresAt: Date (TTL index),
  createdAt: Date
}

// API Keys Collection
{
  _id: ObjectId,
  keyHash: String (indexed),
  userId: String,
  organizationId: String,
  scopes: [String],
  lastUsedAt: Date,
  createdAt: Date
}

// Audit Events Collection
{
  _id: ObjectId,
  timestamp: Date (indexed, TTL: 90 days),
  actor: { type, id, email, ip },
  action: String (indexed),
  resource: { type, id },
  result: String,
  changes: Object,
  compound index: { timestamp: -1, action: 1 }
}
```

### Redis Usage (Future)
```
# Session storage
session:{sessionId} -> JSON { userId, expiresAt, ... }

# Rate limiting
ratelimit:{ip}:{endpoint} -> count (TTL: window)

# JWT blacklist
jwt:revoked:{jti} -> "1" (TTL: token expiry)

# Cache
cache:{key} -> value (TTL: configurable)

# OTP
otp:{phone} -> "123456" (TTL: 10 minutes)
```

---

## Load Balancing

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/corpid
upstream corpid_backend {
    least_conn;
    server 127.0.0.1:4702 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4703 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4704 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

server {
    listen 80;
    server_name corpid.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name corpid.example.com;

    ssl_certificate /etc/ssl/certs/corpid.crt;
    ssl_certificate_key /etc/ssl/private/corpid.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://corpid_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://corpid_backend/health;
        access_log off;
    }
}
```

---

## Monitoring Setup

### PM2 Monitoring
```bash
# Install PM2 Plus for monitoring
pm2 plus

# Or use built-in monitoring
pm2 monit
```

### Prometheus + Grafana (Future)

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'corpid-cloud'
    scrape_interval: 15s
    static_configs:
      - targets: ['corpid-cloud:4702']
    metrics_path: /metrics
```

### Key Metrics to Track

| Metric | Type | Description |
|--------|------|-------------|
| `corpid_requests_total` | Counter | Total requests by endpoint |
| `corpid_request_duration_seconds` | Histogram | Request latency |
| `corpid_active_sessions` | Gauge | Current active sessions |
| `corpid_tokens_issued_total` | Counter | JWT tokens issued |
| `corpid_auth_failures_total` | Counter | Failed authentication attempts |
| `corpid_kyc_pending_total` | Gauge | KYC records pending review |
| `corpid_consent_changes_total` | Counter | Consent updates |
| `corpid_trust_evaluations_total` | Counter | Trust score evaluations |

### Health Check Endpoint
```bash
curl https://corpid.example.com/health
```

---

## Backup & Recovery

### Database Backups (When Using MongoDB)

```bash
#!/bin/bash
# backup.sh - Daily MongoDB backup

BACKUP_DIR="/var/backups/corpid"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$DATE"

# Compress
tar -czf "$BACKUP_DIR/$DATE.tar.gz" "$BACKUP_DIR/$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Remove old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3
aws s3 cp "$BACKUP_DIR/$DATE.tar.gz" s3://corpid-backups/
```

### Automated Backups
```bash
# Add to crontab
0 2 * * * /opt/corpID/scripts/backup.sh
```

### Recovery
```bash
# Stop service
pm2 stop corpid-cloud

# Restore database
tar -xzf /var/backups/corpid/20260618_020000.tar.gz
mongorestore --uri="$MONGODB_URI" /path/to/backup

# Restart service
pm2 start corpid-cloud
```

---

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check logs
pm2 logs corpid-cloud --lines 100

# Common causes:
# - Port already in use: lsof -i :4702
# - Missing .env file
# - Invalid JWT_SECRET
```

#### 2. Authentication Failures
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check token expiration
node -e "
const jwt = require('jsonwebtoken');
const decoded = jwt.decode('YOUR_TOKEN');
console.log('Expires:', new Date(decoded.exp * 1000));
console.log('Issued:', new Date(decoded.iat * 1000));
"
```

#### 3. Rate Limit Issues
```bash
# Check rate limit headers
curl -I http://localhost:4702/auth/login

# Headers:
# X-RateLimit-Limit: 5
# X-RateLimit-Remaining: 4
# X-RateLimit-Reset: 1234567890
```

#### 4. Database Connection Errors
```bash
# Test MongoDB connection
mongosh "$MONGODB_URI" --eval "db.runCommand({ping: 1})"

# Test Redis
redis-cli -u "$REDIS_URL" ping
```

#### 5. Memory Issues
```bash
# Check memory usage
pm2 status
pm2 monit

# Increase Node.js heap size
node --max-old-space-size=4096 gateway.js
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Enable Node.js debugger
node --inspect gateway.js
# Then attach Chrome DevTools
```

### Performance Tuning

```bash
# Enable Node.js production optimizations
NODE_ENV=production node --optimize-for-size gateway.js

# Use PM2 cluster mode for multi-core
pm2 start ecosystem.config.js -i max

# Tune ulimits
ulimit -n 65535
```

---

## Security Checklist

### Pre-Production
- [ ] All secrets generated and stored securely
- [ ] HTTPS/TLS configured
- [ ] CORS configured for specific domains
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Database credentials secured
- [ ] API keys for external services secured

### Production
- [ ] Firewall configured (only 80/443 open)
- [ ] SSL certificate valid and auto-renewing
- [ ] Database backups automated
- [ ] Monitoring and alerting configured
- [ ] Log aggregation configured
- [ ] Intrusion detection enabled
- [ ] Regular security audits scheduled

### Compliance
- [ ] GDPR compliance review
- [ ] DPDP (India) compliance review
- [ ] CCPA (California) compliance review
- [ ] Audit logs retention configured
- [ ] Data export/deletion processes tested
- [ ] Privacy policy updated
- [ ] Terms of service updated

---

*CorpID Cloud Deployment Guide v4.0 - June 18, 2026*
