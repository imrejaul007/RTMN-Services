/**
 * Prometheus metrics for Support SLA Service
 */

import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'sla_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});
register.registerMetric(httpRequestDuration);

// SLA metrics
const slasCreated = new client.Counter({
  name: 'sla_created_total',
  help: 'Total number of SLAs created',
  labelNames: ['type', 'priority'],
});
register.registerMetric(slasCreated);

const slasMet = new client.Counter({
  name: 'sla_met_total',
  help: 'Total number of SLAs met',
  labelNames: ['type'],
});
register.registerMetric(slasMet);

const slaBreaches = new client.Counter({
  name: 'sla_breaches_total',
  help: 'Total number of SLA breaches',
  labelNames: ['type', 'priority', 'severity'],
});
register.registerMetric(slaBreaches);

// Alert metrics
const alertsCreated = new client.Counter({
  name: 'sla_alerts_created_total',
  help: 'Total number of alerts created',
  labelNames: ['type', 'channel'],
});
register.registerMetric(alertsCreated);

const alertsSent = new client.Counter({
  name: 'sla_alerts_sent_total',
  help: 'Total number of alerts sent',
  labelNames: ['channel'],
});
register.registerMetric(alertsSent);

// Active SLAs gauge
const activeSlas = new client.Gauge({
  name: 'sla_active_count',
  help: 'Number of active SLAs',
  labelNames: ['type', 'priority'],
});
register.registerMetric(activeSlas);

// Compliance gauge
const complianceRate = new client.Gauge({
  name: 'sla_compliance_rate',
  help: 'SLA compliance rate percentage',
  labelNames: ['type'],
});
register.registerMetric(complianceRate);

// Export metrics utilities
export const slaMetrics = {
  register,
  recordRequestDuration: (path: string, durationMs: number) => {
    httpRequestDuration.observe({ method: 'GET', path, status_code: '200' }, durationMs / 1000);
  },
  incrementSlasCreated: (type: string, priority: string) => {
    slasCreated.inc({ type, priority });
  },
  incrementSlasMet: (type: string) => {
    slasMet.inc({ type });
  },
  incrementSlaBreaches: (type: string, priority: string, severity: string) => {
    slaBreaches.inc({ type, priority, severity });
  },
  incrementAlertsCreated: (type: string, channel: string) => {
    alertsCreated.inc({ type, channel });
  },
  incrementAlertsSent: (channel: string) => {
    alertsSent.inc({ channel });
  },
  setActiveSlas: (type: string, priority: string, count: number) => {
    activeSlas.set({ type, priority }, count);
  },
  setComplianceRate: (type: string, rate: number) => {
    complianceRate.set({ type }, rate);
  },
};

export default slaMetrics;