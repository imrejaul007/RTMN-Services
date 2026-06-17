/**
 * Journey Routes
 * API endpoints for customer journey management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { journeyTracker } from '../services/tracker';
import {
  CreateJourneyRequest,
  JourneyStage,
  ApiResponse,
  PaginatedResponse,
  JourneyStageHistory
} from '../types';

const router = Router();

// Validation schemas
const createJourneySchema = z.object({
  customerId: z.string().min(1),
  tenantId: z.string().optional(),
  initialStage: z.nativeEnum(JourneyStage).optional(),
  metadata: z.record(z.unknown()).optional()
});

const updateStageSchema = z.object({
  stage: z.nativeEnum(JourneyStage),
  touchpointId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const journeyQuerySchema = z.object({
  customerId: z.string(),
  tenantId: z.string().optional()
});

/**
 * Create a new customer journey
 * POST /api/journeys
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createJourneySchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: validation.error.errors[0].message,
        timestamp: new Date()
      };
      return res.status(400).json(response);
    }

    const journey = await journeyTracker.createJourney(validation.data);

    const response: ApiResponse<typeof journey> = {
      success: true,
      data: journey,
      message: 'Journey created successfully',
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
 * Get customer journey
 * GET /api/journeys/:customerId
 */
router.get('/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    const journey = await journeyTracker.getCustomerJourney(customerId, tenantId);

    if (!journey) {
      const response: ApiResponse = {
        success: false,
        error: 'Journey not found',
        timestamp: new Date()
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof journey> = {
      success: true,
      data: journey,
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
 * Advance journey to next stage
 * PATCH /api/journeys/:customerId/stage
 */
router.patch('/:customerId/stage', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    const validation = updateStageSchema.safeParse(req.body);
    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: validation.error.errors[0].message,
        timestamp: new Date()
      };
      return res.status(400).json(response);
    }

    const journey = await journeyTracker.getCustomerJourney(customerId, tenantId);

    if (!journey) {
      const response: ApiResponse = {
        success: false,
        error: 'Journey not found',
        timestamp: new Date()
      };
      return res.status(404).json(response);
    }

    const updatedJourney = await journey.advanceStage(
      validation.data.stage,
      validation.data.touchpointId,
      validation.data.metadata
    );

    const response: ApiResponse<typeof updatedJourney> = {
      success: true,
      data: updatedJourney,
      message: 'Stage updated successfully',
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
 * Mark journey as converted
 * POST /api/journeys/:customerId/convert
 */
router.post('/:customerId/convert', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    const journey = await journeyTracker.getCustomerJourney(customerId, tenantId);

    if (!journey) {
      const response: ApiResponse = {
        success: false,
        error: 'Journey not found',
        timestamp: new Date()
      };
      return res.status(404).json(response);
    }

    await journey.markConverted();

    const response: ApiResponse = {
      success: true,
      message: 'Journey marked as converted',
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
 * Mark journey as churned
 * POST /api/journeys/:customerId/churn
 */
router.post('/:customerId/churn', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    await journeyTracker.markChurned(customerId, tenantId);

    const response: ApiResponse = {
      success: true,
      message: 'Journey marked as churned',
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
 * Get journey statistics
 * GET /api/journeys/stats
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';

    const stats = await journeyTracker.getJourneyStats(tenantId);

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
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
 * Get journeys by stage
 * GET /api/journeys/stage/:stage
 */
router.get('/stage/:stage', async (req: Request, res: Response) => {
  try {
    const { stage } = req.params;
    const tenantId = req.query.tenantId as string || 'public';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Import model here to avoid circular dependency
    const { CustomerJourney } = await import('../models/Journey');
    const journeys = await CustomerJourney.findByTenantAndStage(tenantId, stage as JourneyStage)
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await CustomerJourney.countDocuments({
      tenantId,
      currentStage: stage
    }).exec();

    const paginatedResponse: PaginatedResponse<typeof journeys[0]> = {
      data: journeys,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    const response: ApiResponse<PaginatedResponse<typeof journeys[0]>> = {
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
 * Get journey timeline (stage history)
 * GET /api/journeys/:customerId/timeline
 */
router.get('/:customerId/timeline', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    const journey = await journeyTracker.getCustomerJourney(customerId, tenantId);

    if (!journey) {
      const response: ApiResponse = {
        success: false,
        error: 'Journey not found',
        timestamp: new Date()
      };
      return res.status(404).json(response);
    }

    const timeline: Array<{
      stage: JourneyStage;
      enteredAt: Date;
      exitedAt?: Date;
      duration: number;
      touchpointId?: string;
    }> = journey.stages.map(s => ({
      stage: s.stage,
      enteredAt: s.enteredAt,
      exitedAt: s.exitedAt,
      duration: s.exitedAt
        ? s.exitedAt.getTime() - s.enteredAt.getTime()
        : Date.now() - s.enteredAt.getTime(),
      touchpointId: s.touchpointId
    }));

    const response: ApiResponse<typeof timeline> = {
      success: true,
      data: timeline,
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
