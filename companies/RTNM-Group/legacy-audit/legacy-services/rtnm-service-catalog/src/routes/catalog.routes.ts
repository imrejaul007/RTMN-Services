import { Router, Request, Response, NextFunction } from 'express';
import catalogService from '../services/catalog.service';
import logger from '../utils/logger';

const router = Router();

/**
 * Validation middleware
 */
const validateServiceInput = (req: Request, res: Response, next: NextFunction): void => {
  const { name, description, category, pricing, sla, capabilities } = req.body;

  const errors: string[] = [];

  if (!name || typeof name !== 'string') {
    errors.push('Name is required and must be a string');
  }

  if (!description || typeof description !== 'string') {
    errors.push('Description is required and must be a string');
  }

  if (!category || typeof category !== 'string') {
    errors.push('Category is required and must be a string');
  }

  if (!pricing || typeof pricing !== 'object') {
    errors.push('Pricing is required and must be an object');
  } else {
    if (!pricing.model) errors.push('Pricing model is required');
    if (typeof pricing.rate !== 'number') errors.push('Pricing rate is required and must be a number');
    if (!pricing.unit) errors.push('Pricing unit is required');
  }

  if (!sla || typeof sla !== 'object') {
    errors.push('SLA is required and must be an object');
  } else {
    if (typeof sla.uptime !== 'number') errors.push('SLA uptime is required and must be a number');
    if (typeof sla.responseTime !== 'number') errors.push('SLA responseTime is required and must be a number');
  }

  if (!capabilities || !Array.isArray(capabilities) || capabilities.length === 0) {
    errors.push('Capabilities is required and must be a non-empty array');
  }

  if (errors.length > 0) {
    res.status(400).json({ error: 'Validation failed', details: errors });
    return;
  }

  next();
};

/**
 * POST /services - Publish a new service
 */
router.post('/', validateServiceInput, async (req: Request, res: Response): Promise<void> => {
  try {
    const service = await catalogService.publishService(req.body);
    res.status(201).json({
      success: true,
      message: 'Service published successfully',
      data: service,
    });
  } catch (error) {
    logger.error('Failed to publish service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish service',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /services - List all services
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;

    const result = await catalogService.searchServices({
      status: status as 'active' | 'deprecated' | 'maintenance' | 'inactive',
      page,
      limit,
    });

    res.json({
      success: true,
      data: result.services,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error('Failed to list services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list services',
    });
  }
});

/**
 * GET /services/search - Search services with filters
 */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q: search,
      category,
      corpId,
      status,
      pricingModel,
      minPrice,
      maxPrice,
      tags,
      capabilities,
      page = 1,
      limit = 20,
    } = req.query;

    const result = await catalogService.searchServices({
      search: search as string,
      category: category as string,
      corpId: corpId as string,
      status: status as 'active' | 'deprecated' | 'maintenance' | 'inactive',
      pricingModel: pricingModel as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      capabilities: capabilities ? (capabilities as string).split(',') : undefined,
      page: parseInt(page as string),
      limit: Math.min(parseInt(limit as string), 100),
    });

    res.json({
      success: true,
      data: result.services,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error('Failed to search services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search services',
    });
  }
});

/**
 * GET /services/categories - Get all categories
 */
router.get('/categories', async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await catalogService.getCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('Failed to get categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
    });
  }
});

/**
 * GET /services/stats - Get service statistics
 */
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await catalogService.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
    });
  }
});

/**
 * GET /services/company/:corpId - Get company's services
 */
router.get('/company/:corpId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { corpId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;

    const result = await catalogService.getCompanyServices(corpId, {
      status,
      page,
      limit,
    });

    res.json({
      success: true,
      data: result.services,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error(`Failed to get company services for ${req.params.corpId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get company services',
    });
  }
});

/**
 * GET /services/category/:category - Get services by category
 */
router.get('/category/:category', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = (req.query.status as string) || 'active';

    const result = await catalogService.getServicesByCategory(category, {
      status: status as 'active' | 'deprecated' | 'maintenance' | 'inactive',
      page,
      limit,
    });

    res.json({
      success: true,
      data: result.services,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error(`Failed to get services by category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get services by category',
    });
  }
});

/**
 * GET /services/:serviceId - Get a specific service
 */
router.get('/:serviceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const service = await catalogService.getService(serviceId);

    if (!service) {
      res.status(404).json({
        success: false,
        error: 'Service not found',
      });
      return;
    }

    res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    logger.error(`Failed to get service ${req.params.serviceId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service',
    });
  }
});

/**
 * PUT /services/:serviceId - Update a service
 */
router.put('/:serviceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const service = await catalogService.updateService(serviceId, req.body);

    if (!service) {
      res.status(404).json({
        success: false,
        error: 'Service not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: service,
    });
  } catch (error) {
    logger.error(`Failed to update service ${req.params.serviceId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update service',
    });
  }
});

/**
 * DELETE /services/:serviceId - Delete a service
 */
router.delete('/:serviceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const deleted = await catalogService.deleteService(serviceId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Service not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    logger.error(`Failed to delete service ${req.params.serviceId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete service',
    });
  }
});

export default router;
