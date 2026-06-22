# LawGens Troubleshooting Guide

**Version:** 2.0.0 | **Date:** June 7, 2026

---

## Common Issues

### 1. Service Won't Start

**Symptom:** Service crashes on startup

**Solutions:**
```bash
# Check if port is in use
lsof -i :5099

# Kill process using port
kill -9 <PID>

# Check logs
docker-compose logs gateway
cat services/lawgens-gateway/logs/error.log
```

### 2. Database Connection Failed

**Symptom:** `MongoNetworkError` or `ECONNREFUSED`

**Solutions:**
```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Restart MongoDB
docker-compose restart mongodb

# Check connection string
# Should be: mongodb://mongodb:27017/lawgens
```

### 3. REZ Integration Not Working

**Symptom:** Webhook errors, connection timeouts

**Solutions:**
```bash
# Check service health
curl http://localhost:5098/health/detailed

# Verify environment variables
echo $RABTUL_AUTH_URL
echo $HOJAI_BRAIN_URL

# Test direct connection
curl http://localhost:4000/health
curl http://localhost:4540/health

# Check integration logs
docker-compose logs integration
```

### 4. Payment Processing Failed

**Symptom:** Payment stuck in pending state

**Solutions:**
1. Verify RABTUL Payment service is running
2. Check API keys are configured correctly
3. Review webhook logs
4. Manually trigger retry:
```bash
curl -X POST http://localhost:5098/api/rabtul/payment/process \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","plan":"starter","amount":999}'
```

### 5. Memory Not Storing

**Symptom:** HOJAI memory operations fail

**Solutions:**
```bash
# Check HOJAI Memory service
curl http://localhost:4540/health

# Verify connection
curl -X POST http://localhost:5098/api/hojai/memory/store \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","content":"test memory","type":"test"}'
```

### 6. AI Queries Not Working

**Symptom:** Legal brain returns errors

**Solutions:**
```bash
# Check API key
echo $ANTHROPIC_API_KEY

# Test AI directly
curl -X POST http://localhost:5100/api/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is a contract?"}'

# Check rate limits
docker-compose logs legal-brain | grep "rate limit"
```

---

## Debug Mode

Enable debug logging:

```bash
# Set debug mode
export DEBUG=lawgens:*

# Or in .env
DEBUG=lawgens:*

# Restart service
docker-compose restart integration
```

View debug logs:
```bash
docker-compose logs -f integration 2>&1 | grep DEBUG
```

---

## Health Check Commands

```bash
# Integration service
curl http://localhost:5098/health
curl http://localhost:5098/health/detailed

# Individual services
curl http://localhost:5099/health  # Gateway
curl http://localhost:5100/health  # Legal Brain
curl http://localhost:5101/health  # Contract

# External services
curl http://localhost:4000/health  # RABTUL Auth
curl http://localhost:4540/health  # HOJAI Memory
curl http://localhost:4100/health  # REZ Mind
```

---

## Reset Procedures

### Reset Integration Service

```bash
# Stop service
docker-compose stop integration

# Clear cache
docker-compose exec redis FLUSHALL

# Restart
docker-compose start integration
```

### Reset Database

```bash
# Backup first
docker-compose exec mongodb mongodump --out=/backup

# Drop database
docker-compose exec mongodb mongosh --eval "db.dropDatabase()"

# Restart (will recreate)
docker-compose restart mongodb
```

### Full Reset

```bash
# Stop everything
docker-compose down

# Remove volumes
docker-compose down -v

# Clear caches
rm -rf services/*/node_modules
rm -rf services/*/dist

# Rebuild
docker-compose build --no-cache

# Start fresh
docker-compose up -d
```

---

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `ECONNREFUSED` | Service unavailable | Check service is running |
| `ENOTFOUND` | Host not found | Verify URL in .env |
| `ECONNRESET` | Connection reset | Retry request |
| `ETIMEDOUT` | Connection timeout | Check network/firewall |
| `401` | Unauthorized | Check JWT token |
| `403` | Forbidden | Check permissions |
| `429` | Rate limited | Wait and retry |
| `500` | Server error | Check logs |

---

## Performance Issues

### Slow Response Times

1. Check database indexes:
```bash
docker-compose exec mongodb mongosh --eval "db.contracts.getIndexes()"
```

2. Enable Redis caching:
```bash
export REDIS_URL=redis://redis:6379
```

3. Scale services:
```bash
docker-compose up -d --scale gateway=3
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Clear Redis cache
docker-compose exec redis FLUSHALL

# Restart services
docker-compose restart
```

---

## Getting Help

If you're still stuck:

1. Check logs: `docker-compose logs > debug.log`
2. Enable debug mode
3. Contact: support@lawgens.app

Include in your report:
- Error message
- Steps to reproduce
- Logs (attach debug.log)
- Environment (OS, Docker version)