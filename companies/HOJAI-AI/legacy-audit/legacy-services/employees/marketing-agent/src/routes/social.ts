// ============================================
// HOJAI AI - Marketing Agent Social Media Routes
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { socialMediaManager } from '../services/socialMediaManager';
import { validateBody, PaginationSchema, formatPaginatedResponse, getPaginationOptions } from '../utils/validation';
import { logger } from '../utils/logger';
import { SocialPlatform, SocialPostStatus } from '../types';

const router = Router();

// Validation schemas
const CreatePostSchema = z.object({
  platform: z.nativeEnum(SocialPlatform),
  content: z.string().min(1).max(2000),
  mediaUrls: z.array(z.string().url()).optional(),
  hashtags: z.array(z.string().max(30)).optional(),
  mentions: z.array(z.string()).optional(),
  scheduledFor: z.string().datetime().optional(),
  title: z.string().max(200).optional(),
  campaignId: z.string().uuid().optional()
});

const SchedulePostSchema = z.object({
  scheduledFor: z.string().datetime()
});

const ListPostsSchema = PaginationSchema.extend({
  platform: z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok', 'threads', 'reddit']).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'failed']).optional(),
  campaignId: z.string().uuid().optional()
}).omit({ sort: true, sortBy: true });

const CreateSocialCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  platforms: z.array(z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok', 'threads', 'reddit'])).min(1),
  posts: z.array(z.object({
    platform: z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok', 'threads', 'reddit']),
    content: z.string().min(1).max(2000),
    mediaUrls: z.array(z.string().url()).optional(),
    scheduledFor: z.string().datetime().optional()
  })).min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional()
});

/**
 * POST /api/social/post
 * Create a social media post
 */
router.post('/post',
  validateBody(CreatePostSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const post = await socialMediaManager.createPost(tenantId, {
        platform: req.body.platform,
        content: req.body.content,
        mediaUrls: req.body.mediaUrls,
        hashtags: req.body.hashtags,
        mentions: req.body.mentions,
        scheduledFor: req.body.scheduledFor,
        title: req.body.title,
        campaignId: req.body.campaignId
      });

      logger.info('Social post created', { tenantId, postId: post.id, platform: req.body.platform });

      res.json({
        success: true,
        data: { post }
      });
    } catch (error) {
      logger.error('Create post failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create post'
        }
      });
    }
  }
);

/**
 * POST /api/social/post/:id/schedule
 * Schedule a post for publishing
 */
router.post('/post/:id/schedule',
  validateBody(SchedulePostSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const post = await socialMediaManager.schedulePost(
        tenantId,
        req.params.id,
        req.body.scheduledFor
      );

      if (!post) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Post not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: { post }
      });
    } catch (error) {
      logger.error('Schedule post failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to schedule post'
        }
      });
    }
  }
);

/**
 * POST /api/social/post/:id/publish
 * Publish a post immediately
 */
router.post('/post/:id/publish', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const result = await socialMediaManager.publishPost(tenantId, req.params.id);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PUBLISH_FAILED',
          message: result.error
        }
      });
      return;
    }

    res.json({
      success: true,
      data: { post: result.post }
    });
  } catch (error) {
    logger.error('Publish post failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'PUBLISH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to publish post'
      }
    });
  }
});

/**
 * GET /api/social/posts
 * List all social posts
 */
router.get('/posts',
  validateBody(ListPostsSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';
      const pagination = getPaginationOptions(req.body);

      const result = await socialMediaManager.listPosts(tenantId, {
        platform: req.body.platform,
        status: req.body.status,
        campaignId: req.body.campaignId,
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
      logger.error('List posts failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list posts'
        }
      });
    }
  }
);

/**
 * GET /api/social/post/:id
 * Get post by ID
 */
router.get('/post/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';
    const posts = await socialMediaManager.listPosts(tenantId, {
      limit: 1,
      offset: 0
    });

    const post = posts.items.find(p => p.id === req.params.id);

    if (!post) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Post not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: { post }
    });
  } catch (error) {
    logger.error('Get post failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get post'
      }
    });
  }
});

/**
 * GET /api/social/post/:id/analytics
 * Get post analytics
 */
router.get('/post/:id/analytics', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const analytics = await socialMediaManager.getPostAnalytics(tenantId, req.params.id);

    if (!analytics) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Post not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get post analytics failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get analytics'
      }
    });
  }
});

/**
 * POST /api/social/campaign
 * Create a multi-platform social campaign
 */
router.post('/campaign',
  validateBody(CreateSocialCampaignSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const result = await socialMediaManager.createCampaign(tenantId, {
        name: req.body.name,
        platforms: req.body.platforms,
        posts: req.body.posts,
        startDate: req.body.startDate,
        endDate: req.body.endDate
      });

      logger.info('Social campaign created', { tenantId, campaignId: result.campaignId });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Create social campaign failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_CAMPAIGN_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create campaign'
        }
      });
    }
  }
);

/**
 * DELETE /api/social/post/:id
 * Delete a post
 */
router.delete('/post/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const deleted = await socialMediaManager.deletePost(tenantId, req.params.id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Post not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: { deleted: true }
    });
  } catch (error) {
    logger.error('Delete post failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete post'
      }
    });
  }
});

export { router as socialRoutes };
