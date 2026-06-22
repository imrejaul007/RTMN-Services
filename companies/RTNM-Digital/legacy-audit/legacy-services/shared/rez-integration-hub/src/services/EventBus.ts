/**
 * Event Bus - Unified pub/sub for cross-company events
 *
 * Handles event flow between:
 * - RABTUL (user actions, transactions)
 * - REZ-Intelligence (AI predictions, insights)
 * - REZ-Media (ads, campaigns, engagement)
 * - BuzzLocal (local events, safety alerts)
 */

import { v4 as uuidv4 } from 'uuid';

export type EventType =
  | 'user.action'
  | 'user.signup'
  | 'user.login'
  | 'user.purchase'
  | 'user.location'
  | 'ai.intent_predicted'
  | 'ai.segment_updated'
  | 'ai.churn_risk_alert'
  | 'media.ad_viewed'
  | 'media.ad_clicked'
  | 'media.campaign_completed'
  | 'local.checkin'
  | 'local.alert'
  | 'local.sos'
  | 'payment.completed'
  | 'payment.failed'
  | 'wallet.credited'
  | 'wallet.debited'
  | 'karma.earned'
  | 'karma.redeemed'
  | 'notification.sent'
  | 'custom';

export interface Event {
  id: string;
  type: EventType;
  source: string;
  company: 'RABTUL' | 'REZ-Intelligence' | 'REZ-Media' | 'REZ-Consumer' | 'REZ-Merchant' | 'External';
  userId?: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: {
    sessionId?: string;
    deviceId?: string;
    ip?: string;
    location?: { lat: number; lng: number };
  };
}

type EventHandler = (event: Event) => Promise<void>;

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private eventHistory: Event[] = [];
  private maxHistorySize = 1000;

  constructor() {
    // Initialize default handlers
    this.setupDefaultHandlers();
  }

  private setupDefaultHandlers() {
    // Auto-subscribe to all events for logging
    this.on('*', async (event) => {
      console.log(`[EventBus] ${event.company} -> ${event.type}:`, JSON.stringify(event.data).slice(0, 200));
    });
  }

  /**
   * Subscribe to an event type
   * Use '*' to subscribe to all events
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }

  /**
   * Publish an event to all subscribers
   */
  async publish(event: Omit<Event, 'id' | 'timestamp'>): Promise<string> {
    const fullEvent: Event = {
      ...event,
      id: uuidv4(),
      timestamp: new Date(),
    };

    // Store in history
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get matching handlers
    const wildcardHandlers = this.handlers.get('*') || [];
    const specificHandlers = this.handlers.get(event.type) || [];
    const allHandlers = [...wildcardHandlers, ...specificHandlers];

    // Execute all handlers
    await Promise.allSettled(allHandlers.map(handler => handler(fullEvent)));

    return fullEvent.id;
  }

  /**
   * Get events by type
   */
  getEvents(type?: string, limit = 100): Event[] {
    let events = this.eventHistory;

    if (type) {
      events = events.filter(e => e.type === type);
    }

    return events.slice(-limit);
  }

  /**
   * Get events for a specific user
   */
  getUserEvents(userId: string, limit = 100): Event[] {
    return this.eventHistory
      .filter(e => e.userId === userId)
      .slice(-limit);
  }

  /**
   * Get events by company
   */
  getCompanyEvents(company: string, limit = 100): Event[] {
    return this.eventHistory
      .filter(e => e.company === company)
      .slice(-limit);
  }

  /**
   * Clear event history
   */
  clear(): void {
    this.eventHistory = [];
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByCompany: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsByCompany: Record<string, number> = {};

    this.eventHistory.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByCompany[event.company] = (eventsByCompany[event.company] || 0) + 1;
    });

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      eventsByCompany,
    };
  }
}

// Convenience event creators
export const createUserEvent = (
  type: EventType,
  userId: string,
  data: Record<string, any>,
  source: string,
  company: Event['company']
): Omit<Event, 'id' | 'timestamp'> => ({
  type,
  userId,
  source,
  company,
  data,
});

export const createSystemEvent = (
  type: EventType,
  data: Record<string, any>,
  source: string,
  company: Event['company']
): Omit<Event, 'id' | 'timestamp'> => ({
  type,
  source,
  company,
  data,
});
