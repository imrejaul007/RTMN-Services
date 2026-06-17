import mongoose, { Schema, Document } from 'mongoose';
import {
  EntityType,
  TrustLevel,
  VerificationLevel,
  TrustFactors,
  ScoreBreakdown,
  TrustHistoryEntry,
  LinkedEntity,
} from '../types';

export interface ITrustScore extends Document {
  entityId: string;
  entityType: EntityType;
  tenantId: string;
  score: number;
  level: TrustLevel;
  factors: TrustFactors;
  breakdown: ScoreBreakdown;
  lastUpdated: Date;
  nextReview: Date;
  history: TrustHistoryEntry[];
  linkedEntities: LinkedEntity[];
  riskFlags: string[];
  verified: boolean;
  verificationLevel: VerificationLevel;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TrustHistorySchema = new Schema<TrustHistoryEntry>(
  {
    timestamp: { type: Date, required: true },
    previousScore: { type: Number, required: true },
    newScore: { type: Number, required: true },
    changeReason: { type: String, required: true },
    triggeredBy: { type: String, required: true },
    factors: {
      transactionReliability: Number,
      verificationStatus: Number,
      behavioralPattern: Number,
      historicalBehavior: Number,
      networkTrust: Number,
      riskIndicators: Number,
      complianceScore: Number,
    },
  },
  { _id: false }
);

const LinkedEntitySchema = new Schema<LinkedEntity>(
  {
    entityId: { type: String, required: true },
    entityType: { type: String, required: true },
    relationship: {
      type: String,
      enum: ['parent', 'child', 'sibling', 'related'],
      required: true,
    },
    trustInfluence: { type: Number, required: true },
    linkedAt: { type: Date, required: true },
  },
  { _id: false }
);

const TrustFactorsSchema = new Schema<TrustFactors>(
  {
    transactionReliability: { type: Number, default: 0, min: 0, max: 100 },
    verificationStatus: { type: Number, default: 0, min: 0, max: 100 },
    behavioralPattern: { type: Number, default: 0, min: 0, max: 100 },
    historicalBehavior: { type: Number, default: 0, min: 0, max: 100 },
    networkTrust: { type: Number, default: 0, min: 0, max: 100 },
    riskIndicators: { type: Number, default: 0, min: 0, max: 100 },
    complianceScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const ScoreBreakdownSchema = new Schema<ScoreBreakdown>(
  {
    baseScore: { type: Number, default: 50, min: 0, max: 100 },
    transactionBonus: { type: Number, default: 0, min: -50, max: 50 },
    verificationBonus: { type: Number, default: 0, min: -50, max: 50 },
    behaviorBonus: { type: Number, default: 0, min: -50, max: 50 },
    historyBonus: { type: Number, default: 0, min: -50, max: 50 },
    networkBonus: { type: Number, default: 0, min: -50, max: 50 },
    penalties: { type: Number, default: 0, min: -100, max: 0 },
  },
  { _id: false }
);

const TrustScoreSchema = new Schema<ITrustScore>(
  {
    entityId: { type: String, required: true, index: true },
    entityType: {
      type: String,
      required: true,
      enum: ['customer', 'merchant', 'agent', 'vendor', 'partner', 'device'],
      index: true,
    },
    tenantId: { type: String, required: true, default: 'default', index: true },
    score: { type: Number, required: true, default: 50, min: 0, max: 100 },
    level: {
      type: String,
      required: true,
      enum: ['critical', 'low', 'medium', 'high', 'excellent'],
      default: 'medium',
    },
    factors: { type: TrustFactorsSchema, required: true, default: () => ({}) },
    breakdown: { type: ScoreBreakdownSchema, required: true, default: () => ({}) },
    lastUpdated: { type: Date, required: true, default: Date.now },
    nextReview: { type: Date, required: true },
    history: { type: [TrustHistorySchema], default: [] },
    linkedEntities: { type: [LinkedEntitySchema], default: [] },
    riskFlags: { type: [String], default: [] },
    verified: { type: Boolean, default: false },
    verificationLevel: {
      type: String,
      enum: ['none', 'basic', 'standard', 'enhanced', 'full'],
      default: 'none',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'trust_scores',
  }
);

// Compound indexes for efficient queries
TrustScoreSchema.index({ entityId: 1, entityType: 1, tenantId: 1 }, { unique: true });
TrustScoreSchema.index({ tenantId: 1, entityType: 1, level: 1 });
TrustScoreSchema.index({ tenantId: 1, score: 1 });
TrustScoreSchema.index({ tenantId: 1, verified: 1 });

// Pre-save hook to update level based on score
TrustScoreSchema.pre('save', function (next) {
  this.level = calculateLevel(this.score);
  if (!this.nextReview) {
    this.nextReview = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  }
  next();
});

function calculateLevel(score: number): TrustLevel {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 25) return 'low';
  return 'critical';
}

export const TrustScoreModel = mongoose.model<ITrustScore>('TrustScore', TrustScoreSchema);

export default TrustScoreModel;
