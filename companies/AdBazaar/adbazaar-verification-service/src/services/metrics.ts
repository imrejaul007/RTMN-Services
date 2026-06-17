/**
 * Metrics
 */
import client from 'prom-client';
const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const verificationsTotal = new client.Counter({
  name: 'verification_requests_total',
  help: 'Total verification requests',
  registers: [register]
});

export const verificationsPassed = new client.Counter({
  name: 'verification_passed_total',
  help: 'Total passed verifications',
  registers: [register]
});

export const verificationDuration = new client.Histogram({
  name: 'verification_duration_ms',
  help: 'Verification processing time',
  buckets: [100, 250, 500, 1000, 2500, 5000],
  registers: [register]
});

export { register };
