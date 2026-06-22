/**
 * Monitoring - Sentry Error Tracking + Prometheus Metrics
 *
 * Features:
 * - Sentry integration for error tracking
 * - Prometheus metrics
 * - Health check endpoints
 * - Performance monitoring
 */

// ============================================================================
// Types
// ============================================================================

export interface Metrics {
  counters: Map<string, number>;
  gauges: Map<string, number>;
  histograms: Map<string, number[]>;
  summaries: Map<string, { count: number; sum: number }>;
}

export interface HealthStatus {
  healthy: boolean;
  version: string;
  uptime: number;
  checks: {
    database: { healthy: boolean; latency?: number };
    cache: { healthy: boolean; latency?: number };
    external: { healthy: boolean; services: Record<string, boolean> };
  };
  memory: {
    used: number;
    total: number;
    percent: number;
  };
  timestamp: string;
}

// ============================================================================
// Prometheus Metrics
// ============================================================================

class PrometheusMetrics {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private labels: Map<string, Record<string, string>> = new Map();

  /**
   * Increment counter
   */
  counter(name: string, value: number = 1, labelValues?: Record<string, string>): void {
    const key = this.makeKey(name, labelValues);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Set gauge value
   */
  gauge(name: string, value: number, labelValues?: Record<string, string>): void {
    const key = this.makeKey(name, labelValues);
    this.gauges.set(key, value);
  }

  /**
   * Record histogram value
   */
  histogram(name: string, value: number, labelValues?: Record<string, string>): void {
    const key = this.makeKey(name, labelValues);
    const values = this.histograms.get(key) || [];
    values.push(value);
    // Keep last 1000 values
    if (values.length > 1000) values.shift();
    this.histograms.set(key, values);
  }

  /**
   * Observe value for summary
   */
  observe(name: string, value: number, labelValues?: Record<string, string>): void {
    const key = this.makeKey(name, labelValues);
    const current = this.summaries.get(key) || { count: 0, sum: 0 };
    current.count++;
    current.sum += value;
    this.summaries.set(key, current);
  }

  /**
   * Set labels for metric
   */
  setLabels(name: string, labelValues: Record<string, string>): void {
    this.labels.set(name, labelValues);
  }

  /**
   * Get Prometheus-formatted metrics
   */
  getMetrics(): string {
    const lines: string[] = [];

    // Counters
    for (const [key, value] of this.counters) {
      const [name, labels] = this.parseKey(key);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}${labels} ${value}`);
    }

    // Gauges
    for (const [key, value] of this.gauges) {
      const [name, labels] = this.parseKey(key);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name}${labels} ${value}`);
    }

    // Histograms
    for (const [key, values] of this.histograms) {
      const [name, labels] = this.parseKey(key);
      if (values.length === 0) continue;

      const sorted = [...values].sort((a, b) => a - b);
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / count;

      lines.push(`# TYPE ${name} histogram`);
      lines.push(`# HELP ${name} Histogram`);
      lines.push(`${name}_count${labels} ${count}`);
      lines.push(`${name}_sum${labels} ${sum}`);
      lines.push(`${name}_avg${labels} ${avg}`);
      lines.push(`${name}_min${labels} ${sorted[0]}`);
      lines.push(`${name}_max${labels} ${sorted[sorted.length - 1]}`);
    }

    // Summaries
    for (const [key, stats] of this.summaries) {
      const [name, labels] = this.parseKey(key);
      lines.push(`# TYPE ${name} summary`);
      lines.push(`${name}_count${labels} ${stats.count}`);
      lines.push(`${name}_sum${labels} ${stats.sum}`);
      if (stats.count > 0) {
        lines.push(`${name}_avg${labels} ${stats.sum / stats.count}`);
      }
    }

    return lines.join('\n');
  }

  private makeKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private parseKey(key: string): [string, string] {
    const match = key.match(/^(.+?)\{(.+)}\$/);
    if (match) {
      return [match[1], `{${match[2]}}`];
    }
    return [key, ''];
  }
}

// Singleton instance
export const metrics = new PrometheusMetrics();

// ============================================================================
// Metrics Decorators
// ============================================================================

/**
 * Track HTTP request metrics
 */
export function trackRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number
): void {
  const labels = { method, path, status: String(statusCode) };

  metrics.counter('http_requests_total', 1, labels);
  metrics.histogram('http_request_duration_seconds', duration / 1000, labels);
  metrics.gauge('http_requests_in_progress', 1, labels);

  // Decrement after a small delay (simplified)
  setTimeout(() => {
    metrics.gauge('http_requests_in_progress', 0, labels);
  }, 100);
}

/**
 * Track business metrics
 */
export function trackBusinessEvent(event: string, properties?: Record<string, string | number>): void {
  metrics.counter(`business_events_total`, 1, { event });
  if (properties) {
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'number') {
        metrics.observe(`business_${event}_${key}`, value);
      }
    }
  }
}

/**
 * Track database operations
 */
export function trackDatabase(operation: string, duration: number, success: boolean): void {
  metrics.counter('db_operations_total', 1, { operation, status: success ? 'success' : 'error' });
  metrics.histogram('db_operation_duration_seconds', duration / 1000, { operation });
}

/**
 * Track queue operations
 */
export function trackQueue(operation: string, queue: string, success: boolean): void {
  metrics.counter('queue_operations_total', 1, { operation, queue, status: success ? 'success' : 'error' });
}

// ============================================================================
// Health Check
// ============================================================================

export async function getHealthStatus(config: {
  version: string;
  serviceName: string;
  dbHealthCheck?: () => Promise<{ healthy: boolean; latency?: number }>;
  cacheHealthCheck?: () => Promise<{ healthy: boolean; latency?: number }>;
}): Promise<HealthStatus> {
  const memory = process.memoryUsage();

  const checks = {
    database: config.dbHealthCheck
      ? await config.dbHealthCheck()
      : { healthy: true },
    cache: config.cacheHealthCheck
      ? await config.cacheHealthCheck()
      : { healthy: true },
    external: { healthy: true, services: {} },
  };

  return {
    healthy: checks.database.healthy && checks.cache.healthy,
    version: config.version,
    uptime: process.uptime(),
    checks,
    memory: {
      used: Math.round(memory.heapUsed / 1024 / 1024),
      total: Math.round(memory.heapTotal / 1024 / 1024),
      percent: Math.round((memory.heapUsed / memory.heapTotal) * 100),
    },
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Sentry Integration (optional)
// ============================================================================

interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
}

let sentryInitialized = false;

export async function initSentry(config: SentryConfig): Promise<void> {
  if (!config.dsn || sentryInitialized) return;

  try {
    // Dynamic import to make it optional
    const Sentry = await import('@sentry/node');

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment || process.env.NODE_ENV,
      release: config.release,
      tracesSampleRate: config.sampleRate || 0.1,
      integrations: [],
    });

    sentryInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.warn('[Sentry] Initialization skipped (package not installed)');
  }
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (sentryInitialized) {
    // Would call Sentry.captureException in production
    console.error('[Sentry] Exception:', error.message, context);
  } else {
    console.error('[Error]', error.message, context);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (sentryInitialized) {
    // Would call Sentry.captureMessage in production
    logger.info([${level.toUpperCase()}]`, message);
  } else {
    logger.info([${level.toUpperCase()}]`, message);
  }
}

// ============================================================================
// Express Middleware
// ============================================================================

export function metricsMiddleware(
  req: { method: string; path: string },
  res: { on: (event: string, cb: () => void) => void; statusCode: number },
  next: () => void
): void {
  const start = Date.now();

  next();

  res.on('finish', () => {
    const duration = Date.now() - start;
    trackRequest(req.method, req.path, res.statusCode, duration);
  });
}

export function healthCheckEndpoint() {
  return async (req: Request, res: Response) => {
    const health = await getHealthStatus({
      version: process.env.npm_package_version || '1.0.0',
      serviceName: process.env.SERVICE_NAME || 'nexha-service',
    });

    res.status(health.healthy ? 200 : 503).json(health);
  };
}

export function metricsEndpoint() {
  return (_req: Request, res: Response) => {
    res.set('Content-Type', 'text/plain');
    res.send(metrics.getMetrics());
  };
}

// ============================================================================
// Startup Banner
// ============================================================================

export function logStartup(serviceName: string, port: number, version: string): void {
  logger.info(
╔══════════════════════════════════════════════════════════════════════════════╗
║  ${serviceName.padEnd(70)}║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Version: ${version.padEnd(64)}║
║  Port:    ${String(port).padEnd(63)}║
║  PID:     ${process.pid.padEnd(63)}║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
}
