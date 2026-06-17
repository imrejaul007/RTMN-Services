/**
 * EcosystemProfile Model
 * Unified cross-ecosystem customer profile
 */

import mongoose, { Document, Schema } from 'mongoose';

// Sub-schemas for service summaries
const HojaiSummarySchema = new Schema({
  userId: String,
  genieInteractions: { type: Number, default: 0 },
  memoryUsage: { type: String, enum: ['high', 'medium', 'low'], default: 'low' },
  aiPreferences: { type: Map, of: Schema.Types.Mixed },
  lastInteraction: Date,
}, { _id: false });

const RezSummarySchema = new Schema({
  consumerId: String,
  merchantId: String,
  totalOrders: { type: Number, default: 0 },
  totalSpend: { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  favoriteCategories: [String],
  lastOrderDate: Date,
  paymentMethods: [String],
}, { _id: false });

const StayownSummarySchema = new Schema({
  guestId: String,
  stays: { type: Number, default: 0 },
  totalNights: { type: Number, default: 0 },
  loyaltyTier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  roomPreferences: [String],
  amenitiesUsed: [String],
  lastStay: Date,
}, { _id: false });

const AdbazaarSummarySchema = new Schema({
  profileId: String,
  adsViewed: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  campaignsJoined: [String],
  loyaltyPoints: { type: Number, default: 0 },
  interests: [String],
}, { _id: false });

const CorpIDSummarySchema = new Schema({
  userId: String,
  verified: { type: Boolean, default: false },
  verificationLevel: { type: String, enum: ['basic', 'verified', 'premium'], default: 'basic' },
  linkedServices: [String],
  trustScore: { type: Number, default: 0 },
}, { _id: false });

const ServiceSummariesSchema = new Schema({
  hojai: HojaiSummarySchema,
  rez: RezSummarySchema,
  stayown: StayownSummarySchema,
  adbazaar: AdbazaarSummarySchema,
  corpid: CorpIDSummarySchema,
}, { _id: false });

const EngagementSchema = new Schema({
  totalInteractions: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
  activityFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'rare'], default: 'rare' },
  preferredServices: [String],
  engagementScore: { type: Number, default: 0, min: 0, max: 100 },
}, { _id: false });

const IdentityConflictSchema = new Schema({
  field: String,
  values: [{
    source: String,
    value: Schema.Types.Mixed,
  }],
  resolvedValue: Schema.Types.Mixed,
}, { _id: false });

const IdentityResolutionSchema = new Schema({
  confidence: { type: Number, default: 0, min: 0, max: 100 },
  resolvedAt: Date,
  sources: [String],
  conflicts: [IdentityConflictSchema],
}, { _id: false });

const IdentifiersSchema = new Schema({
  corpidUserId: String,
  hojaiGenieId: String,
  rezConsumerId: String,
  rezMerchantId: String,
  stayownGuestId: String,
  adbazaarProfileId: String,
  email: String,
  phone: String,
}, { _id: false });

const ProfileDataSchema = new Schema({
  name: {
    first: String,
    last: String,
    full: String,
  },
  email: String,
  phone: String,
  avatar: String,
  language: String,
  timezone: String,
  preferences: { type: Map, of: Schema.Types.Mixed },
}, { _id: false });

// Main EcosystemProfile Schema
const EcosystemProfileSchema = new Schema({
  profileId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
  identifiers: {
    type: IdentifiersSchema,
    required: true,
  },
  profile: {
    type: ProfileDataSchema,
    required: true,
  },
  serviceSummaries: {
    type: ServiceSummariesSchema,
    default: () => ({}),
  },
  engagement: {
    type: EngagementSchema,
    required: true,
    default: () => ({}),
  },
  identityResolution: {
    type: IdentityResolutionSchema,
    required: true,
    default: () => ({ confidence: 0, sources: [] }),
  },
  version: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
EcosystemProfileSchema.index({ tenantId: 1, 'identifiers.email': 1 });
EcosystemProfileSchema.index({ tenantId: 1, 'identifiers.phone': 1 });
EcosystemProfileSchema.index({ tenantId: 1, 'engagement.engagementScore': -1 });
EcosystemProfileSchema.index({ tenantId: 1, 'engagement.activityFrequency': 1 });

// Virtual for getting primary identifier
EcosystemProfileSchema.virtual('primaryIdentifier').get(function() {
  if (this.identifiers.corpidUserId) return { type: 'corpid', value: this.identifiers.corpidUserId };
  if (this.identifiers.rezConsumerId) return { type: 'rez-consumer', value: this.identifiers.rezConsumerId };
  if (this.identifiers.email) return { type: 'email', value: this.identifiers.email };
  if (this.identifiers.phone) return { type: 'phone', value: this.identifiers.phone };
  return null;
});

// Method to calculate engagement score
EcosystemProfileSchema.methods.calculateEngagementScore = function(): number {
  const engagement = this.engagement;
  let score = 0;

  // Recency factor (up to 30 points)
  const daysSinceActivity = Math.floor((Date.now() - new Date(engagement.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  score += Math.max(0, 30 - daysSinceActivity);

  // Frequency factor (up to 30 points)
  const frequencyScores = { daily: 30, weekly: 20, monthly: 10, rare: 0 };
  score += frequencyScores[engagement.activityFrequency] || 0;

  // Interactions factor (up to 20 points)
  score += Math.min(20, engagement.totalInteractions / 10);

  // Preferred services count (up to 20 points)
  score += Math.min(20, engagement.preferredServices.length * 5);

  return Math.round(score);
};

// Method to add interaction
EcosystemProfileSchema.methods.recordInteraction = async function(service: string) {
  this.engagement.totalInteractions += 1;
  this.engagement.lastActivity = new Date();

  if (!this.engagement.preferredServices.includes(service)) {
    this.engagement.preferredServices.push(service);
  }

  this.engagement.engagementScore = this.calculateEngagementScore();
  await this.save();
};

// Method to merge identifiers from another profile
EcosystemProfileSchema.methods.mergeIdentifiers = async function(otherProfile: any, confidenceBoost: number = 10) {
  const identifiers = this.identifiers;
  const otherIdentifiers = otherProfile.identifiers;

  // Merge non-empty identifiers
  Object.keys(otherIdentifiers).forEach(key => {
    if (otherIdentifiers[key] && !identifiers[key]) {
      identifiers[key] = otherIdentifiers[key];
    }
  });

  // Update identity resolution
  this.identityResolution.confidence = Math.min(100, this.identityResolution.confidence + confidenceBoost);
  this.identityResolution.resolvedAt = new Date();
  this.identityResolution.sources = [...new Set([...this.identityResolution.sources, ...otherProfile.identityResolution.sources])];

  await this.save();
};

// Static method to find or create profile
EcosystemProfileSchema.statics.findOrCreate = async function(
  tenantId: string,
  identifiers: Record<string, string>
) {
  let profile = await this.findOne({
    tenantId,
    $or: [
      { 'identifiers.email': identifiers.email },
      { 'identifiers.phone': identifiers.phone },
      { 'identifiers.corpidUserId': identifiers.corpidUserId },
      { 'identifiers.rezConsumerId': identifiers.rezConsumerId },
    ],
  });

  if (!profile) {
    profile = await this.create({
      profileId: `EP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      identifiers,
      profile: {
        name: {},
      },
      engagement: {
        totalInteractions: 0,
        lastActivity: new Date(),
        activityFrequency: 'rare',
        preferredServices: [],
        engagementScore: 0,
      },
      identityResolution: {
        confidence: 0,
        sources: [],
      },
    });
  }

  return profile;
};

// Static method for identity resolution
EcosystemProfileSchema.statics.resolveIdentity = async function(
  tenantId: string,
  identifiers: Record<string, string>
): Promise<{ profile: any; isNew: boolean; confidence: number }> {
  const existingProfile = await this.findOne({
    tenantId,
    $or: [
      { 'identifiers.email': identifiers.email },
      { 'identifiers.phone': identifiers.phone },
      { 'identifiers.corpidUserId': identifiers.corpidUserId },
      { 'identifiers.hojaiGenieId': identifiers.hojaiGenieId },
      { 'identifiers.rezConsumerId': identifiers.rezConsumerId },
    ],
  });

  if (existingProfile) {
    // Update identifiers if new ones are provided
    let confidenceBoost = 0;
    Object.keys(identifiers).forEach(key => {
      if (identifiers[key] && !existingProfile.identifiers[key]) {
        existingProfile.identifiers[key] = identifiers[key];
        confidenceBoost += 5;
      }
    });

    if (confidenceBoost > 0) {
      existingProfile.identityResolution.confidence = Math.min(100, existingProfile.identityResolution.confidence + confidenceBoost);
      existingProfile.identityResolution.resolvedAt = new Date();
      await existingProfile.save();
    }

    return {
      profile: existingProfile,
      isNew: false,
      confidence: existingProfile.identityResolution.confidence,
    };
  }

  // Create new profile
  const newProfile = await this.create({
    profileId: `EP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    identifiers,
    profile: {
      name: {},
    },
    engagement: {
      totalInteractions: 0,
      lastActivity: new Date(),
      activityFrequency: 'rare',
      preferredServices: [],
      engagementScore: 0,
    },
    identityResolution: {
      confidence: Object.keys(identifiers).length * 20, // Higher confidence with more identifiers
      sources: Object.keys(identifiers),
    },
  });

  return {
    profile: newProfile,
    isNew: true,
    confidence: newProfile.identityResolution.confidence,
  };
};

export const EcosystemProfile = mongoose.model('EcosystemProfile', EcosystemProfileSchema);
