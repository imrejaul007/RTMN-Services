/**
 * Analytics client for Merchant SDK
 */

import { AxiosInstance } from 'axios';
import {
  AnalyticsEvent,
  AnalyticsTrackResponse,
  QRSource,
  AnalyticsEventType,
} from './types/analytics';

interface MerchantSDKConfig {
  baseUrl: string;
  debug: boolean;
}

export class AnalyticsClient {
  private client: AxiosInstance;
  private config: MerchantSDKConfig;

  constructor(client: AxiosInstance, config: MerchantSDKConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Track a QR analytics event
   */
  async track(
    storeId: string | undefined,
    event: AnalyticsEventType,
    options?: {
      metadata?: Record<string, unknown>;
      customerId?: string;
      sessionId?: string;
      source?: QRSource;
    }
  ): Promise<void> {
    try {
      await this.client.post<AnalyticsTrackResponse>(
        '/qr/public/analytics/track',
        {
          storeId,
          event,
          metadata: options?.metadata,
          customerId: options?.customerId,
          sessionId: options?.sessionId,
          source: options?.source || 'unknown',
        }
      );
    } catch (error) {
      // Don't throw - analytics should be non-blocking
      if (this.config.debug) {
        console.error('[AnalyticsClient] Track error:', error);
      }
    }
  }

  /**
   * Track QR scan event
   */
  async trackScan(
    storeId: string,
    options?: {
      customerId?: string;
      sessionId?: string;
      source?: QRSource;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    return this.track(storeId, 'qr_scan', {
      source: options?.source,
      customerId: options?.customerId,
      sessionId: options?.sessionId,
      metadata: options?.metadata,
    });
  }

  /**
   * Track menu view event
   */
  async trackMenuView(
    storeId: string,
    options?: {
      customerId?: string;
      sessionId?: string;
      source?: QRSource;
    }
  ): Promise<void> {
    return this.track(storeId, 'view_menu', {
      source: options?.source,
      customerId: options?.customerId,
      sessionId: options?.sessionId,
    });
  }

  /**
   * Track add to cart event
   */
  async trackAddToCart(
    storeId: string,
    productId: string,
    quantity: number,
    options?: {
      customerId?: string;
      sessionId?: string;
      source?: QRSource;
    }
  ): Promise<void> {
    return this.track(storeId, 'add_to_cart', {
      source: options?.source,
      customerId: options?.customerId,
      sessionId: options?.sessionId,
      metadata: { productId, quantity },
    });
  }

  /**
   * Track order placed event
   */
  async trackOrder(
    storeId: string,
    orderId: string,
    total: number,
    options?: {
      customerId?: string;
      sessionId?: string;
      source?: QRSource;
    }
  ): Promise<void> {
    return this.track(storeId, 'place_order', {
      source: options?.source,
      customerId: options?.customerId,
      sessionId: options?.sessionId,
      metadata: { orderId, total },
    });
  }

  /**
   * Track appointment booking event
   */
  async trackBooking(
    storeId: string,
    serviceId: string,
    appointmentTime: string,
    options?: {
      customerId?: string;
      sessionId?: string;
      source?: QRSource;
    }
  ): Promise<void> {
    return this.track(storeId, 'book_appointment', {
      source: options?.source,
      customerId: options?.customerId,
      sessionId: options?.sessionId,
      metadata: { serviceId, appointmentTime },
    });
  }

  /**
   * Track campaign view event
   */
  async trackCampaignView(
    campaignId: string,
    options?: {
      storeId?: string;
      customerId?: string;
      sessionId?: string;
      source?: QRSource;
    }
  ): Promise<void> {
    return this.track(options?.storeId, 'campaign_viewed', {
      source: options?.source,
      customerId: options?.customerId,
      sessionId: options?.sessionId,
      metadata: { campaignId },
    });
  }
}
