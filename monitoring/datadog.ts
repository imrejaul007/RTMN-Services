// Datadog APM and Logs setup
import tracer from 'dd-trace';
import { StatsD } from 'hot-shots';

// Initialize Datadog APM
tracer.init({
  service: process.env.DD_SERVICE_NAME || 'rtmn-unknown',
  env: process.env.NODE_ENV || 'development',
  version: process.env.GIT_SHA || process.env.npm_package_version,
  logInjection: true,
  logLevel: 'debug',
  profile: true,
});

// StatsD client for custom metrics
const statsd = new StatsD({
  host: process.env.DD_AGENT_HOST || 'localhost',
  port: 8125,
  prefix: 'rtmn.',
  errorHandler: (err) => console.error('StatsD error:', err),
});

// Custom metrics
export const metrics = {
  // BrandPulse metrics
  brandsCreated: () => statsd.increment('brandpulse.brands.created'),
  reviewsProcessed: (source: string) => statsd.increment('brandpulse.reviews.processed', 1, [`source:${source}`]),
  sentimentAnalyzed: () => statsd.histogram('brandpulse.sentiment.analyzed', Date.now()),

  // API metrics
  apiRequests: (method: string, path: string, status: number) => {
    statsd.increment('api.requests.count', 1, [`method:${method}`, `path:${path}`, `status:${status}`]);
  },
  apiLatency: (method: string, path: string, duration: number) => {
    statsd.histogram('api.latency', duration, [`method:${method}`, `path:${path}`]);
  },

  // Business metrics
  activeSubscriptions: (count: number) => statsd.gauge('billing.subscriptions.active', count),
  monthlyRevenue: (amount: number) => statsd.gauge('billing.revenue.monthly', amount),

  // Infrastructure metrics
  databaseConnections: (count: number) => statsd.gauge('infrastructure.db.connections', count),
  redisConnections: (count: number) => statsd.gauge('infrastructure.redis.connections', count),
};

// Health metrics
export const healthMetrics = {
  healthy: () => statsd.gauge('health.status', 1),
  unhealthy: () => statsd.gauge('health.status', 0),
};

// Middleware for automatic request tracking
export const requestMetrics = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.apiRequests(req.method, req.path, res.statusCode);
    metrics.apiLatency(req.method, req.path, duration);
  });

  next();
};

export default { metrics, healthMetrics, requestMetrics };
