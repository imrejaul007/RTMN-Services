/**
 * Redis Storage
 * Real-time metrics storage using Redis
 */

import Redis from 'ioredis';

export interface DataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface TimeSeriesOptions {
  retentionSeconds?: number;
  compression?: boolean;
  aggregation?: 'last' | 'sum' | 'avg' | 'min' | 'max';
}

export class RedisStorage {
  private client: Redis | null = null;
  private connected: boolean = false;
  private config: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };

  constructor(config?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  }) {
    this.config = {
      host: config?.host ?? process.env.REDIS_HOST ?? 'localhost',
      port: config?.port ?? parseInt(process.env.REDIS_PORT ?? '6379'),
      password: config?.password ?? process.env.REDIS_PASSWORD,
      db: config?.db ?? 0,
      keyPrefix: config?.keyPrefix ?? 'rez:'
    };
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.connected = true;
    });

    // Test connection
    await this.client.ping();
    this.connected = true;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Increment a counter and return the new value
   */
  async incrementCounter(key: string, amount: number = 1): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.incrby(key, amount);
  }

  /**
   * Decrement a counter
   */
  async decrementCounter(key: string, amount: number = 1): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.decrby(key, amount);
  }

  /**
   * Get counter value
   */
  async getCounter(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    const value = await this.client.get(key);
    return value ? parseInt(value) : 0;
  }

  /**
   * Set a gauge value
   */
  async setGauge(key: string, value: number): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    await this.client.set(key, value.toString());
  }

  /**
   * Get gauge value
   */
  async getGauge(key: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    const value = await this.client.get(key);
    return value ? parseFloat(value) : 0;
  }

  /**
   * Increment gauge value
   */
  async incrementGauge(key: string, amount: number = 1): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.incrbyfloat(key, amount);
  }

  /**
   * Add data point to time series
   */
  async addTimeSeriesPoint(
    key: string,
    value: number,
    timestamp?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');

    const ts = timestamp ?? Date.now();
    const data = JSON.stringify({ timestamp: ts, value, metadata });

    // Store in sorted set with timestamp as score
    await this.client.zadd(key, ts, data);

    // Also store in hash for current value
    await this.client.hset(`${key}:current`, 'value', value.toString(), 'timestamp', ts.toString());
  }

  /**
   * Get time series data points
   */
  async getTimeSeries(
    key: string,
    from: Date | number,
    to: Date | number
  ): Promise<DataPoint[]> {
    if (!this.client) throw new Error('Redis not connected');

    const fromTs = typeof from === 'number' ? from : from.getTime();
    const toTs = typeof to === 'number' ? to : to.getTime();

    const results = await this.client.zrangebyscore(key, fromTs, toTs);

    return results.map((item) => {
      const parsed = JSON.parse(item);
      return {
        timestamp: parsed.timestamp,
        value: parsed.value,
        metadata: parsed.metadata
      };
    });
  }

  /**
   * Get aggregated time series data
   */
  async getTimeSeriesAggregated(
    key: string,
    from: Date | number,
    to: Date | number,
    bucketSizeMs: number,
    aggregation: 'sum' | 'avg' | 'min' | 'max' = 'avg'
  ): Promise<DataPoint[]> {
    if (!this.client) throw new Error('Redis not connected');

    const fromTs = typeof from === 'number' ? from : from.getTime();
    const toTs = typeof to === 'number' ? to : to.getTime();

    const results = await this.getTimeSeries(key, fromTs, toTs);

    // Group by bucket
    const buckets = new Map<number, number[]>();
    for (const point of results) {
      const bucketKey = Math.floor(point.timestamp / bucketSizeMs) * bucketSizeMs;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(point.value);
    }

    // Aggregate each bucket
    return Array.from(buckets.entries())
      .map(([timestamp, values]) => {
        let aggregatedValue: number;
        switch (aggregation) {
          case 'sum':
            aggregatedValue = values.reduce((a, b) => a + b, 0);
            break;
          case 'min':
            aggregatedValue = Math.min(...values);
            break;
          case 'max':
            aggregatedValue = Math.max(...values);
            break;
          case 'avg':
          default:
            aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
        }
        return { timestamp, value: aggregatedValue };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Store hash data
   */
  async setHash(key: string, data: Record<string, string | number>): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    const stringData: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      stringData[k] = String(v);
    }
    await this.client.hset(key, stringData);
  }

  /**
   * Get hash data
   */
  async getHash(key: string): Promise<Record<string, string>> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.hgetall(key);
  }

  /**
   * Increment hash field
   */
  async incrementHashField(key: string, field: string, amount: number = 1): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
    return this.client.hincrby(key, field, amount);
  }

  /**
   * Store sorted set
   */
  async addToSortedSet(
    key: string,
    score: number,
    member: string,
    options?: { maxSize?: number }
  ): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');

    await this.client.zadd(key, score, member);

    // Trim if max size specified
    if (options?.maxSize) {
      await this.client.zremrangebyrank(key, 0, -(options.maxSize + 1));
    }
  }

  /**
   * Get top N from sorted set
   */
  async getTopFromSortedSet(key: string, count: number, desc: boolean = true): Promise<string[]> {
    if (!this.client) throw new Error('Redis not connected');
    return desc
      ? this.client.zrevrange(key, 0, count - 1)
      : this.client.zrange(key, 0, count - 1);
  }

  /**
   * Set with expiration
   */
  async setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    await this.client.setex(key, ttlSeconds, value);
  }

  /**
   * Get value with expiration check
   */
  async getWithExpiry(key: string): Promise<{ value: string; ttl: number } | null> {
    if (!this.client) throw new Error('Redis not connected');

    const pipeline = this.client.pipeline();
    pipeline.get(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    if (!results || !results[0] || results[0][1] === null) {
      return null;
    }

    return {
      value: results[0][1] as string,
      ttl: results[1][1] as number
    };
  }

  /**
   * Delete key
   */
  async delete(key: string): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    await this.client.del(key);
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');

    let cursor = '0';
    let totalDeleted = 0;

    do {
      const [newCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;

      if (keys.length > 0) {
        await this.client.del(...keys);
        totalDeleted += keys.length;
      }
    } while (cursor !== '0');

    return totalDeleted;
  }

  /**
   * Batch operations
   */
  async batch(operations: Array<() => Promise<any>>): Promise<any[]> {
    if (!this.client) throw new Error('Redis not connected');

    const pipeline = this.client.pipeline();
    // Note: This is a simplified batch - actual implementation would need
    // to queue operations and execute them

    return Promise.all(operations.map(op => op()));
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis | null {
    return this.client;
  }
}

export const redisStorage = new RedisStorage();
