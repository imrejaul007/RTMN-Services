/**
 * Metric Model - Mongoose schema for SLA metrics
 */

import mongoose, { Document, Schema } from 'mongoose';

import { SLAType, SLAPriority } from './SLA';

export interface IMetric extends Document {
  metricId: string;
  type: SLAType;
  priority: SLAPriority;
  period: 'daily' | 'weekly' | 'monthly';
  periodStart: Date;
  periodEnd: Date;
  totalSlas: number;
  metSlas: number;
  breachedSlas: number;
  pendingSlas: number;
  avgResponseMinutes: number;
  avgResolutionMinutes: number;
  firstResponseCompliance: number; // Percentage
  resolutionCompliance: number; // Percentage
  warningsIssued: number;
  escalationsTriggered: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const metricSchema = new Schema<IMetric>(
  {
    metricId: { type: String, required: true, unique: true, index: true },
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
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalSlas: { type: Number, default: 0 },
    metSlas: { type: Number, default: 0 },
    breachedSlas: { type: Number, default: 0 },
    pendingSlas: { type: Number, default: 0 },
    avgResponseMinutes: { type: Number, default: 0 },
    avgResolutionMinutes: { type: Number, default: 0 },
    firstResponseCompliance: { type: Number, default: 0 },
    resolutionCompliance: { type: Number, default: 0 },
    warningsIssued: { type: Number, default: 0 },
    escalationsTriggered: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Indexes
metricSchema.index({ type: 1, priority: 1, period: 1, periodStart: -1 });
metricSchema.index({ periodStart: -1, periodEnd: 1 });

export const Metric = mongoose.model<IMetric>('Metric', metricSchema);
export default Metric;