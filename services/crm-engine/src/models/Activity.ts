import mongoose, { Document, Schema, Types } from 'mongoose';

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  NOTE = 'note',
  MEETING = 'meeting',
  TASK = 'task',
}

export interface IActivity extends Document {
  tenantId: string;
  type: ActivityType;
  description: string;
  contactId?: Types.ObjectId;
  dealId?: Types.ObjectId;
  date: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    tenantId: {
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
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
    },
    dealId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
    },
    date: {
      type: Date,
      default: Date.now,
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

// Indexes for common queries
ActivitySchema.index(['tenantId', 'contactId']);
ActivitySchema.index(['tenantId', 'dealId']);
ActivitySchema.index(['tenantId', 'type']);
ActivitySchema.index(['tenantId', 'date']);

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
