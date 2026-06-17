/**
 * Media OS - Creator Studio Model
 * Creator dashboard, analytics, and management tools
 */

const mongoose = require('mongoose');

const creatorAnalyticsSchema = new mongoose.Schema({
  // Time period
  period: { type: String, required: true }, // daily, weekly, monthly
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // Content performance
  content: {
    totalContent: { type: Number, default: 0 },
    newContent: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    uniqueViewers: { type: Number, default: 0 },
    avgViewsPerContent: Number,
    totalWatchTime: { type: Number, default: 0 }, // minutes
    avgWatchTime: Number,
    completionRate: Number,
    impressions: { type: Number, default: 0 },
    clickThroughRate: Number,
  },

  // Engagement
  engagement: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    engagementRate: Number,
  },

  // Audience
  audience: {
    followers: { type: Number, default: 0 },
    newFollowers: { type: Number, default: 0 },
    unfollows: { type: Number, default: 0 },
    netGrowth: Number,
    growthRate: Number,
  },

  // Revenue
  revenue: {
    total: { type: Number, default: 0 },
    subscription: { type: Number, default: 0 },
    ppv: { type: Number, default: 0 },
    sponsorship: { type: Number, default: 0 },
    affiliate: { type: Number, default: 0 },
    ads: { type: Number, default: 0 },
    tips: { type: Number, default: 0 },
  },

  // Demographics
  demographics: {
    byAge: mongoose.Schema.Types.Mixed,
    byGender: mongoose.Schema.Types.Mixed,
    byLocation: mongoose.Schema.Types.Mixed,
    byDevice: mongoose.Schema.Types.Mixed,
  },

  // Top content
  topContent: [{
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    title: String,
    views: Number,
    engagement: Number,
    revenue: Number,
  }],

  // Retention
  retention: {
    d1: Number, // Day 1 retention
    d7: Number, // Day 7 retention
    d30: Number, // Day 30 retention
  },

}, { timestamps: true });

// Indexes
creatorAnalyticsSchema.index({ creatorId: 1, period: 1, startDate: -1 });

const creatorStudioSchema = new mongoose.Schema({
  // Creator reference
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },

  // Dashboard preferences
  preferences: {
    defaultView: { type: String, enum: ['overview', 'content', 'audience', 'revenue'], default: 'overview' },
    dateRange: { type: String, enum: ['7d', '30d', '90d', '1y', 'all'], default: '30d' },
    notifications: {
      newFollowers: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      revenue: { type: Boolean, default: true },
      milestones: { type: Boolean, default: true },
    },
  },

  // Quick actions
  quickActions: [{
    type: { type: String, enum: ['upload', 'schedule', 'analytics', 'messages', 'payout'] },
    label: String,
    icon: String,
    enabled: { type: Boolean, default: true },
    order: Number,
  }],

  // Saved reports
  savedReports: [{
    name: String,
    type: { type: String, enum: ['content', 'audience', 'revenue', 'custom'] },
    filters: mongoose.Schema.Types.Mixed,
    schedule: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      recipients: [String],
    },
    createdAt: Date,
  }],

  // Scheduled posts queue
  scheduledQueue: [{
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    title: String,
    thumbnail: String,
    scheduledFor: Date,
    platform: String,
    status: { type: String, enum: ['scheduled', 'published', 'failed'] },
  }],

  // Upload preferences
  upload: {
    defaultPrivacy: { type: String, enum: ['public', 'unlisted', 'private'] },
    defaultCategory: String,
    autoPublish: { type: Boolean, default: false },
    watermark: { type: Boolean, default: true },
    defaultLanguage: { type: String, default: 'en' },
  },

  // Monetization settings
  monetization: {
    enabled: { type: Boolean, default: false },
    revenueSplit: Number, // creator's share
    minPayout: { type: Number, default: 1000 },
    payoutMethod: { type: String, enum: ['bank', 'upi', 'paypal'] },
    bankDetails: mongoose.Schema.Types.Mixed,
    taxInfo: {
      submitted: { type: Boolean, default: false },
      form: String,
      submittedAt: Date,
    },
  },

  // Content calendar
  contentCalendar: {
    enabled: { type: Boolean, default: true },
    view: { type: String, enum: ['month', 'week', 'list'], default: 'month' },
  },

  // Alerts
  alerts: [{
    type: { type: String, enum: ['milestone', 'warning', 'opportunity', 'alert'] },
    title: String,
    message: String,
    read: { type: Boolean, default: false },
    actionUrl: String,
    createdAt: { type: Date, default: Date.now },
  }],

  // RTMN Integration
  integrations: {
    instagram: { connected: { type: Boolean, default: false }, lastSync: Date },
    youtube: { connected: { type: Boolean, default: false }, lastSync: Date },
    twitter: { connected: { type: Boolean, default: false }, lastSync: Date },
    tiktok: { connected: { type: Boolean, default: false }, lastSync: Date },
    facebook: { connected: { type: Boolean, default: false }, lastSync: Date },
  },

  // Status
  status: {
    onboarding: { type: Boolean, default: true },
    lastActive: Date,
  },

}, { timestamps: true });

// Indexes
creatorStudioSchema.index({ creatorId: 1 }, { unique: true });
creatorStudioSchema.index({ 'alerts.read': 1 });

// Virtuals
creatorStudioSchema.virtual('unreadAlerts').get(function() {
  return this.alerts.filter(a => !a.read).length;
});

// Methods
creatorStudioSchema.methods.getAnalytics = async function(period = '30d') {
  const CreatorAnalytics = mongoose.model('CreatorAnalytics');

  let days = 30;
  if (period === '7d') days = 7;
  else if (period === '90d') days = 90;
  else if (period === '1y') days = 365;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const analytics = await CreatorAnalytics.findOne({
    creatorId: this.creatorId,
    period: 'daily',
    startDate: { $gte: startDate },
  }).sort({ startDate: -1 });

  return analytics || {};
};

creatorStudioSchema.methods.addAlert = function(alert) {
  this.alerts.push({
    ...alert,
    createdAt: new Date(),
    read: false,
  });
  return this;
};

creatorStudioSchema.methods.markAlertRead = function(alertId) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.read = true;
  }
  return this;
};

creatorStudioSchema.methods.scheduleContent = function(contentId, scheduledFor, platform) {
  this.scheduledQueue.push({
    contentId,
    scheduledFor,
    platform,
    status: 'scheduled',
  });
  return this;
};

creatorStudioSchema.methods.completeOnboarding = function() {
  this.status.onboarding = false;
  return this;
};

const CreatorStudio = mongoose.model('CreatorStudio', creatorStudioSchema);
const CreatorAnalytics = mongoose.model('CreatorAnalytics', creatorAnalyticsSchema);

module.exports = { CreatorStudio, CreatorAnalytics };
