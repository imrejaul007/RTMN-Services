/**
 * Metrics Service
 */
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestsTotal = new client.Counter({
  name: 'intent_prediction_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const intentScoringTotal = new client.Counter({
  name: 'intent_prediction_scoring_total',
  help: 'Total intent scoring requests',
  labelNames: ['category', 'status'],
  registers: [register],
});

export const audienceSegmentsGenerated = new client.Counter({
  name: 'intent_prediction_segments_generated_total',
  help: 'Total audience segments generated',
  registers: [register],
});

export const lookalikesGenerated = new client.Counter({
  name: 'intent_prediction_lookalikes_generated_total',
  help: 'Total lookalikes generated',
  registers: [register],
});

export const dormantIntentsDetected = new client.Gauge({
  name: 'intent_prediction_dormant_intents',
  help: 'Dormant intents detected',
  labelNames: ['category'],
  registers: [register],
});

export { register };
