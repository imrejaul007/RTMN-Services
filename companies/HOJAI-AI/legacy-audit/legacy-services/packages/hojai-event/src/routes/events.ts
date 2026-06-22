import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eventBusService } from '../services/eventBus.js';
import { EventCategory, EventType } from '../types/index.js';

const router = express.Router();

// ============================================================================
// SCHEMAS
// ============================================================================

const PublishEventSchema = z.object({
  type: z.string(),
  category: z.nativeEnum(EventCategory),
  name: z.string(),
  userId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  source: z.string().optional(),
  sessionId: z.string().optional(),
  channel: z.string().optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  properties: z.record(z.any()).optional(),
  metrics: z.record(z.number()).optional(),
  context: z.object({
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    deviceType: z.string().optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
    referrer: z.string().optional()
  }).optional()
});

const BatchPublishSchema = z.object({
  events: z.array(PublishEventSchema).min(1).max(100)
});

// ============================================================================
// EVENT ROUTES
// ============================================================================

/**
 * POST /api/events
 * Publish a single event
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required (x-tenant-id header)'
      });
      return;
    }

    const validated = PublishEventSchema.parse(req.body);

    const event = await eventBusService.publish(tenantId, validated);

    res.status(201).json({
      success: true,
      data: { eventId: event.id }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }
    next(error);
  }
});

/**
 * POST /api/events/batch
 * Publish multiple events in batch
 */
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const validated = BatchPublishSchema.parse(req.body);

    const results = await Promise.allSettled(
      validated.events.map(event =>
        eventBusService.publish(tenantId, event)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.status(201).json({
      success: true,
      data: {
        total: validated.events.length,
        successful,
        failed,
        events: results.map((r, i) => ({
          index: i,
          success: r.status === 'fulfilled',
          eventId: r.status === 'fulfilled' ? r.value.id : undefined,
          error: r.status === 'rejected' ? r.reason?.message : undefined
        }))
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/events
 * Query historical events
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const { types, userId, startDate, endDate, limit, offset } = req.query;

    const result = await eventBusService.query({
      tenantId,
      eventTypes: types ? (types as string).split(',') : undefined,
      userId: userId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({
      success: true,
      data: result.events,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/events/stats
 * Get event statistics
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const stats = await eventBusService.getStats(tenantId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/events/types
 * Get all event types and their schemas
 */
router.get('/types', (req: Request, res: Response) => {
  const eventTypes = Object.values(EventType).map(type => ({
    type,
    category: type.split('.')[0]
  }));

  res.json({
    success: true,
    data: {
      categories: Object.values(EventCategory),
      types: eventTypes
    }
  });
});

/**
 * POST /api/events/replay
 * Replay events from a timestamp
 */
router.post('/replay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const { startDate, endDate, eventTypes, subscriptionId } = req.body;

    if (!startDate || !subscriptionId) {
      res.status(400).json({
        success: false,
        error: 'startDate and subscriptionId required'
      });
      return;
    }

    const result = await eventBusService.replay({
      tenantId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      eventTypes,
      subscriptionId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
