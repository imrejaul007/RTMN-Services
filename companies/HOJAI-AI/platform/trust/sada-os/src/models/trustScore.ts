/**
 * SADA - Trust Score Model
 *
 * Comprehensive trust tracking for all entity types
 */

import mongoose, { Schema, model } from 'mongoose';

// Trust Score Schema
const trustScoreSchema = new Schema({
  trustId: { type: String, required: true, unique: true, index: true },
  entityId: { type: String, required: true, index: true },
  entityType: {
    type: String,
    enum: ['HUMAN', 'AGENT', 'BUSINESS', 'PRODUCT', 'ASSET', 'LOCATION'],
    required: true,
    index: true,
  },

  // Overall trust score (0-100)
  overallScore: { type: Number, default: 50, min: 0, max: 100 },

  // Multi-dimensional trust breakdown
  dimensions: {
    reliability: { type: Number, default: 50, min: 0, max: 100 },
    quality: { type: Number, default: 50, min: 0, max: 100 },
    responsiveness: { type: Number, default: 50, min: 0, max: 100 },
    safety: { type: Number, default: 50, min: 0, max: 100 },
    compliance: { type: Number, default: 50, min: 0, max: 100 },
    financial: { type: Number, default: 50, min: 0, max: 100 },    // Financial reliability
    technical: { type: Number, default: 50, min: 0, max: 100 },    // Technical competence
    social: { type: Number, default: 50, min: 0, max: 100 },       // Social credibility
  },

  // Transaction history
  history: {
    totalTransactions: { type: Number, default: 0 },
    successfulTransactions: { type: Number, default: 0 },
    failedTransactions: { type: Number, default: 0 },
    disputedTransactions: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },          // Total value
    avgResponseTime: { type: Number, default: 0 },        // In milliseconds
    lastActivity: Date,
    firstActivity: Date,
  },

  // Risk assessment
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  riskFactors: [{
    factor: String,
    contribution: Number,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  }],

  // Verification status
  verification: {
    level: { type: Number, enum: [0, 1, 2, 3], default: 0 },
    kycVerified: { type: Boolean, default: false },
    kybVerified: { type: Boolean, default: false },
    documentVerified: { type: Boolean, default: false },
    lastVerified: Date,
    verifiedBy: String,
  },

  // Trust network (who trusts this entity)
  trustNetwork: {
    totalTrustors: { type: Number, default: 0 },
    trustors: [{
      entityId: String,
      trustScore: Number,
      relationship: String,
      since: Date,
    }],
  },

  // Behavioral indicators
  behavior: {
    consistencyScore: Number,        // How consistent is behavior
    growthRate: Number,              // Trust growth over time
    volatilityScore: Number,         // How stable is trust
    responsivenessTrend: String,     // 'improving', 'stable', 'declining'
  },

  // Metadata
  metadata: {
    source: String,                  // How trust was calculated
    lastCalculation: Date,
    nextUpdate: Date,
    dataPoints: Number,              // Number of data points used
  },

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'REVOKED', 'PENDING_REVIEW'],
    default: 'ACTIVE',
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
trustScoreSchema.index({ entityId: 1, entityType: 1 }, { unique: true });
trustScoreSchema.index({ overallScore: -1 });
trustScoreSchema.index({ 'riskLevel': 1 });
trustScoreSchema.index({ 'verification.level': -1 });
trustScoreSchema.index({ 'history.lastActivity': -1 });
trustScoreSchema.index({ status: 1 });

// Pre-save middleware
trustScoreSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const TrustScore = model('TrustScore', trustScoreSchema);

// Trust History for tracking changes over time
const trustHistorySchema = new Schema({
  historyId: { type: String, required: true, unique: true, index: true },
  trustId: { type: String, required: true, index: true },
  entityId: { type: String, required: true, index: true },

  // Snapshot of trust at this point
  overallScore: Number,
  dimensions: mongoose.Schema.Types.Mixed,
  riskLevel: String,

  // What caused the change
  event: {
    type: {
      type: String,
      enum: ['TRANSACTION', 'REVIEW', 'VERIFICATION', 'DISPUTE', 'MANUAL', 'SYSTEM'],
    },
    transactionId: String,
    rating: Number,
    comment: String,
    previousScore: Number,
    newScore: Number,
    reason: String,
  },

  // Context
  context: {
    source: String,
    ip: String,
    userAgent: String,
  },

  createdAt: { type: Date, default: Date.now },
});

trustHistorySchema.index({ trustId: 1, createdAt: -1 });
trustHistorySchema.index({ entityId: 1, createdAt: -1 });

export const TrustHistory = model('TrustHistory', trustHistorySchema);

// Trust Relationship (directional trust between entities)
const trustRelationshipSchema = new Schema({
  relationshipId: { type: String, required: true, unique: true, index: true },
  trustorId: { type: String, required: true, index: true },    // Who trusts
  trusteeId: { type: String, required: true, index: true },    // Who is trusted

  // Relationship details
  relationship: {
    type: {
      type: String,
      enum: [
        'VENDOR', 'CUSTOMER', 'PARTNER', 'EMPLOYEE',
        'EMPLOYER', 'CONTRACTOR', 'REFERRAL', 'ENDORSEMENT',
        'COLLABORATION', 'INVESTMENT', 'GUARANTOR'
      ],
    },
    strength: { type: Number, default: 0.5 },    // 0-1
    verified: { type: Boolean, default: false },
    expiresAt: Date,
  },

  // Trust metrics for this specific relationship
  metrics: {
    directTrust: Number,
    indirectTrust: Number,    // Through network
    reliability: Number,
    responsiveness: Number,
    quality: Number,
  },

  // Reviews and ratings
  reviews: [{
    reviewerId: String,
    rating: Number,           // 1-5 stars
    comment: String,
    verified: Boolean,
    createdAt: { type: Date, default: Date.now },
  }],

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'ENDED', 'SUSPENDED'],
    default: 'ACTIVE',
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

trustRelationshipSchema.index({ trustorId: 1, trusteeId: 1 }, { unique: true });
trustRelationshipSchema.index({ trusteeId: 1 });

export const TrustRelationship = model('TrustRelationship', trustRelationshipSchema);

export default {
  TrustScore,
  TrustHistory,
  TrustRelationship,
};