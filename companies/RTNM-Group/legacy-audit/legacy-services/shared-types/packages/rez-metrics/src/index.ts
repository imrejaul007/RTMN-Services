/**
 * REZ Metrics Package
 * Prometheus metrics middleware for all REZ services
 *
 * Usage:
 *   import { metricsMiddleware, metricsRouter, recordRequest } from '@rez/metrics';
 *
 *   // In your Express app:
 *   app.use(metricsMiddleware);
 *   app.use('/metrics', metricsRouter);
 */

import { Router, Request, Response, NextFunction } from 'express';

// ── Metric Storage ──────────────────────────────────────────────────────────────

interface MetricPoint {
  value: number;
  timestamp: number;
}

interface HttpMetric {
  count: number;
  durations: number[];
}

const httpMetrics = new Map<string, HttpMetric>();
const gaugeMetrics = new Map<string, number>();

// ── Path Normalization ─────────────────────────────────────────────────────────

/**
 * Normalize paths to prevent high cardinality
 */
export function normalizePath(path: string): string {
  return path
    .replace(/\/[a-f0-9]{24}/gi, '/:id')
    .replace(/\/[a-f0-9]{32}/gi, '/:hash')
    .replace(/\/\d+/g, '/:num')
    .replace(/\/[a-zA-Z0-9_-]{36}/g, '/:uuid');
}

// ── Recording Functions ────────────────────────────────────────────────────────

/**
 * Record an HTTP request
 */
export function recordRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
): void {
  const key = `${method}:${normalizePath(path)}:${Math.floor(status / 100) * 100}`;

  if (!httpMetrics.has(key)) {
    httpMetrics.set(key, { count: 0, durations: [] });
  }

  const metric = httpMetrics.get(key)!;
  metric.count++;
  metric.durations.push(durationMs);

  // Keep only last 1000 durations to prevent memory issues
  if (metric.durations.length > 1000) {
    metric.durations.shift();
  }
}

/**
 * Set a gauge metric (e.g., active connections)
 */
export function setGauge(name: string, value: number): void {
  gaugeMetrics.set(name, value);
}

/**
 * Increment a counter metric
 */
export function incrementCounter(name: string, value = 1): void {
  const key = `counter:${name}`;
  const current = httpMetrics.get(key) || { count: 0, durations: [] };
  current.count += value;
  httpMetrics.set(key, current);
}

// ── Calculations ──────────────────────────────────────────────────────────────

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// ── Formatters ────────────────────────────────────────────────────────────────

/**
 * Format metrics in Prometheus exposition format
 */
export function formatPrometheusMetrics(): string {
  const lines: string[] = [];
  const now = Math.floor(Date.now() / 1000);

  // HTTP Request metrics
  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');

  for (const [key, metric] of httpMetrics) {
    if (key.startsWith('counter:')) {
      const name = key.replace('counter:', '');
      lines.push(`http_requests_total{name="${name}"} ${metric.count}`);
    }
  }

  lines.push('');
  lines.push('# HELP http_request_duration_seconds HTTP request duration');
  lines.push('# TYPE http_request_duration_seconds histogram');

  for (const [key, metric] of httpMetrics) {
    if (!key.startsWith('counter:') && metric.durations.length > 0) {
      const [method, path, status] = key.split(':');

      for (const p of [50, 90, 95, 99]) {
        const value = percentile(metric.durations, p) / 1000;
        lines.push(
          `http_request_duration_seconds{quantile="${p / 100}",method="${method}",path="${path}",status="${status}"} ${value}`
        );
      }

      const sum = metric.durations.reduce((a, b) => a + b, 0) / 1000;
      lines.push(
        `http_request_duration_seconds_sum{method="${method}",path="${path}",status="${status}"} ${sum}`
      );
      lines.push(
        `http_request_duration_seconds_count{method="${method}",path="${path}",status="${status}"} ${metric.count}`
      );
    }
  }

  // Gauge metrics
  lines.push('');
  lines.push('# HELP nodejs_info Node.js version info');
  lines.push('# TYPE nodejs_info gauge');
  lines.push(`nodejs_info{version="${process.version}"} 1`);

  lines.push('');
  lines.push('# HELP process_up Service availability');
  lines.push('# TYPE process_up gauge');
  lines.push('process_up 1');

  lines.push('');
  lines.push(`# HELP process_start_time_seconds Process start time`);
  lines.push(`# TYPE process_start_time_seconds gauge`);
  lines.push(`process_start_time_seconds ${now}`);

  // Custom gauges
  for (const [name, value] of gaugeMetrics) {
    lines.push('');
    lines.push(`# HELP ${name}`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
  }

  return lines.join('\n') + '\n';
}

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Express middleware to track HTTP request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    recordRequest(req.method, req.path, res.statusCode, duration);
  });

  next();
}

// ── Router ────────────────────────────────────────────────────────────────────

/**
 * Create metrics router for /metrics endpoint
 */
export function createMetricsRouter(): Router {
  const router = Router();

  router.get('/metrics', (_req: Request, res: Response) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(formatPrometheusMetrics());
  });

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}

// ── Health Check ────────────────────────────────────────────────────────────────

/**
 * Health check function for use in custom health endpoints
 */
export function getHealthStatus(): {
  status: 'ok' | 'degraded';
  metrics: {
    httpRequestsTotal: number;
    activePaths: number;
    uptime: number;
  };
} {
  let totalRequests = 0;
  for (const [key, metric] of httpMetrics) {
    if (!key.startsWith('counter:')) {
      totalRequests += metric.count;
    }
  }

  return {
    status: 'ok',
    metrics: {
      httpRequestsTotal: totalRequests,
      activePaths: httpMetrics.size,
      uptime: process.uptime(),
    },
  };
}

// ── Export default router ──────────────────────────────────────────────────────

export const metricsRouter = createMetricsRouter();

export default {
  metricsMiddleware,
  metricsRouter,
  recordRequest,
  setGauge,
  incrementCounter,
  normalizePath,
  formatPrometheusMetrics,
  getHealthStatus,
};
