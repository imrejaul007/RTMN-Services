import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { featureService, EntityFeatures } from '../services/featureService';
import logger from '../utils/logger';

const log = logger.child({ service: 'FeatureRoutes' });
const router = Router();

// Validation schemas
const updateFeatureSchema = Joi.object({
  entityId: Joi.string().required(),
  entityType: Joi.string().required(),
  features: Joi.object({
    relevance: Joi.object({
      textMatch: Joi.number().min(0).max(1).optional(),
      semanticScore: Joi.number().min(0).max(1).optional(),
      categoryMatch: Joi.number().min(0).max(1).optional()
    }).optional(),
    popularity: Joi.object({
      views: Joi.number().min(0).optional(),
      clicks: Joi.number().min(0).optional(),
      purchases: Joi.number().min(0).optional(),
      ratings: Joi.number().min(0).optional(),
      avgRating: Joi.number().min(0).max(5).optional()
    }).optional(),
    recency: Joi.object({
      createdAt: Joi.date().iso().optional(),
      updatedAt: Joi.date().iso().optional(),
      hoursSinceUpdate: Joi.number().min(0).optional()
    }).optional(),
    quality: Joi.object({
      avgRating: Joi.number().min(0).max(5).optional(),
      reviewCount: Joi.number().min(0).optional(),
      qaCount: Joi.number().min(0).optional(),
      completionRate: Joi.number().min(0).max(1).optional()
    }).optional(),
    location: Joi.object({
      country: Joi.string().optional(),
      region: Joi.string().optional(),
      city: Joi.string().optional(),
      distance: Joi.number().min(0).optional()
    }).optional(),
    personalization: Joi.object({
      userAffinity: Joi.number().min(0).max(1).optional(),
      viewCount: Joi.number().min(0).optional(),
      purchaseCount: Joi.number().min(0).optional(),
      avgPosition: Joi.number().min(0).optional()
    }).optional(),
    trending: Joi.object({
      velocity: Joi.number().optional(),
      trendScore: Joi.number().min(0).max(100).optional(),
      spikeCount: Joi.number().min(0).optional()
    }).optional(),
    custom: Joi.object().pattern(Joi.string(), Joi.number()).optional()
  }).required()
});

const bulkUpdateSchema = Joi.object({
  updates: Joi.array().items(updateFeatureSchema).min(1).max(1000).required()
});

// GET /features/:entityId - Get entity features
router.get('/features/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const entityType = req.query.type as string || 'default';

    const features = await featureService.getFeatures(entityId, entityType);

    if (!features) {
      return res.status(404).json({
        error: 'Features not found',
        entityId,
        entityType
      });
    }

    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    log.error('Get features failed', { error, entityId: req.params.entityId });
    res.status(500).json({
      error: 'Failed to get features',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /features - Update features
router.post('/features', async (req: Request, res: Response) => {
  try {
    const { error, value } = updateFeatureSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const { entityId, entityType, features } = value;
    const result = await featureService.updateFeatures(entityId, entityType, features);

    log.info('Features updated via API', { entityId, entityType });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    log.error('Update features failed', { error });
    res.status(500).json({
      error: 'Failed to update features',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /features/batch - Bulk update features
router.post('/features/batch', async (req: Request, res: Response) => {
  try {
    const { error, value } = bulkUpdateSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const updates = value.updates.map((u: typeof value.updates[0]) => ({
      entityId: u.entityId,
      entityType: u.entityType,
      features: u.features
    }));

    const count = await featureService.bulkUpdateFeatures(updates);

    log.info('Bulk features update completed', { count });

    res.json({
      success: true,
      data: {
        updatedCount: count
      }
    });
  } catch (error) {
    log.error('Bulk update failed', { error });
    res.status(500).json({
      error: 'Failed to bulk update features',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /features/:entityId/trending - Get trending score for entity
router.get('/features/:entityId/trending', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const entityType = req.query.type as string || 'default';

    const trendScore = await featureService.computeTrendingScore(entityId, entityType);

    res.json({
      success: true,
      data: {
        entityId,
        entityType,
        trendScore,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('Get trending score failed', { error, entityId: req.params.entityId });
    res.status(500).json({
      error: 'Failed to get trending score',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /features/compute - Compute features for multiple items
router.post('/features/compute', async (req: Request, res: Response) => {
  try {
    const items = req.body.items as Array<{ entityId: string; entityType: string }>;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'Expected items array'
      });
    }

    const results: EntityFeatures[] = [];

    for (const item of items) {
      const features = await featureService.getFeatures(item.entityId, item.entityType);
      if (features) {
        results.push(features);
      }
    }

    res.json({
      success: true,
      data: results,
      meta: {
        requested: items.length,
        found: results.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('Compute features failed', { error });
    res.status(500).json({
      error: 'Failed to compute features',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
