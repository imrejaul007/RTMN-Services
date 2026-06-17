/**
 * Media OS - Editorial Calendar Model
 * Content planning and scheduling across channels
 */

const mongoose = require('mongoose');

const calendarEntrySchema = new mongoose.Schema({
  // Basic info
  title: { type: String, required: true },
  description: String,

  // Content reference
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  contentType: {
    type: String,
    enum: ['movie', 'series', 'episode', 'podcast', 'short', 'live', 'documentary', 'music_video', 'custom'],
    required: true,
  },

  // Planning details
  planning: {
    idea: String,
    brief: String,
    targetDate: Date,
    deadline: Date,
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: {
      type: String,
      enum: ['idea', 'research', 'writing', 'review', 'approved', 'scheduled', 'published', 'cancelled'],
      default: 'idea',
    },
  },

  // Assignment
  assignedTo: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    role: { type: String, enum: ['writer', 'editor', 'producer', 'director', 'reviewer', 'approver'] },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'] },
    assignedAt: Date,
    completedAt: Date,
  }],

  // Channel & Schedule
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  schedule: {
    plannedDate: Date,
    plannedTime: String,
    actualDate: Date,
    actualTime: String,
    timezone: { type: String, default: 'Asia/Kolkata' },
    recurring: {
      enabled: { type: Boolean, default: false },
      pattern: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    },
  },

  // Resources
  resources: {
    budget: Number,
    estimatedCost: Number,
    actualCost: Number,
    teamSize: Number,
  },

  // Dependencies
  dependencies: [{
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'EditorialCalendar' },
    type: { type: String, enum: ['blocks', 'blocked_by', 'related_to'] },
    status: { type: String, enum: ['pending', 'completed'] },
  }],

  // Tags & Categories
  tags: [String],
  category: String,
  genres: [String],

  // Performance targets
  targets: {
    views: Number,
    engagement: Number,
    completionRate: Number,
    shares: Number,
  },

  // Approval workflow
  approval: {
    required: { type: Boolean, default: true },
    approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' }],
    currentApprover: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'revision_requested'] },
    history: [{
      approver: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
      decision: String,
      comments: String,
      timestamp: Date,
    }],
  },

  // Content created from this entry
  publishedContentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },

  // Notes & Communication
  notes: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    text: String,
    timestamp: { type: Date, default: Date.now },
  }],

  // Timeline
  timeline: [{
    date: Date,
    event: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    metadata: mongoose.Schema.Types.Mixed,
  }],

  // RTMN Integration
  twinId: String,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
calendarEntrySchema.index({ 'planning.status': 1, 'schedule.plannedDate': 1 });
calendarEntrySchema.index({ channel: 1, 'schedule.plannedDate': 1 });
calendarEntrySchema.index({ contentType: 1, 'planning.status': 1 });
calendarEntrySchema.index({ tags: 1 });
calendarEntrySchema.index({ 'assignedTo.userId': 1 });
calendarEntrySchema.index({ 'planning.priority': 1, 'schedule.plannedDate': 1 });

// Virtuals
calendarEntrySchema.virtual('isOverdue').get(function() {
  if (!this.planning.deadline) return false;
  return this.planning.deadline < new Date() && this.planning.status !== 'published';
});

calendarEntrySchema.virtual('daysUntilDeadline').get(function() {
  if (!this.planning.deadline) return null;
  const diff = this.planning.deadline - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

calendarEntrySchema.virtual('isReady').get(function() {
  // Check if all assigned reviewers have completed
  const reviewers = this.assignedTo.filter(a => a.role === 'reviewer');
  return reviewers.every(r => r.status === 'completed');
});

// Methods
calendarEntrySchema.methods.assignUser = async function(userId, role) {
  const existing = this.assignedTo.find(a => a.userId.toString() === userId.toString());
  if (existing) {
    existing.role = role;
    existing.status = 'accepted';
  } else {
    this.assignedTo.push({
      userId,
      role,
      status: 'pending',
      assignedAt: new Date(),
    });
  }
  await this.save();
  return this;
};

calendarEntrySchema.methods.completeTask = async function(userId, comments) {
  const assignment = this.assignedTo.find(
    a => a.userId.toString() === userId.toString()
  );

  if (assignment) {
    assignment.status = 'completed';
    assignment.completedAt = new Date();
  }

  this.timeline.push({
    date: new Date(),
    event: 'task_completed',
    userId,
    metadata: { comments },
  });

  await this.save();
  return this;
};

calendarEntrySchema.methods.submitForApproval = async function(approverId) {
  if (this.approval.required) {
    this.planning.status = 'review';
    this.approval.currentApprover = approverId;
    this.approval.status = 'pending';
  } else {
    this.planning.status = 'approved';
  }

  this.timeline.push({
    date: new Date(),
    event: 'submitted_for_approval',
    userId: approverId,
  });

  await this.save();
  return this;
};

calendarEntrySchema.methods.approve = async function(approverId, comments) {
  this.approval.status = 'approved';
  this.approval.history.push({
    approver: approverId,
    decision: 'approved',
    comments,
    timestamp: new Date(),
  });

  this.planning.status = 'approved';
  this.timeline.push({
    date: new Date(),
    event: 'approved',
    userId: approverId,
    metadata: { comments },
  });

  await this.save();
  return this;
};

calendarEntrySchema.methods.reject = async function(approverId, comments) {
  this.approval.status = 'rejected';
  this.approval.history.push({
    approver: approverId,
    decision: 'rejected',
    comments,
    timestamp: new Date(),
  });

  this.planning.status = 'revision_requested';
  this.timeline.push({
    date: new Date(),
    event: 'rejected',
    userId: approverId,
    metadata: { comments },
  });

  await this.save();
  return this;
};

calendarEntrySchema.methods.scheduleContent = async function(date, time) {
  this.planning.status = 'scheduled';
  this.schedule.plannedDate = date;
  this.schedule.plannedTime = time;

  this.timeline.push({
    date: new Date(),
    event: 'scheduled',
    metadata: { date, time },
  });

  await this.save();
  return this;
};

calendarEntrySchema.methods.publish = async function(contentId) {
  this.planning.status = 'published';
  this.schedule.actualDate = new Date();
  this.publishedContentId = contentId;

  this.timeline.push({
    date: new Date(),
    event: 'published',
    metadata: { contentId },
  });

  await this.save();
  return this;
};

calendarEntrySchema.methods.addNote = async function(userId, text) {
  this.notes.push({ userId, text, timestamp: new Date() });
  await this.save();
  return this;
};

// Statics
calendarEntrySchema.statics.findByDateRange = function(startDate, endDate, filters = {}) {
  return this.find({
    'schedule.plannedDate': { $gte: startDate, $lte: endDate },
    ...filters,
  })
    .populate('channel', 'name logo')
    .populate('assignedTo.userId', 'profile.displayName')
    .sort('schedule.plannedDate');
};

calendarEntrySchema.statics.findByStatus = function(status) {
  return this.find({ 'planning.status': status })
    .populate('channel', 'name')
    .sort('planning.priority');
};

calendarEntrySchema.statics.findOverdue = function() {
  return this.find({
    'planning.deadline': { $lt: new Date() },
    'planning.status': { $nin: ['published', 'cancelled'] },
  }).sort('planning.deadline');
};

calendarEntrySchema.statics.findMyTasks = function(userId) {
  return this.find({
    'assignedTo.userId': userId,
    'assignedTo.status': { $ne: 'completed' },
    'planning.status': { $nin: ['published', 'cancelled'] },
  }).sort('planning.deadline');
};

calendarEntrySchema.statics.getCalendarView = async function(startDate, endDate, groupBy = 'day') {
  const entries = await this.find({
    'schedule.plannedDate': { $gte: startDate, $lte: endDate },
  })
    .populate('channel', 'name logo type')
    .sort('schedule.plannedDate');

  // Group by specified period
  const grouped = {};

  entries.forEach(entry => {
    const date = entry.schedule.plannedDate;
    let key;

    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const week = Math.ceil(date.getDate() / 7);
      key = `${date.getFullYear()}-W${week}`;
    } else if (groupBy === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (groupBy === 'channel') {
      key = entry.channel?._id?.toString() || 'unassigned';
    }

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry);
  });

  return grouped;
};

const EditorialCalendar = mongoose.model('EditorialCalendar', calendarEntrySchema);

module.exports = EditorialCalendar;
