/**
 * Media OS - Subscription Plan Model
 * Subscription plans and pricing
 */

const mongoose = require('mongoose');

const planBenefitSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['feature', 'limit', 'content', 'service'] },
  value: mongoose.Schema.Types.Mixed, // number, string, or boolean
  limit: Number,
  used: { type: Number, default: 0 },
}, { _id: true });

const pricingTierSchema = new mongoose.Schema({
  billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'lifetime'], required: true },
  price: { type: Number, required: true },
  discountedPrice: Number,
  currency: { type: String, default: 'INR' },
  tax: { type: Number, default: 18 }, // percentage
  total: Number,
  savings: Number, // compared to monthly
  savingsPercent: Number,
}, { _id: false });

const planSchema = new mongoose.Schema({
  // Plan info
  name: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  description: String,
  tagline: String,

  // Plan type
  type: {
    type: String,
    enum: ['free', 'basic', 'premium', 'family', 'vip', 'studio', 'enterprise', 'custom'],
    required: true,
  },

  // Tier (for ordering)
  tier: { type: Number, default: 1 }, // higher = more features

  // Pricing
  pricing: {
    monthly: { type: Number, required: true },
    quarterly: { type: Number },
    yearly: { type: Number },
    lifetime: { type: Number },
    currency: { type: String, default: 'INR' },
  },

  // Features
  features: [planBenefitSchema],

  // Content access
  contentAccess: {
    allContent: { type: Boolean, default: false },
    includedGenres: [String],
    excludedGenres: [String],
    includedTypes: [String],
    exclusiveContent: { type: Boolean, default: false },
    earlyAccess: { type: Number, default: 0 }, // days before release
  },

  // Streaming quality
  streaming: {
    maxQuality: { type: String, enum: ['480p', '720p', '1080p', '4k', '8k'], default: '720p' },
    hdr: { type: Boolean, default: false },
    dolbyAtmos: { type: Boolean, default: false },
    simultaneousStreams: { type: Number, default: 1 },
    offlineDownloads: { type: Number, default: 0 },
  },

  // Ads
  ads: {
    enabled: { type: Boolean, default: true },
    limited: { type: Boolean, default: false },
    frequency: { type: String, enum: ['none', 'limited', 'standard', 'unlimited'] },
  },

  // Family
  family: {
    enabled: { type: Boolean, default: false },
    maxProfiles: { type: Number, default: 1 },
    parentalControls: { type: Boolean, default: false },
    kidsProfiles: { type: Number, default: 0 },
    sharedWatchlist: { type: Boolean, default: false },
  },

  // Parental controls
  parentalControls: {
    enabled: { type: Boolean, default: false },
    defaultRating: { type: String, enum: ['G', 'PG', 'PG-13', 'UA'], default: 'PG' },
    contentFilter: { type: String, enum: ['strict', 'moderate', 'relaxed'] },
  },

  // Device support
  devices: {
    web: { type: Boolean, default: true },
    ios: { type: Boolean, default: false },
    android: { type: Boolean, default: false },
    smartTV: { type: Boolean, default: false },
    roku: { type: Boolean, default: false },
    firetv: { type: Boolean, default: false },
    appletv: { type: Boolean, default: false },
    chromecast: { type: Boolean, default: false },
    gamingConsoles: { type: Boolean, default: false },
  },

  // Support
  support: {
    email: { type: Boolean, default: true },
    chat: { type: Boolean, default: false },
    phone: { type: Boolean, default: false },
    priority: { type: String, enum: ['standard', 'priority', 'dedicated'] },
    responseTime: { type: String }, // e.g., "24 hours"
  },

  // Commerce
  commerce: {
    rentals: { type: Boolean, default: false },
    purchases: { type: Boolean, default: false },
    discount: { type: Number, default: 0 }, // percentage
  },

  // Availability
  available: { type: Boolean, default: true },
  availableIn: [String], // countries

  // Limits
  limits: {
    watchHoursPerMonth: Number,
    maxWatchHistory: { type: Number, default: 500 },
    watchlistSize: { type: Number, default: 100 },
  },

  // Promotions
  promotions: {
    freeTrial: {
      enabled: { type: Boolean, default: false },
      days: { type: Number, default: 0 },
    },
    firstMonthDiscount: { type: Number, default: 0 },
    referralBonus: { type: Number, default: 0 },
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'deprecated', 'hidden'],
    default: 'active',
  },

  // Metadata
  metadata: mongoose.Schema.Types.Mixed,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
planSchema.index({ type: 1, tier: 1 });
planSchema.index({ status: 1 });
planSchema.index({ available: 1 });

// Virtual for effective price
planSchema.virtual('effectivePrice').get(function() {
  return this.pricing.yearly
    ? Math.round(this.pricing.yearly / 12)
    : this.pricing.monthly;
});

// Methods
planSchema.methods.getPrice = function(billingCycle = 'monthly') {
  const price = this.pricing[billingCycle];
  if (!price) return null;

  return {
    base: price,
    tax: price * (this.pricing.tax / 100),
    total: price * (1 + this.pricing.tax / 100),
    currency: this.pricing.currency,
  };
};

planSchema.methods.hasFeature = function(featureName) {
  return this.features.some(f => f.name === featureName);
};

planSchema.methods.checkLimits = function(limitType) {
  const limit = this.limits?.[limitType];
  if (limit === undefined) return { allowed: true, unlimited: true };

  return { allowed: true, limit, unlimited: false };
};

// Statics
planSchema.statics.findActive = function() {
  return this.find({ status: 'active', available: true }).sort('tier');
};

planSchema.statics.findByType = function(type) {
  return this.findOne({ type, status: 'active', available: true });
};

planSchema.statics.getPlanComparison = function() {
  return this.aggregate([
    { $match: { status: 'active', available: true } },
    { $sort: { tier: 1 } },
    {
      $project: {
        name: 1,
        displayName: 1,
        type: 1,
        tier: 1,
        monthlyPrice: '$pricing.monthly',
        yearlyPrice: '$pricing.yearly',
        maxQuality: '$streaming.maxQuality',
        simultaneousStreams: '$streaming.simultaneousStreams',
        offlineDownloads: '$streaming.offlineDownloads',
        familyEnabled: '$family.enabled',
        maxProfiles: '$family.maxProfiles',
        adsEnabled: '$ads.enabled',
      },
    },
  ]);
};

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
