/**
 * Finance Alert Model - MongoDB Schema for Finance Alerts
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  _id: mongoose.Types.ObjectId;
  transactionId: string;
  type: 'suspicious_amount' | 'unusual_pattern' | 'velocity_check' | 'geographic_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  detectedAt: Date;
  resolved: boolean;
  resolution?: string;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    transactionId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['suspicious_amount', 'unusual_pattern', 'velocity_check', 'geographic_anomaly'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    description: {
      type: String,
      required: true,
    },
    detectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolution: {
      type: String,
    },
    resolvedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
AlertSchema.index({ severity: 1, resolved: 1 });
AlertSchema.index({ detectedAt: 1, severity: 1 });
AlertSchema.index({ type: 1, detectedAt: 1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
