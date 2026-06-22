/**
 * Health Check Middleware
 * Provides service health status for monitoring
 */

import { Request, Response, Router } from 'express';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: 'connected' | 'disconnected' | 'slow';
    cache: 'connected' | 'disconnected' | 'slow';
  };
  metrics?: {
    memory: NodeJS.MemoryUsage;
    cpu: number;
  };
}

const router = Router();
const startTime = Date.now();

// Lazy imports to avoid circular dependencies
let db: any = null;
let redis: any = null;

async function getDbStatus(): Promise<'connected' | 'disconnected' | 'slow'> {
  if (!db) {
    try {
      const mongoose = await import('mongoose');
      db = mongoose.connection;
    } catch (e) {
      return 'disconnected';
    }
  }

  try {
    const start = Date.now();
    await db.db?.admin().ping();
    const latency = Date.now() - start;
    return latency > 1000 ? 'slow' : 'connected';
  } catch (e) {
    return 'disconnected';
  }
}

async function getRedisStatus(): Promise<'connected' | 'disconnected' | 'slow'> {
  if (!redis) {
    try {
      const redisClient = await import('../config/redis');
      redis = redisClient.redis || redisClient.default?.redis || null;
    } catch (e) {
      return 'disconnected';
    }
  }

  try {
    const start = Date.now();
    if (redis?.ping) {
      await redis.ping();
    }
    const latency = Date.now() - start;
    return latency > 500 ? 'slow' : 'connected';
  } catch (e) {
    return 'disconnected';
  }
}

router.get('/health', async (req: Request, res: Response) => {
  const dbStatus = await getDbStatus();
  const cacheStatus = await getRedisStatus();

  const isHealthy = dbStatus !== 'disconnected';
  const isDegraded = dbStatus === 'slow' || cacheStatus === 'slow';

  const health: HealthCheck = {
    status: isHealthy ? (isDegraded ? 'degraded' : 'healthy') : 'unhealthy',
    service: process.env.SERVICE_NAME || 'unknown-service',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: dbStatus,
      cache: cacheStatus,
    },
  };

  if (process.env.NODE_ENV !== 'production') {
    health.metrics = {
      memory: process.memoryUsage(),
      cpu: 0, // CPU requires native module
    };
  }

  const statusCode = health.status === 'healthy' ? 200 :
                    health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(health);
});

router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

router.get('/health/ready', async (req: Request, res: Response) => {
  const dbStatus = await getDbStatus();
  const isReady = dbStatus !== 'disconnected';

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks: {
      database: dbStatus,
    },
  });
});

export default router;
