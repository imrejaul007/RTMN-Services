import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail';
  error?: string;
  latencyMs?: number;
}

export function createHealthChecker(serviceName: string, version: string = '1.0.0') {
  const checks: Map<string, () => Promise<void>> = new Map();

  return {
    addCheck(name: string, fn: () => Promise<void>) {
      checks.set(name, fn);
    },
    async getHealth(): Promise<HealthCheckResult[]> {
      const results: HealthCheckResult[] = [];
      for (const [name, fn] of checks) {
        const start = Date.now();
        try {
          await fn();
          results.push({ name, status: 'pass', latencyMs: Date.now() - start });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[HealthCheck] ${name} check failed: ${errorMessage}`);
          results.push({ name, status: 'fail', error: errorMessage, latencyMs: Date.now() - start });
        }
      }
      return results;
    },
    getVersion(): string {
      return version;
    },
    getServiceName(): string {
      return serviceName;
    }
  };
}

export function healthRouter(health: ReturnType<typeof createHealthChecker>) {
  const router = Router();

  router.get('/live', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: health.getServiceName(),
      timestamp: new Date().toISOString()
    });
  });

  router.get('/ready', async (_req: Request, res: Response) => {
    const checks = await health.getHealth();
    const unhealthy = checks.some(c => c.status === 'fail');

    res.status(unhealthy ? 503 : 200).json({
      status: unhealthy ? 'not_ready' : 'ready',
      service: health.getServiceName(),
      version: health.getVersion(),
      checks,
      timestamp: new Date().toISOString()
    });
  });

  router.get('/health', async (_req: Request, res: Response) => {
    const checks = await health.getHealth();
    res.json({
      status: 'healthy',
      service: health.getServiceName(),
      version: health.getVersion(),
      checks,
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

// MongoDB health check
export function addMongoHealthCheck(
  health: ReturnType<typeof createHealthChecker>,
  mongoUri: string
) {
  health.addCheck('mongodb', async () => {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB not connected');
    }
    await mongoose.connection.db?.admin().ping();
  });
}

// REST service health check
export function addRestServiceHealthCheck(
  health: ReturnType<typeof createHealthChecker>,
  serviceName: string,
  serviceUrl: string,
  timeoutMs: number = 5000
) {
  health.addCheck(serviceName, async () => {
    try {
      const response = await axios.get(`${serviceUrl}/health/live`, {
        timeout: timeoutMs,
        validateStatus: (status) => status < 500
      });
      if (response.status !== 200) {
        throw new Error(`Service returned status ${response.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to connect to ${serviceName}: ${error.message}`);
      }
      throw error;
    }
  });
}
