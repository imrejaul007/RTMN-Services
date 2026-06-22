// ============================================
// HOJAI AI - Marketing Agent Ad Copy Routes
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adCopier } from '../services/adCopier';
import { validateBody, PaginationSchema, formatPaginatedResponse, getPaginationOptions } from '../utils/validation';
import { logger } from '../utils/logger';
import { AdType, SocialPlatform } from '../types';

const router = Router();

// Validation schemas
const GenerateAdCopySchema = z.object({
  adType: z.nativeEnum(AdType),
  productName: z.string().min(1).max(200),
  productDescription: z.string().max(2000).optional(),
  targetAudience: z.string().optional(),
  headlineOptions: z.number().min(1).max(10).default(3),
  descriptionOptions: z.number().min(1).max(5).default(2),
  cta: z.string().max(30).optional(),
  keywords: z.array(z.string()).optional(),
  platform: z.nativeEnum(SocialPlatform).optional()
});

const GenerateABVariationsSchema = z.object({
  adType: z.nativeEnum(AdType),
  productName: z.string().min(1).max(200),
  productDescription: z.string().max(2000).optional(),
  targetAudience: z.string().optional(),
  variations: z.number().min(2).max(10).default(3)
});

const DuplicateAdCopySchema = z.object({
  newPlatform: z.nativeEnum(SocialPlatform)
});

const ListAdCopiesSchema = PaginationSchema.extend({
  adType: z.enum(['search', 'display', 'social', 'video', 'native', 'search_generation']).optional(),
  platform: z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok', 'threads', 'reddit']).optional()
}).omit({ sort: true, sortBy: true });

/**
 * POST /api/ads/copy
 * Generate ad copy
 */
router.post('/copy',
  validateBody(GenerateAdCopySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const result = await adCopier.generateAdCopy(tenantId, {
        adType: req.body.adType,
        productName: req.body.productName,
        productDescription: req.body.productDescription,
        targetAudience: req.body.targetAudience,
        headlineOptions: req.body.headlineOptions,
        descriptionOptions: req.body.descriptionOptions,
        cta: req.body.cta,
        keywords: req.body.keywords,
        platform: req.body.platform
      });

      logger.info('Ad copy generated', { tenantId, adType: req.body.adType, product: req.body.productName });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Generate ad copy failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate ad copy'
        }
      });
    }
  }
);

/**
 * POST /api/ads/ab-variations
 * Generate A/B test variations
 */
router.post('/ab-variations',
  validateBody(GenerateABVariationsSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const variations = await adCopier.generateABVariations(tenantId, {
        adType: req.body.adType,
        productName: req.body.productName,
        productDescription: req.body.productDescription,
        targetAudience: req.body.targetAudience,
        variations: req.body.variations
      });

      logger.info('A/B variations generated', { tenantId, variations: variations.length });

      res.json({
        success: true,
        data: { variations }
      });
    } catch (error) {
      logger.error('Generate A/B variations failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate variations'
        }
      });
    }
  }
);

/**
 * GET /api/ads/copies
 * List ad copies
 */
router.get('/copies',
  validateBody(ListAdCopiesSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';
      const pagination = getPaginationOptions(req.body);

      const result = await adCopier.listAdCopies(tenantId, {
        adType: req.body.adType,
        platform: req.body.platform,
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
      logger.error('List ad copies failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list ad copies'
        }
      });
    }
  }
);

/**
 * GET /api/ads/copies/:id
 * Get ad copy by ID
 */
router.get('/copies/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const adCopy = await adCopier.getAdCopy(tenantId, req.params.id);

    if (!adCopy) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Ad copy not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: adCopy
    });
  } catch (error) {
    logger.error('Get ad copy failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get ad copy'
      }
    });
  }
});

/**
 * POST /api/ads/copies/:id/duplicate
 * Duplicate ad copy for new platform
 */
router.post('/copies/:id/duplicate',
  validateBody(DuplicateAdCopySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const duplicated = await adCopier.duplicateAdCopy(
        tenantId,
        req.params.id,
        req.body.newPlatform
      );

      if (!duplicated) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Original ad copy not found'
          }
        });
        return;
      }

      logger.info('Ad copy duplicated', { tenantId, originalId: req.params.id, newPlatform: req.body.newPlatform });

      res.json({
        success: true,
        data: duplicated
      });
    } catch (error) {
      logger.error('Duplicate ad copy failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'DUPLICATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to duplicate ad copy'
        }
      });
    }
  }
);

/**
 * GET /api/ads/platform/:platform
 * Get ad copies for specific platform
 */
router.get('/platform/:platform', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';
    const platform = req.params.platform as SocialPlatform;

    // Validate platform
    if (!Object.values(SocialPlatform).includes(platform)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PLATFORM',
          message: 'Invalid social platform'
        }
      });
      return;
    }

    const adCopies = await adCopier.getPlatformAdCopy(tenantId, platform);

    res.json({
      success: true,
      data: { adCopies }
    });
  } catch (error) {
    logger.error('Get platform ad copies failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get platform ad copies'
      }
    });
  }
});

export { router as adRoutes };
