/**
 * Marketing OS - Campaign Model
 * Enterprise campaign planning and management
 */

const mongoose = require('mongoose');

const campaignChannelSchema = new mongoose.Schema({
  channel: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  adBazaarCampaignId: String,
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    ctr: Number,
    cpc: Number,
    cpm: Number,
    roas: Number,
  },
}, { _id: true });

const campaignGoalSchema = new mongoose.Schema({
  type: { type: String, enum: ['impressions', 'clicks', 'conversions', 'reach', 'engagement', 'revenue'], required: true },
  target: { type: Number, required: true },
  current: { type: Number, default: 0 },
  unit: String,
}, { _id: true });

const campaignTeamSchema = new mongoose.Schema({
  userId: String,
  name: String,
  email: String,
  role: { type: String, enum: ['owner', 'manager', 'analyst', 'designer', 'content'], default: 'member' },
  permissions: [String],
}, { _id: true });

const campaignTimelineSchema = new mongoose.Schema({
  planning: {
    start: Date,
    end: Date,
  },
  execution: {
    start: Date,
    end: Date,
  },
  optimization: {
    start: Date,
    end: Date,
  },
  evaluation: {
    start: Date,
    end: Date,
  },
});

const campaignSchema = new mongoose.Schema({
  // Campaign ID
  campaignId: { type: String, unique: true },

  // Basic Info
  name: { type: String, required: true },
  title: String,
  description: String,
  brief: String,

  // Type & Category
  type: {
    type: String,
    enum: ['awareness', 'consideration', 'conversion', 'retargeting', 'brand', 'product_launch', 'seasonal', 'event', 'loyalty'],
    required: true,
  },
  category: String,
  tags: [String],

  // Brand
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  brandName: String,

  // Organization
  organizationId: String,

  // Timeline
  timeline: campaignTimelineSchema,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // Goals & KPIs
  goals: [campaignGoalSchema],
  primaryGoal: String,

  // Budget
  budget: {
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    spent: { type: Number, default: 0 },
    remaining: Number,
    allocation: {
      media: { type: Number, default: 80 },
      content: { type: Number, default: 10 },
      production: { type: Number, default: 5 },
      other: { type: Number, default: 5 },
    },
  },

  // Channels
  channels: [campaignChannelSchema],

  // Audience
  audience: {
    segmentId: String,
    description: String,
    demographics: mongoose.Schema.Types.Mixed,
    interests: [String],
    behaviors: [String],
    customAttributes: mongoose.Schema.Types.Mixed,
  },

  // Targeting (AdBazaar)
  targeting: {
    locations: [String],
    ageMin: Number,
    ageMax: Number,
    gender: [String],
    devices: [String],
    platforms: [String],
    customAudiences: [String],
    lookalike: Boolean,
    lookalikePercentage: Number,
  },

  // Content
  content: {
    requiredAssets: [{
      type: { type: String, enum: ['video', 'image', 'copy', 'landing_page'] },
      format: String,
      specifications: String,
      quantity: Number,
    }],
    createdAssets: [{
      assetId: String,
      type: String,
      url: String,
      status: { type: String, enum: ['draft', 'ready', 'approved', 'rejected'] },
      createdAt: Date,
    }],
    mediaRequestId: String,
  },

  // Team
  team: [campaignTeamSchema],

  // Status & Workflow
  status: {
    type: String,
    enum: ['planning', 'approved', 'launching', 'active', 'paused', 'completed', 'cancelled'],
    default: 'planning',
  },
  workflow: {
    planning: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    creative: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    targeting: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    budget: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    approval: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },

  // Performance
  performance: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    cpm: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
    cpa: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    frequency: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
  },

  // AI Recommendations
  ai: {
    recommendations: [{
      type: String,
      text: String,
      impact: String,
      implemented: { type: Boolean, default: false },
      createdAt: Date,
    }],
    optimizationScore: { type: Number, default: 0 },
  },

  // Attribution
  attribution: {
    model: { type: String, enum: ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based', 'data_driven'], default: 'last_touch' },
    window: Number,
  },

  // Integration
  integration: {
    mediaOsRequestId: String,
    adBazaarCampaignId: String,
    salesOsCampaignId: String,
  },

  // Notes
  notes: String,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Generate campaign ID
campaignSchema.pre('save', function(next) {
  if (!this.campaignId) {
    const prefix = 'MKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.campaignId = `${prefix}-${timestamp}-${random}`;
  }

  this.budget.remaining = this.budget.total - this.budget.spent;

  next();
});

// Indexes
campaignSchema.index({ campaignId: 1 }, { unique: true });
campaignSchema.index({ organizationId: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ type: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });
campaignSchema.index({ brandId: 1 });

// Virtuals
campaignSchema.virtual('duration').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

campaignSchema.virtual('budgetUtilization').get(function() {
  if (this.budget.total === 0) return 0;
  return (this.budget.spent / this.budget.total) * 100;
});

campaignSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && this.startDate <= now && this.endDate >= now;
});

campaignSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  return Math.max(0, Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24)));
});

// Methods
campaignSchema.methods.calculatePerformance = function() {
  const p = this.performance;

  p.ctr = p.clicks > 0 && p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0;
  p.cpm = p.impressions > 0 ? (this.budget.spent / p.impressions) * 1000000 : 0;
  p.cpc = p.clicks > 0 ? this.budget.spent / p.clicks : 0;
  p.roas = this.budget.spent > 0 ? p.revenue / this.budget.spent : 0;
  p.cpa = p.conversions > 0 ? this.budget.spent / p.conversions : 0;

  return this.performance;
};

campaignSchema.methods.addChannel = function(channelData) {
  const existing = this.channels.find(c => c.channel === channelData.channel);
  if (existing) {
    Object.assign(existing, channelData);
  } else {
    this.channels.push(channelData);
  }
  return this;
};

campaignSchema.methods.updateChannelMetrics = function(channel, metrics) {
  const ch = this.channels.find(c => c.channel === channel);
  if (ch) {
    Object.assign(ch.metrics, metrics);
  }
  return this;
};

campaignSchema.methods.addAIRecommendation = function(type, text, impact) {
  this.ai.recommendations.push({
    type,
    text,
    impact,
    implemented: false,
    createdAt: new Date(),
  });
  return this;
};

campaignSchema.methods.launch = async function() {
  if (this.workflow.approval !== 'approved') {
    throw new Error('Campaign must be approved before launch');
  }

  this.status = 'active';
  this.timeline.execution.start = new Date();
  return this.save();
};

campaignSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

campaignSchema.methods.complete = function() {
  this.status = 'completed';
  this.timeline.evaluation.end = new Date();
  return this.save();
};

// Statics
campaignSchema.statics.findActive = function(orgId) {
  return this.find({
    organizationId: orgId,
    status: 'active',
  });
};

campaignSchema.statics.findByBrand = function(brandId) {
  return this.find({ brandId }).sort('-createdAt');
};

campaignSchema.statics.getStats = async function(orgId) {
  return this.aggregate([
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalBudget: { $sum: '$budget.total' },
        totalSpent: { $sum: '$budget.spent' },
        totalImpressions: { $sum: '$performance.impressions' },
        totalConversions: { $sum: '$performance.conversions' },
      },
    },
  ]);
};

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
