/**
 * Journey Routes
 * API endpoints for customer journey tracking and analytics
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { journeyService, TrackEventInput } from '../services/journeyService';
import { analyticsService } from '../services/analyticsService';
import { BusinessDomain, JourneyEventType } from '../models';
import logger from '../utils/logger';

const router = Router();
const log = logger.withService('journey-routes');

// ==================== Validation Schemas ====================

const trackEventSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  businessDomain: z.nativeEnum(BusinessDomain, {
    errorMap: () => ({ message: 'Invalid business domain' }),
  }),
  businessId: z.string().min(1, 'Business ID is required'),
  eventType: z.nativeEnum(JourneyEventType, {
    errorMap: () => ({ message: 'Invalid event type' }),
  }),
  metadata: z.record(z.unknown()).optional().default({}),
  sessionId: z.string().optional(),
  channel: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

const timelineQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  domain: z.nativeEnum(BusinessDomain).optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(500),
});

const journeyQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(500).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
  domain: z.nativeEnum(BusinessDomain).optional(),
});

// ==================== Middleware ====================

const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  log.error('Request error', {
    requestId: req.headers['x-request-id'] as string,
    path: req.path,
    method: req.method,
    error: err.message,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

// ==================== Health & Info Endpoints ====================

/**
 * GET /journey/health
 * Health check endpoint
 */
router.get('/health', async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: 'journey-intelligence-service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /journey/domains
 * List available business domains
 */
router.get('/domains', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    domains: Object.values(BusinessDomain).map((domain) => ({
      value: domain,
      label: domain.charAt(0).toUpperCase() + domain.slice(1).replace('_', ' '),
    })),
  });
});

/**
 * GET /journey/event-types
 * List available event types
 */
router.get('/event-types', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    eventTypes: Object.values(JourneyEventType).map((type) => ({
      value: type,
      label: type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    })),
  });
});

// ==================== Journey Event Endpoints ====================

/**
 * POST /journey/event
 * Track a customer journey event
 */
router.post('/event', validateRequest(trackEventSchema), async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  try {
    log.info('Tracking event', { requestId, ...req.body });

    const input: TrackEventInput = {
      customerId: req.body.customerId,
      businessDomain: req.body.businessDomain,
      businessId: req.body.businessId,
      eventType: req.body.eventType,
      metadata: req.body.metadata,
      sessionId: req.body.sessionId,
      channel: req.body.channel,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : undefined,
    };

    const result = await journeyService.trackEvent(input);

    log.info('Event tracked successfully', { requestId, eventId: result.eventId });

    res.status(201).json({
      success: true,
      data: result,
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /journey/events/batch
 * Track multiple journey events
 */
router.post('/events/batch', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  try {
    const events = req.body.events as TrackEventInput[];

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Events array is required',
      });
      return;
    }

    if (events.length > 100) {
      res.status(400).json({
        success: false,
        error: 'Maximum 100 events per batch',
      });
      return;
    }

    log.info('Processing batch events', { requestId, count: events.length });

    const results = await Promise.allSettled(
      events.map((event) =>
        journeyService.trackEvent({
          ...event,
          timestamp: event.timestamp ? new Date(event.timestamp) : undefined,
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    res.status(200).json({
      success: true,
      data: {
        total: events.length,
        successful,
        failed,
        errors: results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map((r, i) => ({
            index: i,
            error: r.reason?.message || 'Unknown error',
          })),
      },
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Journey Data Endpoints ====================

/**
 * GET /journey/:customerId
 * Get customer journey summary
 */
router.get('/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const { customerId } = req.params;

  try {
    // Validate query params
    const queryParams = await journeyQuerySchema.parseAsync(req.query);

    log.info('Fetching customer journey', { requestId, customerId });

    const journey = await journeyService.getJourney(customerId, {
      limit: queryParams.limit,
      offset: queryParams.offset,
      domain: queryParams.domain,
    });

    res.status(200).json({
      success: true,
      data: journey,
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /journey/:customerId/timeline
 * Get customer journey timeline
 */
router.get('/:customerId/timeline', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const { customerId } = req.params;

  try {
    const queryParams = await timelineQuerySchema.parseAsync(req.query);

    log.info('Fetching customer timeline', { requestId, customerId });

    const timeline = await journeyService.getTimeline(customerId, {
      startDate: queryParams.startDate ? new Date(queryParams.startDate) : undefined,
      endDate: queryParams.endDate ? new Date(queryParams.endDate) : undefined,
      domain: queryParams.domain,
      limit: queryParams.limit,
    });

    res.status(200).json({
      success: true,
      data: timeline,
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Analytics Endpoints ====================

/**
 * GET /journey/:customerId/analytics
 * Get comprehensive journey analytics
 */
router.get('/:customerId/analytics', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const { customerId } = req.params;

  try {
    log.info('Fetching journey analytics', { requestId, customerId });

    const [journeyAnalysis, churnPrediction, ltv, crossBusiness, nextActions] = await Promise.all([
      journeyService.analyzeJourney(customerId),
      analyticsService.predictChurn(customerId),
      analyticsService.calculateLTV(customerId),
      analyticsService.getCrossBusinessInsights(customerId),
      analyticsService.recommendNextAction(customerId),
    ]);

    res.status(200).json({
      success: true,
      data: {
        journeyAnalysis,
        churnPrediction,
        lifetimeValue: ltv,
        crossBusinessInsights: crossBusiness,
        recommendedActions: nextActions,
      },
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /journey/:customerId/analyze
 * Trigger deep journey analysis
 */
router.post('/:customerId/analyze', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const { customerId } = req.params;
  const { analysisTypes } = req.body;

  try {
    log.info('Starting journey analysis', { requestId, customerId, analysisTypes });

    const defaultAnalysisTypes = ['journey', 'churn', 'ltv', 'crossBusiness', 'recommendations'];
    const types = analysisTypes || defaultAnalysisTypes;

    const results: Record<string, unknown> = {};

    if (types.includes('journey')) {
      results.journeyAnalysis = await journeyService.analyzeJourney(customerId);
    }

    if (types.includes('churn')) {
      results.churnPrediction = await analyticsService.predictChurn(customerId);
    }

    if (types.includes('ltv')) {
      results.lifetimeValue = await analyticsService.calculateLTV(customerId);
    }

    if (types.includes('crossBusiness')) {
      results.crossBusinessInsights = await analyticsService.getCrossBusinessInsights(customerId);
    }

    if (types.includes('recommendations')) {
      results.recommendedActions = await analyticsService.recommendNextAction(customerId);
    }

    res.status(200).json({
      success: true,
      data: results,
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /journey/:customerId/churn
 * Get churn prediction specifically
 */
router.get('/:customerId/churn', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const { customerId } = req.params;

  try {
    log.info('Fetching churn prediction', { requestId, customerId });

    const prediction = await analyticsService.predictChurn(customerId);

    res.status(200).json({
      success: true,
      data: prediction,
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /journey/:customerId/ltv
 * Get LTV calculation specifically
 */
router.get('/:customerId/ltv', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const { customerId } = req.params;

  try {
    log.info('Fetching LTV calculation', { requestId, customerId });

    const ltv = await analyticsService.calculateLTV(customerId);

    res.status(200).json({
      success: true,
      data: ltv,
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /journey/:customerId/cross-business
 * Get cross-business insights specifically
 */
router.get('/:customerId/cross-business', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const { customerId } = req.params;

  try {
    log.info('Fetching cross-business insights', { requestId, customerId });

    const insights = await analyticsService.getCrossBusinessInsights(customerId);

    res.status(200).json({
      success: true,
      data: insights,
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /journey/:customerId/recommendations
 * Get next action recommendations specifically
 */
router.get('/:customerId/recommendations', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const { customerId } = req.params;

  try {
    log.info('Fetching recommendations', { requestId, customerId });

    const recommendations = await analyticsService.recommendNextAction(customerId);

    res.status(200).json({
      success: true,
      data: recommendations,
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Summary Endpoints ====================

/**
 * GET /journey/:customerId/summary
 * Get quick customer summary
 */
router.get('/:customerId/summary', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const { customerId } = req.params;

  try {
    log.info('Fetching customer summary', { requestId, customerId });

    const [journey, churn, ltv] = await Promise.all([
      journeyService.getJourney(customerId, { limit: 10 }),
      analyticsService.predictChurn(customerId),
      analyticsService.calculateLTV(customerId),
    ]);

    res.status(200).json({
      success: true,
      data: {
        customerId,
        totalEvents: journey.totalEvents,
        activeDomains: journey.activeDomains,
        engagementLevel: churn.riskLevel === 'critical' ? 'churned' : journey.activeDomains.length > 2 ? 'high' : 'medium',
        churnRisk: churn.riskLevel,
        lifetimeValue: ltv.historicalLTV,
        customerTier: ltv.customerValueTier,
        firstSeen: journey.firstEventDate,
        lastSeen: journey.lastEventDate,
      },
      requestId,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Error Handler ====================

router.use(errorHandler);

export default router;
