/**
 * Prometheus metrics for AdBazaar Services
 */

import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});
register.registerMetric(httpRequestDuration);

// HTTP request counter
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
});
register.registerMetric(httpRequestTotal);

// Ticket metrics
const ticketsCreated = new client.Counter({
  name: 'tickets_created_total',
  help: 'Total number of tickets created',
  labelNames: ['priority', 'category'],
});
register.registerMetric(ticketsCreated);

const ticketsResolved = new client.Counter({
  name: 'tickets_resolved_total',
  help: 'Total number of tickets resolved',
  labelNames: ['resolution_time'],
});
register.registerMetric(ticketsResolved);

const ticketResolutionTime = new client.Histogram({
  name: 'ticket_resolution_time_seconds',
  help: 'Time to resolve tickets in seconds',
  labelNames: ['priority'],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400],
});
register.registerMetric(ticketResolutionTime);

// SLA metrics
const slaBreaches = new client.Counter({
  name: 'sla_breaches_total',
  help: 'Total number of SLA breaches',
  labelNames: ['sla_type'],
});
register.registerMetric(slaBreaches);

// Active tickets gauge
const activeTickets = new client.Gauge({
  name: 'active_tickets',
  help: 'Number of active tickets',
  labelNames: ['status', 'priority'],
});
register.registerMetric(activeTickets);

// Export metrics utilities
export const ticketMetrics = {
  register,
  recordRequestDuration: (path: string, durationMs: number) => {
    httpRequestDuration.observe({ method: 'GET', path, status_code: '200' }, durationMs / 1000);
  },
  incrementTicketsCreated: (priority: string, category: string) => {
    ticketsCreated.inc({ priority, category });
  },
  incrementTicketsResolved: (resolutionTime: string) => {
    ticketsResolved.inc({ resolution_time: resolutionTime });
  },
  observeResolutionTime: (priority: string, durationSeconds: number) => {
    ticketResolutionTime.observe({ priority }, durationSeconds);
  },
  incrementSlaBreaches: (slaType: string) => {
    slaBreaches.inc({ sla_type: slaType });
  },
  setActiveTickets: (status: string, priority: string, count: number) => {
    activeTickets.set({ status, priority }, count);
  },
};

export default ticketMetrics;
