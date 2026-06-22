import { RedisConnection } from './RedisConnection';
import { DeadLetterQueue } from './DeadLetterQueue';
import { EventRouter } from './EventRouter';
import { CONFIG } from '../config';
import { logger, createChildLogger } from '../utils/logger';
import { Event } from '../types';

export interface ConsumerOptions {
  group: string;
  consumerName?: string;
  count?: number;
  block?: number;
  autoStart?: boolean;
}

export interface MessageHandler {
  (event: Event): Promise<void>;
}

export class EventConsumer {
  private redis!: RedisConnection;
  private consumerGroup: string;
  private consumerName: string;
  private streamName: string;
  private options: Required<ConsumerOptions>;
  private isRunning: boolean = false;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private log: ReturnType<typeof createChildLogger>;
  private startTime: number = Date.now();
  private messagesProcessed: number = 0;
  private messagesFailed: number = 0;

  constructor(options: ConsumerOptions) {
    this.log = createChildLogger(`EventConsumer:${options.group}`);
    this.consumerGroup = options.group;
    this.consumerName = options.consumerName || `consumer-${process.pid}-${Date.now()}`;
    this.streamName = CONFIG.EVENT_STREAM;
    this.options = {
      count: options.count || 10,
      block: options.block || 5000,
      autoStart: options.autoStart !== false,
      ...options,
    } as Required<ConsumerOptions>;
  }

  async initialize(): Promise<void> {
    this.redis = await RedisConnection.getInstance();
    await this.ensureConsumerGroup();
  }

  private async ensureConsumerGroup(): Promise<void> {
    try {
      await this.redis.getClient().xgroup(
        'CREATE',
        this.streamName,
        this.consumerGroup,
        '0',
        'MKSTREAM'
      );
      this.log.info(`Consumer group created: ${this.consumerGroup}`);
    } catch (error: any) {
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
      this.log.debug(`Consumer group already exists: ${this.consumerGroup}`);
    }
  }

  /**
   * Register a handler for specific event types
   */
  on(eventType: string, handler: MessageHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Register a wildcard handler for all events
   */
  onAny(handler: MessageHandler): void {
    this.on('*', handler);
  }

  /**
   * Start consuming messages
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log.warn('Consumer already running');
      return;
    }

    this.isRunning = true;
    this.log.info(`Starting consumer: ${this.consumerName} in group: ${this.consumerGroup}`);
    await this.consumeLoop();
  }

  /**
   * Stop consuming messages
   */
  stop(): void {
    this.isRunning = false;
    this.log.info(`Stopping consumer: ${this.consumerName}`);
  }

  private async consumeLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const messages = await this.redis.readFromGroup(
          this.streamName,
          this.consumerGroup,
          this.consumerName,
          this.options.count,
          this.options.block
        );

        if (messages) {
          await this.processMessages(messages);
        }
      } catch (error) {
        this.log.error('Consumer error:', error);
        await this.sleep(1000);
      }
    }
  }

  private async processMessages(messages: any): Promise<void> {
    if (!messages || !Array.isArray(messages)) return;
    for (const [, entries] of messages) {
      if (!Array.isArray(entries)) continue;
      for (const [id, fields] of entries) {
        if (Array.isArray(fields)) {
          await this.processMessage(id, fields as string[]);
          await this.redis.ack(this.streamName, this.consumerGroup, id);
        }
      }
    }
  }

  private async processMessage(id: string, fields: string[]): Promise<void> {
    try {
      const event = this.parseFieldsToEvent(fields);
      this.log.debug(`Processing: ${event.type}`, { id, eventType: event.type });

      // Call registered handlers
      const handlers = this.handlers.get(event.type) || [];
      const wildcardHandlers = this.handlers.get('*') || [];
      const allHandlers = [...handlers, ...wildcardHandlers];

      if (allHandlers.length === 0) {
        // Use EventRouter as fallback
        const router = EventRouter.getInstance();
        await router.route(event.type, event);
      }

      for (const handler of allHandlers) {
        await handler(event);
      }

      this.messagesProcessed++;
    } catch (error) {
      this.messagesFailed++;
      this.log.error(`Failed to process message ${id}:`, error);

      // Send to Dead Letter Queue
      const dlq = new DeadLetterQueue();
      await dlq.push(id, {
        eventType: fields[1],
        data: this.parseData(fields[3]),
        error: String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  private parseFieldsToEvent(fields: string[]): Event {
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      obj[fields[i]] = fields[i + 1];
    }

    return {
      id: obj.id || 'unknown',
      type: obj.eventType || 'unknown',
      source: obj.source || 'unknown',
      company: obj.company || 'unknown',
      userId: obj.userId,
      timestamp: obj.timestamp || new Date().toISOString(),
      data: this.parseData(obj.data),
      metadata: obj.metadata ? this.parseData(obj.metadata) : undefined,
    };
  }

  private parseData(data: string): any {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get consumer statistics
   */
  getStats(): {
    isRunning: boolean;
    messagesProcessed: number;
    messagesFailed: number;
    uptime: number;
  } {
    return {
      isRunning: this.isRunning,
      messagesProcessed: this.messagesProcessed,
      messagesFailed: this.messagesFailed,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}