import { v4 as uuidv4 } from 'uuid';
import { RedisConnection } from './RedisConnection';
import { CONFIG } from '../config';
import { logger, createChildLogger } from '../utils/logger';
import { Event } from '../types';

export class EventPublisher {
  private redis!: RedisConnection;
  private log: ReturnType<typeof createChildLogger>;

  constructor() {
    this.log = createChildLogger('EventPublisher');
  }

  async initialize(): Promise<void> {
    this.redis = await RedisConnection.getInstance();
  }

  /**
   * Publish an event to a channel
   */
  async publish(
    channel: string,
    eventType: string,
    data: any,
    options?: { correlationId?: string; source?: string }
  ): Promise<string> {
    const client = this.redis.getClient();

    const messageId = await client.xadd(
      channel,
      '*',
      'id', uuidv4(),
      'eventType', eventType,
      'data', JSON.stringify(data),
      'timestamp', new Date().toISOString(),
      'source', options?.source || 'rez-event-bus',
      ...(options?.correlationId ? ['correlationId', options.correlationId] : [])
    );

    if (!messageId) {
      throw new Error('Failed to publish event to stream');
    }

    this.log.debug(`Event published: ${eventType}`, { channel, messageId });

    return messageId;
  }

  /**
   * Publish a batch of events
   */
  async publishBatch(
    channel: string,
    events: Array<{ eventType: string; data: any; options?: { correlationId?: string; source?: string } }>
  ): Promise<string[]> {
    const messageIds: string[] = [];

    for (const event of events) {
      const id = await this.publish(channel, event.eventType, event.data, event.options);
      messageIds.push(id);
    }

    this.log.info(`Batch published ${events.length} events to ${channel}`, { messageIds });
    return messageIds;
  }

  /**
   * Publish to multiple channels
   */
  async publishToChannels(
    channels: string[],
    eventType: string,
    data: any,
    options?: { correlationId?: string; source?: string }
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const channel of channels) {
      const messageId = await this.publish(channel, eventType, data, options);
      results[channel] = messageId;
    }

    return results;
  }

  /**
   * Publish a typed event object
   */
  async publishEvent(event: Event, channel?: string): Promise<string> {
    const targetChannel = channel || CONFIG.EVENT_STREAM;

    const messageId = await this.redis.publish(
      targetChannel,
      event.type,
      event.data,
      {
        correlationId: event.id,
        source: event.source,
      }
    );

    this.log.info(`Event published: ${event.type}`, {
      channel: targetChannel,
      messageId,
      eventId: event.id,
    });

    return messageId;
  }

  /**
   * Emit a notification via pub/sub
   */
  async emit(channel: string, eventType: string, data: any): Promise<void> {
    const message = {
      id: uuidv4(),
      eventType,
      data,
      timestamp: new Date().toISOString(),
    };

    await this.redis.publishMessage(channel, message);
    this.log.debug(`Message emitted: ${eventType}`, { channel });
  }
}

/**
 * Singleton instance for easy access
 */
let publisherInstance: EventPublisher | null = null;

export async function getEventPublisher(): Promise<EventPublisher> {
  if (!publisherInstance) {
    publisherInstance = new EventPublisher();
    await publisherInstance.initialize();
  }
  return publisherInstance;
}