// ============================================
// HOJAI AI - Marketing Agent Campaign Routes
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { campaignManager } from '../services/campaignManager';
import { validateBody, PaginationSchema, formatPaginatedResponse, getPaginationOptions } from '../utils/validation';
import { logger } from '../utils/logger';
import { CampaignType, CampaignObjective, CampaignStatus } from '../types';

const router = Router();

// Validation schemas
const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.nativeEnum(CampaignType),
  objective: z.nativeEnum(CampaignObjective),
  description: z.string().max(1000).optional(),
  targetAudience: z.object({
    demographics: z.object({
      age: z.object({
        min: z.number().min(13).optional(),
        max: z.number().max(120).optional()
      }).optional(),
      gender: z.enum(['male', 'female', 'all']).optional(),
      locations: z.array(z.string()).optional(),
      languages: z.array(z.string()).optional()
    }).optional(),
    interests: z.array(z.string()).optional(),
    behaviors: z.array(z.string()).optional()
  }).optional(),
  budget: z.object({
    total: z.number().min(0),
    currency: z.string().default('USD')
  }).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  channels: z.array(z.enum(['email', 'social', 'ad', 'content'])).optional()
});

const LaunchCampaignSchema = z.object({
  immediate: z.boolean().default(true),
  startDate: z.string().datetime().optional()
});

const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  budget: z.object({
    total: z.number().min(0)
  }).optional(),
  endDate: z.string().datetime().optional(),
  targetAudience: z.object({
    demographics: z.object({
      age: z.object({
        min: z.number().min(13).optional(),
        max: z.number().max(120).optional()
      }).optional(),
      gender: z.enum(['male', 'female', 'all']).optional(),
      locations: z.array(z.string()).optional(),
      languages: z.array(z.string()).optional()
    }).optional(),
    interests: z.array(z.string()).optional(),
    behaviors: z.array(z.string()).optional()
  }).optional()
});

const ListCampaignsSchema = PaginationSchema.extend({
  status: z.enum(['draft', 'ready', 'launched', 'paused', 'completed', 'cancelled']).optional(),
  type: z.enum(['email', 'social', 'ad', 'content', 'multi_channel']).optional(),
  objective: z.enum(['awareness', 'consideration', 'conversion', 'retention', 'engagement']).optional()
}).omit({ sort: true, sortBy: true });

/**
 * POST /api/campaigns/create
 * Create a new campaign
 */
router.post('/create',
  validateBody(CreateCampaignSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = req.userId || 'system';

      const campaign = await campaignManager.createCampaign(tenantId, userId, {
        name: req.body.name,
        type: req.body.type,
        objective: req.body.objective,
        description: req.body.description,
        targetAudience: req.body.targetAudience,
        budget: req.body.budget,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        channels: req.body.channels
      });

      logger.info('Campaign created', { tenantId, campaignId: campaign.id });

      res.json({
        success: true,
        data: { campaign }
      });
    } catch (error) {
      logger.error('Create campaign failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create campaign'
        }
      });
    }
  }
);

/**
 * GET /api/campaigns
 * List all campaigns
 */
router.get('/',
  validateBody(ListCampaignsSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';
      const pagination = getPaginationOptions(req.body);

      const result = await campaignManager.listCampaigns(tenantId, {
        status: req.body.status,
        type: req.body.type,
        objective: req.body.objective,
        limit: pagination.limit,
        offset: pagination.skip
      });

      res.json(formatPaginatedResponse(
        result.items,
        result.total,
        (req.body.page || 1),
        (req.body.limit || 20)
      ));
    } catch (error) {
      logger.error('List campaigns failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list campaigns'
        }
      });
    }
  }
);

/**
 * GET /api/campaigns/:id
 * Get campaign by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const campaign = await campaignManager.getCampaign(tenantId, req.params.id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: { campaign }
    });
  } catch (error) {
    logger.error('Get campaign failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get campaign'
      }
    });
  }
});

/**
 * GET /api/campaigns/:id/summary
 * Get campaign performance summary
 */
router.get('/:id/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const summary = await campaignManager.getCampaignSummary(tenantId, req.params.id);

    if (!summary) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Get campaign summary failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'SUMMARY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get campaign summary'
      }
    });
  }
});

/**
 * POST /api/campaigns/:id/launch
 * Launch a campaign
 */
router.post('/:id/launch',
  validateBody(LaunchCampaignSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const result = await campaignManager.launchCampaign(
        tenantId,
        req.params.id,
        req.body.immediate,
        req.body.startDate
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'LAUNCH_FAILED',
            message: result.error
          }
        });
        return;
      }

      logger.info('Campaign launched', { tenantId, campaignId: req.params.id });

      res.json({
        success: true,
        data: {
          campaignId: result.campaign!.id,
          status: result.campaign!.status,
          launchedAt: result.campaign!.launchedAt
        }
      });
    } catch (error) {
      logger.error('Launch campaign failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'LAUNCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to launch campaign'
        }
      });
    }
  }
);

/**
 * POST /api/campaigns/:id/pause
 * Pause a campaign
 */
router.post('/:id/pause', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const campaign = await campaignManager.pauseCampaign(tenantId, req.params.id);

    if (!campaign) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PAUSE_FAILED',
          message: 'Campaign not found or cannot be paused'
        }
      });
      return;
    }

    logger.info('Campaign paused', { tenantId, campaignId: req.params.id });

    res.json({
      success: true,
      data: { campaign }
    });
  } catch (error) {
    logger.error('Pause campaign failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'PAUSE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to pause campaign'
      }
    });
  }
});

/**
 * POST /api/campaigns/:id/resume
 * Resume a paused campaign
 */
router.post('/:id/resume', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const campaign = await campaignManager.resumeCampaign(tenantId, req.params.id);

    if (!campaign) {
      res.status(400).json({
        success: false,
        error: {
          code: 'RESUME_FAILED',
          message: 'Campaign not found or cannot be resumed'
        }
      });
      return;
    }

    logger.info('Campaign resumed', { tenantId, campaignId: req.params.id });

    res.json({
      success: true,
      data: { campaign }
    });
  } catch (error) {
    logger.error('Resume campaign failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'RESUME_FAILED',
        message: error instanceof Error ? error.message : 'Failed to resume campaign'
      }
    });
  }
});

/**
 * POST /api/campaigns/:id/complete
 * Complete a campaign
 */
router.post('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const campaign = await campaignManager.completeCampaign(tenantId, req.params.id);

    if (!campaign) {
      res.status(400).json({
        success: false,
        error: {
          code: 'COMPLETE_FAILED',
          message: 'Campaign not found or cannot be completed'
        }
      });
      return;
    }

    logger.info('Campaign completed', { tenantId, campaignId: req.params.id });

    res.json({
      success: true,
      data: { campaign }
    });
  } catch (error) {
    logger.error('Complete campaign failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'COMPLETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to complete campaign'
      }
    });
  }
});

/**
 * PATCH /api/campaigns/:id
 * Update campaign
 */
router.patch('/:id',
  validateBody(UpdateCampaignSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const campaign = await campaignManager.updateCampaign(tenantId, req.params.id, {
        name: req.body.name,
        description: req.body.description,
        budget: req.body.budget,
        endDate: req.body.endDate,
        targetAudience: req.body.targetAudience
      });

      if (!campaign) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Campaign not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: { campaign }
      });
    } catch (error) {
      logger.error('Update campaign failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update campaign'
        }
      });
    }
  }
);

/**
 * DELETE /api/campaigns/:id
 * Cancel a campaign
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const campaign = await campaignManager.cancelCampaign(tenantId, req.params.id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found'
        }
      });
      return;
    }

    logger.info('Campaign cancelled', { tenantId, campaignId: req.params.id });

    res.json({
      success: true,
      data: { campaign }
    });
  } catch (error) {
    logger.error('Cancel campaign failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CANCEL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to cancel campaign'
      }
    });
  }
});

export { router as campaignRoutes };
