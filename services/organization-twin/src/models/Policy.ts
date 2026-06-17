import mongoose, { Document, Schema } from 'mongoose';

export interface IPolicy extends Document {
  tenantId: string;
  organizationId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  type: 'refund' | 'cancellation' | 'shipping' | 'privacy' | 'terms' | 'warranty' | 'loyalty' | 'custom';
  description: string;
  rules: Array<{
    condition: string;
    action: string;
    value?: unknown;
    priority: number;
  }>;
  appliesTo: {
    scope: 'global' | 'department' | 'branch' | 'product_category' | 'customer_tier';
    value?: string;
  };
  effectiveFrom: Date;
  effectiveTo?: Date;
  version: number;
  isDefault: boolean;
  status: 'draft' | 'active' | 'superseded' | 'archived';
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PolicySchema = new Schema<IPolicy>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    type: {
      type: String,
      enum: ['refund', 'cancellation', 'shipping', 'privacy', 'terms', 'warranty', 'loyalty', 'custom'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    rules: [{
      condition: {
        type: String,
        required: true,
      },
      action: {
        type: String,
        required: true,
      },
      value: {
        type: Schema.Types.Mixed,
      },
      priority: {
        type: Number,
        default: 0,
      },
    }],
    appliesTo: {
      scope: {
        type: String,
        enum: ['global', 'department', 'branch', 'product_category', 'customer_tier'],
        default: 'global',
      },
      value: {
        type: String,
      },
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
    },
    version: {
      type: Number,
      default: 1,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'superseded', 'archived'],
      default: 'draft',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
PolicySchema.index({ tenantId: 1, type: 1, status: 1 });
PolicySchema.index({ tenantId: 1, code: 1 }, { unique: true });
PolicySchema.index({ organizationId: 1, type: 1, isDefault: 1 });
PolicySchema.index({ effectiveFrom: 1, effectiveTo: 1 });

export const Policy = mongoose.model<IPolicy>('Policy', PolicySchema);
