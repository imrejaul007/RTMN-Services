/**
 * Redis Connection with Authentication and TLS Support
 *
 * CRITICAL SECURITY: This module supports Redis authentication and TLS.
 * Enable by setting environment variables:
 *
 * Connection Modes:
 *   1. Single node: REDIS_URL=redis://host:6379
 *   2. Sentinel:    REDIS_SENTINEL_HOSTS=s1:26379,s2:26379
 *                  REDIS_SENTINEL_NAME=mymaster
 *                  REDIS_PASSWORD=your_password
 *
 * Security Options:
 *   REDIS_PASSWORD - Password for AUTH
 *   REDIS_USERNAME - Username for ACL
 *   REDIS_TLS_ENABLED=true - Enable TLS encryption
 *   REDIS_TLS_REJECT_UNAUTHORIZED=false - Allow self-signed certs (dev only!)
 *
 * TLS Configuration:
 *   For production, set:
 *   - REDIS_TLS_ENABLED=true
 *   - REDIS_TLS_CA_CERT=/path/to/ca.crt (optional, for custom CAs)
 *   - REDIS_TLS_REJECT_UNAUTHORIZED=true (recommended)
 */

import IORedis from 'ioredis';
import { logger } from './logger';
import { randomUUID, randomInt } from 'crypto';
import fs from 'fs';

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  username?: string;
  db?: number;
  sentinels?: Array<{ host: string; port: number }>;
  sentinelName?: string;
  url?: string;
  tls?: boolean;
}

/**
 * Get Redis password from environment
 */
function getRedisPassword(): string | undefined {
  return process.env.REDIS_PASSWORD || undefined;
}

/**
 * Get Redis username from environment (for ACL)
 */
function getRedisUsername(): string | undefined {
  return process.env.REDIS_USERNAME || undefined;
}

/**
 * Check if TLS is enabled
 */
function isRedisTLSEnabled(): boolean {
  return process.env.REDIS_TLS_ENABLED === 'true';
}

/**
 * Get TLS configuration for Redis connection
 */
function getRedisTLSConfig(): object | undefined {
  if (!isRedisTLSEnabled()) {
    return undefined;
  }

  const tlsConfig: Record<string, unknown> = {
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
  };

  // Add CA cert if provided
  const caCertPath = process.env.REDIS_TLS_CA_CERT;
  if (caCertPath && fs.existsSync(caCertPath)) {
    tlsConfig.ca = fs.readFileSync(caCertPath);
  }

  // Add client cert if provided
  const clientCertPath = process.env.REDIS_TLS_CLIENT_CERT;
  const clientKeyPath = process.env.REDIS_TLS_CLIENT_KEY;
  if (clientCertPath && clientKeyPath && fs.existsSync(clientCertPath) && fs.existsSync(clientKeyPath)) {
    tlsConfig.cert = fs.readFileSync(clientCertPath);
    tlsConfig.key = fs.readFileSync(clientKeyPath);
  }

  return tlsConfig;
}

/**
 * Parse Redis URL into connection config
 */
function parseRedisUrl(url: string): { host: string; port: number; password?: string; db?: number } {
  try {
    const parsed = new URL(url);
    const password = parsed.password || undefined;
    const db = parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) : undefined;
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password,
      db: isNaN(db as number) ? undefined : db,
    };
  } catch {
    // Fallback for simple URLs without protocol
    const parts = url.replace('redis://', '').split(':');
    return {
      host: parts[0] || 'localhost',
      port: parseInt(parts[1] || '6379', 10),
    };
  }
}

/**
 * Create a Redis client with authentication support
 */
export function createRedisClient(): IORedis {
  const sentinelRaw = process.env.REDIS_SENTINEL_HOSTS;
  const password = getRedisPassword();
  const username = getRedisUsername();
  const hasAuth = !!(password || username);

  if (hasAuth) {
    logger.info('[Redis] Authentication enabled', {
      hasPassword: !!password,
      hasUsername: !!username,
      mode: sentinelRaw ? 'sentinel' : 'single',
    });
  }

  const retryStrategy = (times: number) => {
    const base = Math.min(times * 200, 5000);
    // Use crypto.randomInt for secure random jitter
    return Math.floor(base + randomInt(500));
  };

  const reconnectOnError = (err: Error) =>
    err.message.includes('ECONNRESET') ||
    err.message.includes('EPIPE') ||
    err.message.includes('READONLY');

  const tlsConfig = getRedisTLSConfig();

  if (isRedisTLSEnabled()) {
    logger.info('[Redis] TLS encryption enabled', {
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
    });
  }

  // Sentinel mode
  if (sentinelRaw) {
    if (!sentinelRaw.includes(',')) {
      throw new Error('REDIS_SENTINEL_HOSTS must contain at least one sentinel host');
    }

    const sentinels = sentinelRaw.split(',').map((h) => {
      const [host, port] = h.trim().split(':');
      if (!host) throw new Error('Sentinel host cannot be empty');
      return { host, port: parseInt(port || '26379', 10) };
    });

    return new IORedis({
      sentinels,
      name: process.env.REDIS_SENTINEL_NAME || 'mymaster',
      password: password,
      username: username,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      keepAlive: 10000,
      retryStrategy,
      reconnectOnError,
      tls: tlsConfig,
    });
  }

  // Single node mode
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const parsed = parseRedisUrl(redisUrl);

  // Check if URL already contains password
  const urlPassword = parsed.password;
  const finalPassword = password || urlPassword;

  return new IORedis({
    host: parsed.host,
    port: parsed.port,
    password: finalPassword,
    username: username,
    db: parsed.db || 0,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    keepAlive: 10000,
    retryStrategy,
    reconnectOnError,
    tls: tlsConfig,
  });
}

/**
 * Create a separate Redis client for BullMQ (worker)
 * BullMQ has different connection requirements
 */
export function createBullMqRedisClient(): IORedis {
  const sentinelRaw = process.env.REDIS_SENTINEL_HOSTS;
  const password = getRedisPassword();
  const username = getRedisUsername();
  const tlsConfig = getRedisTLSConfig();

  if (sentinelRaw) {
    if (!sentinelRaw.includes(',')) {
      throw new Error('REDIS_SENTINEL_HOSTS must contain at least one sentinel host');
    }

    const sentinels = sentinelRaw.split(',').map((h) => {
      const [host, port] = h.trim().split(':');
      return { host, port: parseInt(port || '26379', 10) };
    });

    return new IORedis({
      sentinels,
      name: process.env.REDIS_SENTINEL_NAME || 'mymaster',
      password: password,
      username: username,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      enableOfflineQueue: true,
      lazyConnect: false,
      tls: tlsConfig,
    });
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const parsed = parseRedisUrl(redisUrl);
  const urlPassword = parsed.password;
  const finalPassword = password || urlPassword;

  return new IORedis({
    host: parsed.host,
    port: parsed.port,
    password: finalPassword,
    username: username,
    db: parsed.db || 1, // Use different DB for BullMQ
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    enableOfflineQueue: true,
    lazyConnect: false,
    tls: tlsConfig,
  });
}

/**
 * Mask URL for logging (hide credentials)
 */
export function maskRedisUrl(url: string): string {
  if (!url) return '[not set]';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '[invalid URL]';
  }
}
