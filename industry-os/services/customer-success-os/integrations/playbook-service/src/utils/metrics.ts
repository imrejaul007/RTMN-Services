/**
 * Customer Success Playbook Service - Prometheus Metrics
 */

import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'playbook_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

const httpRequestsTotal = new client.Counter({
  name: 'playbook_service_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestsTotal);

const playbookExecutionsCounter = new client.Counter({
  name: 'playbook_service_executions_total',
  help: 'Total playbook executions',
  labelNames: ['playbook_id', 'status'],
});
register.registerMetric(playbookExecutionsCounter);

const triggerCounter = new client.Counter({
  name: 'playbook_service_triggers_total',
  help: 'Total triggers fired',
  labelNames: ['trigger_type'],
});
register.registerMetric(triggerCounter);

const executionDuration = new client.Histogram({
  name: 'playbook_service_execution_duration_seconds',
  help: 'Playbook execution duration',
  labelNames: ['playbook_id'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});
register.registerMetric(executionDuration);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    httpRequestDuration.observe({ method: req.method, route, status_code: res.statusCode }, duration);
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
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

export { register, httpRequestDuration, httpRequestsTotal, playbookExecutionsCounter, triggerCounter, executionDuration };