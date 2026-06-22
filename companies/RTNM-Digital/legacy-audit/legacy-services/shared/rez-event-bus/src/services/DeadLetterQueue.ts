import Redis from 'ioredis';
import { RedisConnection } from './RedisConnection';
import { EventPublisher } from './EventPublisher';
import { CONFIG } from '../config';
import { logger, createChildLogger } from '../utils/logger';
import { DLQEntry } from '../types';

export interface DLQOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export class DeadLetterQueue {
  private redis!: RedisConnection;
  private streamName: string;
  private log: ReturnType<typeof createChildLogger>;
  private dlqGroup = 'dlq-processors';
  private maxRetries: number;
  private retryDelay: number;

  constructor(options?: DLQOptions) {
    this.streamName = CONFIG.DLQ_STREAM;
    this.maxRetries = options?.maxRetries || CONFIG.MAX_RETRIES;
    this.retryDelay = options?.retryDelay || CONFIG.RETRY_DELAY;
    this.log = createChildLogger('DeadLetterQueue');
  }

  async initialize(): Promise<void> {
    this.redis = await RedisConnection.getInstance();
    await this.ensureGroup();
  }

  private async ensureGroup(): Promise<void> {
    try {
      await this.redis.getClient().xgroup(
        'CREATE',
        this.streamName,
        this.dlqGroup,
        '0',
        'MKSTREAM'
      );
      this.log.info(`DLQ group created: ${this.dlqGroup}`);
    } catch (error: any) {
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  /**
   * Push a failed message to the DLQ
   */
  async push(originalId: string, payload: any): Promise<string> {
    const client = this.redis.getClient();

    const messageId = await client.xadd(
      this.streamName,
      '*',
      'originalId', originalId,
      'payload', JSON.stringify(payload),
      'failedAt', new Date().toISOString(),
      'retryCount', '0',
      'error', payload.error || 'Unknown error'
    );

    if (!messageId) {
      throw new Error('Failed to add message to DLQ');
    }

    this.log.warn(`Message sent to DLQ: ${originalId}`, {
      messageId,
      error: payload.error,
    });

    return messageId;
  }

  /**
   * Get failed messages with optional limit
   */
  async getFailedMessages(limit: number = 10): Promise<DLQEntry[]> {
    const client = this.redis.getClient();
    const messages = await client.xrange(this.streamName, '-', '+', 'COUNT', limit.toString());

    return messages.map(([id, fields]) => this.parseEntry(id, fields));
  }

  /**
   * Get messages by count
   */
  async getMessages(count: number = 10): Promise<DLQEntry[]> {
    const client = this.redis.getClient();
    const messages = await client.xrange(this.streamName, '-', '+', 'COUNT', count.toString());

    return messages.map(([id, fields]) => this.parseEntry(id, fields));
  }

  private parseEntry(id: string, fields: string[]): DLQEntry {
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      obj[fields[i]] = fields[i + 1];
    }

    return {
      id,
      originalId: obj.originalId || '',
      payload: {
        id: obj.originalId || '',
        eventType: obj.eventType || 'unknown',
        data: obj.payload || '{}',
        timestamp: obj.failedAt || '',
      },
      failedAt: obj.failedAt || '',
      retryCount: parseInt(obj.retryCount || '0', 10),
    };
  }

  /**
   * Retry a message from DLQ
   */
  async retry(messageId: string, targetChannel?: string): Promise<boolean> {
    const client = this.redis.getClient();
    const messages = await client.xrange(this.streamName, messageId, messageId);

    if (messages.length === 0) {
      this.log.error(`Message not found in DLQ: ${messageId}`);
      return false;
    }

    const [, fields] = messages[0];
    const entry = this.parseEntry(messageId, fields);

    // Check retry count
    if ((entry.retryCount ?? 0) >= this.maxRetries) {
      this.log.error(`Max retries exceeded for message: ${messageId}`);
      return false;
    }

    try {
      const publisher = new EventPublisher();
      await publisher.initialize();

      const channel = targetChannel || CONFIG.EVENT_STREAM;
      await publisher.publish(channel, entry.payload.eventType, JSON.parse(entry.payload.data as string));

      // Remove from DLQ
      await client.xdel(this.streamName, messageId);

      this.log.info(`Retried message from DLQ: ${messageId}`, {
        retryCount: (entry.retryCount ?? 0) + 1,
        channel,
      });

      return true;
    } catch (error) {
      // Increment retry count (using XADD with INCR pattern)
      this.log.error(`Retry failed for message: ${messageId}`, error);
      return false;
    }
  }

  /**
   * Retry all messages in DLQ
   */
  async retryAll(targetChannel?: string): Promise<{ success: number; failed: number }> {
    const messages = await this.getMessages(100);
    let success = 0;
    let failed = 0;

    for (const message of messages) {
      const result = await this.retry(message.id, targetChannel);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Remove a message from DLQ without retrying
   */
  async remove(messageId: string): Promise<void> {
    const client = this.redis.getClient();
    await client.xdel(this.streamName, messageId);
    this.log.info(`Removed message from DLQ: ${messageId}`);
  }

  /**
   * Clear all messages from DLQ
   */
  async clear(): Promise<number> {
    const client = this.redis.getClient();
    const messages = await client.xrange(this.streamName, '-', '+');
    const messageIds = messages.map(([id]) => id);

    if (messageIds.length > 0) {
      await client.xdel(this.streamName, ...messageIds);
    }

    this.log.info(`Cleared ${messageIds.length} messages from DLQ`);
    return messageIds.length;
  }

  /**
   * Get DLQ statistics
   */
  async getStats(): Promise<{
    count: number;
    oldestMessage: string | null;
    newestMessage: string | null;
  }> {
    const client = this.redis.getClient();
    const count = await client.xlen(this.streamName);

    let oldestMessage: string | null = null;
    let newestMessage: string | null = null;

    if (count > 0) {
      const oldest = await client.xrange(this.streamName, '-', '+', 'COUNT', '1');
      const newest = await client.xrange(this.streamName, '+', '-', 'COUNT', '1');

      if (oldest.length > 0) {
        oldestMessage = oldest[0][0];
      }
      if (newest.length > 0) {
        newestMessage = newest[0][0];
      }
    }

    return { count, oldestMessage, newestMessage };
  }
}