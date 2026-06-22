import Redis from 'ioredis';
import { CONFIG } from '../config';
import { logger, createChildLogger } from '../utils/logger';

export class RedisConnection {
  private static instance: RedisConnection | null = null;
  private client: Redis;
  private subscriber: Redis;
  private isConnected: boolean = false;
  private startTime: number = Date.now();

  private constructor() {
    const log = createChildLogger('RedisConnection');

    this.client = new Redis(CONFIG.REDIS_URL, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        log.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.subscriber = new Redis(CONFIG.REDIS_URL, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.setupEventHandlers(log);
  }

  private setupEventHandlers(log: ReturnType<typeof createChildLogger>): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      log.info('Redis client connected');
    });

    this.client.on('ready', () => {
      log.info('Redis client ready');
    });

    this.client.on('error', (err) => {
      log.error('Redis client error:', err);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      log.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      log.info('Redis reconnecting...');
    });

    this.subscriber.on('error', (err) => {
      log.error('Redis subscriber error:', err);
    });
  }

  static async getInstance(): Promise<RedisConnection> {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
      await RedisConnection.instance.connect();
    }
    return RedisConnection.instance;
  }

  private async connect(): Promise<void> {
    const log = createChildLogger('RedisConnection');

    try {
      await this.client.connect();
      await this.subscriber.connect();
      log.info(`Connected to Redis at ${CONFIG.REDIS_URL}`);
    } catch (error) {
      log.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Publish an event to a Redis stream
   */
  async publish(
    channel: string,
    eventType: string,
    data: any,
    options?: { correlationId?: string; source?: string }
  ): Promise<string> {
    const fields: string[] = ['eventType', eventType, 'data', JSON.stringify(data), 'timestamp', new Date().toISOString()];

    if (options?.correlationId) {
      fields.push('correlationId', options.correlationId);
    }

    if (options?.source) {
      fields.push('source', options.source);
    }

    const messageId = await this.client.xadd(channel, '*', ...fields);
    if (!messageId) {
      throw new Error('Failed to add message to stream');
    }
    return messageId;
  }

  /**
   * Publish a message to a pub/sub channel
   */
  async publishMessage(channel: string, message: any): Promise<void> {
    await this.client.publish(channel, JSON.stringify(message));
  }

  /**
   * Subscribe to a pub/sub channel
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(msg));
        } catch {
          callback(msg);
        }
      }
    });
  }

  /**
   * Create a consumer group for stream processing
   */
  async createConsumerGroup(stream: string, group: string): Promise<void> {
    try {
      await this.client.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
      logger.info(`Consumer group created: ${group} for stream: ${stream}`);
    } catch (error: any) {
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  /**
   * Read from consumer group
   */
  async readFromGroup(
    stream: string,
    group: string,
    consumer: string,
    count: number = 10,
    block: number = 5000
  ): Promise<any> {
    const result = await this.client.xreadgroup(
      'GROUP',
      stream,
      group,
      'COUNT',
      count.toString(),
      'BLOCK',
      block.toString(),
      'STREAMS',
      stream,
      '>'
    );
    return result;
  }

  /**
   * Acknowledge a message
   */
  async ack(stream: string, group: string, messageId: string): Promise<number> {
    return this.client.xack(stream, group, messageId);
  }

  /**
   * Get stream length
   */
  async getStreamLength(stream: string): Promise<number> {
    return this.client.xlen(stream);
  }

  /**
   * Get stream info
   */
  async getStreamInfo(stream: string): Promise<Record<string, any>> {
    const info = await this.client.xinfo('STREAM', stream);
    return this.parseStreamInfo(info as unknown[]);
  }

  private parseStreamInfo(info: unknown[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (let i = 0; i < info.length; i += 2) {
      result[info[i] as string] = info[i + 1];
    }
    return result;
  }

  /**
   * Clean up resources
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    RedisConnection.instance = null;
  }
}