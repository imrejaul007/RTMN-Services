/**
 * Hojai Event Platform
 *
 * Migration Strategy: Fork & Sync
 *
 * SOURCE: REZ-Intelligence/REZ-event-bus
 * PORT: 4510
 *
 * This wrapper provides:
 * 1. Hojai ownership identity
 * 2. Multi-tenant support (added incrementally)
 * 3. Standard Hojai interfaces
 *
 * The underlying REZ-event-bus service remains unchanged.
 * Only the ownership and interfaces are wrapped.
 *
 * Migration Phases:
 * Phase 1: Create wrapper (THIS FILE)
 * Phase 2: Add tenant_id to event envelope
 * Phase 3: Add tenant filtering to subscriptions
 * Phase 4: Full multi-tenant isolation
 */

import { EventEmitter } from 'events';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { HojaiEvent, EventSubscription } from '../../shared/types';
import { tenantMiddleware } from '../../shared/middleware/tenant';
import { createLogger } from '../../shared/utils/logger';
import { createResponse, createErrorResponse } from '../../shared/types';

const logger = createLogger('hojai-event');

// ============================================
// EVENT PLATFORM WRAPPER
// ============================================

/**
 * Hojai Event Platform
 * Wraps REZ-event-bus with Hojai identity
 */
export class HojaiEventPlatform {
  private emitter: EventEmitter;
  private subscriptions: Map<string, EventSubscription[]>;

  constructor() {
    this.emitter = new EventEmitter();
    this.subscriptions = new Map();
    this.emitter.setMaxListeners(1000);
  }

  // ============================================
  // CORE EVENT OPERATIONS
  // ============================================

  /**
   * Publish an event (REQUIRED: tenant_id)
   */
  async publish(tenantId: string, type: string, data: Record<string, any>): Promise<HojaiEvent> {
    // Validate tenant
    if (!tenantId) {
      throw new Error('tenant_id is required');
    }

    const event: HojaiEvent = {
      id: this.generateEventId(),
      tenant_id: tenantId,
      type,
      category: this.categorizeEvent(type),
      source: 'hojai-event-platform',
      timestamp: new Date().toISOString(),
      data
    };

    // Emit locally
    this.emitter.emit(`${tenantId}:${type}`, event);
    this.emitter.emit('*', event);

    logger.info('event_published', { tenantId, type, eventId: event.id });

    return event;
  }

  /**
   * Subscribe to events (tenant-scoped)
   */
  subscribe(
    tenantId: string,
    eventType: string,
    handler: (event: HojaiEvent) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: EventSubscription = {
      id: subscriptionId,
      tenant_id: tenantId,
      eventType,
      handler: 'inline', // Local handler
      status: 'active'
    };

    // Store subscription
    const subs = this.subscriptions.get(tenantId) || [];
    subs.push(subscription);
    this.subscriptions.set(tenantId, subs);

    // Listen for events (tenant-scoped)
    const eventHandler = (event: HojaiEvent) => {
      if (this.matchesPattern(event.type, eventType)) {
        handler(event);
      }
    };

    this.emitter.on(`${tenantId}:${eventType}`, eventHandler);
    this.emitter.on(`${tenantId}:*`, eventHandler);

    logger.info('subscription_created', { tenantId, eventType, subscriptionId });

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(tenantId: string, subscriptionId: string): boolean {
    const subs = this.subscriptions.get(tenantId);
    if (!subs) return false;

    const index = subs.findIndex(s => s.id === subscriptionId);
    if (index === -1) return false;

    const sub = subs[index];
    this.emitter.removeAllListeners(`${tenantId}:${sub.eventType}`);

    subs.splice(index, 1);
    this.subscriptions.set(tenantId, subs);

    logger.info('subscription_removed', { tenantId, subscriptionId });

    return true;
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Get event history (tenant-scoped)
   */
  async getHistory(
    tenantId: string,
    options: {
      type?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<HojaiEvent[]> {
    // TODO: Query from storage (REZ-event-bus storage)
    // For now, return empty array
    logger.info('event_history_queried', { tenantId, options });
    return [];
  }

  /**
   * Get subscription stats (tenant-scoped)
   */
  getStats(tenantId: string): {
    activeSubscriptions: number;
    eventsPublished: number;
    eventsProcessed: number;
  } {
    const subs = this.subscriptions.get(tenantId) || [];
    return {
      activeSubscriptions: subs.filter(s => s.status === 'active').length,
      eventsPublished: 0, // Would need to track
      eventsProcessed: 0   // Would need to track
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private categorizeEvent(type: string): HojaiEvent['category'] {
    const [prefix] = type.split('.');

    const categoryMap: Record<string, HojaiEvent['category']> = {
      'customer': 'commerce',
      'order': 'commerce',
      'payment': 'commerce',
      'identity': 'identity',
      'loyalty': 'loyalty',
      'engagement': 'engagement',
      'support': 'support',
      'message': 'communication',
      'campaign': 'communication',
      'agent': 'ai',
      'workflow': 'workflow',
      'system': 'system'
    };

    return categoryMap[prefix] || 'system';
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(prefix);
    }
    return eventType === pattern;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// EXPRESS INTEGRATION
// ============================================

/**
 * Create Express routes for Event Platform
 */
export function createEventRoutes(eventPlatform: HojaiEventPlatform) {
  const router = express.Router();

  /**
   * POST /api/events/publish
   * Publish an event
   */
  router.post('/publish', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { type, data } = req.body;
      const tenantId = req.tenantContext!.tenant_id;

      if (!type) {
        return res.status(400).json(
          createErrorResponse('MISSING_TYPE', 'Event type is required')
        );
      }

      const event = await eventPlatform.publish(tenantId, type, data || {});

      res.json(createResponse(event, { tenantId }));
    } catch (error) {
      logger.error('publish_error', { error });
      res.status(500).json(
        createErrorResponse('PUBLISH_ERROR', 'Failed to publish event')
      );
    }
  });

  /**
   * POST /api/events/subscribe
   * Create a subscription
   */
  router.post('/subscribe', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { eventType, callbackUrl } = req.body;
      const tenantId = req.tenantContext!.tenant_id;

      if (!eventType) {
        return res.status(400).json(
          createErrorResponse('MISSING_EVENT_TYPE', 'Event type is required')
        );
      }

      // For HTTP callbacks, store the URL
      // For inline handlers, this would be different
      const subscriptionId = eventPlatform.subscribe(
        tenantId,
        eventType,
        async (event) => {
          if (callbackUrl) {
            // Send to callback URL
            await fetch(callbackUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(event)
            }).catch(err => logger.error('callback_error', { err }));
          }
        }
      );

      res.json(createResponse({ subscriptionId, eventType }, { tenantId }));
    } catch (error) {
      logger.error('subscribe_error', { error });
      res.status(500).json(
        createErrorResponse('SUBSCRIBE_ERROR', 'Failed to create subscription')
      );
    }
  });

  /**
   * DELETE /api/events/subscribe/:id
   * Remove a subscription
   */
  router.delete('/subscribe/:id', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.tenantContext!.tenant_id;

      const removed = eventPlatform.unsubscribe(tenantId, id);

      if (!removed) {
        return res.status(404).json(
          createErrorResponse('SUBSCRIPTION_NOT_FOUND', 'Subscription not found')
        );
      }

      res.json(createResponse({ removed: true }, { tenantId }));
    } catch (error) {
      logger.error('unsubscribe_error', { error });
      res.status(500).json(
        createErrorResponse('UNSUBSCRIBE_ERROR', 'Failed to remove subscription')
      );
    }
  });

  /**
   * GET /api/events/history
   * Get event history
   */
  router.get('/history', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { type, startDate, endDate, limit } = req.query;

      const events = await eventPlatform.getHistory(tenantId, {
        type: type as string,
        startDate: startDate as string,
        endDate: endDate as string,
        limit: limit ? parseInt(limit as string) : 100
      });

      res.json(createResponse(events, { tenantId }));
    } catch (error) {
      logger.error('history_error', { error });
      res.status(500).json(
        createErrorResponse('HISTORY_ERROR', 'Failed to get event history')
      );
    }
  });

  /**
   * GET /api/events/stats
   * Get subscription stats
   */
  router.get('/stats', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const stats = eventPlatform.getStats(tenantId);
      res.json(createResponse(stats, { tenantId }));
    } catch (error) {
      logger.error('stats_error', { error });
      res.status(500).json(
        createErrorResponse('STATS_ERROR', 'Failed to get stats')
      );
    }
  });

  return router;
}

// ============================================
// SERVICE BOOTSTRAP
// ============================================

/**
 * Bootstrap the Event Platform service
 */
export async function bootstrap(port = 4510) {
  const eventPlatform = new HojaiEventPlatform();
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
  app.use(express.json({ limit: "10kb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'hojai-event',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Routes
  app.use('/api/events', createEventRoutes(eventPlatform));

  // Start server
  app.listen(port, () => {
    logger.info('hojai_event_platform_started', { port });
  });

  return { eventPlatform, app };
}

// ============================================
// EXPORTS
// ============================================

export default {
  HojaiEventPlatform,
  createEventRoutes,
  bootstrap
};
