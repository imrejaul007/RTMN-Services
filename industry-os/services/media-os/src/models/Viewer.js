/**
 * Media OS - Viewer Model
 * Subscriber/user profiles with watch history and preferences
 */

const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema({
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  progress: { type: Number, default: 0 }, // percentage watched
  completed: { type: Boolean, default: false },
  watchTime: { type: Number, default: 0 }, // in seconds
  watchedAt: { type: Date, default: Date.now },
}, { _id: true });

const viewerSchema = new mongoose.Schema({
  // CorpID integration
  corpid: { type: String, sparse: true, index: true },

  // Profile
  profile: {
    displayName: { type: String, required: true },
    avatar: { type: String },
    email: { type: String, sparse: true },
    phone: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  },

  // Location
  location: {
    city: { type: String },
    state: { type: String },
    country: { type: String, default: 'India' },
    pincode: { type: String },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },

  // Preferences
  preferences: {
    language: [{ type: String }],
    genres: [{ type: String }],
    maturityRating: { type: String, enum: ['G', 'PG', 'PG-13', 'UA', 'A', 'adult'], default: 'UA' },
    subtitles: { type: Boolean, default: true },
    autoplay: { type: Boolean, default: true },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
  },

  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'family', 'vip'],
      default: 'free'
    },
    startDate: { type: Date },
    endDate: { type: Date },
    autoRenew: { type: Boolean, default: true },
    paymentMethod: { type: String },
    paymentId: { type: String },
  },

  // Watch data
  watchHistory: [watchHistorySchema],
  watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Content' }],

  // Engagement metrics
  engagement: {
    commentsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 },
    playlistsCreated: { type: Number, default: 0 },
  },

  // Devices
  devices: [{
    deviceId: String,
    deviceType: { type: String, enum: ['mobile', 'tablet', 'tv', 'web', 'cast'] },
    lastUsed: Date,
  }],

  // ML Metrics
  metrics: {
    totalWatchTime: { type: Number, default: 0 }, // in seconds
    avgSessionDuration: { type: Number, default: 0 },
    avgWatchDaysPerWeek: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    reWatchRate: { type: Number, default: 0 },
    contentVariety: { type: Number, default: 0 }, // unique genres watched
  },

  // Predictive metrics
  churnRisk: { type: Number, default: 0, min: 0, max: 1 }, // 0-1, higher = more likely to churn
  lifetimeValue: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0, min: 0, max: 100 },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  },

  // Privacy
  privacy: {
    profilePublic: { type: Boolean, default: false },
    watchHistoryPublic: { type: Boolean, default: false },
    dataConsent: { type: Boolean, default: false },
  },

  // RTMN Twin ID
  twinId: { type: String, sparse: true, index: true },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
viewerSchema.index({ 'profile.email': 1 });
viewerSchema.index({ 'profile.phone': 1 });
viewerSchema.index({ 'subscription.plan': 1 });
viewerSchema.index({ 'subscription.endDate': 1 });
viewerSchema.index({ status: 1 });
viewerSchema.index({ churnRisk: -1 });
viewerSchema.index({ lifetimeValue: -1 });
viewerSchema.index({ createdAt: -1 });

// Virtual for segments
viewerSchema.virtual('segments').get(function() {
  const segments = [];

  if (this.subscription.plan !== 'free') {
    segments.push('subscriber');
  }

  if (this.metrics.totalWatchTime > 36000) { // > 10 hours
    segments.push('engaged');
  }

  if (this.churnRisk > 0.7) {
    segments.push('at_risk');
  }

  if (this.lifetimeValue > 5000) {
    segments.push('high_value');
  }

  return segments;
});

// Methods
viewerSchema.methods.updateWatchHistory = async function(contentId, progress, watchTime) {
  const existingIndex = this.watchHistory.findIndex(
    h => h.contentId.toString() === contentId.toString()
  );

  if (existingIndex >= 0) {
    this.watchHistory[existingIndex].progress = progress;
    this.watchHistory[existingIndex].watchTime = watchTime;
    this.watchHistory[existingIndex].watchedAt = new Date();
    if (progress >= 90) {
      this.watchHistory[existingIndex].completed = true;
    }
  } else {
    this.watchHistory.push({
      contentId,
      progress,
      watchTime,
      completed: progress >= 90,
    });
  }

  // Keep only last 500 watch history items
  if (this.watchHistory.length > 500) {
    this.watchHistory = this.watchHistory.slice(-500);
  }

  await this.save();
};

viewerSchema.methods.calculateEngagementScore = async function() {
  // Simple engagement score calculation
  const weights = {
    watchTime: 0.3,
    completionRate: 0.25,
    social: 0.25,
    subscription: 0.2,
  };

  const watchScore = Math.min(this.metrics.totalWatchTime / 36000, 1) * 100; // max 10 hours
  const completionScore = this.metrics.completionRate * 100;
  const socialScore = Math.min(
    (this.engagement.commentsCount + this.engagement.sharesCount) / 10,
    1
  ) * 100;
  const subScore = this.subscription.plan === 'vip' ? 100 :
                    this.subscription.plan === 'family' ? 80 :
                    this.subscription.plan === 'premium' ? 60 :
                    this.subscription.plan === 'basic' ? 40 : 20;

  this.engagementScore = Math.round(
    (watchScore * weights.watchTime) +
    (completionScore * weights.completionRate) +
    (socialScore * weights.social) +
    (subScore * weights.subscription)
  );

  await this.save();
  return this.engagementScore;
};

// Static methods
viewerSchema.statics.findByEmail = function(email) {
  return this.findOne({ 'profile.email': email });
};

viewerSchema.statics.findByPhone = function(phone) {
  return this.findOne({ 'profile.phone': phone });
};

viewerSchema.statics.findAtRiskViewers = function() {
  return this.find({
    churnRisk: { $gte: 0.7 },
    status: 'active'
  }).sort({ churnRisk: -1 });
};

const Viewer = mongoose.model('Viewer', viewerSchema);

module.exports = Viewer;
