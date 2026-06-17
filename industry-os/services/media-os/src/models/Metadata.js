/**
 * Media OS - Metadata Model
 * Content metadata with versioning and taxonomy
 */

const mongoose = require('mongoose');

const metadataEntrySchema = new mongoose.Schema({
  // Reference
  entityType: {
    type: String,
    enum: ['content', 'episode', 'series', 'podcast', 'channel', 'program'],
    required: true,
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },

  // Taxonomy
  taxonomy: {
    primaryGenre: { type: String, required: true },
    secondaryGenres: [String],
    format: { type: String, enum: ['feature', 'short', 'serial', 'standalone'] },
    mood: [String],
    themes: [String],
    tags: { type: [String], index: true },
    keywords: [String],
  },

  // Classification
  classification: {
    type: { type: String, enum: ['movie', 'series', 'episode', 'podcast', 'short', 'live', 'documentary', 'music_video'] },
    subType: String,
    category: String,
    parentalRating: { type: String, enum: ['G', 'PG', 'PG-13', 'UA', 'A', 'adult'] },
    contentWarnings: [String],
  },

  // Language & Localization
  language: {
    original: { type: String, required: true },
    dubbed: [{
      language: String,
      versionId: String,
      url: String,
    }],
    subtitles: [{
      language: String,
      versionId: String,
      url: String,
      isDefault: Boolean,
    }],
    closedCaptions: [{
      language: String,
      url: String,
    }],
  },

  // Technical metadata
  technical: {
    format: String, // MP4, MOV, etc.
    resolution: String, // 4K, 1080p, 720p
    aspectRatio: String,
    frameRate: Number,
    codec: String,
    duration: Number, // in seconds
    fileSize: Number, // in bytes
    colorSpace: String,
    audio: {
      channels: String, // 5.1, stereo
      codec: String,
      language: String,
    },
  },

  // Distribution
  distribution: {
    platforms: [{
      platform: String, // 'web', 'mobile', 'tv', 'theatrical'
      available: Boolean,
      regions: [String],
      launchDate: Date,
    }],
    territories: [String],
    exclusivity: {
      isExclusive: Boolean,
      exclusiveUntil: Date,
      exclusivityType: String,
    },
  },

  // SEO
  seo: {
    slug: String,
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
    ogImage: String,
    schemaMarkup: mongoose.Schema.Types.Mixed,
  },

  // Social
  social: {
    hashtags: [String],
    handles: [String], // Brand/product mentions
    campaignId: String,
    launchPlan: String,
  },

  // Quality metrics
  quality: {
    videoQuality: { type: String, enum: ['sd', 'hd', 'fhd', '4k', '8k'] },
    audioQuality: { type: String, enum: ['mono', 'stereo', '5.1', 'dolby_atmos'] },
    subtitleAccuracy: Number, // 0-100%
    accessibility: {
      hasAudioDescription: Boolean,
      hasSignLanguage: Boolean,
      hasCC: Boolean,
    },
  },

  // Versioning
  version: { type: Number, default: 1 },
  versionHistory: [{
    version: Number,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    changedAt: { type: Date, default: Date.now },
    changes: String,
    fields: [String],
  }],

  // Status
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'published', 'archived'],
    default: 'draft',
  },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  approvedAt: Date,

}, {
  timestamps: true,
});

// Compound index for entity lookup
metadataEntrySchema.index({ entityType: 1, entityId: 1 }, { unique: true });
metadataEntrySchema.index({ 'taxonomy.primaryGenre': 1 });
metadataEntrySchema.index({ 'taxonomy.tags': 1 });
metadataEntrySchema.index({ status: 1 });
metadataEntrySchema.index({ 'distribution.platforms.platform': 1 });

// Methods
metadataEntrySchema.methods.updateField = async function(field, value, userId) {
  const fields = field.split('.');
  const fieldPath = fields.join('.');

  this.versionHistory.push({
    version: this.version,
    changedBy: userId,
    changes: `Updated ${fieldPath}`,
    fields: [fieldPath],
  });

  this.version += 1;

  // Update the nested field
  let obj = this;
  for (let i = 0; i < fields.length - 1; i++) {
    obj = obj[fields[i]];
  }
  obj[fields[fields.length - 1]] = value;

  this.lastModifiedBy = userId;
  await this.save();
  return this;
};

metadataEntrySchema.methods.approve = async function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  await this.save();
  return this;
};

metadataEntrySchema.methods.addTag = async function(tag) {
  if (!this.taxonomy.tags.includes(tag)) {
    this.taxonomy.tags.push(tag);
    await this.save();
  }
  return this;
};

metadataEntrySchema.methods.removeTag = async function(tag) {
  this.taxonomy.tags = this.taxonomy.tags.filter(t => t !== tag);
  await this.save();
  return this;
};

// Statics
metadataEntrySchema.statics.findByEntity = function(entityType, entityId) {
  return this.findOne({ entityType, entityId });
};

metadataEntrySchema.statics.findByGenre = function(genre) {
  return this.find({
    $or: [
      { 'taxonomy.primaryGenre': genre },
      { 'taxonomy.secondaryGenres': genre },
    ],
    status: 'approved',
  });
};

metadataEntrySchema.statics.findByTags = function(tags) {
  return this.find({
    'taxonomy.tags': { $all: tags },
    status: 'approved',
  });
};

metadataEntrySchema.statics.search = function(query) {
  return this.find({
    $or: [
      { 'taxonomy.primaryGenre': { $regex: query, $options: 'i' } },
      { 'taxonomy.tags': { $regex: query, $options: 'i' } },
      { 'seo.metaTitle': { $regex: query, $options: 'i' } },
      { 'seo.metaDescription': { $regex: query, $options: 'i' } },
    ],
    status: 'approved',
  });
};

metadataEntrySchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const byGenre = await this.aggregate([
    { $unwind: '$taxonomy.secondaryGenres' },
    { $group: { _id: '$taxonomy.primaryGenre', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return { byStatus: stats, byGenre };
};

const Metadata = mongoose.model('Metadata', metadataEntrySchema);

module.exports = Metadata;
