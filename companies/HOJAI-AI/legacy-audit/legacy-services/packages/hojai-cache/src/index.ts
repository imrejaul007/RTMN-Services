/**
 * HOJAI Cache Package
 * Redis and in-memory caching utilities
 */

export { RedisCache } from './redis.js';
export { MemoryCache } from './memory-cache.js';
export { CacheManager } from './cache-manager.js';


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-cache',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
