import mongoose, { Schema, Document } from 'mongoose';
import { Recommendation, ImpactLevel } from '../types';

export interface RecommendationDocument extends Omit<Recommendation, 'id'>, Document {}

const RecommendationSchema = new Schema<RecommendationDocument>({
  recommendationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  analysisId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  expectedImpact: {
    type: String,
    enum: ['severe', 'significant', 'moderate', 'minimal'],
    required: true
  },
  estimatedCost: Number,
  estimatedSavings: Number,
  roi: Number,
  implementationEffort: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  timeframe: {
    type: String,
    required: true
  },
  relatedFactors: [{
    type: String
  }],
  linkedHistoricalCases: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['proposed', 'approved', 'implemented', 'rejected'],
    default: 'proposed'
  }
}, {
  timestamps: true
});

// Indexes
RecommendationSchema.index({ tenantId: 1, status: 1 });
RecommendationSchema.index({ analysisId: 1 });
RecommendationSchema.index({ priority: 1 });
RecommendationSchema.index({ roi: -1 });
RecommendationSchema.index({ expectedImpact: 1 });

export const RecommendationModel = mongoose.model<RecommendationDocument>('Recommendation', RecommendationSchema);
