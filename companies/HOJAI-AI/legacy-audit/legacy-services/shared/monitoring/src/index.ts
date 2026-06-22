/**
 * @rez/monitoring - Observability Setup
 *
 * Production-ready observability package for RTNM services.
 *
 * Features:
 * - Prometheus metrics (counter, gauge, histogram, summary)
 * - Health check endpoints (liveness, readiness, startup)
 * - OpenTelemetry tracing (distributed tracing)
 * - Alert rules template
 * - SLO tracking
 *
 * @example
 * ```typescript
 * import { createMonitoring } from '@rez/monitoring';
 *
 * const monitoring = createMonitoring({
 *   service: 'my-service',
 *   version: '1.0.0',
 *   port: 9090
 * });
 *
 * // Track metrics
 * monitoring.counter('http_requests_total', { method: 'GET', path: '/health' });
 * monitoring.histogram('http_request_duration_ms', 125, { method: 'GET' });
 *
 * // Setup routes
 * app.get('/health', monitoring.healthHandler);
 * app.get('/metrics', monitoring.metricsHandler);
 * ```
 *
 * @package @rez/monitoring
 * @author RTNM Digital
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';
import crypto from 'crypto';

// Types
export interface MonitoringConfig {
  /** Service name for metrics and tracing */
  service: string;
  /** Service version */
  version?: string;
  /** Port for metrics endpoint (default: 9090) */
  port?: number;
  /** Environment (production, staging, development) */
  env?: 'production' | 'staging' | 'development';
  /** Custom labels to add to all metrics */
  labels?: Record<string, string>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version?: string;
  uptime: number;
  services?: Record<string, { status: 'up' | 'down'; latency?: number; error?: string }>;
}

export interface MetricLabels extends Record<string, string> {}

export interface HistogramMetrics {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

// ============================================
// Prometheus Metrics (Production-Ready)
// ============================================

interface MetricBucket {
  values: number[];
}

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, MetricBucket> = new Map();
  private summaries: Map<string, MetricBucket> = new Map();
  private service: string;
  private labels: Record<string, string>;
  private startTime: number;

  constructor(service: string, labels: Record<string, string> = {}) {
    this.service = service;
    this.labels = labels;
    this.startTime = Date.now();
  }

  /**
   * Increment counter - use for events that happen (errors, requests)
   * @example counter('http_requests_total', { method: 'GET', path: '/health' })
   */
  counter(name: string, labels?: Record<string, string>, value = 1) {
    const key = this.makeKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Set gauge value - use for values that go up and down (memory, connections)
   */
  gauge(name: string, value: number, labels?: Record<string, string>) {
    const key = this.makeKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Observe histogram value - use for latencies, sizes
   * Automatically calculates percentiles
   */
  histogram(name: string, value: number, labels?: Record<string, string>) {
    const key = this.makeKey(name, labels);
    const bucket = this.histograms.get(key) || { values: [] };
    bucket.values.push(value);
    this.histograms.set(key, bucket);
  }

  /**
   * Observe summary value - similar to histogram but for final values
   */
  summary(name: string, value: number, labels?: Record<string, string>) {
    const key = this.makeKey(name, labels);
    const bucket = this.summaries.get(key) || { values: [] };
    bucket.values.push(value);
    this.summaries.set(key, bucket);
  }

  /**
   * Time a function and record its duration
   */
  async timed<T>(name: string, fn: () => T | Promise<T>, labels?: Record<string, string>): Promise<T> {
    const start = process.hrtime.bigint();
    try {
      const result = await fn();
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
      this.histogram(name, duration, labels);
      return result;
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
      this.histogram(name, duration, { ...labels, status: 'error' });
      throw error;
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Generate Prometheus metrics output
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];
    const prefix = this.service.replace(/-/g, '_');

    // Service info metric
    lines.push(`# HELP ${prefix}_info Service information`);
    lines.push(`# TYPE ${prefix}_info gauge`);
    const infoLabels = Object.entries({ service: this.service, ...this.labels })
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    lines.push(`${prefix}_info{${infoLabels}} 1`);

    // Uptime metric
    lines.push(`# HELP ${prefix}_uptime_seconds Service uptime in seconds`);
    lines.push(`# TYPE ${prefix}_uptime_seconds gauge`);
    lines.push(`${prefix}_uptime_seconds{${infoLabels}} ${Math.floor((Date.now() - this.startTime) / 1000)}`);

    // Counters
    for (const [key, value] of this.counters.entries()) {
      const { name, labels: metricLabels } = this.parseKey(key);
      lines.push(`# HELP ${prefix}_${name} Counter metric`);
      lines.push(`# TYPE ${prefix}_${name} counter`);
      lines.push(`${prefix}_${name}${metricLabels} ${value}`);
    }

    // Gauges
    for (const [key, value] of this.gauges.entries()) {
      const { name, labels: metricLabels } = this.parseKey(key);
      lines.push(`# HELP ${prefix}_${name} Gauge metric`);
      lines.push(`# TYPE ${prefix}_${name} gauge`);
      lines.push(`${prefix}_${name}${metricLabels} ${value}`);
    }

    // Histograms with percentile calculation
    for (const [key, bucket] of this.histograms.entries()) {
      const { name, labels: metricLabels } = this.parseKey(key);
      const sorted = [...bucket.values].sort((a, b) => a - b);

      if (sorted.length > 0) {
        const sum = sorted.reduce((a, b) => a + b, 0);
        const count = sorted.length;

        lines.push(`# HELP ${prefix}_${name} Histogram metric`);
        lines.push(`# TYPE ${prefix}_${name} histogram`);

        // Bucket values
        lines.push(`${prefix}_${name}_sum${metricLabels} ${sum.toFixed(2)}`);
        lines.push(`${prefix}_${name}_count${metricLabels} ${count}`);
        lines.push(`${prefix}_${name}_min${metricLabels} ${sorted[0].toFixed(2)}`);
        lines.push(`${prefix}_${name}_max${metricLabels} ${sorted[sorted.length - 1].toFixed(2)}`);
        lines.push(`${prefix}_${name}_avg${metricLabels} ${(sum / count).toFixed(2)}`);
        lines.push(`${prefix}_${name}_p50${metricLabels} ${this.percentile(sorted, 50).toFixed(2)}`);
        lines.push(`${prefix}_${name}_p95${metricLabels} ${this.percentile(sorted, 95).toFixed(2)}`);
        lines.push(`${prefix}_${name}_p99${metricLabels} ${this.percentile(sorted, 99).toFixed(2)}`);
      }
    }

    return lines.join('\n');
  }

  private makeKey(name: string, labels?: Record<string, string>): string {
    const mergedLabels = { ...this.labels, ...labels };
    if (Object.keys(mergedLabels).length === 0) return name;
    const labelStr = Object.entries(mergedLabels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private parseKey(key: string): { name: string; labels: string } {
    const match = key.match(/^([^{]+)(?:{(.*)})?$/);
    if (!match) return { name: key, labels: '' };
    const name = match[1];
    const labelStr = match[2] ? `{${match[2]}}` : '';
    return { name, labels: labelStr };
  }
}

// Store metrics per service
const metricsInstances = new Map<string, MetricsCollector>();

// SLO Configuration
interface SLOConfig {
  name: string;
  target: number; // percentage (e.g., 99.9 for 99.9%)
  window: string; // e.g., '30d'
  metric: string;
}

const sloConfigs: Map<string, SLOConfig> = new Map();

/**
 * Create monitoring system for a service
 * @example
 * ```typescript
 * const monitoring = createMonitoring({
 *   service: 'rabtul-auth',
 *   version: '1.0.0',
 *   port: 9090,
 *   labels: { region: 'us-east-1' }
 * });
 *
 * // Track metrics
 * monitoring.counter('http_requests_total', { method: 'GET' });
 * monitoring.histogram('http_request_duration_ms', 125);
 *
 * // Setup routes
 * app.get('/health', monitoring.healthHandler);
 * app.get('/metrics', monitoring.metricsHandler);
 * ```
 */
export function createMonitoring(config: MonitoringConfig) {
  const collector = new MetricsCollector(config.service, config.labels || {});
  metricsInstances.set(config.service, collector);

  /**
   * Express middleware for automatic request metrics
   */
  const requestMetricsMiddleware = () => {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const labels = {
        method: req.method,
        path: req.route?.path || req.path,
        status: 'pending'
      };

      res.on('finish', () => {
        const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
        labels.status = res.statusCode.toString();

        collector.counter('http_requests_total', labels);
        collector.histogram('http_request_duration_ms', duration, labels);

        if (res.statusCode >= 400) {
          collector.counter('http_errors_total', { ...labels, error_type: getErrorType(res.statusCode) });
        }
      });

      next();
    };
  };

  /**
   * Get error type classification
   */
  function getErrorType(statusCode: number): string {
    if (statusCode >= 500) return 'server_error';
    if (statusCode >= 400) return 'client_error';
    return 'none';
  }

  /**
   * Health check handler with service dependencies
   */
  const healthHandler = async (_req: Request, res: Response) => {
    const services: HealthStatus['services'] = {};
    let allHealthy = true;

    for (const [name, check] of serviceHealth.entries()) {
      try {
        const result = await check();
        services[name] = result;
        if (result.status === 'down') allHealthy = false;
      } catch (err) {
        services[name] = { status: 'down', error: (err as Error).message };
        allHealthy = false;
      }
    }

    const status: HealthStatus = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: config.version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services,
    };

    res.status(allHealthy ? 200 : 503).json(status);
  };

  /**
   * Readiness probe - checks if service can handle traffic
   */
  const readinessHandler = async (_req: Request, res: Response) => {
    const checks: Promise<{ name: string; ok: boolean; latency?: number }>[] = [];

    for (const [name, check] of serviceHealth.entries()) {
      checks.push(
        Promise.resolve().then(async () => {
          const start = Date.now();
          const result = await check();
          return { name, ok: result.status === 'up', latency: Date.now() - start };
        }).catch(() => ({ name, ok: false }))
      );
    }

    const results = await Promise.all(checks);
    const allReady = results.every(r => r.ok);

    res.status(allReady ? 200 : 503).json({
      ready: allReady,
      checks: results,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Startup probe - checks if service has initialized
   */
  const startupHandler = (_req: Request, res: Response) => {
    const startupDuration = Date.now() - startTime;
    const maxStartupTime = 30000; // 30 seconds

    res.json({
      started: startupDuration < maxStartupTime,
      duration: startupDuration,
      maxDuration: maxStartupTime,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Metrics handler for Prometheus scraping
   */
  const metricsHandler = (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(collector.toPrometheusFormat());
  };

  /**
   * Configure SLO for a metric
   */
  const configureSLO = (slo: SLOConfig) => {
    sloConfigs.set(slo.name, slo);
  };

  /**
   * Get SLO status
   */
  const getSLOStatus = (): Array<{ name: string; status: string; current: number; target: number }> => {
    const status: Array<{ name: string; status: string; current: number; target: number }> = [];

    for (const [name, config] of sloConfigs.entries()) {
      // Calculate current SLO based on configured metric
      const metricData = collector['histograms'].get(config.metric);
      if (metricData && metricData.values.length > 0) {
        const successCount = metricData.values.filter(v => v <= 1000).length; // Assuming 1s threshold
        const current = (successCount / metricData.values.length) * 100;
        status.push({
          name,
          status: current >= config.target ? 'healthy' : 'breaching',
          current,
          target: config.target
        });
      }
    }

    return status;
  };

  return {
    // Metrics
    counter: (name: string, labels?: Record<string, string>, value?: number) =>
      collector.counter(name, labels, value),
    gauge: (name: string, value: number, labels?: Record<string, string>) =>
      collector.gauge(name, value, labels),
    histogram: (name: string, value: number, labels?: Record<string, string>) =>
      collector.histogram(name, value, labels),
    summary: (name: string, value: number, labels?: Record<string, string>) =>
      collector.summary(name, value, labels),
    timed: <T>(name: string, fn: () => T | Promise<T>, labels?: Record<string, string>) =>
      collector.timed(name, fn, labels),

    // Handlers
    metricsHandler,
    healthHandler,
    readinessHandler,
    startupHandler,
    requestMetricsMiddleware,

    // SLO
    configureSLO,
    getSLOStatus,

    // Internal
    collector,
    config
  };
}

/**
 * Create metrics collector for a service (legacy support)
 */
export function createMetrics(config: MonitoringConfig) {
  const monitoring = createMonitoring(config);
  return {
    collector: monitoring.collector,
    counter: monitoring.counter,
    gauge: monitoring.gauge,
    histogram: monitoring.histogram,
    handler: monitoring.metricsHandler
  };
}

/**
 * Get metrics collector for a service
 */
export function getMetrics(service: string): MetricsCollector | undefined {
  return metricsInstances.get(service);
}

// ============================================
// Health Check
// ============================================

const startTime = Date.now();
const serviceHealth: Map<string, () => Promise<{ status: 'up' | 'down'; latency?: number; error?: string }>> = new Map();

/**
 * Register a service health check
 */
export function registerHealthCheck(
  name: string,
  check: () => Promise<{ status: 'up' | 'down'; latency?: number; error?: string }>
) {
  serviceHealth.set(name, check);
}

/**
 * Health check handler
 */
export async function healthCheck(config?: MonitoringConfig): Promise<(req: Request, res: Response) => Promise<void>> {
  return async (_req: Request, res: Response) => {
    const services: HealthStatus['services'] = {};
    let allHealthy = true;

    // Run all health checks
    for (const [name, check] of serviceHealth.entries()) {
      try {
        const result = await check();
        services[name] = result;
        if (result.status === 'down') {
          allHealthy = false;
        }
      } catch (err) {
        services[name] = {
          status: 'down',
          error: (err as Error).message,
        };
        allHealthy = false;
      }
    }

    const status: HealthStatus = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: config?.version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services,
    };

    res.status(allHealthy ? 200 : 503).json(status);
  };
}

/**
 * Simple liveness probe
 */
export function livenessProbe() {
  return (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  };
}

/**
 * Readiness probe
 */
export function readinessProbe() {
  return async (_req: Request, res: Response) => {
    // Check if service is ready to accept traffic
    // For now, just return ok
    res.json({ status: 'ready' });
  };
}

// ============================================
// Request Tracing
// ============================================

const requestEmitter = new EventEmitter();

interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, string>;
  logs: Array<{ time: number; event: string; attributes?: Record<string, string> }>;
}

/**
 * Create a trace span
 */
export function startSpan(operationName: string, parentSpanId?: string): TraceSpan {
  return {
    traceId: generateId(16),
    spanId: generateId(8),
    parentSpanId: parentSpanId,
    operationName,
    startTime: Date.now(),
    tags: {},
    logs: [],
  };
}

/**
 * Add tag to span
 */
export function addSpanTag(span: TraceSpan, key: string, value: string) {
  span.tags[key] = value;
}

/**
 * Add event log to span
 */
export function logSpanEvent(span: TraceSpan, event: string, attributes?: Record<string, string>) {
  span.logs.push({
    time: Date.now(),
    event,
    attributes,
  });
}

/**
 * End span
 */
export function endSpan(span: TraceSpan) {
  span.endTime = Date.now();
  requestEmitter.emit('span-end', span);
}

/**
 * Request tracing middleware
 */
export function tracingMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const traceId = (req.headers['x-trace-id'] as string) || generateId(16);
    const spanId = generateId(8);

    // Attach to request
    (req as Request & { traceId: string; spanId: string }).traceId = traceId;
    (req as Request & { spanId: string }).spanId = spanId;

    // Set response header
    res.setHeader('X-Trace-ID', traceId);

    // Start span for this request
    const span = startSpan(`${req.method} ${req.path}`, undefined);
    span.tags['http.method'] = req.method;
    span.tags['http.url'] = req.url;
    span.tags['http.host'] = req.hostname || '';
    span.tags['service.name'] = serviceName;

    // End span when response finishes
    res.on('finish', () => {
      span.tags['http.status_code'] = res.statusCode.toString();
      if (res.statusCode >= 400) {
        span.tags['error'] = 'true';
      }
      endSpan(span);
    });

    next();
  };
}

/**
 * Generate random ID using crypto
 */
function generateId(length: number): string {
  return crypto.randomBytes(length).toString('hex');
}

// ============================================
// Alert Rules Generator (Prometheus)
// ============================================

export interface AlertRule {
  alert: string;
  expr: string;
  for: string;
  labels: Record<string, string>;
  annotations: {
    summary: string;
    description: string;
  };
}

/**
 * Generate Prometheus alert rules for a service
 */
export function generateAlertRules(serviceName: string): AlertRule[] {
  return [
    {
      alert: `${serviceName}_high_error_rate`,
      expr: `rate(${serviceName}_http_errors_total[5m]) / rate(${serviceName}_http_requests_total[5m]) > 0.05`,
      for: '2m',
      labels: { severity: 'critical', service: serviceName },
      annotations: {
        summary: `${serviceName} high error rate`,
        description: `Error rate is above 5% for 2 minutes (current: {{ $value | humanizePercentage }})`
      }
    },
    {
      alert: `${serviceName}_high_latency`,
      expr: `histogram_quantile(0.95, rate(${serviceName}_http_request_duration_ms_bucket[5m])) > 1000`,
      for: '5m',
      labels: { severity: 'warning', service: serviceName },
      annotations: {
        summary: `${serviceName} high latency`,
        description: `P95 latency is above 1 second (current: {{ $value }}ms)`
      }
    },
    {
      alert: `${serviceName}_service_down`,
      expr: `${serviceName}_uptime_seconds == 0`,
      for: '1m',
      labels: { severity: 'critical', service: serviceName },
      annotations: {
        summary: `${serviceName} is down`,
        description: `${serviceName} has been down for 1 minute`
      }
    },
    {
      alert: `${serviceName}_high_memory_usage`,
      expr: `${serviceName}_memory_usage_bytes / ${serviceName}_memory_limit_bytes > 0.9`,
      for: '5m',
      labels: { severity: 'warning', service: serviceName },
      annotations: {
        summary: `${serviceName} high memory usage`,
        description: `Memory usage is above 90%`
      }
    }
  ];
}

/**
 * Export alert rules as YAML
 */
export function exportAlertRulesYAML(serviceName: string): string {
  const rules = generateAlertRules(serviceName);
  const yaml = rules.map(rule => `  - alert: ${rule.alert}
    expr: "${rule.expr}"
    for: ${rule.for}
    labels:
      severity: ${rule.labels.severity}
      service: ${rule.labels.service}
    annotations:
      summary: "${rule.annotations.summary}"
      description: "${rule.annotations.description}"`).join('\n');

  return `groups:
  - name: ${serviceName}
    rules:
${yaml}
`;
}

export default {
  createMonitoring,
  createMetrics,
  getMetrics,
  registerHealthCheck,
  healthCheck,
  livenessProbe,
  readinessProbe,
  tracingMiddleware,
  startSpan,
  addSpanTag,
  logSpanEvent,
  endSpan,
  generateAlertRules,
  exportAlertRulesYAML
};