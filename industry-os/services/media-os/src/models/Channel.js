/**
 * Media OS - Channel Model
 * TV channels and streaming channels
 */

const mongoose = require('mongoose');

const scheduleSlotSchema = new mongoose.Schema({
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: Number, // in minutes
  type: { type: String, enum: ['program', 'ad', 'break', 'promo'] },
}, { _id: true });

const channelSchema = new mongoose.Schema({
  // Basic info
  name: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['news', 'movie', 'sports', 'music', 'kids', 'entertainment', 'lifestyle', 'infotainment', 'regional', 'international'],
    required: true,
  },
  category: { type: String, required: true },
  language: { type: String, required: true },
  region: [{ type: String }], // ['National', 'Mumbai', 'Delhi', etc.]

  // Branding
  logo: String,
  banner: String,
  tagline: String,
  description: String,
  website: String,

  // Audience
  targetAudience: {
    ageGroups: [{ type: String }], // ['18-24', '25-34', etc.]
    gender: [{ type: String }],
    income: [{ type: String }],
    interests: [{ type: String }],
  },

  // Business model
  subscriptionType: {
    type: String,
    enum: ['free', 'freemium', 'premium'],
    default: 'freemium',
  },
  adSupported: { type: Boolean, default: true },
  hdAvailable: { type: Boolean, default: false },
  4kAvailable: { type: Boolean, default: false },

  // Technical
  streamUrl: String,
  hlsManifest: String,
  cdnProvider: String,
  geoRestrictions: [{ type: String }],

  // Parental controls
  parentalLock: { type: Boolean, default: false },
  minAgeRating: { type: String, enum: ['G', 'PG', 'PG-13', 'UA', 'A'], default: 'UA' },

  // Schedule
  schedule: [scheduleSlotSchema],
  timezone: { type: String, default: 'Asia/Kolkata' },

  // Broadcast settings
  broadcastHours: {
    start: { type: Number, default: 0 }, // 0-23
    end: { type: Number, default: 24 },
  },

  // Stats
  stats: {
    reach: { type: Number, default: 0 }, // total viewers reached
    avgViewers: { type: Number, default: 0 },
    trp: { type: Number, default: 0 }, // target rating points
    grp: { type: Number, default: 0 }, // gross rating points
    marketShare: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    peakTime: Date,
  },

  // Revenue
  revenue: {
    monthlyAdRevenue: { type: Number, default: 0 },
    subscriptionRevenue: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },

  // Carriage
  carriage: {
    dth: [{ type: String }], // ['Tata Sky', 'Dish TV', etc.]
    cable: [{ type: String }],
    ott: [{ type: String }], // ['JioTV', 'Airtel Xstream', etc.]
    platformFees: { type: Number, default: 0 },
  },

  // RTMN Twin ID
  twinId: { type: String, sparse: true, index: true },

  // Owner
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  broadcaster: String,

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'testing'],
    default: 'active',
  },

  // Approval
  regulatoryApproved: { type: Boolean, default: false },
  mibLicenseNo: String, // Ministry of Information & Broadcasting

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
channelSchema.index({ type: 1, language: 1 });
channelSchema.index({ subscriptionType: 1 });
channelSchema.index({ status: 1 });
channelSchema.index({ 'stats.trp': -1 });
channelSchema.index({ region: 1 });

// Virtuals
channelSchema.virtual('isLive').get(function() {
  const now = new Date();
  const currentHour = now.getHours();
  return this.status === 'active' &&
         currentHour >= this.broadcastHours.start &&
         currentHour < this.broadcastHours.end;
});

channelSchema.virtual('currentProgram').get(async function() {
  const now = new Date();
  const currentSlot = this.schedule.find(slot =>
    slot.startTime <= now && slot.endTime >= now
  );

  if (!currentSlot) return null;

  if (currentSlot.programId) {
    return mongoose.model('Program').findById(currentSlot.programId);
  }
  if (currentSlot.contentId) {
    return mongoose.model('Content').findById(currentSlot.contentId);
  }
  return null;
});

// Methods
channelSchema.methods.updateStats = async function(viewers, trp) {
  this.stats.avgViewers = viewers;
  this.stats.trp = trp;

  if (viewers > this.stats.peakViewers) {
    this.stats.peakViewers = viewers;
    this.stats.peakTime = new Date();
  }

  await this.save();
};

channelSchema.methods.calculateMarketShare = async function(totalViewersInCategory) {
  if (totalViewersInCategory > 0) {
    this.stats.marketShare = (this.stats.avgViewers / totalViewersInCategory) * 100;
  }
  await this.save();
  return this.stats.marketShare;
};

// Statics
channelSchema.statics.findByLanguage = function(language) {
  return this.find({ language, status: 'active' });
};

channelSchema.statics.findByType = function(type) {
  return this.find({ type, status: 'active' });
};

channelSchema.statics.findTopChannels = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'stats.trp': -1 })
    .limit(limit);
};

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;
