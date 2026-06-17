/**
 * Funnel Routes
 * API endpoints for funnel management and analysis
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Funnel } from '../models/Funnel';
import { funnelAnalyzer } from '../services/funnelAnalyzer';
import {
  CreateFunnelRequest,
  AnalyzeFunnelRequest,
  FunnelStage,
  ApiResponse,
  PaginatedResponse
} from '../types';

const router = Router();

// Validation schemas
const createFunnelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  stages: z.array(
    z.object({
      name: z.string().min(1),
      required: z.boolean().optional(),
      targetCount: z.number().optional(),
      conversionTarget: z.number().optional()
    })
  ).min(2),
  filters: z.object({
    customerIds: z.array(z.string()).optional(),
    segments: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional(),
    campaigns: z.array(z.string()).optional(),
    excludeChannels: z.array(z.string()).optional()
  }).optional()
});

const analyzeFunnelSchema = z.object({
  funnelId: z.string().optional(),
  funnel: z.array(
    z.object({
      name: z.string().min(1),
      required: z.boolean().optional(),
      targetCount: z.number().optional(),
      conversionTarget: z.number().optional()
    })
  ).optional(),
  dateRange: z.object({
    start: z.string().or(z.date()),
    end: z.string().or(z.date())
  }),
  filters: z.object({
    customerIds: z.array(z.string()).optional(),
    segments: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional(),
    campaigns: z.array(z.string()).optional(),
    excludeChannels: z.array(z.string()).optional()
  }).optional()
});

const comparePeriodsSchema = z.object({
  funnelId: z.string(),
  period1: z.object({
    start: z.string(),
    end: z.string()
  }),
  period2: z.object({
    start: z.string(),
    end: z.string()
  })
});

/**
 * Create a new funnel
 * POST /api/funnels
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';

    const validation = createFunnelSchema.safeParse(req.body);
    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: validation.error.errors[0].message,
        timestamp: new Date()
      };
      return res.status(400).json(response);
    }

    const funnelId = uuidv4();
    const now = new Date();

    const funnel = new Funnel({
      funnelId,
      tenantId,
      name: validation.data.name,
      description: validation.data.description,
      stages: validation.data.stages.map((s, i) => ({
        ...s,
        order: i
      })),
      filters: validation.data.filters || {},
      dateRange: {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: now
      }
    });

    await funnel.save();

    const response: ApiResponse<typeof funnel> = {
      success: true,
      data: funnel,
      message: 'Funnel created successfully',
      timestamp: new Date()
    };

    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get all funnels for tenant
 * GET /api/funnels
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const funnels = await Funnel.findByTenant(tenantId)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const total = await Funnel.countDocuments({ tenantId }).exec();

    const paginatedResponse: PaginatedResponse<typeof funnels[0]> = {
      data: funnels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    const response: ApiResponse<PaginatedResponse<typeof funnels[0]>> = {
      success: true,
      data: paginatedResponse,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get funnel by ID
 * GET /api/funnels/:funnelId
 */
router.get('/:funnelId', async (req: Request, res: Response) => {
  try {
    const { funnelId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    const funnel = await Funnel.findByIdAndTenant(funnelId, tenantId);

    if (!funnel) {
      const response: ApiResponse = {
        success: false,
        error: 'Funnel not found',
        timestamp: new Date()
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof funnel> = {
      success: true,
      data: funnel,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Analyze a funnel
 * POST /api/funnels/analyze
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';

    const validation = analyzeFunnelSchema.safeParse(req.body);
    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: validation.error.errors[0].message,
        timestamp: new Date()
      };
      return res.status(400).json(response);
    }

    const analysisRequest: AnalyzeFunnelRequest = {
      ...validation.data,
      tenantId
    };

    const analysis = await funnelAnalyzer.analyzeFunnel(analysisRequest);

    const response: ApiResponse<typeof analysis> = {
      success: true,
      data: analysis,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Analyze funnel by ID
 * GET /api/funnels/:funnelId/analyze
 */
router.get('/:funnelId/analyze', async (req: Request, res: Response) => {
  try {
    const { funnelId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : new Date();

    const analysis = await funnelAnalyzer.analyzeFunnel({
      funnelId,
      tenantId,
      dateRange: { start: startDate, end: endDate }
    });

    const response: ApiResponse<typeof analysis> = {
      success: true,
      data: analysis,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Compare funnel performance between periods
 * POST /api/funnels/compare
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';

    const validation = comparePeriodsSchema.safeParse(req.body);
    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: validation.error.errors[0].message,
        timestamp: new Date()
      };
      return res.status(400).json(response);
    }

    const comparison = await funnelAnalyzer.comparePeriods(
      tenantId,
      validation.data.funnelId,
      {
        start: new Date(validation.data.period1.start),
        end: new Date(validation.data.period1.end)
      },
      {
        start: new Date(validation.data.period2.start),
        end: new Date(validation.data.period2.end)
      }
    );

    const response: ApiResponse<typeof comparison> = {
      success: true,
      data: comparison,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Delete funnel
 * DELETE /api/funnels/:funnelId
 */
router.delete('/:funnelId', async (req: Request, res: Response) => {
  try {
    const { funnelId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    const funnel = await Funnel.findByIdAndTenant(funnelId, tenantId);

    if (!funnel) {
      const response: ApiResponse = {
        success: false,
        error: 'Funnel not found',
        timestamp: new Date()
      };
      return res.status(404).json(response);
    }

    await funnel.deleteOne();

    const response: ApiResponse = {
      success: true,
      message: 'Funnel deleted successfully',
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get funnel templates
 * GET /api/funnels/templates
 */
router.get('/templates/list', async (req: Request, res: Response) => {
  try {
    const templates = [
      {
        id: 'acquisition',
        name: 'Acquisition Funnel',
        description: 'Track customer acquisition from awareness to purchase',
        stages: ['awareness', 'consideration', 'intent', 'purchase']
      },
      {
        id: 'engagement',
        name: 'Engagement Funnel',
        description: 'Track customer engagement and activation',
        stages: ['signup', 'onboarding', 'activation', 'retention']
      },
      {
        id: 'retention',
        name: 'Retention Funnel',
        description: 'Track customer retention and loyalty',
        stages: ['first_purchase', 'repeat_purchase', 'loyalty', 'advocacy']
      }
    ];

    const response: ApiResponse<typeof templates> = {
      success: true,
      data: templates,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

export default router;
