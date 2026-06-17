/**
 * Media OS - Streaming Model
 * Video streaming with HLS/DASH support
 */

const mongoose = require('mongoose');

const streamVariantSchema = new mongoose.Schema({
  resolution: { type: String, required: true }, // e.g., '1920x1080', '1280x720'
  bitrate: { type: Number, required: true }, // kbps
  framerate: { type: Number, default: 30 },
  codec: { type: String, enum: ['h264', 'h265', 'av1', 'vp9'], default: 'h264' },
  url: String,
  fileSize: Number, // bytes
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const streamSchema = new mongoose.Schema({
  // Content reference
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
  episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },

  // Stream info
  title: String,
  type: {
    type: String,
    enum: ['vod', 'live', 'linear', 'clip', 'trailer'],
    required: true,
  },

  // Technical
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed', 'archived'],
    default: 'processing',
  },
  encoding: {
    engine: { type: String, enum: ['ffmpeg', 'handbrake', 'aws-mediaconvert', 'bitmovin'], default: 'ffmpeg' },
    profile: { type: String, enum: ['baseline', 'main', 'high'] },
    preset: String,
    startedAt: Date,
    completedAt: Date,
    progress: { type: Number, default: 0 },
    error: String,
  },

  // Manifests
  manifests: {
    hls: {
      url: String,
      version: { type: String, default: '1.0' },
    },
    dash: {
      url: String,
      version: { type: String, default: '1.0' },
    },
  },

  // Variants
  variants: [streamVariantSchema],

  // DRM
  drm: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ['widevine', 'fairplay', 'playready', 'none'] },
    licenseServer: String,
    keys: [{
      keyId: String,
      type: { type: String, enum: ['video', 'audio'] },
      encryptedUrl: String,
    }],
  },

  // Media info
  mediaInfo: {
    duration: Number, // seconds
    width: Number,
    height: Number,
    aspectRatio: String,
    audioTracks: [{
      language: String,
      codec: String,
      channels: String,
      bitrate: Number,
      url: String,
      isDefault: Boolean,
    }],
    subtitleTracks: [{
      language: String,
      label: String,
      url: String,
      isDefault: Boolean,
      isForced: Boolean,
    }],
  },

  // CDN
  cdn: {
    provider: { type: String, enum: ['cloudflare', 'cloudfront', 'akamai', 'fastly', 'custom'] },
    cdnUrl: String,
    regions: [String],
  },

  // Thumbnail & Preview
  thumbnails: {
    poster: String,
    backdrop: String,
    sprite: String, // VTT for scrubbing
    previews: [String], // Array of preview images
  },

  // Quality
  quality: {
    maxResolution: String,
    maxBitrate: Number,
    supports4k: { type: Boolean, default: false },
    supportsHDR: { type: Boolean, default: false },
    supportsSpatialAudio: { type: Boolean, default: false },
  },

  // Accessibility
  accessibility: {
    hasAudioDescription: { type: Boolean, default: false },
    hasClosedCaptions: { type: Boolean, default: false },
    hasSignLanguage: { type: Boolean, default: false },
  },

  // Stats
  stats: {
    views: { type: Number, default: 0 },
    watchTime: { type: Number, default: 0 }, // seconds
    avgWatchDuration: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    uniqueViewers: { type: Number, default: 0 },
  },

  // Live specific
  live: {
    isLive: { type: Boolean, default: false },
    streamUrl: String,
    streamKey: String,
    recordingEnabled: { type: Boolean, default: false },
    viewerCount: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    startedAt: Date,
    endedAt: Date,
    DVR: { type: Boolean, default: false },
    dvrWindow: Number, // seconds
  },

  // Clips
  clip: {
    isClip: { type: Boolean, default: false },
    startTime: Number, // seconds
    endTime: Number,
  },

  // Platform
  platforms: [{
    platform: { type: String, enum: ['web', 'ios', 'android', 'tv', 'roku', 'firetv', 'appletv', 'chromecast'] },
    enabled: { type: Boolean, default: true },
    status: String,
  }],

  // CDN Analytics
  cdnStats: {
    bandwidth: { type: Number, default: 0 }, // bytes
    requests: { type: Number, default: 0 },
    cacheHitRate: { type: Number, default: 0 },
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
streamSchema.index({ contentId: 1, status: 1 });
streamSchema.index({ type: 1, status: 1 });
streamSchema.index({ 'live.isLive': 1 });
streamSchema.index({ 'stats.views': -1 });

// Virtuals
streamSchema.virtual('defaultVariant').get(function() {
  return this.variants.find(v => v.isDefault) || this.variants[0];
});

streamSchema.virtual('manifestUrl').get(function() {
  return this.manifests?.hls?.url || this.manifests?.dash?.url;
});

streamSchema.virtual('isPlayable').get(function() {
  return this.status === 'ready' && (this.manifests?.hls?.url || this.manifests?.dash?.url);
});

// Methods
streamSchema.methods.updateEncodingProgress = async function(progress) {
  this.encoding.progress = progress;
  if (progress >= 100) {
    this.encoding.status = 'completed';
    this.encoding.completedAt = new Date();
  }
  await this.save();
  return this;
};

streamSchema.methods.markEncodingFailed = async function(error) {
  this.encoding.status = 'failed';
  this.encoding.error = error;
  await this.save();
  return this;
};

streamSchema.methods.recordView = async function(viewerId, watchDuration) {
  this.stats.views += 1;
  this.stats.watchTime += watchDuration;
  if (this.mediaInfo?.duration) {
    this.stats.completionRate = this.stats.watchTime / (this.stats.views * this.mediaInfo.duration);
  }
  await this.save();
  return this;
};

streamSchema.methods.generateManifest = function(type = 'hls') {
  const contentId = this.contentId.toString();
  const basePath = `/${type}/${contentId}`;

  if (type === 'hls') {
    this.manifests.hls = {
      url: `${this.cdn?.cdnUrl || ''}${basePath}/master.m3u8`,
      version: '1.0',
    };
  } else if (type === 'dash') {
    this.manifests.dash = {
      url: `${this.cdn?.cdnUrl || ''}${basePath}/manifest.mpd`,
      version: '1.0',
    };
  }

  return this;
};

streamSchema.methods.enableLive = async function(streamKey) {
  this.live.isLive = true;
  this.live.streamKey = streamKey;
  this.live.startedAt = new Date();
  this.live.viewerCount = 0;
  await this.save();
  return this;
};

streamSchema.methods.endLive = async function() {
  this.live.isLive = false;
  this.live.endedAt = new Date();
  this.live.peakViewers = Math.max(this.live.peakViewers, this.live.viewerCount);
  await this.save();
  return this;
};

streamSchema.methods.createClip = async function(startTime, endTime, title) {
  const clip = new mongoose.model('Stream')({
    contentId: this.contentId,
    title: `${title} (Clip)`,
    type: 'clip',
    clip: {
      isClip: true,
      startTime,
      endTime,
    },
    // Inherit from parent
    drm: this.drm,
    cdn: this.cdn,
    mediaInfo: {
      duration: endTime - startTime,
    },
  });

  await clip.save();
  return clip;
};

// Statics
streamSchema.statics.findPlayable = function(query = {}) {
  return this.find({
    status: 'ready',
    ...query,
  })
    .populate('contentId', 'title thumbnail type')
    .sort('-stats.views');
};

streamSchema.statics.findLiveStreams = function() {
  return this.find({
    'live.isLive': true,
    status: 'ready',
  }).populate('contentId', 'title thumbnail');
};

streamSchema.statics.getEncodingQueue = function() {
  return this.find({
    status: 'processing',
    'encoding.engine': { $exists: true },
  })
    .sort('createdAt')
    .limit(50);
};

const Stream = mongoose.model('Stream', streamSchema);

module.exports = Stream;
