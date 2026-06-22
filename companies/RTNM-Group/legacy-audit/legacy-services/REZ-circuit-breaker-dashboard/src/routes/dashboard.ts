import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CircuitBreakerMonitor } from '../services/circuitBreakerMonitor';
import { AlertManager } from '../services/alertManager';
import { HealthAggregator } from '../services/healthAggregator';
import {
  ApiResponse,
  CircuitState,
  ServiceCategory,
  DashboardStats,
  AlertConfig
} from '../types';

/**
 * Request validation schemas
 */
const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

const circuitActionSchema = z.object({
  state: z.enum(['CLOSED', 'OPEN', 'HALF_OPEN']),
  reason: z.string().optional()
});

const alertConfigSchema = z.object({
  id: z.string().optional(),
  enabled: z.boolean().optional(),
  channels: z.object({
    email: z.boolean().optional(),
    slack: z.boolean().optional(),
    webhook: z.boolean().optional()
  }).optional(),
  thresholds: z.object({
    failureRatePercent: z.number().min(0).max(100).optional(),
    responseTimeMs: z.number().min(0).optional(),
    consecutiveFailures: z.number().min(1).optional()
  }).optional(),
  services: z.array(z.string()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

const acknowledgeSchema = z.object({
  acknowledgedBy: z.string().min(1)
});

/**
 * Create dashboard routes
 */
export function createDashboardRoutes(
  circuitMonitor: CircuitBreakerMonitor,
  alertManager: AlertManager,
  healthAggregator: HealthAggregator
): Router {
  const router = Router();

  // ==================== Circuit Breaker Routes ====================

  /**
   * GET /api/v1/circuits
   * Get all circuit breaker states
   */
  router.get('/circuits', (req: Request, res: Response) => {
    try {
      const { state, category } = req.query;

      let circuits = circuitMonitor.getAllCircuits();

      if (state) {
        circuits = circuits.filter(c => c.state === state);
      }

      if (category) {
        circuits = circuits.filter(c => c.category === category);
      }

      const response: ApiResponse<typeof circuits> = {
        success: true,
        data: circuits,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/v1/circuits/stats
   * Get circuit breaker statistics
   */
  router.get('/circuits/stats', (_req: Request, res: Response) => {
    try {
      const stats = circuitMonitor.getStats();
      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/v1/circuits/:name
   * Get specific circuit breaker state
   */
  router.get('/circuits/:name', (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const circuit = circuitMonitor.getCircuit(name);

      if (!circuit) {
        res.status(404).json({
          success: false,
          error: `Circuit not found: ${name}`,
          timestamp: new Date()
        });
        return;
      }

      // Get failure and recovery records
      const failures = circuitMonitor.getFailureRecords(name, 50);
      const recoveries = circuitMonitor.getRecoveryRecords(name, 20);

      const response: ApiResponse<{
        circuit: typeof circuit;
        recentFailures: typeof failures;
        recentRecoveries: typeof recoveries;
      }> = {
        success: true,
        data: { circuit, recentFailures: failures, recentRecoveries: recoveries },
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * POST /api/v1/circuits/:name/action
   * Perform action on circuit (force state, reset counters)
   */
  router.post('/circuits/:name/action', async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const action = req.body.action as string;

      let result: boolean;

      switch (action) {
        case 'force_state':
          const parsed = circuitActionSchema.safeParse(req.body);
          if (!parsed.success) {
            res.status(400).json({
              success: false,
              error: `Invalid action parameters: ${parsed.error.message}`,
              timestamp: new Date()
            });
            return;
          }
          result = await circuitMonitor.forceState(name, parsed.data.state as CircuitState);
          break;
        case 'reset_counters':
          result = await circuitMonitor.resetCounters(name);
          break;
        default:
          res.status(400).json({
            success: false,
            error: `Unknown action: ${action}. Valid actions: force_state, reset_counters`,
            timestamp: new Date()
          });
          return;
      }

      if (!result) {
        res.status(404).json({
          success: false,
          error: `Circuit not found: ${name}`,
          timestamp: new Date()
        });
        return;
      }

      const circuit = circuitMonitor.getCircuit(name);
      const response: ApiResponse<typeof circuit> = {
        success: true,
        data: circuit,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  // ==================== Services Routes ====================

  /**
   * GET /api/v1/services
   * Get all services health status
   */
  router.get('/services', (req: Request, res: Response) => {
    try {
      const { status, category } = req.query;

      let services = healthAggregator.getAllServices();

      if (status) {
        services = services.filter(s => s.status === status);
      }

      if (category) {
        services = services.filter(s => s.category === category);
      }

      const response: ApiResponse<typeof services> = {
        success: true,
        data: services,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/v1/services/stats
   * Get services summary by category
   */
  router.get('/services/summary', (_req: Request, res: Response) => {
    try {
      const summary = healthAggregator.getCategorySummary();
      const response: ApiResponse<typeof summary> = {
        success: true,
        data: summary,
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/v1/services/:name
   * Get specific service health status
   */
  router.get('/services/:name', async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const service = healthAggregator.getService(name);

      if (!service) {
        res.status(404).json({
          success: false,
          error: `Service not found: ${name}`,
          timestamp: new Date()
        });
        return;
      }

      // Get related circuit info
      const circuit = circuitMonitor.getCircuit(name);

      const response: ApiResponse<typeof service & { circuit?: typeof circuit }> = {
        success: true,
        data: { ...service, circuit },
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * POST /api/v1/services/:name/check
   * Force health check on specific service
   */
  router.post('/services/:name/check', async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const result = await healthAggregator.forceCheck(name);

      if (!result) {
        res.status(404).json({
          success: false,
          error: `Service not found: ${name}`,
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  // ==================== Health Routes ====================

  /**
   * GET /api/v1/health
   * Get aggregate health statistics
   */
  router.get('/health', (_req: Request, res: Response) => {
    try {
      const stats = healthAggregator.getHealthStats();
      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/v1/dashboard
   * Get complete dashboard data
   */
  router.get('/dashboard', (_req: Request, res: Response) => {
    try {
      const dashboardData: DashboardStats = {
        circuits: circuitMonitor.getAllCircuits(),
        services: healthAggregator.getAllServices(),
        alerts: alertManager.getUnacknowledgedAlerts(20),
        healthStats: healthAggregator.getHealthStats(),
        recentFailures: circuitMonitor.getAllRecentFailures(20),
        recentRecoveries: circuitMonitor.getAllRecentRecoveries(10),
        timestamp: new Date()
      };

      const response: ApiResponse<typeof dashboardData> = {
        success: true,
        data: dashboardData,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  // ==================== Alerts Routes ====================

  /**
   * GET /api/v1/alerts
   * Get all alerts
   */
  router.get('/alerts', (req: Request, res: Response) => {
    try {
      const { service, unacknowledged } = req.query;
      let alerts;

      if (unacknowledged === 'true') {
        alerts = alertManager.getUnacknowledgedAlerts(100);
      } else {
        alerts = alertManager.getAlerts(service as string | undefined, 100);
      }

      const response: ApiResponse<typeof alerts> = {
        success: true,
        data: alerts,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/v1/alerts/stats
   * Get alert statistics
   */
  router.get('/alerts/stats', (_req: Request, res: Response) => {
    try {
      const stats = alertManager.getStats();
      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/v1/alerts/config
   * Get alert configurations
   */
  router.get('/alerts/config', (_req: Request, res: Response) => {
    try {
      const configs = alertManager.getAllConfigs();
      const response: ApiResponse<typeof configs> = {
        success: true,
        data: configs,
        timestamp: new Date()
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * POST /api/v1/alerts/config
   * Create or update alert configuration
   */
  router.post('/alerts/config', (req: Request, res: Response) => {
    try {
      const parsed = alertConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: `Invalid alert config: ${parsed.error.message}`,
          timestamp: new Date()
        });
        return;
      }

      const configId = parsed.data.id || 'custom';
      const result = alertManager.configureAlert(configId, parsed.data);

      if (!result) {
        res.status(400).json({
          success: false,
          error: 'Failed to configure alert',
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        timestamp: new Date()
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * POST /api/v1/alerts/:id/acknowledge
   * Acknowledge an alert
   */
  router.post('/alerts/:id/acknowledge', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = acknowledgeSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: `Invalid request: ${parsed.error.message}`,
          timestamp: new Date()
        });
        return;
      }

      const result = alertManager.acknowledgeAlert(id, parsed.data.acknowledgedBy);

      if (!result) {
        res.status(404).json({
          success: false,
          error: `Alert not found: ${id}`,
          timestamp: new Date()
        });
        return;
      }

      const response: ApiResponse<{ acknowledged: boolean }> = {
        success: true,
        data: { acknowledged: true },
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  // ==================== Failures & Recoveries Routes ====================

  /**
   * GET /api/v1/failures
   * Get failure records
   */
  router.get('/failures', (req: Request, res: Response) => {
    try {
      const { circuit, limit } = req.query;
      const limitNum = parseInt(limit as string, 10) || 100;

      let failures;
      if (circuit) {
        failures = circuitMonitor.getFailureRecords(circuit as string, limitNum);
      } else {
        failures = circuitMonitor.getAllRecentFailures(limitNum);
      }

      const response: ApiResponse<typeof failures> = {
        success: true,
        data: failures,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  /**
   * GET /api/v1/recoveries
   * Get recovery records
   */
  router.get('/recoveries', (req: Request, res: Response) => {
    try {
      const { circuit, limit } = req.query;
      const limitNum = parseInt(limit as string, 10) || 50;

      let recoveries;
      if (circuit) {
        recoveries = circuitMonitor.getRecoveryRecords(circuit as string, limitNum);
      } else {
        recoveries = circuitMonitor.getAllRecentRecoveries(limitNum);
      }

      const response: ApiResponse<typeof recoveries> = {
        success: true,
        data: recoveries,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  });

  return router;
}
