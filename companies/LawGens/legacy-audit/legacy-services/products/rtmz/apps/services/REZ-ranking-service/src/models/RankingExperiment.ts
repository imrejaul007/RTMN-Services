import mongoose, { Schema, Document } from 'mongoose';

export interface IRankingExperiment extends Document {
  experimentId: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  variants: {
    id: string;
    name: string;
    description: string;
    config: {
      weights: Record<string, number>;
      diversityWeight: number;
      personalizationWeight: number;
      modelVersion?: string;
    };
    traffic: number;
    metrics: {
      impressions: number;
      clicks: number;
      conversions: number;
      revenue: number;
      ctr: number;
      conversionRate: number;
      avgOrderValue: number;
    };
  }[];
  targeting: {
    userSegments?: string[];
    countries?: string[];
    platforms?: string[];
    minImpressions?: number;
  };
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RankingExperimentSchema = new Schema<IRankingExperiment>({
  experimentId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft', 'running', 'paused', 'completed', 'archived'],
    default: 'draft'
  },
  variants: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    config: {
      weights: { type: Map, of: Number, default: {} },
      diversityWeight: { type: Number, default: 0.3 },
      personalizationWeight: { type: Number, default: 0.5 },
      modelVersion: { type: String }
    },
    traffic: { type: Number, default: 0 },
    metrics: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      avgOrderValue: { type: Number, default: 0 }
    }
  }],
  targeting: {
    userSegments: [String],
    countries: [String],
    platforms: [String],
    minImpressions: { type: Number, default: 100 }
  },
  startDate: Date,
  endDate: Date
}, {
  timestamps: true
});

RankingExperimentSchema.index({ status: 1, createdAt: -1 });
RankingExperimentSchema.index({ 'variants.id': 1 });

export const RankingExperiment = mongoose.model<IRankingExperiment>('RankingExperiment', RankingExperimentSchema);
