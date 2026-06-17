import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { widgetRepository } from '../models/Widget';
import { CreateWidgetSchema, WidgetType } from '../types';
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
// Widget CRUD Endpoints
// ============================================================================

/**
 * GET /api/widgets
 * List all widgets for the tenant
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const {
      page = '1',
      limit = '50',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      type,
      dashboardId,
    } = req.query;

    const result = await widgetRepository.findByTenant(tenantId, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      type: type as string,
      dashboardId: dashboardId as string,
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
    logger.error('Error listing widgets', { error });
    next(error);
  }
});

/**
 * GET /api/widgets/types
 * Get available widget types
 */
router.get('/types', (req: Request, res: Response) => {
  const widgetTypes = Object.values(WidgetType);
  res.json({
    success: true,
    data: widgetTypes.map(type => ({
      type,
      description: getWidgetTypeDescription(type),
      defaultSize: getWidgetDefaultSize(type),
    })),
  });
});

/**
 * GET /api/widgets/templates
 * Get widget templates
 */
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.query;
    const templates = await widgetRepository.getTemplates(type as string);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Error getting widget templates', { error });
    next(error);
  }
});

/**
 * GET /api/widgets/dashboard/:dashboardId
 * Get widgets for a specific dashboard
 */
router.get('/dashboard/:dashboardId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { dashboardId } = req.params;

    const widgets = await widgetRepository.findByDashboard(dashboardId);

    res.json({
      success: true,
      data: widgets,
    });
  } catch (error) {
    logger.error('Error getting dashboard widgets', { error });
    next(error);
  }
});

/**
 * GET /api/widgets/:id
 * Get a specific widget
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const widget = await widgetRepository.findByTenantAndId(tenantId, id);

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found',
      });
    }

    res.json({
      success: true,
      data: widget,
    });
  } catch (error) {
    logger.error('Error getting widget', { error });
    next(error);
  }
});

/**
 * POST /api/widgets
 * Create a new widget
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    // Validate request body
    const validatedData = CreateWidgetSchema.parse(req.body);

    const widgetData = {
      widgetId: uuidv4(),
      tenantId,
      name: validatedData.name,
      type: validatedData.type,
      title: validatedData.title,
      description: validatedData.description,
      dataSource: validatedData.dataSource,
      visualization: validatedData.visualization || {
        showTitle: true,
        showLegend: true,
        showLabels: true,
      },
      refreshInterval: validatedData.refreshInterval || 60000,
      position: validatedData.position || { x: 0, y: 0, width: 4, height: 3 },
      createdBy: userId,
    };

    const widget = await widgetRepository.create(widgetData);

    logger.info('Widget created', { tenantId, widgetId: widget.widgetId });

    res.status(201).json({
      success: true,
      data: widget,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error,
      });
    }
    logger.error('Error creating widget', { error });
    next(error);
  }
});

/**
 * POST /api/widgets/bulk
 * Bulk create widgets
 */
router.post('/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { widgets } = req.body;

    if (!Array.isArray(widgets) || widgets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Widgets array is required',
      });
    }

    const widgetsWithIds = widgets.map((w: any) => ({
      ...w,
      widgetId: uuidv4(),
      tenantId,
      createdBy: userId,
      visualization: w.visualization || {
        showTitle: true,
        showLegend: true,
        showLabels: true,
      },
      refreshInterval: w.refreshInterval || 60000,
      position: w.position || { x: 0, y: 0, width: 4, height: 3 },
    }));

    const created = await widgetRepository.bulkCreate(widgetsWithIds);

    logger.info('Widgets bulk created', { tenantId, count: created.length });

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    logger.error('Error bulk creating widgets', { error });
    next(error);
  }
});

/**
 * PUT /api/widgets/:id
 * Update a widget
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const widget = await widgetRepository.update(id, req.body);

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found',
      });
    }

    logger.info('Widget updated', { tenantId, widgetId: id });

    res.json({
      success: true,
      data: widget,
    });
  } catch (error) {
    logger.error('Error updating widget', { error });
    next(error);
  }
});

/**
 * PATCH /api/widgets/:id
 * Partial update of a widget
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const widget = await widgetRepository.update(id, req.body);

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found',
      });
    }

    logger.info('Widget partially updated', { tenantId, widgetId: id });

    res.json({
      success: true,
      data: widget,
    });
  } catch (error) {
    logger.error('Error partially updating widget', { error });
    next(error);
  }
});

/**
 * DELETE /api/widgets/:id
 * Delete a widget
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const deleted = await widgetRepository.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found',
      });
    }

    logger.info('Widget deleted', { tenantId, widgetId: id });

    res.json({
      success: true,
      message: 'Widget deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting widget', { error });
    next(error);
  }
});

// ============================================================================
// Widget Position Endpoints
// ============================================================================

/**
 * PATCH /api/widgets/:id/position
 * Update widget position
 */
router.patch('/:id/position', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { position } = req.body;

    const widget = await widgetRepository.updatePosition(id, position);

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found',
      });
    }

    logger.info('Widget position updated', { tenantId, widgetId: id });

    res.json({
      success: true,
      data: widget,
    });
  } catch (error) {
    logger.error('Error updating widget position', { error });
    next(error);
  }
});

/**
 * PATCH /api/widgets/:id/datasource
 * Update widget data source
 */
router.patch('/:id/datasource', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { dataSource } = req.body;

    const widget = await widgetRepository.updateDataSource(id, dataSource);

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found',
      });
    }

    logger.info('Widget data source updated', { tenantId, widgetId: id });

    res.json({
      success: true,
      data: widget,
    });
  } catch (error) {
    logger.error('Error updating widget data source', { error });
    next(error);
  }
});

/**
 * PATCH /api/widgets/:id/visualization
 * Update widget visualization settings
 */
router.patch('/:id/visualization', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { visualization } = req.body;

    const widget = await widgetRepository.updateVisualization(id, visualization);

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found',
      });
    }

    logger.info('Widget visualization updated', { tenantId, widgetId: id });

    res.json({
      success: true,
      data: widget,
    });
  } catch (error) {
    logger.error('Error updating widget visualization', { error });
    next(error);
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

function getWidgetTypeDescription(type: WidgetType): string {
  const descriptions: Record<WidgetType, string> = {
    [WidgetType.KPI_CARD]: 'Display key performance indicators with current value and trend',
    [WidgetType.LINE_CHART]: 'Show trends over time with line visualization',
    [WidgetType.BAR_CHART]: 'Compare values across categories with bar visualization',
    [WidgetType.PIE_CHART]: 'Show composition and distribution as pie slices',
    [WidgetType.TABLE]: 'Display detailed data in tabular format',
    [WidgetType.GAUGE]: 'Display single metric with gauge visualization',
    [WidgetType.HEATMAP]: 'Show intensity patterns across dimensions',
    [WidgetType.SCORE_CARD]: 'Display scores with rating visualization',
    [WidgetType.TREND_INDICATOR]: 'Show directional trends with arrows',
    [WidgetType.ALERT_LIST]: 'Display alerts and notifications list',
  };
  return descriptions[type] || 'Unknown widget type';
}

function getWidgetDefaultSize(type: WidgetType): { width: number; height: number } {
  const sizes: Record<WidgetType, { width: number; height: number }> = {
    [WidgetType.KPI_CARD]: { width: 3, height: 2 },
    [WidgetType.LINE_CHART]: { width: 8, height: 4 },
    [WidgetType.BAR_CHART]: { width: 6, height: 4 },
    [WidgetType.PIE_CHART]: { width: 4, height: 4 },
    [WidgetType.TABLE]: { width: 8, height: 5 },
    [WidgetType.GAUGE]: { width: 3, height: 3 },
    [WidgetType.HEATMAP]: { width: 6, height: 5 },
    [WidgetType.SCORE_CARD]: { width: 4, height: 3 },
    [WidgetType.TREND_INDICATOR]: { width: 3, height: 2 },
    [WidgetType.ALERT_LIST]: { width: 4, height: 4 },
  };
  return sizes[type] || { width: 4, height: 3 };
}

export default router;
