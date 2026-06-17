/**
 * Marketing OS - Brand Model
 * Brand management, guidelines, and health tracking
 */

const mongoose = require('mongoose');

const brandColorSchema = new mongoose.Schema({
  name: String,
  hex: String,
  usage: [String],
}, { _id: true });

const brandTypographySchema = new mongoose.Schema({
  name: String,
  family: String,
  weights: [String],
  usage: String,
}, { _id: true });

const brandAssetSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['logo', 'icon', 'banner', 'template', 'font', 'image', 'video'] },
  url: String,
  format: String,
  dimensions: String,
  tags: [String],
  usage: [String],
  approved: { type: Boolean, default: false },
  uploadedBy: String,
}, { _id: true });

const competitorSchema = new mongoose.Schema({
  name: String,
  website: String,
  logos: [String],
  tagline: String,
  positioning: String,
  strengths: [String],
  weaknesses: [String],
  lastUpdated: Date,
}, { _id: true });

const brandMentionSchema = new mongoose.Schema({
  source: { type: String, enum: ['twitter', 'facebook', 'instagram', 'news', 'review', 'forum', 'other'] },
  url: String,
  content: String,
  sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
  engagement: Number,
  postedAt: Date,
}, { _id: true });

const brandSchema = new mongoose.Schema({
  // Brand Info
  name: { type: String, required: true, unique: true },
  displayName: String,
  tagline: String,
  description: String,

  // Identity
  logo: {
    primary: String,
    secondary: String,
    icon: String,
    dark: String,
    light: String,
  },
  colors: [brandColorSchema],
  typography: [brandTypographySchema],

  // Guidelines
  guidelines: {
    voice: String,
    tone: [String],
    messaging: String,
    dos: [String],
    donts: [String],
    visualRules: String,
  },

  // Assets
  assets: [brandAssetSchema],

  // Industry & Positioning
  industry: String,
  positioning: String,
  mission: String,
  vision: String,
  values: [String],

  // Competitors
  competitors: [competitorSchema],

  // Health Tracking
  health: {
    score: { type: Number, default: 100 },
    sentiment: {
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
    },
    awareness: { type: Number, default: 0 },
    consideration: { type: Number, default: 0 },
    preference: { type: Number, default: 0 },
    lastUpdated: Date,
  },

  // Mentions
  mentions: [brandMentionSchema],

  // Approval Workflow
  approvalWorkflow: {
    enabled: { type: Boolean, default: true },
    approvers: [String],
    autoApprove: { type: Boolean, default: false },
  },

  // Organization
  organizationId: String,

  // Status
  status: { type: String, enum: ['active', 'archived', 'draft'], default: 'active' },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
brandSchema.index({ name: 1 }, { unique: true });
brandSchema.index({ organizationId: 1 });
brandSchema.index({ status: 1 });

// Virtuals
brandSchema.virtual('totalMentions').get(function() {
  return this.mentions?.length || 0;
});

brandSchema.virtual('sentimentScore').get(function() {
  const { positive, negative, neutral } = this.health?.sentiment || {};
  const total = positive + negative + neutral;
  if (total === 0) return 0;
  return ((positive - negative) / total) * 100;
});

// Methods
brandSchema.methods.calculateHealth = function() {
  const { positive, negative, neutral } = this.health?.sentiment || {};
  const total = positive + negative + neutral;

  if (total === 0) {
    this.health.score = 100;
    return this.health.score;
  }

  const sentimentScore = ((positive - negative) / total) * 100;
  const engagementScore = Math.min(total / 100, 1) * 100;
  this.health.score = Math.round((sentimentScore + engagementScore) / 2);
  this.health.lastUpdated = new Date();

  return this.health.score;
};

brandSchema.methods.addMention = function(mention) {
  this.mentions.push(mention);

  if (mention.sentiment === 'positive') {
    this.health.sentiment.positive += 1;
  } else if (mention.sentiment === 'negative') {
    this.health.sentiment.negative += 1;
  } else {
    this.health.sentiment.neutral += 1;
  }

  this.calculateHealth();
  return this;
};

brandSchema.methods.addAsset = function(asset) {
  this.assets.push({
    ...asset,
    uploadedBy: asset.uploadedBy || 'system',
  });
  return this.assets[this.assets.length - 1];
};

brandSchema.methods.getPrimaryColor = function() {
  return this.colors?.[0]?.hex || '#000000';
};

// Statics
brandSchema.statics.findByOrg = function(orgId) {
  return this.find({ organizationId: orgId, status: 'active' });
};

brandSchema.statics.getHealthLeaderboard = function() {
  return this.find({ status: 'active' })
    .sort('-health.score')
    .limit(10)
    .select('name health.score');
};

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
