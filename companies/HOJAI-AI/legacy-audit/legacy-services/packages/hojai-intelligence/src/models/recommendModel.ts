/**
 * Recommendation Model
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface IRecommendation extends Document {
  tenantId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  recommendationType: string;
  score: number;
  reason: string;
  metadata?: any;
  isViewed: boolean;
  isClicked: boolean;
  isConverted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecommendationSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: String, required: true },
  recommendationType: { type: String, required: true },
  score: { type: Number, required: true },
  reason: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  isViewed: { type: Boolean, default: false },
  isClicked: { type: Boolean, default: false },
  isConverted: { type: Boolean, default: false },
}, { timestamps: true });

// Prevent OverwriteModelError by checking if model exists
export const RecommendationModel = mongoose.models.Recommendation || 
  mongoose.model<IRecommendation>('Recommendation', RecommendationSchema);
