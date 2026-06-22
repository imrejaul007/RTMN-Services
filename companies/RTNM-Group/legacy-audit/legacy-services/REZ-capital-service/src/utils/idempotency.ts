import Redis from 'ioredis';
import logger from '../utils/logger';

/**
 * Idempotency key helper to prevent duplicate operations
 * Uses Redis to track processed idempotency keys
 */
export class IdempotencyHelper {
  private redis: Redis;
  private ttlSeconds: number;

  constructor(redisUrl?: string, ttlSeconds: number = 86400) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.ttlSeconds = ttlSeconds;
  }

  /**
   * Check if an idempotency key has been processed
   * Returns the cached result if key exists
   */
  async check(key: string): Promise<{ exists: boolean; result?: unknown }> {
    try {
      const cached = await this.redis.get(`idempotency:${key}`);
      if (cached) {
        return { exists: true, result: JSON.parse(cached) };
      }
      return { exists: false };
    } catch (error) {
      logger.error('Idempotency check failed:', error);
      // Fail open - allow the operation to proceed if Redis is unavailable
      return { exists: false };
    }
  }

  /**
   * Store the result of an idempotency key
   */
  async store(key: string, result: unknown): Promise<void> {
    try {
      await this.redis.setex(
        `idempotency:${key}`,
        this.ttlSeconds,
        JSON.stringify(result)
      );
    } catch (error) {
      logger.error('Idempotency store failed:', error);
    }
  }

  /**
   * Execute a function with idempotency protection
   * If the key exists, returns the cached result
   * Otherwise, executes the function and caches the result
   */
  async withIdempotency<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; cached: boolean }> {
    // Check if key exists
    const { exists, result: cachedResult } = await this.check(key);

    if (exists && cachedResult !== undefined) {
      logger.info('Idempotency key hit', { key });
      return { result: cachedResult as T, cached: true };
    }

    // Execute the function
    const result = await fn();

    // Store the result
    await this.store(key, result);

    return { result, cached: false };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
let idempotencyHelper: IdempotencyHelper | null = null;

export function getIdempotencyHelper(): IdempotencyHelper {
  if (!idempotencyHelper) {
    idempotencyHelper = new IdempotencyHelper();
  }
  return idempotencyHelper;
}
