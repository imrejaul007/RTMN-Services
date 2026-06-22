import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  service: string;
  version: string;
  checks: {
    mongodb: {
      status: 'up' | 'down';
      latencyMs?: number;
      error?: string;
    };
  };
}

let startTime = Date.now();

export function updateStartTime(): void {
  startTime = Date.now();
}

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const checks = {
    mongodb: {
      status: 'down' as const,
      latencyMs: undefined as number | undefined,
      error: undefined as string | undefined
    }
  };

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  try {
    const start = Date.now();
    await mongoose.connection.db?.admin().ping();
    checks.mongodb.latencyMs = Date.now() - start;
    checks.mongodb.status = 'up';
  } catch (error) {
    checks.mongodb.status = 'down';
    checks.mongodb.error = error instanceof Error ? error.message : 'Unknown error';
    overallStatus = 'unhealthy';
  }

  if (checks.mongodb.status === 'down') {
    overallStatus = 'unhealthy';
  } else if (checks.mongodb.latencyMs && checks.mongodb.latencyMs > 1000) {
    overallStatus = 'degraded';
  }

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    service: 'rez-identity-service',
    version: '1.0.0',
    checks
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  logger.debug('Health check', { status: overallStatus });

  res.status(statusCode).json(health);
}

export async function readinessCheck(_req: Request, res: Response): Promise<void> {
  const isReady = mongoose.connection.readyState === 1;

  if (isReady) {
    res.json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: 'MongoDB not connected' });
  }
}

export async function livenessCheck(_req: Request, res: Response): Promise<void> {
  res.json({ alive: true, uptime: Math.floor((Date.now() - startTime) / 1000) });
}
