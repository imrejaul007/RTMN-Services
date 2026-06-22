import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { unifiedJourneyService } from '../services/unifiedJourneyService';
import { eventAggregator } from '../services/eventAggregator';
import { patternDetection } from '../services/patternDetection';
import { journeyAnalytics } from '../services/journeyAnalytics';
import { exportService } from '../services/exportService';
import { companyRegistry } from '../services/companyRegistry';
import { webhookHandler } from '../services/webhookHandler';
import { EventType, ChannelType } from '../models/journey';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const trackEventSchema = z.object({
  companyId: z.string().min(1),
  companyName: z.string().optional(),
  eventType: z.string().min(1),
  channel: z.string().optional().default('web'),
  metadata: z.record(z.unknown()).optional(),
  properties: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  referralSource: z.string().optional(),
  utmParameters: z.record(z.string()).optional(),
  timestamp: z.string().datetime().optional()
});

const timelineQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0)
});

const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv', 'html', 'pdf']).optional().default('json'),
  includeEvents: z.coerce.boolean().optional().default(true),
  includeMilestones: z.coerce.boolean().optional().default(true),
  includeAnalytics: z.coerce.boolean().optional().default(true),
  includePatterns: z.coerce.boolean().optional().default(true)
});

const shareQuerySchema = z.object({
  accessLevel: z.enum(['summary', 'full', 'events_only']).optional().default('summary'),
  expiresInHours: z.coerce.number().min(1).max(168).optional().default(24)
});

const webhookPayloadSchema = z.object({
  event: z.string(),
  data: z.object({
    customerId: z.string(),
    companyId: z.string().optional(),
    companyName: z.string().optional(),
    eventType: z.string(),
    channel: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    properties: z.record(z.unknown()).optional(),
    sessionId: z.string().optional(),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    referralSource: z.string().optional(),
    utmParameters: z.record(z.string()).optional(),
    timestamp: z.string().optional()
  }),
  signature: z.string().optional()
});

// Validation middleware wrapper
const validate = (schema: z.ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    next(error);
  };
};

// Query validation middleware
const validateQuery = (schema: z.ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      });
    }
    next(error);
  };
};

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ============================================================================
// JOURNEY ROUTES
// ============================================================================

/**
 * GET /journey/:customerId
 * Get unified journey for a customer
 */
router.get('/:customerId',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    const journey = await unifiedJourneyService.getJourney(customerId);

    if (!journey) {
      return res.status(404).json({
        success: false,
        error: 'Journey not found',
        customerId
      });
    }

    res.json({
      success: true,
      data: journey
    });
  })
);

/**
 * GET /journey/:customerId/company/:companyId
 * Get company-specific timeline
 */
router.get('/:customerId/company/:companyId',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, companyId } = req.params;

    // Validate query params
    const queryParams = timelineQuerySchema.parse(req.query);

    const events = await unifiedJourneyService.getCompanyTimeline(
      customerId,
      companyId,
      {
        startDate: queryParams.startDate ? new Date(queryParams.startDate) : undefined,
        endDate: queryParams.endDate ? new Date(queryParams.endDate) : undefined,
        limit: queryParams.limit,
        offset: queryParams.offset
      }
    );

    res.json({
      success: true,
      data: {
        customerId,
        companyId,
        events,
        count: events.length
      }
    });
  })
);

/**
 * GET /journey/:customerId/phases
 * Get journey phases
 */
router.get('/:customerId/phases',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    const phases = await unifiedJourneyService.getJourneyPhases(customerId);

    res.json({
      success: true,
      data: {
        customerId,
        phases,
        count: phases.length
      }
    });
  })
);

/**
 * GET /journey/:customerId/milestones
 * Get key milestones
 */
router.get('/:customerId/milestones',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    const milestones = await unifiedJourneyService.identifyMilestones(customerId);

    res.json({
      success: true,
      data: {
        customerId,
        milestones,
        count: milestones.length
      }
    });
  })
);

/**
 * GET /journey/:customerId/health
 * Get journey health score
 */
router.get('/:customerId/health',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    const health = await unifiedJourneyService.calculateJourneyHealth(customerId);

    res.json({
      success: true,
      data: health
    });
  })
);

/**
 * POST /journey/:customerId/event
 * Track a new event
 */
router.post('/:customerId/event',
  validate(trackEventSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const eventData = trackEventSchema.parse(req.body);

    const event = await unifiedJourneyService.trackCrossCompanyEvent({
      customerId,
      companyId: eventData.companyId,
      companyName: eventData.companyName,
      eventType: eventData.eventType as EventType,
      channel: eventData.channel as ChannelType,
      metadata: eventData.metadata,
      properties: eventData.properties,
      sessionId: eventData.sessionId,
      userAgent: eventData.userAgent,
      ipAddress: eventData.ipAddress,
      referralSource: eventData.referralSource,
      utmParameters: eventData.utmParameters,
      timestamp: eventData.timestamp ? new Date(eventData.timestamp) : undefined
    });

    res.status(201).json({
      success: true,
      data: {
        eventId: event.eventId,
        customerId,
        eventType: event.eventType,
        timestamp: event.timestamp
      }
    });
  })
);

/**
 * GET /journey/:customerId/analytics
 * Get full analytics
 */
router.get('/:customerId/analytics',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    const analytics = await journeyAnalytics.getAnalyticsSummary(customerId);

    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * GET /journey/:customerId/patterns
 * Get detected patterns
 */
router.get('/:customerId/patterns',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    // First detect patterns
    await patternDetection.detectCrossCompanyPatterns(customerId);

    // Then get all patterns
    const patterns = await patternDetection.getPatterns(customerId);

    // Get churn signals
    const churnSignals = await patternDetection.detectChurnSignals(customerId);

    // Get upsell opportunities
    const upsellOpportunities = await patternDetection.detectUpsellOpportunities(customerId);

    res.json({
      success: true,
      data: {
        customerId,
        patterns,
        churnSignals,
        upsellOpportunities
      }
    });
  })
);

/**
 * GET /journey/:customerId/predictions
 * Get AI predictions
 */
router.get('/:customerId/predictions',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    // Get various predictions
    const nextInteraction = await patternDetection.predictNextInteraction(customerId);
    const churnRisk = await journeyAnalytics.getChurnRiskMetrics(customerId);
    const ltv = await journeyAnalytics.getLTV(customerId);

    res.json({
      success: true,
      data: {
        customerId,
        nextInteraction,
        churnRisk,
        ltvPrediction: {
          predicted12MonthValue: ltv.predicted12MonthValue,
          predicted24MonthValue: ltv.predicted24MonthValue
        }
      }
    });
  })
);

/**
 * GET /journey/:customerId/export
 * Export journey data
 */
router.get('/:customerId/export',
  validateQuery(exportQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const queryParams = exportQuerySchema.parse(req.query);

    const exportData = await exportService.exportJourney(
      customerId,
      queryParams.format,
      {
        includeEvents: queryParams.includeEvents,
        includeMilestones: queryParams.includeMilestones,
        includeAnalytics: queryParams.includeAnalytics,
        includePatterns: queryParams.includePatterns
      }
    );

    // Set appropriate content type
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      html: 'text/html',
      pdf: 'application/pdf'
    };

    res.setHeader('Content-Type', contentTypes[queryParams.format] || 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="journey-${customerId}-${Date.now()}.${queryParams.format}"`
    );

    res.send(exportData);
  })
);

/**
 * GET /journey/:customerId/summary
 * Get AI-generated journey summary
 */
router.get('/:customerId/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    const summary = await exportService.generateJourneySummary(customerId);

    res.json({
      success: true,
      data: {
        customerId,
        summary
      }
    });
  })
);

/**
 * POST /journey/:customerId/share/:agentId
 * Share journey with an agent
 */
router.post('/:customerId/share/:agentId',
  validateQuery(shareQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, agentId } = req.params;
    const queryParams = shareQuerySchema.parse(req.query);

    const access = await exportService.shareJourneyWithAgent(
      customerId,
      agentId,
      queryParams.accessLevel,
      queryParams.expiresInHours
    );

    res.status(201).json({
      success: true,
      data: {
        accessId: access.accessId,
        customerId,
        agentId,
        expiresAt: access.expiresAt,
        accessLevel: access.accessLevel
      }
    });
  })
);

/**
 * GET /journey/:customerId/timeline
 * Get unified timeline
 */
router.get('/:customerId/timeline',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const queryParams = timelineQuerySchema.parse(req.query);

    const events = await unifiedJourneyService.getUnifiedTimeline(customerId, {
      startDate: queryParams.startDate ? new Date(queryParams.startDate) : undefined,
      endDate: queryParams.endDate ? new Date(queryParams.endDate) : undefined,
      limit: queryParams.limit,
      offset: queryParams.offset
    });

    res.json({
      success: true,
      data: {
        customerId,
        events,
        count: events.length,
        pagination: {
          limit: queryParams.limit,
          offset: queryParams.offset,
          hasMore: events.length === queryParams.limit
        }
      }
    });
  })
);

/**
 * GET /journey/:customerId/events/aggregation
 * Get event aggregation statistics
 */
router.get('/:customerId/events/aggregation',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    const aggregation = await eventAggregator.getEventAggregation(customerId);

    res.json({
      success: true,
      data: aggregation
    });
  })
);

/**
 * GET /journey/:customerId/channels
 * Get preferred channels
 */
router.get('/:customerId/channels',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    const channels = await journeyAnalytics.getPreferredChannels(customerId);

    res.json({
      success: true,
      data: {
        customerId,
        channels
      }
    });
  })
);

/**
 * GET /journey/:customerId/similar
 * Find similar journeys
 */
router.get('/:customerId/similar',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const { compareWith } = req.query;

    if (!compareWith || typeof compareWith !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'compareWith parameter is required'
      });
    }

    const similarity = await journeyAnalytics.getJourneySimilarity(customerId, compareWith);

    res.json({
      success: true,
      data: {
        customerId,
        compareWith,
        similarity
      }
    });
  })
);

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

/**
 * POST /webhook/:companyId
 * Receive webhook from a company
 */
router.post('/webhook/:companyId',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.params;

    // Validate payload
    const payload = webhookPayloadSchema.parse(req.body);

    // Get company webhook secret
    const company = await companyRegistry.getCompanyWithSecret(companyId);
    if (company?.webhookSecret) {
      const isValid = await webhookHandler.validateWebhook(payload, company.webhookSecret);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }
    }

    const result = await webhookHandler.receiveWebhook(companyId, payload);

    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          eventId: result.eventId,
          processedAt: result.processedAt
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  })
);

/**
 * POST /webhook/:companyId/batch
 * Receive batch webhooks
 */
router.post('/webhook/:companyId/batch',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.params;
    const { events } = req.body as { events: unknown[] };

    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Events must be an array'
      });
    }

    const parsedEvents = events.map(e => webhookPayloadSchema.parse(e));
    const result = await webhookHandler.processBatchWebhook(companyId, parsedEvents);

    res.json({
      success: true,
      data: result
    });
  })
);

// ============================================================================
// COMPANY ROUTES
// ============================================================================

/**
 * GET /companies
 * List all registered companies
 */
router.get('/companies/list',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, active } = req.query;

    let companies;
    if (type && typeof type === 'string') {
      companies = await companyRegistry.listCompaniesByType(type as any);
    } else if (active === 'true') {
      companies = await companyRegistry.listActiveCompanies();
    } else {
      companies = await companyRegistry.listCompanies();
    }

    res.json({
      success: true,
      data: {
        companies,
        count: companies.length
      }
    });
  })
);

/**
 * GET /companies/:companyId
 * Get company details
 */
router.get('/companies/:companyId',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.params;

    const company = await companyRegistry.getCompanyConfig(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company
    });
  })
);

/**
 * GET /companies/:companyId/stats
 * Get company statistics
 */
router.get('/companies/:companyId/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.params;

    const stats = await companyRegistry.getCompanyStats(companyId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * POST /companies
 * Register a new company
 */
router.post('/companies',
  asyncHandler(async (req: Request, res: Response) => {
    const company = await companyRegistry.registerCompany(req.body);

    res.status(201).json({
      success: true,
      data: company
    });
  })
);

/**
 * PUT /companies/:companyId
 * Update company configuration
 */
router.put('/companies/:companyId',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.params;

    const company = await companyRegistry.updateCompanyConfig(companyId, req.body);

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company
    });
  })
);

/**
 * DELETE /companies/:companyId
 * Delete (deactivate) a company
 */
router.delete('/companies/:companyId',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.params;

    const deleted = await companyRegistry.deleteCompany(companyId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Company deactivated successfully'
    });
  })
);

/**
 * POST /companies/:companyId/webhook
 * Register webhook for a company
 */
router.post('/companies/:companyId/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId } = req.params;
    const { url, events, enabled, retryCount, retryDelay } = req.body;

    const config = await webhookHandler.registerWebhook(companyId, {
      url,
      events,
      enabled,
      retryCount,
      retryDelay
    });

    res.json({
      success: true,
      data: {
        companyId,
        webhookUrl: config.url,
        secret: config.secret,
        events: config.events,
        enabled: config.enabled
      }
    });
  })
);

// ============================================================================
// HEALTH & METRICS
// ============================================================================

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  const webhookStatus = webhookHandler.getQueueStatus();

  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'hojai-cross-company-journey',
    version: '1.0.0',
    metrics: {
      webhookQueueLength: webhookStatus.queueLength
    }
  });
});

export default router;
