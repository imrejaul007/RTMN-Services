import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { syncService } from './services/syncService.js';
import { logger } from './utils/logger.js';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  service: string;
  version: string;
  checks: {
    mongodb: ComponentHealth;
    redis: ComponentHealth;
    websocket: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
}

// Get Redis client if available
function getRedisClient(): Redis | null {
  try {
    const redisClient = (global as unknown as { redisClient?: Redis }).redisClient;
    return redisClient || null;
  } catch {
    return null;
  }
}

/**
 * GET /health - Basic health check
 */
router.get('/', async (_req: Request, res: Response) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'rez-cosmic-twin',
    version: '1.0.0',
    checks: {
      mongodb: { status: 'down' },
      redis: { status: 'down' },
      websocket: { status: 'up' },
    },
  };

  // Check MongoDB
  try {
    const mongoStart = Date.now();
    const mongoState = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoState === 1) {
      await mongoose.connection.db?.admin().ping();
      health.checks.mongodb = {
        status: 'up',
        latency: Date.now() - mongoStart,
      };
    } else {
      health.checks.mongodb = {
        status: 'down',
        message: `MongoDB state: ${mongoState}`,
      };
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.mongodb = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    health.status = 'unhealthy';
  }

  // Check Redis
  try {
    const redis = getRedisClient();
    if (redis) {
      const redisStart = Date.now();
      await redis.ping();
      health.checks.redis = {
        status: 'up',
        latency: Date.now() - redisStart,
      };
    } else {
      health.checks.redis = {
        status: 'down',
        message: 'Redis client not initialized',
      };
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.redis = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    health.status = 'degraded';
  }

  // Check WebSocket
  try {
    const io = syncService.getIO();
    const connectedClients = io ? io.sockets.sockets.size : 0;
    health.checks.websocket = {
      status: connectedClients > 0 ? 'up' : 'degraded',
      message: `${connectedClients} clients connected`,
    };
  } catch (error) {
    health.checks.websocket = {
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  health.timestamp = new Date().toISOString();

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);

  logger.debug('Health check completed', { status: health.status });
});

/**
 * GET /health/live - Kubernetes liveness probe
 * Returns 200 if the service is running
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

/**
 * GET /health/ready - Kubernetes readiness probe
 * Returns 200 if the service is ready to accept traffic
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const mongoReady = mongoose.connection.readyState === 1;

  if (mongoReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: { mongodb: 'connected' },
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks: { mongodb: 'disconnected' },
    });
  }
});

/**
 * GET /health/stats - Get service statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const { Twin } = await import('./models/Twin.js');
    const { TwinEvent } = await import('./models/Event.js');
    const { Relationship } = await import('./models/Relationship.js');

    const [twinCount, eventCount, relationshipCount] = await Promise.all([
      Twin.countDocuments(),
      TwinEvent.countDocuments(),
      Relationship.countDocuments(),
    ]);

    const wsStats = syncService.getStats();

    res.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      counts: {
        twins: twinCount,
        events: eventCount,
        relationships: relationshipCount,
      },
      websocket: wsStats,
    });
  } catch (error) {
    logger.error('Error getting stats:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
