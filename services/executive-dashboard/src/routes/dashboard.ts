import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dashboardRepository } from '../models/Dashboard';
import { CreateDashboardSchema } from '../types';
import winston from 'winston';

const router = Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// ============================================================================
// Helper Functions
// ============================================================================

const getTenantId = (req: Request): string => {
  return (req as any).tenantId || 'default';
};

const getUserId = (req: Request): string => {
  return (req as any).userId || 'system';
};

// ============================================================================
// Dashboard CRUD Endpoints
// ============================================================================

/**
 * GET /api/dashboards
 * List all dashboards for the tenant
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const result = await dashboardRepository.findByTenant(tenantId, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        totalPages: Math.ceil(result.total / parseInt(limit as string, 10)),
      },
    });
  } catch (error) {
    logger.error('Error listing dashboards', { error });
    next(error);
  }
});

/**
 * GET /api/dashboards/default
 * Get the default dashboard for the tenant
 */
router.get('/default', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const dashboard = await dashboardRepository.findDefault(tenantId);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Default dashboard not found',
      });
    }

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Error getting default dashboard', { error });
    next(error);
  }
});

/**
 * GET /api/dashboards/:id
 * Get a specific dashboard
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const dashboard = await dashboardRepository.findByTenantAndId(tenantId, id);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Error getting dashboard', { error });
    next(error);
  }
});

/**
 * POST /api/dashboards
 * Create a new dashboard
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    // Validate request body
    const validatedData = CreateDashboardSchema.parse(req.body);

    const dashboardData = {
      dashboardId: uuidv4(),
      tenantId,
      name: validatedData.name,
      description: validatedData.description,
      widgets: validatedData.widgets || [],
      layout: validatedData.layout || { columns: 12, rows: [] },
      filters: validatedData.filters || [],
      refreshInterval: validatedData.refreshInterval || 60000,
      isDefault: validatedData.isDefault || false,
      isPublic: validatedData.isPublic || false,
      createdBy: userId,
    };

    const dashboard = await dashboardRepository.create(dashboardData);

    // If this is set as default, unset other defaults
    if (validatedData.isDefault) {
      await dashboardRepository.setDefault(tenantId, dashboard.dashboardId);
    }

    logger.info('Dashboard created', { tenantId, dashboardId: dashboard.dashboardId });

    res.status(201).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error,
      });
    }
    logger.error('Error creating dashboard', { error });
    next(error);
  }
});

/**
 * PUT /api/dashboards/:id
 * Update a dashboard
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { isDefault, ...updateData } = req.body;

    // If setting as default, unset others first
    if (isDefault) {
      await dashboardRepository.setDefault(tenantId, id);
    }

    const dashboard = await dashboardRepository.update(id, updateData);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    logger.info('Dashboard updated', { tenantId, dashboardId: id });

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Error updating dashboard', { error });
    next(error);
  }
});

/**
 * PATCH /api/dashboards/:id
 * Partial update of a dashboard
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const dashboard = await dashboardRepository.update(id, req.body);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    logger.info('Dashboard partially updated', { tenantId, dashboardId: id });

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Error partially updating dashboard', { error });
    next(error);
  }
});

/**
 * DELETE /api/dashboards/:id
 * Delete a dashboard
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const deleted = await dashboardRepository.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    logger.info('Dashboard deleted', { tenantId, dashboardId: id });

    res.json({
      success: true,
      message: 'Dashboard deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting dashboard', { error });
    next(error);
  }
});

// ============================================================================
// Widget Management Endpoints
// ============================================================================

/**
 * POST /api/dashboards/:id/widgets
 * Add a widget to a dashboard
 */
router.post('/:id/widgets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { widgetId } = req.body;

    // Verify dashboard exists and belongs to tenant
    const dashboard = await dashboardRepository.findByTenantAndId(tenantId, id);
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    const updated = await dashboardRepository.addWidget(id, widgetId);

    logger.info('Widget added to dashboard', { tenantId, dashboardId: id, widgetId });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Error adding widget to dashboard', { error });
    next(error);
  }
});

/**
 * DELETE /api/dashboards/:id/widgets/:widgetId
 * Remove a widget from a dashboard
 */
router.delete('/:id/widgets/:widgetId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id, widgetId } = req.params;

    const updated = await dashboardRepository.removeWidget(id, widgetId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    logger.info('Widget removed from dashboard', { tenantId, dashboardId: id, widgetId });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Error removing widget from dashboard', { error });
    next(error);
  }
});

// ============================================================================
// Layout Management Endpoints
// ============================================================================

/**
 * PUT /api/dashboards/:id/layout
 * Update dashboard layout
 */
router.put('/:id/layout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { layout } = req.body;

    const dashboard = await dashboardRepository.updateLayout(id, layout);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    logger.info('Dashboard layout updated', { tenantId, dashboardId: id });

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Error updating dashboard layout', { error });
    next(error);
  }
});

/**
 * PUT /api/dashboards/:id/filters
 * Update dashboard filters
 */
router.put('/:id/filters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { filters } = req.body;

    const dashboard = await dashboardRepository.updateFilters(id, filters);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    logger.info('Dashboard filters updated', { tenantId, dashboardId: id });

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Error updating dashboard filters', { error });
    next(error);
  }
});

// ============================================================================
// Clone Endpoint
// ============================================================================

/**
 * POST /api/dashboards/:id/clone
 * Clone a dashboard
 */
router.post('/:id/clone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { id } = req.params;
    const { name } = req.body;

    const cloned = await dashboardRepository.clone(id, name || 'Cloned Dashboard', userId);

    if (!cloned) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
      });
    }

    logger.info('Dashboard cloned', { tenantId, originalId: id, newId: cloned.dashboardId });

    res.status(201).json({
      success: true,
      data: cloned,
    });
  } catch (error) {
    logger.error('Error cloning dashboard', { error });
    next(error);
  }
});

// ============================================================================
// Set Default Endpoint
// ============================================================================

/**
 * POST /api/dashboards/:id/set-default
 * Set dashboard as default
 */
router.post('/:id/set-default', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    await dashboardRepository.setDefault(tenantId, id);

    const dashboard = await dashboardRepository.findByTenantAndId(tenantId, id);

    logger.info('Dashboard set as default', { tenantId, dashboardId: id });

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Error setting dashboard as default', { error });
    next(error);
  }
});

export default router;
