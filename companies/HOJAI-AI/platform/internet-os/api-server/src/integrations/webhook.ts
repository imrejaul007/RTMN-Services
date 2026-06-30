/**
 * Webhook Bus Integration
 *
 * REUSES: Webhook Bus (port 4110)
 * DO NOT build new notification system - use this bridge
 */

import axios from 'axios';
import { config } from '../config.js';

const WEBHOOK_BUS_URL = config.services.webhookBus;

export interface WebhookEvent {
  eventType: string;
  payload: Record<string, any>;
  timestamp?: string;
}

export interface WebhookSubscription {
  url: string;
  events: string[];
  label?: string;
  secret?: string;
  maxAttempts?: number;
}

export class WebhookIntegration {
  private internalToken: string;

  constructor(token?: string) {
    this.internalToken = token || config.auth.internalToken;
  }

  private get headers() {
    return {
      'x-internal-token': this.internalToken,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Subscribe to events
   */
  async subscribe(subscription: WebhookSubscription): Promise<any> {
    try {
      const response = await axios.post(
        `${WEBHOOK_BUS_URL}/api/subscribers`,
        {
          url: subscription.url,
          events: subscription.events,
          label: subscription.label || 'internet-os',
          secret: subscription.secret || `whsec_${Date.now()}`,
          maxAttempts: subscription.maxAttempts || 5,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe
   */
  async unsubscribe(subscriberId: string): Promise<void> {
    try {
      await axios.delete(`${WEBHOOK_BUS_URL}/api/subscribers/${subscriberId}`, {
        headers: this.headers,
      });
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }

  /**
   * List subscriptions
   */
  async listSubscriptions(): Promise<any[]> {
    try {
      const response = await axios.get(`${WEBHOOK_BUS_URL}/api/subscribers`, {
        headers: this.headers,
      });
      return response.data.subscribers || [];
    } catch (error) {
      console.error('Failed to list subscriptions:', error);
      return [];
    }
  }

  /**
   * Dispatch an event
   */
  async dispatch(event: WebhookEvent): Promise<any> {
    try {
      const response = await axios.post(
        `${WEBHOOK_BUS_URL}/api/dispatch`,
        {
          eventType: event.eventType,
          payload: {
            ...event.payload,
            source: 'internet-os',
            timestamp: event.timestamp || new Date().toISOString(),
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to dispatch event:', error);
      throw error;
    }
  }

  // Convenience methods for common events

  /**
   * Notify scrape completion
   */
  async notifyScrapeComplete(
    actorId: string,
    itemsFound: number,
    duration: number,
    source: string
  ): Promise<any> {
    return this.dispatch({
      eventType: 'scrape.completed',
      payload: {
        actorId,
        itemsFound,
        duration,
        source,
      },
    });
  }

  /**
   * Notify scrape failure
   */
  async notifyScrapeFailed(
    actorId: string,
    error: string,
    source: string
  ): Promise<any> {
    return this.dispatch({
      eventType: 'scrape.failed',
      payload: {
        actorId,
        error,
        source,
      },
    });
  }

  /**
   * Notify watcher change
   */
  async notifyWatcherChange(
    watcherId: string,
    changeType: 'added' | 'removed' | 'modified',
    oldValue: any,
    newValue: any
  ): Promise<any> {
    return this.dispatch({
      eventType: 'watcher.change',
      payload: {
        watcherId,
        changeType,
        oldValue,
        newValue,
      },
    });
  }

  /**
   * Notify new entity discovered
   */
  async notifyNewEntity(
    entityType: string,
    entityName: string,
    source: string
  ): Promise<any> {
    return this.dispatch({
      eventType: 'entity.discovered',
      payload: {
        entityType,
        entityName,
        source,
      },
    });
  }

  /**
   * Notify price change
   */
  async notifyPriceChange(
    productId: string,
    oldPrice: number,
    newPrice: number,
    currency: string
  ): Promise<any> {
    return this.dispatch({
      eventType: 'price.changed',
      payload: {
        productId,
        oldPrice,
        newPrice,
        currency,
        changePercent: oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0,
      },
    });
  }

  /**
   * Notify competitor action
   */
  async notifyCompetitorAction(
    competitor: string,
    action: string,
    details: Record<string, any>
  ): Promise<any> {
    return this.dispatch({
      eventType: 'competitor.action',
      payload: {
        competitor,
        action,
        details,
      },
    });
  }

  /**
   * Get delivery history
   */
  async getDeliveries(status?: 'pending' | 'delivered' | 'failed'): Promise<any[]> {
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;

      const response = await axios.get(`${WEBHOOK_BUS_URL}/api/deliveries`, {
        params,
        headers: this.headers,
      });
      return response.data.deliveries || [];
    } catch (error) {
      console.error('Failed to get deliveries:', error);
      return [];
    }
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<void> {
    try {
      await axios.post(
        `${WEBHOOK_BUS_URL}/api/deliveries/${deliveryId}/retry`,
        {},
        { headers: this.headers }
      );
    } catch (error) {
      console.error(`Failed to retry delivery ${deliveryId}:`, error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${WEBHOOK_BUS_URL}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let instance: WebhookIntegration | null = null;

export function getWebhookIntegration(token?: string): WebhookIntegration {
  if (!instance) {
    instance = new WebhookIntegration(token);
  }
  return instance;
}

export const webhookIntegration = new WebhookIntegration();
export default webhookIntegration;
