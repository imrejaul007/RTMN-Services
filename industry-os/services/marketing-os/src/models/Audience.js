/**
 * Marketing OS - Audience Model
 * Customer segmentation and targeting
 */

const mongoose = require('mongoose');

const segmentRuleSchema = new mongoose.Schema({
  field: { type: String, required: true },
  operator: {
    type: String,
    enum: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'between', 'in', 'not_in', 'exists'],
    required: true,
  },
  value: mongoose.Schema.Types.Mixed,
  value2: mongoose.Schema.Types.Mixed, // For between operator
});

const audienceSchema = new mongoose.Schema({
  // Audience ID
  audienceId: { type: String, unique: true },

  // Basic Info
  name: { type: String, required: true },
  description: String,

  // Type
  type: {
    type: String,
    enum: ['behavioral', 'demographic', 'firmographic', 'psychographic', 'technographic', 'combined'],
    required: true,
  },

  // Organization
  organizationId: String,

  // Rules
  rules: {
    operator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    conditions: [segmentRuleSchema],
  },

  // Dynamic or Static
  isDynamic: { type: Boolean, default: true },

  // Membership
  members: [{
    memberId: String,
    joinedAt: { type: Date, default: Date.now },
  }],

  // Size
  size: {
    estimated: { type: Number, default: 0 },
    actual: { type: Number, default: 0 },
    lastCalculated: Date,
  },

  // Integration
  integration: {
    source: { type: String, enum: ['manual', 'import', 'website', 'app', 'crm', 'ecommerce', 'other'] },
    externalId: String,
    lastSync: Date,
  },

  // Quality Score
  quality: {
    score: { type: Number, default: 100 },
    engagement: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
  },

  // Privacy
  privacy: {
    anonymized: { type: Boolean, default: false },
    consentRequired: { type: Boolean, default: true },
    dataRetention: Number, // days
  },

  // Tags
  tags: [String],

  // AdBazaar Integration
  adBazaar: {
    segmentId: String,
    synced: { type: Boolean, default: false },
    lastSync: Date,
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'syncing'],
    default: 'active',
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Generate audience ID
audienceSchema.pre('save', function(next) {
  if (!this.audienceId) {
    const prefix = 'AUD';
    const timestamp = Date.now().toString(36).toUpperCase();
    this.audienceId = `${prefix}-${timestamp}`;
  }
  next();
});

// Indexes
audienceSchema.index({ audienceId: 1 }, { unique: true });
audienceSchema.index({ organizationId: 1 });
audienceSchema.index({ type: 1 });
audienceSchema.index({ status: 1 });
audienceSchema.index({ tags: 1 });

// Virtuals
audienceSchema.virtual('qualityScore').get(function() {
  return this.quality?.score || 0;
});

// Methods
audienceSchema.methods.calculateSize = async function() {
  // In production, this would query actual data
  this.size.actual = Math.floor(Math.random() * 10000);
  this.size.lastCalculated = new Date();
  return this.size;
};

audienceSchema.methods.addMember = function(memberId) {
  const existing = this.members.find(m => m.memberId === memberId);
  if (!existing) {
    this.members.push({ memberId, joinedAt: new Date() });
  }
  return this;
};

audienceSchema.methods.removeMember = function(memberId) {
  this.members = this.members.filter(m => m.memberId !== memberId);
  return this;
};

audienceSchema.methods.syncWithAdBazaar = async function(segmentId) {
  this.adBazaar = {
    segmentId,
    synced: true,
    lastSync: new Date(),
  };
  return this.save();
};

// Statics
audienceSchema.statics.findByOrg = function(orgId) {
  return this.find({ organizationId: orgId, status: 'active' });
};

audienceSchema.statics.getSegments = async function(orgId) {
  return this.aggregate([
    { $match: { organizationId: orgId, status: 'active' } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalSize: { $sum: '$size.estimated' },
      },
    },
  ]);
};

const Audience = mongoose.model('Audience', audienceSchema);

module.exports = Audience;
