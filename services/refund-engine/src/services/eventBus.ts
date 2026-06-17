import axios from 'axios';
import { logger } from '../utils/logger';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';

interface Event {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  source: string;
}

type EventHandler = (event: Event) => Promise<void>;

interface Subscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  pattern?: string;
}

export class EventBus {
  private subscriptions: Map<string, Subscription[]> = new Map();
  private baseUrl: string;

  constructor() {
    this.baseUrl = EVENT_BUS_URL;
  }

  /**
   * Publish an event
   */
  async publish(type: string, payload: Record<string, unknown>): Promise<boolean> {
    const event: Event = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      source: 'refund-engine'
    };

    try {
      // Publish to external event bus
      await axios.post(`${this.baseUrl}/api/events`, {
        type,
        payload,
        source: 'refund-engine',
        timestamp: event.timestamp
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.debug(`Published event: ${type}`, { payload });

      // Also handle locally
      await this.handleLocalEvent(event);

      return true;
    } catch (error) {
      logger.error(`Failed to publish event: ${type}`, error);
      return false;
    }
  }

  /**
   * Subscribe to events
   */
  async subscribe(eventType: string, handler: EventHandler, pattern?: string): Promise<string> {
    const subscriptionId = `${eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const subscription: Subscription = {
      id: subscriptionId,
      eventType,
      handler,
      pattern
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push(subscription);

    // Also subscribe to external event bus
    try {
      await axios.post(`${this.baseUrl}/api/subscriptions`, {
        eventType,
        source: 'refund-engine',
        callbackUrl: `${process.env.PUBLIC_URL || 'http://localhost:4980'}/api/events/webhook`
      }, {
        timeout: 5000
      });

      logger.info(`Subscribed to event: ${eventType}`);
    } catch (error) {
      logger.warn(`Failed to subscribe to external event: ${eventType}`, error);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(subscriptionId: string): Promise<boolean> {
    for (const [eventType, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        if (subs.length === 0) {
          this.subscriptions.delete(eventType);
        }

        logger.info(`Unsubscribed from event: ${eventType}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Handle locally published events
   */
  private async handleLocalEvent(event: Event): Promise<void> {
    const subscribers = this.subscriptions.get(event.type) || [];

    for (const sub of subscribers) {
      try {
        // Check pattern match if specified
        if (sub.pattern) {
          const pattern = new RegExp(sub.pattern.replace(/\*/g, '.*'));
          if (!pattern.test(event.type)) {
            continue;
          }
        }

        await sub.handler(event);
      } catch (error) {
        logger.error(`Error in event handler for ${event.type}:`, error);
      }
    }
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): Array<{ eventType: string; count: number }> {
    return Array.from(this.subscriptions.entries()).map(([eventType, subs]) => ({
      eventType,
      count: subs.length
    }));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const eventBus = new EventBus();

// Register default event handlers
export function initializeEventHandlers(): void {
  // Handle order events
  eventBus.subscribe('order.refund_requested', async (event) => {
    logger.info('Received order refund request event', { payload: event.payload });
    // Could trigger auto-creation of refund request
  });

  // Handle payment events
  eventBus.subscribe('payment.failed', async (event) => {
    logger.info('Received payment failed event', { payload: event.payload });
    // Could trigger refund status update
  });

  // Handle customer events
  eventBus.subscribe('customer.refund_preference_changed', async (event) => {
    logger.info('Customer refund preference changed', { payload: event.payload });
    // Could update refund policies
  });

  logger.info('Event handlers initialized');
}
