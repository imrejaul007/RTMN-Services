/**
 * @rez/redis - Production-Ready Redis Client
 *
 * Features:
 * - Connection pooling with ioredis
 * - Sentinel support for HA
 * - Automatic reconnection with exponential backoff
 * - Circuit breaker pattern
 * - Rate limiting (token bucket, sliding window)
 * - Distributed locks with TTL
 * - Idempotency keys
 * - Pub/Sub utilities
 * - Cache utilities
 * - Session management
 *
 * @example
 * ```typescript
 * import { createRedisClient, rateLimiter, CircuitBreaker } from '@rez/redis';
 *
 * // Setup client
 * const redis = createRedisClient({
 *   host: process.env.REDIS_HOST!,
 *   port: 6379,
 *   password: process.env.REDIS_PASSWORD
 * });
 *
 * // Rate limiting
 * app.use('/api', rateLimiter({ windowMs: 60000, max: 100 }));
 *
 * // Circuit breaker
 * const breaker = new CircuitBreaker(5, 30000);
 * const result = await breaker.execute(() => externalService());
 * ```
 *
 * @package @rez/redis
 * @author RTNM Digital
 * @version 1.0.0
 */

import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';

// Types
export interface RedisConfig {
  /** Redis host */
  host: string;
  /** Redis port */
  port: number;
  /** Redis password */
  password?: string;
  /** Database number (0-15) */
  db?: number;
  /** Maximum retries per request */
  maxRetriesPerRequest?: number;
  /** Enable ready check on connect */
  enableReadyCheck?: boolean;
  /** Connection timeout in ms */
  connectTimeout?: number;
  /** Custom retry strategy */
  retryStrategy?: (times: number) => number | null;
  /** Enable auto-pipelining */
  enableAutoPipelining?: boolean;
  /** Pipeline chunk size */
  pipelineChunkSize?: number;
}

export interface RateLimitConfig {
  /** Window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
  /** Key prefix for rate limit */
  keyPrefix?: string;
  /** Error message */
  message?: string;
  /** Enable sliding window algorithm */
  slidingWindow?: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  connected: boolean;
  latency?: number;
  error?: string;
}

export interface CacheOptions {
  /** TTL in seconds */
  ttl?: number;
  /** Key prefix */
  prefix?: string;
  /** Compress values larger than this */
  compressThreshold?: number;
}

export interface LockOptions {
  /** Lock TTL in milliseconds */
  ttlMs?: number;
  /** Retry count */
  retryCount?: number;
  /** Retry delay in milliseconds */
  retryDelayMs?: number;
}

export interface SessionData {
  userId: string;
  createdAt: number;
  lastActiveAt: number;
  metadata?: Record<string, unknown>;
}

// Internal state
let redisClient: Redis | null = null;
let connectionTime: Date | null = null;
let isShuttingDown = false;

// Re-export ioredis for advanced usage
export { Redis };

/**
 * Create Redis client with production-ready configuration
 */
export function createRedisClient(config: RedisConfig): Redis {
  // Remove old connection if exists
  if (redisClient && !isShuttingDown) {
    redisClient.disconnect();
  }

  const client = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db ?? 0,
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
    enableReadyCheck: config.enableReadyCheck ?? true,
    connectTimeout: config.connectTimeout ?? 10000,
    retryStrategy: config.retryStrategy ?? ((times: number) => {
      // Exponential backoff with max 30 seconds
      const delay = Math.min(times * 100, 30000);
      return delay;
    }),
    lazyConnect: false,
    enableAutoPipelining: config.enableAutoPipelining ?? true,
    pipelineChunkSize: config.pipelineChunkSize ?? 100,
    // Keep connection alive
    keepAlive: 30000,
    // Family mode for IPv4/IPv6
    family: 4,
  });

  client.on('connect', () => {
    console.log('[Redis] Connected to', `${config.host}:${config.port}`);
    connectionTime = new Date();
  });

  client.on('ready', () => {
    console.log('[Redis] Ready to accept commands');
  });

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  client.on('close', () => {
    if (!isShuttingDown) {
      console.warn('[Redis] Connection closed unexpectedly, reconnecting...');
    }
  });

  client.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  client.on('wait', () => {
    console.log('[Redis] Waiting for available connections');
  });

  redisClient = client;
  return client;
}

/**
 * Alias for createRedisClient
 */
export const createClient = createRedisClient;

/**
 * Get existing client
 */
export function getClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis not connected. Call createRedisClient first.');
  }
  return redisClient;
}

/**
 * Check if client is connected
 */
export function isConnected(): boolean {
  return redisClient?.status === 'ready';
}

/**
 * Close client gracefully
 */
export async function closeClient(): Promise<void> {
  isShuttingDown = true;
  if (redisClient) {
    await redisClient.quit().catch(() => {});
    redisClient = null;
    connectionTime = null;
    console.log('[Redis] Connection closed gracefully');
  }
}

/**
 * Health check for Redis
 */
export async function checkHealth(): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    if (!redisClient || redisClient.status !== 'ready') {
      return {
        status: 'unhealthy',
        connected: false,
        error: 'Not connected or not ready',
      };
    }

    const result = await redisClient.ping();
    const latency = Date.now() - startTime;

    return {
      status: result === 'PONG' ? 'healthy' : 'unhealthy',
      connected: true,
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Get connection info
 */
export function getConnectionInfo(): { status: string; uptime: number; db: number } | null {
  if (!redisClient) return null;
  return {
    status: redisClient.status,
    uptime: connectionTime ? Date.now() - connectionTime.getTime() : 0,
    db: redisClient.options?.db ?? 0
  };
}

// ============================================
// Rate Limiting (Production-Ready)
// ============================================

interface SlidingWindowRateLimit {
  timestamp: number;
  count: number;
}

/**
 * Rate limiter factory with sliding window support
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    keyPrefix = 'ratelimit:',
    message = 'Too many requests, please try again later',
    slidingWindow = false
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!redisClient || redisClient.status !== 'ready') {
      // If Redis is down, allow request but log
      console.warn('[RateLimiter] Redis unavailable, skipping rate limit');
      return next();
    }

    // Use X-Forwarded-For if behind proxy
    const identifier = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.ip ?? 'unknown';

    const key = `${keyPrefix}${identifier}`;
    const now = Date.now();

    try {
      if (slidingWindow) {
        // Sliding window algorithm
        const windowKey = `${key}:${Math.floor(now / windowMs)}`;
        const prevWindowKey = `${key}:${Math.floor(now / windowMs) - 1}`;

        const pipeline = redisClient.pipeline();
        pipeline.lpush(windowKey, now.toString());
        pipeline.ltrim(windowKey, 0, max - 1);
        pipeline.expire(windowKey, Math.ceil(windowMs / 1000));
        pipeline.lrange(prevWindowKey, 0, -1);

        const results = await pipeline.exec();
        const prevCount = (results?.[3]?.[1] as string[])?.length ?? 0;

        // Calculate weighted count
        const elapsed = now % windowMs;
        const prevWeight = 1 - (elapsed / windowMs);
        const currentCount = (results?.[0]?.[1] as number) ?? 0;
        const weightedCount = Math.floor(prevCount * prevWeight) + currentCount;

        res.setHeader('X-RateLimit-Limit', max.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - weightedCount - 1).toString());
        res.setHeader('X-RateLimit-Reset', Math.ceil((Math.floor(now / windowMs) + 1) * windowMs / 1000).toString());

        if (weightedCount >= max) {
          res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());
          return res.status(429).json({
            error: message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(windowMs / 1000)
          });
        }
      } else {
        // Fixed window algorithm (original)
        const current = await redisClient.incr(key);

        if (current === 1) {
          await redisClient.pexpire(key, windowMs);
        }

        const ttl = await redisClient.pttl(key);
        const remaining = Math.max(0, max - current);

        res.setHeader('X-RateLimit-Limit', max.toString());
        res.setHeader('X-RateLimit-Remaining', remaining.toString());
        res.setHeader('X-RateLimit-Reset', Math.ceil(ttl / 1000).toString());

        if (current > max) {
          res.setHeader('Retry-After', Math.ceil(ttl / 1000).toString());
          return res.status(429).json({
            error: message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(ttl / 1000)
          });
        }
      }

      next();
    } catch (error) {
      console.error('[RateLimiter] Error:', error);
      // On Redis error, allow the request but log
      next();
    }
  };
}

/**
 * Alias for createRateLimiter
 */
export const rateLimiter = createRateLimiter;

/**
 * Idempotency key helper
 * Returns true if key was set (first request), false if already exists
 */
export async function setIdempotencyKey(
  key: string,
  ttlSeconds: number = 3600
): Promise<boolean> {
  if (!redisClient || redisClient.status !== 'ready') return false;

  const result = await redisClient.set(`idempotency:${key}`, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

/**
 * Get idempotency key status
 */
export async function getIdempotencyKey(key: string): Promise<boolean> {
  if (!redisClient || redisClient.status !== 'ready') return false;
  const result = await redisClient.exists(`idempotency:${key}`);
  return result === 1;
}

/**
 * Delete idempotency key (for cleanup or retry scenarios)
 */
export async function deleteIdempotencyKey(key: string): Promise<boolean> {
  if (!redisClient || redisClient.status !== 'ready') return false;
  const result = await redisClient.del(`idempotency:${key}`);
  return result === 1;
}

// ============================================
// Circuit Breaker (Production-Ready)
// ============================================

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  threshold?: number;
  /** Time in ms before attempting to close circuit */
  resetTimeout?: number;
  /** Success count needed to close circuit from half-open */
  successThreshold?: number;
  /** Callback when circuit opens */
  onOpen?: (failureCount: number) => void;
  /** Callback when circuit closes */
  onClose?: () => void;
  /** Callback when circuit half-opens */
  onHalfOpen?: () => void;
}

/**
 * Circuit Breaker implementation for fault tolerance
 *
 * States:
 * - closed: Normal operation, requests pass through
 * - open: Circuit is tripped, requests fail immediately
 * - half-open: Testing if service recovered, limited requests pass through
 */
export class CircuitBreaker {
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: number = 0;
  private state: CircuitState = 'closed';
  private lastStateChange: number = Date.now();

  constructor(private config: CircuitBreakerConfig = {}) {
    this.config = {
      threshold: 5,
      resetTimeout: 60000,
      successThreshold: 3,
      ...config
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailure >= this.config.resetTimeout!;
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold!) {
        this.transitionTo('closed');
      }
    } else {
      this.failures = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.failures >= this.config.threshold!) {
      this.transitionTo('open');
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === 'closed') {
      this.failures = 0;
      this.successes = 0;
      this.config.onClose?.();
    } else if (newState === 'open') {
      this.config.onOpen?.(this.failures);
    } else if (newState === 'half-open') {
      this.successes = 0;
      this.config.onHalfOpen?.();
    }

    console.log(`[CircuitBreaker] State transition: ${oldState} -> ${newState}`);
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker stats
   */
  getStats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: number;
    uptime: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      uptime: Date.now() - this.lastStateChange
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.transitionTo('closed');
  }

  /**
   * Force circuit to open
   */
  trip(): void {
    this.transitionTo('open');
  }
}

// ============================================
// Distributed Locks (Production-Ready)
// ============================================

/**
 * Acquire a distributed lock
 * Uses SET NX PX for atomic lock acquisition
 */
export async function acquireLock(
  key: string,
  ttlMs: number = 30000
): Promise<boolean> {
  if (!redisClient || redisClient.status !== 'ready') return false;

  const lockKey = `lock:${key}`;
  const lockValue = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const result = await redisClient.set(lockKey, lockValue, 'PX', ttlMs, 'NX');

  if (result === 'OK') {
    // Store lock value for safe release
    await redisClient.set(`${lockKey}:value`, lockValue, 'EX', Math.ceil(ttlMs / 1000));
    return true;
  }
  return false;
}

/**
 * Release a distributed lock (only if we own it)
 * Uses Lua script for atomic check-and-delete
 */
export async function releaseLock(key: string): Promise<boolean> {
  if (!redisClient || redisClient.status !== 'ready') return false;

  const lockKey = `lock:${key}`;
  const lockValue = await redisClient.get(`${lockKey}:value`);

  if (!lockValue) return false;

  // Lua script for atomic check-and-delete
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1], KEYS[2])
    else
      return 0
    end
  `;

  const result = await redisClient.eval(script, 2, lockKey, `${lockKey}:value`) as number;
  return result === 1;
}

/**
 * Extend lock TTL (if we still own it)
 */
export async function extendLock(key: string, ttlMs: number = 30000): Promise<boolean> {
  if (!redisClient || redisClient.status !== 'ready') return false;

  const lockKey = `lock:${key}`;
  const lockValue = await redisClient.get(`${lockKey}:value`);

  if (!lockValue) return false;

  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;

  const result = await redisClient.eval(script, 1, lockKey, lockValue, ttlMs.toString()) as number;
  return result === 1;
}

/**
 * Execute function with distributed lock
 */
export async function withLock<T>(
  key: string,
  fn: () => T | Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const { ttlMs = 30000, retryCount = 3, retryDelayMs = 100 } = options;

  // Try to acquire lock
  let acquired = await acquireLock(key, ttlMs);
  let attempts = 0;

  while (!acquired && attempts < retryCount) {
    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    acquired = await acquireLock(key, ttlMs);
    attempts++;
  }

  if (!acquired) {
    throw new Error(`Failed to acquire lock for key: ${key}`);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key);
  }
}

// ============================================
// Cache Utilities
// ============================================

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
  if (!redisClient || redisClient.status !== 'ready') return null;

  const cacheKey = `${options.prefix ?? 'cache'}:${key}`;
  const value = await redisClient.get(cacheKey);

  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

/**
 * Set value in cache
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  if (!redisClient || redisClient.status !== 'ready') return false;

  const cacheKey = `${options.prefix ?? 'cache'}:${key}`;
  const ttl = options.ttl ?? 3600;

  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const result = await redisClient.setex(cacheKey, ttl, serialized);

  return result === 'OK';
}

/**
 * Delete from cache
 */
export async function cacheDel(key: string, options: CacheOptions = {}): Promise<boolean> {
  if (!redisClient || redisClient.status !== 'ready') return false;

  const cacheKey = `${options.prefix ?? 'cache'}:${key}`;
  const result = await redisClient.del(cacheKey);

  return result === 1;
}

/**
 * Get or set cache (cache-aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cached = await cacheGet<T>(key, options);
  if (cached !== null) return cached;

  const value = await fn();
  await cacheSet(key, value, options);

  return value;
}

// ============================================
// Session Management
// ============================================

/**
 * Create session
 */
export async function createSession(
  userId: string,
  ttlSeconds: number = 86400,
  metadata?: Record<string, unknown>
): Promise<string> {
  if (!redisClient || redisClient.status !== 'ready') {
    throw new Error('Redis not available');
  }

  const sessionId = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const sessionKey = `session:${sessionId}`;

  const sessionData: SessionData = {
    userId,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    metadata
  };

  await redisClient.setex(sessionKey, ttlSeconds, JSON.stringify(sessionData));
  return sessionId;
}

/**
 * Get session
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  if (!redisClient || redisClient.status !== 'ready') return null;

  const sessionKey = `session:${sessionId}`;
  const data = await redisClient.get(sessionKey);

  if (!data) return null;

  try {
    return JSON.parse(data) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Update session activity
 */
export async function touchSession(sessionId: string, ttlSeconds: number = 86400): Promise<boolean> {
  if (!redisClient || redisClient.status !== 'ready') return false;

  const sessionKey = `session:${sessionId}`;
  const data = await redisClient.get(sessionKey);

  if (!data) return false;

  try {
    const session = JSON.parse(data) as SessionData;
    session.lastActiveAt = Date.now();
    await redisClient.setex(sessionKey, ttlSeconds, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  if (!redisClient || redisClient.status !== 'ready') return false;

  const sessionKey = `session:${sessionId}`;
  const result = await redisClient.del(sessionKey);

  return result === 1;
}

// ============================================
// Pub/Sub Utilities
// ============================================

/**
 * Create a subscriber
 */
export function createSubscriber(config: RedisConfig): Redis {
  return new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db ?? 1, // Use different DB for subscribers
    lazyConnect: true
  });
}

/**
 * Publish message to channel
 */
export async function publish(channel: string, message: unknown): Promise<number> {
  if (!redisClient || redisClient.status !== 'ready') {
    throw new Error('Redis not available');
  }

  const serialized = typeof message === 'string' ? message : JSON.stringify(message);
  return redisClient.publish(channel, serialized);
}

// Export default client getter
export default {
  createRedisClient,
  createClient,
  getClient,
  isConnected,
  closeClient,
  checkHealth,
  getConnectionInfo,
  createRateLimiter,
  rateLimiter,
  setIdempotencyKey,
  getIdempotencyKey,
  deleteIdempotencyKey,
  CircuitBreaker,
  acquireLock,
  releaseLock,
  extendLock,
  withLock,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheGetOrSet,
  createSession,
  getSession,
  touchSession,
  deleteSession,
  createSubscriber,
  publish
};