import { v4 as uuidv4 } from 'uuid';

export interface DashboardConfig {
  refreshInterval?: number;  // milliseconds
  theme?: 'light' | 'dark';
  layout?: 'grid' | 'freeform';
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  industry?: string;
  widgets: string[];
  config: DashboardConfig;
  filters: DashboardFilter[];
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  tags: string[];
}

export interface DashboardFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: string | number | string[] | number[];
}

interface CreateDashboardInput {
  name: string;
  description?: string;
  ownerId: string;
  industry?: string;
  config?: DashboardConfig;
  filters?: DashboardFilter[];
  isPublic?: boolean;
  tags?: string[];
}

interface UpdateDashboardInput {
  name?: string;
  description?: string;
  config?: DashboardConfig;
  filters?: DashboardFilter[];
  isPublic?: boolean;
  tags?: string[];
}

class DashboardModel {
  private static store: Map<string, Dashboard> = new Map();
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;

    // Create sample dashboards
    const sampleDashboards: Dashboard[] = [
      {
        id: uuidv4(),
        name: 'Operations Overview',
        description: 'Real-time operations metrics across all industries',
        ownerId: 'system',
        industry: 'general',
        widgets: [],
        config: {
          refreshInterval: 30000,
          theme: 'dark',
          layout: 'grid'
        },
        filters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: true,
        tags: ['operations', 'realtime', 'overview']
      },
      {
        id: uuidv4(),
        name: 'Restaurant Performance',
        description: 'Analytics for restaurant industry',
        ownerId: 'system',
        industry: 'restaurant',
        widgets: [],
        config: {
          refreshInterval: 60000,
          theme: 'light',
          layout: 'grid'
        },
        filters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: true,
        tags: ['restaurant', 'performance', 'food']
      },
      {
        id: uuidv4(),
        name: 'Hotel Revenue Dashboard',
        description: 'Revenue and occupancy analytics',
        ownerId: 'system',
        industry: 'hotel',
        widgets: [],
        config: {
          refreshInterval: 300000,
          theme: 'dark',
          layout: 'grid'
        },
        filters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: true,
        tags: ['hotel', 'revenue', 'occupancy']
      }
    ];

    sampleDashboards.forEach(d => this.store.set(d.id, d));
    this.initialized = true;
  }

  static create(input: CreateDashboardInput): Dashboard {
    const now = new Date().toISOString();
    const dashboard: Dashboard = {
      id: uuidv4(),
      name: input.name,
      description: input.description || '',
      ownerId: input.ownerId,
      industry: input.industry,
      widgets: [],
      config: input.config || {
        refreshInterval: 60000,
        theme: 'light',
        layout: 'grid'
      },
      filters: input.filters || [],
      createdAt: now,
      updatedAt: now,
      isPublic: input.isPublic || false,
      tags: input.tags || []
    };

    this.store.set(dashboard.id, dashboard);
    return dashboard;
  }

  static getById(id: string): Dashboard | undefined {
    return this.store.get(id);
  }

  static getAll(): Dashboard[] {
    return Array.from(this.store.values());
  }

  static getByOwner(ownerId: string): Dashboard[] {
    return Array.from(this.store.values()).filter(d => d.ownerId === ownerId);
  }

  static getByIndustry(industry: string): Dashboard[] {
    return Array.from(this.store.values()).filter(d => d.industry === industry);
  }

  static update(id: string, input: UpdateDashboardInput): Dashboard | undefined {
    const dashboard = this.store.get(id);
    if (!dashboard) return undefined;

    const updated: Dashboard = {
      ...dashboard,
      name: input.name ?? dashboard.name,
      description: input.description ?? dashboard.description,
      config: input.config ?? dashboard.config,
      filters: input.filters ?? dashboard.filters,
      isPublic: input.isPublic ?? dashboard.isPublic,
      tags: input.tags ?? dashboard.tags,
      updatedAt: new Date().toISOString()
    };

    this.store.set(id, updated);
    return updated;
  }

  static addWidget(dashboardId: string, widgetId: string): Dashboard | undefined {
    const dashboard = this.store.get(dashboardId);
    if (!dashboard) return undefined;

    const updated: Dashboard = {
      ...dashboard,
      widgets: [...new Set([...dashboard.widgets, widgetId])],
      updatedAt: new Date().toISOString()
    };

    this.store.set(dashboardId, updated);
    return updated;
  }

  static removeWidget(dashboardId: string, widgetId: string): Dashboard | undefined {
    const dashboard = this.store.get(dashboardId);
    if (!dashboard) return undefined;

    const updated: Dashboard = {
      ...dashboard,
      widgets: dashboard.widgets.filter(w => w !== widgetId),
      updatedAt: new Date().toISOString()
    };

    this.store.set(dashboardId, updated);
    return updated;
  }

  static delete(id: string): boolean {
    return this.store.delete(id);
  }
}

export const Dashboard = DashboardModel;
