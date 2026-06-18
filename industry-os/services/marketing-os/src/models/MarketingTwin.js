/**
 * Marketing OS - Marketing Twin Model
 */

const mongoose = require('mongoose');

const marketingTwinSchema = new mongoose.Schema({
  twinId: { type: String, unique: true },
  type: { type: String, enum: ['campaign', 'audience', 'brand', 'channel', 'journey', 'lead', 'segment', 'competitor', 'creator', 'event', 'budget', 'product'], required: true },
  reference: { entityId: mongoose.Schema.Types.ObjectId, collection: String, name: String },
  organizationId: String,
  data: mongoose.Schema.Types.Mixed,
  analytics: { totalEvents: { type: Number, default: 0 }, lastActivity: Date, healthScore: { type: Number, default: 100 } },
  relationships: [{ twinId: String, type: String, strength: { type: Number, default: 1 } }],
  insights: [{ type: { type: String, enum: ['opportunity', 'risk', 'recommendation', 'prediction'] }, title: String, description: String, confidence: Number, createdAt: Date }],
  ml: { predictions: mongoose.Schema.Types.Mixed, clusters: [String], nextBestAction: String },
  version: { type: Number, default: 1 },
  lastSynced: Date,
  status: { type: String, enum: ['active', 'archived', 'syncing'], default: 'active' },
}, { timestamps: true });

marketingTwinSchema.pre('save', function(next) {
  if (!this.twinId) {
    const prefix = this.type.substring(0, 3).toUpperCase();
    this.twinId = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
  }
  this.lastSynced = new Date();
  this.version += 1;
  next();
});

marketingTwinSchema.methods.addInsight = function(insight) {
  this.insights.push({ ...insight, createdAt: new Date() });
  return this;
};

marketingTwinSchema.methods.calculateHealthScore = function() {
  let score = 100;
  if (this.analytics.lastActivity) {
    const daysSince = Math.floor((Date.now() - this.analytics.lastActivity) / (1000 * 60 * 60 * 24));
    if (daysSince > 30) score -= 50;
    else if (daysSince > 7) score -= 20;
  }
  const criticalInsights = this.insights.filter(i => i.type === 'risk');
  score -= criticalInsights.length * 10;
  this.analytics.healthScore = Math.max(0, Math.min(100, score));
  return this.analytics.healthScore;
};

marketingTwinSchema.statics.getRelated = function(twinId) {
  return this.find({ 'relationships.twinId': twinId });
};

const MarketingTwin = mongoose.model('MarketingTwin', marketingTwinSchema);
module.exports = MarketingTwin;
