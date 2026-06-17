/**
 * Marketing OS - Marketing Twin Model
 * Digital twins for marketing intelligence
 */

const mongoose = require('mongoose');

const marketingTwinSchema = new mongoose.Schema({
  // Twin ID
  twinId: { type: String, unique: true },

  // Twin Type
  type: {
    type: String,
    enum: [
      'campaign',
      'audience',
      'brand',
      'channel',
      'journey',
      'lead',
      'segment',
      'competitor',
      'creator',
      'event',
      'budget',
      'product',
    ],
    required: true,
  },

  // Reference to actual entity
  reference: {
    entityId: mongoose.Schema.Types.ObjectId,
    collection: String,
    name: String,
  },

  // Organization
  organizationId: String,

  // Core Data
  data: mongoose.Schema.Types.Mixed,

  // Analytics
  analytics: {
    totalEvents: { type: Number, default: 0 },
    lastActivity: Date,
    activityTrend: String,
    healthScore: { type: Number, default: 100 },
  },

  // Relationships
  relationships: [{
    twinId: String,
    type: String,
    strength: { type: Number, default: 1 },
  }],

  // AI Insights
  insights: [{
    type: { type: String, enum: ['opportunity', 'risk', 'recommendation', 'prediction'] },
    title: String,
    description: String,
    confidence: Number,
    action: String,
    createdAt: Date,
  }],

  // Machine Learning
  ml: {
    predictions: mongoose.Schema.Types.Mixed,
    clusters: [String],
    propensityScores: mongoose.Schema.Types.Mixed,
    nextBestAction: String,
  },

  // Version
  version: { type: Number, default: 1 },
  lastSynced: Date,

  // Status
  status: { type: String, enum: ['active', 'archived', 'syncing'], default: 'active' },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Generate twin ID
marketingTwinSchema.pre('save', function(next) {
  if (!this.twinId) {
    const prefix = this.type.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    this.twinId = `${prefix}-${timestamp}`;
  }

  this.lastSynced = new Date();
  this.version += 1;

  next();
});

// Indexes
marketingTwinSchema.index({ twinId: 1 }, { unique: true });
marketingTwinSchema.index({ type: 1 });
marketingTwinSchema.index({ organizationId: 1 });
marketingTwinSchema.index({ 'reference.entityId': 1 });

// Virtuals
marketingTwinSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Methods
marketingTwinSchema.methods.updateData = function(newData) {
  this.data = { ...this.data, ...newData };
  this.analytics.lastActivity = new Date();
  return this;
};

marketingTwinSchema.methods.addInsight = function(insight) {
  this.insights.push({
    ...insight,
    createdAt: new Date(),
  });
  return this;
};

marketingTwinSchema.methods.addRelationship = function(twinId, type, strength = 1) {
  const existing = this.relationships.find(r => r.twinId === twinId);
  if (existing) {
    existing.strength = strength;
  } else {
    this.relationships.push({ twinId, type, strength });
  }
  return this;
};

marketingTwinSchema.methods.calculateHealthScore = function() {
  let score = 100;

  // Activity-based scoring
  if (!this.analytics.lastActivity) {
    score -= 20;
  } else {
    const daysSinceActivity = Math.floor((Date.now() - this.analytics.lastActivity) / (1000 * 60 * 60 * 24));
    if (daysSinceActivity > 30) score -= 50;
    else if (daysSinceActivity > 7) score -= 20;
  }

  // Insight-based scoring
  const criticalInsights = this.insights.filter(i => i.type === 'risk');
  score -= criticalInsights.length * 10;

  this.analytics.healthScore = Math.max(0, Math.min(100, score));
  return this.analytics.healthScore;
};

// Statics
marketingTwinSchema.statics.findByType = function(type, orgId) {
  return this.find({ type, organizationId: orgId });
};

marketingTwinSchema.statics.getRelated = function(twinId) {
  const twin = this.findOne({ twinId });
  if (!twin) return [];

  const relatedIds = twin.relationships.map(r => r.twinId);
  return this.find({ twinId: { $in: relatedIds } });
};

marketingTwinSchema.statics.syncFromEntity = async function(type, entityId, collection, orgId) {
  const entity = await mongoose.model(collection).findById(entityId);
  if (!entity) return null;

  const twin = await this.findOne({ 'reference.entityId': entityId });
  if (twin) {
    twin.data = entity.toObject();
    twin.analytics.lastActivity = new Date();
    await twin.save();
    return twin;
  }

  const newTwin = new this({
    type,
    reference: { entityId, collection, name: entity.name || entity.title },
    organizationId: orgId,
    data: entity.toObject(),
  });
  await newTwin.save();
  return newTwin;
};

// Create twin factory methods
marketingTwinSchema.statics.createCampaignTwin = async function(campaign, orgId) {
  return this.syncFromEntity('campaign', campaign._id, 'Campaign', orgId);
};

marketingTwinSchema.statics.createAudienceTwin = async function(audience, orgId) {
  return this.syncFromEntity('audience', audience._id, 'Audience', orgId);
};

marketingTwinSchema.statics.createLeadTwin = async function(lead, orgId) {
  return this.syncFromEntity('lead', lead._id, 'Lead', orgId);
};

const MarketingTwin = mongoose.model('MarketingTwin', marketingTwinSchema);

module.exports = MarketingTwin;
