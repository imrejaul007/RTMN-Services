/**
 * Media OS - EPG (Electronic Program Guide) Model
 * TV guide data with multi-channel support
 */

const mongoose = require('mongoose');

const epgEntrySchema = new mongoose.Schema({
  // Program info
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  gridSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProgramGrid.slots' },

  // Channel
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },

  // Time
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  duration: Number, // minutes

  // Content
  title: { type: String, required: true },
  subtitle: String,
  description: String,
  type: {
    type: String,
    enum: ['program', 'movie', 'series', 'episode', 'sport', 'news', 'live', 'special', 'ad', 'promo'],
    required: true,
  },
  genre: [String],

  // Media
  thumbnail: String,
  poster: String,

  // Credits
  cast: [String],
  director: String,
  year: Number,
  season: Number,
  episode: Number,

  // Content info
  rating: { type: String, enum: ['G', 'PG', 'PG-13', 'UA', 'A'] },
  language: String,
  subtitles: Boolean,
  audioDescription: Boolean,

  // Live info
  isLive: { type: Boolean, default: false },
  liveViewers: { type: Number, default: 0 },

  // Ad info
  isAdBreak: { type: Boolean, default: false },
  adSlots: { type: Number, default: 0 },

  // Series info
  seriesTitle: String,
  episodeTitle: String,

  // Recording
  isRecordable: { type: Boolean, default: true },
  recordingId: { type: mongoose.Schema.Types.ObjectId },

  // Reminder
  reminders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' }],

  // Status
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled', 'updated'],
    default: 'scheduled',
  },

  // Version
  version: { type: Number, default: 1 },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Compound indexes
epgEntrySchema.index({ channelId: 1, startTime: 1 });
epgEntrySchema.index({ startTime: 1, endTime: 1 });
epgEntrySchema.index({ title: 'text', description: 'text' });
epgEntrySchema.index({ type: 1, genre: 1 });
epgEntrySchema.index({ rating: 1 });

// Virtual for series info
epgEntrySchema.virtual('episodeInfo').get(function() {
  if (this.seriesTitle && this.season && this.episode) {
    return `S${this.season.toString().padStart(2, '0')}E${this.episode.toString().padStart(2, '0')}`;
  }
  return null;
});

// Virtual for isCurrentlyOn
epgEntrySchema.virtual('isCurrentlyOn').get(function() {
  const now = new Date();
  return this.startTime <= now && this.endTime >= now && this.status !== 'cancelled';
});

// Methods
epgEntrySchema.methods.updateStatus = function() {
  const now = new Date();

  if (this.status === 'cancelled') return this;

  if (this.isCurrentlyOn) {
    this.status = 'live';
  } else if (this.endTime < now) {
    this.status = 'completed';
  }

  return this;
};

epgEntrySchema.methods.addReminder = async function(viewerId) {
  if (!this.reminders.includes(viewerId)) {
    this.reminders.push(viewerId);
    await this.save();
  }
  return this;
};

epgEntrySchema.methods.removeReminder = async function(viewerId) {
  this.reminders = this.reminders.filter(r => r.toString() !== viewerId.toString());
  await this.save();
  return this;
};

// Statics
epgEntrySchema.statics.findCurrentlyPlaying = function(channelId) {
  const now = new Date();
  return this.findOne({
    channelId,
    startTime: { $lte: now },
    endTime: { $gte: now },
    status: { $ne: 'cancelled' },
  });
};

epgEntrySchema.statics.findByTimeRange = function(startTime, endTime, channelId = null) {
  const query = {
    startTime: { $gte: startTime },
    endTime: { $lte: endTime },
  };

  if (channelId) {
    query.channelId = channelId;
  }

  return this.find(query)
    .populate('channelId', 'name logo type')
    .sort({ startTime: 1 });
};

epgEntrySchema.statics.findUpcoming = function(channelId, limit = 20) {
  return this.find({
    channelId,
    startTime: { $gte: new Date() },
    status: 'scheduled',
  })
    .sort({ startTime: 1 })
    .limit(limit);
};

epgEntrySchema.statics.search = function(query, options = {}) {
  const { genre, channelId, startTime, endTime, type } = options;

  const searchQuery = {
    $text: { $search: query },
  };

  if (genre) searchQuery.genre = genre;
  if (channelId) searchQuery.channelId = channelId;
  if (type) searchQuery.type = type;
  if (startTime) searchQuery.startTime = { $gte: startTime };
  if (endTime) searchQuery.endTime = { $lte: endTime };

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(50);
};

epgEntrySchema.statics.generateEPG = async function(date, options = {}) {
  const { channelIds, region, hours = 24 } = options;

  const startTime = new Date(date);
  startTime.setHours(0, 0, 0, 0);

  const endTime = new Date(startTime);
  endTime.setHours(hours, 0, 0, 0);

  const query = {
    startTime: { $gte: startTime, $lt: endTime },
  };

  if (channelIds?.length) {
    query.channelId = { $in: channelIds };
  }

  const entries = await this.find(query)
    .populate('channelId', 'name logo type number')
    .sort({ 'channelId.number': 1, startTime: 1 });

  // Group by channel
  const byChannel = {};
  entries.forEach(entry => {
    const channelName = entry.channelId.name;
    if (!byChannel[channelName]) {
      byChannel[channelName] = [];
    }
    byChannel[channelName].push(entry);
  });

  return byChannel;
};

const EPGEntry = mongoose.model('EPGEntry', epgEntrySchema);

module.exports = EPGEntry;
