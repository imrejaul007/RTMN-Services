import { Request, Response, NextFunction } from 'express';
import client, { Counter, Histogram, Gauge } from 'prom-client';

// Initialize Prometheus metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// HTTP request counter
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// HTTP request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Active requests gauge
export const activeRequests = new Gauge({
  name: 'active_requests',
  help: 'Number of active requests',
  registers: [register],
});

// Cache hit/miss counter
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  registers: [register],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  registers: [register],
});

// Data sync metrics
export const syncOperations = new Counter({
  name: 'sync_operations_total',
  help: 'Total number of sync operations',
  labelNames: ['source', 'status'],
  registers: [register],
});

export const syncDuration = new Histogram({
  name: 'sync_duration_seconds',
  help: 'Duration of sync operations in seconds',
  labelNames: ['source'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// Customer records metrics
export const customerRecordsTotal = new Gauge({
  name: 'customer_records_total',
  help: 'Total number of customer records',
  registers: [register],
});

export const customerSegmentsTotal = new Gauge({
  name: 'customer_segments_total',
  help: 'Total number of segment memberships',
  labelNames: ['segment'],
  registers: [register],
});

/**
 * Metrics middleware
 * Tracks request metrics for Prometheus
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Track active requests
  activeRequests.inc();

  const startTime = Date.now();

  // Capture response on finish
  res.on('finish', () => {
    activeRequests.dec();

    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    const labels = {
      method: req.method,
      route: route,
      status: res.statusCode.toString(),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
}

/**
 * Metrics endpoint handler
 */
export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
}

/**
 * Health check handler
 */
export function healthHandler(_req: Request, res: Response): void {
  res.json({
    status: 'healthy',
    service: 'customer-graph-360',
    timestamp: new Date().toISOString(),
  });
}

export { register };
export default metricsMiddleware;