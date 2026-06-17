/**
 * Funnel Model
 * Stores funnel configurations for analysis
 */

import mongoose, { Document, Schema } from 'mongoose';
import {
  IFunnel,
  FunnelStage,
  FunnelFilters,
  DateRange
} from '../types';

export interface FunnelDocument extends Omit<IFunnel, '_id'>, Document {}

const FunnelStageSchema = new Schema<FunnelStage>(
  {
    name: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    required: {
      type: Boolean,
      default: true
    },
    targetCount: {
      type: Number,
      default: null
    },
    conversionTarget: {
      type: Number,
      default: null
    }
  },
  { _id: false }
);

const FunnelFiltersSchema = new Schema<FunnelFilters>(
  {
    customerIds: {
      type: [String],
      default: []
    },
    segments: {
      type: [String],
      default: []
    },
    channels: {
      type: [String],
      default: []
    },
    campaigns: {
      type: [String],
      default: []
    },
    excludeChannels: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const DateRangeSchema = new Schema<DateRange>(
  {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  { _id: false }
);

const FunnelSchema = new Schema<FunnelDocument>(
  {
    funnelId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
      default: 'public'
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    stages: {
      type: [FunnelStageSchema],
      required: true,
      validate: {
        validator: function(v: FunnelStage[]) {
          return v && v.length >= 2;
        },
        message: 'A funnel must have at least 2 stages'
      }
    },
    filters: {
      type: FunnelFiltersSchema,
      default: {}
    },
    dateRange: {
      type: DateRangeSchema,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'funnels'
  }
);

// Indexes
FunnelSchema.index({ tenantId: 1, name: 1 });
FunnelSchema.index({ tenantId: 1, createdAt: -1 });

// Pre-save hook to set stage orders
FunnelSchema.pre('save', function(next) {
  this.stages.forEach((stage, index) => {
    stage.order = index;
  });
  next();
});

// Static methods
FunnelSchema.statics.findByTenant = function(tenantId: string) {
  return this.find({ tenantId }).sort('-createdAt');
};

FunnelSchema.statics.findByIdAndTenant = function(
  funnelId: string,
  tenantId: string
) {
  return this.findOne({ funnelId, tenantId });
};

FunnelSchema.statics.findByName = function(name: string, tenantId: string) {
  return this.findOne({ name, tenantId });
};

export const Funnel = mongoose.model<FunnelDocument>(
  'Funnel',
  FunnelSchema
);

// Default funnel templates
export const DEFAULT_FUNNELS = {
  acquisition: {
    name: 'Acquisition Funnel',
    description: 'Track customer acquisition from awareness to purchase',
    stages: [
      { name: 'awareness', order: 0, required: true },
      { name: 'consideration', order: 1, required: true },
      { name: 'intent', order: 2, required: true },
      { name: 'purchase', order: 3, required: true }
    ]
  },
  engagement: {
    name: 'Engagement Funnel',
    description: 'Track customer engagement and activation',
    stages: [
      { name: 'signup', order: 0, required: true },
      { name: 'onboarding', order: 1, required: true },
      { name: 'activation', order: 2, required: true },
      { name: 'retention', order: 3, required: true }
    ]
  },
  retention: {
    name: 'Retention Funnel',
    description: 'Track customer retention and loyalty',
    stages: [
      { name: 'first_purchase', order: 0, required: true },
      { name: 'repeat_purchase', order: 1, required: true },
      { name: 'loyalty', order: 2, required: true },
      { name: 'advocacy', order: 3, required: true }
    ]
  }
};
