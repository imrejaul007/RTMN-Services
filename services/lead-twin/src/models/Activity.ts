import mongoose, { Document, Schema, Types } from 'mongoose';

// Activity Type Enum
export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  STAGE_CHANGE = 'stage_change',
  SCORE_UPDATE = 'score_update',
  ENRICHMENT = 'enrichment',
  CONVERSION = 'conversion',
}

// Activity Interface
export interface IActivity extends Document {
  tenantId: string;
  activityId: string;
  leadId: string;
  type: ActivityType;
  description: string;
  performedBy?: string;
  metadata: Record<string, unknown>;
  previousValue?: unknown;
  newValue?: unknown;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Activity Schema
const ActivitySchema = new Schema<IActivity>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    activityId: {
      type: String,
      required: true,
      unique: true,
    },
    leadId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(ActivityType),
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    performedBy: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    previousValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
ActivitySchema.index(['tenantId', 'leadId']);
ActivitySchema.index(['tenantId', 'type']);
ActivitySchema.index(['tenantId', 'createdAt']);
ActivitySchema.index(['leadId', 'createdAt']);
ActivitySchema.index(['leadId', 'type']);

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
