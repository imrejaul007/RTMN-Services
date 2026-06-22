/**
 * CDP Sink (Customer Data Platform)
 * Sends customer data and profiles to CDP
 */

import axios, { AxiosInstance } from 'axios';

export interface CustomerProfile {
  customerId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  tier: 'new' | 'regular' | 'vip';
  lifetimeValue: number;
  totalOrders: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
  preferredCategories?: string[];
  preferredMerchants?: string[];
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  properties: Record<string, any>;
  updatedAt: Date;
}

export interface CDPConfig {
  endpoint: string;
  apiKey?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  retryAttempts?: number;
  timeoutMs?: number;
  identifyEndpoint?: string;
  trackEndpoint?: string;
}

export class CDPSink {
  private client: AxiosInstance;
  private profileBuffer: CustomerProfile[] = [];
  private trackBuffer: any[] = [];
  private batchSize: number;
  private flushIntervalMs: number;
  private retryAttempts: number;
  private timeoutMs: number;
  private flushTimer?: NodeJS.Timeout;
  private metrics = {
    profilesUpdated: 0,
    eventsTracked: 0,
    failed: 0,
    retryCount: 0
  };

  constructor(config: CDPConfig) {
    this.batchSize = config.batchSize ?? 50;
    this.flushIntervalMs = config.flushIntervalMs ?? 10000;
    this.retryAttempts = config.retryAttempts ?? 3;
    this.timeoutMs = config.timeoutMs ?? 15000;

    this.client = axios.create({
      baseURL: config.endpoint,
      timeout: this.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });

    this.identifyEndpoint = config.identifyEndpoint || '/customers/identify';
    this.trackEndpoint = config.trackEndpoint || '/events/track';
  }

  private identifyEndpoint: string;
  private trackEndpoint: string;

  /**
   * Identify/update a customer profile
   */
  async identify(profile: CustomerProfile): Promise<void> {
    this.profileBuffer.push({
      ...profile,
      updatedAt: new Date()
    });

    if (this.profileBuffer.length >= this.batchSize) {
      await this.flushProfiles();
    }
  }

  /**
   * Identify customer from order event
   */
  async identifyFromOrder(
    customerId: string,
    orderData: {
      merchantId: string;
      amount: number;
      items: string[];
      tier?: 'new' | 'regular' | 'vip';
    }
  ): Promise<void> {
    const profile: CustomerProfile = {
      customerId,
      tier: orderData.tier || 'new',
      lifetimeValue: orderData.amount,
      totalOrders: 1,
      averageOrderValue: orderData.amount,
      lastOrderDate: new Date(),
      preferredMerchants: [orderData.merchantId],
      properties: {
        lastOrderAmount: orderData.amount,
        lastOrderItems: orderData.items
      },
      updatedAt: new Date()
    };

    await this.identify(profile);
  }

  /**
   * Update customer tier
   */
  async updateCustomerTier(
    customerId: string,
    tier: 'new' | 'regular' | 'vip',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.track('customer_tier_updated', customerId, {
      tier,
      previousTier: metadata?.previousTier,
      reason: metadata?.reason || 'order_milestone'
    });
  }

  /**
   * Track a customer event
   */
  async track(eventName: string, customerId: string, properties?: Record<string, any>): Promise<void> {
    this.trackBuffer.push({
      event: eventName,
      customerId,
      properties: properties || {},
      timestamp: new Date().toISOString()
    });

    if (this.trackBuffer.length >= this.batchSize) {
      await this.flushTrack();
    }
  }

  /**
   * Track order completion
   */
  async trackOrderComplete(
    customerId: string,
    orderId: string,
    orderDetails: {
      merchantId: string;
      amount: number;
      items: string[];
      source: 'app' | 'qr' | 'aggregator';
    }
  ): Promise<void> {
    await this.track('order_completed', customerId, {
      orderId,
      merchantId: orderDetails.merchantId,
      orderValue: orderDetails.amount,
      itemCount: orderDetails.items.length,
      source: orderDetails.source
    });
  }

  /**
   * Track cart events
   */
  async trackCartEvent(
    eventType: 'add' | 'remove' | 'abandon' | 'recover',
    customerId: string,
    cartData: {
      merchantId?: string;
      itemId?: string;
      items?: string[];
      totalValue?: number;
    }
  ): Promise<void> {
    await this.track(`cart_${eventType}`, customerId, {
      merchantId: cartData.merchantId,
      itemId: cartData.itemId,
      itemCount: cartData.items?.length || 0,
      cartValue: cartData.totalValue
    });
  }

  /**
   * Track customer engagement
   */
  async trackEngagement(
    customerId: string,
    engagementType: 'search' | 'view' | 'click' | 'session',
    details: Record<string, any>
  ): Promise<void> {
    await this.track(engagementType, customerId, details);
  }

  /**
   * Start periodic flush
   */
  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flushProfiles();
      this.flushTrack();
    }, this.flushIntervalMs);
  }

  /**
   * Stop and flush remaining
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    await Promise.all([this.flushProfiles(), this.flushTrack()]);
  }

  /**
   * Flush profile buffer
   */
  private async flushProfiles(): Promise<void> {
    if (this.profileBuffer.length === 0) return;

    const profiles = [...this.profileBuffer];
    this.profileBuffer = [];

    await this.sendWithRetry(profiles, this.identifyEndpoint, 'profiles');
  }

  /**
   * Flush track buffer
   */
  private async flushTrack(): Promise<void> {
    if (this.trackBuffer.length === 0) return;

    const events = [...this.trackBuffer];
    this.trackBuffer = [];

    await this.sendWithRetry(events, this.trackEndpoint, 'tracks');
  }

  /**
   * Send with retry logic
   */
  private async sendWithRetry(
    data: any[],
    endpoint: string,
    type: 'profiles' | 'tracks'
  ): Promise<void> {
    let attempt = 0;

    while (attempt < this.retryAttempts) {
      try {
        await this.client.post(endpoint, {
          [type]: data,
          timestamp: new Date().toISOString()
        });

        if (type === 'profiles') {
          this.metrics.profilesUpdated += data.length;
        } else {
          this.metrics.eventsTracked += data.length;
        }
        return;
      } catch (error) {
        attempt++;
        this.metrics.retryCount++;

        if (attempt < this.retryAttempts) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    this.metrics.failed += data.length;
    console.error(`Failed to send ${data.length} ${type} to CDP after ${this.retryAttempts} attempts`);
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
  getBufferStatus(): { profileBufferSize: number; trackBufferSize: number } {
    return {
      profileBufferSize: this.profileBuffer.length,
      trackBufferSize: this.trackBuffer.length
    };
  }
}

// Default instance
export const cdpSink = new CDPSink({
  endpoint: process.env.CDP_ENDPOINT || 'https://cdp.rez.app/api/v1',
  apiKey: process.env.CDP_API_KEY
});
