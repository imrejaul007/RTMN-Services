/**
 * Analytics Sink
 * Sends enriched events to analytics service
 */

import axios, { AxiosInstance } from 'axios';

export interface AnalyticsEvent {
  eventType: string;
  eventName: string;
  merchantId: string;
  customerId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  timestamp: Date;
  enriched?: boolean;
}

export interface AnalyticsConfig {
  endpoint: string;
  apiKey?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

export class AnalyticsSink {
  private client: AxiosInstance;
  private eventBuffer: AnalyticsEvent[] = [];
  private batchSize: number;
  private flushIntervalMs: number;
  private retryAttempts: number;
  private retryDelayMs: number;
  private flushTimer?: NodeJS.Timeout;
  private metrics = {
    sent: 0,
    failed: 0,
    retryCount: 0,
    bufferSize: 0
  };

  constructor(config: AnalyticsConfig) {
    this.batchSize = config.batchSize ?? 100;
    this.flushIntervalMs = config.flushIntervalMs ?? 5000;
    this.retryAttempts = config.retryAttempts ?? 3;
    this.retryDelayMs = config.retryDelayMs ?? 1000;

    this.client = axios.create({
      baseURL: config.endpoint,
      timeout: config.timeoutMs ?? 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
  }

  /**
   * Send an event to analytics
   */
  async send(event: AnalyticsEvent): Promise<void> {
    this.eventBuffer.push({
      ...event,
      enriched: true,
      timestamp: event.timestamp || new Date()
    });

    this.metrics.bufferSize = this.eventBuffer.length;

    if (this.eventBuffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Send batch of events
   */
  async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    for (const event of events) {
      await this.send(event);
    }
  }

  /**
   * Send order event
   */
  async sendOrderEvent(
    eventType: 'order_created' | 'order_completed' | 'order_cancelled',
    merchantId: string,
    orderId: string,
    customerId: string,
    properties: Record<string, any>
  ): Promise<void> {
    await this.send({
      eventType: 'order',
      eventName: eventType,
      merchantId,
      customerId,
      properties: {
        orderId,
        ...properties
      },
      timestamp: new Date()
    });
  }

  /**
   * Send customer event
   */
  async sendCustomerEvent(
    eventType: 'search' | 'view' | 'cart_add' | 'cart_abandon',
    merchantId: string,
    customerId: string,
    properties: Record<string, any>
  ): Promise<void> {
    await this.send({
      eventType: 'customer',
      eventName: eventType,
      merchantId,
      customerId,
      properties,
      timestamp: new Date()
    });
  }

  /**
   * Send behavior event
   */
  async sendBehaviorEvent(
    eventName: string,
    customerId: string,
    sessionId: string,
    properties: Record<string, any>
  ): Promise<void> {
    await this.send({
      eventType: 'behavior',
      eventName,
      merchantId: 'global',
      customerId,
      sessionId,
      properties,
      timestamp: new Date()
    });
  }

  /**
   * Send revenue metric
   */
  async sendRevenueMetric(
    merchantId: string,
    revenue: number,
    orderCount: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.send({
      eventType: 'metric',
      eventName: 'revenue',
      merchantId,
      properties: {
        revenue,
        orderCount,
        averageOrderValue: orderCount > 0 ? revenue / orderCount : 0,
        ...metadata
      },
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
   * Flush buffer to analytics service
   */
  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    this.metrics.bufferSize = 0;

    await this.sendWithRetry(events);
  }

  /**
   * Send events with retry logic
   */
  private async sendWithRetry(events: AnalyticsEvent[]): Promise<void> {
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        await this.client.post('/events/batch', {
          events,
          timestamp: new Date().toISOString()
        });

        this.metrics.sent += events.length;
        return;
      } catch (error) {
        attempt++;
        this.metrics.retryCount++;

        if (attempt < this.retryAttempts) {
          await this.sleep(this.retryDelayMs * attempt);
        }
      }
    }

    // All retries failed
    this.metrics.failed += events.length;
    console.error(`Failed to send ${events.length} events to analytics after ${this.retryAttempts} attempts`);

    // Optionally re-add to buffer for later retry
    // this.eventBuffer.unshift(...events);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sink metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Get buffer status
   */
  getBufferStatus(): { currentSize: number; batchSize: number } {
    return {
      currentSize: this.eventBuffer.length,
      batchSize: this.batchSize
    };
  }
}

// Default instance
export const analyticsSink = new AnalyticsSink({
  endpoint: process.env.ANALYTICS_ENDPOINT || 'https://analytics.rez.app/api/v1',
  apiKey: process.env.ANALYTICS_API_KEY
});
