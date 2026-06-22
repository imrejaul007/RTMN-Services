import { Request, Response, NextFunction } from 'express';

// Metrics store
const metrics = {
  requests: new Map<string, number>(),
  errors: new Map<string, number>(),
  latency: [] as number[]
};

const MAX_LATENCY_SAMPLES = 10000;

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const key = `${req.method} ${req.path}`;

  res.on('finish', () => {
    const latency = Date.now() - start;
    metrics.requests.set(key, (metrics.requests.get(key) || 0) + 1);
    metrics.latency.push(latency);
    if (metrics.latency.length > MAX_LATENCY_SAMPLES) metrics.latency.shift();

    if (res.statusCode >= 400) {
      metrics.errors.set(key, (metrics.errors.get(key) || 0) + 1);
    }
  });

  next();
}

export function getMetrics() {
  const latencies = [...metrics.latency].sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  return {
    requests: Object.fromEntries(metrics.requests),
    errors: Object.fromEntries(metrics.errors),
    latency: {
      avg: Math.round(metrics.latency.reduce((a, b) => a + b, 0) / Math.max(metrics.latency.length, 1)),
      p50,
      p95,
      p99
    },
    uptime: process.uptime()
  };
}
