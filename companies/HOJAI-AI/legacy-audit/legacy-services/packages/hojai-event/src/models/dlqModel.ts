import mongoose, { Schema, Model } from 'mongoose';
import { DLQEntry, DLQReason } from '../types/index.js';

interface DLQDocument extends DLQEntry {}

const DLQSchema = new Schema<DLQDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    originalEvent: { type: Map, of: Schema.Types.Mixed, required: true },
    eventType: { type: String, required: true },

    // Error info
    reason: {
      type: String,
      enum: Object.values(DLQReason),
      required: true
    },
    errorMessage: { type: String, required: true },
    errorStack: String,

    // Retry info
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 5 },
    nextRetryAt: Date,

    // Status
    status: {
      type: String,
      enum: ['pending', 'retrying', 'dead', 'resolved'],
      default: 'pending'
    },
    resolvedAt: Date,
    resolvedBy: String,

    // Timestamps
    failedAt: { type: Date, required: true }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'dlq'
  }
);

// Indexes
DLQSchema.index({ tenantId: 1, status: 1 });
DLQSchema.index({ tenantId: 1, reason: 1 });
DLQSchema.index({ nextRetryAt: 1 }, { expireAfterSeconds: 0 }); // Index for scheduling

export const DLQModel: Model<DLQDocument> = mongoose.model<DLQDocument>('DLQ', DLQSchema);
