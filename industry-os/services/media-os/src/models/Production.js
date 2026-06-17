/**
 * Media OS - Production Model
 * Complete production workflow with daily reports
 */

const mongoose = require('mongoose');

const sceneProductionSchema = new mongoose.Schema({
  sceneNumber: Number,
  scriptSceneId: mongoose.Schema.Types.ObjectId,
  status: { type: String, enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cut'], default: 'pending' },
  scheduledDate: Date,
  completedDate: Date,
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Studio' },
  duration: { estimated: Number, actual: Number }, // minutes
  notes: String,
});

const callSheetSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  productionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Production', required: true },
  scenes: [sceneProductionSchema],
  crew: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crew' },
    role: String,
    callTime: String,
    location: String,
  }],
  cast: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crew' },
    character: String,
    callTime: String,
    makeupTime: String,
    wardrobe: String,
    notes: String,
  }],
  equipment: [{
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
    quantity: Number,
    notes: String,
  }],
  weather: {
    condition: String,
    temperature: Number,
    sunrise: String,
    sunset: String,
  },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  status: { type: String, enum: ['draft', 'published', 'cancelled'], default: 'draft' },
}, { timestamps: true });

const dailyReportSchema = new mongoose.Schema({
  productionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Production', required: true },
  date: { type: Date, required: true },

  // Scenes shot
  scenesScheduled: { type: Number, default: 0 },
  scenesCompleted: { type: Number, default: 0 },
  scenesCut: { type: Number, default: 0 },
  scenes: [{
    sceneNumber: Number,
    take: Number,
    status: String,
    notes: String,
  }],

  // Time tracking
  crewCall: String,
  firstShot: String,
  lastShot: String,
  lunchBreak: { start: String, end: String },
  wrapTime: String,

  // Progress
  footageShot: Number, // in minutes
  bestTakes: [{
    sceneNumber: Number,
    take: Number,
    description: String,
  }],

  // Cast & Crew
  present: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crew' },
    name: String,
    role: String,
    status: String, // present, absent, late
  }],

  // Equipment
  equipmentIssues: [{
    equipment: String,
    issue: String,
    resolution: String,
  }],

  // Issues & Notes
  issues: [{
    type: { type: String, enum: ['technical', 'location', 'cast', 'crew', 'weather', 'safety', 'other'] },
    description: String,
    severity: { type: String, enum: ['minor', 'moderate', 'major'] },
    resolution: String,
  }],

  // Safety
  safetyIncidents: [{
    description: String,
    action: String,
    reported: Boolean,
  }],

  // Notes
  producerNotes: String,
  directorNotes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
}, { timestamps: true });

const productionSchema = new mongoose.Schema({
  // Content reference
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  scriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Script' },
  calendarEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'EditorialCalendar' },

  // Basic info
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['film', 'tv_show', 'web_series', 'documentary', 'music_video', 'commercial', 'podcast_episode'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pre_production', 'production', 'post_production', 'review', 'completed', 'cancelled', 'on_hold'],
    default: 'pre_production',
  },

  // Production details
  productionHouse: String,
  director: { type: mongoose.Schema.Types.ObjectId, ref: 'Crew' },
  producer: { type: mongoose.Schema.Types.ObjectId, ref: 'Crew' },
  writer: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },

  // Budget
  budget: {
    total: { type: Number, default: 0 },
    allocated: {
      preProduction: { type: Number, default: 0 },
      production: { type: Number, default: 0 },
      postProduction: { type: Number, default: 0 },
      marketing: { type: Number, default: 0 },
    },
    spent: {
      preProduction: { type: Number, default: 0 },
      production: { type: Number, default: 0 },
      postProduction: { type: Number, default: 0 },
      marketing: { type: Number, default: 0 },
    },
    contingency: { type: Number, default: 10 }, // percentage
  },

  // Timeline
  timeline: {
    preProduction: {
      start: Date,
      end: Date,
      actualEnd: Date,
    },
    production: {
      start: Date,
      end: Date,
      actualEnd: Date,
    },
    postProduction: {
      start: Date,
      end: Date,
      actualEnd: Date,
    },
    delivery: Date,
  },

  // Locations
  locations: [{
    name: String,
    type: { type: String, enum: ['studio', 'location_interior', 'location_exterior', 'virtual'] },
    address: String,
    studio: { type: mongoose.Schema.Types.ObjectId, ref: 'Studio' },
    bookedDates: [{
      start: Date,
      end: Date,
      cost: Number,
    }],
    status: { type: String, enum: ['confirmed', 'pending', 'cancelled'] },
  }],

  // Crew
  crew: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crew' },
    role: String,
    department: String,
    startDate: Date,
    endDate: Date,
    rate: Number,
    status: { type: String, enum: ['confirmed', 'pending', 'declined'] },
  }],

  // Cast
  cast: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crew' },
    character: String,
    role: { type: String, enum: ['lead', 'supporting', 'recurring', 'guest', 'extra'] },
    startDate: Date,
    endDate: Date,
    fee: Number,
    status: { type: String, enum: ['confirmed', 'pending', 'negotiating', 'declined'] },
  }],

  // Equipment
  equipment: [{
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
    quantity: Number,
    rentedFrom: String,
    rentalCost: Number,
    rentalDates: { start: Date, end: Date },
    status: { type: String, enum: ['confirmed', 'pending', 'returned'] },
  }],

  // Scenes
  scenes: [sceneProductionSchema],

  // Call sheets
  callSheets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CallSheet' }],

  // Daily reports
  dailyReports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DailyReport' }],

  // Schedule
  schedule: {
    totalDays: { type: Number, default: 0 },
    daysCompleted: { type: Number, default: 0 },
    scenesScheduled: { type: Number, default: 0 },
    scenesCompleted: { type: Number, default: 0 },
    pagesScheduled: { type: Number, default: 0 },
    pagesShot: { type: Number, default: 0 },
  },

  // Progress
  progress: {
    preProduction: { type: Number, default: 0 }, // percentage
    production: { type: Number, default: 0 },
    postProduction: { type: Number, default: 0 },
    overall: { type: Number, default: 0 },
  },

  // Files & Assets
  files: {
    script: { type: String }, // URL
    storyboard: { type: String },
    schedule: { type: String },
    callSheets: [String],
    footage: [{
      name: String,
      url: String,
      size: Number,
      uploadedAt: Date,
    }],
  },

  // Approvals
  approvals: [{
    type: { type: String, enum: ['script', 'budget', 'locations', 'cast', 'rough_cut', 'final_cut'] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    approvedAt: Date,
    comments: String,
  }],

  // RTMN Integration
  twinId: String,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
productionSchema.index({ status: 1, 'timeline.production.start': 1 });
productionSchema.index({ director: 1 });
productionSchema.index({ contentId: 1 });
productionSchema.index({ 'schedule.daysCompleted': 1 });

// Virtuals
productionSchema.virtual('budgetUtilization').get(function() {
  const totalSpent = Object.values(this.budget.spent).reduce((a, b) => a + b, 0);
  return this.budget.total > 0 ? (totalSpent / this.budget.total) * 100 : 0;
});

productionSchema.virtual('daysRemaining').get(function() {
  if (!this.timeline.production.end) return null;
  const diff = this.timeline.production.end - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

productionSchema.virtual('isOnSchedule').get(function() {
  const expectedDays = Math.ceil((new Date() - this.timeline.production.start) / (1000 * 60 * 60 * 24));
  return this.schedule.daysCompleted >= expectedDays * 0.8; // Within 20% variance
});

// Methods
productionSchema.methods.calculateProgress = async function() {
  const stages = ['preProduction', 'production', 'postProduction'];

  for (const stage of stages) {
    const timeline = this.timeline[stage];
    if (!timeline.start) {
      this.progress[stage] = 0;
      continue;
    }

    if (timeline.actualEnd) {
      this.progress[stage] = 100;
    } else if (timeline.end) {
      const total = timeline.end - timeline.start;
      const elapsed = Date.now() - timeline.start;
      this.progress[stage] = Math.min(100, Math.round((elapsed / total) * 100));
    }
  }

  // Overall
  this.progress.overall = Math.round(
    (this.progress.preProduction * 0.2 +
     this.progress.production * 0.5 +
     this.progress.postProduction * 0.3)
  );

  await this.save();
  return this.progress;
};

productionSchema.methods.addDailyReport = async function(reportData) {
  const report = new DailyReport({
    ...reportData,
    productionId: this._id,
  });
  await report.save();

  // Update schedule
  this.schedule.daysCompleted += 1;
  this.schedule.scenesCompleted += report.scenesCompleted || 0;

  // Add to dailyReports array
  this.dailyReports.push(report._id);

  await this.save();
  return report;
};

productionSchema.methods.updateBudget = async function(category, amount, type = 'spent') {
  if (type === 'spent') {
    this.budget.spent[category] = (this.budget.spent[category] || 0) + amount;
  } else {
    this.budget.allocated[category] = amount;
  }
  await this.save();
  return this.budget;
};

productionSchema.methods.assignCrew = async function(crewData) {
  this.crew.push(crewData);
  await this.save();
  return this.crew[this.crew.length - 1];
};

productionSchema.methods.addScene = async function(sceneData) {
  this.scenes.push({
    ...sceneData,
    status: 'pending',
  });
  this.schedule.scenesScheduled += 1;
  await this.save();
  return this.scenes[this.scenes.length - 1];
};

productionSchema.methods.completeScene = async function(sceneNumber) {
  const scene = this.scenes.find(s => s.sceneNumber === sceneNumber);
  if (scene) {
    scene.status = 'completed';
    scene.completedDate = new Date();
    this.schedule.scenesCompleted += 1;
    await this.save();
  }
  return scene;
};

productionSchema.methods.requestApproval = async function(type, userId, comments) {
  this.approvals.push({
    type,
    status: 'pending',
    comments,
  });
  await this.save();
  return this.approvals[this.approvals.length - 1];
};

productionSchema.methods.approve = async function(type, userId, comments) {
  const approval = this.approvals.find(a => a.type === type);
  if (approval) {
    approval.status = 'approved';
    approval.approvedBy = userId;
    approval.approvedAt = new Date();
    approval.comments = comments;
    await this.save();
  }
  return approval;
};

// Statics
productionSchema.statics.findActive = function() {
  return this.find({
    status: { $in: ['pre_production', 'production', 'post_production'] },
  }).sort('timeline.production.start');
};

productionSchema.statics.findByDirector = function(directorId) {
  return this.find({ director: directorId }).sort('-createdAt');
};

productionSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    { $group: {
      _id: '$status',
      count: { $sum: 1 },
      totalBudget: { $sum: '$budget.total' },
      totalSpent: { $sum: { $add: ['$budget.spent.preProduction', '$budget.spent.production', '$budget.spent.postProduction'] } },
    }},
  ]);

  return stats;
};

const Production = mongoose.model('Production', productionSchema);
const CallSheet = mongoose.model('CallSheet', callSheetSchema);
const DailyReport = mongoose.model('DailyReport', dailyReportSchema);

module.exports = { Production, CallSheet, DailyReport };
