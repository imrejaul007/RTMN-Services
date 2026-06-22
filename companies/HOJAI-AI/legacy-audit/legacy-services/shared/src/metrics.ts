/**
 * Prometheus Metrics Middleware
 * Standard metrics for all HOJAI services
 */

import { Request, Response, NextFunction } from 'express';

// Metric types
interface Counter {
  labels: Record<string, string>;
  value: number;
}

interface Histogram {
  labels: Record<string, string>;
  value: number;
}

interface Gauge {
  labels: Record<string, string>;
  value: number;
}

// In-memory metrics store (use Prometheus client in production)
const metrics = {
  counters: new Map<string, Counter>(),
  histograms: new Map<string, Histogram>(),
  gauges: new Map<string, Gauge>(),
};

// Request tracking
let requestCount = 0;
let requestDuration = 0;
const httpRequestsByMethod = new Map<string, number>();
const httpRequestsByStatus = new Map<string, number>();
const httpRequestsByPath = new Map<string, number>();

/**
 * Record HTTP request
 */
export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
): void {
  requestCount++;
  requestDuration += durationMs;

  // By method
  httpRequestsByMethod.set(
    method,
    (httpRequestsByMethod.get(method) || 0) + 1
  );

  // By status code
  const statusGroup = `${Math.floor(status / 100)}xx`;
  httpRequestsByStatus.set(
    statusGroup,
    (httpRequestsByStatus.get(statusGroup) || 0) + 1
  );

  // By path (normalize to avoid cardinality explosion)
  const normalizedPath = normalizePath(path);
  httpRequestsByPath.set(
    normalizedPath,
    (httpRequestsByPath.get(normalizedPath) || 0) + 1
  );
}

/**
 * Normalize path for metrics (replace IDs with :id)
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{24}/gi, '/:id') // MongoDB ObjectId
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid') // UUIDs
    .replace(/\/\d+/g, '/:id'); // Numeric IDs
}

/**
 * Increment a counter
 */
export function incrementCounter(name: string, labels: Record<string, string> = {}): void {
  const key = `${name}:${JSON.stringify(labels)}`;
  metrics.counters.set(key, { labels, value: (metrics.counters.get(key)?.value || 0) + 1 });
}

/**
 * Record a histogram value
 */
export function recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
  const key = `${name}:${JSON.stringify(labels)}`;
  const existing = metrics.histograms.get(key);
  if (existing) {
    // Keep running sum and count for average
    existing.value = (existing.value * (existing.labels._count || 1) + value) / ((existing.labels._count || 1) + 1);
    existing.labels = { ...labels, _count: (existing.labels._count || 1) + 1 };
  } else {
    metrics.histograms.set(key, { labels, value });
  }
}

/**
 * Set a gauge value
 */
export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
  const key = `${name}:${JSON.stringify(labels)}`;
  metrics.gauges.set(key, { labels, value });
}

/**
 * Express middleware for automatic metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    recordHttpRequest(req.method, req.path, res.statusCode, duration);

    // Record in histogram
    recordHistogram('http_request_duration_seconds', duration / 1000, {
      method: req.method,
      path: normalizePath(req.path),
      status: `${res.statusCode}`,
    });
  });

  next();
}

/**
 * Format metrics for Prometheus
 */
export function formatPrometheusMetrics(): string {
  const lines: string[] = [];

  // Add HELP and TYPE comments for each metric
  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  lines.push(`http_requests_total ${requestCount}`);

  lines.push('');
  lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
  lines.push('# TYPE http_request_duration_seconds histogram');

  lines.push('');
  lines.push('# HELP http_requests_by_method HTTP requests by method');
  lines.push('# TYPE http_requests_by_method counter');
  httpRequestsByMethod.forEach((count, method) => {
    lines.push(`http_requests_by_method{method="${method}"} ${count}`);
  });

  lines.push('');
  lines.push('# HELP http_requests_by_status HTTP requests by status code');
  lines.push('# TYPE http_requests_by_status counter');
  httpRequestsByStatus.forEach((count, status) => {
    lines.push(`http_requests_by_status{status="${status}"} ${count}`);
  });

  lines.push('');
  lines.push('# HELP service_up Service availability');
  lines.push('# TYPE service_up gauge');
  lines.push('service_up 1');

  lines.push('');
  lines.push('# HELP process_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${Math.floor(process.uptime())}`);

  // Custom counters
  lines.push('');
  lines.push('# HELP custom_counters_total Custom counters');
  lines.push('# TYPE custom_counters_total counter');
  metrics.counters.forEach((counter, key) => {
    const metricName = key.split(':')[0];
    const labelStr = Object.entries(counter.labels)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    lines.push(`${metricName}${labelStr ? `{${labelStr}}` : ''} ${counter.value}`);
  });

  return lines.join('\n');
}

/**
 * Get metrics as JSON (for internal use)
 */
export function getMetricsJson(): object {
  return {
    http: {
      requestsTotal: requestCount,
      avgDurationMs: requestCount > 0 ? requestDuration / requestCount : 0,
      byMethod: Object.fromEntries(httpRequestsByMethod),
      byStatus: Object.fromEntries(httpRequestsByStatus),
    },
    custom: {
      counters: Object.fromEntries(
        Array.from(metrics.counters.entries()).map(([k, v]) => [k.split(':')[0], v.value])
      ),
      gauges: Object.fromEntries(
        Array.from(metrics.gauges.entries()).map(([k, v]) => [k.split(':')[0], v.value])
      ),
    },
    process: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
  };
}

/**
 * Predefined metrics for common use cases
 */
export const commonMetrics = {
  // Agent metrics
  agentsCreated: () => incrementCounter('agents_created_total'),
  agentsInvoked: () => incrementCounter('agents_invoked_total'),
  agentExecutionDuration: (ms: number) => recordHistogram('agent_execution_duration_seconds', ms / 1000),

  // Analysis metrics
  codesAnalyzed: () => incrementCounter('codes_analyzed_total'),
  bugsDetected: (severity: string) => incrementCounter('bugs_detected_total', { severity }),
  securityIssuesDetected: (severity: string) => incrementCounter('security_issues_detected_total', { severity }),

  // SOAR metrics
  incidentsCreated: () => incrementCounter('incidents_created_total'),
  playbooksExecuted: () => incrementCounter('playbooks_executed_total'),
  playbookStepsCompleted: () => incrementCounter('playbook_steps_completed_total'),
  playbookStepsFailed: () => incrementCounter('playbook_steps_failed_total'),

  // Sync metrics
  devicesRegistered: () => incrementCounter('devices_registered_total'),
  syncChangesProcessed: (count: number) => {
    for (let i = 0; i < count; i++) incrementCounter('sync_changes_processed_total');
  },
  syncConflicts: () => incrementCounter('sync_conflicts_total'),
};

export default {
  metricsMiddleware,
  formatPrometheusMetrics,
  getMetricsJson,
  incrementCounter,
  recordHistogram,
  setGauge,
  commonMetrics,
};
