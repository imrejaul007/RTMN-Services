/**
 * Article Routes - Express routes for article operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { articleService } from '../services/articleService';
import { ArticleStatus, ArticleVisibility } from '../models/Article';
import logger from 'utils/logger.js';

export const articleRoutes = Router();

// Validation schemas
const createArticleSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  summary: z.string().max(500).optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
  visibility: z.nativeEnum(ArticleVisibility).optional(),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).optional(),
  authorId: z.string().min(1),
  authorName: z.string().min(1),
  authorEmail: z.string().email(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
  relatedArticles: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateArticleSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().max(500).optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
  visibility: z.nativeEnum(ArticleVisibility).optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
  relatedArticles: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/articles
 * Create a new article
 */
articleRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createArticleSchema.parse(req.body);
    const article = await articleService.createArticle(validated);
    res.status(201).json({ success: true, data: article });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to create article', { error });
    res.status(500).json({ success: false, error: 'Failed to create article' });
  }
});

/**
 * GET /api/articles
 * Get all articles with filters
 */
articleRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      visibility,
      categoryId,
      tags,
      authorId,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {
      status: status as ArticleStatus | undefined,
      visibility: visibility as ArticleVisibility | undefined,
      categoryId: categoryId as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      authorId: authorId as string | undefined,
    };

    const result = await articleService.getArticles(
      filter,
      parseInt(page as string, 10),
      parseInt(limit as string, 10),
      sortBy as string,
      sortOrder as 'asc' | 'desc'
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get articles', { error });
    res.status(500).json({ success: false, error: 'Failed to get articles' });
  }
});

/**
 * GET /api/articles/search
 * Search articles
 */
articleRoutes.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, categoryId, tags, limit = '20' } = req.query;

    if (!q) {
      res.status(400).json({ success: false, error: 'Search query is required' });
      return;
    }

    const result = await articleService.searchArticles({
      query: q as string,
      filters: {
        categoryId: categoryId as string | undefined,
        tags: tags ? (tags as string).split(',') : undefined,
      },
      limit: parseInt(limit as string, 10),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to search articles', { error });
    res.status(500).json({ success: false, error: 'Failed to search articles' });
  }
});

/**
 * GET /api/articles/popular
 * Get popular articles
 */
articleRoutes.get('/popular', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const articles = await articleService.getPopularArticles(parseInt(limit as string, 10));
    res.json({ success: true, data: articles });
  } catch (error) {
    logger.error('Failed to get popular articles', { error });
    res.status(500).json({ success: false, error: 'Failed to get popular articles' });
  }
});

/**
 * GET /api/articles/:id
 * Get article by ID
 */
articleRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const article = await articleService.getArticleById(req.params.id);
    if (!article) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }
    res.json({ success: true, data: article });
  } catch (error) {
    logger.error('Failed to get article', { error, articleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get article' });
  }
});

/**
 * GET /api/articles/slug/:slug
 * Get article by slug
 */
articleRoutes.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const article = await articleService.getArticleBySlug(req.params.slug);
    if (!article) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }
    res.json({ success: true, data: article });
  } catch (error) {
    logger.error('Failed to get article by slug', { error, slug: req.params.slug });
    res.status(500).json({ success: false, error: 'Failed to get article' });
  }
});

/**
 * PUT /api/articles/:id
 * Update article
 */
articleRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const validated = updateArticleSchema.parse(req.body);
    const article = await articleService.updateArticle(req.params.id, validated);
    if (!article) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }
    res.json({ success: true, data: article });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to update article', { error, articleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to update article' });
  }
});

/**
 * DELETE /api/articles/:id
 * Delete article
 */
articleRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await articleService.deleteArticle(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }
    res.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    logger.error('Failed to delete article', { error, articleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to delete article' });
  }
});

/**
 * POST /api/articles/:id/feedback
 * Record article feedback
 */
articleRoutes.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { isHelpful } = req.body;
    if (typeof isHelpful !== 'boolean') {
      res.status(400).json({ success: false, error: 'isHelpful must be a boolean' });
      return;
    }

    const article = await articleService.recordFeedback(req.params.id, isHelpful);
    if (!article) {
      res.status(404).json({ success: false, error: 'Article not found' });
      return;
    }
    res.json({ success: true, data: article });
  } catch (error) {
    logger.error('Failed to record feedback', { error, articleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to record feedback' });
  }
});

/**
 * GET /api/articles/:id/related
 * Get related articles
 */
articleRoutes.get('/:id/related', async (req: Request, res: Response) => {
  try {
    const { limit = '5' } = req.query;
    const articles = await articleService.getRelatedArticles(req.params.id, parseInt(limit as string, 10));
    res.json({ success: true, data: articles });
  } catch (error) {
    logger.error('Failed to get related articles', { error, articleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get related articles' });
  }
});

export default articleRoutes;