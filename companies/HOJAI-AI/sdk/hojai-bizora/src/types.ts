/**
 * Bizora types — Reports Dashboard + Widgets.
 */

export const BIZORA_PORT = 4874;

export type WidgetKind = 'chart' | 'kpi' | 'table' | 'pie' | 'line' | 'bar' | 'heatmap' | 'text';

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  /** Widgets on this dashboard, in display order */
  widgetIds: string[];
  /** Who owns this dashboard */
  ownerId?: string;
  /** Whether this dashboard is publicly visible */
  public: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Widget {
  id: string;
  dashboardId: string;
  kind: WidgetKind;
  title: string;
  /** Data source reference (e.g. 'sales.last30days') */
  source?: string;
  /** Layout position */
  position: { x: number; y: number; w: number; h: number };
  /** Widget config (chart options, KPI label, etc.) */
  config: Record<string, unknown>;
  createdAt: string;
}

export interface Report {
  id: string;
  name: string;
  format: 'pdf' | 'csv' | 'xlsx' | 'json';
  /** Template used to generate */
  templateId?: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  /** URL to download (set when status=ready) */
  downloadUrl?: string;
  sizeBytes?: number;
  generatedAt?: string;
  createdAt: string;
}

export interface ReportRequest {
  name: string;
  templateId?: string;
  format: Report['format'];
  /** Parameters for the report template */
  parameters?: Record<string, unknown>;
  /** Optional dashboard to snapshot */
  dashboardId?: string;
}

export interface WidgetData {
  widgetId: string;
  /** Time series, aggregates, tabular — depends on widget kind */
  rows: Array<Record<string, unknown>>;
  /** Optional pre-aggregated totals for KPI widgets */
  totals?: Record<string, number>;
  generatedAt: string;
}
