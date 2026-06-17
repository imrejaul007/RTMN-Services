/**
 * Redis Configuration
 */

import Redis from 'ioredis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let client: Redis | null = null;

export function connectRedis(): Redis {
  if (client) return client;

  client = new Redis(config.redis.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });

  client.on('connect', () => {
    logger.info('Redis connected');
  });

  client.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  client.connect().catch((err) => {
    logger.warn('Redis connection failed', { error: err.message });
  });

  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

export function getRedis(): Redis | null {
  return client;
}

// Auction store helpers
export async function storeAuction(auctionId: string, data: unknown, ttlSeconds: number = 60): Promise<void> {
  if (!client) return;
  await client.setex(`auction:${auctionId}`, ttlSeconds, JSON.stringify(data));
}

export async function getAuction(auctionId: string): Promise<unknown | null> {
  if (!client) return null;
  const data = await client.get(`auction:${auctionId}`);
  return data ? JSON.parse(data) : null;
}

export async function incrementCounter(key: string): Promise<number> {
  if (!client) return 0;
  return client.incr(key);
}
