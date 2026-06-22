# Performance Tuning Guide

## Node.js Tuning

### Process Management
```bash
# Use cluster mode
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=4096"
```

### Connection Pooling
```javascript
// MongoDB
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
});

// Redis
const redis = Redis.createCluster({
  defaults: {
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
  },
});
```

## Database Tuning

### MongoDB Indexes
```javascript
// Compound indexes
{ userId: 1, createdAt: -1 }
{ status: 1, createdAt: -1 }

// Covered queries
{ projection: { userId: 1, status: 1 } }
```

### Query Optimization
- Use lean() for read-only
- Limit fields
- Paginate large results
- Avoid $where

## Redis Tuning

### Memory
```redis
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### Persistence
```redis
save 900 1
save 300 10
save 60 10000
```

## Network Tuning

### Timeouts
```javascript
const httpAgent = new http.Agent({
  keepAlive: true,
  timeout: 30000,
});
```

## Monitoring

### Key Metrics
- Response time (P50, P95, P99)
- Error rate
- Throughput (RPS)
- Resource utilization
