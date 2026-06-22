/**
 * Merchant Events for Capital Service
 * Listens to merchant events from the event bus
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger';

// Configuration
const EVENT_BUS_ENABLED = process.env.EVENT_BUS_ENABLED !== 'false';

// Event types
export interface MerchantCreatedEvent {
  merchantId: string;
  name: string;
  ownerId: string;
  email: string;
  stores: string[];
  timestamp: string;
}

export interface MerchantUpdatedEvent {
  merchantId: string;
  changes: Record<string, unknown>;
  timestamp: string;
}

export interface MerchantStoreAddedEvent {
  merchantId: string;
  storeId: string;
  name: string;
  address?: Record<string, unknown>;
  timestamp: string;
}

export interface MerchantStoreClosedEvent {
  merchantId: string;
  storeId: string;
  reason?: string;
  timestamp: string;
}

export interface MerchantRevenueUpdateEvent {
  merchantId: string;
  storeId?: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  period: string;
  timestamp: string;
}

// Event emitter for internal use
const merchantEventEmitter = new EventEmitter();

/**
 * Handle merchant.created event
 */
async function handleMerchantCreated(event: MerchantCreatedEvent): Promise<void> {
  logger.info('[Capital:MerchantEvents] Processing merchant.created', {
    merchantId: event.merchantId,
    name: event.name,
  });

  try {
    // New merchant - could trigger initial eligibility check
    merchantEventEmitter.emit('merchant:created', event);
  } catch (error) {
    logger.error('[Capital:MerchantEvents] Error processing merchant.created', {
      merchantId: event.merchantId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle merchant.updated event
 */
async function handleMerchantUpdated(event: MerchantUpdatedEvent): Promise<void> {
  logger.info('[Capital:MerchantEvents] Processing merchant.updated', {
    merchantId: event.merchantId,
  });

  try {
    // Merchant updated - may affect credit eligibility
    merchantEventEmitter.emit('merchant:updated', event);
  } catch (error) {
    logger.error('[Capital:MerchantEvents] Error processing merchant.updated', {
      merchantId: event.merchantId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle merchant.store.added event
 */
async function handleStoreAdded(event: MerchantStoreAddedEvent): Promise<void> {
  logger.info('[Capital:MerchantEvents] Processing merchant.store.added', {
    merchantId: event.merchantId,
    storeId: event.storeId,
  });

  try {
    // New store added - update merchant profile for credit decisions
    merchantEventEmitter.emit('merchant:store_added', event);
  } catch (error) {
    logger.error('[Capital:MerchantEvents] Error processing merchant.store.added', {
      merchantId: event.merchantId,
      storeId: event.storeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle merchant.store.closed event
 */
async function handleStoreClosed(event: MerchantStoreClosedEvent): Promise<void> {
  logger.warn('[Capital:MerchantEvents] Processing merchant.store.closed', {
    merchantId: event.merchantId,
    storeId: event.storeId,
    reason: event.reason,
  });

  try {
    // Store closed - reassess credit risk
    merchantEventEmitter.emit('merchant:store_closed', event);
  } catch (error) {
    logger.error('[Capital:MerchantEvents] Error processing merchant.store.closed', {
      merchantId: event.merchantId,
      storeId: event.storeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle merchant.revenue.updated event
 */
async function handleRevenueUpdated(event: MerchantRevenueUpdateEvent): Promise<void> {
  logger.info('[Capital:MerchantEvents] Processing merchant.revenue.updated', {
    merchantId: event.merchantId,
    revenue: event.revenue,
    period: event.period,
  });

  try {
    // Revenue update - trigger health score recalculation
    merchantEventEmitter.emit('merchant:revenue_updated', event);
  } catch (error) {
    logger.error('[Capital:MerchantEvents] Error processing merchant.revenue.updated', {
      merchantId: event.merchantId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Event subscription registry
type EventHandler = (event: unknown) => Promise<void>;

interface Subscription {
  eventType: string;
  handler: EventHandler;
}

const subscriptions: Subscription[] = [
  { eventType: 'merchant.created', handler: handleMerchantCreated as EventHandler },
  { eventType: 'merchant.updated', handler: handleMerchantUpdated as EventHandler },
  { eventType: 'merchant.store.added', handler: handleStoreAdded as EventHandler },
  { eventType: 'merchant.store.closed', handler: handleStoreClosed as EventHandler },
  { eventType: 'merchant.revenue.updated', handler: handleRevenueUpdated as EventHandler },
];

/**
 * Subscribe to an event type with a handler
 */
export function subscribe(eventType: string, handler: EventHandler): void {
  subscriptions.push({ eventType, handler });
  logger.info(`[Capital:MerchantEvents] Subscription registered for ${eventType}`);
}

/**
 * Get all subscriptions
 */
export function getSubscriptions(): Subscription[] {
  return [...subscriptions];
}

/**
 * Get the internal event emitter
 */
export function getMerchantEventEmitter(): EventEmitter {
  return merchantEventEmitter;
}

/**
 * Initialize event listeners (called from index.ts)
 */
export function initializeMerchantEventListeners(): void {
  logger.info('[Capital:MerchantEvents] Initializing merchant event listeners', {
    eventBusEnabled: EVENT_BUS_ENABLED,
    subscriptions: subscriptions.length,
  });

  if (!EVENT_BUS_ENABLED) {
    logger.info('[Capital:MerchantEvents] Event bus disabled, skipping listener setup');
  }
}

export default {
  subscribe,
  getSubscriptions,
  getMerchantEventEmitter,
  initializeMerchantEventListeners,
};
