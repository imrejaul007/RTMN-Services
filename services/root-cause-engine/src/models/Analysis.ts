import mongoose, { Schema, Document } from 'mongoose';
import {
  RootCauseAnalysis,
  SimilarCase,
  ConfidenceLevel,
  ImpactLevel
} from '../types';

export interface AnalysisDocument extends Omit<RootCauseAnalysis, 'id'>, Document {}

const SimilarCaseSchema = new Schema<SimilarCase>({
  analysisId: { type: String, required: true },
  title: { type: String, required: true },
  rootCause: { type: String, required: true },
  similarity: { type: Number, required: true, min: 0, max: 100 },
  resolution: { type: String }
}, { _id: false });

const AnalysisSchema = new Schema<AnalysisDocument>({
  analysisId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  complaintIds: [{
    type: String,
    required: true
  }],
  causalChainId: {
    type: String,
    index: true
  },
  factorIds: [{
    type: String
  }],
  recommendationIds: [{
    type: String
  }],
  summary: {
    type: String,
    required: true
  },
  primaryRootCause: {
    type: String,
    required: true
  },
  confidence: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  impact: {
    type: String,
    enum: ['severe', 'significant', 'moderate', 'minimal'],
    default: 'moderate'
  },
  totalAffectedUsers: {
    type: Number,
    default: 0
  },
  totalRevenueImpact: {
    type: Number,
    default: 0
  },
  similarCases: [SimilarCaseSchema],
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  completedAt: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
AnalysisSchema.index({ tenantId: 1, status: 1 });
AnalysisSchema.index({ tenantId: 1, createdAt: -1 });
AnalysisSchema.index({ primaryRootCause: 1 });
AnalysisSchema.index({ 'similarCases.analysisId': 1 });

export const Analysis = mongoose.model<AnalysisDocument>('Analysis', AnalysisSchema);
