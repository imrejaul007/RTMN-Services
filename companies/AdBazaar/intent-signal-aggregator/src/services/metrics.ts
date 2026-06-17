/**
 * Metrics Service
 *
 * Prometheus metrics for the Intent Signal Aggregator.
 */

import client from 'prom-client';

// ============================================================================
// REGISTRY
// ============================================================================

const register = new client.Registry();

// Default metrics
client.collectDefaultMetrics({ register });

// ============================================================================
// CUSTOM METRICS
// ============================================================================

export const httpRequestsTotal = new client.Counter({
  name: 'intent_signal_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: 'intent_signal_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const signalsIngested = new client.Counter({
  name: 'intent_signal_signals_ingested_total',
  help: 'Total signals ingested',
  labelNames: ['source', 'event_type', 'status'],
  registers: [register],
});

export const signalsDeduplicated = new client.Counter({
  name: 'intent_signal_deduplicated_total',
  help: 'Total duplicate signals detected',
  registers: [register],
});

export const signalEnrichmentTime = new client.Histogram({
  name: 'intent_signal_enrichment_duration_seconds',
  help: 'Time spent enriching signals',
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const activeUsersGauge = new client.Gauge({
  name: 'intent_signal_active_users',
  help: 'Number of active users with signals',
  registers: [register],
});

// ============================================================================
// EXPORTS
// ============================================================================

export const metrics = {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  signalsIngested,
  signalsDeduplicated,
  signalEnrichmentTime,
  activeUsersGauge,
};

export default metrics;