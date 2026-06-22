/**
 * Cache Middleware
 */
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Cache middleware for GET requests
 */
export async function cacheMiddleware(req, res, next) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }
  
  const cacheKey = `cache:${req.originalUrl}`;
  
  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      return res.json({
        ...data,
        cached: true,
        cachedAt: data.cachedAt
      });
    }
    
    // Store original json function
    const originalJson = res.json.bind(res);
    
    // Override json to cache response
    res.json = function(body) {
      // Cache for 5 minutes by default
      const ttl = parseInt(req.query.cacheTTL) || 300;
      
      redis.setex(cacheKey, ttl, JSON.stringify({
        ...body,
        cachedAt: new Date().toISOString()
      })).catch(err => {
        console.error('Cache write error:', err);
      });
      
      return originalJson(body);
    };
    
    next();
  } catch (error) {
    // If cache fails, continue without caching
    console.error('Cache error:', error);
    next();
  }
}

/**
 * Invalidate cache for specific pattern
 */
export async function invalidateCache(pattern) {
  try {
    const keys = await redis.keys(`cache:${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return 0;
  }
}

/**
 * Clear all cache
 */
export async function clearCache() {
  try {
    const keys = await redis.keys('cache:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.error('Cache clear error:', error);
    return 0;
  }
}

export { redis };
export default cacheMiddleware;
