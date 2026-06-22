import { logger } from '../../shared/logger';
/**
 * NeXha Ecosystem Connector - Event Bus
 *
 * Central event bus for cross-OS communication.
 * Events flow between Distribution, Franchise, Procurement, and Manufacturing.
 */

import type { CloudEvent, AnyEvent } from '@rez/shared-types';

// ============================================================================
// Event Types
// ============================================================================

export const ECOSYSTEM_EVENTS = {
  // Demand signals
  DEMAND_SIGNAL: 'ecosystem.demand.signal',
  ORDER_PLACED: 'ecosystem.order.placed',

  // Inventory signals
  INVENTORY_LOW: 'ecosystem.inventory.low',
  INVENTORY_OUT: 'ecosystem.inventory.out',
  REORDER_TRIGGERED: 'ecosystem.inventory.reorder',

  // Procurement
  PROCUREMENT_CREATED: 'ecosystem.procurement.created',
  PROCUREMENT_FULFILLED: 'ecosystem.procurement.fulfilled',

  // Distribution
  DISTRIBUTION_ORDER: 'ecosystem.distribution.order',

  // Manufacturing
  PRODUCTION_COMPLETED: 'ecosystem.production.completed',
  BATCH_RELEASED: 'ecosystem.production.batch_released',

  // Finance
  CREDIT_APPROVED: 'ecosystem.finance.credit_approved',
  PAYMENT_RECEIVED: 'ecosystem.finance.payment_received',

  // Intelligence
  DEMAND_PREDICTED: 'ecosystem.intelligence.demand_predicted',
  CHURN_ALERT: 'ecosystem.intelligence.churn_alert',
} as const;

// ============================================================================
// Event Handlers
// ============================================================================

type EventHandler = (event: CloudEvent) => Promise<void>;

interface HandlerEntry {
  handler: EventHandler;
  priority: number;
}

class EventBus {
  private handlers: Map<string, HandlerEntry[]> = new Map();
  private eventHistory: CloudEvent[] = [];
  private maxHistory = 1000;

  /**
   * Subscribe to an event
   */
  subscribe<T extends AnyEvent>(
    eventType: T | T[],
    handler: EventHandler,
    priority = 100
  ): () => void {
    const types = Array.isArray(eventType) ? eventType : [eventType];

    for (const type of types) {
      const existing = this.handlers.get(type) || [];
      existing.push({ handler, priority });
      existing.sort((a, b) => a.priority - b.priority);
      this.handlers.set(type, existing);
    }

    // Return unsubscribe function
    return () => {
      for (const type of types) {
        const handlers = this.handlers.get(type) || [];
        const filtered = handlers.filter(h => h.handler !== handler);
        if (filtered.length === 0) {
          this.handlers.delete(type);
        } else {
          this.handlers.set(type, filtered);
        }
      }
    };
  }

  /**
   * Publish an event
   */
  async publish<T>(event: CloudEvent<T>): Promise<void> {
    // Store in history
    this.eventHistory.push(event as CloudEvent);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    // Find matching handlers
    const handlers = this.handlers.get(event.type as string) || [];

    // Also check for wildcard handlers
    const wildcardHandlers = this.handlers.get('*') || [];

    const allHandlers = [...handlers, ...wildcardHandlers];

    // Execute all handlers
    await Promise.all(
      allHandlers.map(async ({ handler }) => {
        try {
          await handler(event as CloudEvent);
        } catch (error) {
          logger.error(`Event handler error for ${event.type}:`, error);
        }
      })
    );
  }

  /**
   * Get event history
   */
  getHistory(filters?: {
    type?: string;
    source?: string;
    limit?: number;
  }): CloudEvent[] {
    let results = [...this.eventHistory];

    if (filters?.type) {
      results = results.filter(e => e.type === filters.type);
    }
    if (filters?.source) {
      results = results.filter(e => e.source === filters.source);
    }
    if (filters?.limit) {
      results = results.slice(-filters.limit);
    }

    return results;
  }
}

export const eventBus = new EventBus();
