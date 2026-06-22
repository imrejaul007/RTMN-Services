# RTMZ Runbooks

Operational runbooks for RTMZ ecosystem.

## Table of Contents

1. [Service Deployment](#service-deployment)
2. [Troubleshooting](#troubleshooting)
3. [Scaling](#scaling)
4. [Backup & Recovery](#backup--recovery)
5. [Security](#security)

---

## Service Deployment

### Deploy All Services

```bash
cd ~/Documents/rtmz/infra
docker-compose -f docker-compose.prod.yml up -d --build
```

### Deploy Specific Service

```bash
docker-compose -f docker-compose.prod.yml up -d --build <service-name>
# Example: docker-compose up -d --build rez-auth
```

### Restart Service

```bash
docker-compose -f docker-compose.prod.yml restart <service-name>
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f <service-name>

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 <service-name>
```

---

## Troubleshooting

### Service Not Starting

1. Check logs:
```bash
docker-compose -f docker-compose.prod.yml logs <service-name>
```

2. Check port conflicts:
```bash
lsof -i :4002  # or other ports
```

3. Check environment variables:
```bash
docker-compose -f docker-compose.prod.yml config
```

### MongoDB Connection Issues

```bash
# Check MongoDB status
docker exec -it rtmz-mongodb-1 mongosh --eval "db.adminCommand('ping')"

# Check collections
docker exec -it rtmz-mongodb-1 mongosh --eval "show dbs"

# View MongoDB logs
docker-compose logs mongodb
```

### Redis Connection Issues

```bash
# Test Redis connection
docker exec -it rtmz-redis-1 redis-cli ping

# View Redis info
docker exec -it rtmz-redis-1 redis-cli info
```

### Auth Service Issues

```bash
# Check auth service health
curl http://localhost:4002/health

# Test token generation
curl -X POST http://localhost:4002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Check internal service tokens
docker-compose config | grep INTERNAL_SERVICE_TOKEN
```

### API/Gateway Issues

```bash
# Check GraphQL endpoint
curl http://localhost:5000/health

# Test GraphQL query
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

---

## Scaling

### Scale Service Instances

```bash
docker-compose -f docker-compose.prod.yml up -d --scale <service>=<count>
# Example: docker-compose up -d --scale automl=3
```

### Load Balancing

Services auto-balance via Docker Compose's internal load balancer.

### Resource Limits

Edit `docker-compose.prod.yml` to add:
```yaml
services:
  <service-name>:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
```

---

## Backup & Recovery

### Backup MongoDB

```bash
# Create backup directory
mkdir -p ~/backups/mongodb

# Backup database
docker exec rtmz-mongodb-1 mongodump --out=/data/backup/$(date +%Y%m%d)

# Copy backup to host
docker cp rtmz-mongodb-1:/data/backup/$(date +%Y%m%d) ~/backups/mongodb/
```

### Restore MongoDB

```bash
# Stop services
docker-compose down

# Restore database
docker exec -i rtmz-mongodb-1 mongorestore --drop < backup.dump

# Restart services
docker-compose up -d
```

### Backup Redis

```bash
# Redis persistence
docker exec rtmz-redis-1 redis-cli SAVE
docker cp rtmz-redis-1:/data/dump.rdb ~/backups/redis/
```

---

## Security

### Rotate JWT Secrets

1. Edit `.env` file:
```bash
JWT_SECRET=new-secret-here
```

2. Restart auth service:
```bash
docker-compose restart rez-auth
```

3. **Warning**: Existing tokens become invalid. Users must re-login.

### Update Internal Service Tokens

1. Update `INTERNAL_SERVICE_TOKENS` in `.env`
2. Restart all services:
```bash
docker-compose down && docker-compose up -d
```

### Check Security Logs

```bash
# View auth service logs
docker-compose logs rez-auth | grep -i "unauthorized\|failed\|error"

# View all security events
docker-compose logs --since=1h | grep -E "auth|token|jwt"
```

### Update Docker Images

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Rebuild with latest code
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Monitoring

### Check Prometheus Metrics

```bash
# View metrics
curl http://localhost:9090/metrics

# Check targets
curl http://localhost:9090/api/v1/targets
```

### Check Grafana

- URL: http://localhost:3030
- Default credentials: admin/admin

### Alert Response

1. Check Alertmanager: http://localhost:9093
2. View firing alerts
3. Acknowledge or resolve
4. Check logs for root cause

---

## Maintenance

### Clean Up Docker

```bash
# Remove unused images
docker image prune -a

# Remove stopped containers
docker container prune

# Clean volumes
docker volume prune

# Full cleanup (⚠️ removes all unused)
docker system prune -a --volumes
```

### Update Certificates

For HTTPS, mount certificates in `docker-compose.prod.yml`:
```yaml
services:
  nginx:
    volumes:
      - /path/to/cert.pem:/etc/nginx/cert.pem
      - /path/to/key.pem:/etc/nginx/key.pem
```

---

## Emergency Procedures

### Complete System Failure

```bash
# 1. Stop all services
docker-compose down

# 2. Check disk space
df -h

# 3. Check Docker status
docker info

# 4. Restart infrastructure first
docker-compose up -d mongodb redis

# 5. Wait 30s, then start services
sleep 30
docker-compose up -d

# 6. Verify
./verify-deployment.sh
```

### Database Corruption

```bash
# 1. Stop service
docker-compose stop <affected-service>

# 2. Backup corrupted data
docker cp <container>:/data/db ~/backups/corrupted/

# 3. Drop and recreate
docker exec -it rtmz-mongodb-1 mongosh --eval "db.dropDatabase()"

# 4. Restore from backup
docker exec -i rtmz-mongodb-1 mongorestore < backup.dump

# 5. Restart service
docker-compose start <affected-service>
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start all | `docker-compose up -d` |
| Stop all | `docker-compose down` |
| Restart | `docker-compose restart <svc>` |
| Logs | `docker-compose logs -f <svc>` |
| Status | `./verify-deployment.sh` |
| Shell | `docker exec -it <container> sh` |