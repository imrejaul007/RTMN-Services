import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// Dashboard Configuration Schema
// ============================================================================

export interface IDashboard extends Document {
  _id: mongoose.Types.ObjectId;
  dashboardId: string;
  tenantId: string;
  name: string;
  description?: string;
  widgets: string[];
  layout: {
    columns: number;
    rows: {
      widgetId: string;
      x: number;
      y: number;
      width: number;
      height: number;
      order: number;
    }[];
  };
  filters: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
    value: string | number | boolean;
    label: string;
  }[];
  refreshInterval: number;
  isDefault: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const DashboardSchema = new Schema<IDashboard>(
  {
    dashboardId: {
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
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    widgets: [{
      type: String,
      ref: 'Widget',
    }],
    layout: {
      columns: {
        type: Number,
        required: true,
        default: 12,
        min: 1,
        max: 24,
      },
      rows: [{
        widgetId: {
          type: String,
          required: true,
        },
        x: {
          type: Number,
          required: true,
          min: 0,
        },
        y: {
          type: Number,
          required: true,
          min: 0,
        },
        width: {
          type: Number,
          required: true,
          min: 1,
        },
        height: {
          type: Number,
          required: true,
          min: 1,
        },
        order: {
          type: Number,
          required: true,
          min: 0,
        },
      }],
    },
    filters: [{
      field: {
        type: String,
        required: true,
      },
      operator: {
        type: String,
        enum: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains'],
        required: true,
      },
      value: {
        type: Schema.Types.Mixed,
        required: true,
      },
      label: {
        type: String,
        required: true,
      },
    }],
    refreshInterval: {
      type: Number,
      required: true,
      default: 60000, // 1 minute
      min: 1000,
      max: 3600000, // 1 hour
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'dashboards',
  }
);

// Compound indexes for efficient queries
DashboardSchema.index({ tenantId: 1, isDefault: 1 });
DashboardSchema.index({ tenantId: 1, name: 1 });
DashboardSchema.index({ tenantId: 1, createdAt: -1 });

// ============================================================================
// Dashboard Model
// ============================================================================

export const Dashboard = mongoose.model<IDashboard>('Dashboard', DashboardSchema);

// ============================================================================
// Dashboard Repository Methods
// ============================================================================

export class DashboardRepository {
  /**
   * Create a new dashboard
   */
  async create(data: Partial<IDashboard>): Promise<IDashboard> {
    const dashboard = new Dashboard(data);
    return dashboard.save();
  }

  /**
   * Find dashboard by ID
   */
  async findById(dashboardId: string): Promise<IDashboard | null> {
    return Dashboard.findOne({ dashboardId }).populate('widgets');
  }

  /**
   * Find dashboard by tenant and ID
   */
  async findByTenantAndId(tenantId: string, dashboardId: string): Promise<IDashboard | null> {
    return Dashboard.findOne({ tenantId, dashboardId }).populate('widgets');
  }

  /**
   * Find all dashboards for a tenant
   */
  async findByTenant(tenantId: string, options?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: IDashboard[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options || {};

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      Dashboard.find({ tenantId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('widgets'),
      Dashboard.countDocuments({ tenantId }),
    ]);

    return { data, total };
  }

  /**
   * Find default dashboard for a tenant
   */
  async findDefault(tenantId: string): Promise<IDashboard | null> {
    return Dashboard.findOne({ tenantId, isDefault: true });
  }

  /**
   * Update dashboard
   */
  async update(dashboardId: string, data: Partial<IDashboard>): Promise<IDashboard | null> {
    return Dashboard.findOneAndUpdate(
      { dashboardId },
      { $set: data },
      { new: true, runValidators: true }
    ).populate('widgets');
  }

  /**
   * Delete dashboard
   */
  async delete(dashboardId: string): Promise<boolean> {
    const result = await Dashboard.deleteOne({ dashboardId });
    return result.deletedCount === 1;
  }

  /**
   * Set default dashboard
   */
  async setDefault(tenantId: string, dashboardId: string): Promise<void> {
    await Dashboard.updateMany(
      { tenantId, isDefault: true },
      { $set: { isDefault: false } }
    );
    await Dashboard.updateOne(
      { tenantId, dashboardId },
      { $set: { isDefault: true } }
    );
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(dashboardId: string, widgetId: string): Promise<IDashboard | null> {
    return Dashboard.findOneAndUpdate(
      { dashboardId },
      { $addToSet: { widgets: widgetId } },
      { new: true, runValidators: true }
    ).populate('widgets');
  }

  /**
   * Remove widget from dashboard
   */
  async removeWidget(dashboardId: string, widgetId: string): Promise<IDashboard | null> {
    return Dashboard.findOneAndUpdate(
      { dashboardId },
      { $pull: { widgets: widgetId } },
      { new: true, runValidators: true }
    ).populate('widgets');
  }

  /**
   * Update dashboard layout
   */
  async updateLayout(
    dashboardId: string,
    layout: IDashboard['layout']
  ): Promise<IDashboard | null> {
    return Dashboard.findOneAndUpdate(
      { dashboardId },
      { $set: { layout } },
      { new: true, runValidators: true }
    ).populate('widgets');
  }

  /**
   * Update dashboard filters
   */
  async updateFilters(
    dashboardId: string,
    filters: IDashboard['filters']
  ): Promise<IDashboard | null> {
    return Dashboard.findOneAndUpdate(
      { dashboardId },
      { $set: { filters } },
      { new: true, runValidators: true }
    ).populate('widgets');
  }

  /**
   * Clone dashboard
   */
  async clone(
    dashboardId: string,
    newName: string,
    createdBy: string
  ): Promise<IDashboard | null> {
    const original = await this.findById(dashboardId);
    if (!original) return null;

    const { v4: uuidv4 } = await import('uuid');

    const clone: Partial<IDashboard> = {
      dashboardId: uuidv4(),
      tenantId: original.tenantId,
      name: newName,
      description: original.description,
      widgets: [...original.widgets],
      layout: { ...original.layout },
      filters: [...original.filters],
      refreshInterval: original.refreshInterval,
      isDefault: false,
      isPublic: false,
      createdBy,
    };

    return this.create(clone);
  }
}

export const dashboardRepository = new DashboardRepository();
