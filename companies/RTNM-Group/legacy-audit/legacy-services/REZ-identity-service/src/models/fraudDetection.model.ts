/**
 * Fraud Detection Model
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum FraudRiskLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum FraudIndicator {
  RAPID_TRANSACTIONS = 'rapid_transactions',
  MULTIPLE_ACCOUNTS = 'multiple_accounts',
  UNUSUAL_LOCATION = 'unusual_location',
  DEVICE_MISMATCH = 'device_mismatch',
  VELOCITY_ANOMALY = 'velocity_anomaly',
  PATTERN_ANOMALY = 'pattern_anomaly',
  SANCTIONS_MATCH = 'sanctions_match',
  CHARGEBACK_HISTORY = 'chargeback_history',
  PROXY_VPN_USAGE = 'proxy_vpn_usage',
  BOT_BEHAVIOR = 'bot_behavior',
  IDENTITY_MISMATCH = 'identity_mismatch',
  PHANTOM_ACCOUNTS = 'phantom_accounts'
}

export interface IFraudEvent extends Document {
  eventId: string;
  clusterId: string;
  indicator: FraudIndicator;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  source: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  createdAt: Date;
}

export interface IFraudProfile extends Document {
  clusterId: string;
  riskLevel: FraudRiskLevel;
  riskScore: number; // 0-100
  indicators: FraudIndicator[];
  activeFlags: string[];
  events: string[]; // FraudEvent IDs
  totalFlags: number;
  criticalFlags: number;
  lastFlagAt?: Date;
  lastReviewAt?: Date;
  reviewedBy?: string;
  status: 'active' | 'under_review' | 'cleared' | 'confirmed_fraud';
  createdAt: Date;
  updatedAt: Date;
}

const FraudEventSchema = new Schema<IFraudEvent>({
  eventId: { type: String, required: true, unique: true },
  clusterId: { type: String, required: true, index: true },
  indicator: {
    type: String,
    enum: Object.values(FraudIndicator),
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  details: { type: Map, of: Schema.Types.Mixed, default: {} },
  source: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolvedBy: String,
  resolution: String,
}, { timestamps: true });

const FraudProfileSchema = new Schema<IFraudProfile>({
  clusterId: { type: String, required: true, unique: true, index: true },
  riskLevel: {
    type: String,
    enum: Object.values(FraudRiskLevel),
    default: FraudRiskLevel.NONE
  },
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  indicators: [{
    type: String,
    enum: Object.values(FraudIndicator)
  }],
  activeFlags: [String],
  events: [{ type: String, ref: 'FraudEvent' }],
  totalFlags: { type: Number, default: 0 },
  criticalFlags: { type: Number, default: 0 },
  lastFlagAt: Date,
  lastReviewAt: Date,
  reviewedBy: String,
  status: {
    type: String,
    enum: ['active', 'under_review', 'cleared', 'confirmed_fraud'],
    default: 'active'
  },
}, { timestamps: true });

// Calculate risk level from score
FraudProfileSchema.methods.calculateRiskLevel = function(): FraudRiskLevel {
  const score = this.riskScore;
  if (score >= 80) return FraudRiskLevel.CRITICAL;
  if (score >= 60) return FraudRiskLevel.HIGH;
  if (score >= 40) return FraudRiskLevel.MEDIUM;
  if (score >= 20) return FraudRiskLevel.LOW;
  return FraudRiskLevel.NONE;
};

// Add fraud event
FraudProfileSchema.methods.addFraudEvent = async function(eventId: string, indicator: FraudIndicator, severity: string) {
  if (!this.events.includes(eventId)) {
    this.events.push(eventId);
  }
  if (!this.indicators.includes(indicator)) {
    this.indicators.push(indicator);
  }
  this.totalFlags += 1;
  this.lastFlagAt = new Date();

  if (severity === 'critical') {
    this.criticalFlags += 1;
  }

  // Recalculate risk score
  this.riskScore = Math.min(100, this.riskScore + this.getRiskIncrement(indicator));
  this.riskLevel = this.calculateRiskLevel();

  await this.save();
};

FraudProfileSchema.methods.getRiskIncrement = function(indicator: FraudIndicator): number {
  const increments: Record<FraudIndicator, number> = {
    [FraudIndicator.SANCTIONS_MATCH]: 50,
    [FraudIndicator.IDENTITY_MISMATCH]: 40,
    [FraudIndicator.CHARGEBACK_HISTORY]: 35,
    [FraudIndicator.BOT_BEHAVIOR]: 30,
    [FraudIndicator.RAPID_TRANSACTIONS]: 20,
    [FraudIndicator.VELOCITY_ANOMALY]: 20,
    [FraudIndicator.MULTIPLE_ACCOUNTS]: 25,
    [FraudIndicator.UNUSUAL_LOCATION]: 15,
    [FraudIndicator.DEVICE_MISMATCH]: 15,
    [FraudIndicator.PROXY_VPN_USAGE]: 15,
    [FraudIndicator.PATTERN_ANOMALY]: 10,
    [FraudIndicator.PHANTOM_ACCOUNTS]: 20,
  };
  return increments[indicator] || 10;
};

export const FraudEvent = mongoose.model<IFraudEvent>('FraudEvent', FraudEventSchema);
export const FraudProfile = mongoose.model<IFraudProfile>('FraudProfile', FraudProfileSchema);
