# Redis Sentinel High Availability - Production Deployment Guide

**Document Version:** 1.0
**Date:** 2026-04-30

---

## Overview

This guide covers deploying Redis Sentinel for high availability in production.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Applications                              │
│   rez-auth-service  │  rez-merchant-service  │  rendez       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Redis Sentinel Cluster                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Sentinel 1  │  │  Sentinel 2  │  │  Sentinel 3  │         │
│  │  (Port 26379)│  │  (Port 26380)│  │  (Port 26381)│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Redis Replicas                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Primary    │◄─│   Replica 1  │◄─│   Replica 2  │         │
│  │  (Port 6379) │  │  (Port 6380) │  │  (Port 6381) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Options

### Option 1: Managed Redis (Recommended for Production)

#### Redis Cloud (by Redis)

1. Create account at https://redis.com
2. Create database with:
   - Multi-AZ replication: Enabled
   - Active-Active Geo-Replication: Optional
   - TLS: Enabled
   - Authentication: Enabled

3. Get connection string:
   ```
   redis://default:password@redis-12345.us-east-1.cloud.rlrcp.com:12345
   ```

4. Update environment variables:
   ```bash
   REDIS_URL=redis://default:password@redis-12345.us-east-1.cloud.rlrcp.com:12345
   ```

#### Render Managed Redis

1. Add Redis instance in Render dashboard
2. Select plan with replication
3. Get connection string from environment

### Option 2: Self-Hosted Sentinel

#### Docker Compose (Development)

```bash
docker compose -f docker-compose.redis-sentinel.yml up -d
```

#### Kubernetes Deployment

```yaml
# redis-sentinel.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-primary
spec:
  serviceName: redis-primary
  replicas: 1
  selector:
    matchLabels:
      app: redis-primary
  template:
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          args: ["redis-server", "--requirepass", "REDIS_PASSWORD"]
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-replica
spec:
  serviceName: redis-replica
  replicas: 2
  selector:
    matchLabels:
      app: redis-replica
  template:
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          args:
            - redis-server
            - --replicaof
            - redis-primary.default.svc.cluster.local
            - 6379
            - --requirepass
            - REDIS_PASSWORD
            - --masterauth
            - REDIS_PASSWORD
```

## Configuration

### Application Connection

Update your application to use Sentinel-aware client:

```typescript
// Using ioredis with Sentinel support
import Redis from 'ioredis';

const redis = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26380 },
    { host: 'sentinel-3', port: 26381 },
  ],
  name: 'mymaster',
  password: 'REDIS_PASSWORD',
  sentinelPassword: 'SENTINEL_PASSWORD',
  maxRetriesPerRequest: null, // Required for Socket.io
});
```

### Environment Variables

```bash
# Sentinel Configuration
SENTINEL_HOSTS=redis-sentinel-1:26379,redis-sentinel-2:26380,redis-sentinel-3:26381
SENTINEL_MASTER=mymaster
REDIS_PASSWORD=your-secure-password
SENTINEL_PASSWORD=your-sentinel-password

# Alternative: Direct connection to primary (with failover detection)
REDIS_URL=redis://:REDIS_PASSWORD@redis-primary:6379
```

## Health Checks

### Sentinel Health

```bash
# Check Sentinel status
redis-cli -p 26379 SENTINEL masters
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

### Application Health

```typescript
// Health check for application
app.get('/health', async (req, res) => {
  try {
    const pong = await redis.ping();
    res.json({
      status: 'ok',
      redis: 'connected',
      sentinel: await checkSentinelHealth()
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      redis: 'disconnected'
    });
  }
});
```

## Failover Testing

### Manual Failover

```bash
# Trigger failover to replica
redis-cli -p 26379 SENTINEL failover mymaster

# Verify new primary
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

### Automated Tests

```typescript
describe('Redis HA', () => {
  it('should reconnect after primary failover', async () => {
    // 1. Get current primary
    const before = await getCurrentPrimary();

    // 2. Stop current primary
    await stopRedis(before);

    // 3. Wait for failover (max 30s)
    await waitForFailover();

    // 4. Verify new primary
    const after = await getCurrentPrimary();
    expect(after).not.toBe(before);

    // 5. Verify application still works
    await redis.set('test', 'value');
    expect(await redis.get('test')).toBe('value');
  });
});
```

## Monitoring

### Key Metrics

| Metric | Alert Threshold |
|--------|---------------|
| Sentinel connectivity | < 3 sentinels |
| Replica lag | > 5 seconds |
| Memory usage | > 80% |
| Failed commands | > 10/minute |

### Prometheus Alerts

```yaml
- alert: RedisSentinelDown
  expr: up{job="redis-sentinel"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Redis Sentinel is down"

- alert: RedisReplicaLag
  expr: redis_replication_lag_seconds > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Redis replica lag is high"
```

## Rollback Procedure

If Sentinel deployment fails:

1. **Revert to direct connection:**
   ```bash
   # Set REDIS_URL to direct primary
   REDIS_URL=redis://:OLD_PASSWORD@redis-old-primary:6379
   ```

2. **Restore from replica:**
   ```bash
   # Promote replica to primary
   redis-cli -p 6380 replicaof no one
   redis-cli -p 6380 CONFIG SET requirepass NEW_PASSWORD
   ```

3. **Verify application:**
   ```bash
   # Check application logs for errors
   # Verify data integrity
   ```

## Cost Estimates

### Managed Services

| Provider | Plan | Cost/Month |
|---------|------|-----------|
| Redis Cloud | 30MB Starter | Free |
| Redis Cloud | 1GB Essentials | $30 |
| Render | Starter | $5 |
| Render | Starter + HA | $15 |

### Self-Hosted (3x VMs)

| Resource | Spec | Cost/Month |
|----------|------|-----------|
| 3x VMs (2GB) | 3x t3.small | ~$60 |
| Storage | 50GB | $5 |
| Backup | 20GB | $2 |
| **Total** | | ~$67 |

---

## Related Documentation

- `docker-compose.redis-sentinel.yml` - Local development setup
- `sentinel.conf` - Sentinel configuration
- `src/config/redisSentinel.ts` - Application client
