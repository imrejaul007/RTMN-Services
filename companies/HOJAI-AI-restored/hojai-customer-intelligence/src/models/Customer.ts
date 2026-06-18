import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  CustomerIdentity,
  CustomerAddress,
  CustomerPreference,
  CustomerBehavior,
  CustomerMetrics,
  CustomerRiskScore,
  CustomerSegment,
  CustomerStatus,
  CustomerType,
  CustomerTier
} from '../types';

const CustomerIdentitySchema = new Schema<CustomerIdentity>({
  type: {
    type: String,
    enum: ['email', 'phone', 'device_id', 'cookie_id', 'account_id', 'external_id'],
    required: true
  },
  value: { type: String, required: true },
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const CustomerAddressSchema = new Schema<CustomerAddress>({
  street: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  type: {
    type: String,
    enum: ['billing', 'shipping', 'home', 'work'],
    required: true
  }
}, { _id: false });

const CustomerPreferenceSchema = new Schema<CustomerPreference>({
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  source: String,
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const CustomerBehaviorSchema = new Schema<CustomerBehavior>({
  event: { type: String, required: true },
  properties: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
  source: String,
  sessionId: String
}, { _id: false });

const RiskFactorSchema = new Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  weight: { type: Number, required: true },
  description: { type: String }
}, { _id: false });

const CustomerRiskScoreSchema = new Schema<CustomerRiskScore>({
  overall: { type: Number, default: 0, min: 0, max: 100 },
  fraudRisk: { type: Number, default: 0, min: 0, max: 100 },
  churnRisk: { type: Number, default: 0, min: 0, max: 100 },
  creditRisk: { type: Number, default: 0, min: 0, max: 100 },
  factors: [RiskFactorSchema],
  calculatedAt: { type: Date, default: Date.now }
}, { _id: false });

const CustomerSegmentSchema = new Schema<CustomerSegment>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  assignedAt: { type: Date, default: Date.now },
  source: String
}, { _id: false });

const CustomerMetricsSchema = new Schema<CustomerMetrics>({
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  averageOrderValue: { type: Number, default: 0 },
  lastOrderDate: Date,
  firstOrderDate: Date,
  lifetimeDays: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0, min: 0, max: 100 },
  activityDays: { type: Number, default: 0 },
  lastActivityDate: Date
}, { _id: false });

export interface ICustomer extends Document {
  customerId: string;
  masterId?: string;
  type: CustomerType;
  status: CustomerStatus;
  tier: CustomerTier;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  industry?: string;
  source: string;
  sourceDetails?: Record<string, unknown>;
  identities: CustomerIdentity[];
  addresses: CustomerAddress[];
  preferences: CustomerPreference[];
  behaviors: CustomerBehavior[];
  metrics: CustomerMetrics;
  riskScore: CustomerRiskScore;
  segments: CustomerSegment[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  calculateMetrics(): Promise<void>;
  calculateRiskScore(): Promise<void>;
  getFullName(): string;
  getPrimaryIdentity(): CustomerIdentity | undefined;
  to360(): Record<string, unknown>;
}

const CustomerSchema = new Schema<ICustomer>({
  customerId: {
    type: String,
    required: true,
    unique: true,
    default: () => `CUST-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  masterId: { type: String, index: true },
  type: {
    type: String,
    enum: ['individual', 'business', 'guest'],
    default: 'individual'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'churned', 'blocked'],
    default: 'active',
    index: true
  },
  tier: {
    type: String,
    enum: ['standard', 'premium', 'enterprise', 'vip'],
    default: 'standard'
  },
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, index: true },
  phone: { type: String, index: true },
  company: { type: String },
  title: { type: String },
  industry: { type: String },
  source: { type: String, required: true },
  sourceDetails: { type: Schema.Types.Mixed },
  identities: [CustomerIdentitySchema],
  addresses: [CustomerAddressSchema],
  preferences: [CustomerPreferenceSchema],
  behaviors: [CustomerBehaviorSchema],
  metrics: {
    type: CustomerMetricsSchema,
    default: () => ({
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      lifetimeDays: 0,
      engagementScore: 0,
      activityDays: 0
    })
  },
  riskScore: {
    type: CustomerRiskScoreSchema,
    default: () => ({
      overall: 0,
      fraudRisk: 0,
      churnRisk: 0,
      creditRisk: 0,
      factors: [],
      calculatedAt: new Date()
    })
  },
  segments: [CustomerSegmentSchema],
  tags: [{ type: String, index: true }],
  metadata: { type: Schema.Types.Mixed, default: {} },
  lastActivityAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CustomerSchema.index({ email: 1, phone: 1 });
CustomerSchema.index({ 'identities.value': 1 });
CustomerSchema.index({ 'metrics.totalRevenue': -1 });
CustomerSchema.index({ 'metrics.engagementScore': -1 });
CustomerSchema.index({ 'riskScore.overall': -1 });
CustomerSchema.index({ createdAt: -1 });
CustomerSchema.index({ status: 1, tier: 1 });
CustomerSchema.index({ tags: 1 });

// Virtual for full name
CustomerSchema.virtual('fullName').get(function() {
  const parts = [this.firstName, this.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
});

// Methods
CustomerSchema.methods.getFullName = function(): string {
  const parts = [this.firstName, this.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
};

CustomerSchema.methods.getPrimaryIdentity = function(): CustomerIdentity | undefined {
  // Priority: email > phone > first identity
  const emailIdentity = this.identities.find(id => id.type === 'email' && id.verified);
  if (emailIdentity) return emailIdentity;

  const phoneIdentity = this.identities.find(id => id.type === 'phone' && id.verified);
  if (phoneIdentity) return phoneIdentity;

  return this.identities[0];
};

CustomerSchema.methods.calculateMetrics = async function(): Promise<void> {
  const behaviors = this.behaviors || [];
  const now = new Date();
  const createdAt = this.createdAt;

  // Calculate lifetime days
  const lifetimeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate activity days (unique days with activity)
  const activityDates = new Set(
    behaviors.map(b => b.timestamp.toISOString().split('T')[0])
  );

  // Calculate engagement score based on various factors
  const recencyScore = Math.max(0, 100 - Math.floor(
    (now.getTime() - (this.lastActivityAt?.getTime() || createdAt.getTime())) / (1000 * 60 * 60 * 24)
  ));

  const activityScore = Math.min(100, activityDates.size * 5);
  const orderScore = this.metrics.totalOrders > 0
    ? Math.min(100, this.metrics.totalOrders * 10)
    : 0;

  const engagementScore = Math.round((recencyScore * 0.4 + activityScore * 0.3 + orderScore * 0.3));

  this.metrics = {
    ...this.metrics,
    lifetimeDays,
    activityDays: activityDates.size,
    engagementScore,
    lastActivityDate: this.lastActivityAt
  };

  // Update status based on activity
  const daysSinceActivity = Math.floor(
    (now.getTime() - (this.lastActivityAt?.getTime() || this.createdAt.getTime())) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceActivity > 365 && this.status !== 'churned') {
    this.status = 'churned';
  } else if (daysSinceActivity > 90 && this.status === 'active') {
    this.status = 'inactive';
  }
};

CustomerSchema.methods.calculateRiskScore = async function(): Promise<void> {
  const factors: Array<{ name: string; score: number; weight: number; description: string }> = [];

  // Fraud risk factors
  let fraudScore = 0;
  if (this.behaviors.some(b => b.event.includes('fraud') || b.event.includes('suspicious'))) {
    fraudScore += 80;
    factors.push({
      name: 'suspicious_activity_history',
      score: 80,
      weight: 0.3,
      description: 'Previous suspicious activity detected'
    });
  }

  // Check for multiple identities (potential fraud indicator)
  const uniqueIdentities = new Set(this.identities.map(i => `${i.type}:${i.value}`)).size;
  if (uniqueIdentities > 5) {
    fraudScore += 20;
    factors.push({
      name: 'multiple_identities',
      score: 20,
      weight: 0.2,
      description: 'High number of linked identities'
    });
  }

  // Unverified identities
  const unverifiedCount = this.identities.filter(i => !i.verified).length;
  if (unverifiedCount > 0) {
    fraudScore += Math.min(30, unverifiedCount * 10);
    factors.push({
      name: 'unverified_identities',
      score: Math.min(30, unverifiedCount * 10),
      weight: 0.2,
      description: `${unverifiedCount} unverified identity(ies)`
    });
  }

  // Churn risk factors
  let churnScore = 0;
  const daysSinceActivity = Math.floor(
    (Date.now() - (this.lastActivityAt?.getTime() || this.createdAt.getTime())) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceActivity > 90) {
    churnScore += 60;
    factors.push({
      name: 'inactive_90_days',
      score: 60,
      weight: 0.4,
      description: 'No activity in 90+ days'
    });
  } else if (daysSinceActivity > 30) {
    churnScore += 30;
    factors.push({
      name: 'inactive_30_days',
      score: 30,
      weight: 0.3,
      description: 'No activity in 30+ days'
    });
  }

  // Low engagement score
  if (this.metrics.engagementScore < 30) {
    churnScore += 25;
    factors.push({
      name: 'low_engagement',
      score: 25,
      weight: 0.3,
      description: 'Engagement score below 30'
    });
  }

  // Credit risk factors
  let creditScore = 0;
  if (this.tier === 'vip' && this.metrics.totalRevenue > 100000) {
    creditScore = 10;
    factors.push({
      name: 'high_value_vip',
      score: -20,
      weight: 0.3,
      description: 'High-value VIP customer'
    });
  }

  // Recency of large orders
  const recentHighValueOrders = this.behaviors.filter(
    b => b.event === 'order_completed' &&
    (b.properties?.total as number) > 1000 &&
    (Date.now() - b.timestamp.getTime()) < 30 * 24 * 60 * 60 * 1000
  ).length;

  if (recentHighValueOrders > 3) {
    creditScore += 15;
    factors.push({
      name: 'recent_high_value_orders',
      score: 15,
      weight: 0.2,
      description: `${recentHighValueOrders} high-value orders in last 30 days`
    });
  }

  // Blocked status
  if (this.status === 'blocked') {
    fraudScore = 100;
    creditScore = 100;
    factors.push({
      name: 'blocked_account',
      score: 100,
      weight: 0.5,
      description: 'Account is blocked'
    });
  }

  // Calculate overall score
  const overallScore = Math.round(
    fraudScore * 0.4 + churnScore * 0.35 + creditScore * 0.25
  );

  this.riskScore = {
    overall: Math.min(100, Math.max(0, overallScore)),
    fraudRisk: Math.min(100, Math.max(0, fraudScore)),
    churnRisk: Math.min(100, Math.max(0, churnScore)),
    creditRisk: Math.min(100, Math.max(0, creditScore)),
    factors,
    calculatedAt: new Date()
  };
};

CustomerSchema.methods.to360 = function(): Record<string, unknown> {
  return {
    id: this.customerId,
    masterId: this.masterId,
    type: this.type,
    status: this.status,
    tier: this.tier,
    profile: {
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.getFullName(),
      email: this.email,
      phone: this.phone,
      company: this.company,
      title: this.title,
      industry: this.industry,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    },
    identities: this.identities,
    addresses: this.addresses,
    preferences: this.preferences,
    metrics: this.metrics,
    riskScore: this.riskScore,
    segments: this.segments,
    tags: this.tags,
    metadata: this.metadata
  };
};

// Static methods
CustomerSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

CustomerSchema.statics.findByPhone = function(phone: string) {
  return this.findOne({ phone: phone.replace(/\D/g, '') });
};

CustomerSchema.statics.findByCustomerId = function(customerId: string) {
  return this.findOne({ customerId });
};

CustomerSchema.statics.findByIdentity = function(type: string, value: string) {
  return this.findOne({
    'identities': { $elemMatch: { type, value: value.toLowerCase() } }
  });
};

CustomerSchema.statics.findMasterCustomer = function(masterId: string) {
  return this.find({ $or: [{ customerId: masterId }, { masterId }] });
};

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
