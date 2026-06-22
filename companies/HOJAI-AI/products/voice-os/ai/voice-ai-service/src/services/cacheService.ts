import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

export class CacheService {
  private client: Redis | null = null;
  private isConnected = false;
  private readonly defaultTTL = 3600; // 1 hour

  constructor() {
    this.connect();
  }

  private connect(): void {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    if (!process.env.REDIS_ENABLED || process.env.REDIS_ENABLED === 'true') {
      try {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.warn('Redis connection failed, caching disabled');
              return null;
            }
            return Math.min(times * 100, 3000);
          },
          lazyConnect: true,
        });

        this.client.on('connect', () => {
          this.isConnected = true;
          logger.info('Redis cache connected');
        });

        this.client.on('error', (err) => {
          this.isConnected = false;
          logger.error('Redis cache error', err);
        });

        this.client.on('close', () => {
          this.isConnected = false;
        });

        this.client.connect().catch((err) => {
          logger.warn('Redis initial connection failed', { error: err.message });
        });
      } catch (err) {
        logger.warn('Redis initialization failed, caching disabled');
      }
    }
  }

  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  private buildKey(key: string, namespace?: string): string {
    const prefix = namespace || 'voice-ai';
    return `${prefix}:${key}`;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 32);
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.isAvailable()) return null;

    const cacheKey = this.buildKey(
      options?.namespace ? `${options.namespace}:${key}` : key
    );

    try {
      const value = await this.client!.get(cacheKey);
      if (value) {
        logger.debug('Cache hit', { key: cacheKey });
        return JSON.parse(value) as T;
      }
      logger.debug('Cache miss', { key: cacheKey });
      return null;
    } catch (err) {
      logger.error('Cache get error', err);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.isAvailable()) return;

    const cacheKey = this.buildKey(
      options?.namespace ? `${options.namespace}:${key}` : key
    );
    const ttl = options?.ttl || this.defaultTTL;

    try {
      await this.client!.setex(cacheKey, ttl, JSON.stringify(value));
      logger.debug('Cache set', { key: cacheKey, ttl });
    } catch (err) {
      logger.error('Cache set error', err);
    }
  }

  async delete(key: string, options?: CacheOptions): Promise<void> {
    if (!this.isAvailable()) return;

    const cacheKey = this.buildKey(
      options?.namespace ? `${options.namespace}:${key}` : key
    );

    try {
      await this.client!.del(cacheKey);
      logger.debug('Cache deleted', { key: cacheKey });
    } catch (err) {
      logger.error('Cache delete error', err);
    }
  }

  async clear(namespace?: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const pattern = namespace
        ? `${namespace}:*`
        : 'voice-ai:*';
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(...keys);
        logger.info('Cache cleared', { pattern, count: keys.length });
      }
    } catch (err) {
      logger.error('Cache clear error', err);
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  // Cache keys for medical summaries (expensive operation)
  async getMedicalSummary(patientId: string, visitId: string): Promise<string | null> {
    const key = `summary:${patientId}:${visitId}`;
    return this.get<string>(key, { namespace: 'medical', ttl: 86400 }); // 24 hours
  }

  async setMedicalSummary(patientId: string, visitId: string, summary: string): Promise<void> {
    const key = `summary:${patientId}:${visitId}`;
    await this.set(key, summary, { namespace: 'medical', ttl: 86400 });
  }

  // Cache keys for transcription results (for repeat queries)
  async getTranscription(audioHash: string): Promise<string | null> {
    return this.get<string>(audioHash, { namespace: 'transcription', ttl: 604800 }); // 7 days
  }

  async setTranscription(audioHash: string, transcription: string): Promise<void> {
    await this.set(audioHash, transcription, { namespace: 'transcription', ttl: 604800 });
  }
}

export const cacheService = new CacheService();
