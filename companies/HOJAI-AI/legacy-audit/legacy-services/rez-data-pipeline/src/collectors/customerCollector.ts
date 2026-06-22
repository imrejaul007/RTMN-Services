/**
 * Customer Events Collector
 * Collects customer behavior events (search, view, cart actions)
 */

export interface CustomerEvent {
  eventType: 'search' | 'view' | 'cart_add' | 'cart_abandon';
  customerId: string;
  merchantId?: string;
  itemId?: string;
  query?: string;
  timestamp: Date;
}

export interface EnrichedCustomerEvent extends CustomerEvent {
  customerTier?: 'new' | 'regular' | 'vip';
  sessionData?: {
    sessionId: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
    platform: 'ios' | 'android' | 'web';
  };
  geoLocation?: {
    latitude: number;
    longitude: number;
    city?: string;
  };
  timeFeatures?: {
    hourOfDay: number;
    dayOfWeek: string;
    isWeekend: boolean;
  };
  itemDetails?: {
    name: string;
    category: string;
    price: number;
    merchantName?: string;
  };
  searchContext?: {
    category?: string;
    filters?: Record<string, any>;
    resultsCount?: number;
  };
}

export type CustomerEventHandler = (event: EnrichedCustomerEvent) => Promise<void>;

export class CustomerCollector {
  private handlers: CustomerEventHandler[] = [];
  private eventBuffer: CustomerEvent[] = [];
  private bufferSize: number;
  private flushIntervalMs: number;
  private flushTimer?: NodeJS.Timeout;
  private metrics = {
    totalCollected: 0,
    byType: {
      search: 0,
      view: 0,
      cart_add: 0,
      cart_abandon: 0
    }
  };

  constructor(options: { bufferSize?: number; flushIntervalMs?: number } = {}) {
    this.bufferSize = options.bufferSize ?? 100;
    this.flushIntervalMs = options.flushIntervalMs ?? 5000;
  }

  /**
   * Register an event handler
   */
  onEvent(handler: CustomerEventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Collect a customer event
   */
  async collect(event: CustomerEvent): Promise<void> {
    if (!this.validateEvent(event)) {
      throw new Error(`Invalid customer event: ${JSON.stringify(event)}`);
    }

    // Update metrics
    this.metrics.totalCollected++;
    this.metrics.byType[event.eventType]++;

    this.eventBuffer.push(event);

    if (this.eventBuffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Record a search event
   */
  async recordSearch(
    customerId: string,
    query: string,
    options?: { merchantId?: string; category?: string }
  ): Promise<void> {
    return this.collect({
      eventType: 'search',
      customerId,
      query,
      merchantId: options?.merchantId,
      timestamp: new Date()
    });
  }

  /**
   * Record a view event
   */
  async recordView(
    customerId: string,
    itemId: string,
    options?: { merchantId?: string }
  ): Promise<void> {
    return this.collect({
      eventType: 'view',
      customerId,
      itemId,
      merchantId: options?.merchantId,
      timestamp: new Date()
    });
  }

  /**
   * Record a cart add event
   */
  async recordCartAdd(
    customerId: string,
    itemId: string,
    options?: { merchantId?: string }
  ): Promise<void> {
    return this.collect({
      eventType: 'cart_add',
      customerId,
      itemId,
      merchantId: options?.merchantId,
      timestamp: new Date()
    });
  }

  /**
   * Record cart abandonment
   */
  async recordCartAbandon(
    customerId: string,
    options?: { merchantId?: string; items?: string[] }
  ): Promise<void> {
    return this.collect({
      eventType: 'cart_abandon',
      customerId,
      merchantId: options?.merchantId,
      items: options?.items,
      timestamp: new Date()
    });
  }

  /**
   * Start periodic flush
   */
  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  /**
   * Stop and flush remaining
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }

  /**
   * Get collection metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    for (const event of events) {
      for (const handler of this.handlers) {
        try {
          await handler(event as EnrichedCustomerEvent);
        } catch (error) {
          console.error(`Error processing customer event:`, error);
        }
      }
    }
  }

  private validateEvent(event: CustomerEvent): boolean {
    if (typeof event !== 'object') return false;
    if (!['search', 'view', 'cart_add', 'cart_abandon'].includes(event.eventType)) return false;
    if (typeof event.customerId !== 'string' || !event.customerId) return false;
    if (event.eventType === 'search' && (!event.query || typeof event.query !== 'string')) return false;
    if (['view', 'cart_add'].includes(event.eventType) && (!event.itemId || typeof event.itemId !== 'string')) return false;
    if (!(event.timestamp instanceof Date)) return false;
    return true;
  }
}

export const customerCollector = new CustomerCollector();
