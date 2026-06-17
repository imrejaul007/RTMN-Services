/**
 * Marketing OS - Marketing Content Model
 * Content management for marketing campaigns
 */

const mongoose = require('mongoose');

const contentAssetSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video', 'document', 'audio'], required: true },
  url: String,
  thumbnail: String,
  format: String,
  size: Number,
});

const contentVersionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  content: String,
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  changes: String,
});

const contentSchema = new mongoose.Schema({
  // Content ID
  contentId: { type: String, unique: true },

  // Basic Info
  title: { type: String, required: true },
  slug: String,
  description: String,
  excerpt: String,

  // Type
  type: {
    type: String,
    enum: ['blog', 'article', 'landing_page', 'email_template', 'social_post', 'ad_copy', 'video_script', 'infographic', 'case_study', 'whitepaper', 'newsletter', 'webinar', 'podcast', 'other'],
    required: true,
  },

  // Organization
  organizationId: String,

  // Content
  content: String,
  rawContent: String,
  htmlContent: String,

  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    slug: String,
    canonicalUrl: String,
    ogImage: String,
  },

  // Media
  media: [contentAssetSchema],

  // Source
  source: {
    type: { type: String, enum: ['manual', 'ai_generated', 'imported', 'user_generated'] },
    generatedAt: Date,
    model: String,
  },

  // Author
  author: {
    userId: String,
    name: String,
    email: String,
  },

  // Brand
  brandId: String,
  brandName: String,

  // Campaign
  campaignId: String,
  campaignName: String,

  // Status & Workflow
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'published', 'scheduled', 'archived'],
    default: 'draft',
  },
  workflow: {
    submittedForReview: { type: Boolean, default: false },
    submittedAt: Date,
    reviewedBy: String,
    reviewedAt: Date,
    approvedBy: String,
    approvedAt: Date,
  },

  // Publishing
  publishedAt: Date,
  scheduledFor: Date,

  // Channels
  channels: [{
    channel: { type: String, enum: ['website', 'blog', 'social', 'email', 'ads', 'seo'] },
    published: { type: Boolean, default: false },
    publishedAt: Date,
    url: String,
    engagement: {
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
    },
  }],

  // Performance
  performance: {
    views: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    avgTimeOnPage: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },

  // Versioning
  versions: [contentVersionSchema],
  currentVersion: { type: Number, default: 1 },

  // AI
  ai: {
    generatedBy: String,
    generatedAt: Date,
    suggestions: [{
      type: String,
      text: String,
      applied: { type: Boolean, default: false },
      appliedAt: Date,
    }],
    seoScore: { type: Number, default: 0 },
    readabilityScore: { type: Number, default: 0 },
  },

  // Tags & Categories
  tags: [String],
  category: String,

  // Permissions
  permissions: {
    isPublic: { type: Boolean, default: false },
    requireLogin: { type: Boolean, default: false },
    allowedRoles: [String],
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Generate content ID
contentSchema.pre('save', function(next) {
  if (!this.contentId) {
    const prefix = this.type.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    this.contentId = `${prefix}-${timestamp}`;
  }

  if (!this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  next();
});

// Indexes
contentSchema.index({ contentId: 1 }, { unique: true });
contentSchema.index({ organizationId: 1 });
contentSchema.index({ type: 1 });
contentSchema.index({ status: 1 });
contentSchema.index({ campaignId: 1 });
contentSchema.index({ tags: 1 });
contentSchema.index({ publishedAt: -1 });

// Methods
contentSchema.methods.submitForReview = function(userId) {
  this.status = 'review';
  this.workflow.submittedForReview = true;
  this.workflow.submittedAt = new Date();
  return this;
};

contentSchema.methods.approve = function(userId) {
  this.status = 'approved';
  this.workflow.approvedBy = userId;
  this.workflow.approvedAt = new Date();
  return this;
};

contentSchema.methods.publish = function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this;
};

contentSchema.methods.schedule = function(date) {
  this.status = 'scheduled';
  this.scheduledFor = date;
  return this;
};

contentSchema.methods.createNewVersion = function(content, userId, changes) {
  this.currentVersion += 1;
  this.versions.push({
    version: this.currentVersion,
    content,
    createdBy: userId,
    createdAt: new Date(),
    changes,
  });
  this.content = content;
  return this;
};

contentSchema.methods.updatePerformance = function(metrics) {
  Object.assign(this.performance, metrics);
  return this;
};

// Statics
contentSchema.statics.findByCampaign = function(campaignId) {
  return this.find({ campaignId }).sort('-createdAt');
};

contentSchema.statics.findPublished = function(orgId, limit = 10) {
  return this.find({ organizationId: orgId, status: 'published' })
    .sort('-publishedAt')
    .limit(limit);
};

contentSchema.statics.getTopPerforming = async function(orgId, limit = 10) {
  return this.find({ organizationId: orgId, status: 'published' })
    .sort('-performance.views')
    .limit(limit);
};

const MarketingContent = mongoose.model('MarketingContent', contentSchema);

module.exports = MarketingContent;
