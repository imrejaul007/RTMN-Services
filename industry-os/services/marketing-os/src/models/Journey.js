/**
 * Marketing OS - Journey Model
 * Customer journey orchestration
 */

const mongoose = require('mongoose');

const journeyStepSchema = new mongoose.Schema({
  stepId: { type: String },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['email', 'sms', 'whatsapp', 'push', 'delay', 'condition', 'action', 'webhook', 'segment', 'ai', 'notification', 'score'],
    required: true,
  },
  order: { type: Number, required: true },

  // Step Configuration
  config: {
    // Email
    emailTemplate: String,
    emailSubject: String,
    fromName: String,
    fromEmail: String,

    // SMS/WhatsApp
    messageTemplate: String,
    phoneField: String,

    // Push
    pushTitle: String,
    pushBody: String,
    pushData: mongoose.Schema.Types.Mixed,

    // Delay
    delayDuration: Number, // minutes
    delayUnit: { type: String, enum: ['minutes', 'hours', 'days', 'weeks'] },
    waitUntil: String, // datetime

    // Condition
    conditionType: { type: String, enum: ['field', 'behavior', 'segment', 'date', 'custom'] },
    conditionField: String,
    conditionOperator: { type: String, enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'between'] },
    conditionValue: mongoose.Schema.Types.Mixed,
    conditionValue2: mongoose.Schema.Types.Mixed,

    // Action
    actionType: { type: String, enum: ['add_tag', 'remove_tag', 'update_field', 'add_to_segment', 'remove_from_segment', 'score', 'webhook', 'ai'] },
    actionData: mongoose.Schema.Types.Mixed,

    // Webhook
    webhookUrl: String,
    webhookMethod: { type: String, enum: ['GET', 'POST'] },
    webhookHeaders: mongoose.Schema.Types.Mixed,
    webhookBody: mongoose.Schema.Types.Mixed,

    // AI
    aiAgent: String,
    aiPrompt: String,

    // Notification
    notifyUser: String,
    notifyMessage: String,
  },

  // Branching
  branches: [{
    name: String,
    condition: mongoose.Schema.Types.Mixed,
    steps: [this],
  }],

  // Metrics
  metrics: {
    entered: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },

  // Timing
  timing: {
    sendTime: { type: String, enum: ['immediately', 'scheduled', 'optimal'] },
    scheduledTime: String,
    timezone: { type: String, default: 'IST' },
  },

  // Status
  status: { type: String, enum: ['active', 'paused', 'disabled'], default: 'active' },
});

const journeyAnalyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  entered: { type: Number, default: 0 },
  progressed: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  droppedOff: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
});

const journeySchema = new mongoose.Schema({
  // Journey ID
  journeyId: { type: String, unique: true },

  // Basic Info
  name: { type: String, required: true },
  title: String,
  description: String,

  // Type
  type: {
    type: String,
    enum: ['onboarding', 'welcome', 'abandoned_cart', 'win_back', 'reengagement', 'upsell', 'cross_sell', 'loyalty', 'event', 'custom'],
    required: true,
  },
  category: String,
  tags: [String],

  // Organization
  organizationId: String,

  // Trigger
  trigger: {
    type: {
      type: String,
      enum: ['event', 'segment', 'manual', 'api', 'schedule', 'form', 'purchase', 'abandon'],
      required: true,
    },
    event: String,
    segmentId: String,
    schedule: String,
    conditions: mongoose.Schema.Types.Mixed,
  },

  // Entry Criteria
  entryCriteria: {
    type: { type: String, enum: ['all', 'any', 'none', 'custom'] },
    conditions: [{
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed,
    }],
  },

  // Steps
  steps: [{
    stepId: String,
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'push', 'delay', 'condition', 'action', 'webhook', 'ai'],
      required: true,
    },
    order: { type: Number, required: true },
    config: mongoose.Schema.Types.Mixed,
    branches: mongoose.Schema.Types.Mixed,
    timing: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['active', 'paused', 'disabled'], default: 'active' },
  }],

  // A/B Testing
  abTest: {
    enabled: { type: Boolean, default: false },
    variants: [{
      name: String,
      percentage: { type: Number, default: 50 },
      steps: mongoose.Schema.Types.Mixed,
    }],
    winner: String,
  },

  // Goals
  goal: {
    type: { type: String, enum: ['conversion', 'engagement', 'retention', 'revenue', 'custom'] },
    metric: String,
    target: Number,
  },

  // Settings
  settings: {
    allowReentry: { type: Boolean, default: false },
    reentryDelay: Number,
    exitConditions: [String],
    priority: { type: Number, default: 5 },
    consentRequired: { type: Boolean, default: true },
  },

  // Metrics
  metrics: {
    totalEntered: { type: Number, default: 0 },
    currentlyActive: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    droppedOff: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    avgTimeToConvert: Number,
  },

  // Analytics History
  analytics: [journeyAnalyticsSchema],

  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'draft',
  },

  // Version
  version: { type: Number, default: 1 },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Generate journey ID
journeySchema.pre('save', function(next) {
  if (!this.journeyId) {
    const prefix = 'JRN';
    const timestamp = Date.now().toString(36).toUpperCase();
    this.journeyId = `${prefix}-${timestamp}`;
  }

  // Calculate conversion rate
  if (this.metrics.totalEntered > 0) {
    this.metrics.conversionRate = (this.metrics.conversions / this.metrics.totalEntered) * 100;
  }

  next();
});

// Indexes
journeySchema.index({ journeyId: 1 }, { unique: true });
journeySchema.index({ organizationId: 1 });
journeySchema.index({ status: 1 });
journeySchema.index({ type: 1 });
journeySchema.index({ 'trigger.type': 1 });

// Virtuals
journeySchema.virtual('duration').get(function() {
  let totalMinutes = 0;
  this.steps.forEach(step => {
    if (step.type === 'delay' && step.config?.delayDuration) {
      const multiplier = { minutes: 1, hours: 60, days: 1440, weeks: 10080 };
      totalMinutes += step.config.delayDuration * (multiplier[step.config.delayUnit] || 1);
    }
  });
  return totalMinutes;
});

journeySchema.virtual('stepCount').get(function() {
  return this.steps.length;
});

// Methods
journeySchema.methods.addStep = function(stepData) {
  const stepId = `step_${Date.now()}`;
  this.steps.push({
    ...stepData,
    stepId,
    order: this.steps.length + 1,
  });
  return this;
};

journeySchema.methods.removeStep = function(stepId) {
  this.steps = this.steps.filter(s => s.stepId !== stepId);
  this.steps.forEach((s, i) => s.order = i + 1);
  return this;
};

journeySchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

journeySchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

journeySchema.methods.clone = function(newName) {
  const clone = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    journeyId: undefined,
    name: newName || `${this.name} (Copy)`,
    status: 'draft',
    metrics: {
      totalEntered: 0,
      currentlyActive: 0,
      completed: 0,
      droppedOff: 0,
      conversions: 0,
      conversionRate: 0,
      revenue: 0,
    },
  });
  return clone;
};

journeySchema.methods.recordEntry = function() {
  this.metrics.totalEntered += 1;
  this.metrics.currentlyActive += 1;
  return this;
};

journeySchema.methods.recordConversion = function(revenue = 0) {
  this.metrics.conversions += 1;
  this.metrics.currentlyActive -= 1;
  this.metrics.completed += 1;
  this.metrics.revenue += revenue;
  if (this.metrics.totalEntered > 0) {
    this.metrics.conversionRate = (this.metrics.conversions / this.metrics.totalEntered) * 100;
  }
  return this;
};

// Statics
journeySchema.statics.findActive = function(orgId) {
  return this.find({ organizationId: orgId, status: 'active' });
};

journeySchema.statics.findByTrigger = function(triggerType) {
  return this.find({ 'trigger.type': triggerType, status: 'active' });
};

journeySchema.statics.getTemplates = function() {
  return [
    { type: 'welcome', name: 'Welcome Series', description: 'Onboard new customers' },
    { type: 'abandoned_cart', name: 'Abandoned Cart', description: 'Recover lost sales' },
    { type: 'win_back', name: 'Win Back', description: 'Re-engage inactive customers' },
    { type: 'reengagement', name: 'Re-engagement', description: 'Wake up dormant users' },
    { type: 'upsell', name: 'Upsell Campaign', description: 'Promote premium products' },
    { type: 'loyalty', name: 'Loyalty Rewards', description: 'Engage loyal customers' },
  ];
};

const Journey = mongoose.model('Journey', journeySchema);

module.exports = Journey;
