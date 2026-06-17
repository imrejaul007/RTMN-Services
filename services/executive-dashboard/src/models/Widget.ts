import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// Widget Configuration Schema
// ============================================================================

export interface IWidget extends Document {
  _id: mongoose.Types.ObjectId;
  widgetId: string;
  tenantId: string;
  dashboardId?: string;
  name: string;
  type: 'kpi_card' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'gauge' | 'heatmap' | 'score_card' | 'trend_indicator' | 'alert_list';
  title?: string;
  description?: string;
  dataSource: {
    type: 'metric' | 'query' | 'external';
    metricType?: string;
    query?: Record<string, unknown>;
    endpoint?: string;
    parameters?: Record<string, string>;
  };
  visualization: {
    showTitle: boolean;
    showLegend: boolean;
    showLabels: boolean;
    colorScheme?: string[];
    thresholds?: {
      value: number;
      color: string;
      label?: string;
    }[];
  };
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

const WidgetSchema = new Schema<IWidget>(
  {
    widgetId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    dashboardId: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'kpi_card',
        'line_chart',
        'bar_chart',
        'pie_chart',
        'table',
        'gauge',
        'heatmap',
        'score_card',
        'trend_indicator',
        'alert_list',
      ],
    },
    title: {
      type: String,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    dataSource: {
      type: {
        type: String,
        required: true,
        enum: ['metric', 'query', 'external'],
      },
      metricType: {
        type: String,
      },
      query: {
        type: Schema.Types.Mixed,
      },
      endpoint: {
        type: String,
      },
      parameters: {
        type: Map,
        of: String,
      },
    },
    visualization: {
      showTitle: {
        type: Boolean,
        default: true,
      },
      showLegend: {
        type: Boolean,
        default: true,
      },
      showLabels: {
        type: Boolean,
        default: true,
      },
      colorScheme: [{
        type: String,
      }],
      thresholds: [{
        value: {
          type: Number,
          required: true,
        },
        color: {
          type: String,
          required: true,
        },
        label: {
          type: String,
        },
      }],
    },
    refreshInterval: {
      type: Number,
      required: true,
      default: 60000, // 1 minute
      min: 1000,
      max: 3600000,
    },
    position: {
      x: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      y: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      width: {
        type: Number,
        required: true,
        default: 4,
        min: 1,
        max: 12,
      },
      height: {
        type: Number,
        required: true,
        default: 3,
        min: 1,
        max: 12,
      },
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'widgets',
  }
);

// Compound indexes for efficient queries
WidgetSchema.index({ tenantId: 1, type: 1 });
WidgetSchema.index({ tenantId: 1, dashboardId: 1 });
WidgetSchema.index({ tenantId: 1, createdAt: -1 });
WidgetSchema.index({ tenantId: 1, name: 1 });

// ============================================================================
// Widget Model
// ============================================================================

export const Widget = mongoose.model<IWidget>('Widget', WidgetSchema);

// ============================================================================
// Widget Repository Methods
// ============================================================================

export class WidgetRepository {
  /**
   * Create a new widget
   */
  async create(data: Partial<IWidget>): Promise<IWidget> {
    const widget = new Widget(data);
    return widget.save();
  }

  /**
   * Find widget by ID
   */
  async findById(widgetId: string): Promise<IWidget | null> {
    return Widget.findOne({ widgetId });
  }

  /**
   * Find widget by tenant and ID
   */
  async findByTenantAndId(tenantId: string, widgetId: string): Promise<IWidget | null> {
    return Widget.findOne({ tenantId, widgetId });
  }

  /**
   * Find all widgets for a tenant
   */
  async findByTenant(tenantId: string, options?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    type?: string;
    dashboardId?: string;
  }): Promise<{ data: IWidget[]; total: number }> {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      type,
      dashboardId,
    } = options || {};

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const filter: Record<string, unknown> = { tenantId };

    if (type) filter.type = type;
    if (dashboardId) filter.dashboardId = dashboardId;

    const [data, total] = await Promise.all([
      Widget.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Widget.countDocuments(filter),
    ]);

    return { data, total };
  }

  /**
   * Find widgets by dashboard
   */
  async findByDashboard(dashboardId: string): Promise<IWidget[]> {
    return Widget.find({ dashboardId }).sort({ 'position.y': 1, 'position.x': 1 });
  }

  /**
   * Update widget
   */
  async update(widgetId: string, data: Partial<IWidget>): Promise<IWidget | null> {
    return Widget.findOneAndUpdate(
      { widgetId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  /**
   * Delete widget
   */
  async delete(widgetId: string): Promise<boolean> {
    const result = await Widget.deleteOne({ widgetId });
    return result.deletedCount === 1;
  }

  /**
   * Update widget position
   */
  async updatePosition(
    widgetId: string,
    position: IWidget['position']
  ): Promise<IWidget | null> {
    return Widget.findOneAndUpdate(
      { widgetId },
      { $set: { position } },
      { new: true, runValidators: true }
    );
  }

  /**
   * Update widget data source
   */
  async updateDataSource(
    widgetId: string,
    dataSource: IWidget['dataSource']
  ): Promise<IWidget | null> {
    return Widget.findOneAndUpdate(
      { widgetId },
      { $set: { dataSource } },
      { new: true, runValidators: true }
    );
  }

  /**
   * Update widget visualization settings
   */
  async updateVisualization(
    widgetId: string,
    visualization: IWidget['visualization']
  ): Promise<IWidget | null> {
    return Widget.findOneAndUpdate(
      { widgetId },
      { $set: { visualization } },
      { new: true, runValidators: true }
    );
  }

  /**
   * Bulk create widgets
   */
  async bulkCreate(widgets: Partial<IWidget>[]): Promise<IWidget[]> {
    return Widget.insertMany(widgets, { ordered: false });
  }

  /**
   * Bulk update widgets
   */
  async bulkUpdate(updates: { widgetId: string; data: Partial<IWidget> }[]): Promise<IWidget[]> {
    const promises = updates.map(({ widgetId, data }) =>
      Widget.findOneAndUpdate(
        { widgetId },
        { $set: data },
        { new: true, runValidators: true }
      )
    );
    return Promise.all(promises);
  }

  /**
   * Get widget templates by type
   */
  async getTemplates(type?: string): Promise<IWidget[]> {
    const filter = type ? { name: { $regex: 'template', $options: 'i' }, type } : {};
    return Widget.find(filter);
  }
}

export const widgetRepository = new WidgetRepository();
