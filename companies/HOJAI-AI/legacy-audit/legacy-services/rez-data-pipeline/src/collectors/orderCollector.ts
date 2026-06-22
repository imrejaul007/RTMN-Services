/**
 * Order Events Collector
 * Collects order events from various sources (app, QR, aggregators)
 */

export interface OrderEvent {
  eventType: 'order_created' | 'order_completed' | 'order_cancelled';
  merchantId: string;
  orderId: string;
  customerId: string;
  amount: number;
  items: string[];
  timestamp: Date;
  source: 'app' | 'qr' | 'aggregator';
}

export interface EnrichedOrderEvent extends OrderEvent {
  customerTier?: 'new' | 'regular' | 'vip';
  customerLifetimeValue?: number;
  itemsWithPrices?: Array<{ itemId: string; name: string; price: number; quantity: number }>;
  geoLocation?: {
    latitude: number;
    longitude: number;
    city?: string;
    region?: string;
  };
  timeFeatures?: {
    hourOfDay: number;
    dayOfWeek: string;
    isWeekend: boolean;
    isRushHour: boolean;
  };
  merchantName?: string;
  orderSourceName?: string;
}

export type OrderEventHandler = (event: EnrichedOrderEvent) => Promise<void>;

export class OrderCollector {
  private handlers: OrderEventHandler[] = [];
  private eventBuffer: OrderEvent[] = [];
  private bufferSize: number;
  private flushIntervalMs: number;
  private flushTimer?: NodeJS.Timeout;

  constructor(options: { bufferSize?: number; flushIntervalMs?: number } = {}) {
    this.bufferSize = options.bufferSize ?? 100;
    this.flushIntervalMs = options.flushIntervalMs ?? 5000;
  }

  /**
   * Register an event handler
   */
  onEvent(handler: OrderEventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Collect an order event from any source
   */
  async collect(event: OrderEvent): Promise<void> {
    // Validate event
    if (!this.validateEvent(event)) {
      throw new Error(`Invalid order event: ${JSON.stringify(event)}`);
    }

    // Add to buffer
    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Collect from app source
   */
  async collectFromApp(event: Omit<OrderEvent, 'source'>): Promise<void> {
    return this.collect({ ...event, source: 'app' });
  }

  /**
   * Collect from QR code source
   */
  async collectFromQR(event: Omit<OrderEvent, 'source'>): Promise<void> {
    return this.collect({ ...event, source: 'qr' });
  }

  /**
   * Collect from aggregator source
   */
  async collectFromAggregator(event: Omit<OrderEvent, 'source'>): Promise<void> {
    return this.collect({ ...event, source: 'aggregator' });
  }

  /**
   * Start periodic flush timer
   */
  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  /**
   * Stop periodic flush and flush remaining events
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }

  /**
   * Flush buffered events to handlers
   */
  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    for (const event of events) {
      for (const handler of this.handlers) {
        try {
          await handler(event as EnrichedOrderEvent);
        } catch (error) {
          console.error(`Error processing order event ${event.orderId}:`, error);
        }
      }
    }
  }

  /**
   * Validate event structure
   */
  private validateEvent(event: OrderEvent): boolean {
    return (
      typeof event === 'object' &&
      ['order_created', 'order_completed', 'order_cancelled'].includes(event.eventType) &&
      typeof event.merchantId === 'string' &&
      event.merchantId.length > 0 &&
      typeof event.orderId === 'string' &&
      event.orderId.length > 0 &&
      typeof event.customerId === 'string' &&
      event.customerId.length > 0 &&
      typeof event.amount === 'number' &&
      event.amount >= 0 &&
      Array.isArray(event.items) &&
      event.timestamp instanceof Date &&
      ['app', 'qr', 'aggregator'].includes(event.source)
    );
  }
}

export const orderCollector = new OrderCollector();
