/**
 * Media OS - Script Model
 * Scripts, storyboards, and content versions
 */

const mongoose = require('mongoose');

const sceneSchema = new mongoose.Schema({
  sceneNumber: { type: Number, required: true },
  sequenceNumber: { type: Number, default: 1 },
  title: String,
  description: String,
  script: String, // Full scene script
  location: {
    name: String,
    type: { type: String, enum: ['interior', 'exterior', 'studio', 'vfx'] },
    setting: String,
  },
  timeOfDay: {
    value: { type: String, enum: ['day', 'night', 'dawn', 'dusk', 'continuous'] },
    specific: String,
  },
  characters: [{
    name: String,
    role: { type: String, enum: ['lead', 'supporting', 'extra', 'background'] },
    action: String,
    notes: String,
  }],
  duration: {
    estimated: Number, // seconds
    actual: Number,
  },
  camera: {
    shotType: { type: String, enum: ['wide', 'medium', 'close_up', 'extreme_close_up', 'pov', 'over_shoulder', 'establishing'] },
    movement: { type: String, enum: ['static', 'pan', 'tilt', 'dolly', 'crane', 'steadicam', 'handheld'] },
    lens: String,
    notes: String,
  },
  audio: {
    dialogue: String,
    narration: String,
    soundFX: [String],
    music: String,
    ambient: String,
  },
  vfx: {
    required: { type: Boolean, default: false },
    description: String,
    complexity: { type: String, enum: ['simple', 'medium', 'complex'] },
  },
  notes: String,
  status: {
    type: String,
    enum: ['draft', 'revised', 'approved', 'locked'],
    default: 'draft',
  },
}, { _id: true });

const versionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  versionName: String, // e.g., "Director's Cut", "Final Draft"
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  createdAt: { type: Date, default: Date.now },
  changes: {
    summary: String,
    details: [String],
    pagesAffected: [Number],
  },
  scenes: [sceneSchema],
  locked: { type: Boolean, default: false },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  lockedAt: Date,
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    sceneNumber: Number,
    text: String,
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    resolvedAt: Date,
  }],
});

const scriptSchema = new mongoose.Schema({
  // References
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },
  calendarEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'EditorialCalendar' },
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' }, // For series
  productionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Production' },

  // Basic info
  title: { type: String, required: true },
  subtitle: String,
  type: {
    type: String,
    enum: ['feature_film', 'short_film', 'tv_episode', 'web_series', 'documentary', 'commercial', 'podcast', 'music_video', 'custom'],
    required: true,
  },
  format: {
    type: String,
    enum: ['screenplay', 'teleplay', 'stage', 'radio', 'visual'],
    default: 'screenplay',
  },

  // Content details
  logline: String, // One-sentence summary
  synopsis: String, // 1-2 paragraphs
  treatment: String, // Full treatment
  genre: [String],
  tone: [String],
  targetAudience: String,
  rating: { type: String, enum: ['G', 'PG', 'PG-13', 'UA', 'A'] },

  // Production info
  episodeNumber: Number,
  seasonNumber: Number,
  totalPages: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }, // in minutes
  language: String,

  // Credits
  writer: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  coWriters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' }],
  contributors: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    contribution: String,
  }],

  // Settings & Requirements
  settings: {
    locations: [{
      name: String,
      type: { type: String, enum: ['interior', 'exterior', 'both'] },
      description: String,
      estimatedCost: Number,
    }],
    timePeriod: {
      era: String, // e.g., "Present Day", "1920s", "Future"
      specific: String,
    },
    specialRequirements: [String],
  },

  // Characters
  characters: [{
    name: String,
    role: { type: String, enum: ['protagonist', 'antagonist', 'supporting', 'minor', 'extra'] },
    description: String,
    arc: String,
    age: String,
    gender: String,
    traits: [String],
    notes: String,
  }],

  // Scenes
  scenes: [sceneSchema],

  // Version history
  versions: [versionSchema],
  currentVersion: { type: Number, default: 1 },

  // Status
  status: {
    type: String,
    enum: ['outline', 'treatment', 'first_draft', 'revision', 'polish', 'locked', 'archived'],
    default: 'outline',
  },
  lockStatus: { type: String, enum: ['unlocked', 'locked'], default: 'unlocked' },

  // Workflow
  workflow: {
    currentStage: { type: String, enum: ['concept', 'outline', 'treatment', 'first_draft', 'notes', 'revision', 'final', 'locked'] },
    stages: [{
      name: String,
      status: { type: String, enum: ['pending', 'in_progress', 'completed'] },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
      completedAt: Date,
      notes: String,
    }],
  },

  // Attachments
  attachments: [{
    name: String,
    type: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    uploadedAt: { type: Date, default: Date.now },
  }],

  // AI Analysis
  aiAnalysis: {
    plotComplexity: Number,
    dialogueDensity: Number,
    actionPace: Number,
    sentiment: String,
    keywords: [String],
    similarScripts: [String], // IDs of similar content
    estimatedBudget: Number,
    recommendedCast: [String],
  },

  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  lastReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  lastReviewedAt: Date,

  // RTMN Integration
  twinId: String,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
scriptSchema.index({ contentId: 1 });
scriptSchema.index({ episodeId: 1 });
scriptSchema.index({ 'writer': 1, status: 1 });
scriptSchema.index({ type: 1, status: 1 });
scriptSchema.index({ genre: 1 });
scriptSchema.index({ 'workflow.currentStage': 1 });

// Virtuals
scriptSchema.virtual('currentVersionData').get(function() {
  return this.versions.find(v => v.versionNumber === this.currentVersion);
});

scriptSchema.virtual('totalScenes').get(function() {
  return this.scenes.length;
});

scriptSchema.virtual('estimatedReadTime').get(function() {
  // ~1 page = 1 minute of screen time
  return this.totalPages || Math.ceil(this.scenes.length * 2);
});

// Calculate totals before saving
scriptSchema.pre('save', function(next) {
  this.totalPages = Math.ceil(this.scenes.reduce((sum, scene) => {
    // Rough estimate: 1 scene = ~2 pages
    return sum + 2;
  }, 0));

  this.totalDuration = this.scenes.reduce((sum, scene) => {
    return sum + (scene.duration?.estimated || 120); // 2 min default
  }, 0);

  next();
});

// Methods
scriptSchema.methods.createVersion = async function(userId, changes = {}) {
  const versionData = {
    versionNumber: this.currentVersion + 1,
    versionName: changes.name || `Version ${this.currentVersion + 1}`,
    createdBy: userId,
    createdAt: new Date(),
    changes: {
      summary: changes.summary || 'New version created',
      details: changes.details || [],
      pagesAffected: changes.pagesAffected || [],
    },
    scenes: JSON.parse(JSON.stringify(this.scenes)),
    locked: false,
  };

  this.versions.push(versionData);
  this.currentVersion = versionData.versionNumber;
  this.lastModifiedBy = userId;
  this.status = 'revision';

  await this.save();
  return this.versions[this.versions.length - 1];
};

scriptSchema.methods.updateScene = async function(sceneNumber, updates, userId) {
  const scene = this.scenes.find(s => s.sceneNumber === sceneNumber);
  if (scene) {
    Object.assign(scene, updates);
    this.lastModifiedBy = userId;
    await this.save();
  }
  return scene;
};

scriptSchema.methods.reorderScenes = async function(newOrder) {
  // newOrder is array of sceneNumbers in new order
  const reorderedScenes = [];
  let seqNum = 1;

  newOrder.forEach(sceneNum => {
    const scene = this.scenes.find(s => s.sceneNumber === sceneNum);
    if (scene) {
      scene.sequenceNumber = seqNum++;
      reorderedScenes.push(scene);
    }
  });

  this.scenes = reorderedScenes;
  await this.save();
  return this;
};

scriptSchema.methods.addComment = async function(userId, sceneNumber, text) {
  const version = this.versions.find(v => v.versionNumber === this.currentVersion);
  if (version) {
    version.comments.push({
      userId,
      sceneNumber,
      text,
      timestamp: new Date(),
      resolved: false,
    });
    await this.save();
    return version.comments[version.comments.length - 1];
  }
};

scriptSchema.methods.resolveComment = async function(commentId, userId) {
  for (const version of this.versions) {
    const comment = version.comments.id(commentId);
    if (comment) {
      comment.resolved = true;
      comment.resolvedBy = userId;
      comment.resolvedAt = new Date();
      await this.save();
      return comment;
    }
  }
};

scriptSchema.methods.lock = async function(userId) {
  const version = this.versions.find(v => v.versionNumber === this.currentVersion);
  if (version) {
    version.locked = true;
    version.lockedBy = userId;
    version.lockedAt = new Date();
  }
  this.lockStatus = 'locked';
  this.status = 'locked';
  await this.save();
  return this;
};

scriptSchema.methods.unlock = async function(userId) {
  const version = this.versions.find(v => v.versionNumber === this.currentVersion);
  if (version) {
    version.locked = false;
    version.lockedBy = null;
    version.lockedAt = null;
  }
  this.lockStatus = 'unlocked';
  await this.save();
  return this;
};

scriptSchema.methods.submitForReview = async function(reviewerId) {
  this.workflow.currentStage = 'notes';
  this.workflow.stages.push({
    name: 'Review',
    status: 'in_progress',
    assignedTo: reviewerId,
  });
  await this.save();
  return this;
};

scriptSchema.methods.approve = async function(approverId) {
  this.lastReviewedBy = approverId;
  this.lastReviewedAt = new Date();
  this.workflow.currentStage = 'final';
  this.status = 'polish';
  await this.save();
  return this;
};

scriptSchema.methods.getExport = async function(format = 'screenplay') {
  // Format script for export
  let exportText = '';

  exportText += `${this.title.toUpperCase()}\n`;
  if (this.subtitle) exportText += `${this.subtitle}\n`;
  exportText += `\nWritten by: ${this.createdBy?.profile?.displayName || 'Unknown'}\n\n`;
  exportText += `---\n\n`;

  if (this.synopsis) {
    exportText += `SYNOPSIS\n${this.synopsis}\n\n`;
    exportText += `---\n\n`;
  }

  for (const scene of this.scenes.sort((a, b) => a.sceneNumber - b.sceneNumber)) {
    exportText += `Scene ${scene.sceneNumber}: ${scene.title || 'Untitled'}\n`;
    exportText += `INT./EXT. ${scene.location?.name || 'LOCATION'} - ${scene.timeOfDay?.value || 'DAY'}\n\n`;
    exportText += scene.script || '';
    exportText += '\n\n';
  }

  return exportText;
};

// Statics
scriptSchema.statics.findByContent = function(contentId) {
  return this.findOne({ contentId }).sort('-currentVersion');
};

scriptSchema.statics.findByWriter = function(writerId) {
  return this.find({ writer: writerId })
    .sort('-updatedAt');
};

scriptSchema.statics.findInProgress = function() {
  return this.find({
    status: { $nin: ['locked', 'archived'] },
  }).sort('-updatedAt');
};

scriptSchema.statics.findPendingReview = function() {
  return this.find({
    'workflow.currentStage': 'notes',
  }).sort('updatedAt');
};

scriptSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPages: { $sum: '$totalPages' },
      },
    },
  ]);

  const byType = await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
      },
    },
  ]);

  return { byStatus: stats, byType };
};

const Script = mongoose.model('Script', scriptSchema);

module.exports = Script;
