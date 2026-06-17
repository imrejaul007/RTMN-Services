/**
 * Media OS - Creator Model
 * Content creator profiles with monetization and brand deal management
 */

const mongoose = require('mongoose');

const socialStatsSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  handle: String,
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
  posts: { type: Number, default: 0 },
  avgLikes: { type: Number, default: 0 },
  avgComments: { type: Number, default: 0 },
  avgShares: { type: Number, default: 0 },
  engagementRate: { type: Number, default: 0 },
  lastSynced: Date,
}, { _id: false });

const brandDealSchema = new mongoose.Schema({
  brandName: { type: String, required: true },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Advertiser' },
  campaignName: String,
  value: { type: Number, required: true }, // in rupees
  currency: { type: String, default: 'INR' },
  deliverables: [{
    type: { type: String, enum: ['post', 'story', 'reel', 'video', 'mention', 'live'] },
    count: Number,
    completed: { type: Boolean, default: false },
  }],
  contentGuidelines: String,
  exclusivity: {
    required: { type: Boolean, default: false },
    duration: Number, // in days
    competitors: [String],
  },
  status: {
    type: String,
    enum: ['negotiating', 'contract_sent', 'contract_signed', 'in_progress', 'completed', 'cancelled'],
    default: 'negotiating'
  },
  startDate: Date,
  endDate: Date,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const contractSchema = new mongoose.Schema({
  contractId: { type: String, required: true },
  type: { type: String, enum: ['brand_deal', 'platform', 'talent', 'license'] },
  parties: [{
    type: { type: String },
    name: String,
    entity: String,
  }],
  terms: String,
  value: Number,
  startDate: Date,
  endDate: Date,
  signedAt: Date,
  documentUrl: String,
  status: { type: String, enum: ['draft', 'sent', 'signed', 'expired', 'terminated'] },
}, { timestamps: true });

const creatorSchema = new mongoose.Schema({
  // CorpID integration
  corpid: { type: String, sparse: true, index: true },

  // Profile
  profile: {
    displayName: { type: String, required: true },
    handle: { type: String, required: true, unique: true },
    bio: { type: String, maxLength: 500 },
    avatar: String,
    coverImage: String,
    socialLinks: {
      youtube: String,
      instagram: String,
      twitter: String,
      tiktok: String,
      facebook: String,
      website: String,
    },
    verification: {
      verified: { type: Boolean, default: false },
      badgeType: { type: String, enum: ['blue', 'gold', 'none'], default: 'none' },
      verifiedAt: Date,
      verifiedBy: String,
    },
  },

  // Categories
  niche: [{ type: String }], // e.g., 'food', 'fitness', 'tech'
  contentTypes: [{ type: String, enum: ['video', 'shorts', 'reels', 'podcast', 'blog', 'live'] }],
  languages: [{ type: String }],

  // Social stats (aggregated)
  socialStats: [socialStatsSchema],

  // Audience demographics
  audience: {
    demographics: {
      primaryAge: { type: String }, // e.g., '18-24'
      secondaryAge: { type: String },
      gender: { type: Map, of: Number }, // percentage distribution
      locations: { type: Map, of: Number }, // country/state percentages
      languages: [{ type: String }],
    },
    totalReach: { type: Number, default: 0 },
    avgEngagementRate: { type: Number, default: 0 },
    growthRate: { type: Number, default: 0 }, // % per month
    authenticity: { type: Number, default: 0, min: 0, max: 100 },
  },

  // Content metrics
  content: {
    totalVideos: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    avgViewsPerVideo: { type: Number, default: 0 },
    avgWatchTime: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    postingFrequency: { type: String }, // e.g., '3 videos/week'
    lastPostDate: Date,
  },

  // Media kit
  mediaKit: {
    portfolio: [{ type: String }], // URLs to best work
    highlights: [{ type: String }], // key achievements
    cpm: { type: Number, default: 0 },
    rpm: { type: Number, default: 0 }, // revenue per mille
    collaborations: { type: Number, default: 0 },
    achievements: [String],
  },

  // Monetization
  monetization: {
    enabled: { type: Boolean, default: false },
    revenue: {
      total: { type: Number, default: 0 },
      breakdown: {
        brandDeals: { type: Number, default: 0 },
        platformEarnings: { type: Number, default: 0 },
        affiliate: { type: Number, default: 0 },
        supercoins: { type: Number, default: 0 },
        merchandise: { type: Number, default: 0 },
      },
      pending: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      lastMonth: { type: Number, default: 0 },
    },
    payoutInfo: {
      bankAccount: String,
      ifsc: String,
      upiId: String,
      preferredMethod: { type: String, enum: ['bank', 'upi', 'paypal'] },
    },
    taxInfo: {
      pan: String,
      gstin: String,
      taxResidency: String,
      form16: Boolean,
    },
  },

  // Brand deals
  brandDeals: [brandDealSchema],
  contracts: [contractSchema],

  // Team
  team: [{
    name: String,
    role: String,
    email: String,
    phone: String,
    permissions: [String],
  }],

  // Performance
  performance: {
    totalEarnings: { type: Number, default: 0 },
    avgDealValue: { type: Number, default: 0 },
    dealsCompleted: { type: Number, default: 0 },
    dealsCancelled: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
  },

  // Compliance
  compliance: {
    strikeCount: { type: Number, default: 0 },
    policyViolations: { type: Number, default: 0 },
    contentModeration: { type: String, enum: ['passed', 'flagged', 'failed'] },
    copyrightClaims: { type: Number, default: 0 },
  },

  // RTMN Twin ID
  twinId: { type: String, sparse: true, index: true },

  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'verified_partner', 'blacklisted'],
    default: 'active'
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
creatorSchema.index({ 'profile.handle': 1 });
creatorSchema.index({ 'profile.email': 1 });
creatorSchema.index({ niche: 1 });
creatorSchema.index({ status: 1 });
creatorSchema.index({ 'monetization.enabled': 1 });
creatorSchema.index({ 'audience.totalReach': -1 });
creatorSchema.index({ 'performance.totalEarnings': -1 });

// Virtual for total followers across all platforms
creatorSchema.virtual('totalFollowers').get(function() {
  if (!this.socialStats || this.socialStats.length === 0) return 0;
  return this.socialStats.reduce((sum, stat) => sum + (stat.followers || 0), 0);
});

// Virtual for monthly earnings
creatorSchema.virtual('monthlyEarnings').get(function() {
  return this.monetization.revenue.breakdown.brandDeals +
         this.monetization.revenue.breakdown.platformEarnings +
         this.monetization.revenue.breakdown.affiliate +
         this.monetization.revenue.breakdown.supercoins +
         this.monetization.revenue.breakdown.merchandise;
});

// Methods
creatorSchema.methods.calculateAuthenticity = async function() {
  // Simplified authenticity calculation based on engagement patterns
  let authenticity = 70; // base score

  if (this.socialStats && this.socialStats.length > 0) {
    const avgEngagement = this.socialStats.reduce((sum, s) => sum + s.engagementRate, 0) / this.socialStats.length;
    // Genuine accounts typically have 1-8% engagement
    if (avgEngagement >= 1 && avgEngagement <= 8) authenticity += 20;
    else if (avgEngagement > 8 && avgEngagement <= 15) authenticity += 10;
    else if (avgEngagement > 15) authenticity -= 10; // might be inflated
    else authenticity -= 20; // very low engagement
  }

  // Consistent posting helps
  if (this.content.postingFrequency) authenticity += 10;

  // Verified accounts
  if (this.profile.verification.verified) authenticity += 10;

  this.audience.authenticity = Math.max(0, Math.min(100, authenticity));
  await this.save();
  return this.audience.authenticity;
};

creatorSchema.methods.addBrandDeal = async function(dealData) {
  const deal = {
    ...dealData,
    status: 'negotiating',
    createdAt: new Date(),
  };
  this.brandDeals.push(deal);
  await this.save();
  return this.brandDeals[this.brandDeals.length - 1];
};

creatorSchema.methods.calculateRevenueShare = function(dealValue) {
  // Tiered revenue share based on performance
  const totalEarnings = this.performance.totalEarnings;

  if (totalEarnings >= 10000000) return 0.55; // 55% for top creators
  if (totalEarnings >= 5000000) return 0.50;   // 50%
  if (totalEarnings >= 1000000) return 0.45;   // 45%
  if (totalEarnings >= 500000) return 0.40;    // 40%
  if (totalEarnings >= 100000) return 0.35;    // 35%
  return 0.30; // 30% base for new creators
};

// Static methods
creatorSchema.statics.findByHandle = function(handle) {
  return this.findOne({ 'profile.handle': handle });
};

creatorSchema.statics.findTopCreators = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'audience.totalReach': -1 })
    .limit(limit);
};

creatorSchema.statics.findByNiche = function(niche, limit = 20) {
  return this.find({
    niche: { $in: [niche] },
    status: 'active',
    'monetization.enabled': true,
  })
    .sort({ 'audience.totalReach': -1 })
    .limit(limit);
};

creatorSchema.statics.findAvailableForBrandDeal = function(brandIndustry, budget) {
  return this.find({
    status: 'active',
    'monetization.enabled': true,
    'performance.avgDealValue': { $lte: budget * 1.5 },
  }).sort({ 'performance.rating': -1, 'audience.totalReach': -1 });
};

const Creator = mongoose.model('Creator', creatorSchema);

module.exports = Creator;
