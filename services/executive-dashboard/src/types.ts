import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

export enum MetricCategory {
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  PRODUCT = 'product',
  MARKET = 'market',
}

export enum RiskLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum RiskStatus {
  OPEN = 'open',
  MITIGATED = 'mitigated',
  MONITORING = 'monitoring',
  CLOSED = 'closed',
}

export enum OpportunityStatus {
  IDENTIFIED = 'identified',
  EVALUATING = 'evaluating',
  APPROVED = 'approved',
  IMPLEMENTING = 'implementing',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

export enum WidgetType {
  KPI_CARD = 'kpi_card',
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  TABLE = 'table',
  GAUGE = 'gauge',
  HEATMAP = 'heatmap',
  SCORE_CARD = 'score_card',
  TREND_INDICATOR = 'trend_indicator',
  ALERT_LIST = 'alert_list',
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

// ============================================================================
// Base Interfaces
// ============================================================================

export interface TenantContext {
  tenantId: string;
  userId?: string;
  roles?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimeRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardConfig {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  widgets: string[];
  layout: DashboardLayout;
  filters: DashboardFilter[];
  refreshInterval: number; // milliseconds
  isDefault: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  columns: number;
  rows: WidgetPosition[];
}

export interface WidgetPosition {
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
}

export interface DashboardFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: string | number | boolean;
  label: string;
}

// ============================================================================
// Widget Types
// ============================================================================

export interface WidgetConfig {
  id: string;
  tenantId: string;
  dashboardId?: string;
  name: string;
  type: WidgetType;
  title?: string;
  description?: string;
  dataSource: WidgetDataSource;
  visualization: WidgetVisualization;
  refreshInterval: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetDataSource {
  type: 'metric' | 'query' | 'external';
  metricType?: string;
  query?: Record<string, unknown>;
  endpoint?: string;
  parameters?: Record<string, string>;
}

export interface WidgetVisualization {
  showTitle: boolean;
  showLegend: boolean;
  showLabels: boolean;
  colorScheme?: string[];
  thresholds?: VisualizationThreshold[];
}

export interface VisualizationThreshold {
  value: number;
  color: string;
  label?: string;
}

// ============================================================================
// Metric Types
// ============================================================================

export interface Metric {
  id: string;
  tenantId: string;
  name: string;
  category: MetricCategory;
  value: number;
  previousValue?: number;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  changePercent?: number;
  target?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
  calculatedAt: Date;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface HealthScore {
  overall: number;
  components: {
    name: string;
    score: number;
    weight: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  calculatedAt: Date;
  previousOverall?: number;
}

export interface SLACompliance {
  id: string;
  tenantId: string;
  slaName: string;
  target: number;
  actual: number;
  breached: boolean;
  incidents: number;
  uptime: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  period: TimeRange;
}

// ============================================================================
// Risk Types
// ============================================================================

export interface Risk {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  category: string;
  level: RiskLevel;
  status: RiskStatus;
  likelihood: number; // 1-10
  impact: number; // 1-10
  score: number; // likelihood * impact
  owner?: string;
  mitigationPlan?: string;
  contingencies?: string;
  identifiedAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  tags?: string[];
}

export interface RiskAssessment {
  totalRisks: number;
  byLevel: Record<RiskLevel, number>;
  byStatus: Record<RiskStatus, number>;
  topRisks: Risk[];
  riskTrend: TrendData;
  mitigationProgress: number;
}

// ============================================================================
// Opportunity Types
// ============================================================================

export interface Opportunity {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  type: string;
  category: string;
  status: OpportunityStatus;
  estimatedValue?: number;
  probability: number; // 0-100
  effort?: number; // estimated effort in hours
  timeline?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  identifiedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  tags?: string[];
}

export interface OpportunityAssessment {
  totalOpportunities: number;
  pipelineValue: number;
  byStatus: Record<OpportunityStatus, number>;
  topOpportunities: Opportunity[];
  byCategory: Record<string, number>;
  expectedROI: number;
  conversionRate: number;
}

// ============================================================================
// Insight Types
// ============================================================================

export interface Insight {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'warning' | 'achievement';
  category: MetricCategory;
  severity: AlertSeverity;
  data: Record<string, unknown>;
  recommendations?: string[];
  sources: string[];
  generatedAt: Date;
  expiresAt?: Date;
  viewed: boolean;
  actionTaken?: string;
}

export interface InsightSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<AlertSeverity, number>;
  unread: number;
  recentInsights: Insight[];
}

// ============================================================================
// Alert Types
// ============================================================================

export interface Alert {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  category: string;
  metricId?: string;
  threshold?: {
    configured: number;
    actual: number;
  };
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertSummary {
  total: number;
  active: number;
  bySeverity: Record<AlertSeverity, number>;
  criticalAlerts: Alert[];
}

// ============================================================================
// Team Performance Types
// ============================================================================

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department?: string;
  email: string;
  avatar?: string;
  performanceScore?: number;
  metrics?: Record<string, number>;
}

export interface TeamPerformance {
  totalMembers: number;
  averagePerformance: number;
  topPerformers: TeamMember[];
  underperformers: TeamMember[];
  byDepartment: {
    name: string;
    count: number;
    avgPerformance: number;
  }[];
  trends: {
    period: TimeRange;
    performance: number;
  }[];
}

// ============================================================================
// Product Performance Types
// ============================================================================

export interface ProductPerformance {
  totalProducts: number;
  topProducts: ProductMetric[];
  underperformers: ProductMetric[];
  byCategory: {
    name: string;
    count: number;
    revenue: number;
    growth: number;
  }[];
}

export interface ProductMetric {
  id: string;
  name: string;
  category?: string;
  revenue: number;
  unitsSold: number;
  margin: number;
  growth: number;
  rating?: number;
}

// ============================================================================
// Financial Metrics Types
// ============================================================================

export interface FinancialMetrics {
  revenue: {
    total: number;
    growth: number;
    target: number;
    achieved: number;
  };
  costs: {
    total: number;
    breakdown: Record<string, number>;
    trend: 'up' | 'down' | 'stable';
  };
  profit: {
    gross: number;
    net: number;
    margin: number;
  };
  cashFlow: {
    operating: number;
    investing: number;
    financing: number;
    net: number;
  };
  burnRate?: number;
  runway?: number;
  period: TimeRange;
}

// ============================================================================
// Trend Types
// ============================================================================

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  velocity: number; // rate of change
  confidence: number; // 0-100
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface ForecastResult {
  metricId: string;
  predictions: {
    timestamp: Date;
    value: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
  }[];
  model: string;
  accuracy: number;
  generatedAt: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateDashboardRequest {
  name: string;
  description?: string;
  widgets?: string[];
  layout?: DashboardLayout;
  filters?: DashboardFilter[];
  refreshInterval?: number;
  isDefault?: boolean;
  isPublic?: boolean;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  widgets?: string[];
  layout?: DashboardLayout;
  filters?: DashboardFilter[];
  refreshInterval?: number;
  isDefault?: boolean;
  isPublic?: boolean;
}

export interface CreateWidgetRequest {
  name: string;
  type: WidgetType;
  title?: string;
  description?: string;
  dataSource: WidgetDataSource;
  visualization?: WidgetVisualization;
  refreshInterval?: number;
  position?: WidgetConfig['position'];
}

export interface CreateAlertRequest {
  title: string;
  message: string;
  severity: AlertSeverity;
  source: string;
  category: string;
  metricId?: string;
  threshold?: Alert['threshold'];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const CreateDashboardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  widgets: z.array(z.string()).optional(),
  layout: z.object({
    columns: z.number().min(1).max(12),
    rows: z.array(z.object({
      widgetId: z.string(),
      x: z.number().min(0),
      y: z.number().min(0),
      width: z.number().min(1),
      height: z.number().min(1),
      order: z.number().min(0),
    })),
  }).optional(),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains']),
    value: z.union([z.string(), z.number(), z.boolean()]),
    label: z.string(),
  })).optional(),
  refreshInterval: z.number().min(1000).max(3600000).optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

export const CreateWidgetSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(WidgetType),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  dataSource: z.object({
    type: z.enum(['metric', 'query', 'external']),
    metricType: z.string().optional(),
    query: z.record(z.unknown()).optional(),
    endpoint: z.string().optional(),
    parameters: z.record(z.string()).optional(),
  }),
  visualization: z.object({
    showTitle: z.boolean().optional(),
    showLegend: z.boolean().optional(),
    showLabels: z.boolean().optional(),
    colorScheme: z.array(z.string()).optional(),
    thresholds: z.array(z.object({
      value: z.number(),
      color: z.string(),
      label: z.string().optional(),
    })).optional(),
  }).optional(),
  refreshInterval: z.number().min(1000).max(3600000).optional(),
  position: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().min(1).max(12),
    height: z.number().min(1).max(12),
  }).optional(),
});

export const CreateAlertSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  severity: z.nativeEnum(AlertSeverity),
  source: z.string().min(1),
  category: z.string().min(1),
  metricId: z.string().optional(),
  threshold: z.object({
    configured: z.number(),
    actual: z.number(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Export Types for API Responses
// ============================================================================

export type {
  TenantContext,
  PaginationParams,
  PaginatedResult,
  TimeRange,
  DashboardConfig,
  DashboardLayout,
  WidgetPosition,
  DashboardFilter,
  WidgetConfig,
  WidgetDataSource,
  WidgetVisualization,
  VisualizationThreshold,
  Metric,
  MetricDataPoint,
  HealthScore,
  SLACompliance,
  Risk,
  RiskAssessment,
  Opportunity,
  OpportunityAssessment,
  Insight,
  InsightSummary,
  Alert,
  AlertSummary,
  TeamMember,
  TeamPerformance,
  ProductPerformance,
  ProductMetric,
  FinancialMetrics,
  TrendData,
  TimeSeriesPoint,
  ForecastResult,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  CreateWidgetRequest,
  CreateAlertRequest,
};
