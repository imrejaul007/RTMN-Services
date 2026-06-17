import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  SimulationModel,
  SimulationDocument,
} from '../models/Simulation';
import { scenarioBuilder } from '../services/scenarioBuilder';
import { simulator } from '../services/simulator';
import {
  RunSimulationRequest,
  RunSimulationSchema,
  SimulationStatus,
  SimulationPriority,
  SimulationResults,
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
const validateRequest = (schema: typeof RunSimulationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
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
};

// POST /api/simulate/run - Run a simulation
router.post(
  '/run',
  validateRequest(RunSimulationSchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as RunSimulationRequest;

      // Validate scenario exists and belongs to tenant
      const scenario = await scenarioBuilder.getScenarioByTenant(
        body.scenarioId,
        body.tenantId
      );
      if (!scenario) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SCENARIO_NOT_FOUND',
            message: `Scenario ${body.scenarioId} not found for tenant ${body.tenantId}`,
          },
        });
      }

      // Get time horizon or use defaults
      const now = new Date();
      const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const timeHorizon = body.timeHorizon || {
        start: now,
        end: threeMonthsLater,
        granularity: 'day' as const,
      };

      // Create simulation record
      const simulation = new SimulationModel({
        name: body.name || `Simulation: ${scenario.name}`,
        description: body.description || scenario.description,
        scenarioId: scenario.id,
        tenantId: body.tenantId,
        status: SimulationStatus.PENDING,
        priority: body.priority || SimulationPriority.MEDIUM,
        config: {
          scenarioId: scenario.id,
          monteCarlo: {
            iterations: body.monteCarlo?.iterations || 1000,
            confidenceLevel: body.monteCarlo?.confidenceLevel || 0.95,
            distribution: body.monteCarlo?.distribution || 'normal',
            seed: body.monteCarlo?.seed,
          },
          timeHorizon: {
            start: new Date(timeHorizon.start),
            end: new Date(timeHorizon.end),
            granularity: timeHorizon.granularity || 'day',
          },
          sensitivityAnalysis: body.sensitivityAnalysis || false,
          parallelRuns: body.parallelRuns || 1,
        },
        createdBy: body.createdBy,
      });

      await simulation.save();

      logger.info(`Created simulation ${simulation._id} for scenario ${scenario.id}`);

      // Run simulation asynchronously
      runSimulationAsync(simulation._id.toString());

      const response: ApiResponse<SimulationDocument> = {
        success: true,
        data: simulation,
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Error creating simulation:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create simulation',
        },
      });
    }
  }
);

// GET /api/simulate/:id - Get simulation by ID
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

    const simulation = await SimulationModel.findOne({
      _id: id,
      tenantId,
    });

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Simulation ${id} not found`,
        },
      });
    }

    const response: ApiResponse<SimulationDocument> = {
      success: true,
      data: simulation,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching simulation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch simulation',
      },
    });
  }
});

// GET /api/simulate/:id/results - Get simulation results
router.get('/:id/results', async (req: Request, res: Response) => {
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

    const simulation = await SimulationModel.findOne({
      _id: id,
      tenantId,
    });

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Simulation ${id} not found`,
        },
      });
    }

    if (simulation.status !== SimulationStatus.COMPLETED) {
      return res.status(202).json({
        success: true,
        data: {
          status: simulation.status,
          message: simulation.status === SimulationStatus.RUNNING
            ? 'Simulation is still running'
            : 'Simulation has not completed',
        },
      });
    }

    const response: ApiResponse<SimulationResults> = {
      success: true,
      data: simulation.results!,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching simulation results:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch simulation results',
      },
    });
  }
});

// GET /api/simulate - List simulations
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const status = req.query.status as SimulationStatus;
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

    const [simulations, total] = await Promise.all([
      SimulationModel.findByTenant(tenantId, { status, limit, offset }),
      SimulationModel.countByTenant(tenantId, { status }),
    ]);

    res.json({
      success: true,
      data: simulations,
      meta: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error listing simulations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list simulations',
      },
    });
  }
});

// DELETE /api/simulate/:id - Cancel/delete simulation
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

    const simulation = await SimulationModel.findOne({
      _id: id,
      tenantId,
    });

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Simulation ${id} not found`,
        },
      });
    }

    if (simulation.status === SimulationStatus.RUNNING) {
      simulation.status = SimulationStatus.CANCELLED;
      simulation.completedAt = new Date();
      await simulation.save();
    } else {
      await SimulationModel.deleteOne({ _id: id, tenantId });
    }

    res.json({
      success: true,
      data: { message: 'Simulation cancelled/deleted successfully' },
    });
  } catch (error) {
    logger.error('Error deleting simulation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete simulation',
      },
    });
  }
});

// Async simulation runner
async function runSimulationAsync(simulationId: string): Promise<void> {
  try {
    const simulation = await SimulationModel.findById(simulationId);
    if (!simulation) {
      logger.error(`Simulation ${simulationId} not found`);
      return;
    }

    // Update status to running
    simulation.status = SimulationStatus.RUNNING;
    simulation.startedAt = new Date();
    await simulation.save();

    // Create simulator and run
    const simulatorInstance = simulator.create({
      id: simulation._id.toString(),
      name: simulation.name,
      description: simulation.description || '',
      scenarioId: simulation.config.scenarioId,
      tenantId: simulation.tenantId,
      status: SimulationStatus.RUNNING,
      priority: simulation.priority,
      config: {
        scenarioId: simulation.config.scenarioId,
        monteCarlo: simulation.config.monteCarlo,
        timeHorizon: {
          start: simulation.config.timeHorizon.start,
          end: simulation.config.timeHorizon.end,
          granularity: simulation.config.timeHorizon.granularity,
        },
        sensitivityAnalysis: simulation.config.sensitivityAnalysis,
        parallelRuns: simulation.config.parallelRuns,
      },
      createdAt: simulation.createdAt,
      updatedAt: simulation.updatedAt,
      createdBy: simulation.createdBy,
    });

    const results = await simulatorInstance.run();

    // Update simulation with results
    simulation.status = SimulationStatus.COMPLETED;
    simulation.results = results;
    simulation.completedAt = new Date();
    await simulation.save();

    logger.info(`Simulation ${simulationId} completed successfully`);
  } catch (error) {
    logger.error(`Simulation ${simulationId} failed:`, error);

    // Update simulation with error
    const simulation = await SimulationModel.findById(simulationId);
    if (simulation) {
      simulation.status = SimulationStatus.FAILED;
      simulation.error = error instanceof Error ? error.message : 'Unknown error';
      simulation.completedAt = new Date();
      await simulation.save();
    }
  }
}

export default router;
