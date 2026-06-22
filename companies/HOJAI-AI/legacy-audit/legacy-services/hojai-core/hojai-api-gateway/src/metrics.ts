/**
 * Prometheus Metrics
 * HOJAI SkillNet observability metrics
 */

import { Request, Response } from 'express';
import client, { Counter, Histogram, Gauge, Registry } from 'prom-client';

// Create a custom registry
const register = new Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// ============================================
// CUSTOM METRICS
// ============================================

// Request metrics
const httpRequestsTotal = new Counter({
  name: 'hojai_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
});

const httpRequestDuration = new Histogram({
  name: 'hojai_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const httpRequestSize = new Histogram({
  name: 'hojai_http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'path'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

const httpResponseSize = new Histogram({
  name: 'hojai_http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'path'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

// Business metrics
const predictionsTotal = new Counter({
  name: 'hojai_predictions_total',
  help: 'Total number of predictions created',
  labelNames: ['type', 'tenant_id'],
  registers: [register]
});

const recommendationsTotal = new Counter({
  name: 'hojai_recommendations_total',
  help: 'Total number of recommendations created',
  labelNames: ['type', 'tenant_id'],
  registers: [register]
});

const insightsTotal = new Counter({
  name: 'hojai_insights_total',
  help: 'Total number of insights created',
  labelNames: ['type', 'severity', 'tenant_id'],
  registers: [register]
});

const eventsTotal = new Counter({
  name: 'hojai_events_total',
  help: 'Total number of events published',
  labelNames: ['type', 'tenant_id'],
  registers: [register]
});

// Prediction score metrics
const predictionScore = new Histogram({
  name: 'hojai_prediction_score',
  help: 'Distribution of prediction scores',
  labelNames: ['type'],
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  registers: [register]
});

const predictionConfidence = new Histogram({
  name: 'hojai_prediction_confidence',
  help: 'Distribution of prediction confidence scores',
  labelNames: ['type'],
  buckets: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  registers: [register]
});

// WebSocket metrics
const wsConnectionsTotal = new Counter({
  name: 'hojai_ws_connections_total',
  help: 'Total number of WebSocket connections',
  labelNames: ['tenant_id'],
  registers: [register]
});

const wsConnectionsActive = new Gauge({
  name: 'hojai_ws_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

const wsMessagesTotal = new Counter({
  name: 'hojai_ws_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['type', 'direction'],
  registers: [register]
});

// Database metrics
const mongodbOperationDuration = new Histogram({
  name: 'hojai_mongodb_operation_duration_seconds',
  help: 'MongoDB operation duration in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

const mongodbConnectionPool = new Gauge({
  name: 'hojai_mongodb_connection_pool_size',
  help: 'MongoDB connection pool size',
  registers: [register]
});

// Error metrics
const errorsTotal = new Counter({
  name: 'hojai_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'],
  registers: [register]
});

// Tenant metrics
const activeTenants = new Gauge({
  name: 'hojai_active_tenants',
  help: 'Number of active tenants',
  registers: [register]
});

const tenantApiCalls = new Counter({
  name: 'hojai_tenant_api_calls_total',
  help: 'Total API calls per tenant',
  labelNames: ['tenant_id'],
  registers: [register]
});

// ============================================
// MIDDLEWARE
// ============================================

export function metricsMiddleware(req: Request, res: Response, next: () => void): void {
  const start = Date.now();
  const path = req.route?.path || req.path;

  // Skip metrics endpoint itself
  if (path === '/metrics') {
    return next();
  }

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      path: normalizePath(path),
      status: res.statusCode.toString()
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
}

function normalizePath(path: string): string {
  // Normalize paths with IDs to reduce cardinality
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/[0-9]+/g, '/:id');
}

// ============================================
// METRICS ENDPOINT
// ============================================

export async function metricsHandler(req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end('Error collecting metrics');
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function recordPrediction(type: string, tenantId: string, score: number, confidence: number): void {
  predictionsTotal.inc({ type, tenant_id: tenantId });
  predictionScore.observe({ type }, score);
  predictionConfidence.observe({ type }, confidence);
}

export function recordRecommendation(type: string, tenantId: string): void {
  recommendationsTotal.inc({ type, tenant_id: tenantId });
}

export function recordInsight(type: string, severity: string, tenantId: string): void {
  insightsTotal.inc({ type, severity, tenant_id: tenantId });
}

export function recordEvent(type: string, tenantId: string): void {
  eventsTotal.inc({ type, tenant_id: tenantId });
}

export function recordError(type: string, code: string): void {
  errorsTotal.inc({ type, code });
}

export function recordWsConnection(tenantId: string): void {
  wsConnectionsTotal.inc({ tenant_id: tenantId });
  wsConnectionsActive.inc();
}

export function recordWsDisconnect(): void {
  wsConnectionsActive.dec();
}

export function recordWsMessage(type: string, direction: 'in' | 'out'): void {
  wsMessagesTotal.inc({ type, direction });
}

export function recordMongoOperation(operation: string, collection: string, duration: number): void {
  mongodbOperationDuration.observe({ operation, collection }, duration);
}

export function setActiveTenants(count: number): void {
  activeTenants.set(count);
}

export function recordTenantApiCall(tenantId: string): void {
  tenantApiCalls.inc({ tenant_id: tenantId });
}

// ============================================
// EXPORTS
// ============================================

export { register };
export default {
  register,
  metricsMiddleware,
  metricsHandler,
  recordPrediction,
  recordRecommendation,
  recordInsight,
  recordEvent,
  recordError,
  recordWsConnection,
  recordWsDisconnect,
  recordWsMessage,
  recordMongoOperation,
  setActiveTenants,
  recordTenantApiCall
};
