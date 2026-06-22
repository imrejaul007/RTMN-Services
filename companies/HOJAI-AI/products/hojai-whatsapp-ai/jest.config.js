// Monitoring middleware for WhatsApp AI
import { Request, Response, NextFunction } from 'express';

// Metrics
const metrics = {
  requests: new Map(),
  errors: new Map(),
  latency: [] as number[]
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.latency.push(duration);
    if (metrics.latency.length > 1000) metrics.latency.shift();

    const key = `${req.method} ${req.path}`;
    metrics.requests.set(key, (metrics.requests.get(key) || 0) + 1);

    if (res.statusCode >= 400) {
      metrics.errors.set(key, (metrics.errors.get(key) || 0) + 1);
    }
  });

  next();
}

export function getMetrics() {
  const avgLatency = metrics.latency.reduce((a, b) => a + b, 0) / Math.max(metrics.latency.length, 1);

  return {
    requests: Object.fromEntries(metrics.requests),
    errors: Object.fromEntries(metrics.errors),
    avgLatencyMs: Math.round(avgLatency),
    p95LatencyMs: metrics.latency.sort((a, b) => a - b)[Math.floor(metrics.latency.length * 0.95)] || 0
  };
}

// Alerting
const alerts: Array<{ level: string; message: string; timestamp: Date }> = [];

export function alert(level: 'info' | 'warn' | 'error', message: string) {
  console.error(`[${level.toUpperCase()}] ${message}`);
  alerts.push({ level, message, timestamp: new Date() });
  if (alerts.length > 100) alerts.shift();
}

export function getAlerts(level?: 'info' | 'warn' | 'error') {
  return level ? alerts.filter(a => a.level === level) : alerts;
}

// Health check aggregator
export async function healthCheck() {
  const checks = await Promise.allSettled([
    // MongoDB
    import('mongoose').then(m => m.default.connection.readyState === 1),
    // Redis
    import('ioredis').then(r => true),
    // WhatsApp API
    process.env.WHATSAPP_ACCESS_TOKEN ? Promise.resolve(true) : Promise.reject('No token'),
    // OpenAI
    process.env.OPENAI_API_KEY ? Promise.resolve(true) : Promise.reject('No key')
  ]);

  const results = checks.map((c, i) => ({
    name: ['mongodb', 'redis', 'whatsapp', 'openai'][i],
    status: c.status === 'fulfilled' ? 'up' : 'down'
  }));

  const allHealthy = results.every(r => r.status === 'up');

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    checks: Object.fromEntries(results.map(r => [r.name, r.status])),
    timestamp: new Date().toISOString()
  };
}
