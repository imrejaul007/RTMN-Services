/**
 * Health Check Routes
 */

import { Router, Request, Response } from 'express';
import { redisService } from '../services/redis';
import type { HealthResponse } from '../types';

const router = Router();
const VERSION = '1.0.0';

/**
 * GET /health
 * Basic health check
 */
router.get('/health', async (_req: Request, res: Response) => {
  const redisConnected = redisService.getConnectionStatus();
  const redisPing = await redisService.ping();

  const response: HealthResponse = {
    status: redisConnected && redisPing ? 'healthy' : 'unhealthy',
    redis: redisConnected && redisPing ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    version: VERSION,
  };

  const statusCode = response.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(response);
});

/**
 * GET /health/live
 * Liveness probe - is the server running?
 */
router.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness probe - is the server ready to accept traffic?
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  const redisConnected = redisService.getConnectionStatus();
  const redisPing = await redisService.ping();

  const isReady = redisConnected && redisPing;

  res.json({
    status: isReady ? 'ready' : 'not_ready',
    redis: redisConnected && redisPing ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

export default router;
