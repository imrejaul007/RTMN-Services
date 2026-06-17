/**
 * Media OS - Program Grid Model
 * TV Program scheduling with conflict detection and optimization
 */

const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // HH:mm format
  endTime: { type: String, required: true },
  duration: Number, // minutes
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  type: { type: String, enum: ['program', 'movie', 'ad', 'break', 'promo', 'news', 'live'] },
  title: String,
  description: String,
  thumbnail: String,
  // For ad breaks
  adBreak: {
    position: { type: String, enum: ['pre_roll', 'mid_roll', 'post_roll'] },
    duration: { type: Number, default: 120 }, // seconds
    slots: Number,
    filled: { type: Number, default: 0 },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  },
  // For live content
  live: {
    isLive: { type: Boolean, default: false },
    viewers: { type: Number, default: 0 },
    startDelay: { type: Number, default: 0 },
  },
  // Regional feed
  regional: {
    isRegional: { type: Boolean, default: false },
    regions: [String],
  },
  // Compliance
  regulatory: {
    rating: { type: String, enum: ['G', 'PG', 'PG-13', 'UA', 'A'] },
    contentWarnings: [String],
    language: String,
    subtitling: { type: Boolean, default: false },
    audioDescription: { type: Boolean, default: false },
  },
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled', 'breaking_news'],
    default: 'scheduled',
  },
}, { _id: true });

const gridSchema = new mongoose.Schema({
  // Channel reference
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },

  // Date
  date: { type: Date, required: true },

  // Time slots
  slots: [timeSlotSchema],

  // Regional feeds
  regionalFeeds: [{
    region: { type: String, required: true },
    slots: [timeSlotSchema],
  }],

  // Summary
  summary: {
    totalDuration: { type: Number, default: 0 }, // in minutes
    programCount: { type: Number, default: 0 },
    adBreakCount: { type: Number, default: 0 },
    totalAdDuration: { type: Number, default: 0 },
    liveSlots: { type: Number, default: 0 },
  },

  // Compliance
  compliance: {
    hasAdultContent: { type: Boolean, default: false },
    hasRestrictedContent: { type: Boolean, default: false },
    issues: [String],
    cleared: { type: Boolean, default: true },
    clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    clearedAt: Date,
  },

  // Lock status
  locked: { type: Boolean, default: false },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  lockedAt: Date,

  // Version control
  version: { type: Number, default: 1 },
  history: [{
    version: Number,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    changedAt: Date,
    changes: String,
  }],

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'published', 'archived'],
    default: 'draft',
  },

  // Approval
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  approvedAt: Date,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Compound index for unique grid per channel per day
gridSchema.index({ channelId: 1, date: 1 }, { unique: true });
gridSchema.index({ date: 1, 'slots.status': 1 });
gridSchema.index({ 'slots.contentId': 1 });

// Virtual for current slot
gridSchema.virtual('currentSlot').get(function() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return this.slots.find(slot => {
    const [startHour, startMin] = slot.startTime.split(':').map(Number);
    const [endHour, endMin] = slot.endTime.split(':').map(Number);
    const slotStart = startHour * 60 + startMin;
    const slotEnd = endHour * 60 + endMin;
    return currentMinutes >= slotStart && currentMinutes < slotEnd;
  });
});

// Calculate summary before saving
gridSchema.pre('save', function(next) {
  this.summary.totalDuration = this.slots.reduce((sum, slot) => {
    const [startHour, startMin] = slot.startTime.split(':').map(Number);
    const [endHour, endMin] = slot.endTime.split(':').map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return sum + Math.max(0, duration);
  }, 0);

  this.summary.programCount = this.slots.filter(s => s.type === 'program' || s.type === 'movie').length;
  this.summary.adBreakCount = this.slots.filter(s => s.type === 'ad' || s.adBreak).length;
  this.summary.totalAdDuration = this.slots
    .filter(s => s.adBreak)
    .reduce((sum, s) => sum + (s.adBreak.duration || 0), 0);
  this.summary.liveSlots = this.slots.filter(s => s.live?.isLive).length;

  next();
});

// Methods
gridSchema.methods.addSlot = function(slotData) {
  // Validate no time conflicts
  const [startHour, startMin] = slotData.startTime.split(':').map(Number);
  const [endHour, endMin] = slotData.endTime.split(':').map(Number);
  const newStart = startHour * 60 + startMin;
  const newEnd = endHour * 60 + endMin;

  // Check for conflicts
  const conflicts = this.slots.filter(slot => {
    const [slotStartHour, slotStartMin] = slot.startTime.split(':').map(Number);
    const [slotEndHour, slotEndMin] = slot.endTime.split(':').map(Number);
    const slotStart = slotStartHour * 60 + slotStartMin;
    const slotEnd = slotEndHour * 60 + slotEndMin;

    return (newStart < slotEnd && newEnd > slotStart);
  });

  if (conflicts.length > 0) {
    throw new Error(`Time conflict with: ${conflicts.map(c => c.title).join(', ')}`);
  }

  this.slots.push({
    ...slotData,
    duration: newEnd - newStart,
  });

  return this;
};

gridSchema.methods.removeSlot = function(slotId) {
  const index = this.slots.findIndex(s => s._id.toString() === slotId.toString());
  if (index >= 0) {
    this.slots.splice(index, 1);
  }
  return this;
};

gridSchema.methods.moveSlot = function(slotId, newStartTime) {
  const slot = this.slots.id(slotId);
  if (!slot) {
    throw new Error('Slot not found');
  }

  const duration = slot.duration || 30;
  const [hour, min] = newStartTime.split(':').map(Number);
  slot.startTime = newStartTime;
  slot.endTime = `${String(Math.floor((hour * 60 + min + duration) / 60) % 24).padStart(2, '0')}:${String((min + duration) % 60).padStart(2, '0')}`;

  return slot;
};

gridSchema.methods.swapSlots = function(slotId1, slotId2) {
  const slot1 = this.slots.id(slotId1);
  const slot2 = this.slots.id(slotId2);

  if (!slot1 || !slot2) {
    throw new Error('One or more slots not found');
  }

  // Swap times
  [slot1.startTime, slot2.startTime] = [slot2.startTime, slot1.startTime];
  [slot1.endTime, slot2.endTime] = [slot2.endTime, slot1.endTime];
  [slot1.duration, slot2.duration] = [slot2.duration, slot1.duration];

  return { slot1, slot2 };
};

gridSchema.methods.autoFillAdBreaks = function(adBreaks) {
  // Automatically place ad breaks based on configuration
  const breakDuration = 120; // 2 minutes default
  let breakCount = 0;

  // Find natural break points (after major segments)
  this.slots.forEach((slot, index) => {
    if (slot.type === 'program' && slot.duration > 30 && breakCount < adBreaks) {
      // Insert ad break after this slot
      const nextSlot = this.slots[index + 1];
      if (nextSlot && nextSlot.type !== 'ad') {
        const endTime = slot.endTime;
        const [endHour, endMin] = endTime.split(':').map(Number);
        const breakEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

        this.slots.push({
          startTime: endTime,
          endTime: breakEnd,
          duration: breakDuration / 60,
          type: 'ad',
          title: 'Ad Break',
          adBreak: {
            position: 'mid_roll',
            duration: breakDuration,
            slots: Math.ceil(breakDuration / 30),
            filled: 0,
          },
          status: 'scheduled',
        });

        breakCount++;
      }
    }
  });

  return breakCount;
};

gridSchema.methods.checkConflicts = function() {
  const conflicts = [];

  this.slots.forEach((slot, i) => {
    const [start1, end1] = [slot.startTime, slot.endTime].map(t => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    });

    this.slots.forEach((other, j) => {
      if (i >= j) return;

      const [start2, end2] = [other.startTime, other.endTime].map(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      });

      if (start1 < end2 && end1 > start2) {
        conflicts.push({
          slot1: slot._id,
          slot2: other._id,
          title1: slot.title,
          title2: other.title,
        });
      }
    });
  });

  return conflicts;
};

gridSchema.methods.checkCompliance = function() {
  const issues = [];

  // Check for consecutive adult content
  let consecutiveAdult = 0;
  this.slots.forEach(slot => {
    if (slot.regulatory?.rating === 'A') {
      consecutiveAdult++;
      if (consecutiveAdult > 3) {
        issues.push(`More than 3 consecutive adult-rated programs`);
      }
    } else {
      consecutiveAdult = 0;
    }
  });

  // Check for proper content warnings
  this.slots.forEach(slot => {
    if (slot.regulatory?.rating === 'UA' || slot.regulatory?.rating === 'A') {
      if (!slot.regulatory?.contentWarnings?.length) {
        issues.push(`${slot.title} needs content warnings`);
      }
    }
  });

  this.compliance.issues = issues;
  this.compliance.hasRestrictedContent = issues.length > 0;
  this.compliance.cleared = issues.length === 0;

  return { cleared: issues.length === 0, issues };
};

gridSchema.methods.lock = function(userId) {
  this.locked = true;
  this.lockedBy = userId;
  this.lockedAt = new Date();
  return this;
};

gridSchema.methods.unlock = function() {
  this.locked = false;
  this.lockedBy = null;
  this.lockedAt = null;
  return this;
};

gridSchema.methods.approve = function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this;
};

gridSchema.methods.publish = function() {
  if (this.locked && this.status === 'approved') {
    this.status = 'published';
    return true;
  }
  return false;
};

gridSchema.methods.createNewVersion = function(userId, changes) {
  this.history.push({
    version: this.version,
    changedBy: userId,
    changedAt: new Date(),
    changes: changes || 'Grid modified',
  });
  this.version += 1;
  return this;
};

// Statics
gridSchema.statics.findByChannelAndDate = function(channelId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.findOne({
    channelId,
    date: { $gte: startOfDay, $lte: endOfDay },
  }).populate('channelId', 'name logo type');
};

gridSchema.statics.findByDateRange = function(channelId, startDate, endDate) {
  return this.find({
    channelId,
    date: { $gte: startDate, $lte: endDate },
  }).sort('date');
};

gridSchema.statics.findPublished = function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    status: 'published',
  }).populate('channelId', 'name logo type');
};

gridSchema.statics.getGridForEPG = async function(date, options = {}) {
  const { channelIds, region } = options;

  const query = {
    date: new Date(date),
    status: 'published',
  };

  if (channelIds?.length) {
    query.channelId = { $in: channelIds };
  }

  const grids = await this.find(query)
    .populate('channelId', 'name logo type language')
    .sort('channelId.name');

  // Filter regional feeds if needed
  if (region) {
    grids.forEach(grid => {
      grid.slots = grid.slots.filter(slot =>
        !slot.regional?.isRegional || slot.regional?.regions?.includes(region)
      );
    });
  }

  return grids;
};

const ProgramGrid = mongoose.model('ProgramGrid', gridSchema);

module.exports = ProgramGrid;
