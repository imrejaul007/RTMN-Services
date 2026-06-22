/**
 * SLA Model - Mongoose schema for SLA configurations
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum SLAStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  BREACHED = 'breached',
  MET = 'met',
  CANCELLED = 'cancelled',
}

export enum SLAType {
  FIRST_RESPONSE = 'first_response',
  RESOLUTION = 'resolution',
  NEXT_UPDATE = 'next_update',
}

export enum SLAPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface ISLA extends Document {
  slaId: string;
  name: string;
  description: string;
  type: SLAType;
  priority: SLAPriority;
  category?: string;
  targetHours: number;
  warningThreshold: number; // Percentage before breach to send warning
  status: SLAStatus;
  ticketId?: string;
  dueAt: Date;
  warnedAt?: Date;
  breachedAt?: Date;
  metAt?: Date;
  pausedAt?: Date;
  pausedDuration: number; // Minutes paused
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const slaSchema = new Schema<ISLA>(
  {
    slaId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    type: {
      type: String,
      enum: Object.values(SLAType),
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(SLAPriority),
      required: true,
      index: true,
    },
    category: { type: String, index: true },
    targetHours: { type: Number, required: true, min: 0 },
    warningThreshold: { type: Number, default: 80, min: 0, max: 100 },
    status: {
      type: String,
      enum: Object.values(SLAStatus),
      default: SLAStatus.ACTIVE,
      index: true,
    },
    ticketId: { type: String, index: true },
    dueAt: { type: Date, required: true, index: true },
    warnedAt: Date,
    breachedAt: Date,
    metAt: Date,
    pausedAt: Date,
    pausedDuration: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Indexes
slaSchema.index({ status: 1, type: 1 });
slaSchema.index({ dueAt: 1, status: 1 });
slaSchema.index({ ticketId: 1, type: 1 });
slaSchema.index({ priority: 1, status: 1 });

export const SLA = mongoose.model<ISLA>('SLA', slaSchema);
export default SLA;