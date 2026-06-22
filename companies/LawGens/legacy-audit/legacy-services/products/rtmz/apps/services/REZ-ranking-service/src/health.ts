import mongoose from 'mongoose';
import Redis from 'ioredis';
import axios from 'axios';
import logger from './utils/logger';

const log = logger.child({ service: 'HealthCheck' });

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    mongodb: ServiceStatus;
    redis: ServiceStatus;
    mlService: ServiceStatus;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'unknown';
  latencyMs?: number;
  error?: string;
}

let redisClient: Redis | null = null;
let mlServiceUrl: string;

export function initHealthChecks(redis: Redis | null, mlUrl: string): void {
  redisClient = redis;
  mlServiceUrl = mlUrl;
}

async function checkMongoDB(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      // Perform a simple query to verify connection
      await mongoose.connection.db?.admin().ping();
      return {
        status: 'up',
        latencyMs: Date.now() - start
      };
    } else {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: `Connection state: ${state}`
      };
    }
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    if (!redisClient) {
      return {
        status: 'unknown',
        error: 'Redis client not initialized'
      };
    }
    await redisClient.ping();
    return {
      status: 'up',
      latencyMs: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkMLService(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    if (!mlServiceUrl || process.env.ML_SERVICE_ENABLED === 'false') {
      return {
        status: 'unknown',
        error: 'ML service disabled or not configured'
      };
    }
    const response = await axios.get(`${mlServiceUrl}/health`, { timeout: 1000 });
    if (response.status === 200) {
      return {
        status: 'up',
        latencyMs: Date.now() - start
      };
    } else {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: `Unexpected status: ${response.status}`
      };
    }
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const [mongoStatus, redisStatus, mlStatus] = await Promise.all([
    checkMongoDB(),
    checkRedis(),
    checkMLService()
  ]);

  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (mongoStatus.status === 'down') {
    overallStatus = 'unhealthy';
  } else if (redisStatus.status === 'down' || mlStatus.status === 'down') {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      mongodb: mongoStatus,
      redis: redisStatus,
      mlService: mlStatus
    },
    metrics: {
      memoryUsage,
      cpuUsage
    }
  };
}

export async function getReadinessCheck(): Promise<{ ready: boolean; checks: Record<string, boolean> }> {
  const mongoStatus = await checkMongoDB();

  const checks = {
    mongodb: mongoStatus.status === 'up'
  };

  const ready = checks.mongodb;

  return { ready, checks };
}

export async function getLivenessCheck(): Promise<{ alive: boolean }> {
  return { alive: true };
}
