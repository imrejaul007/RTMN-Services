/**
 * Trust Score Model
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum TrustLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum TrustFactor {
  IDENTITY_VERIFICATION = 'identity_verification',
  ACCOUNT_AGE = 'account_age',
  TRANSACTION_HISTORY = 'transaction_history',
  DEVICE_TRUST = 'device_trust',
  BEHAVIOR_PATTERN = 'behavior_pattern',
  SOCIAL_PROOF = 'social_proof',
  PAYMENT_METHODS = 'payment_methods',
  ADDRESS_VERIFICATION = 'address_verification',
  KYC_STATUS = 'kyc_status',
  KARMA_SCORE = 'karma_score'
}

export interface ITrustScore extends Document {
  clusterId: string;
  overallScore: number; // 0-100
  level: TrustLevel;
  factors: Record<TrustFactor, {
    score: number;
    weight: number;
    lastUpdated: Date;
  }>;
  flags: string[];
  verifiedAt?: Date;
  lastReviewAt?: Date;
  nextReviewAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TrustScoreSchema = new Schema<ITrustScore>({
  clusterId: { type: String, required: true, unique: true, index: true },
  overallScore: { type: Number, default: 50, min: 0, max: 100 },
  level: {
    type: String,
    enum: Object.values(TrustLevel),
    default: TrustLevel.MEDIUM
  },
  factors: {
    type: Map,
    of: new Schema({
      score: { type: Number, default: 50 },
      weight: { type: Number, default: 1 },
      lastUpdated: { type: Date, default: Date.now }
    }),
    default: {}
  },
  flags: [String],
  verifiedAt: Date,
  lastReviewAt: Date,
  nextReviewAt: Date,
}, { timestamps: true });

// Calculate level from score
TrustScoreSchema.methods.calculateLevel = function(): TrustLevel {
  const score = this.overallScore;
  if (score >= 90) return TrustLevel.VERY_HIGH;
  if (score >= 70) return TrustLevel.HIGH;
  if (score >= 40) return TrustLevel.MEDIUM;
  if (score >= 20) return TrustLevel.LOW;
  return TrustLevel.VERY_LOW;
};

// Calculate overall score from factors
TrustScoreSchema.methods.recalculateScore = function(): number {
  const factors = Object.fromEntries(this.factors);
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, factor] of Object.entries(factors)) {
    weightedSum += factor.score * factor.weight;
    totalWeight += factor.weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
};

export const TrustScore = mongoose.model<ITrustScore>('TrustScore', TrustScoreSchema);
