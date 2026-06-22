# RTMZ Troubleshooting Guide

Common issues and solutions.

## Auth Issues

### "Invalid Token" Errors

**Cause**: Token expired or invalid.

**Solution**:
1. Check token expiration (JWT tokens expire in 1 hour by default)
2. Refresh token using `/api/v1/auth/refresh`
3. Re-login if refresh token also expired

### "Service Unavailable" on Auth

**Cause**: REZ Auth service down or misconfigured.

**Solution**:
```bash
# Check auth health
curl http://localhost:4002/health

# Check logs
docker-compose logs rez-auth

# Restart if needed
docker-compose restart rez-auth
```

### Internal Service Token Errors

**Cause**: Mismatched internal tokens between services.

**Solution**:
1. Verify `INTERNAL_SERVICE_TOKENS_JSON` matches in all services
2. Restart affected services after updating tokens

---

## Database Issues

### MongoDB Connection Refused

**Cause**: MongoDB not running or wrong URI.

**Solution**:
```bash
# Check MongoDB
docker ps | grep mongodb

# Restart MongoDB
docker-compose restart mongodb

# Wait 10s, then check
sleep 10 && curl http://localhost:4002/health
```

### Redis Connection Issues

**Cause**: Redis down or wrong URL.

**Solution**:
```bash
# Test Redis
docker exec -it rtmz-redis-1 redis-cli ping

# Should return: PONG
```

---

## API Issues

### GraphQL Errors

**Cause**: Schema mismatch or service down.

**Solution**:
```bash
# Check GraphQL health
curl http://localhost:5000/health

# Check specific service
curl http://localhost:5001/health
```

### CORS Errors

**Cause**: Origin not in allowed list.

**Solution**:
1. Add origin to `CORS_ORIGIN` env var
2. Restart affected service

---

## Docker Issues

### "Port Already Allocated"

**Cause**: Another service using same port.

**Solution**:
```bash
# Find process using port
lsof -i :4002

# Kill or change port in docker-compose
```

### Out of Memory

**Cause**: Too many containers or large images.

**Solution**:
```bash
# Check Docker usage
docker system df

# Clean up
docker system prune -a
```

---

## Build Issues

### "npm ERR" During Build

**Cause**: Missing dependencies or wrong Node version.

**Solution**:
```bash
# Check Node version in Dockerfile
# Should be: FROM node:20-alpine

# Rebuild without cache
docker-compose build --no-cache <service>
```

### TypeScript Errors

**Cause**: Type definitions missing.

**Solution**:
```bash
# In service directory
npm install
npm run build
```

---

## Network Issues

### Service Can't Reach Another

**Cause**: Not on same Docker network.

**Solution**:
```yaml
# Ensure both services have same network in docker-compose
networks:
  - rtmz-monitoring
```

### DNS Resolution Failed

**Cause**: Service name misspelled.

**Solution**:
Check service name matches exactly:
- `rez-auth:4002` (not `rez-auth-service:4002`)

---

## Performance Issues

### Slow Response Times

**Cause**: Resource limits or overloaded.

**Solution**:
```bash
# Check resource usage
docker stats

# Scale up if needed
docker-compose up -d --scale <service>=2
```

### High Memory Usage

**Cause**: Memory leak or too many connections.

**Solution**:
```bash
# Restart affected service
docker-compose restart <service>

# Or add memory limits in docker-compose
```

---

## Getting Help

1. Check logs: `docker-compose logs -f <service>`
2. Run verification: `./verify-deployment.sh`
3. Review [OPERATIONS.md](./OPERATIONS.md)
4. Check Docker status: `docker ps -a`