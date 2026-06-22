import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import * as os from "os";
import {
  Config,
  ServiceHealth,
  ServiceStatus,
  ServiceMetrics,
  AggregateMetrics,
  AggregateHealth,
  Alert,
  CreateAlertRequest,
  UptimeStats,
  UptimeRecord,
  PerformanceMetrics,
  ApiResponse,
  LogLevel,
  LogEntry,
  SUTAR_SERVICES,
  SUTARService,
} from "./types/index.js";

// ============================================================================
// Configuration
// ============================================================================

const config: Config = {
  port: parseInt(process.env.PORT || "3100"),
  environment: process.env.NODE_ENV || "development",
  logLevel: (["debug", "info", "warn", "error"] as string[]).includes(process.env.LOG_LEVEL || "") ? (process.env.LOG_LEVEL as LogLevel) : "info",
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
};

// ============================================================================
// Logger
// ============================================================================

class Logger {
  private level: LogLevel;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (this.levels[level] < this.levels[this.level]) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : "";

    switch (level) {
      case "error":
        console.error(`${prefix} ${message}${metaStr}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}${metaStr}`);
        break;
      default:
        console.log(`${prefix} ${message}${metaStr}`);
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log("debug", message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log("info", message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log("warn", message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log("error", message, metadata);
  }
}

const logger = new Logger(config.logLevel);

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - config.rateLimitWindowMs;

    let timestamps = this.requests.get(clientId) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= config.rateLimitMaxRequests) {
      return false;
    }

    timestamps.push(now);
    this.requests.set(clientId, timestamps);
    return true;
  }

  cleanup(): void {
    const windowStart = Date.now() - config.rateLimitWindowMs;
    for (const [clientId, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter((t) => t > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, filtered);
      }
    }
  }
}

const rateLimiter = new RateLimiter();
setInterval(() => rateLimiter.cleanup(), 60000);

// ============================================================================
// Metrics Store
// ============================================================================

interface ServiceMetricData {
  requests: number[];
  errors: { count: number; type: string; timestamp: number }[];
  latencies: number[];
  lastReset: number;
}

class MetricsStore {
  private metrics: Map<string, ServiceMetricData> = new Map();
  private readonly MAX_HISTORY = 1000;

  getOrCreate(serviceName: string): ServiceMetricData {
    let data = this.metrics.get(serviceName);
    if (!data) {
      data = {
        requests: [],
        errors: [],
        latencies: [],
        lastReset: Date.now(),
      };
      this.metrics.set(serviceName, data);
    }
    return data;
  }

  recordRequest(serviceName: string, success: boolean, latency: number): void {
    const data = this.getOrCreate(serviceName);
    data.requests.push(Date.now());
    if (!success) {
      data.errors.push({ count: 1, type: "request_failed", timestamp: Date.now() });
    }
    data.latencies.push(latency);

    // Trim history
    if (data.requests.length > this.MAX_HISTORY) {
      data.requests = data.requests.slice(-this.MAX_HISTORY);
    }
    if (data.latencies.length > this.MAX_HISTORY) {
      data.latencies = data.latencies.slice(-this.MAX_HISTORY);
    }
    if (data.errors.length > this.MAX_HISTORY) {
      data.errors = data.errors.slice(-this.MAX_HISTORY);
    }
  }

  getMetrics(serviceName: string, windowMs: number = 300000): ServiceMetrics {
    const data = this.getOrCreate(serviceName);
    const windowStart = Date.now() - windowMs;

    const recentRequests = data.requests.filter((t) => t > windowStart);
    const recentErrors = data.errors.filter((e) => e.timestamp > windowStart);
    const recentLatencies = data.latencies.filter((_, i) => data.requests[i] > windowStart);

    const total = recentRequests.length;
    const errors = recentErrors.length;
    const sortedLatencies = [...recentLatencies].sort((a, b) => a - b);

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const percentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };

    const errorByType: Record<string, number> = {};
    for (const err of recentErrors) {
      errorByType[err.type] = (errorByType[err.type] || 0) + err.count;
    }

    const memUsage = process.memoryUsage();
    const cpuUsage = os.loadavg();

    return {
      serviceName,
      requests: {
        total,
        success: total - errors,
        failed: errors,
        rate: total / (windowMs / 1000),
      },
      latency: {
        avg: avg(sortedLatencies),
        min: sortedLatencies[0] || 0,
        max: sortedLatencies[sortedLatencies.length - 1] || 0,
        p50: percentile(sortedLatencies, 50),
        p95: percentile(sortedLatencies, 95),
        p99: percentile(sortedLatencies, 99),
      },
      errors: {
        total: errors,
        rate: total > 0 ? errors / total : 0,
        byType: errorByType,
      },
      resources: {
        memory: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          percent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        },
        cpu: {
          usage: cpuUsage[0] * 100 / os.cpus().length,
          cores: os.cpus().length,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  getAllMetrics(windowMs: number = 300000): AggregateMetrics {
    let totalRequests = 0;
    let totalErrors = 0;
    let totalLatency = 0;
    let services: ServiceMetrics[] = [];

    for (const [serviceName] of this.metrics) {
      const metrics = this.getMetrics(serviceName, windowMs);
      totalRequests += metrics.requests.total;
      totalErrors += metrics.errors.total;
      totalLatency += metrics.latency.avg;
      services.push(metrics);
    }

    return {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      avgResponseTime: services.length > 0 ? totalLatency / services.length : 0,
      services,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Health Monitor
// ============================================================================

class HealthMonitor {
  private health: Map<string, ServiceHealth> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();

  async checkService(service: SUTARService): Promise<ServiceHealth> {
    const startTime = Date.now();
    let status: ServiceStatus = "unknown";
    let responseTime = 0;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://localhost:${service.port}${service.healthEndpoint}`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      responseTime = Date.now() - startTime;

      if (response.ok) {
        status = "healthy";
      } else if (response.status >= 500) {
        status = "unhealthy";
      } else {
        status = "degraded";
      }
    } catch {
      responseTime = Date.now() - startTime;
      status = "unhealthy";
    }

    const existing = this.health.get(service.name);
    const health: ServiceHealth = {
      serviceName: service.name,
      status,
      lastCheck: new Date().toISOString(),
      responseTime,
      uptimePercent: existing?.uptimePercent ?? 100,
      errorCount: status === "unhealthy" ? (existing?.errorCount ?? 0) + 1 : existing?.errorCount ?? 0,
      requestCount: (existing?.requestCount ?? 0) + 1,
      metadata: { port: service.port },
    };

    // Calculate uptime
    if (health.requestCount > 0) {
      health.uptimePercent = ((health.requestCount - health.errorCount) / health.requestCount) * 100;
    }

    this.health.set(service.name, health);
    return health;
  }

  startMonitoring(services: SUTARService[]): void {
    for (const service of services) {
      this.checkService(service).catch((err) => {
        logger.error(`Health check failed for ${service.name}`, { error: String(err) });
      });

      const interval = setInterval(() => {
        this.checkService(service).catch((err) => {
          logger.error(`Health check failed for ${service.name}`, { error: String(err) });
        });
      }, 30000);

      this.checkIntervals.set(service.name, interval);
    }

    logger.info("Health monitoring started", { services: services.map((s) => s.name) });
  }

  stopMonitoring(): void {
    for (const [name, interval] of this.checkIntervals) {
      clearInterval(interval);
      this.checkIntervals.delete(name);
    }
  }

  getHealth(serviceName: string): ServiceHealth | undefined {
    return this.health.get(serviceName);
  }

  getAllHealth(): AggregateHealth {
    const services = Array.from(this.health.values());
    const healthy = services.filter((s) => s.status === "healthy").length;
    const degraded = services.filter((s) => s.status === "degraded").length;
    const unhealthy = services.filter((s) => s.status === "unhealthy").length;

    let overallStatus: ServiceStatus = "healthy";
    if (unhealthy > 0) overallStatus = "unhealthy";
    else if (degraded > 0) overallStatus = "degraded";

    return {
      overallStatus,
      totalServices: services.length,
      healthyServices: healthy,
      degradedServices: degraded,
      unhealthyServices: unhealthy,
      services,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Alert Manager
// ============================================================================

class AlertManager {
  private alerts: Alert[] = [];
  private readonly MAX_ALERTS = 1000;

  createAlert(request: CreateAlertRequest): Alert {
    const alert: Alert = {
      id: uuidv4(),
      serviceName: request.serviceName,
      severity: request.severity,
      status: "active",
      title: request.title,
      message: request.message,
      metric: request.metric,
      threshold: request.threshold,
      currentValue: request.currentValue,
      createdAt: new Date().toISOString(),
      metadata: request.metadata,
    };

    this.alerts.push(alert);

    // Trim old alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    logger.warn(`Alert created: ${alert.title}`, {
      alertId: alert.id,
      service: alert.serviceName,
      severity: alert.severity,
    });

    return alert;
  }

  acknowledgeAlert(alertId: string): Alert | undefined {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert && alert.status === "active") {
      alert.status = "acknowledged";
      alert.acknowledgedAt = new Date().toISOString();
      logger.info(`Alert acknowledged: ${alert.title}`, { alertId: alert.id });
    }
    return alert;
  }

  resolveAlert(alertId: string): Alert | undefined {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert && alert.status !== "resolved") {
      alert.status = "resolved";
      alert.resolvedAt = new Date().toISOString();
      logger.info(`Alert resolved: ${alert.title}`, { alertId: alert.id });
    }
    return alert;
  }

  getAlerts(filters?: {
    serviceName?: string;
    severity?: string;
    status?: string;
  }): Alert[] {
    let filtered = [...this.alerts];

    if (filters?.serviceName) {
      filtered = filtered.filter((a) => a.serviceName === filters.serviceName);
    }
    if (filters?.severity) {
      filtered = filtered.filter((a) => a.severity === filters.severity);
    }
    if (filters?.status) {
      filtered = filtered.filter((a) => a.status === filters.status);
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter((a) => a.status === "active");
  }

  getAlertCounts(): { active: number; critical: number; warning: number; info: number } {
    const active = this.alerts.filter((a) => a.status === "active");
    return {
      active: active.length,
      critical: active.filter((a) => a.severity === "critical").length,
      warning: active.filter((a) => a.severity === "warning").length,
      info: active.filter((a) => a.severity === "info").length,
    };
  }
}

// ============================================================================
// Uptime Tracker
// ============================================================================

class UptimeTracker {
  private history: Map<string, UptimeRecord[]> = new Map();
  private readonly MAX_HISTORY = 10000;

  recordStatus(serviceName: string, status: ServiceStatus, responseTime: number): void {
    const record: UptimeRecord = {
      timestamp: new Date().toISOString(),
      status,
      responseTime,
    };

    let history = this.history.get(serviceName) || [];
    history.push(record);

    if (history.length > this.MAX_HISTORY) {
      history = history.slice(-this.MAX_HISTORY);
    }

    this.history.set(serviceName, history);
  }

  getUptimeStats(serviceName: string, days: number = 7): UptimeStats {
    const history = this.history.get(serviceName) || [];
    const now = Date.now();
    const periodStart = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date(now).toISOString();

    const filtered = history.filter((r) => new Date(r.timestamp) >= new Date(periodStart));

    const healthy = filtered.filter((r) => r.status === "healthy").length;
    const degraded = filtered.filter((r) => r.status === "degraded").length;
    const unhealthy = filtered.filter((r) => r.status === "unhealthy").length;
    const total = filtered.length;

    // Count incidents (status changes to degraded or unhealthy)
    let incidents = 0;
    let prevStatus: ServiceStatus | null = null;
    for (const record of filtered) {
      if (prevStatus === "healthy" && record.status !== "healthy") {
        incidents++;
      }
      prevStatus = record.status;
    }

    const avgResponseTime =
      filtered.length > 0
        ? filtered.reduce((sum, r) => sum + r.responseTime, 0) / filtered.length
        : 0;

    return {
      serviceName,
      period: {
        start: periodStart,
        end: periodEnd,
        days,
      },
      uptime: {
        total,
        percent: total > 0 ? (healthy / total) * 100 : 100,
        healthy,
        degraded,
        unhealthy,
      },
      incidents: {
        total: incidents,
        critical: unhealthy,
        warning: degraded,
      },
      history: filtered.slice(-100), // Last 100 records
      avgResponseTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Performance Analyzer
// ============================================================================

class PerformanceAnalyzer {
  constructor(
    private metricsStore: MetricsStore,
    private alertManager: AlertManager,
    private healthMonitor: HealthMonitor
  ) {}

  getPerformanceMetrics(): PerformanceMetrics {
    const aggregateMetrics = this.metricsStore.getAllMetrics(300000);
    const alertCounts = this.alertManager.getAlertCounts();
    const allHealth = this.healthMonitor.getAllHealth();

    // Calculate throughput
    const rps = aggregateMetrics.totalRequests / 300; // 5 minute window
    const rpm = rps * 60;
    const rph = rps * 3600;

    // Calculate latency percentiles across all services
    const allLatencies: number[] = [];
    for (const metrics of aggregateMetrics.services) {
      // Approximate from p50, p95, p99
      allLatencies.push(metrics.latency.avg, metrics.latency.p50, metrics.latency.p95, metrics.latency.p99);
    }
    const sortedLatencies = allLatencies.filter((l) => l > 0).sort((a, b) => a - b);

    // Top services by requests
    const byRequests = aggregateMetrics.services
      .map((s) => ({ name: s.serviceName, count: s.requests.total }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top services by errors
    const byErrors = aggregateMetrics.services
      .map((s) => ({ name: s.serviceName, count: s.errors.total }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top services by latency
    const byLatency = aggregateMetrics.services
      .map((s) => ({ name: s.serviceName, latency: s.latency.avg }))
      .sort((a, b) => b.latency - a.latency)
      .slice(0, 5);

    // Calculate availability
    const totalServices = allHealth.totalServices;
    const healthyServices = allHealth.healthyServices;
    const currentAvailability = totalServices > 0 ? (healthyServices / totalServices) * 100 : 100;

    return {
      throughput: {
        requestsPerSecond: rps,
        requestsPerMinute: rpm,
        requestsPerHour: rph,
      },
      latency: {
        globalAvg: aggregateMetrics.avgResponseTime,
        globalP50: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0,
        globalP95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0,
        globalP99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0,
      },
      errorRate: {
        current: aggregateMetrics.errorRate,
        avg: aggregateMetrics.errorRate,
        trend: "stable" as const,
      },
      availability: {
        current: currentAvailability,
        last24h: currentAvailability,
        last7d: currentAvailability,
        last30d: currentAvailability,
      },
      alerts: {
        active: alertCounts.active,
        critical: alertCounts.critical,
        warning: alertCounts.warning,
      },
      topServices: {
        byRequests,
        byErrors,
        byLatency,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Initialize Services
// ============================================================================

const metricsStore = new MetricsStore();
const healthMonitor = new HealthMonitor();
const alertManager = new AlertManager();
const uptimeTracker = new UptimeTracker();
const performanceAnalyzer = new PerformanceAnalyzer(metricsStore, alertManager, healthMonitor);

// Start health monitoring for all SUTAR services
healthMonitor.startMonitoring(SUTAR_SERVICES);

// ============================================================================
// Express App
// ============================================================================

const app = express();
const START_TIME = Date.now();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || uuidv4();
  next();
});

// Rate limiting middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientId = req.ip || req.socket.remoteAddress || "unknown";

  if (!rateLimiter.isAllowed(clientId)) {
    logger.warn("Rate limit exceeded", { clientId, path: req.path });
    return res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
      timestamp: new Date().toISOString(),
      requestId: req.headers["x-request-id"],
    });
  }
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      requestId: req.headers["x-request-id"],
    });
  });
  next();
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API Response Helper
// ============================================================================

const apiResponse = <T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId,
});

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const createAlertSchema = z.object({
  serviceName: z.string().min(1).max(100),
  severity: z.enum(["critical", "warning", "info"]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  metric: z.string().optional(),
  threshold: z.number().optional(),
  currentValue: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const alertsQuerySchema = z.object({
  serviceName: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
});

// ============================================================================
// Health Endpoints
// ============================================================================

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "sutar-monitoring",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});

app.get("/api/v1/health", (_req: Request, res: Response) => {
  try {
    const health = healthMonitor.getAllHealth();
    res.json(apiResponse(true, health));
  } catch (error) {
    logger.error("Failed to get health", { error: String(error) });
    res.status(500).json(apiResponse(false, undefined, "Failed to get health status"));
  }
});

app.get("/api/v1/health/:service", (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const health = healthMonitor.getHealth(service);

    if (!health) {
      return res.status(404).json(apiResponse(false, undefined, `Service '${service}' not found`));
    }

    res.json(apiResponse(true, health));
  } catch (error) {
    logger.error("Failed to get service health", { error: String(error), service: req.params.service });
    res.status(500).json(apiResponse(false, undefined, "Failed to get service health"));
  }
});

// ============================================================================
// Metrics Endpoints
// ============================================================================

app.get("/api/v1/metrics", (req: Request, res: Response) => {
  try {
    const windowMs = parseInt(req.query.window as string) || 300000;
    const metrics = metricsStore.getAllMetrics(windowMs);
    res.json(apiResponse(true, metrics));
  } catch (error) {
    logger.error("Failed to get metrics", { error: String(error) });
    res.status(500).json(apiResponse(false, undefined, "Failed to get metrics"));
  }
});

app.get("/api/v1/metrics/:service", (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const windowMs = parseInt(req.query.window as string) || 300000;
    const metrics = metricsStore.getMetrics(service, windowMs);
    res.json(apiResponse(true, metrics));
  } catch (error) {
    logger.error("Failed to get service metrics", { error: String(error), service: req.params.service });
    res.status(500).json(apiResponse(false, undefined, "Failed to get service metrics"));
  }
});

// ============================================================================
// Alerts Endpoints
// ============================================================================

app.get("/api/v1/alerts", (req: Request, res: Response) => {
  try {
    const result = alertsQuerySchema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json(apiResponse(false, undefined, result.error.message));
    }

    const alerts = alertManager.getAlerts(result.data);
    res.json(apiResponse(true, {
      alerts,
      counts: alertManager.getAlertCounts(),
    }));
  } catch (error) {
    logger.error("Failed to get alerts", { error: String(error) });
    res.status(500).json(apiResponse(false, undefined, "Failed to get alerts"));
  }
});

app.post("/api/v1/alerts", (req: Request, res: Response) => {
  try {
    const result = createAlertSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json(apiResponse(false, undefined, result.error.message));
    }

    const alert = alertManager.createAlert(result.data);
    res.status(201).json(apiResponse(true, alert));
  } catch (error) {
    logger.error("Failed to create alert", { error: String(error) });
    res.status(500).json(apiResponse(false, undefined, "Failed to create alert"));
  }
});

app.patch("/api/v1/alerts/:id/acknowledge", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = alertManager.acknowledgeAlert(id);

    if (!alert) {
      return res.status(404).json(apiResponse(false, undefined, `Alert '${id}' not found`));
    }

    res.json(apiResponse(true, alert));
  } catch (error) {
    logger.error("Failed to acknowledge alert", { error: String(error), alertId: req.params.id });
    res.status(500).json(apiResponse(false, undefined, "Failed to acknowledge alert"));
  }
});

app.patch("/api/v1/alerts/:id/resolve", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = alertManager.resolveAlert(id);

    if (!alert) {
      return res.status(404).json(apiResponse(false, undefined, `Alert '${id}' not found`));
    }

    res.json(apiResponse(true, alert));
  } catch (error) {
    logger.error("Failed to resolve alert", { error: String(error), alertId: req.params.id });
    res.status(500).json(apiResponse(false, undefined, "Failed to resolve alert"));
  }
});

// ============================================================================
// Uptime Endpoints
// ============================================================================

app.get("/api/v1/uptime/:service", (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const days = parseInt(req.query.days as string) || 7;
    const stats = uptimeTracker.getUptimeStats(service, days);
    res.json(apiResponse(true, stats));
  } catch (error) {
    logger.error("Failed to get uptime stats", { error: String(error), service: req.params.service });
    res.status(500).json(apiResponse(false, undefined, "Failed to get uptime stats"));
  }
});

// ============================================================================
// Performance Endpoints
// ============================================================================

app.get("/api/v1/performance", (_req: Request, res: Response) => {
  try {
    const performance = performanceAnalyzer.getPerformanceMetrics();
    res.json(apiResponse(true, performance));
  } catch (error) {
    logger.error("Failed to get performance metrics", { error: String(error) });
    res.status(500).json(apiResponse(false, undefined, "Failed to get performance metrics"));
  }
});

// ============================================================================
// Service Registration & Integration
// ============================================================================

app.post("/api/v1/services/:service/heartbeat", (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const { status, responseTime, metadata } = req.body;

    // Record metrics
    metricsStore.recordRequest(service, status !== "unhealthy", responseTime || 0);

    // Record uptime
    uptimeTracker.recordStatus(service, status || "healthy", responseTime || 0);

    // Update health
    const serviceConfig = SUTAR_SERVICES.find((s) => s.name === service);
    if (serviceConfig) {
      healthMonitor.checkService({ ...serviceConfig, status: status || "healthy" });
    }

    res.json(apiResponse(true, { registered: true, service }));
  } catch (error) {
    logger.error("Failed to register heartbeat", { error: String(error), service: req.params.service });
    res.status(500).json(apiResponse(false, undefined, "Failed to register heartbeat"));
  }
});

app.post("/api/v1/services/:service/metrics", (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const { success, latency, errorType } = req.body;

    metricsStore.recordRequest(service, success !== false, latency || 0);

    if (errorType) {
      const alert = alertManager.createAlert({
        serviceName: service,
        severity: "warning",
        title: `Error in ${service}`,
        message: `Error type: ${errorType}`,
        metric: "error",
        currentValue: 1,
      });
      return res.json(apiResponse(true, { recorded: true, alert }));
    }

    res.json(apiResponse(true, { recorded: true }));
  } catch (error) {
    logger.error("Failed to record metrics", { error: String(error), service: req.params.service });
    res.status(500).json(apiResponse(false, undefined, "Failed to record metrics"));
  }
});

// ============================================================================
// Info Endpoint
// ============================================================================

app.get("/api/v1/info", (_req: Request, res: Response) => {
  res.json(
    apiResponse(true, {
      name: "sutar-monitoring",
      description: "SUTAR OS Monitoring Service - System health, metrics, and alerting",
      version: "1.0.0",
      features: [
        "Service health monitoring",
        "Metrics collection",
        "Alert generation",
        "Uptime tracking",
        "Performance metrics",
        "Error rate tracking",
        "Integration with all SUTAR services",
      ],
      environment: config.environment,
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
    })
  );
});

// ============================================================================
// Intent & Event Endpoints (for SUTAR OS integration)
// ============================================================================

app.post("/api/v1/intent", async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;
    logger.info(`[INTENT] ${type}`, { payload, requestId: req.headers["x-request-id"] });
    res.json(apiResponse(true, { intentId: uuidv4(), type, status: "received" }));
  } catch (error) {
    logger.error("Failed to process intent", { error: String(error) });
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

app.post("/api/v1/event", async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    logger.info(`[EVENT] ${type}`, { data, requestId: req.headers["x-request-id"] });
    res.json(apiResponse(true, { eventId: uuidv4(), type, status: "processed" }));
  } catch (error) {
    logger.error("Failed to process event", { error: String(error) });
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// 404 Handler
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, "Not found"));
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

const shutdown = () => {
  logger.info("Shutting down SUTAR Monitoring service...");
  healthMonitor.stopMonitoring();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ============================================================================
// Start Server
// ============================================================================

app.listen(config.port, () => {
  logger.info(`SUTAR-MONITORING running on port ${config.port}`, {
    environment: config.environment,
    logLevel: config.logLevel,
  });
});

export default app;
