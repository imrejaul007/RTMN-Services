import mongoose from 'mongoose';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface HealthCheck {
  name: string;
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: string;
}> {
  const checks: HealthCheck[] = [];

  // MongoDB
  try {
    const start = Date.now();
    await mongoose.connect(mongoose.connection.host);
    checks.push({ name: 'mongodb', status: 'up', latencyMs: Date.now() - start });
  } catch (e: any) {
    checks.push({ name: 'mongodb', status: 'down', error: e.message });
  }

  // Redis
  try {
    const start = Date.now();
    await redis.ping();
    checks.push({ name: 'redis', status: 'up', latencyMs: Date.now() - start });
  } catch (e: any) {
    checks.push({ name: 'redis', status: 'down', error: e.message });
  }

  // WhatsApp API
  if (process.env.WHATSAPP_ACCESS_TOKEN) {
    checks.push({ name: 'whatsapp_api', status: 'up' });
  } else {
    checks.push({ name: 'whatsapp_api', status: 'down', error: 'No token' });
  }

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    checks.push({ name: 'openai', status: 'up' });
  } else {
    checks.push({ name: 'openai', status: 'down', error: 'No key' });
  }

  const allUp = checks.every(c => c.status === 'up');
  const anyDown = checks.some(c => c.status === 'down');

  return {
    status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  };
}
