import mongoose, { Document, Schema } from 'mongoose';

export interface ISLAPolicy extends Document {
  tenantId: string;
  organizationId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  responseTime: {
    value: number; // in minutes
    unit: 'minutes' | 'hours' | 'days';
    businessHours: boolean; // Count within business hours only
  };
  resolutionTime: {
    value: number;
    unit: 'minutes' | 'hours' | 'days';
    businessHours: boolean;
  };
  escalationRules: Array<{
    level: number;
    timeThreshold: number; // minutes
    notifyRoles: string[];
    escalateTo?: string;
    action?: string;
  }>;
  firstContactResolution: boolean;
  customerEffortScore?: {
    enabled: boolean;
    target: number; // 1-10 scale
  };
  status: 'active' | 'inactive' | 'draft';
  effectiveFrom: Date;
  effectiveTo?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SLAPolicySchema = new Schema<ISLAPolicy>(
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
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
      index: true,
    },
    responseTime: {
      value: {
        type: Number,
        required: true,
        min: 1,
      },
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days'],
        default: 'hours',
      },
      businessHours: {
        type: Boolean,
        default: false,
      },
    },
    resolutionTime: {
      value: {
        type: Number,
        required: true,
        min: 1,
      },
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days'],
        default: 'hours',
      },
      businessHours: {
        type: Boolean,
        default: false,
      },
    },
    escalationRules: [{
      level: {
        type: Number,
        required: true,
        min: 1,
      },
      timeThreshold: {
        type: Number,
        required: true,
        min: 1,
      },
      notifyRoles: [{
        type: String,
        trim: true,
      }],
      escalateTo: {
        type: String,
        trim: true,
      },
      action: {
        type: String,
        trim: true,
      },
    }],
    firstContactResolution: {
      type: Boolean,
      default: false,
    },
    customerEffortScore: {
      enabled: {
        type: Boolean,
        default: false,
      },
      target: {
        type: Number,
        min: 1,
        max: 10,
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft'],
      default: 'draft',
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
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
SLAPolicySchema.index({ tenantId: 1, priority: 1, status: 1 });
SLAPolicySchema.index({ tenantId: 1, code: 1 }, { unique: true });
SLAPolicySchema.index({ organizationId: 1, priority: 1 });

export const SLAPolicy = mongoose.model<ISLAPolicy>('SLAPolicy', SLAPolicySchema);
