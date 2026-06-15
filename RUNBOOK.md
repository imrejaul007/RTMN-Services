# Operations Runbook

**Last Updated:** June 15, 2026
**Owner:** RTMN Operations Team

This runbook contains step-by-step procedures for common operational tasks.

---

## Table of Contents

1. [Service Health Checks](#1-service-health-checks)
2. [Deployment Procedures](#2-deployment-procedures)
3. [Rollback Procedures](#3-rollback-procedures)
4. [Database Operations](#4-database-operations)
5. [Scaling Operations](#5-scaling-operations)
6. [Certificate Management](#6-certificate-management)
7. [Disaster Recovery](#7-disaster-recovery)

---

## 1. Service Health Checks

### 1.1 Quick Health Check (All Services)

```bash
# Run health checks for all critical services
curl -s http://localhost:4702/health | jq .   # CorpID
curl -s http://localhost:4703/health | jq .   # MemoryOS
curl -s http://localhost:4242/health | jq .   # GoalOS
curl -s http://localhost:4240/health | jq .   # Decision Engine
curl -s http://localhost:4251/health | jq .   # Agent Economy
curl -s http://localhost:4705/health | jq .   # TwinOS Hub
curl -s http://localhost:4770/health | jq .   # BrandPulse API
curl -s http://localhost:4780/health | jq .   # BrandPulse Dashboard
curl -s http://localhost:5010/health | jq .   # Restaurant OS
curl -s http://localhost:5025/health | jq .   # Hotel OS

# Check all at once
for port in 4702 4703 4242 4240 4251 4705 4770 4780 5010 5025; do
  echo "Port $port: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:$port/health)"
done
```

### 1.2 Detailed Service Status

```bash
# Check MongoDB connections
curl -s http://localhost:4770/health | jq '.dependencies.mongodb'

# Check Redis connections
curl -s http://localhost:4770/health | jq '.dependencies.redis'

# Check WebSocket connectivity
curl -s http://localhost:4770/api/v1/websocket/status

# Check RTNM SDK connectivity
curl -s http://localhost:4770/api/v1/rtnm/status
```

### 1.3 Log Inspection

```bash
# View recent errors
tail -n 100 /var/log/rtmn/brandpulse/error.log | grep ERROR

# Search for specific error
grep -i "ECONNREFUSED" /var/log/rtmn/brandpulse/combined.log

# View logs by request ID
grep "req_id=abc123" /var/log/rtmn/brandpulse/combined.log

# Real-time tail (production)
tail -f /var/log/rtmn/brandpulse/combined.log
```

---

## 2. Deployment Procedures

### 2.1 Standard Deployment (BrandPulse)

```bash
# 1. Pull latest code
cd /opt/rtmn/brandpulse
git pull origin main

# 2. Install dependencies
npm ci --production

# 3. Run migrations
npm run migrate

# 4. Build
npm run build

# 5. Restart service
sudo systemctl restart brandpulse

# 6. Verify
curl -s http://localhost:4770/health | jq .status
# Expected: "healthy"

# 7. Check logs for errors
sudo journalctl -u brandpulse -n 50 --no-pager
```

### 2.2 Blue-Green Deployment (Production)

```bash
# 1. Deploy to green (port 4771)
cd /opt/rtmn/brandpulse-green
git pull origin main
npm ci --production
npm run build

# 2. Start green instance
PORT=4771 node dist/server.js &
sleep 5

# 3. Health check green
curl -s http://localhost:4771/health

# 4. Switch load balancer to green
# (Update nginx/caddy config or update service discovery)

# 5. Stop blue (old)
pkill -f "PORT=4770"
```

### 2.3 Kubernetes Deployment

```bash
# Update image
kubectl set image deployment/brandpulse-api \
  brandpulse-api=ghcr.io/rtmn-group/brandpulse:v1.x.x

# Watch rollout
kubectl rollout status deployment/brandpulse-api

# Verify
kubectl get pods -l app=brandpulse-api
```

---

## 3. Rollback Procedures

### 3.1 Quick Rollback (Git)

```bash
# 1. Find last known good commit
git log --oneline -10

# 2. Rollback to previous version
git revert HEAD
git push origin main

# Or: checkout a specific tag
git checkout v1.0.1
npm ci --production
npm run build
sudo systemctl restart brandpulse
```

### 3.2 Docker Rollback

```bash
# List previous images
docker images | grep brandpulse

# Rollback to previous image
docker pull ghcr.io/rtmn-group/brandpulse:v1.0.1
docker stop brandpulse
docker rm brandpulse
docker run -d --name brandpulse --restart unless-stopped \
  -p 4770:4770 \
  ghcr.io/rtmn-group/brandpulse:v1.0.1
```

### 3.3 Kubernetes Rollback

```bash
# Rollback to previous revision
kubectl rollout undo deployment/brandpulse-api

# Rollback to specific revision
kubectl rollout undo deployment/brandpulse-api --to-revision=3

# Verify
kubectl rollout status deployment/brandpulse-api
```

---

## 4. Database Operations

### 4.1 MongoDB Backup

```bash
# Create backup
mongodump --uri="mongodb://localhost:27017/brandpulse" \
  --out=/backups/mongodb/$(date +%Y%m%d_%H%M%S)

# Compress backup
tar -czf /backups/mongodb/backup_$(date +%Y%m%d).tar.gz \
  /backups/mongodb/$(ls -t /backups/mongodb/ | head -1)

# Upload to S3
aws s3 cp /backups/mongodb/backup_$(date +%Y%m%d).tar.gz \
  s3://rtmn-backups/mongodb/
```

### 4.2 MongoDB Restore

```bash
# Download from S3 (if needed)
aws s3 cp s3://rtmn-backups/mongodb/backup_YYYYMMDD.tar.gz /tmp/

# Extract
tar -xzf /tmp/backup_YYYYMMDD.tar.gz -C /tmp/

# Restore
mongorestore --uri="mongodb://localhost:27017/brandpulse" \
  /tmp/backups/mongodb/YYYYMMDD_HHMMSS/

# Verify
mongosh --eval "db.brands.countDocuments()" brandpulse
```

### 4.3 Redis Backup

```bash
# BGSAVE
redis-cli BGSAVE

# Check progress
redis-cli LASTSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backups/redis/backup_$(date +%Y%m%d).rdb

# Upload to S3
aws s3 cp /backups/redis/backup_$(date +%Y%m%d).rdb \
  s3://rtmn-backups/redis/
```

---

## 5. Scaling Operations

### 5.1 Horizontal Scaling (Add Instance)

```bash
# 1. Deploy new instance
gcloud compute instances create brandpulse-instance-3 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --machine-type=e2-medium

# 2. Install dependencies
# (Use cloud-init or deployment script)

# 3. Add to load balancer
gcloud compute target-pools add-instances rtmn-pool \
  --instances=brandpulse-instance-3

# 4. Verify
curl -s http://[LB_IP]/health
```

### 5.2 Vertical Scaling (Resize Instance)

```bash
# AWS
aws ec2 modify-instance-type --instance-id i-xxx --instance-type t3.large

# GCP
gcloud compute instances stop brandpulse
gcloud compute instances set-machine-type brandpulse --machine-type=e2-highmem-4
gcloud compute instances start brandpulse

# Kubernetes
kubectl scale deployment brandpulse-api --replicas=6
```

### 5.3 Auto-Scaling Rules

```yaml
# Kubernetes HPA example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: brandpulse-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: brandpulse-api
  minReplicas: 2
  maxReplicas: 20
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

## 6. Certificate Management

### 6.1 Check Certificate Expiry

```bash
# Check all RTMN domains
for domain in api.rtmn.io dashboard.rtmn.io status.rtmn.io docs.rtmn.io; do
  expiry=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null \
    | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
  echo "$domain: $expiry"
done
```

### 6.2 Renew Let's Encrypt Certificate

```bash
# Using certbot
sudo certbot renew --nginx -d api.rtmn.io -d dashboard.rtmn.io

# Verify renewal
sudo certbot certificates

# Reload nginx
sudo systemctl reload nginx
```

### 6.3 Install New Certificate

```bash
# Copy certs
sudo cp /tmp/cert.pem /etc/ssl/certs/rtmn.crt
sudo cp /tmp/privkey.pem /etc/ssl/private/rtmn.key

# Set permissions
sudo chmod 644 /etc/ssl/certs/rtmn.crt
sudo chmod 600 /etc/ssl/private/rtmn.key

# Reload service
sudo systemctl reload nginx
sudo systemctl reload brandpulse
```

---

## 7. Disaster Recovery

### 7.1 Full DR Procedure

```bash
# 1. Verify DR site is ready
gcloud compute instances list --filter="zone:us-west2-b"
kubectl get pods --all-namespaces

# 2. Failover DNS
gcloud dns record-sets transaction start --zone=rtmn-zone
gcloud dns record-sets transaction add [NEW_IP] \
  --name=api.rtmn.io \
  --ttl=300 \
  --type=A \
  --zone=rtmn-zone
gcloud dns record-sets transaction execute --zone=rtmn-zone

# 3. Verify DR site
curl -s https://api.rtmn.io/health
curl -s https://dashboard.rtmn.io/health

# 4. Notify team
# (See INCIDENT-RESPONSE.md)
```

### 7.2 RTO/RPO Targets

| Service | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) |
|---------|-------------------------------|-------------------------------|
| BrandPulse API | 1 hour | 4 hours |
| BrandPulse Dashboard | 1 hour | 4 hours |
| Hotel OS | 1 hour | 4 hours |
| Foundation Services | 15 minutes | 1 hour |
| Database | 1 hour | 4 hours |

---

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Primary On-Call | [TBD] | [TBD] | oncall-primary@rtmn.com |
| Secondary On-Call | [TBD] | [TBD] | oncall-secondary@rtmn.com |
| Engineering Lead | [TBD] | [TBD] | [TBD] |
| VP Engineering | [TBD] | [TBD] | [TBD] |
| AWS Support | — | 1-866-726-3390 | — |
| MongoDB Atlas Support | — | Enterprise Portal | — |

---

*This runbook is a living document. Update after every incident and review quarterly.*