/**
 * Media OS - Episode Model
 * Individual episodes for series/podcasts
 */

const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
  // Content reference
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },

  // Episode info
  episodeNumber: { type: Number, required: true },
  seasonNumber: { type: Number, default: 1 },
  title: { type: String, required: true },
  originalTitle: String,
  synopsis: String,
  description: String,

  // Media
  thumbnail: String,
  poster: String,
  trailerUrl: String,
  videoUrl: String,
  audioUrl: String,
  hlsManifest: String,
  duration: { type: Number, required: true }, // in minutes

  // Credits
  cast: [{
    name: String,
    role: String,
    image: String,
  }],
  guestStars: [String],
  director: String,

  // Air/Publication
  airDate: Date,
  publishDate: Date,
  scheduledPublishDate: Date,

  // Subtitles
  subtitles: [{
    language: String,
    label: String,
    url: String,
    isDefault: Boolean,
  }],

  // Performance
  performance: {
    views: { type: Number, default: 0 },
    uniqueViewers: { type: Number, default: 0 },
    avgWatchTime: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    dropOffPoints: [{ position: Number, percentage: Number }],
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    sentiment: { type: Number, default: 0.5 },
  },

  // Ads
  adBreaks: [{
    position: Number, // minutes into episode
    duration: { type: Number, default: 60 }, // seconds
    type: { type: String, enum: ['mid_roll', 'pre_roll', 'post_roll'] },
  ],

  // RTMN Twin ID
  twinId: { type: String, sparse: true, index: true },

  // Status
  status: {
    type: String,
    enum: ['draft', 'processing', 'ready', 'published', 'scheduled', 'archived'],
    default: 'draft',
  },

  // Special episode flags
  isSpecial: { type: Boolean, default: false },
  isClip: { type: Boolean, default: false },
  clipDuration: Number, // for clips extracted from full episode

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
episodeSchema.index({ seriesId: 1, seasonNumber: 1, episodeNumber: 1 }, { unique: true });
episodeSchema.index({ programId: 1 });
episodeSchema.index({ channelId: 1, airDate: -1 });
episodeSchema.index({ status: 1, publishDate: -1 });
episodeSchema.index({ 'performance.views': -1 });

// Virtuals
episodeSchema.virtual('isAvailable').get(function() {
  if (this.status === 'published') return true;
  if (this.status === 'scheduled' && this.scheduledPublishDate <= new Date()) {
    return true;
  }
  return false;
});

episodeSchema.virtual('fullTitle').get(function() {
  return `S${this.seasonNumber}E${this.episodeNumber}: ${this.title}`;
});

// Methods
episodeSchema.methods.incrementViews = async function(count = 1, watchTime = 0) {
  this.performance.views += count;
  this.performance.avgWatchTime = watchTime || this.performance.avgWatchTime;

  // Calculate completion rate
  if (watchTime > 0 && this.duration > 0) {
    this.performance.completionRate = Math.min((watchTime / (this.duration * 60)) * 100, 100);
  }

  await this.save();
  return this;
};

episodeSchema.methods.calculateDropOff = async function(viewerProgress) {
  // viewerProgress is array of {position: seconds, viewers: count}
  // Calculate where viewers dropped off
  const dropOffPoints = [];

  if (viewerProgress && viewerProgress.length > 0) {
    const totalDuration = this.duration * 60;
    const buckets = 10;
    const bucketSize = totalDuration / buckets;

    for (let i = 0; i < buckets; i++) {
      const start = i * bucketSize;
      const end = (i + 1) * bucketSize;
      const viewersInBucket = viewerProgress.filter(vp =>
        vp.position >= start && vp.position < end
      ).reduce((sum, vp) => sum + vp.viewers, 0);

      dropOffPoints.push({
        position: start,
        percentage: (viewersInBucket / this.performance.views) * 100,
      });
    }

    this.performance.dropOffPoints = dropOffPoints;
    await this.save();
  }

  return this.performance.dropOffPoints;
};

episodeSchema.methods.publish = async function() {
  this.status = 'published';
  this.publishDate = new Date();
  await this.save();

  // Update series/podcast
  if (this.seriesId) {
    await mongoose.model('Content').findByIdAndUpdate(this.seriesId, {
      $set: { currentEpisode: Math.max(this.episodeNumber, 0) },
    });
  }

  return this;
};

// Statics
episodeSchema.statics.findBySeries = function(seriesId, season = null) {
  const query = { seriesId };
  if (season) {
    query.seasonNumber = season;
  }
  return this.find(query).sort({ seasonNumber: 1, episodeNumber: 1 });
};

episodeSchema.statics.findLatest = function(seriesId, limit = 5) {
  return this.find({ seriesId, status: 'published' })
    .sort({ publishDate: -1 })
    .limit(limit);
};

episodeSchema.statics.getTopEpisodes = function(limit = 20) {
  return this.find({ status: 'published' })
    .sort({ 'performance.views': -1 })
    .limit(limit)
    .populate('seriesId', 'title thumbnail type');
};

const Episode = mongoose.model('Episode', episodeSchema);

module.exports = Episode;
