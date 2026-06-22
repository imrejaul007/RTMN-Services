import mongoose, { Schema, Model } from 'mongoose';
import { Decision } from '../types/index.js';

interface DecisionDocument extends Decision {}

const DecisionSchema = new Schema<DecisionDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: String,
    type: { type: String, required: true },
    action: { type: String, required: true },
    value: Number,
    reason: { type: String, required: true },
    factors: [{
      name: String,
      weight: Number,
      value: Schema.Types.Mixed
    }],
    model: String,
    context: {
      requestId: String,
      sessionId: String,
      channel: String,
      amount: Number,
      campaignId: String
    },
    risk: String,
    fraudScore: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'manual_review'], default: 'pending' },
    reviewedBy: String,
    reviewedAt: Date
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    collection: 'decisions'
  }
);

DecisionSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
DecisionSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
DecisionSchema.index({ tenantId: 1, status: 1 });

export const DecisionModel: Model<DecisionDocument> = mongoose.model<DecisionDocument>(
  'Decision',
  DecisionSchema
);
