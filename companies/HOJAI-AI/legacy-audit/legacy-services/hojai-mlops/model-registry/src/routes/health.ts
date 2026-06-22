/**
 * Hojai Model Registry - Health Routes
 */

import { Router, Request, Response } from 'express';
import { modelRegistryService } from '../services/registry';
import config from '../config';
import { HealthResponse } from '../types';

const router = Router();

/**
 * GET /health - Health check endpoint
 */
router.get('/', async (_req: Request, res: Response) => {
  const stats = await modelRegistryService.getStats();

  const health: HealthResponse = {
    status: 'healthy',
    storage: 'in-memory',
    timestamp: new Date().toISOString(),
    version: config.version,
    models_registered: stats.models_registered,
    total_versions: stats.total_versions,
  };

  res.json(health);
});

/**
 * GET /ready - Readiness check
 */
router.get('/ready', async (_req: Request, res: Response) => {
  // Model registry is always ready when the service is running
  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
