/**
 * Media OS - Program Model
 * TV programs/shows with scheduling and sponsorship
 */

const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  // Basic info
  name: { type: String, required: true },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  type: {
    type: String,
    enum: ['news_show', 'talk_show', 'reality_show', 'drama', 'comedy', 'sports_show', 'cooking', 'travel', 'documentary', 'cartoon', 'music', 'game_show'],
    required: true,
  },
  genre: { type: String, required: true },

  // Content
  language: { type: String, required: true },
  synopsis: String,
  description: String,
  thumbnail: String,
  poster: String,

  // Timing
  duration: { type: Number, required: true }, // in minutes
  frequency: {
    type: String,
    enum: ['daily', 'weekdays', 'weekends', 'weekly', 'biweekly', 'monthly', 'special', 'one_time'],
    required: true,
  },
  slot: String, // '06:00-06:30'
  startTime: String, // '06:00'
  endTime: String, // '06:30'
  daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sunday

  // Production
  productionHouse: String,
  director: String,
  producer: String,
  hosts: [String],
  judges: [String],
  contestants: [String],

  // Episodes
  totalEpisodes: { type: Number, default: 1 },
  currentEpisode: { type: Number, default: 1 },

  // Ratings
  ratings: {
    target: { type: Number, default: 0 },
    current: { type: Number, default: 0 },
    trp: { type: Number, default: 0 },
    imdb: Number,
  },

  // Sponsorship
  sponsors: [{
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Advertiser' },
    tier: { type: String, enum: ['title', 'presenting', 'associate', 'powered_by', 'co_sponsor'] },
    amount: Number,
    deliverables: [String],
    startDate: Date,
    endDate: Date,
  }],

  // Scheduling
  schedule: {
    startDate: Date,
    endDate: Date,
    specialEpisodes: [{
      episodeNumber: Number,
      date: Date,
      title: String,
      description: String,
    }],
  },

  // Budget
  budget: {
    perEpisode: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
  },

  // Production status
  productionStatus: {
    type: String,
    enum: ['planning', 'pre_production', 'production', 'post_production', 'broadcasting', 'completed', 'cancelled'],
    default: 'planning',
  },

  // Episodes reference
  episodes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Episode' }],

  // Performance
  performance: {
    totalViews: { type: Number, default: 0 },
    avgViewers: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    socialMentions: { type: Number, default: 0 },
    sentiment: { type: Number, default: 0.5 },
  },

  // RTMN Twin ID
  twinId: { type: String, sparse: true, index: true },

  // Status
  status: {
    type: String,
    enum: ['planned', 'active', 'on_hiatus', 'completed', 'cancelled'],
    default: 'planned',
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
programSchema.index({ channel: 1, status: 1 });
programSchema.index({ type: 1, genre: 1 });
programSchema.index({ 'ratings.trp': -1 });
programSchema.index({ 'performance.avgViewers': -1 });
programSchema.index({ startTime: 1, daysOfWeek: 1 });

// Virtuals
programSchema.virtual('progress').get(function() {
  if (this.totalEpisodes === 0) return 0;
  return (this.currentEpisode / this.totalEpisodes) * 100;
});

programSchema.virtual('isOnAir').get(async function() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay();

  // Check if current time matches program slot
  const [startHour, startMinute] = (this.startTime || '00:00').split(':').map(Number);
  const [endHour, endMinute] = (this.endTime || '00:00').split(':').map(Number);

  const currentTime = currentHour * 60 + currentMinute;
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  const isTimeMatch = currentTime >= startTime && currentTime < endTime;
  const isDayMatch = this.daysOfWeek.includes(currentDay);

  return this.status === 'active' && isTimeMatch && isDayMatch;
});

// Methods
programSchema.methods.updateRatings = async function(trp) {
  this.ratings.current = trp;
  this.ratings.trp = trp;

  if (trp > this.ratings.target * 1.2) {
    // Exceeded target by 20% - consider renewal
    // This would trigger a notification/workflow
  }

  await this.save();
};

programSchema.methods.addSponsor = async function(sponsorData) {
  this.sponsors.push(sponsorData);
  await this.save();
  return this.sponsors[this.sponsors.length - 1];
};

programSchema.methods.recordEpisode = async function(episodeNumber, viewers) {
  this.currentEpisode = Math.max(this.currentEpisode, episodeNumber);

  this.performance.totalViews += viewers;
  this.performance.avgViewers = this.performance.totalViews / this.currentEpisode;

  if (viewers > this.performance.peakViewers) {
    this.performance.peakViewers = viewers;
  }

  await this.save();
};

// Statics
programSchema.statics.findByChannel = function(channelId) {
  return this.find({ channel: channelId, status: { $ne: 'cancelled' } })
    .sort({ startTime: 1 });
};

programSchema.statics.findTopPrograms = function(limit = 20) {
  return this.find({ status: 'active' })
    .sort({ 'ratings.trp': -1 })
    .limit(limit)
    .populate('channel', 'name logo');
};

programSchema.statics.findUpcoming = function(days = 7) {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return this.find({
    status: 'planned',
    'schedule.startDate': { $gte: now, $lte: future },
  }).sort({ 'schedule.startDate': 1 });
};

const Program = mongoose.model('Program', programSchema);

module.exports = Program;
