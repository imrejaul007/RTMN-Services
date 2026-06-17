/**
 * Metrics Middleware
 *
 * Prometheus metrics collection and exposure.
 */

import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// ============================================================================
// INITIALIZE REGISTRY
// ============================================================================

const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'hojai_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'hojai_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const aiPredictionsTotal = new client.Counter({
  name: 'hojai_ai_predictions_total',
  help: 'Total AI predictions by type',
  labelNames: ['type', 'status'],
  registers: [register],
});

const cacheHitsTotal = new client.Counter({
  name: 'hojai_cache_hits_total',
  help: 'Total cache hits',
  registers: [register],
});

const cacheMissesTotal = new client.Counter({
  name: 'hojai_cache_misses_total',
  help: 'Total cache misses',
  registers: [register],
});

const circuitBreakerState = new client.Gauge({
  name: 'hojai_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open)',
  labelNames: ['service'],
  registers: [register],
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const path = req.route?.path || req.path;
    const labels = {
      method: req.method,
      path,
      status: res.statusCode.toString(),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
}

export async function metricsEndpoint(_req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function recordPrediction(type: string, success: boolean): void {
  aiPredictionsTotal.inc({
    type,
    status: success ? 'success' : 'error',
  });
}

export function recordCacheHit(): void {
  cacheHitsTotal.inc();
}

export function recordCacheMiss(): void {
  cacheMissesTotal.inc();
}

export function setCircuitBreakerState(service: string, isOpen: boolean): void {
  circuitBreakerState.set({ service }, isOpen ? 1 : 0);
}

export { register };
