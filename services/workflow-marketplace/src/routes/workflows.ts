import { Router, Request, Response } from 'express';
import { Workflow } from '../models/Workflow';
import { searchService } from '../services/search';
import { Industry, WorkflowCategory } from '../types';
import logger from '../logger';

const router = Router();

/**
 * GET /api/marketplace/workflows
 * List all workflows with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      industry,
      category,
      query,
      minRating,
      featured,
      sortBy,
      limit = '20',
      offset = '0',
    } = req.query;

    const filters = {
      industry: industry as Industry | undefined,
      category: category as WorkflowCategory | undefined,
      query: query as string | undefined,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      sortBy: sortBy as 'installs' | 'rating' | 'newest' | undefined,
    };

    const result = await searchService.searchWorkflows(filters);
    const pageLimit = parseInt(limit as string, 10);
    const pageOffset = parseInt(offset as string, 10);

    const paginatedWorkflows = result.workflows.slice(
      pageOffset,
      pageOffset + pageLimit
    );

    res.json({
      success: true,
      data: {
        workflows: paginatedWorkflows,
        total: result.total,
        limit: pageLimit,
        offset: pageOffset,
      },
    });
  } catch (error) {
    logger.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows',
    });
  }
});

/**
 * GET /api/marketplace/workflows/featured
 * Get featured workflows
 */
router.get('/featured', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const workflows = await searchService.getFeatured(limit);

    res.json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    logger.error('Error fetching featured workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured workflows',
    });
  }
});

/**
 * GET /api/marketplace/workflows/popular
 * Get popular workflows by installs
 */
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const workflows = await searchService.getPopular(limit);

    res.json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    logger.error('Error fetching popular workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular workflows',
    });
  }
});

/**
 * GET /api/marketplace/workflows/industry/:industry
 * Get workflows by industry
 */
router.get('/industry/:industry', async (req: Request, res: Response) => {
  try {
    const { industry } = req.params;
    const workflows = await searchService.getByIndustry(industry as Industry);

    res.json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    logger.error('Error fetching workflows by industry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows',
    });
  }
});

/**
 * GET /api/marketplace/workflows/category/:category
 * Get workflows by category
 */
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const workflows = await searchService.getByCategory(
      category as WorkflowCategory
    );

    res.json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    logger.error('Error fetching workflows by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows',
    });
  }
});

/**
 * GET /api/marketplace/workflows/:workflowId
 * Get single workflow details
 */
router.get('/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const workflow = await Workflow.findOne({ workflowId });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    // Get related workflows
    const related = await searchService.getRelated(workflowId, 5);

    res.json({
      success: true,
      data: {
        workflow,
        related,
      },
    });
  } catch (error) {
    logger.error('Error fetching workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow',
    });
  }
});

export default router;
