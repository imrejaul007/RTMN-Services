// ============================================
// HOJAI AI - Marketing Agent Content Routes
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { contentGenerator } from '../services/contentGenerator';
import { validateBody, PaginationSchema, formatPaginatedResponse, getPaginationOptions } from '../utils/validation';
import { logger } from '../utils/logger';
import { ContentType, ContentStatus } from '../types';

const router = Router();

// Validation schemas
const GenerateContentSchema = z.object({
  type: z.nativeEnum(ContentType),
  topic: z.string().min(1).max(500),
  keywords: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  tone: z.string().optional(),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  brandVoice: z.string().max(200).optional(),
  cta: z.string().max(200).optional(),
  additionalContext: z.string().max(2000).optional()
});

const ListContentSchema = PaginationSchema.extend({
  type: z.enum(['blog_post', 'social_media', 'email', 'ad_copy', 'landing_page', 'product_description', 'video_script', 'newsletter', 'case_study', 'white_paper']).optional(),
  status: z.enum(['draft', 'review', 'approved', 'published', 'archived']).optional(),
  createdBy: z.string().optional()
}).omit({ sort: true, sortBy: true });

/**
 * POST /api/content/generate
 * Generate new content
 */
router.post('/generate',
  validateBody(GenerateContentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = req.userId || 'system';

      const result = await contentGenerator.generateContent(tenantId, userId, {
        type: req.body.type,
        topic: req.body.topic,
        keywords: req.body.keywords,
        targetAudience: req.body.targetAudience,
        tone: req.body.tone as any,
        length: req.body.length,
        brandVoice: req.body.brandVoice,
        cta: req.body.cta,
        additionalContext: req.body.additionalContext
      });

      logger.info('Content generated', { tenantId, type: req.body.type });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Content generation failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Content generation failed'
        }
      });
    }
  }
);

/**
 * GET /api/content
 * List generated content
 */
router.get('/',
  validateBody(ListContentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';
      const pagination = getPaginationOptions(req.body);

      const result = await contentGenerator.listContent(tenantId, {
        type: req.body.type,
        status: req.body.status,
        createdBy: req.body.createdBy,
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
      logger.error('List content failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list content'
        }
      });
    }
  }
);

/**
 * GET /api/content/:id
 * Get content by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';
    const content = await contentGenerator.getContent(tenantId, req.params.id);

    if (!content) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Content not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    logger.error('Get content failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get content'
      }
    });
  }
});

/**
 * PATCH /api/content/:id/status
 * Update content status
 */
router.patch('/:id/status',
  validateBody(z.object({
    status: z.nativeEnum(ContentStatus)
  })),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const content = await contentGenerator.updateContentStatus(
        tenantId,
        req.params.id,
        req.body.status
      );

      if (!content) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Content not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      logger.error('Update content status failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update content status'
        }
      });
    }
  }
);

export { router as contentRoutes };
