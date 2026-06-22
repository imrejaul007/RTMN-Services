import mongoose, { Schema, Model } from 'mongoose';
import { Recommendation } from '../types/index.js';

interface RecommendationDocument extends Recommendation {}

const RecommendationSchema = new Schema<RecommendationDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
    score: { type: Number, required: true, min: 0, max: 1 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    reason: { type: String, required: true },
    context: {
      trigger: String,
      sourceEntityId: String,
      position: Number
    },
    display: {
      imageUrl: String,
      price: Number,
      discount: Number,
      rating: Number
    },
    personalization: {
      demographics: Boolean,
      behavior: Boolean,
      collaborative: Boolean,
      contextual: Boolean
    },
    validFrom: Date,
    validUntil: Date,
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    collection: 'recommendations'
  }
);

RecommendationSchema.index({ tenantId: 1, userId: 1, type: 1 });
RecommendationSchema.index({ tenantId: 1, userId: 1, validUntil: 1 });
RecommendationSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });

export const RecommendationModel: Model<RecommendationDocument> = mongoose.model<RecommendationDocument>(
  'Recommendation',
  RecommendationSchema
);
