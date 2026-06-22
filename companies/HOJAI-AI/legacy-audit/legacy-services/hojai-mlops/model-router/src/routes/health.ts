/**
 * Hojai Model Router - Health Routes
 */

import { Router, Request, Response } from 'express';
import config from '../config';
import { modelRouterService } from '../services/router';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /health - Health check (no auth required)
 */
router.get('/', (_req: Request, res: Response): void => {
  const providers = modelRouterService.getProviders();
  const stats = modelRouterService.getStats();

  const providerStatus = providers.reduce(
    (acc, p) => {
      acc[p.name] = p.enabled;
      return acc;
    },
    {} as Record<string, boolean>
  );

  res.status(200).json({
    status: 'healthy',
    providers: providerStatus,
    timestamp: new Date().toISOString(),
    version: config.version,
    totalRequests: stats.totalRequests,
    averageLatencyMs: Object.values(stats.averageLatencyMs).reduce((a, b) => a + b, 0) / 4,
  });
});

/**
 * GET /health/ready - Readiness probe
 */
router.get('/ready', (_req: Request, res: Response): void => {
  res.status(200).json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/live - Liveness probe
 */
router.get('/live', (_req: Request, res: Response): void => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
