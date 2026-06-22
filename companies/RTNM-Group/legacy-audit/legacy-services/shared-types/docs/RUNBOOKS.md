# REZ Ecosystem Operational Runbooks

## Service Health Checks

### Check All Services
```bash
curl https://api.rez.money/health | jq
```

### Check Specific Service
```bash
curl https://rez-auth-service.rez.money/health
curl https://rez-merchant-service.rez.money/health
curl https://rez-wallet-service.rez.money/health
curl https://rez-payment-service.rez.money/health
curl https://rez-order-service.rez.money/health
curl https://rez-notification-service.rez.money/health
```

### Service Endpoints
| Service | URL | Port |
|---------|-----|------|
| REZ Auth | rez-auth-service.rez.money | 4002 |
| REZ Merchant | rez-merchant-service.rez.money | 4005 |
| REZ Wallet | rez-wallet-service.rez.money | 4001 |
| REZ Payment | rez-payment-service.rez.money | 4006 |
| REZ Order | rez-order-service.rez.money | 4004 |
| REZ Catalog | rez-catalog-service.rez.money | 4003 |
| Rendez | rendez.rez.money | 4000 |
| Hotel OTA | hotel-api.rez.money | 3000 |
| NextaBiZ Web | nextabizz.rez.money | 3001 |

---

## Common Issues

### High DLQ Count

**Symptoms:** DLQ monitoring shows >100 failed jobs

**Diagnosis:**
```bash
# Check DLQ stats
curl https://api.rez.money/health/dlq

# Check individual queue
curl https://api.rez.money/internal/dlq/{queue-name}

# List all DLQ queues
curl https://api.rez.money/internal/dlq
```

**Resolution:**
1. Identify error pattern in failed jobs
2. Fix root cause
3. Replay DLQ: `POST /internal/dlq/{queue-name}/replay`

---

### Database Connection Issues

**Symptoms:** Health check shows database as 'down'

**Diagnosis:**
```bash
# Check MongoDB status
docker ps | grep mongo

# Check MongoDB logs
docker logs rez-mongodb-primary

# Verify connection string
cat .env | grep MONGODB
```

**Resolution:**
```bash
# Restart MongoDB container
docker-compose restart mongodb-primary

# For replica set, check all nodes
docker-compose ps mongodb-primary mongodb-secondary-1 mongodb-secondary-2

# Verify replica set status
mongosh --host mongodb://mongodb-primary:27017 --eval "rs.status()"
```

---

### Redis Connection Issues

**Symptoms:** Health check shows Redis as 'down'

**Diagnosis:**
```bash
# Check Redis status
docker ps | grep redis

# Test Redis connection
redis-cli -h redis.rez.money ping

# Check Redis logs
docker logs rez-redis
```

**Resolution:**
```bash
# Restart Redis container
docker-compose restart redis

# Verify password matches across services
grep REDIS_PASSWORD .env
```

---

## Service-Specific Troubleshooting

### Auth Service (rez-auth-service)

**Symptoms:**
- Users unable to login
- JWT token validation failures
- OTP not being sent

**Diagnosis:**
```bash
# Check auth service health
curl https://rez-auth-service.rez.money/health

# Check auth service logs
docker logs rez-auth-service --tail 100

# Test login endpoint
curl -X POST https://rez-auth-service.rez.money/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Resolution:**
```bash
# Restart auth service
docker-compose restart auth-api

# Check JWT secrets match
grep JWT .env

# Verify MongoDB auth database connectivity
mongosh --host mongodb://mongodb:27017/rez_auth_dev --eval "db.runCommand({ping:1})"
```

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| Invalid signature | JWT secret mismatch | Check JWT_SECRET in all services |
| Token expired | Clock skew | Sync system time across all servers |
| User not found | Auth DB connection | Check MongoDB connectivity |

---

### Merchant Service (rez-merchant-service)

**Symptoms:**
- Merchant dashboard not loading
- Menu updates failing
- Order acceptance issues

**Diagnosis:**
```bash
# Check merchant service health
curl https://rez-merchant-service.rez.money/health

# Check merchant service logs
docker logs rez-merchant-service --tail 100

# Test API
curl https://rez-merchant-service.rez.money/api/merchants/ping
```

**Resolution:**
```bash
# Restart merchant service
docker-compose restart merchant-api

# Check catalog service dependency
curl https://rez-catalog-service.rez.money/health
```

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| Catalog sync failed | Catalog service down | Restart catalog service |
| Permission denied | Auth token expired | Re-authenticate merchant |
| Database timeout | High load | Scale up or optimize queries |

---

### Wallet Service (rez-wallet-service)

**Symptoms:**
- Balance not updating
- Transaction failures
- Top-up issues

**Diagnosis:**
```bash
# Check wallet service health
curl https://rez-wallet-service.rez.money/health

# Check wallet service logs
docker logs rez-wallet-service --tail 100

# Check wallet balance endpoint
curl https://rez-wallet-service.rez.money/api/wallet/balance/{userId}
```

**Resolution:**
```bash
# Restart wallet service
docker-compose restart wallet-api

# Check finance service dependency
curl https://rez-finance-service.rez.money/health

# Check MongoDB connectivity
mongosh --host mongodb://mongodb:27017/rez_wallet_dev --eval "db.wallets.countDocuments({})"
```

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| Insufficient balance | Logic error or race condition | Check transaction logs |
| Double spending | Concurrency issue | Add idempotency key |
| Settlement pending | Payment service issue | Check payment service |

---

### Payment Service (rez-payment-service)

**Symptoms:**
- Payment failures
- Webhook not receiving
- Refund issues

**Diagnosis:**
```bash
# Check payment service health
curl https://rez-payment-service.rez.money/health

# Check payment service logs
docker logs rez-payment-service --tail 100

# Check payment status
curl https://rez-payment-service.rez.money/api/payments/{transactionId}
```

**Resolution:**
```bash
# Restart payment service
docker-compose restart payment-api

# Check payment gateway status
curl -I https://payment-gateway.rez.money/health

# Verify webhook endpoint
curl https://rez-payment-service.rez.money/api/webhooks/ping
```

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| Gateway timeout | Payment provider issue | Check provider status |
| Invalid signature | Webhook secret mismatch | Verify webhook secret |
| Duplicate transaction | Retry without idempotency | Add idempotency key |

---

### Order Service (rez-order-service)

**Symptoms:**
- Order creation failures
- Order status stuck
- Notification delays

**Diagnosis:**
```bash
# Check order service health
curl https://rez-order-service.rez.money/health

# Check order service logs
docker logs rez-order-service --tail 100

# Check order status
curl https://rez-order-service.rez.money/api/orders/{orderId}

# Check order queue
curl https://api.rez.money/internal/dlq/orders
```

**Resolution:**
```bash
# Restart order service
docker-compose restart order-api

# Check dependencies
curl https://rez-merchant-service.rez.money/health
curl https://rez-payment-service.rez.money/health
curl https://rez-notification-service.rez.money/health

# Replay stuck orders
curl -X POST https://api.rez.money/internal/dlq/orders/replay
```

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| Merchant offline | Merchant not accepting | Contact merchant |
| Payment timeout | 30-min expiry exceeded | Cancel and refund |
| Kitchen display error | Notification service | Check notification service |

---

### Notification Service (rez-notification-service)

**Symptoms:**
- SMS not sent
- Push notifications failing
- Email delays

**Diagnosis:**
```bash
# Check notification service health
curl https://rez-notification-service.rez.money/health

# Check notification service logs
docker logs rez-notification-service --tail 100

# Check notification queue
curl https://api.rez.money/internal/dlq/notifications
```

**Resolution:**
```bash
# Restart notification service
docker-compose restart notification-api

# Check SMS provider status
curl -I https://sms-provider.rez.money/health

# Check email provider
curl -I https://email-provider.rez.money/health

# Replay failed notifications
curl -X POST https://api.rez.money/internal/dlq/notifications/replay
```

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| SMS delivery failed | Invalid phone | Validate phone format |
| Rate limited | Provider throttling | Implement backoff |
| Template missing | Config error | Check template registry |

---

### Catalog Service (rez-catalog-service)

**Symptoms:**
- Products not appearing
- Search returning no results
- Category errors

**Diagnosis:**
```bash
# Check catalog service health
curl https://rez-catalog-service.rez.money/health

# Check catalog service logs
docker logs rez-catalog-service --tail 100

# Test search
curl https://rez-catalog-service.rez.money/api/search?q=test
```

**Resolution:**
```bash
# Restart catalog service
docker-compose restart catalog-api

# Check search index
curl https://rez-search-service.rez.money/health

# Re-index catalog
curl -X POST https://rez-search-service.rez.money/api/reindex
```

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| Empty search results | Index out of sync | Trigger re-index |
| Product not found | Cache stale | Clear cache |
| Category missing | Data import failed | Re-run import |

---

### Finance Service (rez-finance-service)

**Symptoms:**
- Settlement failures
- Report generation errors
- GST calculation issues

**Diagnosis:**
```bash
# Check finance service health
curl https://rez-finance-service.rez.money/health

# Check finance service logs
docker logs rez-finance-service --tail 100

# Check settlement status
curl https://rez-finance-service.rez.money/api/settlements/{merchantId}
```

**Resolution:**
```bash
# Restart finance service
docker-compose restart finance-api

# Check day-end closure status
curl https://rez-finance-service.rez.money/api/reports/closure-status

# Verify GST API connectivity
curl -I https://gst-api.rez.money/health
```

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| Settlement pending | Bank API down | Check bank status |
| GST mismatch | Calculation error | Audit transactions |
| Report timeout | Large dataset | Increase timeout |

---

### Scheduler Service (rez-scheduler-service)

**Symptoms:**
- Cron jobs not running
- Scheduled tasks delayed
- Missed notifications

**Diagnosis:**
```bash
# Check scheduler service health
curl https://rez-scheduler-service.rez.money/health

# Check scheduler service logs
docker logs rez-scheduler-service --tail 100

# List running jobs
curl https://rez-scheduler-service.rez.money/api/jobs
```

**Resolution:**
```bash
# Restart scheduler service
docker-compose restart scheduler-api

# Check job queue
curl https://api.rez.money/internal/dlq/scheduler

# Manually trigger job
curl -X POST https://rez-scheduler-service.rez.money/api/jobs/{jobId}/run
```

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| Job skipped | Previous job running | Check job lock |
| Missed execution | Service restart | Implement catch-up |
| Timeout | Job takes too long | Optimize or split job |

---

## Infrastructure Troubleshooting

### MongoDB Replica Set Issues

**Diagnosis:**
```bash
# Check replica set status
mongosh --host mongodb://mongodb-primary:27017 --eval "rs.status()"

# Check primary
mongosh --host mongodb://mongodb-primary:27017 --eval "db.runCommand({isMaster:1})"

# Check secondary lag
mongosh --host mongodb://mongodb-primary:27017 --eval "rs.printSecondaryReplicationInfo()"
```

**Resolution:**
```bash
# Force re-election (if primary down)
mongosh --host mongodb://mongodb-secondary-1:27017 --eval "rs.freeze(0); rs.stepDown()"

# Re-sync secondary
mongosh --host mongodb://mongodb-secondary-1:27017 --eval "db.adminCommand({resync: 1})"
```

---

### Docker Container Issues

**Diagnosis:**
```bash
# List all containers
docker ps -a

# Check container logs
docker logs {container-name} --tail 100

# Check resource usage
docker stats --no-stream
```

**Resolution:**
```bash
# Restart single container
docker-compose restart {service-name}

# Rebuild and restart
docker-compose up -d --build {service-name}

# Full restart
docker-compose down && docker-compose up -d
```

---

### Network Connectivity Issues

**Diagnosis:**
```bash
# Test service connectivity
curl -v https://rez-auth-service.rez.money/health

# Check DNS resolution
nslookup rez-auth-service.rez.money

# Test internal network
docker exec -it rez-auth-service ping rez-mongodb-primary
```

**Resolution:**
```bash
# Recreate network
docker network rm rez-network
docker-compose down
docker-compose up -d

# Check firewall rules
iptables -L -n | grep rez
```

---

## Emergency Procedures

### Complete Service Restart
```bash
# Stop all services
docker-compose down

# Clear all volumes (WARNING: Data loss)
docker-compose down -v

# Start infrastructure first
docker-compose up -d mongodb-primary mongodb-secondary-1 mongodb-secondary-2 redis postgres

# Wait for health
sleep 30

# Start all services
docker-compose up -d
```

### Rollback to Previous Version
```bash
# List previous images
docker images | grep rez-

# Rollback specific service
docker-compose stop rez-auth-service
docker tag rez-auth-service:previous rez-auth-service:latest
docker-compose start rez-auth-service
```

### Database Backup and Restore
```bash
# Backup
docker exec rez-mongodb-primary mongodump --out=/data/backup

# Restore
docker exec rez-mongodb-primary mongorestore /data/backup
```

---

## Monitoring and Alerts

### Key Metrics to Monitor
- **Error Rate**: Should be < 1%
- **Response Time**: P95 < 500ms
- **DLQ Count**: Should be < 10
- **CPU Usage**: Should be < 70%
- **Memory Usage**: Should be < 80%
- **Disk Usage**: Should be < 85%

### Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 0.5% | > 1% |
| Response Time P99 | > 1s | > 2s |
| DLQ Count | > 50 | > 100 |
| Service Down | - | Any critical service |
| Disk Usage | > 75% | > 85% |

---

## Contact Information

### On-Call Escalation
1. **Primary**: DevOps Team - devops@rez.money
2. **Secondary**: Engineering Lead - eng-lead@rez.money
3. **Escalation**: CTO - cto@rez.money

### External Dependencies
- **MongoDB Support**: support@mongodb.com
- **Redis Support**: support@redis.io
- **Payment Gateway**: support@gateway.com
- **SMS Provider**: support@sms-provider.com
