# @rez/redis - Production-Ready Redis Client

> Comprehensive Redis client with circuit breakers, rate limiting, distributed locks, caching, and session management for RTNM services.

## Features

- **Connection Pooling** - Automatic reconnection with exponential backoff
- **Rate Limiting** - Fixed window and sliding window algorithms
- **Circuit Breaker** - Fault tolerance for external service calls
- **Distributed Locks** - Safe lock acquisition with TTL and ownership
- **Caching** - Get/set/delete with automatic serialization
- **Sessions** - Create, get, update, and delete sessions
- **Pub/Sub** - Publisher and subscriber utilities
- **Idempotency Keys** - Prevent duplicate operations
- **Health Checks** - Connection health monitoring

## Installation

```bash
npm install @rez/redis
```

## Quick Start

```typescript
import { createRedisClient, getClient, closeClient } from '@rez/redis';

// Create client
const redis = createRedisClient({
  host: process.env.REDIS_HOST!,
  port: 6379,
  password: process.env.REDIS_PASSWORD
});

// Use directly
await redis.set('key', 'value', 'EX', 3600);
const value = await redis.get('key');

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await closeClient();
  process.exit(0);
});
```

## Rate Limiting

### Fixed Window (Default)

```typescript
import { createRateLimiter } from '@rez/redis';

const limiter = createRateLimiter({
  windowMs: 60000,    // 1 minute
  max: 100,           // 100 requests per minute
  keyPrefix: 'rl:',    // Custom prefix
  message: 'Too many requests'
});

app.use('/api', limiter);
```

### Sliding Window (More Accurate)

```typescript
const slidingLimiter = createRateLimiter({
  windowMs: 60000,
  max: 100,
  slidingWindow: true  // Use sliding window algorithm
});

app.use('/api', slidingLimiter);
```

### Response Headers

All rate limited responses include:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining in window
- `X-RateLimit-Reset` - Unix timestamp when limit resets
- `Retry-After` - Seconds until retry (only on 429)

## Circuit Breaker

Protect your services from cascading failures.

```typescript
import { CircuitBreaker } from '@rez/redis';

const breaker = new CircuitBreaker({
  threshold: 5,           // Open after 5 failures
  resetTimeout: 30000,     // Try again after 30 seconds
  successThreshold: 3,     // Close after 3 successes from half-open
  onOpen: () => console.log('Circuit opened!'),
  onClose: () => console.log('Circuit closed!')
});

// Wrap your external calls
const result = await breaker.execute(async () => {
  return await fetch('https://external-api.com/data');
});
```

### Circuit States

| State | Behavior | Requests |
|-------|----------|----------|
| `closed` | Normal operation | Pass through |
| `open` | Failing fast | Fail immediately |
| `half-open` | Testing recovery | Limited pass through |

### Circuit Stats

```typescript
const stats = breaker.getStats();
console.log(stats);
// {
//   state: 'closed',
//   failures: 0,
//   successes: 5,
//   lastFailure: 1699999999999,
//   uptime: 3600000
// }
```

## Distributed Locks

Safely coordinate access to shared resources.

### Basic Usage

```typescript
import { acquireLock, releaseLock, withLock } from '@rez/redis';

// Manual lock
const locked = await acquireLock('payment:123', 30000);
if (locked) {
  try {
    // Critical section
    await processPayment();
  } finally {
    await releaseLock('payment:123');
  }
}

// Automatic lock/unlock
const result = await withLock('payment:123', async () => {
  return await processPayment();
});
```

### Options

```typescript
await withLock('resource', async () => {
  // Work
}, {
  ttlMs: 60000,         // Lock TTL (default: 30000)
  retryCount: 5,        // Retry attempts (default: 3)
  retryDelayMs: 100     // Delay between retries (default: 100)
});
```

## Caching

### Basic Cache Operations

```typescript
import { cacheGet, cacheSet, cacheDel, cacheGetOrSet } from '@rez/redis';

// Set with TTL (default: 3600 seconds)
await cacheSet('user:123', { name: 'John', email: 'john@example.com' }, { ttl: 1800 });

// Get from cache
const user = await cacheGet('user:123');
// Returns: { name: 'John', email: 'john@example.com' } or null

// Delete from cache
await cacheDel('user:123');

// Cache-aside pattern (get or set)
const data = await cacheGetOrSet('api:data', async () => {
  return await fetchFromDatabase();
}, { ttl: 300, prefix: 'api' });
```

### Cache Options

```typescript
await cacheSet('key', value, {
  ttl: 3600,              // TTL in seconds (default: 3600)
  prefix: 'cache',        // Key prefix (default: 'cache')
  compressThreshold: 1024 // Compress values larger than this
});
```

## Session Management

### Create Session

```typescript
import { createSession, getSession, touchSession, deleteSession } from '@rez/redis';

const sessionId = await createSession('user123', 86400, {
  plan: 'premium',
  features: ['api', 'reports']
});

// Session ID: "1689000000000:abc123xyz"
```

### Get Session

```typescript
const session = await getSession(sessionId);
// {
//   userId: 'user123',
//   createdAt: 1689000000000,
//   lastActiveAt: 1689000000000,
//   metadata: { plan: 'premium', features: ['api', 'reports'] }
// }
```

### Update Session Activity

```typescript
// Keep session alive (touch)
await touchSession(sessionId, 86400);
```

### Delete Session (Logout)

```typescript
await deleteSession(sessionId);
```

## Idempotency Keys

Prevent duplicate operations (payments, etc.).

```typescript
import { setIdempotencyKey, getIdempotencyKey } from '@rez/redis';

async function processPayment(paymentId: string, idempotencyKey: string) {
  // Check if already processed
  const exists = await getIdempotencyKey(idempotencyKey);
  if (exists) {
    return { status: 'already_processed' };
  }

  // Try to set key (first one wins)
  const isFirst = await setIdempotencyKey(idempotencyKey, 86400);
  if (!isFirst) {
    return { status: 'already_processed' };
  }

  // Process payment
  await doPayment(paymentId);
  return { status: 'success' };
}
```

## Pub/Sub

### Publisher

```typescript
import { createRedisClient, publish } from '@rez/redis';

const redis = createRedisClient(config);

// Publish message
await publish('notifications', { type: 'alert', message: 'System low on memory' });
await publish('user:123:events', { action: 'login', timestamp: Date.now() });
```

### Subscriber

```typescript
import { createSubscriber } from '@rez/redis';

const subscriber = createSubscriber(config);
await subscriber.connect();

subscriber.subscribe('notifications', (message) => {
  console.log('Received:', message);
});

subscriber.on('message', (channel, message) => {
  console.log(`[${channel}]:`, message);
});
```

## Health Checks

```typescript
import { checkHealth, getConnectionInfo, isConnected } from '@rez/redis';

app.get('/health', async (req, res) => {
  const health = await checkHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Check connection info
const info = getConnectionInfo();
console.log(info);
// { status: 'ready', uptime: 3600000, db: 0 }
```

## Express Middleware Examples

### Rate Limiting with Auth

```typescript
import { createRateLimiter } from '@rez/redis';
import { authMiddleware } from '@rez/security';

const rateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 10  // Stricter for auth endpoints
});

app.post('/api/auth/login',
  rateLimiter,
  validate(schemas.auth.login),
  async (req, res) => {
    // Login logic
  }
);
```

### Request Caching

```typescript
import { cacheGet, cacheSet } from '@rez/redis';

app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;

  // Try cache first
  const cached = await cacheGet(`user:${id}`);
  if (cached) {
    return res.json({ data: cached, cached: true });
  }

  // Fetch from database
  const user = await db.users.findById(id);
  await cacheSet(`user:${id}`, user, { ttl: 300 });

  res.json({ data: user, cached: false });
});
```

## Configuration

```typescript
createRedisClient({
  host: 'localhost',
  port: 6379,
  password: 'secret',
  db: 0,                      // Database number (0-15)
  maxRetriesPerRequest: 3,    // Max retries per command
  enableReadyCheck: true,     // Check connection on connect
  connectTimeout: 10000,      // Connection timeout (ms)
  enableAutoPipelining: true, // Enable command pipelining
  pipelineChunkSize: 100,     // Commands per pipeline chunk
  retryStrategy: (times) => { // Custom retry strategy
    return Math.min(times * 100, 30000);
  }
});
```

## Key Patterns

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `session:{id}` | User sessions | 24h |
| `ratelimit:{ip}` | Rate limiting | 1h |
| `lock:{resource}` | Distributed locks | 30s |
| `cache:{key}` | Generic cache | 1h |
| `idempotency:{key}` | Idempotent ops | 24h |
| `lock:{key}:value` | Lock ownership | 30s |

## Error Handling

```typescript
try {
  const result = await breaker.execute(async () => {
    return await externalService();
  });
} catch (error) {
  if (error.message === 'Circuit breaker is open') {
    // Service unavailable
    res.status(503).json({ error: 'Service temporarily unavailable' });
  } else {
    // Other errors
    throw error;
  }
}
```

## License

Proprietary - RTNM Digital