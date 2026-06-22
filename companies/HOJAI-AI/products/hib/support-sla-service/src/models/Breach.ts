/**
 * Breach Model - Mongoose schema for SLA breaches
 */

import mongoose, { Document, Schema } from 'mongoose';

import { SLAType, SLAPriority } from './SLA';

export enum BreachSeverity {
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor',
}

export interface IBreach extends Document {
  breachId: string;
  slaId: string;
  ticketId: string;
  type: SLAType;
  priority: SLAPriority;
  severity: BreachSeverity;
  targetHours: number;
  actualMinutes: number;
  overdueMinutes: number;
  resolvedWithoutAction: boolean;
  escalationId?: string;
  notificationSent: boolean;
  notifiedAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const breachSchema = new Schema<IBreach>(
  {
    breachId: { type: String, required: true, unique: true, index: true },
    slaId: { type: String, required: true, index: true },
    ticketId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: Object.values(SLAType),
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(SLAPriority),
      required: true,
    },
    severity: {
      type: String,
      enum: Object.values(BreachSeverity),
      required: true,
      index: true,
    },
    targetHours: { type: Number, required: true },
    actualMinutes: { type: Number, required: true },
    overdueMinutes: { type: Number, required: true },
    resolvedWithoutAction: { type: Boolean, default: false },
    escalationId: String,
    notificationSent: { type: Boolean, default: false },
    notifiedAt: Date,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Indexes
breachSchema.index({ ticketId: 1, createdAt: -1 });
breachSchema.index({ severity: 1, createdAt: -1 });
breachSchema.index({ priority: 1, type: 1 });

export const Breach = mongoose.model<IBreach>('Breach', breachSchema);
export default Breach;