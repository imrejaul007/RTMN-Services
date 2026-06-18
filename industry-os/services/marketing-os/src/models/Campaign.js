/**
 * Marketing OS - Campaign Model
 */

const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  campaignId: { type: String, unique: true },
  name: { type: String, required: true },
  title: String,
  description: String,
  brief: String,
  type: { type: String, enum: ['awareness', 'consideration', 'conversion', 'retargeting', 'brand', 'product_launch', 'seasonal', 'event', 'loyalty'], required: true },
  category: String,
  tags: [String],
  brandId: mongoose.Schema.Types.ObjectId,
  brandName: String,
  organizationId: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  budget: {
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    spent: { type: Number, default: 0 },
    remaining: Number,
  },
  channels: [{
    channel: String,
    enabled: { type: Boolean, default: true },
    budget: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    metrics: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
    },
  }],
  goals: [{
    type: { type: String, enum: ['impressions', 'clicks', 'conversions', 'reach', 'engagement', 'revenue'], required: true },
    target: { type: Number, required: true },
    current: { type: Number, default: 0 },
  }],
  targeting: {
    locations: [String],
    ageMin: Number,
    ageMax: Number,
    gender: [String],
    devices: [String],
  },
  performance: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
  },
  ai: {
    recommendations: [{
      type: String,
      text: String,
      impact: String,
      implemented: { type: Boolean, default: false },
      createdAt: Date,
    }],
  },
  integration: {
    adBazaarCampaignId: String,
  },
  status: { type: String, enum: ['planning', 'approved', 'launching', 'active', 'paused', 'completed', 'cancelled'], default: 'planning' },
  workflow: {
    planning: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    creative: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    targeting: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    budget: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    approval: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
}, { timestamps: true });

campaignSchema.pre('save', function(next) {
  if (!this.campaignId) {
    this.campaignId = `MKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  }
  this.budget.remaining = this.budget.total - this.budget.spent;
  next();
});

campaignSchema.methods.calculatePerformance = function() {
  const p = this.performance;
  p.ctr = p.clicks > 0 && p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0;
  p.cpc = p.clicks > 0 ? this.budget.spent / p.clicks : 0;
  p.roas = this.budget.spent > 0 ? p.revenue / this.budget.spent : 0;
  return this.performance;
};

campaignSchema.methods.addAIRecommendation = function(type, text, impact) {
  this.ai.recommendations.push({ type, text, impact, implemented: false, createdAt: new Date() });
  return this;
};

campaignSchema.methods.launch = function() {
  if (this.workflow.approval !== 'approved') throw new Error('Campaign must be approved');
  this.status = 'active';
  return this;
};

campaignSchema.methods.pause = function() { this.status = 'paused'; return this; };
campaignSchema.methods.complete = function() { this.status = 'completed'; return this; };

campaignSchema.statics.getStats = async function(orgId) {
  return this.aggregate([
    { $match: { organizationId: orgId } },
    { $group: { _id: '$status', count: { $sum: 1 }, totalBudget: { $sum: '$budget.total' }, totalSpent: { $sum: '$budget.spent' } } },
  ]);
};

const Campaign = mongoose.model('Campaign', campaignSchema);
module.exports = Campaign;
