import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Outcome } from '../models/Outcome';
import { OutcomeCalculator } from '../services/calculator';
import { TrackOutcomeRequest } from '../types';

const router = Router();

// Validation schemas
const trackOutcomeSchema = z.object({
  ticketId: z.string().min(1),
  interactionId: z.string().optional(),
  revenueImpact: z.object({
    saved: z.number().min(0).default(0),
    protected: z.number().min(0).default(0),
    cost: z.number().min(0).default(0)
  }),
  customerImpact: z.object({
    retained: z.boolean().default(false),
    churned: z.boolean().default(false),
    promoted: z.boolean().default(false),
    npsBefore: z.number().min(-100).max(100).optional(),
    npsAfter: z.number().min(-100).max(100).optional()
  }),
  businessImpact: z.object({
    upsell: z.boolean().default(false),
    upsellAmount: z.number().min(0).optional(),
    referral: z.boolean().default(false),
    referralCount: z.number().min(0).optional(),
    riskIdentified: z.boolean().default(false),
    riskSeverity: z.enum(['low', 'medium', 'high', 'critical']).optional()
  }),
  metrics: z.object({
    csatBefore: z.number().min(1).max(5).optional(),
    csatAfter: z.number().min(1).max(5).optional(),
    resolutionTimeMinutes: z.number().min(0),
    firstResponseTimeMinutes: z.number().min(0).optional(),
    agentId: z.string().optional()
  }),
  metadata: z.record(z.unknown()).optional()
});

/**
 * POST /api/outcomes
 * Track a new outcome record
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const validation = trackOutcomeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const outcome = await OutcomeCalculator.trackOutcome(tenantId, validation.data);

    res.status(201).json({
      success: true,
      data: outcome
    });
  } catch (error) {
    console.error('Error tracking outcome:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track outcome'
    });
  }
});

/**
 * GET /api/outcomes
 * Get all outcomes for a tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { ticketId, startDate, endDate, limit = 100, offset = 0 } = req.query;

    const query: any = { tenantId };

    if (ticketId) {
      query.ticketId = ticketId;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate as string);
      }
    }

    const outcomes = await Outcome.find(query)
      .sort({ timestamp: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await Outcome.countDocuments(query);

    res.json({
      success: true,
      data: outcomes,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + outcomes.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching outcomes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch outcomes'
    });
  }
});

/**
 * GET /api/outcomes/:outcomeId
 * Get a specific outcome by ID
 */
router.get('/:outcomeId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { outcomeId } = req.params;

    const outcome = await Outcome.findOne({ outcomeId, tenantId });

    if (!outcome) {
      return res.status(404).json({
        success: false,
        error: 'Outcome not found'
      });
    }

    res.json({
      success: true,
      data: outcome
    });
  } catch (error) {
    console.error('Error fetching outcome:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch outcome'
    });
  }
});

/**
 * GET /api/outcomes/ticket/:ticketId
 * Get all outcomes for a specific ticket
 */
router.get('/ticket/:ticketId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { ticketId } = req.params;

    const outcomes = await Outcome.find({ tenantId, ticketId })
      .sort({ timestamp: -1 });

    // Calculate summary
    const summary = {
      totalRevenueSaved: outcomes.reduce((sum, o) => sum + o.revenueImpact.saved, 0),
      totalRevenueProtected: outcomes.reduce((sum, o) => sum + o.revenueImpact.protected, 0),
      customersRetained: outcomes.filter(o => o.customerImpact.retained).length,
      upsellsGenerated: outcomes.filter(o => o.businessImpact.upsell).length,
      referralsCreated: outcomes.reduce(
        (sum, o) => sum + (o.businessImpact.referralCount || 0),
        0
      ),
      risksIdentified: outcomes.filter(o => o.businessImpact.riskIdentified).length
    };

    res.json({
      success: true,
      data: {
        outcomes,
        summary
      }
    });
  } catch (error) {
    console.error('Error fetching ticket outcomes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket outcomes'
    });
  }
});

/**
 * POST /api/outcomes/aggregate
 * Trigger aggregation of metrics for a period
 */
router.post('/aggregate', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { period = 'daily', date } = req.body;
    const targetDate = date ? new Date(date) : new Date();

    const metric = await OutcomeCalculator.aggregateMetrics(tenantId, period, targetDate);

    res.json({
      success: true,
      data: metric
    });
  } catch (error) {
    console.error('Error aggregating metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to aggregate metrics'
    });
  }
});

export default router;
