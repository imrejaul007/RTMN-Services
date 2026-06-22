/**
 * Category Routes - Express routes for category operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { categoryService } from '../services/categoryService';
import logger from 'utils/logger.js';

export const categoryRoutes = Router();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

const reorderCategoriesSchema = z.array(z.object({
  categoryId: z.string(),
  order: z.number(),
}));

/**
 * POST /api/categories
 * Create a new category
 */
categoryRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const validated = createCategorySchema.parse(req.body);
    const category = await categoryService.createCategory(validated);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to create category', { error });
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

/**
 * GET /api/categories
 * Get all categories
 */
categoryRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { includeInactive = 'false', tree = 'false' } = req.query;

    let categories;
    if (tree === 'true') {
      categories = await categoryService.getCategoryTree();
    } else {
      categories = await categoryService.getCategories(includeInactive === 'true');
    }

    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Failed to get categories', { error });
    res.status(500).json({ success: false, error: 'Failed to get categories' });
  }
});

/**
 * GET /api/categories/tree
 * Get category tree structure
 */
categoryRoutes.get('/tree', async (_req: Request, res: Response) => {
  try {
    const tree = await categoryService.getCategoryTree();
    res.json({ success: true, data: tree });
  } catch (error) {
    logger.error('Failed to get category tree', { error });
    res.status(500).json({ success: false, error: 'Failed to get category tree' });
  }
});

/**
 * GET /api/categories/:id
 * Get category by ID
 */
categoryRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    res.json({ success: true, data: category });
  } catch (error) {
    logger.error('Failed to get category', { error, categoryId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to get category' });
  }
});

/**
 * GET /api/categories/slug/:slug
 * Get category by slug
 */
categoryRoutes.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    res.json({ success: true, data: category });
  } catch (error) {
    logger.error('Failed to get category by slug', { error, slug: req.params.slug });
    res.status(500).json({ success: false, error: 'Failed to get category' });
  }
});

/**
 * PUT /api/categories/:id
 * Update category
 */
categoryRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const validated = updateCategorySchema.parse(req.body);
    const category = await categoryService.updateCategory(req.params.id, validated);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    res.json({ success: true, data: category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to update category', { error, categoryId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

/**
 * DELETE /api/categories/:id
 * Delete category
 */
categoryRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await categoryService.deleteCategory(req.params.id);
    if (!deleted) {
      res.status(400).json({ success: false, error: 'Cannot delete category with children or category not found' });
      return;
    }
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    logger.error('Failed to delete category', { error, categoryId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

/**
 * POST /api/categories/reorder
 * Reorder categories
 */
categoryRoutes.post('/reorder', async (req: Request, res: Response) => {
  try {
    const validated = reorderCategoriesSchema.parse(req.body);
    await categoryService.reorderCategories(validated);
    res.json({ success: true, message: 'Categories reordered' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    logger.error('Failed to reorder categories', { error });
    res.status(500).json({ success: false, error: 'Failed to reorder categories' });
  }
});

export default categoryRoutes;