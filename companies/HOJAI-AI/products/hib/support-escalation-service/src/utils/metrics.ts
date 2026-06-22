/**
 * Prometheus metrics for Support Escalation Service
 */

import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'esc_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});
register.registerMetric(httpRequestDuration);

// Escalation metrics
const escalationsCreated = new client.Counter({
  name: 'esc_escalations_created_total',
  help: 'Total number of escalations created',
  labelNames: ['reason', 'level'],
});
register.registerMetric(escalationsCreated);

const escalationsResolved = new client.Counter({
  name: 'esc_escalations_resolved_total',
  help: 'Total number of escalations resolved',
});
register.registerMetric(escalationsResolved);

const escalationsCancelled = new client.Counter({
  name: 'esc_escalations_cancelled_total',
  help: 'Total number of escalations cancelled',
});
register.registerMetric(escalationsCancelled);

// Rule metrics
const rulesTriggered = new client.Counter({
  name: 'esc_rules_triggered_total',
  help: 'Total number of rule triggers',
  labelNames: ['rule_id'],
});
register.registerMetric(rulesTriggered);

// Active escalations gauge
const activeEscalations = new client.Gauge({
  name: 'esc_active_escalations',
  help: 'Number of active escalations',
  labelNames: ['status', 'level'],
});
register.registerMetric(activeEscalations);

// Export metrics utilities
export const escalationMetrics = {
  register,
  recordRequestDuration: (path: string, durationMs: number) => {
    httpRequestDuration.observe({ method: 'GET', path, status_code: '200' }, durationMs / 1000);
  },
  incrementEscalationsCreated: (reason: string, level: string) => {
    escalationsCreated.inc({ reason, level });
  },
  incrementEscalationsResolved: () => {
    escalationsResolved.inc();
  },
  incrementEscalationsCancelled: () => {
    escalationsCancelled.inc();
  },
  incrementRulesTriggered: (ruleId: string) => {
    rulesTriggered.inc({ rule_id: ruleId });
  },
  setActiveEscalations: (status: string, level: string, count: number) => {
    activeEscalations.set({ status, level }, count);
  },
};

export default escalationMetrics;