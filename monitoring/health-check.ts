// Health check endpoint for RTMN services
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      latency?: number;
      message?: string;
    };
  };
}

export async function performHealthCheck(): Promise<HealthStatus> {
  const startTime = Date.now();
  const dependencies: HealthStatus['dependencies'] = {};

  // Check MongoDB
  try {
    const mongoStart = Date.now();
    const mongo = new MongoClient(process.env.MONGODB_URI || '');
    await mongo.connect();
    await mongo.db('admin').command({ ping: 1 });
    await mongo.close();
    dependencies.mongodb = { status: 'up', latency: Date.now() - mongoStart };
  } catch (error: any) {
    dependencies.mongodb = { status: 'down', message: error.message };
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    dependencies.redis = { status: 'up', latency: Date.now() - redisStart };
  } catch (error: any) {
    dependencies.redis = { status: 'down', message: error.message };
  }

  // Check external APIs
  try {
    const rtmnStart = Date.now();
    const response = await fetch(`${process.env.RTNM_SDK_URL || 'https://api.rtmn.io'}/health`, {
      timeout: 3000,
    });
    dependencies.rtmnApi = {
      status: response.ok ? 'up' : 'degraded',
      latency: Date.now() - rtmnStart,
    };
  } catch (error: any) {
    dependencies.rtmnApi = { status: 'down', message: error.message };
  }

  // Determine overall status
  const allUp = Object.values(dependencies).every(d => d.status === 'up');
  const anyDown = Object.values(dependencies).some(d => d.status === 'down');

  return {
    status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    dependencies,
  };
}
