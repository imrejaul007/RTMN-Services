/**
 * Hojai Analytics Platform
 *
 * PORT: 4610
 *
 * Purpose:
 * - Business Intelligence dashboards
 * - What-if analytics
 * - ML model monitoring
 * - Report generation
 * - Real-time metrics
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { tenantMiddleware } from '../../shared/middleware/tenant';
import { createLogger } from '../../shared/utils/logger';
import { createResponse, createErrorResponse } from '../../shared/types';

const logger = createLogger('hojai-analytics');

// ============================================
// ANALYTICS TYPES
// ============================================

/**
 * Dashboard types
 */
export interface Dashboard {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: DashboardType;
  config: DashboardConfig;
  widgets: Widget[];
  filters: DashboardFilter[];
  refresh_interval_seconds: number;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type DashboardType = 'revenue' | 'customers' | 'operations' | 'custom' | 'executive';

export interface DashboardConfig {
  layout: 'grid' | 'freeform';
  theme?: 'light' | 'dark';
  date_range_default: string;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: WidgetConfig;
}

export type WidgetType =
  | 'metric'
  | 'chart'
  | 'table'
  | 'funnel'
  | 'heatmap'
  | 'map'
  | 'gauge';

export interface WidgetConfig {
  metric_id?: string;
  chart_type?: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  data_source?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  group_by?: string;
  time_range?: string;
  filters?: Record<string, any>;
}

export interface DashboardFilter {
  field: string;
  type: 'select' | 'date_range' | 'search';
  label: string;
  options?: { value: string; label: string }[];
}

/**
 * Report types
 */
export interface Report {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: ReportType;
  config: ReportConfig;
  schedule?: ReportSchedule;
  last_run_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ReportType = 'pdf' | 'csv' | 'excel' | 'scheduled';

export interface ReportConfig {
  metrics: string[];
  dimensions: string[];
  filters: Record<string, any>;
  sort_by?: string;
  limit?: number;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  recipients: string[];
  format: 'pdf' | 'csv';
}

export interface ReportRun {
  id: string;
  report_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  download_url?: string;
  error?: string;
}

/**
 * Metric types
 */
export interface Metric {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: MetricType;
  unit?: string;
  format: 'number' | 'currency' | 'percentage' | 'duration';
  value: number;
  previous_value?: number;
  change_percent?: number;
  period: string;
  updated_at: string;
}

export type MetricType = 'revenue' | 'orders' | 'customers' | 'conversion' | 'engagement' | 'custom';

/**
 * ML Observability types
 */
export interface ModelMonitor {
  id: string;
  tenant_id: string;
  model_name: string;
  model_type: string;
  status: ModelStatus;
  metrics: ModelMetrics;
  alerts: ModelAlert[];
  last_check: string;
}

export type ModelStatus = 'healthy' | 'degraded' | 'drifting' | 'failing';

export interface ModelMetrics {
  accuracy?: number;
  latency_p99_ms?: number;
  error_rate?: number;
  prediction_count: number;
  data_drift_score?: number;
  concept_drift_score?: number;
}

export interface ModelAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  triggered_at: string;
  resolved_at?: string;
}

/**
 * Cohort types
 */
export interface Cohort {
  id: string;
  tenant_id: string;
  name: string;
  definition: CohortDefinition;
  size: number;
  created_at: string;
}

export interface CohortDefinition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | 'between';
  value: number;
  time_range: string;
}

// ============================================
// DASHBOARD ENGINE
// ============================================

class DashboardEngine {
  private dashboards: Map<string, Dashboard> = new Map();
  private metrics: Map<string, Metric> = new Map();

  /**
   * Create dashboard
   */
  async create(
    tenantId: string,
    createdBy: string,
    data: { name: string; type: DashboardType; widgets?: Widget[] }
  ): Promise<Dashboard> {
    const now = new Date().toISOString();
    const dashboard: Dashboard = {
      id: `dash_${Date.now()}`,
      tenant_id: tenantId,
      name: data.name,
      type: data.type,
      config: {
        layout: 'grid',
        date_range_default: '30d',
      },
      widgets: data.widgets || [],
      filters: [],
      refresh_interval_seconds: 300,
      is_public: false,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    };

    this.dashboards.set(dashboard.id, dashboard);
    logger.info('dashboard_created', { dashboardId: dashboard.id, tenantId });

    return dashboard;
  }

  /**
   * Get dashboard
   */
  async get(tenantId: string, dashboardId: string): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard || dashboard.tenant_id !== tenantId) return null;
    return dashboard;
  }

  /**
   * List dashboards
   */
  async list(tenantId: string): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values())
      .filter(d => d.tenant_id === tenantId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(
    tenantId: string,
    dashboardId: string,
    widget: Widget
  ): Promise<Dashboard | null> {
    const dashboard = await this.get(tenantId, dashboardId);
    if (!dashboard) return null;

    dashboard.widgets.push(widget);
    dashboard.updated_at = new Date().toISOString();
    this.dashboards.set(dashboardId, dashboard);

    return dashboard;
  }

  /**
   * Refresh dashboard data
   */
  async refresh(tenantId: string, dashboardId: string): Promise<Record<string, any>> {
    const dashboard = await this.get(tenantId, dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    // Generate mock data for widgets
    const data: Record<string, any> = {};
    for (const widget of dashboard.widgets) {
      data[widget.id] = this.generateWidgetData(widget);
    }

    return data;
  }

  private generateWidgetData(widget: Widget): any {
    switch (widget.type) {
      case 'metric':
        return {
          value: Math.floor(Math.random() * 100000),
          change: Math.floor(Math.random() * 20) - 10,
          trend: 'up',
        };

      case 'chart':
        return {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Revenue',
            data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 50000)),
          }],
        };

      case 'table':
        return {
          columns: ['Product', 'Sales', 'Growth'],
          rows: [
            ['Product A', '₹45,000', '+12%'],
            ['Product B', '₹32,000', '+8%'],
            ['Product C', '₹28,000', '-3%'],
          ],
        };

      default:
        return {};
    }
  }
}

// ============================================
// REPORT ENGINE
// ============================================

class ReportEngine {
  private reports: Map<string, Report> = new Map();
  private runs: Map<string, ReportRun> = new Map();

  /**
   * Create report
   */
  async create(
    tenantId: string,
    createdBy: string,
    data: { name: string; metrics: string[]; dimensions: string[] }
  ): Promise<Report> {
    const now = new Date().toISOString();
    const report: Report = {
      id: `report_${Date.now()}`,
      tenant_id: tenantId,
      name: data.name,
      type: 'pdf',
      config: {
        metrics: data.metrics,
        dimensions: data.dimensions,
        filters: {},
      },
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    };

    this.reports.set(report.id, report);
    logger.info('report_created', { reportId: report.id, tenantId });

    return report;
  }

  /**
   * Run report
   */
  async run(tenantId: string, reportId: string): Promise<ReportRun> {
    const report = this.reports.get(reportId);
    if (!report || report.tenant_id !== tenantId) {
      throw new Error('Report not found');
    }

    const run: ReportRun = {
      id: `run_${Date.now()}`,
      report_id: reportId,
      status: 'running',
      started_at: new Date().toISOString(),
    };

    this.runs.set(run.id, run);

    // Simulate report generation
    setTimeout(() => {
      run.status = 'completed';
      run.completed_at = new Date().toISOString();
      run.download_url = `/reports/${run.id}.pdf`;
      report.last_run_at = run.started_at;
    }, 2000);

    return run;
  }

  /**
   * Get run status
   */
  async getRun(tenantId: string, runId: string): Promise<ReportRun | null> {
    const run = this.runs.get(runId);
    return run || null;
  }
}

// ============================================
// METRICS ENGINE
// ============================================

class MetricsEngine {
  private metrics: Map<string, Metric> = new Map();
  private timeseries: Map<string, TimeSeriesPoint[]> = new Map();

  /**
   * Record metric
   */
  async record(
    tenantId: string,
    name: string,
    value: number,
    type: MetricType,
    unit?: string
  ): Promise<Metric> {
    const now = new Date().toISOString();
    const id = `metric_${tenantId}_${name}`;

    const existing = this.metrics.get(id);
    const previousValue = existing?.value;
    const change = previousValue
      ? ((value - previousValue) / previousValue) * 100
      : 0;

    const metric: Metric = {
      id,
      tenant_id: tenantId,
      name,
      type,
      format: unit === '₹' ? 'currency' : 'number',
      value,
      previous_value: previousValue,
      change_percent: Math.round(change * 10) / 10,
      period: '7d',
      updated_at: now,
    };

    this.metrics.set(id, metric);

    // Add to timeseries
    const series = this.timeseries.get(id) || [];
    series.push({ timestamp: now, value });
    if (series.length > 1000) series.shift();
    this.timeseries.set(id, series);

    return metric;
  }

  /**
   * Get current metrics
   */
  async getCurrent(tenantId: string): Promise<Metric[]> {
    return Array.from(this.metrics.values())
      .filter(m => m.tenant_id === tenantId);
  }

  /**
   * Get timeseries data
   */
  async getTimeseries(
    tenantId: string,
    metricName: string,
    timeRange: string = '7d'
  ): Promise<{ labels: string[]; data: number[] }> {
    const id = `metric_${tenantId}_${metricName}`;
    const series = this.timeseries.get(id) || [];

    const labels = series.map(p => new Date(p.timestamp).toLocaleDateString());
    const data = series.map(p => p.value);

    return { labels, data };
  }
}

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

// ============================================
// ML OBSERVABILITY ENGINE
// ============================================

class MLObservabilityEngine {
  private models: Map<string, ModelMonitor> = new Map();

  /**
   * Register model
   */
  async register(
    tenantId: string,
    modelName: string,
    modelType: string
  ): Promise<ModelMonitor> {
    const monitor: ModelMonitor = {
      id: `model_${Date.now()}`,
      tenant_id: tenantId,
      model_name: modelName,
      model_type: modelType,
      status: 'healthy',
      metrics: {
        accuracy: 0.95 + Math.random() * 0.04,
        latency_p99_ms: 50 + Math.random() * 100,
        error_rate: Math.random() * 0.02,
        prediction_count: Math.floor(Math.random() * 10000),
        data_drift_score: Math.random() * 0.1,
        concept_drift_score: Math.random() * 0.1,
      },
      alerts: [],
      last_check: new Date().toISOString(),
    };

    this.models.set(monitor.id, monitor);
    logger.info('model_registered', { modelId: monitor.id, tenantId });

    return monitor;
  }

  /**
   * Get model health
   */
  async getHealth(tenantId: string, modelId: string): Promise<ModelMonitor | null> {
    const model = this.models.get(modelId);
    if (!model || model.tenant_id !== tenantId) return null;

    // Check health
    if (model.metrics.data_drift_score > 0.15) {
      model.status = 'drifting';
      model.alerts.push({
        id: `alert_${Date.now()}`,
        severity: 'warning',
        message: 'Data drift detected',
        triggered_at: new Date().toISOString(),
      });
    }

    if (model.metrics.error_rate > 0.05) {
      model.status = 'degraded';
    }

    model.last_check = new Date().toISOString();
    return model;
  }

  /**
   * List models
   */
  async listModels(tenantId: string): Promise<ModelMonitor[]> {
    return Array.from(this.models.values())
      .filter(m => m.tenant_id === tenantId);
  }
}

// ============================================
// MAIN PLATFORM
// ============================================

export class HojaiAnalyticsPlatform {
  private dashboardEngine: DashboardEngine;
  private reportEngine: ReportEngine;
  private metricsEngine: MetricsEngine;
  private mlEngine: MLObservabilityEngine;

  constructor() {
    this.dashboardEngine = new DashboardEngine();
    this.reportEngine = new ReportEngine();
    this.metricsEngine = new MetricsEngine();
    this.mlEngine = new MLObservabilityEngine();
  }

  // Dashboards
  async createDashboard(tenantId: string, createdBy: string, data: any) {
    return this.dashboardEngine.create(tenantId, createdBy, data);
  }

  async getDashboard(tenantId: string, dashboardId: string) {
    return this.dashboardEngine.get(tenantId, dashboardId);
  }

  async listDashboards(tenantId: string) {
    return this.dashboardEngine.list(tenantId);
  }

  async refreshDashboard(tenantId: string, dashboardId: string) {
    return this.dashboardEngine.refresh(tenantId, dashboardId);
  }

  // Reports
  async createReport(tenantId: string, createdBy: string, data: any) {
    return this.reportEngine.create(tenantId, createdBy, data);
  }

  async runReport(tenantId: string, reportId: string) {
    return this.reportEngine.run(tenantId, reportId);
  }

  async getReportRun(tenantId: string, runId: string) {
    return this.reportEngine.getRun(tenantId, runId);
  }

  // Metrics
  async recordMetric(
    tenantId: string,
    name: string,
    value: number,
    type: MetricType
  ) {
    return this.metricsEngine.record(tenantId, name, value, type);
  }

  async getMetrics(tenantId: string) {
    return this.metricsEngine.getCurrent(tenantId);
  }

  async getMetricTimeseries(
    tenantId: string,
    metricName: string,
    timeRange?: string
  ) {
    return this.metricsEngine.getTimeseries(tenantId, metricName, timeRange);
  }

  // ML Observability
  async registerModel(
    tenantId: string,
    modelName: string,
    modelType: string
  ) {
    return this.mlEngine.register(tenantId, modelName, modelType);
  }

  async getModelHealth(tenantId: string, modelId: string) {
    return this.mlEngine.getHealth(tenantId, modelId);
  }

  async listModels(tenantId: string) {
    return this.mlEngine.listModels(tenantId);
  }
}

// ============================================
// EXPRESS ROUTES
// ============================================

export function createAnalyticsRoutes(platform: HojaiAnalyticsPlatform) {
  const router = express.Router();

  // ========== DASHBOARDS ==========

  router.post('/dashboards', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const dashboard = await platform.createDashboard(tenantId, req.body.user_id || 'system', req.body);
      res.json(createResponse(dashboard, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('CREATE_ERROR', error.message));
    }
  });

  router.get('/dashboards', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const dashboards = await platform.listDashboards(tenantId);
      res.json(createResponse(dashboards, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('LIST_ERROR', error.message));
    }
  });

  router.get('/dashboards/:id', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const dashboard = await platform.getDashboard(tenantId, req.params.id);
      if (!dashboard) {
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Dashboard not found'));
      }
      res.json(createResponse(dashboard, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('GET_ERROR', error.message));
    }
  });

  router.get('/dashboards/:id/data', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const data = await platform.refreshDashboard(tenantId, req.params.id);
      res.json(createResponse(data, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('REFRESH_ERROR', error.message));
    }
  });

  // ========== REPORTS ==========

  router.post('/reports', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const report = await platform.createReport(tenantId, req.body.user_id || 'system', req.body);
      res.json(createResponse(report, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('CREATE_ERROR', error.message));
    }
  });

  router.post('/reports/:id/run', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const run = await platform.runReport(tenantId, req.params.id);
      res.json(createResponse(run, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('RUN_ERROR', error.message));
    }
  });

  router.get('/reports/runs/:runId', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const run = await platform.getReportRun(tenantId, req.params.runId);
      if (!run) {
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Run not found'));
      }
      res.json(createResponse(run, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('GET_ERROR', error.message));
    }
  });

  // ========== METRICS ==========

  router.post('/metrics', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { name, value, type } = req.body;
      const metric = await platform.recordMetric(tenantId, name, value, type);
      res.json(createResponse(metric, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('RECORD_ERROR', error.message));
    }
  });

  router.get('/metrics', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const metrics = await platform.getMetrics(tenantId);
      res.json(createResponse(metrics, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('LIST_ERROR', error.message));
    }
  });

  router.get('/metrics/:name/timeseries', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { time_range } = req.query;
      const timeseries = await platform.getMetricTimeseries(
        tenantId,
        req.params.name,
        time_range as string
      );
      res.json(createResponse(timeseries, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('GET_ERROR', error.message));
    }
  });

  // ========== ML OBSERVABILITY ==========

  router.post('/ml/models', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { model_name, model_type } = req.body;
      const model = await platform.registerModel(tenantId, model_name, model_type);
      res.json(createResponse(model, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('REGISTER_ERROR', error.message));
    }
  });

  router.get('/ml/models', tenantMiddleware(), async (req: Request, res: Response) {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const models = await platform.listModels(tenantId);
      res.json(createResponse(models, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('LIST_ERROR', error.message));
    }
  });

  router.get('/ml/models/:id/health', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const health = await platform.getModelHealth(tenantId, req.params.id);
      if (!health) {
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Model not found'));
      }
      res.json(createResponse(health, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('GET_ERROR', error.message));
    }
  });

  return router;
}

// ============================================
// BOOTSTRAP
// ============================================

export async function bootstrap(port = 4610) {
  const platform = new HojaiAnalyticsPlatform();
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
  app.use(express.json({ limit: "10kb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'hojai-analytics',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/analytics', createAnalyticsRoutes(platform));

  app.listen(port, () => {
    logger.info('hojai_analytics_platform_started', { port });
  });

  return { platform, app };
}

export default { HojaiAnalyticsPlatform, createAnalyticsRoutes, bootstrap };
