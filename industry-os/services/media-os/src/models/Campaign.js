/**
 * Media OS - Campaign Model
 * Ad campaigns with targeting, budgets, and performance tracking
 */

const mongoose = require('mongoose');

const targetingSchema = new mongoose.Schema({
  demographics: {
    ageRange: { min: { type: Number, default: 0 }, max: { type: Number, default: 100 } },
    gender: [{ type: String, enum: ['male', 'female', 'other'] }],
    locations: [{
      type: { type: String, enum: ['country', 'state', 'city'] },
      value: String,
    }],
    language: [{ type: String }],
    income: { type: String, enum: ['low', 'middle', 'high', 'affluent'] },
  },
  content: {
    categories: [{ type: String }],
    channels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }],
    programs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Program' }],
    genres: [{ type: String }],
  },
  viewerTwins: [{
    twinId: String,
    minAffinity: { type: Number, default: 0.5 },
  }],
  behavior: {
    watchFrequency: { type: String, enum: ['daily', 'weekly', 'occasional', 'new'] },
    subscriptionTier: [{ type: String, enum: ['free', 'basic', 'premium', 'vip'] }],
    deviceType: [{ type: String, enum: ['mobile', 'tablet', 'tv', 'web'] }],
  },
}, { _id: false });

const adSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['banner', 'video', 'native', 'overlay', 'skippable'] },
  url: String,
  thumbnail: String,
  duration: { type: Number, default: 30 }, // seconds for video
  clickUrl: String,
  status: { type: String, enum: ['draft', 'approved', 'rejected', 'active'], default: 'draft' },
}, { _id: true });

const campaignSchema = new mongoose.Schema({
  // Basic info
  name: { type: String, required: true },
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Advertiser', required: true },
  objective: {
    type: String,
    enum: ['awareness', 'consideration', 'conversion', 'traffic', 'engagement', 'product_launch'],
    required: true,
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'active', 'paused', 'completed', 'rejected', 'cancelled'],
    default: 'draft',
    index: true,
  },

  // Scheduling
  schedule: {
    startDate: { type: Date, required: true },
    endDate: Date,
    timezone: { type: String, default: 'Asia/Kolkata' },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sunday
    hoursOfDay: { start: { type: Number, default: 0 }, end: { type: Number, default: 24 } },
  },

  // Targeting
  targeting: targetingSchema,

  // Budget
  budget: {
    total: { type: Number, required: true },
    daily: Number,
    spent: { type: Number, default: 0 },
    remaining: Number,
    currency: { type: String, default: 'INR' },
  },

  // Bidding
  bidding: {
    strategy: { type: String, enum: ['cpm', 'cpc', 'cpv', 'cpa', 'fixed'], default: 'cpm' },
    maxBid: Number,
    targetBid: Number,
    pacing: { type: String, enum: ['standard', 'accelerated'], default: 'standard' },
  },

  // Creative assets
  ads: [adSchema],

  // Placements
  placements: [{
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    position: { type: String, enum: ['pre_roll', 'mid_roll', 'post_roll', 'banner', 'sponsor'] },
    price: Number,
  }],

  // Performance (real-time)
  performance: {
    impressions: { type: Number, default: 0 },
    uniqueImpressions: { type: Number, default: 0 },
    views: { type: Number, default: 0 }, // for video
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    videoCompletions: { type: Number, default: 0 },
    avgViewRate: { type: Number, default: 0 }, // completion rate
    ctr: { type: Number, default: 0 }, // click-through rate
    cpm: { type: Number, default: 0 }, // cost per mille
    cpc: { type: Number, default: 0 }, // cost per click
    cpa: { type: Number, default: 0 }, // cost per acquisition
    roas: { type: Number, default: 0 }, // return on ad spend
    frequency: { type: Number, default: 1 }, // avg impressions per viewer
    reach: { type: Number, default: 0 }, // unique viewers reached
    brandSafety: { type: Number, default: 100 }, // % safe placements
  },

  // Attribution
  attribution: {
    model: { type: String, enum: ['first_click', 'last_click', 'linear', 'time_decay', 'data_driven'] },
    window: { type: Number, default: 7 }, // days
    pixelId: String,
  },

  // Approval
  approval: {
    approvedBy: String,
    approvedAt: Date,
    rejectionReason: String,
    moderationNotes: String,
  },

  // RTMN Twin ID
  twinId: { type: String, sparse: true, index: true },

  // Metadata
  createdBy: String,
  lastModifiedBy: String,
  notes: String,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
campaignSchema.index({ advertiser: 1, status: 1 });
campaignSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
campaignSchema.index({ 'budget.spent': -1 });
campaignSchema.index({ status: 1, objective: 1 });
campaignSchema.index({ 'performance.impressions': -1 });
campaignSchema.index({ 'performance.cpm': 1 });

// Virtuals
campaignSchema.virtual('duration').get(function() {
  if (!this.schedule.endDate) return null;
  return Math.ceil((this.schedule.endDate - this.schedule.startDate) / (1000 * 60 * 60 * 24));
});

campaignSchema.virtual('budgetUtilization').get(function() {
  if (this.budget.total === 0) return 0;
  return (this.budget.spent / this.budget.total) * 100;
});

campaignSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' &&
         this.schedule.startDate <= now &&
         (!this.schedule.endDate || this.schedule.endDate >= now);
});

// Methods
campaignSchema.methods.calculateKPIs = async function() {
  const p = this.performance;

  if (p.impressions > 0) {
    p.cpm = (this.budget.spent / p.impressions) * 1000;
    p.ctr = (p.clicks / p.impressions) * 100;
  }

  if (p.clicks > 0) {
    p.cpc = this.budget.spent / p.clicks;
  }

  if (p.conversions > 0) {
    p.cpa = this.budget.spent / p.conversions;
  }

  if (this.budget.spent > 0 && this.objective === 'conversion') {
    // Assuming conversion value - would come from attribution
    const avgConversionValue = 500; // placeholder
    p.roas = (p.conversions * avgConversionValue) / this.budget.spent;
  }

  await this.save();
  return this.performance;
};

campaignSchema.methods.incrementSpend = async function(amount) {
  this.budget.spent += amount;
  this.budget.remaining = Math.max(0, this.budget.total - this.budget.spent);

  if (this.budget.remaining <= 0) {
    this.status = 'completed';
  }

  await this.save();
};

campaignSchema.methods.pause = async function() {
  if (this.status === 'active') {
    this.status = 'paused';
    await this.save();
  }
  return this;
};

campaignSchema.methods.resume = async function() {
  if (this.status === 'paused') {
    this.status = 'active';
    await this.save();
  }
  return this;
};

// Statics
campaignSchema.statics.findActiveCampaigns = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    'schedule.startDate': { $lte: now },
    $or: [
      { 'schedule.endDate': null },
      { 'schedule.endDate': { $gte: now } },
    ],
    'budget.remaining': { $gt: 0 },
  });
};

campaignSchema.statics.getCampaignsByAdvertiser = function(advertiserId) {
  return this.find({ advertiser: advertiserId }).sort({ createdAt: -1 });
};

campaignSchema.statics.getTopPerformingCampaigns = function(limit = 10) {
  return this.find({ status: { $in: ['active', 'completed'] } })
    .sort({ 'performance.roas': -1 })
    .limit(limit)
    .populate('advertiser', 'name');
};

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
