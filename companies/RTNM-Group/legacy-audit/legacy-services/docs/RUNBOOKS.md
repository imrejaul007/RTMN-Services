# RTNM-Group Operations Runbooks

> **Version:** 1.0.0
> **Last Updated:** 2026-05-13

---

## Table of Contents

1. [Incident Response](#incident-response)
2. [Deployment Procedures](#deployment-procedures)
3. [Database Operations](#database-operations)
4. [Service Operations](#service-operations)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Disaster Recovery](#disaster-recovery)

---

## Incident Response

### Severity Levels

| Level | Response Time | Example |
|-------|--------------|---------|
| P0 - Critical | 15 min | All services down |
| P1 - High | 30 min | Single service down |
| P2 - Medium | 2 hours | Degraded performance |
| P3 - Low | 24 hours | Minor issues |

### Incident Checklist

```markdown
- [ ] Acknowledge incident
- [ ] Create incident ticket
- [ ] Assess severity
- [ ] Notify stakeholders
- [ ] Begin investigation
- [ ] Implement fix
- [ ] Verify resolution
- [ ] Document postmortem
```

### Communication Template

```
INCIDENT [P#] - [Title]

Severity: P0/P1/P2/P3
Status: Investigating/Identified/Resolved
Impact: [Description of user/business impact]

Current Status:
- [What we know]
- [What we're doing]

Next Update: [Time]
```

---

## Deployment Procedures

### Pre-Deployment Checklist

```bash
# 1. Check all tests pass
npm test

# 2. Run lint
npm run lint

# 3. Type check
npm run typecheck

# 4. Check environment variables
cat .env | grep -E "^(MONGODB|REDIS|INTERNAL_)"

# 5. Notify team
echo "Deploying [service] at $(date)"
```

### Deployment Steps

#### Docker Deployment

```bash
# 1. Build image
docker build -t rtnm/service:latest .

# 2. Tag for registry
docker tag rtnm/service:latest registry.rez.money/rtnm/service:latest

# 3. Push to registry
docker push registry.rez.money/rtnm/service:latest

# 4. Update deployment
kubectl set image deployment/service-name service=registry.rez.money/rtnm/service:latest

# 5. Verify rollout
kubectl rollout status deployment/service-name
```

#### Docker Compose Deployment

```bash
# 1. Pull latest
docker-compose pull

# 2. Stop services
docker-compose down

# 3. Start services
docker-compose up -d

# 4. Verify
docker-compose ps
docker-compose logs --tail=100
```

#### Render Deployment

```bash
# 1. Deploy via blueprint
render blueprint apply -f deploy/render.yaml

# 2. Or deploy individual service
render deploy --service <service-name>
```

### Post-Deployment Checklist

```bash
# 1. Check health
curl http://localhost:3003/health

# 2. Run smoke tests
npm run test:smoke

# 3. Check logs
kubectl logs -l app=service-name --tail=50

# 4. Verify metrics
curl http://localhost:9090/metrics | grep service_requests_total
```

---

## Database Operations

### MongoDB Backup

```bash
# Create backup
mongodump --uri="mongodb://user:pass@host:27017/db" \
  --out=/backups/mongo-$(date +%Y%m%d)

# Compress backup
tar -czvf mongo-backup-$(date +%Y%m%d).tar.gz /backups/mongo-*

# Upload to S3
aws s3 cp mongo-backup-$(date +%Y%m%d).tar.gz s3://rez-backups/
```

### MongoDB Restore

```bash
# Download from S3
aws s3 cp s3://rez-backups/mongo-backup-YYYYMMDD.tar.gz /tmp/

# Extract
tar -xzvf /tmp/mongo-backup-YYYYMMDD.tar.gz

# Restore
mongorestore --uri="mongodb://user:pass@host:27017/db" /backups/mongo-YYYYMMDD/
```

### Redis Operations

```bash
# Connect to Redis
redis-cli -u redis://:pass@host:6379

# Check memory
INFO memory

# List keys (use SCAN, not KEYS)
SCAN 0 MATCH "ratelimit:*" COUNT 100

# Flush test data (PRODUCTION USE WITH CAUTION)
# FLUSHDB  # Only in non-production!
```

---

## Service Operations

### Health Check

```bash
# Check all services
for port in 3000 3003 3005 3080 4018 4032; do
  echo "Port $port:"
  curl -s http://localhost:$port/health || echo "DOWN"
done
```

### Logs Analysis

```bash
# View recent errors
kubectl logs -l app=service-name --since=1h | grep -i error

# Follow logs
kubectl logs -f -l app=service-name

# Search for specific error
kubectl logs -l app=service-name | grep -E "(ERROR|FATAL|Crash)"

# Export logs
kubectl logs -l app=service-name --since=24h > service-logs.txt
```

### Service Restart

```bash
# Kubernetes
kubectl rollout restart deployment/service-name
kubectl rollout status deployment/service-name

# Docker Compose
docker-compose restart service-name
docker-compose logs --tail=100 service-name
```

### Scaling

```bash
# Manual scale
kubectl scale deployment service-name --replicas=5

# Horizontal Pod Autoscaler
kubectl autoscale deployment service-name \
  --min=3 --max=10 --cpu-percent=70
```

---

## Monitoring & Alerts

### Prometheus Queries

```promql
# Request rate
rate(http_requests_total{service="identity"}[5m])

# Error rate
rate(http_requests_total{service="identity",status="500"}[5m])

# Latency p99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
container_memory_usage_bytes{pod=~"identity-.*"}
```

### Alert Rules

```yaml
groups:
  - name: rtnm-alerts
    rules:
      - alert: ServiceDown
        expr: up{job="rtnm-services"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
```

### Grafana Dashboards

| Dashboard | URL |
|----------|-----|
| Platform Overview | grafana.rez.money/d/platform |
| Service Health | grafana.rez.money/d/services |
| Business Metrics | grafana.rez.money/d/business |

---

## Disaster Recovery

### Recovery Time Objectives (RTO)

| Service | RTO | RPO |
|---------|-----|-----|
| Identity Service | 15 min | 5 min |
| Payment Service | 5 min | 0 min |
| Wallet Service | 15 min | 5 min |
| BNPL Service | 30 min | 1 hour |

### Failover Procedure

```bash
# 1. Identify primary failure
kubectl get pods -n rtnm-group | grep -v Running

# 2. Check MongoDB replica set
mongosh --eval "rs.status()" mongodb://user:pass@host:27017

# 3. If primary down, trigger failover
mongosh --eval "rs.stepDown()" mongodb://user:pass@host:27017

# 4. Verify new primary
mongosh --eval "rs.status()" mongodb://user:pass@host:27017

# 5. Restart affected pods
kubectl rollout restart deployment/identity-service
```

### Data Recovery

```bash
# 1. Identify last good backup
aws s3 ls s3://rez-backups/ | tail -5

# 2. Stop application
kubectl scale deployment/identity-service --replicas=0

# 3. Restore data
mongorestore --uri="mongodb://user:pass@new-host:27017/db" \
  --drop /backups/mongo-YYYYMMDD/

# 4. Restart application
kubectl scale deployment/identity-service --replicas=3

# 5. Verify
curl http://localhost:3003/health
```

### Rollback Procedure

```bash
# Kubernetes rollback
kubectl rollout undo deployment/service-name
kubectl rollout status deployment/service-name

# Docker Compose rollback
docker-compose down
git checkout docker-compose.yml
docker-compose up -d

# Single service rollback
docker pull rtnm/service:previous-version
docker-compose stop service-name
docker-compose rm service-name
docker-compose up -d service-name
```

---

## Contact Information

| Role | Contact |
|------|---------|
| On-Call Engineer | oncall@rez.money |
| Engineering Lead | lead@rez.money |
| Security | security@rez.money |
| SRE Team | sre@rez.money |

---

**Document Owner:** SRE Team
**Review Cycle:** Monthly
**Next Review:** 2026-06-13
