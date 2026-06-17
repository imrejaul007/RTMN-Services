import { v4 as uuidv4 } from 'uuid';

export type WidgetType =
  | 'kpi'
  | 'line-chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'area-chart'
  | 'scatter-chart'
  | 'heatmap'
  | 'table'
  | 'gauge'
  | 'funnel'
  | 'donut'
  | 'metric';

export interface WidgetDataSource {
  type: 'api' | 'static' | 'computed';
  endpoint?: string;
  refreshInterval?: number;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  groupBy?: string;
  dateField?: string;
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  customDateRange?: { start: string; end: string };
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetStyle {
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
}

export interface Widget {
  id: string;
  dashboardId: string;
  name: string;
  description?: string;
  type: WidgetType;
  dataSource: WidgetDataSource;
  position: WidgetPosition;
  style: WidgetStyle;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface CreateWidgetInput {
  dashboardId: string;
  name: string;
  description?: string;
  type: WidgetType;
  dataSource?: Partial<WidgetDataSource>;
  position?: Partial<WidgetPosition>;
  style?: Partial<WidgetStyle>;
  config?: Record<string, any>;
}

interface UpdateWidgetInput {
  name?: string;
  description?: string;
  type?: WidgetType;
  dataSource?: Partial<WidgetDataSource>;
  position?: Partial<WidgetPosition>;
  style?: Partial<WidgetStyle>;
  config?: Record<string, any>;
}

class WidgetModel {
  private static store: Map<string, Widget> = new Map();
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;

    // Create sample widgets
    const sampleWidgets: Widget[] = [
      {
        id: uuidv4(),
        dashboardId: '',
        name: 'Total Revenue',
        description: 'Total revenue across all industries',
        type: 'kpi',
        dataSource: {
          type: 'computed',
          aggregation: 'sum',
          dateRange: 'month'
        },
        position: { x: 0, y: 0, w: 3, h: 2 },
        style: { color: '#10b981', backgroundColor: '#1f2937' },
        config: { prefix: '$', suffix: '' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        dashboardId: '',
        name: 'Orders Trend',
        description: 'Orders over time',
        type: 'line-chart',
        dataSource: {
          type: 'api',
          endpoint: '/api/orders/trend',
          dateRange: 'week'
        },
        position: { x: 3, y: 0, w: 6, h: 4 },
        style: {},
        config: { showLegend: true, showGrid: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        dashboardId: '',
        name: 'Industry Distribution',
        description: 'Revenue by industry',
        type: 'pie-chart',
        dataSource: {
          type: 'computed',
          aggregation: 'sum',
          groupBy: 'industry'
        },
        position: { x: 9, y: 0, w: 3, h: 4 },
        style: {},
        config: { showLegend: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        dashboardId: '',
        name: 'Top Products',
        description: 'Best performing products',
        type: 'bar-chart',
        dataSource: {
          type: 'api',
          endpoint: '/api/products/top',
          aggregation: 'count'
        },
        position: { x: 0, y: 4, w: 6, h: 4 },
        style: {},
        config: { limit: 10, showValues: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        dashboardId: '',
        name: 'Customer Satisfaction',
        description: 'Average rating by service',
        type: 'gauge',
        dataSource: {
          type: 'computed',
          aggregation: 'avg'
        },
        position: { x: 6, y: 4, w: 3, h: 2 },
        style: { color: '#f59e0b' },
        config: { min: 0, max: 5, unit: 'stars' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    sampleWidgets.forEach(w => this.store.set(w.id, w));
    this.initialized = true;
  }

  static create(input: CreateWidgetInput): Widget {
    const now = new Date().toISOString();
    const widget: Widget = {
      id: uuidv4(),
      dashboardId: input.dashboardId,
      name: input.name,
      description: input.description,
      type: input.type,
      dataSource: {
        type: input.dataSource?.type || 'static',
        endpoint: input.dataSource?.endpoint,
        refreshInterval: input.dataSource?.refreshInterval || 60000,
        aggregation: input.dataSource?.aggregation,
        groupBy: input.dataSource?.groupBy,
        dateField: input.dataSource?.dateField || 'createdAt',
        dateRange: input.dataSource?.dateRange || 'month'
      },
      position: {
        x: input.position?.x ?? 0,
        y: input.position?.y ?? 0,
        w: input.position?.w ?? 4,
        h: input.position?.h ?? 3
      },
      style: input.style || {},
      config: input.config || {},
      createdAt: now,
      updatedAt: now
    };

    this.store.set(widget.id, widget);
    return widget;
  }

  static getById(id: string): Widget | undefined {
    return this.store.get(id);
  }

  static getAll(): Widget[] {
    return Array.from(this.store.values());
  }

  static getByDashboard(dashboardId: string): Widget[] {
    return Array.from(this.store.values()).filter(w => w.dashboardId === dashboardId);
  }

  static getByType(type: WidgetType): Widget[] {
    return Array.from(this.store.values()).filter(w => w.type === type);
  }

  static update(id: string, input: UpdateWidgetInput): Widget | undefined {
    const widget = this.store.get(id);
    if (!widget) return undefined;

    const updated: Widget = {
      ...widget,
      name: input.name ?? widget.name,
      description: input.description ?? widget.description,
      type: input.type ?? widget.type,
      dataSource: input.dataSource ? { ...widget.dataSource, ...input.dataSource } : widget.dataSource,
      position: input.position ? { ...widget.position, ...input.position } : widget.position,
      style: input.style ? { ...widget.style, ...input.style } : widget.style,
      config: input.config ?? widget.config,
      updatedAt: new Date().toISOString()
    };

    this.store.set(id, updated);
    return updated;
  }

  static updatePosition(id: string, position: Partial<WidgetPosition>): Widget | undefined {
    return this.update(id, { position });
  }

  static delete(id: string): boolean {
    return this.store.delete(id);
  }

  static deleteByDashboard(dashboardId: string): number {
    const widgets = this.getByDashboard(dashboardId);
    widgets.forEach(w => this.store.delete(w.id));
    return widgets.length;
  }
}

export const Widget = WidgetModel;
