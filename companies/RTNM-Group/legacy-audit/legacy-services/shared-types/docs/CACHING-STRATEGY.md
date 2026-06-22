# REZ Ecosystem Caching Strategy

## Cache Tiers

### L1: In-Memory (Node.js)
- Hot data
- User sessions
- Rate limit counters
- TTL: 5-60 seconds

### L2: Redis
- Product catalog
- User profiles
- Category lists
- Session storage
- TTL: 5-60 minutes

### L3: CDN
- Static assets
- Images
- API responses (public)
- TTL: 1-24 hours

## Cache Patterns

### 1. Cache-Aside
```
read(key):
  value = redis.get(key)
  if not value:
    value = db.get(key)
    redis.setex(key, ttl, value)
  return value
```

### 2. Write-Through
```
write(key, value):
  db.set(key, value)
  redis.setex(key, ttl, value)
```

### 3. Cache Invalidation
- TTL-based expiration
- Event-driven invalidation on writes
- Manual flush for admin actions

## Implementation

### Redis Configuration
```
# Pattern: cache:{type}:{id}
cache:user:12345
cache:product:67890
cache:category:electronics

# TTLs
cache:*:session = 24h
cache:product:* = 10m
cache:category:* = 1h
```

### Cache Warming
- Preload hot products on startup
- Scheduled warm-up for trending items
- Background refresh for active users
