/**
 * Metrics Service
 *
 * Prometheus metrics for inventory service
 */

import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const screensRegistered = new client.Counter({
  name: 'inventory_screens_registered_total',
  help: 'Total screens registered',
  labelNames: ['type', 'network'],
  registers: [register],
});

export const screensActive = new client.Gauge({
  name: 'inventory_screens_active',
  help: 'Currently active screens',
  labelNames: ['type', 'city'],
  registers: [register],
});

export const impressionsRecorded = new client.Counter({
  name: 'inventory_impressions_total',
  help: 'Total impressions recorded',
  labelNames: ['screen_type'],
  registers: [register],
});

export const scansRecorded = new client.Counter({
  name: 'inventory_scans_total',
  help: 'Total QR scans recorded',
  registers: [register],
});

export const searchQueries = new client.Counter({
  name: 'inventory_search_queries_total',
  help: 'Total search queries',
  labelNames: ['type'],
  registers: [register],
});

export { register };
