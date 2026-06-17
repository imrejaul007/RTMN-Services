import { Router, Request, Response, NextFunction } from 'express';
import {
  scenarioBuilder,
} from '../services/scenarioBuilder';
import {
  CreateScenarioRequest,
  CreateScenarioSchema,
  ScenarioCategory,
  ScenarioType,
  ScenarioDefinition,
  ApiResponse,
} from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const router = Router();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const result = CreateScenarioSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: result.error.errors,
      },
    });
  }
  next();
};

// POST /api/scenarios - Create a new scenario
router.post('/', validateRequest, async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateScenarioRequest;

    const scenario = await scenarioBuilder.createScenario(body);

    logger.info(`Created scenario ${scenario.id} for tenant ${body.tenantId}`);

    const response: ApiResponse<ScenarioDefinition> = {
      success: true,
      data: scenario,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating scenario:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create scenario',
      },
    });
  }
});

// GET /api/scenarios - List scenarios
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const category = req.query.category as ScenarioCategory;
    const type = req.query.type as ScenarioType;
    const isActive = req.query.isActive !== 'false';
    const search = req.query.search as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const { scenarios, total } = await scenarioBuilder.listScenarios(tenantId, {
      category,
      type,
      isActive,
      search,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: scenarios,
      meta: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error listing scenarios:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list scenarios',
      },
    });
  }
});

// GET /api/scenarios/:id - Get scenario by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const scenario = await scenarioBuilder.getScenarioByTenant(id, tenantId);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Scenario ${id} not found`,
        },
      });
    }

    const response: ApiResponse<ScenarioDefinition> = {
      success: true,
      data: scenario,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching scenario:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch scenario',
      },
    });
  }
});

// PUT /api/scenarios/:id - Update scenario
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const updates = req.body as Partial<CreateScenarioRequest>;
    const scenario = await scenarioBuilder.updateScenario(id, tenantId, updates);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Scenario ${id} not found`,
        },
      });
    }

    logger.info(`Updated scenario ${id} for tenant ${tenantId}`);

    const response: ApiResponse<ScenarioDefinition> = {
      success: true,
      data: scenario,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error updating scenario:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update scenario',
      },
    });
  }
});

// DELETE /api/scenarios/:id - Delete scenario
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const deleted = await scenarioBuilder.deleteScenario(id, tenantId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Scenario ${id} not found`,
        },
      });
    }

    logger.info(`Deleted scenario ${id} for tenant ${tenantId}`);

    res.json({
      success: true,
      data: { message: 'Scenario deleted successfully' },
    });
  } catch (error) {
    logger.error('Error deleting scenario:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete scenario',
      },
    });
  }
});

// POST /api/scenarios/:id/clone - Clone scenario
router.post('/:id/clone', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.query.tenantId as string;
    const newName = req.body.name as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const scenario = await scenarioBuilder.cloneScenario(id, tenantId, newName);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Scenario ${id} not found`,
        },
      });
    }

    logger.info(`Cloned scenario ${id} to ${scenario.id}`);

    const response: ApiResponse<ScenarioDefinition> = {
      success: true,
      data: scenario,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error cloning scenario:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clone scenario',
      },
    });
  }
});

// POST /api/scenarios/templates/:type - Create pre-defined scenario
router.post('/templates/:type', async (req: Request, res: Response) => {
  try {
    const type = req.params.type as
      | 'refund_increase'
      | 'price_decrease'
      | 'service_improvement'
      | 'marketing_push';
    const tenantId = req.body.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId is required in request body',
        },
      });
    }

    const validTypes = ['refund_increase', 'price_decrease', 'service_improvement', 'marketing_push'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid template type. Valid types: ${validTypes.join(', ')}`,
        },
      });
    }

    const scenario = await scenarioBuilder.buildWhatIfScenario(tenantId, type);

    logger.info(`Created template scenario ${scenario.id} of type ${type}`);

    const response: ApiResponse<ScenarioDefinition> = {
      success: true,
      data: scenario,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating template scenario:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create template scenario',
      },
    });
  }
});

// POST /api/scenarios/validate - Validate scenario
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const scenario = req.body as ScenarioDefinition;
    const validation = scenarioBuilder.validateScenario(scenario);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error('Error validating scenario:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate scenario',
      },
    });
  }
});

export default router;
