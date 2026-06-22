// ============================================
// HOJAI AI - Marketing Agent SEO Routes
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { seoOptimizer } from '../services/seoOptimizer';
import { validateBody, PaginationSchema, formatPaginatedResponse, getPaginationOptions } from '../utils/validation';
import { logger } from '../utils/logger';
import { SEOContentType } from '../types';

const router = Router();

// Validation schemas
const OptimizeSchema = z.object({
  url: z.string().url().optional(),
  content: z.string().min(1).max(50000).optional(),
  type: z.nativeEnum(SEOContentType).default(SEOContentType.BLOG),
  targetKeywords: z.array(z.string()).min(1),
  competitorUrls: z.array(z.string().url()).optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional()
});

const ListOptimizationsSchema = PaginationSchema.extend({
  type: z.enum(['blog', 'landing_page', 'product_page', 'category_page', 'faq']).optional()
}).omit({ sort: true, sortBy: true });

/**
 * POST /api/seo/optimize
 * Optimize content for SEO
 */
router.post('/optimize',
  validateBody(OptimizeSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const result = await seoOptimizer.optimize(tenantId, {
        url: req.body.url,
        content: req.body.content,
        type: req.body.type,
        targetKeywords: req.body.targetKeywords,
        competitorUrls: req.body.competitorUrls,
        metaTitle: req.body.metaTitle,
        metaDescription: req.body.metaDescription
      });

      logger.info('SEO optimization complete', { tenantId, keywords: req.body.targetKeywords });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('SEO optimization failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'OPTIMIZATION_FAILED',
          message: error instanceof Error ? error.message : 'SEO optimization failed'
        }
      });
    }
  }
);

/**
 * GET /api/seo/optimizations
 * List SEO optimizations
 */
router.get('/optimizations',
  validateBody(ListOptimizationsSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';
      const pagination = getPaginationOptions(req.body);

      const result = await seoOptimizer.listOptimizations(tenantId, {
        type: req.body.type,
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
      logger.error('List optimizations failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list optimizations'
        }
      });
    }
  }
);

/**
 * GET /api/seo/optimizations/:id
 * Get optimization by ID
 */
router.get('/optimizations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';
    const optimizations = await seoOptimizer.listOptimizations(tenantId, {
      limit: 1
    });

    const optimization = optimizations.items.find(o => o.id === req.params.id);

    if (!optimization) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Optimization not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    logger.error('Get optimization failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get optimization'
      }
    });
  }
});

/**
 * POST /api/seo/analyze-url
 * Analyze URL for SEO
 */
router.post('/analyze-url',
  validateBody(z.object({
    url: z.string().url()
  })),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const optimization = await seoOptimizer.analyzeUrl(tenantId, req.body.url);

      if (!optimization) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No optimization found for this URL'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: optimization
      });
    } catch (error) {
      logger.error('Analyze URL failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYZE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to analyze URL'
        }
      });
    }
  }
);

export { router as seoRoutes };
