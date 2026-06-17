/**
 * Media OS - Content Model
 * Movies, shows, episodes, podcasts, shorts, and other media content
 */

const mongoose = require('mongoose');

const castSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: String,
  image: String,
  type: { type: String, enum: ['actor', 'director', 'producer', 'writer', 'crew'], default: 'actor' },
}, { _id: true });

const seasonSchema = new mongoose.Schema({
  seasonNumber: { type: Number, required: true },
  title: String,
  description: String,
  episodeCount: { type: Number, default: 0 },
  releaseDate: Date,
  thumbnail: String,
}, { _id: true });

const contentRightSchema = new mongoose.Schema({
  territories: [{ type: String }], // ['India', 'US', 'Global']
  licenseType: { type: String, enum: ['exclusive', 'non-exclusive', 'shared'] },
  licenseStart: Date,
  licenseEnd: Date,
  monetizationTypes: [{ type: String, enum: ['subscription', 'avod', 'svod', 'transactional', 'free'] }],
  revenueShare: { type: Map, of: Number }, // platform share percentage
  restrictions: [String],
  renewed: { type: Boolean, default: false },
  renewalDate: Date,
}, { _id: true });

const contentPerformanceSchema = new mongoose.Schema({
  views: { type: Number, default: 0 },
  uniqueViewers: { type: Number, default: 0 },
  avgWatchTime: { type: Number, default: 0 }, // in seconds
  completionRate: { type: Number, default: 0 }, // 0-1
  engagementRate: { type: Number, default: 0 }, // 0-1
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  sentiment: { type: Number, default: 0.5, min: 0, max: 1 }, // 0 negative to 1 positive
  trending: { type: Boolean, default: false },
  velocity: { type: Number, default: 0 }, // views per hour
  peakViewers: { type: Number, default: 0 },
  peakTime: Date,
}, { _id: false });

const contentSchema = new mongoose.Schema({
  // Basic info
  title: { type: String, required: true, index: true },
  originalTitle: String,
  synopsis: { type: String, maxLength: 2000 },
  description: { type: String, maxLength: 5000 },

  // Content type
  type: {
    type: String,
    required: true,
    enum: ['movie', 'series', 'episode', 'podcast', 'short', 'reel', 'live', 'documentary', 'music_video'],
    index: true,
  },

  // Metadata
  language: { type: String, required: true, index: true },
  genres: [{ type: String, index: true }],
  tags: [{ type: String }],
  rating: { type: String, enum: ['G', 'PG', 'PG-13', 'UA', 'A', 'adult'] },
  parentalLock: { type: Boolean, default: false },

  // Release info
  releaseDate: Date,
  year: Number,
  duration: Number, // in minutes
  trailerUrl: String,

  // Credits
  cast: [castSchema],
  crew: [castSchema],

  // For series/podcasts
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  season: seasonSchema,
  episodeNumber: Number,
  totalEpisodes: Number,

  // Media files
  thumbnail: String,
  poster: String,
  banner: String,
  videoUrl: String,
  audioUrl: String,
  hlsManifest: String,

  // Subtitles & Audio
  subtitles: [{
    language: String,
    label: String,
    url: String,
    isDefault: Boolean,
  }],
  audioTracks: [{
    language: String,
    label: String,
    url: String,
    isDefault: Boolean,
  }],

  // Rights
  rights: contentRightSchema,

  // Ownership
  productionHouse: String,
  distributor: String,
  broadcaster: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },

  // Availability
  availability: {
    regions: [{ type: String }], // ['IN', 'US', 'Global']
    platforms: [{ type: String }], // ['web', 'mobile', 'tv', 'android', 'ios']
    vpnBlock: { type: Boolean, default: false },
  },

  // Pricing (for transactional content)
  pricing: {
    rent: { type: Number }, // rent price in rupees
    buy: { type: Number },   // buy price in rupees
    rentDuration: { type: Number, default: 48 }, // hours
  },

  // Performance (updated by analytics)
  performance: contentPerformanceSchema,

  // AI Recommendations
  recommendations: {
    similarContent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Content' }],
    watchNext: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Content' }],
    bundleOpportunities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Content' }],
  },

  // SEO
  seo: {
    slug: String,
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'processing', 'ready', 'published', 'archived', 'removed'],
    default: 'draft',
    index: true,
  },

  // Publishing
  publishedAt: Date,
  scheduledAt: Date,

  // Versioning
  version: { type: Number, default: 1 },
  previousVersions: [{
    version: Number,
    changes: String,
    updatedAt: Date,
    updatedBy: String,
  }],

  // RTMN Twin ID
  twinId: { type: String, sparse: true, index: true },

  // Source
  source: { type: String, enum: ['uploaded', 'produced', 'licensed', 'syndicated'] },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
contentSchema.index({ title: 'text', synopsis: 'text', description: 'text' });
contentSchema.index({ genres: 1, language: 1 });
contentSchema.index({ releaseDate: -1 });
contentSchema.index({ 'performance.views': -1 });
contentSchema.index({ 'performance.trending': 1 });
contentSchema.index({ status: 1, type: 1 });
contentSchema.index({ seriesId: 1, 'season.seasonNumber': 1, episodeNumber: 1 });

// Virtuals
contentSchema.virtual('isAvailable').get(function() {
  if (this.status !== 'published') return false;

  const now = new Date();
  if (this.rights?.licenseEnd && this.rights.licenseEnd < now) return false;

  return true;
});

contentSchema.virtual('age').get(function() {
  if (!this.releaseDate) return null;
  const now = new Date();
  return Math.floor((now - this.releaseDate) / (365.25 * 24 * 60 * 60 * 1000));
});

// Methods
contentSchema.methods.incrementViews = async function(count = 1) {
  this.performance.views += count;

  // Calculate velocity (views per hour)
  const hoursSinceRelease = this.releaseDate
    ? (Date.now() - this.releaseDate.getTime()) / (1000 * 60 * 60)
    : (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);

  this.performance.velocity = hoursSinceRelease > 0
    ? this.performance.views / hoursSinceRelease
    : this.performance.views;

  // Update trending status
  if (this.performance.velocity > 1000) {
    this.performance.trending = true;
  }

  await this.save();
};

contentSchema.methods.calculateCompletionRate = async function() {
  // This would typically be calculated from actual watch data
  // For now, we'll keep it as a placeholder for the analytics system
  await this.save();
  return this.performance.completionRate;
};

contentSchema.methods.checkLicenseExpiry = async function() {
  if (!this.rights?.licenseEnd) return null;

  const now = new Date();
  const daysUntilExpiry = Math.ceil((this.rights.licenseEnd - now) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) {
    this.status = 'archived';
    await this.save();
    return { expired: true, daysOverdue: Math.abs(daysUntilExpiry) };
  }

  if (daysUntilExpiry <= 30) {
    return { expiring: true, daysRemaining: daysUntilExpiry };
  }

  return { valid: true, daysRemaining: daysUntilExpiry };
};

contentSchema.methods.createNewVersion = async function(changes, updatedBy) {
  this.previousVersions.push({
    version: this.version,
    changes: this.summary || 'No summary',
    updatedAt: this.updatedAt,
    updatedBy: updatedBy || 'system',
  });

  this.version += 1;
  await this.save();
  return this;
};

// Statics
contentSchema.statics.findTrending = function(limit = 10) {
  return this.find({
    status: 'published',
    'performance.trending': true,
  })
    .sort({ 'performance.velocity': -1 })
    .limit(limit);
};

contentSchema.statics.findByGenre = function(genre, limit = 20) {
  return this.find({
    genres: { $in: [genre] },
    status: 'published',
  })
    .sort({ 'performance.views': -1 })
    .limit(limit);
};

contentSchema.statics.findRecommendedForViewer = async function(viewerId, limit = 20) {
  // This would use ML recommendations
  // For now, return popular content
  return this.find({
    status: 'published',
    'performance.views': { $gte: 1000 },
  })
    .sort({ 'performance.views': -1 })
    .limit(limit);
};

contentSchema.statics.searchContent = function(query, filters = {}) {
  const searchQuery = {
    $text: { $search: query },
    status: 'published',
    ...filters,
  };

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;
